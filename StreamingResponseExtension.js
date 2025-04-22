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

      // Create tooltip with detailed model sequence info
      const modelInfoTooltip = document.createElement('div');
      const modelTypeClass = successfulModel ? successfulModel.type : 'failed'; // Use type for styling or 'failed'
      modelInfoTooltip.className = `model-info-tooltip ${modelTypeClass}`;

      // Language support for tooltip messages
      const tooltipMessages = {
        cs: {
          title: 'Spuštěné AI modely:',
          noModels: 'Žádné modely nebyly spuštěny.',
          allFailed: '(Všechny selhaly)',
          unknown: 'Neznámý ID:',
          allTimedOut: '(Všechny vypršely)'
        },
        en: {
          title: 'AI models executed:',
          noModels: 'No models were executed.',
          allFailed: '(All failed)',
          unknown: 'Unknown ID:',
          allTimedOut: '(All Timed Out)'
        },
        de: {
          title: 'Ausgeführte KI-Modelle:',
          noModels: 'Es wurden keine Modelle ausgeführt.',
          allFailed: '(Alle fehlgeschlagen)',
          unknown: 'Unbekannte ID:',
          allTimedOut: '(Alle Zeitüberschreitungen)'
        },
        uk: {
          title: 'Виконані моделі ШІ:',
          noModels: 'Жодна модель не була виконана.',
          allFailed: '(Усі не вдалися)',
          allTimedOut: '(Усі за часом)',
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
          
          let statusIcon = '❓'; // Default for unknown/not run state
          if (attempt.success === true) {
            statusIcon = '✅';
          } else if (attempt.success === false) {
            statusIcon = attempt.reason === 'timeout' ? '⏱️' : '❌'; // Use stopwatch for timeout
          }
          
          return `${statusIcon} ${displayName}`;
        }).join(' → '); // Use arrow separator
      } else {
        tooltipHTML += tooltipText.noModels; // Fallback message
      }

      // Add overall result if all failed
      if (!wasSuccess && attemptedModels.length > 0) {
        const allFailedReason = attemptedModels.every(a => a.success === false && a.reason === 'timeout') ? '(All Timed Out)' : '(All Failed)';
        // Use specific text based on user language
        let allFailedText = tooltipText.allFailed; // Default
        if (attemptedModels.every(a => a.success === false && a.reason === 'timeout')) {
            // Use the specific 'allTimedOut' translation if available, otherwise fallback to 'allFailed'
            allFailedText = tooltipText.allTimedOut || tooltipText.allFailed;
        }
        // Add more languages as needed

        tooltipHTML += ` ${allFailedText}`; // Add specific failure reason
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

    // Generic function to call any LLM API provider
    async function callLLMAPI(endpoint, payload) {
      const TIMEOUT_MS = 3000; // 3 seconds timeout
      const abortController = new AbortController(); // Create an AbortController

      // Promise for the actual API call and streaming
      const fetchPromise = new Promise(async (resolve, reject) => {
        let response; // Declare response here to access it in finally block if needed
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
            console.log(`🌐 Calling proxy URL:`, proxyUrl);
          }

          response = await fetch(proxyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: abortController.signal // Pass the abort signal to fetch
          });

          if (!response.ok) {
            // Try to read error body for better debugging
            let errorText = `HTTP error! status: ${response.status}`;
            try {
              const body = await response.text();
              errorText += `, body: ${body}`;
            } catch (e) {
              // Ignore if reading body fails
            }
            throw new Error(errorText);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let streamBuffer = ''; // Renamed to avoid conflict with outer buffer
          let localCompleteResponse = ''; // Use a local variable for this attempt

          // Wrap the reading loop in try/catch to handle potential abort errors
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                 if (payload.debugMode === 1) {
                   console.log('Stream loop finished (done=true)');
                 }
                 // If the loop finishes without a '[DONE]', it's an unexpected end.
                 reject(new Error(`Stream ended for ${endpoint} without explicit [DONE] signal.`));
                 return; // Exit promise execution
              }

              streamBuffer += decoder.decode(value, { stream: true });
              const lines = streamBuffer.split('\\n');

              // Process all complete lines
              streamBuffer = lines.pop() || ''; // Keep the incomplete line in buffer

              for (const line of lines) {
                // Check if the controller has aborted (e.g., due to timeout)
                if (abortController.signal.aborted) {
                    if (payload.debugMode === 1) {
                        console.log(`Stream processing aborted for ${endpoint}.`);
                    }
                    // No need to reject here, the outer race condition already handled it.
                    // Just stop processing.
                    return;
                }

                if (!line.trim() || !line.startsWith('data: ')) continue;

                const data = line.slice(6); // Remove 'data: ' prefix
                if (data === '[DONE]') {
                  if (payload.debugMode === 1) {
                    console.log('Stream completed via [DONE] signal');
                    console.log('📝 COMPLETE_RESPONSE_BEGIN (on DONE)');
                    console.log(localCompleteResponse);
                    console.log('📝 COMPLETE_RESPONSE_END (on DONE)');
                  }

                  // This is the ONLY place we should make the PATCH request
                  try {
                    if (payload.debugMode === 1) {
                      console.log('📤 Updating Voiceflow variable with complete response length:', localCompleteResponse.length);
                    }

                    const updateResponse = await fetch("https://utils.hypedigitaly.ai/api/voiceflow-variable-update", {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        user_id: payload.user_id,
                        projectName: payload.projectName,
                        variables: {
                          "LLM_Main_Response": localCompleteResponse // Use the locally accumulated response
                        },
                        debugMode: payload.debugMode || 0
                      }),
                    });

                    if (!updateResponse.ok) {
                      const errorText = await updateResponse.text();
                      if (payload.debugMode === 1) {
                        console.error('Failed to update variables:', errorText);
                      }
                      // Decide if failure to update Voiceflow should fail the whole API call
                      // For now, we let it proceed but log the error.
                    } else {
                      if (payload.debugMode === 1) {
                        console.log('Successfully updated variables with complete response');
                        console.log('📝 Complete LLM_Main_Response:', localCompleteResponse);
                        try {
                          const responseData = await updateResponse.json();
                          console.log('Voiceflow update response:', responseData);
                        } catch (e) {
                          console.log('Voiceflow update status:', updateResponse.status);
                        }
                      }
                    }
                  } catch (error) {
                    if (payload.debugMode === 1) {
                      console.error('Error updating variables:', error);
                    }
                    // Similarly, decide if this error should reject the promise. For now, log and continue.
                  }
                  resolve({ success: true }); // Explicitly resolve with success object
                  return; // Exit the function after successful completion
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    // If the stream itself reports an error, reject the promise
                    reject(new Error(parsed.error)); // Reject with the error from stream
                    return;
                  }

                  const content = parsed.content || '';
                  if (payload.debugMode === 1 && content) {
                     console.log(`Received content chunk from ${endpoint}:`, content);
                  }
                  updateContent(content); // Update UI
                  localCompleteResponse += content; // Append to local complete response for this attempt

                } catch (e) {
                  if (payload.debugMode === 1) {
                    console.warn('Failed to parse SSE data:', e, 'Data:', data);
                  }
                   // Don't reject here, maybe the next chunk is fine
                }
              }
            }
          } catch (streamError) {
             // Catch errors during reader.read() or processing, potentially including abort errors
             if (streamError.name === 'AbortError') {
                 if (payload.debugMode === 1) {
                     console.log(`Stream reading aborted for ${endpoint}.`);
                 }
                 // Resolve or reject based on whether the abort was intentional (timeout/failure)
                 // Since the outer race condition handles rejection, we might not need to do anything here,
                 // or potentially resolve(false) if needed, but let's rely on the outer catch.
             } else {
                 if (payload.debugMode === 1) {
                    console.error(`Error during stream processing for ${endpoint}:`, streamError);
                 }
                 reject(streamError); // Reject on other stream processing errors
             }
             return; // Stop processing
          }

        } catch (error) {
          // Catch fetch errors (network, initial status check, etc.)
          if (payload.debugMode === 1) {
            console.error(`Initial fetch error for ${endpoint}:`, error);
          }
          // Ensure the AbortController is triggered even if the fetch failed early
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
          reject(error); // Reject the promise on fetch errors
        }
      });

      // Promise for the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          // Reject with a specific error type/message for timeout
          const timeoutError = new Error(`API call timed out after ${TIMEOUT_MS}ms for endpoint: ${endpoint}`);
          timeoutError.name = 'TimeoutError'; // Add a specific name
          reject(timeoutError);
        }, TIMEOUT_MS);
      });

      // Race the fetch against the timeout
      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        return result; // Should be { success: true } if fetchPromise resolved
      } catch (error) {
        // This catches both timeout errors and fetch/processing errors from fetchPromise
        if (payload.debugMode === 1) {
          console.error(`Error during callLLMAPI for ${endpoint}:`, error.message);
        }
        // IMPORTANT: Abort the fetch request if it hasn't been aborted yet
        if (!abortController.signal.aborted) {
          if (payload.debugMode === 1) {
             console.log(`Aborting fetch for ${endpoint} due to error/timeout.`);
          }
          abortController.abort();
        }
        // Ensure the response section is visible even on failure
        if (isFirstChunk) {
            const thinkingHeader = container.querySelector('.thinking-header');
            if (thinkingHeader) {
                thinkingHeader.classList.add('hidden');
            }
            responseSection.classList.add('visible');
            isFirstChunk = false; // Mark as not first chunk anymore
        }

        // Determine the reason for failure
        const reason = error.name === 'TimeoutError' ? 'timeout' : 'error';
        return { success: false, reason: reason, message: error.message }; // Indicate failure with reason
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

        // Record the attempt *before* calling the API (status will be updated later)
        const currentAttempt = { id: model.id, success: null, reason: null }; // Initialize reason
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
        const result = await callLLMAPI(model.endpoint, payload);

        // Update the status of the current attempt based on the result object
        currentAttempt.success = result.success;
        currentAttempt.reason = result.reason || null; // Store reason if present

        // If successful, stop trying other models and add footer
        if (result.success) {
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
          // Let loop break naturally
        } else {
            // --- Failure case within the loop ---
            const failureType = result.reason === 'timeout' ? 'TIMEOUT' : 'FAILED';
            const failureEmoji = result.reason === 'timeout' ? '⏱️' : '❌';

            if (trace.payload.debugMode === 1) {
                console.log(`\n${failureEmoji} ${failureType}: MODEL ID:${model.id}`);
                console.log(`📌 Model: ${model.displayName} (${model.type})`);
                console.log(`📌 Model name: ${model.name}`);
                console.log(`📌 Status: REQUEST ${failureType} (${result.message})`);
                console.log(`📌 Attempt: ${attemptedModels.length}/${modelSequence.length}`);
            }

            // *** IMPORTANT: Clear content before trying the next model ***
            if (responseContent) {
                 if (trace.payload.debugMode === 1) {
                    console.log(`🧼 Clearing response content before next attempt.`);
                 }
                 responseContent.innerHTML = ''; // Clear the displayed content
                 completeResponse = ''; // Reset the global complete response accumulator
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
      // Add the footer only if no successful model was found
      if (!successfulModelFound) {
        if (trace.payload.debugMode === 1) {
          console.log(`\n❌ ALL ATTEMPTED MODELS FAILED`);
          console.log(`📌 Attempted models:`);
          attemptedModels.forEach((attempt, index) => {
            const detail = getModelDetailById(attempt.id);
            let status = '(Not Run)';
            if (attempt.success === true) status = '(Success - Error in Logic?)';
            else if (attempt.success === false) {
                status = attempt.reason === 'timeout' ? '⏱️ (Timeout)' : '❌ (Failed)';
            }
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