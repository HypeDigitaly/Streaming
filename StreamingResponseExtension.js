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
      console.log("🌍 Language setting:", trace.payload?.lang || "cs (default)");
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
            padding: 8px 0 0 0;
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
          .response-content > *:first-child {
            margin-top: 0;
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
            line-height: 1.2;
          }
          .strong {
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
            list-style-position: outside;
          }
          /* Add rules for ordered lists to match unordered */
          .response-content ol {
            margin: 0.5em 0; /* Match ul margins */
            padding-left: 1.5em; /* Match ul padding */
            list-style-position: outside; /* Ensure numbers are outside */
          }
          /* Apply consistent styling to all list items */
          .response-content ul li,
          .response-content ol li {
            margin: 0 0 0.3em 0;
            padding-left: 0.5em;
            line-height: 20px; /* Ensure consistent line height */
            margin-bottom: 0.6em; /* Increase bottom margin specifically for ordered lists */
          }
          .response-content li.sublist {
            margin: 0.5em 0;
          }
          .response-content br {
            margin: 0;
            line-height: 1;
          }
          .response-content p {
            margin: 0.5em 0;
            margin-bottom: 1em; /* Increased bottom margin for better paragraph separation */
          }
          .response-content a {
            word-break: break-all;
          }
          .response-content a::before {
            content: "→ ";
          }
          /* Add spacing for adjacent links */
          .response-content a + a {
            margin-top: 1em; /* Increased space above links that follow other links */
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
            margin: 0 0 0;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h1:first-child {
            margin-top: 0;
          }
          .response-content .answer-h2 {
            font-size: 1.2em;
            margin: 0 0 0;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h2:first-child {
            margin-top: 0;
          }
          .response-content .answer-h3 {
            font-size: 1.1em;
            margin: 0 0 0;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h3:first-child {
            margin-top: 0;
          }
          .response-content code {
            /* Style for inline code */
            background-color: #f0f0f0; /* Light grey background */
            padding: 0.1em 0.4em; /* Small padding */
            border-radius: 4px; /* Rounded corners */
            font-family: monospace; /* Monospace font */
            margin: 0;
            line-height: 1;
          }
          .ai-info-footer {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #6B7280;
            cursor: pointer;
            position: relative;
            padding: 8px 10px 0px 0;
            margin-bottom: 0;
            border-radius: 4px;
            transition: background-color 0.2s ease;
            user-select: none;
          }
          .ai-info-footer:hover {
            background-color: #f3f4f6;
          }
          .ai-icon {
            font-weight: bold;
            margin-right: 4px;
          }
          .ai-info-text {
            flex-grow: 1;
          }
          .ai-info-footer::after {
            content: '▼';
            font-size: 10px;
            margin-left: 8px;
            transition: transform 0.2s ease;
          }
          .ai-info-footer.tooltip-visible::after {
            transform: rotate(180deg);
          }
          .model-info-tooltip {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            box-sizing: border-box;
            margin-top: 5px;
            background-color: #ffffff;
            color: #1a1e23;
            padding: 12px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #E5E7EB;
            z-index: 10;
            transition: opacity 0.3s ease;
            user-select: text;
            text-align: left;
          }
          .model-info-tooltip.visible {
            display: block;
          }
          .model-info-tooltip.claude,
          .model-info-tooltip.openai,
          .model-info-tooltip.gemini,
          .model-info-tooltip.groq {
            background-color: #E2F2D9;
            color: #333;
          }
          
          /* Perplexity Reasoning Styles */
          .perplexity-reasoning {
            background-color: #F9FAFB;
            border-radius: 8px;
            padding: 12px;
            margin: 0 0 12px 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .reasoning-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .reasoning-title {
            font-size: 14px;
            color: #111827;
          }
          .reasoning-toggle {
            cursor: pointer;
            color: #6B7280;
            font-size: 12px;
          }
          .reasoning-content {
            font-size: 12px;
            color: #4B5563;
          }
          .reasoning-step {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 6px;
          }
          .step-checkbox {
            color: #10B981;
            font-weight: bold;
            font-size: 10px;
            line-height: 1;
          }
          .step-content {
            flex: 1;
          }
          /* Citation link styles */
          .citation-link {
            color: #2563EB;
            text-decoration: none;
            font-weight: normal;
            cursor: pointer;
            margin: 0;
            padding: 0;
            display: inline;
          }
          .citation-link:hover {
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

    // Process citations in text and format them as links
    function processCitations(text, citations) {
      if (!citations || !Array.isArray(citations) || citations.length === 0) {
        return text;
      }

      // Replace citation markers [1], [2], etc. with links
      return text.replace(/\[(\d+)\]/g, (match, number) => {
        const index = parseInt(number) - 1;
        if (index >= 0 && index < citations.length) {
          const url = citations[index];
          return `<a href="${url}" target="_blank" class="citation-link">[${number}]</a>`;
        }
        return match;
      });
    }

    // Update the answer content with markdown support
    function updateContent(text, citations = null) {
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

      // Process citations if available
      let processedBuffer = citations ? processCitations(buffer, citations) : buffer;

      // Format markdown content
      const formattedContent = processedBuffer
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^\s{2}- (.*$)/gm, '<li class="sublist">$1</li>')
        .replace(/^\\d+\\.\\s+(.*$)/gm, '<li>$1</li>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, function(match, alt, url) {
          // Convert HTTP to HTTPS if it's not already
          const secureUrl = url.replace(/^http:\/\//i, 'https://');
          return `<img src="${secureUrl}" alt="${alt}" style="max-width:100%; height:auto;">`;
        })
        // Convert markdown links to HTML links (arrow removed, handled by CSS now)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/^- (.*$)/gm, (match, content) => {
          const indentation = match.match(/^\s*/)[0].length;
          return `<li class="${indentation > 0 ? 'sublist' : ''}">${content.trim()}</li>`;
        })
        .replace(/(?:^|\n)(<li)/g, '\n<ul>$1')
        .replace(/(<\/li>)(?:\n(?!<li)|$)/g, '$1</ul>');

      // --- BEGIN: Post-process lists and clean up empty items ---
      const tempContainer = document.createElement('div');
      // Use DOMParser for potentially cleaner initial parsing if needed, but innerHTML is often sufficient
      tempContainer.innerHTML = formattedContent; 

      // Function to wrap consecutive LIs
      function wrapListItems(listType /* 'ol' or 'ul' */) {
        const items = tempContainer.querySelectorAll('li'); // Get all LIs
        let currentList = null;

        items.forEach((li, index) => {
          // Rough heuristic: Check if it looks like a numbered list item was intended
          // This relies on the number potentially being left as text by the simple regex
          const looksNumbered = /^\\d+\\.\\s*/.test(li.textContent.trim()); 
          const targetListType = looksNumbered ? 'ol' : 'ul';

          // Only process items matching the current function call type (ol or ul)
          if (targetListType !== listType) return;

          // Skip items already inside a list (e.g., nested lists - handle later if needed)
          if (li.parentElement.tagName === 'OL' || li.parentElement.tagName === 'UL') {
            currentList = null; // Reset sequence if we encounter an already nested item
            return; 
          }

          const prevSibling = li.previousElementSibling;

          // Start a new list if needed
          if (!currentList || !prevSibling || prevSibling.tagName !== 'LI' || (prevSibling.parentElement.tagName !== listType.toUpperCase())) {
            currentList = document.createElement(listType);
            li.parentNode.insertBefore(currentList, li);
          }

          // Move the li into the current list
          if (currentList) {
            currentList.appendChild(li);
          }
        });
      }

      // Wrap OL items first, then UL items
      wrapListItems('ol');
      wrapListItems('ul');
      
      // Clean up empty numbered list items (modified check)
      const listItems = tempContainer.querySelectorAll('ol > li, ul > li');
      listItems.forEach(li => {
        // Check if the list item is effectively empty or just a marker
        const contentCheck = li.innerHTML.replace(/^\\d+\\.\\s*/, '').trim(); // Remove number marker for check
        if (contentCheck === '' || contentCheck === '<br>') {
          // Check if it's truly empty, not containing other important tags
          if (!li.querySelector('a, img, code, strong, em, ul, ol')) {
             li.remove();
          }
        }
      });
      
      // Remove any potentially empty OL/UL tags left after cleaning LIs
      tempContainer.querySelectorAll('ol, ul').forEach(list => {
        if (!list.hasChildNodes()) {
          list.remove();
        }
      });

      const cleanedHtml = tempContainer.innerHTML;
      // --- END: Post-process lists and clean up empty items ---

      // Update content with formatting using the cleaned HTML
      responseContent.innerHTML = cleanedHtml;

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

    // Main models registry
    const modelsRegistry = [
      // Claude models
      {
        id: 1,
        name: 'claude-3-7-sonnet-20250219',
        type: 'claude',
        endpoint: '/api/claude-stream',
        displayName: 'Claude 3.7 Sonnet'
      },
      {
        id: 2,
        name: 'claude-3-5-haiku-20241022',
        type: 'claude',
        endpoint: '/api/claude-stream',
        displayName: 'Claude 3.5 Haiku'
      },
      {
        id: 3,
        name: 'claude-3-sonnet-20240229',
        type: 'claude',
        endpoint: '/api/claude-stream',
        displayName: 'Claude 3 Sonnet'
      },

      // OpenAI models
      {
        id: 4,
        name: 'gpt-4.1-2025-04-14',
        type: 'openai',
        endpoint: '/api/openai-stream',
        displayName: 'GPT-4.1'
      },
      {
        id: 5,
        name: 'gpt-4.1-mini-2025-04-14',
        type: 'openai',
        endpoint: '/api/openai-stream',
        displayName: 'GPT-4.1 Mini'
      },

      // Gemini models
      {
        id: 6,
        name: 'gemini-2.5-pro',
        type: 'gemini',
        endpoint: '/api/gemini-stream',
        displayName: 'Gemini 2.5 Pro'
      },
      {
        id: 7,
        name: 'gemini-2.5-flash',
        type: 'gemini',
        endpoint: '/api/gemini-stream',
        displayName: 'Gemini 2.5 Flash'
      },

      // Groq models
      {
        id: 8,
        name: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        type: 'groq',
        endpoint: '/api/groq-stream',
        displayName: 'Llama 4 Maverick'
      },
      {
        id: 9,
        name: 'meta-llama/llama-4-scout-17b-16e-instruct',
        type: 'groq',
        endpoint: '/api/groq-stream',
        displayName: 'Llama 4 Scout'
      },
      
      // Perplexity models
      {
        id: 10,
        name: 'sonar-reasoning-pro',
        type: 'perplexity',
        endpoint: '/api/perplexity-stream',
        displayName: 'Perplexity Sonar Reasoning Pro',
        supportsReasoning: true,
        reasoningIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <ellipse cx="12" cy="8" stroke="#1B1B1B" stroke-width="2" rx="7" ry="3" transform="rotate(-45 12 8)"></ellipse>
          <ellipse cx="12" cy="8" stroke="#1B1B1B" stroke-width="2" rx="7" ry="3" transform="rotate(45 12 8)"></ellipse>
          <path fill="#1B1B1B" d="M19 7.5C19 7.2 18.8 7 18.5 7C18.2 7 18 7.2 18 7.5H19ZM11.8 3C12.1 3 12.3 2.8 12.3 2.5C12.3 2.2 12.1 2 11.8 2V3ZM5.2 12H5.8C5.8 11.7 5.7 11.4 5.3 11.3L5.2 12ZM15.5 15.7C15.6 16 16 16.1 16.2 16C16.5 15.9 16.6 15.6 16.5 15.3L15.5 15.7ZM9.9 15.2C10.1 15.1 10.2 14.8 10.1 14.6C10 14.3 9.7 14.2 9.5 14.3L9.9 15.2ZM14.8 18.5V19V18.5ZM4.2 11.7L4 12.1L4.2 11.7ZM9.6 18.5L9.6 19L9.6 18.5ZM5.5 8.8L5.1 8.5L5.5 8.8ZM5.9 8.1L5.1 8L5.9 8.1ZM6.7 15.5L6.6 15L6.7 15.5ZM15.4 15.5L15.9 15.4C15.9 15.4 15.9 15.4 15.9 15.3L15.4 15.5ZM18 7.5C18 10.2 17.7 11.2 17.1 11.7L18.2 12.3C19.2 11.6 19 10.3 19 7.5H18ZM4.3 9.3L5.9 8.3L5.1 7.3L3.5 8.3L4.3 9.3ZM5.3 11.3L4.4 10.8L4 12.1L4.9 12.6L5.3 11.3ZM5.8 14.2V12H4.8V14.2H5.8ZM8.2 14.8L6.6 15.1L6.8 16.1L8.4 15.8L8.2 14.8ZM8.8 17.2V15.3H7.8V17.2H8.8ZM14.8 18H9.6V19H14.8V18ZM15.2 15.7L15.6 16.9L16.6 16.7L16.2 15.4L15.2 15.7ZM8.4 15.8L9.9 15.2L9.5 14.3L8 14.9L8.4 15.8ZM6.9 5.5C8.2 3.4 10.1 3 11.8 3V2C10 2 7.6 2.4 6 5L6.9 5.5ZM5.5 6.9L5.1 8.1L6.1 8.2L6.4 7L5.5 6.9ZM14.8 19C15.8 19 16.7 17.9 16.6 16.9L15.6 16.9C15.6 17.3 15.3 18 14.8 18V19ZM3.5 8.3C2.9 8.9 3.1 9.9 4 12.1L4.4 10.8C4.3 10.8 4.3 10.7 4.3 9.3L3.5 8.3ZM7.8 17.2C7.8 18.2 8.6 19 9.6 19L9.6 18C9.2 18 8.8 17.6 8.8 17.2H7.8ZM5.9 8.3C6.1 8.1 6.3 7.9 6.4 7L5.1 8.1C5.1 8.2 5 8.2 5.1 8.3L5.9 8.3ZM4.8 14.2C4.8 15.4 5.7 16.2 6.8 16.1L6.6 15.1C6.1 15.1 5.8 14.7 5.8 14.2H4.8ZM6 5C5.7 5.5 5.5 6.2 5.5 6.9L6.4 7C6.5 6.4 6.6 5.9 6.9 5.5L6 5Z"></path>
        </svg>`
      }
    ];

    // Function to process model sequence
    function parseModelSequence(sequenceStr) {
      if (!sequenceStr) return [1]; // Default to first model if none specified

      // Parse sequence string to array of numbers
      return sequenceStr.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && modelsRegistry.some(m => m.id === id));
    }

    // Function to get detailed model info by ID
    function getModelDetailById(modelId) {
      const model = modelsRegistry.find(m => m.id === modelId);
      return model ? 
        `ID:${model.id} | ${model.displayName} (${model.type}) | Model: ${model.name}` : 
        `Unknown model ID: ${modelId}`;
    }

    // Adds AI info footer to the UI
    function addAIInfoFooter(attemptedModels) {
      // Determine overall success and find the successful model details
      const successfulAttempt = attemptedModels.find(m => m.success === true);
      const successfulModel = successfulAttempt 
        ? modelsRegistry.find(m => m.id === successfulAttempt.id)
        : null;
      const wasSuccess = !!successfulModel;

      // Create footer container
      const aiInfoFooter = document.createElement('div');
      aiInfoFooter.className = 'ai-info-footer';
      aiInfoFooter.style.position = 'relative'; // Add relative positioning for tooltip
      aiInfoFooter.setAttribute('title', 'Click to show/hide AI model execution details');

      // Create AI icon
      const aiIcon = document.createElement('div');
      aiIcon.className = 'ai-icon';
      aiIcon.textContent = 'AI';

      // Create info text
      const aiInfoText = document.createElement('div');
      aiInfoText.className = 'ai-info-text';

      // Language support for messages
      const languageMessages = {
        cs: {
          success: 'Odpověď generována pomocí AI.',
          failure: 'AI generování selhalo.'
        },
        en: {
          success: 'Response generated by AI.',
          failure: 'AI generation failed.'
        },
        de: {
          success: 'Antwort durch KI generiert.',
          failure: 'KI-Generierung fehlgeschlagen.'
        },
        uk: {
          success: 'Відповідь згенерована ШІ.',
          failure: 'Генерація ШІ не вдалася.'
        }
      };

      // Get language from payload, default to Czech
      const userLang = trace.payload?.lang || 'cs';
      // Get language messages or fall back to Czech if not supported
      const messages = languageMessages[userLang] || languageMessages.cs;

      if (wasSuccess) {
        aiInfoText.textContent = messages.success;
      } else {
        aiInfoText.textContent = messages.failure;
        aiInfoFooter.style.color = '#DC2626'; // Indicate failure visually
      }

      // Create tooltip with simplified model sequence info
      const modelInfoTooltip = document.createElement('div');
      const modelTypeClass = successfulModel ? successfulModel.type : 'failed'; // Use type for styling or 'failed'
      modelInfoTooltip.className = `model-info-tooltip ${modelTypeClass}`;

      // Language support for tooltip messages
      const tooltipMessages = {
        cs: {
          title: 'Spuštěné AI modely:',
          noModels: 'Žádné modely nebyly spuštěny.',
          allFailed: '(Všechny selhaly)',
          unknown: 'Neznámý ID:'
        },
        en: {
          title: 'AI models executed:',
          noModels: 'No models were executed.',
          allFailed: '(All failed)',
          unknown: 'Unknown ID:'
        },
        de: {
          title: 'Ausgeführte KI-Modelle:',
          noModels: 'Es wurden keine Modelle ausgeführt.',
          allFailed: '(Alle fehlgeschlagen)',
          unknown: 'Unbekannte ID:'
        },
        uk: {
          title: 'Виконані моделі ШІ:',
          noModels: 'Жодна модель не була виконана.',
          allFailed: '(Усі не вдалися)',
          unknown: 'Невідомий ID:'
        }
      };

      // Get tooltip messages or fall back to Czech if not supported
      const tooltipText = tooltipMessages[userLang] || tooltipMessages.cs;

      let tooltipHTML = `<strong>${tooltipText.title}</strong> `;
      if (attemptedModels.length > 0) {
        tooltipHTML += attemptedModels.map(attempt => {
          const modelInfo = modelsRegistry.find(m => m.id === attempt.id);
          const displayName = modelInfo ? modelInfo.displayName : `${tooltipText.unknown}${attempt.id}`;
          const statusIcon = attempt.success === true ? '✅' : '❌';
          return `${statusIcon} ${displayName}`;
        }).join(' → '); // Use arrow separator
      } else {
        tooltipHTML += tooltipText.noModels; // Fallback message
      }

      // Add overall result if all failed
      if (!wasSuccess && attemptedModels.length > 0) {
        tooltipHTML += ` ${tooltipText.allFailed}`;
      }

      modelInfoTooltip.innerHTML = tooltipHTML;

      // Assemble the elements
      aiInfoFooter.appendChild(aiIcon);
      aiInfoFooter.appendChild(aiInfoText);
      aiInfoFooter.appendChild(modelInfoTooltip);

      // Toggle dropdown visibility on click
      aiInfoFooter.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const isVisible = modelInfoTooltip.classList.toggle('visible');
        // Toggle class on footer for icon rotation
        if (isVisible) {
          aiInfoFooter.classList.add('tooltip-visible');
        } else {
          aiInfoFooter.classList.remove('tooltip-visible');
        }
      });

      // Prevent tooltip from closing when clicking inside it
      modelInfoTooltip.addEventListener('click', function(e) {
        e.stopPropagation();
      });

      // Close tooltip only when clicking outside both the footer and tooltip
      document.addEventListener('click', function(e) {
        if (!aiInfoFooter.contains(e.target) && !modelInfoTooltip.contains(e.target)) {
          modelInfoTooltip.classList.remove('visible');
          aiInfoFooter.classList.remove('tooltip-visible'); // Also remove class here
        }
      });

      // Add the footer after the response content
      // Ensure it's added only once (important if called on failure after potential partial success render)
      const existingFooter = responseSection.querySelector('.ai-info-footer');
      if (existingFooter) {
        existingFooter.remove();
      }
      responseSection.appendChild(aiInfoFooter);
    }

    // Generic function to call any LLM API provider with TTFT timeout
    async function callLLMAPI(endpoint, payload) {
      const TTFT_TIMEOUT_MS = 5000; // Time To First Token timeout (5 seconds)
      const abortController = new AbortController();
      let ttftTimeoutId = null;
      let firstChunkReceived = false;
      let resolveFirstChunkPromise = null;
      let rejectFirstChunkPromise = null;

      // Promise that resolves ONLY when the first chunk arrives or rejects on early error
      const firstChunkPromise = new Promise((resolve, reject) => {
        resolveFirstChunkPromise = resolve;
        rejectFirstChunkPromise = reject; // To handle errors *before* the first chunk
      });

      // Promise for the TTFT timeout
      const ttftTimeoutPromise = new Promise((_, reject) => {
        ttftTimeoutId = setTimeout(() => {
          // Check if first chunk has already been received; if so, timeout is irrelevant
          if (firstChunkReceived) return;

          if (payload.debugMode === 1) {
            console.log(`⏰ TTFT Timeout (${TTFT_TIMEOUT_MS}ms) reached for ${endpoint}. Aborting fetch.`);
          }
          // Abort the fetch *before* rejecting due to timeout
          if (!abortController.signal.aborted) {
            abortController.abort('TTFT Timeout'); // Use a reason for clarity
          }
          reject(new Error(`TTFT timeout after ${TTFT_TIMEOUT_MS}ms for ${endpoint}`));
        }, TTFT_TIMEOUT_MS);
      });

      // This function handles the actual fetch and stream processing
      const processStream = async () => {
        let response;
        let localCompleteResponse = '';
        let receivedAnyContent = false; // Track if *any* content was processed successfully
        let perplexityState = null; // State for handling Perplexity reasoning format

        try {
          const proxyUrl = `https://utils.hypedigitaly.ai${endpoint}`;
          if (payload.debugMode === 1) {
            console.log(`📦 Payload for ${endpoint}:`, {
              model: payload.model,
              max_tokens: payload.max_tokens,
              temperature: payload.temperature,
              debugMode: payload.debugMode,
              projectName: payload.projectName,
              systemPrompt: payload.systemPrompt,
              user_id: payload.user_id
            });
            console.log(` Calling proxy URL: ${proxyUrl} with TTFT ${TTFT_TIMEOUT_MS}ms`);
          }

          response = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: abortController.signal // Use the abort signal
          });

          if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try { errorText += `, body: ${await response.text()}`; } catch (e) { /* ignore */ }
            // Reject the firstChunkPromise if the initial fetch fails
            throw new Error(errorText);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let streamBuffer = '';

          while (true) {
            // Check for abort *before* reading - handles external aborts or quick timeouts
            if (abortController.signal.aborted) {
               throw new Error(`Fetch aborted during read for ${endpoint}. Reason: ${abortController.signal.reason || 'Unknown'}`);
            }

            const { done, value } = await reader.read();

            if (value) {
              streamBuffer += decoder.decode(value, { stream: true });
            }

            let lines = streamBuffer.split('\n');
            streamBuffer = done ? '' : lines.pop() || '';

            for (const line of lines) {
              if (abortController.signal.aborted) {
                  // Stop processing immediately if aborted (e.g., by timeout while processing buffer)
                  throw new Error(`Fetch aborted during line processing for ${endpoint}. Reason: ${abortController.signal.reason || 'Unknown'}`);
              }

              if (!line.trim() || !line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                if (payload.debugMode === 1) console.log(`[DONE] received for ${endpoint}.`);
                // Attempt Voiceflow update only if content was actually received and processed
                if (receivedAnyContent) {
                   await updateVoiceflowVariable(payload, localCompleteResponse);
                } else if (payload.debugMode === 1) {
                   console.log("⚠️ No content received before [DONE], skipping Voiceflow update.");
                }
                return { success: true }; // Signal successful completion
              }

              try {
                if (data.startsWith('{') && data.endsWith('}')) {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    throw new Error(`Stream error from ${endpoint}: ${parsed.error}`);
                  }

                  // Extract content and potential citations
                  const content = parsed.content || '';
                  const citations = parsed.citations || null;
                  
                  if (content || typeof content === 'string') { // Handle empty string content too
                    receivedAnyContent = true; // Mark that we have received processable content

                    // --- TTFT Logic ---
                    if (!firstChunkReceived) {
                      firstChunkReceived = true;
                      if (payload.debugMode === 1) console.log(`✅ First chunk received from ${endpoint} within timeout.`);
                      // Crucially, clear the TTFT timer now
                      if (ttftTimeoutId) clearTimeout(ttftTimeoutId);
                      // Signal that the TTFT hurdle is passed
                      resolveFirstChunkPromise();
                    }
                    // --- End TTFT Logic ---

                    // Special handling for Perplexity reasoning content
                    const isPerplexity = model && model.type === 'perplexity';

                    if (isPerplexity) {
                      // Process Perplexity reasoning format
                      if (!perplexityState) {
                        perplexityState = {
                          isInThinkBlock: false,
                          thinkingContent: '',
                          answerContent: '',
                          reasoningElements: null,
                          reasoningVisible: true
                        };
                        
                        // Create reasoning UI elements if they don't exist
                        if (!responseContent.querySelector('.perplexity-reasoning')) {
                          const reasoningSection = document.createElement('div');
                          reasoningSection.className = 'perplexity-reasoning';
                          reasoningSection.innerHTML = `
                            <div class="reasoning-header">
                              <div class="reasoning-title">Reasoning</div>
                              <div class="reasoning-toggle">▼</div>
                            </div>
                            <div class="reasoning-content"></div>
                          `;
                          responseContent.appendChild(reasoningSection);
                          
                          // Add toggle behavior
                          const toggleBtn = reasoningSection.querySelector('.reasoning-toggle');
                          toggleBtn.addEventListener('click', () => {
                            const content = reasoningSection.querySelector('.reasoning-content');
                            if (content.style.display === 'none') {
                              content.style.display = 'block';
                              toggleBtn.textContent = '▼';
                              perplexityState.reasoningVisible = true;
                            } else {
                              content.style.display = 'none';
                              toggleBtn.textContent = '▶';
                              perplexityState.reasoningVisible = false;
                            }
                          });
                          
                          perplexityState.reasoningElements = {
                            section: reasoningSection,
                            content: reasoningSection.querySelector('.reasoning-content')
                          };
                        }
                      }
                      
                      // Process <think> tags for reasoning steps
                      if (content.includes('<think>')) {
                        perplexityState.isInThinkBlock = true;
                        const thinkingPart = content.split('<think>')[1] || '';
                        perplexityState.thinkingContent += thinkingPart;
                        
                        // Update reasoning UI
                        if (perplexityState.reasoningElements) {
                          // Split thinking content into steps by line breaks
                          const steps = perplexityState.thinkingContent.split('\n')
                            .filter(step => step.trim().length > 0);
                          
                          // Update reasoning content
                          perplexityState.reasoningElements.content.innerHTML = '';
                          steps.forEach(step => {
                            const stepElem = document.createElement('div');
                            stepElem.className = 'reasoning-step';
                            stepElem.innerHTML = `
                              <div class="step-checkbox">✓</div>
                              <div class="step-content">${processCitations(step, citations)}</div>
                            `;
                            perplexityState.reasoningElements.content.appendChild(stepElem);
                          });
                        }
                        
                      } else if (content.includes('</think>')) {
                        perplexityState.isInThinkBlock = false;
                        const parts = content.split('</think>');
                        if (parts[0]) {
                          // Last part of thinking content
                          perplexityState.thinkingContent += parts[0];
                          
                          // Update reasoning UI with final thinking content
                          if (perplexityState.reasoningElements) {
                            const steps = perplexityState.thinkingContent.split('\n')
                              .filter(step => step.trim().length > 0);
                            
                            perplexityState.reasoningElements.content.innerHTML = '';
                            steps.forEach(step => {
                              const stepElem = document.createElement('div');
                              stepElem.className = 'reasoning-step';
                              stepElem.innerHTML = `
                                <div class="step-checkbox">✓</div>
                                <div class="step-content">${processCitations(step, citations)}</div>
                              `;
                              perplexityState.reasoningElements.content.appendChild(stepElem);
                            });
                          }
                        }
                        
                        // Get content after </think> as answer content
                        if (parts[1]) {
                          perplexityState.answerContent += parts[1];
                          updateContent(parts[1], citations);
                        }
                        
                      } else if (perplexityState.isInThinkBlock) {
                        // Inside thinking block, accumulate thinking content
                        perplexityState.thinkingContent += content;
                        
                        // Update reasoning UI
                        if (perplexityState.reasoningElements) {
                          const steps = perplexityState.thinkingContent.split('\n')
                            .filter(step => step.trim().length > 0);
                          
                          perplexityState.reasoningElements.content.innerHTML = '';
                          steps.forEach(step => {
                            const stepElem = document.createElement('div');
                            stepElem.className = 'reasoning-step';
                            stepElem.innerHTML = `
                              <div class="step-checkbox">✓</div>
                              <div class="step-content">${processCitations(step, citations)}</div>
                            `;
                            perplexityState.reasoningElements.content.appendChild(stepElem);
                          });
                        }
                        
                      } else {
                        // Regular content outside of thinking block
                        perplexityState.answerContent += content;
                        updateContent(content, citations);
                      }
                      
                      // Store complete response for both thinking and answer content
                      localCompleteResponse = perplexityState.answerContent;
                      
                    } else {
                      // Standard content processing for non-Perplexity models
                      // Update UI only if the fetch wasn't aborted *before* this point
                      if (!abortController.signal.aborted) {
                          updateContent(content, citations);
                          localCompleteResponse += content;
                      } else {
                          // Should theoretically not happen if abort check is robust, but good failsafe
                          if (payload.debugMode === 1) console.warn(`⚠️ Content received for ${endpoint} *after* abort signal. Discarding.`);
                          // Do not update UI or localCompleteResponse if aborted
                      }
                    }
                  }
                } else if (payload.debugMode === 1 && data) {
                   console.log(`Received non-JSON data chunk from ${endpoint}:`, data);
                }
              } catch (parseError) {
                 if (payload.debugMode === 1) console.warn(`Failed to parse SSE data line for ${endpoint}:`, parseError, 'Data:', data);
              }
            } // End line processing loop

            if (done) {
              if (payload.debugMode === 1) console.log(`Stream ended naturally (done=true) for ${endpoint}.`);
              // If stream ends without [DONE], but we got content, consider it success
              if (receivedAnyContent) {
                if (payload.debugMode === 1) console.log("Attempting Voiceflow update on natural stream end.");
                await updateVoiceflowVariable(payload, localCompleteResponse);
                return { success: true };
              } else {
                // No content AND no [DONE] -> Treat as failure for this provider
                throw new Error(`Stream ended for ${endpoint} without [DONE] signal or any valid content.`);
              }
            }
          } // End while true loop

        } catch (error) {
            // Catch all errors from fetch, reading, processing
            if (error.name === 'AbortError') {
                // Log abort reason, but the failure is handled by the Promise.race outcome
                if (payload.debugMode === 1) console.log(`Fetch aborted for ${endpoint}. Reason: ${abortController.signal.reason || 'Unknown'}`);
            } else {
                // Log other errors
                if (payload.debugMode === 1) console.error(`Error during stream processing for ${endpoint}:`, error);
            }
            // If an error occurs *before* the first chunk, reject the firstChunkPromise
            if (!firstChunkReceived) {
                try { rejectFirstChunkPromise(error); } catch (e) { /* ignore if already settled */ }
            }
            // Ensure the process signals failure
            return { success: false };
        } finally {
          // Always clear the timeout if it's still pending when processing finishes/errors
          if (ttftTimeoutId) clearTimeout(ttftTimeoutId);
        }
      };

      // Helper function for Voiceflow update to keep main logic cleaner
      async function updateVoiceflowVariable(payload, completeResponse) {
         if (!completeResponse) {
             if (payload.debugMode === 1) console.log("Skipping Voiceflow update: No content generated.");
             return;
         }
         try {
            if (payload.debugMode === 1) console.log('📤 Updating Voiceflow variable with response length:', completeResponse.length);
            const updateResponse = await fetch("https://utils.hypedigitaly.ai/api/voiceflow-variable-update", {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  user_id: payload.user_id,
                  projectName: payload.projectName,
                  variables: { "LLM_Main_Response": completeResponse },
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

      // --- Main Execution Logic ---
      try {
        // Start processing the stream in the background. We don't await it here directly.
        const streamProcessingResultPromise = processStream();

        // Race: Wait for EITHER the first chunk OR the TTFT timeout.
        await Promise.race([firstChunkPromise, ttftTimeoutPromise]);

        // ---- If we reach this point, firstChunkPromise resolved successfully (TTFT met) ----
        if (payload.debugMode === 1) console.log(`TTFT met for ${endpoint}. Waiting for stream completion...`);

        // Now, wait for the *rest* of the stream processing to finish.
        const result = await streamProcessingResultPromise;

        // Return true only if the full stream processing completed successfully *after* TTFT was met.
        return result.success;

      } catch (error) {
        // ---- This catch block handles: ----
        // 1. Rejection from ttftTimeoutPromise (TTFT timeout occurred before first chunk)
        // 2. Rejection from firstChunkPromise (e.g., fetch failed *before* first chunk)
        if (payload.debugMode === 1) {
          // Differentiate log based on error type
          if (error.message.startsWith('TTFT timeout')) {
             console.warn(`callLLMAPI failed for ${endpoint} due to TTFT timeout.`);
          } else {
             console.error(`callLLMAPI failed for ${endpoint} before first chunk. Reason:`, error.message);
          }
        }

        // Ensure fetch is aborted if it hasn't been already (especially for non-timeout errors)
        if (!abortController.signal.aborted) {
          abortController.abort('callLLMAPI error before first chunk');
        }

        // Make sure thinking animation is hidden if we fail early
        if (isFirstChunk) {
            const thinkingHeader = container.querySelector('.thinking-header');
            if (thinkingHeader && !thinkingHeader.classList.contains('hidden')) {
                thinkingHeader.classList.add('hidden');
                responseSection.classList.add('visible'); // Show section even on failure
            }
            isFirstChunk = false; // Mark as not first chunk anymore
        }
        return false; // Indicate failure for this attempt
      }
    }

    async function orchestrateLLMCalls(trace) {
      if (!trace.payload) {
        responseContent.textContent = "Error: No payload received";
        return;
      }

      // Parse the model sequence
      const modelSequence = parseModelSequence(trace.payload.modelSequence);

      if (trace.payload.debugMode === 1) {
        console.log("📊 MODEL SEQUENCE DEBUG INFO:");
        console.log("=== CONFIGURED MODEL SEQUENCE ===");
        console.log(`📋 Raw sequence: ${trace.payload.modelSequence || "Default"}`);
        console.log(`📋 Parsed IDs: ${JSON.stringify(modelSequence)}`);

        // Print detailed model info
        console.log("=== MODELS IN SEQUENCE ===");
        modelSequence.forEach((modelId, index) => {
          console.log(`📌 Position ${index}: ${getModelDetailById(modelId)}`);
        });
        console.log("=============================");
      }

      // Keep track of models attempted and their outcome
      const attemptedModels = [];
      let successfulModelFound = false; // Flag to track if we found a working model

      // Try each model in sequence
      for (const modelId of modelSequence) {
        // If we already found a successful model, don't try others
        if (successfulModelFound) break;

        const model = modelsRegistry.find(m => m.id === modelId);

        if (!model) {
          if (trace.payload.debugMode === 1) {
            console.log(`⚠️ Unknown model ID ${modelId}, skipping`);
          }
          continue;
        }

        // Record the attempt before calling the API
        const currentAttempt = { id: model.id, success: null };
        attemptedModels.push(currentAttempt);

        if (trace.payload.debugMode === 1) {
          console.log(`\n🔄 ATTEMPT ${attemptedModels.length}/${modelSequence.length}: Using model ID:${model.id}`);
          console.log(`📌 Model: ${model.displayName} (${model.type})`);
          console.log(`📌 Model name: ${model.name}`);
          console.log(`📌 Endpoint: ${model.endpoint}`);
          console.log(`📌 Status: STARTING REQUEST`);
        }

        // Prepare payload for API call
        const payload = {
          model: model.name,
          max_tokens: trace.payload.max_tokens,
          temperature: trace.payload.temperature,
          userData: trace.payload.userData,
          systemPrompt: trace.payload.systemPrompt,
          debugMode: trace.payload.debugMode || 0,
          projectName: trace.payload.projectName,
          user_id: trace.payload.user_id,
        };

        // Call the LLM API
        const success = await callLLMAPI(model.endpoint, payload);

        // Update the status of the current attempt
        currentAttempt.success = success;

        // If successful, stop trying other models and add footer
        if (success) {
          successfulModelFound = true; // Set the flag
          if (trace.payload.debugMode === 1) {
            console.log(`\n✅ SUCCESS: MODEL ID:${model.id}`);
            console.log(`📌 Model: ${model.displayName} (${model.type})`);
            console.log(`📌 Model name: ${model.name}`);
            console.log(`📌 Status: COMPLETED SUCCESSFULLY`);
            console.log(`📌 Attempt: ${attemptedModels.length}/${modelSequence.length}`);
            console.log(`=============================`);
          }
          addAIInfoFooter(attemptedModels); // Pass the list of attempted models
          // No return here, let loop break naturally or finish
        } else {
            // --- Failure case within the loop ---
            if (trace.payload.debugMode === 1) {
                console.log(`\n❌ FAILED: MODEL ID:${model.id}`);
                console.log(`📌 Model: ${model.displayName} (${model.type})`);
                console.log(`📌 Model name: ${model.name}`);
                console.log(`📌 Status: REQUEST FAILED OR TIMED OUT`);
                console.log(`📌 Attempt: ${attemptedModels.length}/${modelSequence.length}`);
            }

            // *** IMPORTANT: Clear content before trying the next model ***
            if (responseContent) {
                 if (trace.payload.debugMode === 1) {
                    console.log(`🧼 Clearing response content before next attempt.`);
                 }
                 responseContent.innerHTML = ''; // Clear the displayed content
                 completeResponse = ''; // Reset the global complete response accumulator
                 // We might potentially reset isFirstChunk = true here if we want the loader again
                 // For now, just clearing content.
            }

            // Check if there are more models to try
            const nextModelIndex = modelSequence.indexOf(modelId) + 1;
            if (nextModelIndex < modelSequence.length) {
              const nextModelId = modelSequence[nextModelIndex];
              const nextModel = modelsRegistry.find(m => m.id === nextModelId);
              if (nextModel && trace.payload.debugMode === 1) {
                console.log(`📌 Next attempt: ${getModelDetailById(nextModelId)}`);
              }
            } else if (trace.payload.debugMode === 1) {
              console.log(`📌 No more models to try in sequence`);
            }
            if (trace.payload.debugMode === 1) {
                console.log(`-----------------------------`);
            }
        }
      } // End of model sequence loop

      // --- After the loop ---
      // Add the footer only if no successful model was found OR if it hasn't been added yet
      // The successful case inside the loop already adds the footer.
      if (!successfulModelFound) {
        if (trace.payload.debugMode === 1) {
          console.log(`\n❌ ALL ATTEMPTED MODELS FAILED`);
          console.log(`📌 Attempted models:`);
          attemptedModels.forEach((attempt, index) => {
            const detail = getModelDetailById(attempt.id);
            const status = attempt.success === null ? '(Not Run)' : (attempt.success ? '(Success - Error in Logic?)' : '(Failed/Timed Out)');
            console.log(`   ${index + 1}. ${detail} ${status}`);
          });
          console.log(`📌 Result: No successful responses`);
          console.log(`=============================`);
        }
        // Add the footer indicating failure, showing all attempts
        addAIInfoFooter(attemptedModels);
      }
    }

    // Start the LLM orchestration
    await orchestrateLLMCalls(trace);

    window.voiceflow.chat.interact({ type: "continue" });
  },
};