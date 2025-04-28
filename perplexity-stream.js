// ... (rest of the StreamingResponseExtension.js file)

// Handle thinking content or regular content
          if (parsed.isThinking === true) {
            isPerplexityThinking = true;
            if (payload.debugMode === 1) console.log(`🤔 Processing thinking content: ${content.substring(0, 50)}...`);

            // Keep track of accumulated thinking content
            if (!this.accumulatedThinking) this.accumulatedThinking = '';
            this.accumulatedThinking += content;

            // Handle thinking mode differently - show loading animation with thinking content
            const thinkingHeader = container.querySelector('.thinking-header');
            if (thinkingHeader && !thinkingHeader.classList.contains('thinking-expanded')) {
              thinkingHeader.classList.add('thinking-expanded');
              const thinkingContent = document.createElement('div');
              thinkingContent.className = 'thinking-content';
              // Show accumulated thinking instead of just current chunk
              thinkingContent.textContent = 'Thinking: ' + this.accumulatedThinking;
              thinkingHeader.appendChild(thinkingContent);
            } else if (thinkingHeader) {
              const thinkingContent = thinkingHeader.querySelector('.thinking-content');
              if (thinkingContent) {
                // Show accumulated thinking instead of just current chunk
                thinkingContent.textContent = 'Thinking: ' + this.accumulatedThinking;
              }
            }
          } else {
            // ... (rest of the else block handling regular content)
          }

// ... (rest of the StreamingResponseExtension.js file)

// Process incoming data from Perplexity
    perplexityStream.on('data', (chunk) => {
      try {
        const decodedChunk = chunk.toString();

        if (debugMode === 1) {
          console.log('📥 [got] Received chunk:', decodedChunk);
        }

        // Add to buffer and process line by line
        buffer += decodedChunk;

        // Process complete lines (events)
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          // Handle DONE marker
          if (line === 'data: [DONE]') {
            if (!seenDoneMessage) {
              // Send the [DONE] marker to client only once
              res.write('data: [DONE]\n\n');
              seenDoneMessage = true;
            }
            continue;
          }

          try {
            // Remove 'data: ' prefix and parse
            const jsonStr = line.slice(5);
            const data = JSON.parse(jsonStr);

            // Handle Perplexity-specific formats

            // 1. Handle citations if present
            if (data.citations && Array.isArray(data.citations)) {
              if (debugMode === 1) {
                console.log('🔗 [got] Received citations:', data.citations.length);
              }

              citations = data.citations;
              // Send citations as part of the stream in a format StreamingResponseExtension can parse
              const citationsData = { 
                citations: data.citations
              };
              res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
            }

            // 2. Process entire message if available (complete response)
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
              const fullContent = data.choices[0].message.content;

              // Always log the full content for debugging in a clear, structured format
              console.log('==========================================================');
              console.log('🌟 [got] RECEIVED COMPLETE MESSAGE (STANDARD RESPONSE):');
              console.log('==========================================================');
              console.log(fullContent);
              console.log('==========================================================');
              console.log('🌟 [got] END OF STANDARD RESPONSE');
              console.log('==========================================================');
              
              // Create separate data object to ensure the standard response is passed to the client
              const standardResponseData = {
                choices: [{
                  delta: { content: fullContent }
                }],
                isStandardResponse: true
              };
              
              // Send the standard response to the client
              res.write(`data: ${JSON.stringify(standardResponseData)}\n\n`);
              
              if (debugMode === 1) {
                console.log('🌟 [got] Received complete message content:', fullContent.substring(0, 100) + '...');
                console.log('🌟 [got] Sent standard response to client');
              }

              // Split the complete response into thinking and regular parts
              if (fullContent.includes('<think>') && fullContent.includes('</think>')) {
                const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/);
                const thinkingContent = thinkMatch ? thinkMatch[1] : '';
                const mainContent = fullContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();

                // First, send the thinking content
                if (thinkingContent) {
                  const thinkingData = {
                    choices: [{delta: {content: thinkingContent}}],
                    isThinking: true
                  };
                  res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
                }

                // Then send the main content token by token to simulate streaming
                if (mainContent) {
                  // Get words (or small chunks) to simulate token-by-token streaming
                  const tokens = mainContent.match(/[\w\W]{1,5}/g) || [];
                  
                  for (const token of tokens) {
                    const mainData = {
                      choices: [{delta: {content: token}}],
                      isFinalResponse: true
                    };
                    res.write(`data: ${JSON.stringify(mainData)}\n\n`);
                    
                    // Small delay to make the streaming visible
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                }
                
                // After streaming the main content, send citations as a separate chunk if available
                if (citations && citations.length > 0) {
                  const citationsData = {
                    citations: citations,
                    isPostResponseCitations: true
                  };
                  res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
                }
              } else {
                // No think tags, just send as regular content
                const tokens = fullContent.match(/[\w\W]{1,5}/g) || [];
                
                for (const token of tokens) {
                  const regularData = {
                    choices: [{delta: {content: token}}],
                    isFinalResponse: true
                  };
                  res.write(`data: ${JSON.stringify(regularData)}\n\n`);
                  
                  // Small delay to make the streaming visible
                  await new Promise(resolve => setTimeout(resolve, 10));
                }
                
                // Send citations after content if available
                if (citations && citations.length > 0) {
                  const citationsData = {
                    citations: citations,
                    isPostResponseCitations: true
                  };
                  res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
                }
              }

              continue; // Skip other processing for this line
            }

            // 3. Process content - handle content directly in data (Perplexity can send this format)
            if (data.content !== undefined) {
              const content = data.content;

              if (content !== null && content !== undefined) {
                // Process thinking/regular content with the same logic as below
                processContentChunk(content, res);
              }
              continue; // Skip to next line after processing direct content
            }

            // 4. Process standard OpenAI-like format
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const { content } = data.choices[0].delta;

              if (content !== null && content !== undefined) {
                processContentChunk(content, res);
              }
            } else if (data.error) {
              // Handle error in the stream data
              console.error('❌ [got] Perplexity stream data error:', data.error);
              res.write(`data: ${JSON.stringify({ error: data.error })}\n\n`);
            }
          } catch (e) {
            console.error('Error parsing JSON in stream:', e, 'Line:', line);
            // Skip invalid lines rather than failing the entire stream
          }
        }
      } catch (e) {
        console.error('Error processing perplexity stream chunk:', e);
      }
    });


