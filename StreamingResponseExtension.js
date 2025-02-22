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
    
    container.innerHTML = `
      <style>
        .streaming-response-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 0;
        }
        .response-section {
          padding: 0;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .response-content {
          font-size: 14px;
          line-height: 1.4;
          color: #374151;
          margin: 0;
          padding: 16px;
        }
        /* Add markdown styling */
        .response-content p {
          margin: 4px 0;
          padding: 0;
        }
        .response-content p:first-child {
          margin-top: 0;
        }
        .response-content ul, .response-content ol {
          margin: 2px 0;
          padding-left: 20px;
        }
        .response-content li {
          margin: 2px 0;
          padding: 0;
        }
        .response-content h1 {
          font-size: 16px;
          margin: 12px 0 8px;
          font-weight: 600;
        }
        .response-content h1:first-child {
          margin-top: 0;
        }
        .response-content h2 {
          font-size: 14px;
          margin: 10px 0 6px;
          font-weight: 600;
        }
        .response-content h2:first-child {
          margin-top: 0;
        }
        .response-content h3 {
          font-size: 13px;
          margin: 8px 0 4px;
          font-weight: 600;
        }
        .response-content h3:first-child {
          margin-top: 0;
        }
        .response-content br {
          display: block;
          margin: 2px 0;
        }
        .response-content strong {
          font-weight: 600;
        }
        .response-content code {
          background-color: #F3F4F6;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
        .response-content a {
          color: #2563EB;
          text-decoration: none;
        }
        .response-content a:hover {
          text-decoration: underline;
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
    let buffer = '';

    function updateContent(text) {
      if (!text) return;
      
      // Append to buffer
      buffer += text;
      
      // Log the received content
      console.log('Received content:', text);
      
      // Convert markdown to HTML
      const formattedHtml = markdownToHtml(buffer);
      
      // Update content
      responseContent.innerHTML = formattedHtml;

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

    // Add markdown conversion function
    function markdownToHtml(markdown) {
      // First trim and clean the input
      let cleanedMarkdown = markdown
        .trim()
        .replace(/^\s+/gm, '') // Remove leading spaces from each line
        .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines

      // Process common introductory phrases
      cleanedMarkdown = cleanedMarkdown
        .replace(/^(here'?s?( is)?|let me|i will|i'll|allow me to|let's|okay,|so,|well,|now,|alright,).*?(:|->|\n)/i, '')
        .replace(/^(here'?s?( is)?|let me|i will|i'll|allow me to|let's) /i, '')
        .replace(/^(a |the )?(breakdown|list|summary|overview) (of|for|about) /i, '')
        .replace(/^(talking|speaking) about /i, '')
        .trim();

      // Split content into lines for better processing
      const lines = cleanedMarkdown.split('\n');
      const processedLines = [];
      let currentList = null;
      let isInParagraph = false;
      let lastLineWasHeader = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
        
        // Handle headers
        if (line.startsWith('###')) {
          if (currentList) {
            processedLines.push(currentList.type === 'ol' ? '</ol>' : '</ul>');
            currentList = null;
          }
          if (isInParagraph) {
            processedLines.push('</p>');
            isInParagraph = false;
          }
          processedLines.push(`<h3>${line.slice(3).trim()}</h3>`);
          lastLineWasHeader = true;
          continue;
        }

        if (line.startsWith('##')) {
          if (currentList) {
            processedLines.push(currentList.type === 'ol' ? '</ol>' : '</ul>');
            currentList = null;
          }
          if (isInParagraph) {
            processedLines.push('</p>');
            isInParagraph = false;
          }
          processedLines.push(`<h2>${line.slice(2).trim()}</h2>`);
          lastLineWasHeader = true;
          continue;
        }

        if (line.startsWith('#')) {
          if (currentList) {
            processedLines.push(currentList.type === 'ol' ? '</ol>' : '</ul>');
            currentList = null;
          }
          if (isInParagraph) {
            processedLines.push('</p>');
            isInParagraph = false;
          }
          processedLines.push(`<h1>${line.slice(1).trim()}</h1>`);
          lastLineWasHeader = true;
          continue;
        }

        // Handle lists
        const orderedListMatch = line.match(/^\d+\.\s+(.+)/);
        const unorderedListMatch = line.match(/^-\s+(.+)/);

        if (orderedListMatch || unorderedListMatch) {
          if (isInParagraph) {
            processedLines.push('</p>');
            isInParagraph = false;
          }

          const listContent = (orderedListMatch || unorderedListMatch)[1];
          const listType = orderedListMatch ? 'ol' : 'ul';

          if (!currentList) {
            currentList = { type: listType };
            processedLines.push(`<${listType}>`);
          } else if (currentList.type !== listType) {
            processedLines.push(currentList.type === 'ol' ? '</ol>' : '</ul>');
            currentList = { type: listType };
            processedLines.push(`<${listType}>`);
          }

          processedLines.push(`<li>${listContent}</li>`);
          lastLineWasHeader = false;
          continue;
        }

        // Handle regular text content
        if (line.length > 0) {
          if (!isInParagraph) {
            processedLines.push('<p>');
            isInParagraph = true;
          }
          processedLines.push(line);
          if (nextLine.length === 0) {
            processedLines.push('</p>');
            isInParagraph = false;
          }
        } else if (isInParagraph) {
          processedLines.push('</p>');
          isInParagraph = false;
        }
      }

      // Close any open tags
      if (currentList) {
        processedLines.push(currentList.type === 'ol' ? '</ol>' : '</ul>');
      }
      if (isInParagraph) {
        processedLines.push('</p>');
      }

      // Join lines and apply remaining markdown formatting
      return processedLines
        .join('\n')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Clean up any extra newlines between elements
        .replace(/>\n</g, '>\n<')
        .trim();
    }
  }
}