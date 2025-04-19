export const StreamingResponseExtension = {
  name: "StreamingResponse",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_streamingResponse" ||
    trace.payload?.name === "ext_streamingResponse",
  render: async ({ trace, element }) => {
    if (trace.payload?.debugMode === 1) {
      console.log("🚀 StreamingResponseExtension: Starting render", { trace });
      console.log("📦 Full trace payload:", JSON.stringify(trace.payload, null, 2));
    }

    const container = document.createElement('div');
    container.className = 'streaming-response-container';

    // Create the base structure
    container.innerHTML = `
        <div class="thinking-header">
          <div class="loading-animation">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>
        <style>
          .thinking-header {
            padding: 12px 0;
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
          .loading-animation {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .loading-dot {
            width: 4px;
            height: 4px;
            background-color: #6B7280;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
          }
          .loading-dot:nth-child(1) {
            animation-delay: -0.32s;
          }
          .loading-dot:nth-child(2) {
            animation-delay: -0.16s;
          }
          @keyframes bounce {
            0%, 80%, 100% { 
              transform: scale(0);
            } 
            40% { 
              transform: scale(1.0);
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
          /* Responsive image styles to prevent overflow */
          .response-content img {
            max-width: 100%;
            height: auto;
            display: block;
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
          .response-content code {
            margin: 0;
            line-height: 1;
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
    let completeResponse = '';

    // Show container immediately with loading animation
    container.style.display = 'block';

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
        // Hide loading animation when we receive the first content
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
        .replace(/!\[(.*?)\]\((.*?)\)/g, function(match, alt, url) {
          // Convert HTTP to HTTPS if it's not already
          const secureUrl = url.replace(/^http:\/\//i, 'https://');
          return `<img src="${secureUrl}" alt="${alt}" style="max-width:100%; height:auto;">`;
        })
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
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

    async function callMultiLLMAPI(payload) {
        try {
          const proxyUrl = "https://utils.hypedigitaly.ai/api/llm-stream";
          let activeProvider = null;
          let activeModel = null;

          // Ensure modelSequence is properly formatted
          // Convert model names to IDs if needed
          if (payload.modelSequence && typeof payload.modelSequence === 'string') {
            // If the sequence contains model names instead of IDs, handle appropriately
            if (payload.modelSequence.includes('claude') || 
                payload.modelSequence.includes('gpt') || 
                payload.modelSequence.includes('gemini') || 
                payload.modelSequence.includes('llama')) {
              // Keep as is - the API will handle string model names for backward compatibility
            } else {
              // Ensure IDs are properly separated
              payload.modelSequence = payload.modelSequence
                .split(',')
                .map(id => id.trim())
                .join(',');
            }
          }

          if (payload.debugMode === 1) {
            console.log("📦 Payload values:", {
              model: payload.model,
              max_tokens: payload.max_tokens,
              temperature: payload.temperature,
              debugMode: payload.debugMode,
              projectName: payload.projectName,
              systemPrompt: payload.systemPrompt,
              user_id: payload.user_id,
              modelSequence: payload.modelSequence
            });
            console.log("🌐 Calling proxy URL:", proxyUrl);
            console.log("📦 Full API call payload:", payload);
          }

          // Add provider label container at the top of the response
          const providerLabelContainer = document.createElement('div');
          providerLabelContainer.className = 'provider-label-container';
          providerLabelContainer.style.cssText = `
            position: relative;
            padding: 4px 8px;
            margin-bottom: 8px;
            font-size: 12px;
            color: #6B7280;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.3s ease;
          `;
          providerLabelContainer.innerHTML = 'Loading...';
          responseSection.insertBefore(providerLabelContainer, responseContent);

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
            const { done, value } = await reader.read();
            if (done) {
              if (payload.debugMode === 1) {
                console.log('Stream completed');
                console.log('📝 COMPLETE_RESPONSE_BEGIN');
                console.log(completeResponse);
                console.log('📝 COMPLETE_RESPONSE_END');
              }
              // Update Voiceflow variables after stream completion
              if (payload.user_id) {
                updateVoiceflowVariables(payload.user_id, payload.projectName, completeResponse, activeProvider, activeModel, payload.debugMode);
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
                if (payload.debugMode === 1) {
                  console.log('Stream completed via [DONE] signal');
                  console.log('📝 COMPLETE_RESPONSE_BEGIN');
                  console.log(completeResponse);
                  console.log('📝 COMPLETE_RESPONSE_END');
                }

                // Update Voiceflow variables
                try {
                  if (payload.user_id) {
                    if (payload.debugMode === 1) {
                      console.log('📤 Updating Voiceflow variable with complete response length:', completeResponse.length);
                      console.log('📤 Using user_id:', payload.user_id);
                    }
                    updateVoiceflowVariables(payload.user_id, payload.projectName, completeResponse, activeProvider, activeModel, payload.debugMode);
                  }

                  if (!payload.user_id) {
                    if (payload.debugMode === 1) {
                      console.warn('⚠️ No user_id provided, skipping Voiceflow variable update');
                    }
                    return;
                  }


                } catch (error) {
                  console.error('❌ Error updating Voiceflow variables:', error);

                  // Retry with alternative endpoint if the first attempt fails
                  if (payload.user_id) {
                    try {
                      if (payload.debugMode === 1) {
                        console.log('🔄 Retrying variable update with alternative endpoint...');
                      }

                      const retryResponse = await fetch("https://utils.hypedigitaly.ai/api/voiceflow-variable-update", {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          user_id: payload.user_id,
                          projectName: payload.projectName,
                          variables: {
                            "LLM_Main_Response": completeResponse,
                            "LLM_Provider_Used": activeProvider || "unknown",
                            "LLM_Model_Used": activeModel || payload.model || "unknown"
                          },
                          debugMode: payload.debugMode || 0
                        }),
                      });

                      if (payload.debugMode === 1) {
                        console.log('🔄 Retry status:', retryResponse.status);
                      }
                    } catch (retryError) {
                      console.error('❌ Retry also failed:', retryError);
                    }
                  }
                }

                return;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  throw new Error(parsed.error);
                }

                if (payload.debugMode === 1) {
                  console.log('Full Response:', data);
                }

                // Handle different message types
                if (parsed.type === 'content' && parsed.content) {
                  if (payload.debugMode === 1) {
                    console.log('Received content:', parsed.content);
                  }

                  // Update provider info if available
                  if (parsed.provider && parsed.model && !activeProvider) {
                    activeProvider = parsed.provider;
                    activeModel = parsed.model;

                    // Update provider label with logo and name
                    let providerLogo = '';
                    let providerColor = '#6B7280';

                    switch (parsed.provider) {
                      case 'claude':
                        providerLogo = '🟣';
                        providerColor = '#9333EA';
                        break;
                      case 'openai':
                        providerLogo = '🟢';
                        providerColor = '#10B981';
                        break;
                      case 'gemini':
                        providerLogo = '🔵';
                        providerColor = '#3B82F6';
                        break;
                      case 'groq':
                        providerLogo = '🟠';
                        providerColor = '#F59E0B';
                        break;
                    }

                    providerLabelContainer.innerHTML = `${providerLogo} Powered by ${parsed.provider.charAt(0).toUpperCase() + parsed.provider.slice(1)} (${parsed.model})`;
                    providerLabelContainer.style.color = providerColor;
                    providerLabelContainer.style.opacity = '1';
                  }

                  updateContent(parsed.content);
                  completeResponse += parsed.content; // Collect complete response
                }
                // Handle info messages
                else if (parsed.type === 'info' && parsed.message) {
                  if (payload.debugMode === 1) {
                    console.log('Info message:', parsed.message);
                  }
                }
                // Handle done messages
                else if (parsed.type === 'done') {
                  if (payload.debugMode === 1) {
                    console.log('Stream done signal received');
                  }
                }
              } catch (e) {
                if (payload.debugMode === 1) {
                  console.warn('Failed to parse SSE data:', e);
                }
              }
            }
          }

        } catch (error) {
          if (payload.debugMode === 1) {
            console.error("Stream error:", error);
          }
          responseContent.textContent = `Error: ${error.message}`;
        }
      }

    async function updateVoiceflowVariables(userId, projectName, response, provider, model, debugMode) {
      try {
        // Always log these regardless of debug mode to troubleshoot the current issue
        console.log('📤 VOICEFLOW UPDATE TRIGGERED');
        console.log('📤 Updating Voiceflow variable with complete response length:', response.length);
        console.log('📤 Using user_id:', userId);
        console.log('📤 Project name:', projectName);

        // Create request body object
        const requestBody = {
          user_id: userId,
          projectName: projectName,
          variables: {
            "LLM_Main_Response": response
            // Other variables have been removed as requested
          },
          debugMode: debugMode || 0
        };

        // Log the exact request body with extensive details
        console.log('📤 EXACT VOICEFLOW UPDATE REQUEST BODY:', JSON.stringify(requestBody, null, 2));
        console.log(`📤 VOICEFLOW UPDATE REQUEST DETAILS:
- User ID: ${userId}
- Project Name: ${projectName}
- Response Length: ${response.length}
- Response Sample: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"
- Debug Mode: ${debugMode || 0}`);

        const updateResponse = await fetch("https://utils.hypedigitaly.ai/api/voiceflow-variable-update", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Always log the response from the Voiceflow variable update
        console.log('📥 CLIENT-SIDE VOICEFLOW UPDATE RESPONSE:', {
          status: updateResponse.status,
          statusText: updateResponse.statusText
        });

        let responseContent;
        try {
          // Try to parse as JSON first
          responseContent = await updateResponse.json();
          console.log('📥 VOICEFLOW UPDATE RESPONSE BODY (JSON):', responseContent);
        } catch (e) {
          // If not JSON, get as text
          const responseText = await updateResponse.text();
          console.log('📥 VOICEFLOW UPDATE RESPONSE BODY (TEXT):', responseText);
          responseContent = responseText;
        }

        if (!updateResponse.ok) {
          console.error('❌ Failed to update Voiceflow variables:', responseContent);
        } else {
          console.log('✅ Successfully updated Voiceflow variables');
          console.log('📝 Complete LLM_Main_Response length:', response.length);
          console.log('📝 Provider used:', provider);
          console.log('📝 Model used:', model);
        }
      } catch (error) {
        console.error('❌ Error updating Voiceflow variables:', error);

        // Retry with alternative endpoint if the first attempt fails
        if (userId) {
          try {
            if (debugMode === 1) {
              console.log('🔄 Retrying variable update with alternative endpoint...');
            }

            const retryResponse = await fetch("https://utils.hypedigitaly.ai/api/voiceflow-variable-update", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: userId,
                projectName: projectName,
                variables: {
                  "LLM_Main_Response": response
                },
                debugMode: debugMode || 0
              }),
            });

            if (debugMode === 1) {
              console.log('🔄 Retry status:', retryResponse.status);
            }
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError);
          }
        }
      }
    }


    if (trace.payload) {
      await callMultiLLMAPI({
        model: trace.payload.model,
        max_tokens: trace.payload.max_tokens,
        temperature: trace.payload.temperature,
        userData: trace.payload.userData,
        systemPrompt: trace.payload.systemPrompt,
        debugMode: trace.payload.debugMode || 0,
        projectName: trace.payload.projectName,
        user_id: trace.payload.user_id,
        modelSequence: trace.payload.modelSequence || "claude" // New parameter for model sequence
      });
    } else {
      responseContent.textContent = "❌ Error: No payload received";
    }

    window.voiceflow.chat.interact({ type: "continue" });
  },
};