// Helper function for Voiceflow update to keep main logic cleaner
      async function updateVoiceflowVariable(payload, completeResponse) {
         if (!completeResponse) {
             if (payload.debugMode === 1) console.log("Skipping Voiceflow update: No content generated.");
             return;
         }

         // Clean response by removing thinking sections
         let cleanResponse = completeResponse;
         if (completeResponse.includes('<think>') && completeResponse.includes('</think>')) {
            cleanResponse = completeResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            if (payload.debugMode === 1) {
               console.log('🧹 Removed thinking sections for Voiceflow update');
               console.log('📏 Original length:', completeResponse.length, 'Clean length:', cleanResponse.length);
            }
         }

         try {
            if (payload.debugMode === 1) console.log('📤 Updating Voiceflow variable with response length:', cleanResponse.length);
            const updateResponse = await fetch("https://utils.hypedigitaly.ai/api/voiceflow-variable-update", {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  user_id: payload.user_id,
                  projectName: payload.projectName,
                  variables: { 
                     "LLM_Main_Response": cleanResponse,
                     "LLM_Full_Response": completeResponse // Store both versions
                  },
                  debugMode: payload.debugMode || 0
               }),
            });
            if (!updateResponse.ok) {
               const errorText = await updateResponse.text();
               if (payload.debugMode === 1) console.error('Failed to update Voiceflow variables:', errorText);
            } else if (payload.debugMode === 1) {
               console.log('✅ Voiceflow update attempted successfully.');
               try { const responseData = await updateResponse.json(); console.log('Voiceflow update response:', responseData); }
               catch (e) { console.log('Voiceflow update status:', updateResponse.status); }
            }
         } catch (error) {
            if (payload.debugMode === 1) console.error('Error during Voiceflow variable update:', error);
         }
      }