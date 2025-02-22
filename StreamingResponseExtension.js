export const StreamingResponseExtension = {
  name: "StreamingResponse",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_streamingResponse" ||
    trace.payload?.name === "ext_streamingResponse",
  render: async ({ trace, element }) => {
    console.log("🚀 StreamingResponseExtension: Starting render", { trace });

    const container = document.createElement("div");
    container.className = "streaming-response-container";

    container.innerHTML = `
      <style>
        .streaming-response-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .response-content {
          font-size: 14px;
          line-height: 1.4;
          color: #374151;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .debug-message {
          font-size: 12px;
          padding: 4px 8px;
          margin: 4px 0;
          border-radius: 4px;
          font-family: monospace;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.3s ease;
        }
        .debug-message.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .debug-info {
          background: #e5f6fd;
          color: #0369a1;
          border: 1px solid #0369a1;
        }
        .debug-error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #dc2626;
        }
      </style>
      <div class="debug-message debug-info">🔄 Initializing streaming response...</div>
      <div class="response-content"></div>
    `;

    element.appendChild(container);
    const responseContent = container.querySelector(".response-content");
    let buffer = '';

    function addDebugMessage(message, type = "info") {
      const debugDiv = document.createElement("div");
      debugDiv.className = `debug-message debug-${type}`;
      debugDiv.textContent = message;

      // Add visible class after a brief delay for animation
      requestAnimationFrame(() => {
        debugDiv.classList.add('visible');
      });

      container.insertBefore(debugDiv, responseContent);

      // Remove old debug messages
      const debugMessages = container.querySelectorAll('.debug-message');
      if (debugMessages.length > 3) {
        debugMessages[0].remove();
      }
    }

    function updateContent(text) {
      if (!text) return;

      // Append to buffer
      buffer += text;
      
      // Create temporary container for new content
      const tempContainer = document.createElement('span');
      tempContainer.textContent = text;
      tempContainer.style.opacity = '0';
      
      // Add the new content immediately
      responseContent.appendChild(tempContainer);

      // Trigger fade-in animation in next frame
      requestAnimationFrame(() => {
        tempContainer.style.transition = 'opacity 0.15s ease';
        tempContainer.style.opacity = '1';
      });

      // Enhanced scroll handling
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
        addDebugMessage(`🌐 Connecting to Claude API...`);

        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          credentials: "omit",
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        addDebugMessage("✅ Stream connected");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            if (line === "data: [DONE]") continue;

            try {
              const data = JSON.parse(line.slice(5));
              if (data.type === "content_block_delta" && data.delta.type === "text_delta") {
                // Immediately update UI with each text delta
                requestAnimationFrame(() => {
                  updateContent(data.delta.text);
                });
              }
            } catch (e) {
              console.warn("Warning: Skipping incomplete chunk");
            }
          }
        }

        addDebugMessage("✅ Streaming completed");
      } catch (error) {
        console.error("Error in streaming response:", error);
        addDebugMessage(`❌ Error: ${error.message}`, "error");
        responseContent.textContent = "Error: Failed to get response from Claude API";
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