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
        </div>
        <style>
          .thinking-header {
            padding: 0;
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 1;
            height: auto;
            transition: opacity 0.3s ease, height 0.3s ease;
            margin: 0;
          }
          .thinking-header.hidden {
            opacity: 0;
            height: 0;
            padding: 0;
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
            padding: 8px 0;
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
            font-family: var(--_1bof89na), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            line-height: 20px;
            color: #1a1e23;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 0;
            margin: 0;
          }
          .response-content h1, 
          .response-content h2, 
          .response-content h3,
          .response-content h4 {
            font-family: var(--_1bof89na), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1a1e23;
            margin: 0;
            padding: 0;
            font-weight: normal;
            font-size: 14px;
            line-height: 20px;
          }
          strong {
            font-weight: 600;
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
          /* Added styles for headings */
          .response-content .answer-h1 {
            font-size: 1.4em;
            margin: 0.5em 0 0.3em;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h1:first-child {
            margin-top: 0;
          }
          .response-content .answer-h2 {
            font-size: 1.2em;
            margin: 0.4em 0 0.2em;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h2:first-child {
            margin-top: 0;
          }
          .response-content .answer-h3 {
            font-size: 1.1em;
            margin: 0.3em 0 0.2em;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h3:first-child {
            margin-top: 0;
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
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
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
        const proxyUrl = "https://utils.hypedigitaly.ai/api/claude-stream";
        // Always log payload values
        console.log("📦 Payload values:", {
          model: payload.model,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature,
          debugMode: payload.debugMode,
          projectName: payload.projectName,
          systemPrompt: payload.systemPrompt,
          user_id: payload.user_id
        });

        if (payload.debugMode === 1) {
          console.log("🌐 Calling proxy URL:", proxyUrl);
          console.log("📦 Full Claude API call payload:", payload);
        }

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
        let completeResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed');

            // Make PATCH request to update variables
            try {
              const patchResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${payload.user_id}/variables`, {
                method: 'PATCH',
                headers: {
                  'accept': 'application/json',
                  'content-type': 'application/json',
                  'versionID': 'production'
                },
                body: JSON.stringify({
                  "LLM_Main_Response": completeResponse
                })
              });

              if (!patchResponse.ok) {
                console.error('Failed to update variables:', await patchResponse.text());
              } else {
                console.log('Successfully updated variables with complete response');
                if (trace.payload.debugMode === 1) {
                  console.log('Final completeResponse:', completeResponse);
                }
              }
            } catch (error) {
              console.error('Error updating variables:', error);
            }

            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Process all complete lines
          buffer = lines.pop() || ''; // Keep the incomplete line in buffer

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            const data = line.slice(6); // Remove 'data: ' prefix
            if (data === '[DONE]') {
              console.log('Stream completed');

              // Make PATCH request to update variables
              try {
                const patchResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${payload.user_id}/variables`, {
                  method: 'PATCH',
                  headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'versionID': 'production'
                    // Authorization header will be added by backend
                  },
                  body: JSON.stringify({
                    "LLM_Main_Response": completeResponse
                  })
                });

                if (!patchResponse.ok) {
                  console.error('Failed to update variables:', await patchResponse.text());
                } else {
                  console.log('Successfully updated variables with complete response');
                }
              } catch (error) {
                console.error('Error updating variables:', error);
              }

              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (trace.payload.debugMode === 1) {
                console.log('Full Response:', data);
                if (parsed.type === 'content' && parsed.content) {
                  console.log('Received content:', parsed.content);
                }
              }
              updateContent(parsed.content);
              completeResponse += parsed.content; // Collect complete response
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
        debugMode: trace.payload.debugMode || 0,
        user_id: trace.payload.user_id,
      });
    } else {
      addDebugMessage("❌ Error: No payload received", "error");
    }

    window.voiceflow.chat.interact({ type: "continue" });
  },
};