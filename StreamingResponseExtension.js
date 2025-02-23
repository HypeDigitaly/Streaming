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
          <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
        <style>
          .vfrc-typing-indicator {
            display: none !important;
          }
          .vfrc-typing-indicator.active {
            display: flex !important;
            align-items: center;
            gap: 6px;
            height: 24px;
            padding: 2px;
          }
          .vfrc-typing-indicator span {
            width: 8px !important;
            height: 8px !important;
            position: relative;
            background: none !important;
          }
          .vfrc-typing-indicator span::before,
          .vfrc-typing-indicator span::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: dotRotate 1.5s infinite ease-in-out;
          }
          .vfrc-typing-indicator span::before {
            background-color: #111827;
            transform-origin: 50% 50%;
          }
          .vfrc-typing-indicator span::after {
            background-color: #6B7280;
            animation-delay: -0.75s;
          }
          .vfrc-typing-indicator span:nth-child(2)::before,
          .vfrc-typing-indicator span:nth-child(2)::after {
            animation-delay: -0.5s, -1.25s;
          }
          .vfrc-typing-indicator span:nth-child(3)::before,
          .vfrc-typing-indicator span:nth-child(3)::after {
            animation-delay: -1s, -1.75s;
          }
          .thinking-header {
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 1;
            height: auto;
            transition: opacity 0.3s ease, height 0.3s ease;
          }
          .thinking-header.hidden {
            opacity: 0;
            height: 0;
            padding: 0;
          }
          .loading-dots {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 24px;
            padding: 2px;
          }
          .loading-dots .dot {
            width: 8px;
            height: 8px;
            position: relative;
          }
          .loading-dots .dot::before,
          .loading-dots .dot::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: dotRotate 1.5s infinite ease-in-out;
          }
          .loading-dots .dot::before {
            background-color: #111827;
            transform-origin: 50% 50%;
          }
          .loading-dots .dot::after {
            background-color: #6B7280;
            animation-delay: -0.75s;
          }
          .loading-dots .dot:nth-child(2)::before,
          .loading-dots .dot:nth-child(2)::after {
            animation-delay: -0.5s, -1.25s;
          }
          .loading-dots .dot:nth-child(3)::before,
          .loading-dots .dot:nth-child(3)::after {
            animation-delay: -1s, -1.75s;
          }
          @keyframes dotRotate {
            0%, 100% {
              transform: scale(0.6) rotate(0deg);
              opacity: 0.8;
            }
            50% {
              transform: scale(1) rotate(180deg);
              opacity: 1;
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