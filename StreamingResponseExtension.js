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
      
      // Update content immediately without creating temporary container
      responseContent.textContent = buffer;

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
        console.log("🚀 Starting Claude API call with payload:", {
          model: payload.model,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature
        });

        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
          },
          mode: "cors",
          credentials: "omit",
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Create an EventSource-like stream parser
        const stream = response.body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new TransformStream({
            transform(chunk, controller) {
              // Split chunk into SSE events
              const events = chunk.split('\n\n');
              for (const event of events) {
                if (!event.trim()) continue;
                
                // Parse SSE event
                const lines = event.split('\n');
                const eventData = {};
                
                for (const line of lines) {
                  if (line.startsWith('event: ')) {
                    eventData.event = line.slice(7);
                  } else if (line.startsWith('data: ')) {
                    try {
                      eventData.data = JSON.parse(line.slice(6));
                    } catch (e) {
                      console.warn('Failed to parse event data:', line);
                    }
                  }
                }
                
                if (eventData.event && eventData.data) {
                  controller.enqueue(eventData);
                }
              }
            }
          }));

        const reader = stream.getReader();
        let messageStarted = false;

        while (true) {
          const { done, value: event } = await reader.read();
          
          if (done) break;

          console.log(`📦 Received event: ${event.event}`, event.data);

          switch (event.event) {
            case 'message_start':
              messageStarted = true;
              console.log('✨ Message started');
              break;

            case 'content_block_delta':
              if (event.data.delta.type === 'text_delta') {
                const text = event.data.delta.text;
                console.log('📝 Text delta:', { content: text, length: text.length });
                updateContent(text);
              }
              break;

            case 'error':
              throw new Error(`Stream error: ${event.data.error.message}`);
              break;

            case 'message_stop':
              console.log('🏁 Message completed');
              return;
          }
        }

      } catch (error) {
        console.error("❌ Stream error:", {
          message: error.message,
          stack: error.stack
        });
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