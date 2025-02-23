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

    // Create the base structure with similar UI to PerplexityReasoner
    container.innerHTML = `
      <style>
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
        .thinking-section {
          background-color: #F9FAFB;
          border-radius: 12px;
          padding: 16px;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }
        .thinking-section.collapsed {
          padding: 10px 16px;
          cursor: pointer;
        }
        .thinking-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }
        .thinking-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .thinking-title {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }
        .thinking-intro {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          line-height: 1.4;
          color: #6B7280;
          margin-bottom: 12px;
        }
        .loading-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 20px;
        }
        .loading-dots .dot {
          width: 4px;
          height: 4px;
          background-color: #6B7280;
          border-radius: 50%;
          animation: dotPulse 1.5s infinite;
        }
        .loading-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes dotPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
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
        .markdown-content {
          font-family: monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.5;
          color: #374151;
          margin: 0;
          padding: 0;
        }
      </style>
      <div class="thinking-section">
        <div class="thinking-header">
          <div class="thinking-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 28 28">
              <path fill="#111827" d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm0 22c-5.514 0-10-4.486-10-10S8.486 4 14 4s10 4.486 10 10-4.486 10-10 10z"/>
              <path fill="#111827" d="M14.5 7h-1v7.5l5.4 3.6.6-.9-5-3.3V7z"/>
            </svg>
          </div>
          <div class="thinking-title">Claude is thinking...</div>
        </div>
        <div class="thinking-intro">
          <span>Processing</span>
          <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>
      <div class="response-section">
        <div class="response-content"></div>
      </div>
    `;

    element.appendChild(container);

    // Get references to elements
    const thinkingSection = container.querySelector('.thinking-section');
    const thinkingIntro = container.querySelector('.thinking-intro');
    const thinkingTitle = container.querySelector('.thinking-title');
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
        thinkingIntro.style.display = 'none';
        thinkingTitle.textContent = 'Claude is responding...';
        thinkingSection.classList.add('collapsed');
        responseSection.classList.add('visible');
        isFirstChunk = false;
      }

      // Append to buffer
      buffer += text;
      
      // Update content
      responseContent.innerHTML = buffer;

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
        thinkingTitle.textContent = 'Error occurred';
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