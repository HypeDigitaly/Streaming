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