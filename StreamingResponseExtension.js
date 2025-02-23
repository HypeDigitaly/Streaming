export const StreamingResponseExtension = {
  name: "StreamingResponse",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_streamingResponse" ||
    trace.payload?.name === "ext_streamingResponse",
  render: async ({ trace, element }) => {
    console.log("🚀 StreamingResponseExtension: Starting render", { trace });

    const container = document.createElement('div');
    container.className = 'streaming-response-container';

    // Create the base structure
    container.innerHTML = `
        <div class="thinking-header">
          <div class="loading-animation">
            <div class="loading-circle"></div>
            <div class="loading-inner"></div>
          </div>
          <div class="thinking-message">Zpracovávám dotaz</div>
        </div>
        <style>
          .thinking-header {
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            opacity: 1;
            height: auto;
            transition: opacity 0.3s ease, height 0.3s ease;
          }
          .thinking-header.hidden {
            opacity: 0;
            height: 0;
            padding: 0;
          }
          .thinking-message {
            color: #111827;
            font-size: 14px;
            opacity: 0;
            transform: translateY(5px);
            animation: messageAppear 0.3s ease forwards;
          }
          .loading-animation {
            position: relative;
            width: 24px;
            height: 24px;
          }
          .loading-circle {
            position: absolute;
            width: 20px;
            height: 20px;
            border: 2px solid #E5E7EB;
            border-top-color: #111827;
            border-radius: 50%;
            animation: rotate 1s linear infinite;
          }
          .loading-inner {
            position: absolute;
            top: 6px;
            left: 6px;
            width: 12px;
            height: 12px;
            border: 2px solid #9CA3AF;
            border-top-color: transparent;
            border-radius: 50%;
            animation: rotate 0.8s linear infinite reverse;
          }
          @keyframes rotate {
            100% {
              transform: rotate(360deg);
            }
          }
          @keyframes messageAppear {
            0% {
              opacity: 0;
              transform: translateY(5px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .streaming-response-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .response-section {
            padding: 0;
            margin: 0;
            width: 100%;
            box-sizing: border-box;
            opacity: 0;
            height: 0;
            overflow: hidden;
            transition: opacity 0.3s ease;
          }
          .response-section.visible {
            opacity: 1;
            height: auto;
            overflow: visible;
          }
          .response-content {
            font-size: 14px;
            line-height: 1.4;
            color: #374151;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 16px;
          }
          strong {
            font-weight: 600;
          }
          .response-content {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #374151;
            background: transparent;
          }
          .response-content h1, 
          .response-content h2, 
          .response-content h3 {
            margin: 1.5em 0 0.5em;
            font-weight: 600;
          }
          .response-content h1 { font-size: 2em; }
          .response-content h2 { font-size: 1.5em; }
          .response-content h3 { font-size: 1.2em; }
          .response-content ul {
            margin: 0.5em 0;
            padding-left: 1.5em;
          }
          .response-content li {
            margin: 0.3em 0;
          }
          .response-content li.sublist {
            margin-left: 1.5em;
          }
          .response-content br {
            margin: 0;
            line-height: 1;
          }
          .response-content p {
            margin: 0.5em 0;
          }
        </style>
        <div class="response-section">
          <div class="response-content"></div>
        </div>
      `;

    element.appendChild(container);

    // Setup rotating messages
    const thinkingMessages = [
      "Zpracovávám dotaz",
      "Prohledávám svou databázi",
      "Ověřuji nalezené informace", 
      "Formuluji svou odpověď"
    ];
    let currentMessageIndex = 0;
    
    const rotateThinkingMessage = () => {
      const messageEl = container.querySelector('.thinking-message');
      if (messageEl) {
        messageEl.style.opacity = '0';
        messageEl.style.transform = 'translateY(5px)';
        
        setTimeout(() => {
          currentMessageIndex = (currentMessageIndex + 1) % thinkingMessages.length;
          messageEl.textContent = thinkingMessages[currentMessageIndex];
          messageEl.style.opacity = '1';
          messageEl.style.transform = 'translateY(0)';
        }, 300);
      }
    };

    // Start message rotation
    const messageRotationInterval = setInterval(rotateThinkingMessage, 3000);

    // Clear interval when streaming ends
    const originalHidden = container.querySelector('.thinking-header').classList.add.bind(
      container.querySelector('.thinking-header').classList,
      'hidden'
    );

    container.querySelector('.thinking-header').classList.add = function(...args) {
      clearInterval(messageRotationInterval);
      originalHidden.apply(this, args);
    };

    // Get references to elements
    const responseSection = container.querySelector('.response-section');
    const responseContent = container.querySelector('.response-content');
    let isFirstChunk = true;
    let buffer = '';
    let deltaCounter = 0;

    // Convert HTML to Markdown
    function htmlToMarkdown(html) {
      return html
        // Headers
        .replace(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/g, (_, content) => `# ${content}\n\n`)
        // Bold
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        // Italic
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        // Lists
        .replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, content) => {
          return content.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n');
        })
        .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (_, content) => {
          let counter = 1;
          return content.replace(/<li[^>]*>(.*?)<\/li>/g, () => `${counter++}. $1\n`);
        })
        // Paragraphs
        .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
        // Links
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
        // Code
        .replace(/<code>(.*?)<\/code>/g, '`$1`')
        // Clean up
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Update the answer content with markdown support
    function updateContent(text) {
      if (!text) return;

      // Handle first chunk
      if (isFirstChunk) {
        const thinkingHeader = container.querySelector('.thinking-header');
        if (thinkingHeader) {
          thinkingHeader.classList.add('hidden');
        }
        responseSection.classList.add('visible');
        isFirstChunk = false;
      }

      // Append to buffer
      buffer += text;

      // Format markdown content
      const formattedContent = buffer
        .replace(/^#{3}\s+(.*$)/gm, '<h3>$1</h3>')
        .replace(/^#{2}\s+(.*$)/gm, '<h2>$1</h2>')
        .replace(/^#{1}\s+(.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^\s{2}- (.*$)/gm, '<li class="sublist">$1</li>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/^- (.*$)/gm, (match, content) => {
          const indentation = match.match(/^\s*/)[0].length;
          return `<li class="${indentation > 0 ? 'sublist' : ''}">${content.trim()}</li>`;
        })
        .replace(/(?:^|\n)(<li)/g, '\n<ul>$1')
        .replace(/(<\/li>)(?:\n(?!<li)|$)/g, '$1</ul>')
        .replace(/\n{2,}/g, '\n')
        .replace(/(<\/h[1-3]>|<\/p>|<\/ul>)\n+/g, '$1')
        .replace(/\n+(<h[1-3]>|<p>|<ul>)/g, '$1');

      // Update content with formatting
      responseContent.innerHTML = formattedContent;

      // Scroll handling
      const scrollContainer = findScrollableParent(element);
      if (scrollContainer) {
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const isNearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= maxScroll - 100;

        if (isNearBottom) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }

    function findScrollableParent(el) {
      while (el) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;

        if (overflowY === 'auto' || overflowY === 'scroll') {
          return el;
        }
        el = el.parentElement;
      }
      return window;
    }

    async function callClaudeAPI(payload) {
      try {
        const proxyUrl = "https://hypedigitaly-streaming.replit.app/api/claude-stream";
        console.log("Starting Claude API call with payload:", payload);

        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Process all complete lines
          buffer = lines.pop() || ''; // Keep the incomplete line in buffer

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            const data = line.slice(6); // Remove 'data: ' prefix
            if (data === '[DONE]') {
              console.log('Stream completed');
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.type === 'content' && parsed.content) {
                console.log('Received content:', parsed.content);
                updateContent(parsed.content);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }

      } catch (error) {
        console.error("Stream error:", error);
        responseContent.textContent = `Error: ${error.message}`;
      }
    }

    if (trace.payload) {
      await callClaudeAPI({
        model: trace.payload.model,
        max_tokens: trace.payload.max_tokens,
        temperature: trace.payload.temperature,
        userData: trace.payload.userData,
        systemPrompt: trace.payload.systemPrompt,
      });
    } else {
      addDebugMessage("❌ Error: No payload received", "error");
    }

    window.voiceflow.chat.interact({ type: "continue" });
  },
};