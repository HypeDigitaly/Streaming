export const StreamingResponseExtension = {
  name: "StreamingResponse",
  type: "response",
  match: ({ trace }) =>
    trace.type === "ext_streamingResponse" ||
    trace.payload?.name === "ext_streamingResponse",
  render: async ({ trace, element }) => {
    if (trace.payload?.debugMode === 1) {
      console.log("🚀 StreamingResponseExtension: Starting render", { trace });
      console.log(
        "📦 Full trace payload:",
        JSON.stringify(trace.payload, null, 2),
      );
      console.log(
        "🌍 Language setting:",
        trace.payload?.lang || "cs (default)",
      );
      console.log(
        "🎨 Reasoning background colour:",
        trace.payload?.reasoningBgColour || "#EBF5FF (default)",
      );
    }

    const container = document.createElement("div");
    container.className = "streaming-response-container";

    // Get custom reasoning background color or use default
    const reasoningBgColour = trace.payload?.reasoningBgColour || "#EBF5FF";
    
    // Function to adjust color brightness
    function adjustColorBrightness(color, percent) {
      const num = parseInt(color.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent * 100);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    // Generate dynamic colors based on the base color
    const lighterBgColour = adjustColorBrightness(reasoningBgColour, 0.1);
    const darkerBgColour = adjustColorBrightness(reasoningBgColour, -0.1);

    if (trace.payload?.debugMode === 1) {
      console.log("🎨 Generated color scheme for thinking sections:", {
        background: reasoningBgColour,
        backgroundLighter: lighterBgColour,
        backgroundDarker: darkerBgColour,
        textColor: "#333333 (dark gray for contrast)"
      });
    }

    // Add variables to track streaming state for Perplexity reasoning
    let isStreaming = false;
    let activeReasoningGroup = null;
    let completedSteps = [];

    // Function to format model name for Perplexity models
    function formatModelName(model) {
      const modelMap = {
        'sonar-reasoning': 'Sonar Reasoning model',
        'sonar-reasoning-pro': 'Sonar Reasoning Pro model',
      }
      return (
        modelMap[model] ||
        model
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      )
    }

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
            padding: 8px 0;
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
            line-height: 1.2;
          }
          
          /* Perplexity reasoning section styles */
          .perplexity-reasoner-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 0;
            line-height: 1;
          }
          .reasoning-section {
            background-color: #F9FAFB;
            border-radius: 6px;
            padding: 0 0 4px 0;
            margin: 0 0 16px 0;
            width: 100%;
            box-sizing: border-box;
            transition: all 0.3s ease;
            line-height: 1.2;
          }
          .reasoning-section.collapsed {
            padding: 0 0 3px 0;
            cursor: pointer;
          }
          .reasoning-section.has-answer {
            margin-bottom: 0;
          }
          .reasoning-section.has-answer.collapsed {
            padding: 0;
            margin: 0;
          }
          .reasoning-section.collapsed .reasoning-content {
            display: none;
          }
          .reasoning-header {
            background-color: ${reasoningBgColour};
            border-bottom: none;
            border-radius: 6px 6px 0 0;
            padding: 6px 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s ease, border-radius 0.3s ease;
            user-select: none;
            margin: 0 0 16px 0;
          }
          .reasoning-header:hover {
            background-color: ${darkerBgColour};
          }
          .reasoning-section.collapsed .reasoning-header {
            margin-bottom: 0;
          }
          .reasoning-icon {
            color: #333333;
            font-size: 14px;
            margin-right: 6px;
            flex-shrink: 0;
            line-height: 1;
          }
          .reasoning-title-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .reasoning-title {
            font-weight: 600;
            color: #333333;
            font-size: 13px;
            line-height: 1.2;
            flex-grow: 1;
          }
          .reasoning-model {
            font-weight: normal;
            color: #6B7280;
            margin-left: 4px;
          }
          .toggle-icon {
            color: #333333;
            font-size: 12px;
            transition: transform 0.2s ease;
            width: 16px;
            height: 16px;
          }
          .reasoning-section.collapsed .toggle-icon {
            transform: rotate(-180deg);
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
          .reasoning-content {
            font-size: 12px;
            line-height: 1.3;
            color: #4B5563;
            margin: 0 0 8px 0;
            padding: 0 10px;
            max-height: none;
            overflow: visible;
          }
          .reasoning-step {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            margin-bottom: 4px;
          }
          .step-checkbox {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
            margin-top: 1px;
            position: relative;
          }
          .step-checkbox svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 14px;
            height: 14px;
          }
          .step-content {
            flex: 1;
            font-size: 12px;
            line-height: 1.4;
            padding-top: 1px;
          }
          .step-checkbox .unchecked {
            opacity: 1;
            transition: opacity 0.3s ease;
          }
          .step-checkbox .checked {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .step-checkbox.is-checked .unchecked {
            opacity: 0;
          }
          .step-checkbox.is-checked .checked {
            opacity: 1;
          }
          .answer-section {
            padding: 0;
            margin: 24px 0 0 0;
            width: 100%;
            box-sizing: border-box;
            opacity: 0;
            height: 0;
            overflow: hidden;
            transition: opacity 0.3s ease;
          }
          .answer-section.visible {
            opacity: 1;
            height: auto;
            overflow: visible;
            padding-top: 0;
            margin-top: 0;
          }
          .vfrc-message--extension-PerplexityReasoner {
            width: 100% !important;
            max-width: none !important;
          }
          .answer-content {
            font-size: 14px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          
          /* Ensure no extra spacing in Perplexity sections */
          .perplexity-reasoner-container * {
            margin-top: 0;
          }
          .perplexity-reasoner-container *:first-child {
            margin-top: 0 !important;
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
          .reasoning-content .citation-link {
            color: #4B5563;
            font-weight: 500;
            display: inline;
            margin: 0;
            padding: 0;
          }
          .reasoning-content .citation-link:hover {
            color: #2563EB;
            text-decoration: underline;
          }
          .step-content {
            font-size: 12px;
            line-height: 1.4;
            padding-top: 1px;
            color: #4B5563;
          }
          .step-content a {
            color: inherit;
            margin: 0;
            padding: 0;
            display: inline;
          }
          
          /* Additional answer content citation styles */
          .answer-content .citation-link {
            color: #2563EB;
            text-decoration: none;
            font-weight: normal;
            cursor: pointer;
            margin: 0;
            padding: 0;
            display: inline;
          }
          .answer-content .citation-link:hover {
            text-decoration: underline;
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
            font-family: var(--_1bof89na), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.3;
            color: #1a1e23;
            white-space: normal;
            word-break: break-word;
            padding: 0;
            margin: 0;
            display: block;
          }
          .response-content > *:first-child {
            margin-top: 0;
          }
          .response-content h1, 
          .response-content h2, 
          .response-content h3,
          .response-content h4,
          .response-content h5 {
            font-family: var(--_1bof89na), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1a1e23;
            margin: 0;
            padding: 0;
            font-weight: 600;
            line-height: 1.2;
            display: block;
          }
          strong {
            font-weight: 600;
          }
          
          /* Optimalizované velikosti a mezery pro nadpisy - kompaktní verze */
          .response-content h1 { 
            font-size: 1.3em; 
            margin: 0.8em 0 0.3em 0; 
            font-weight: 700; 
            line-height: 1.3;
          }
          .response-content h2 { 
            font-size: 1.2em; 
            margin: 0.7em 0 0.25em 0; 
            font-weight: 600; 
            line-height: 1.35;
          }
          .response-content h3 { 
            font-size: 1.15em; 
            margin: 0.6em 0 0.2em 0; 
            font-weight: 600; 
            line-height: 1.4;
          }
          .response-content h4 { 
            font-size: 1.1em; 
            margin: 0.5em 0 0.15em 0; 
            font-weight: 600; 
            line-height: 1.4;
          }
          .response-content h5 { 
            font-size: 1.05em; 
            margin: 0.4em 0 0.1em 0; 
            font-weight: 600; 
            line-height: 1.4;
          }
          
          /* První nadpisy v kontejneru nemají horní mezeru */
          .response-content > h1:first-child,
          .response-content > h2:first-child,
          .response-content > h3:first-child,
          .response-content > h4:first-child,
          .response-content > h5:first-child {
            margin-top: 0;
          }
          
          /* Dodatečná pravidla pro konzistentní spacing - kompaktní verze */
          .response-content > * + * {
            margin-top: 0.4em;
          }
          
          /* Přepsat margin pro specifické kombinace */
          .response-content h1 + *,
          .response-content h2 + *,
          .response-content h3 + *,
          .response-content h4 + *,
          .response-content h5 + * {
            margin-top: 0.2em !important;
          }
          
          /* Mezery mezi seznamy a paragrafy - kompaktní */
          .response-content ul + p,
          .response-content ol + p,
          .response-content p + ul,
          .response-content p + ol {
            margin-top: 0.3em;
          }
          
          /* Optimalizované mezery mezi konsekutivními nadpisy - kompaktní */
          .response-content h1 + h2 {
            margin-top: 0.2em;
          }
          .response-content h2 + h3,
          .response-content h3 + h4,
          .response-content h4 + h5 {
            margin-top: 0.25em;
          }
          /* Optimalizované mezery mezi nadpisy a obsahem - kompaktní */
          .response-content h1 + p,
          .response-content h2 + p,
          .response-content h3 + p,
          .response-content h4 + p,
          .response-content h5 + p {
            margin-top: 0;
            margin-bottom: 0.5em;
          }
          .response-content h1 + ul,
          .response-content h2 + ul,
          .response-content h3 + ul,
          .response-content h4 + ul,
          .response-content h5 + ul {
            margin-top: 0.05em;
            margin-bottom: 0.5em;
          }
          
          /* Remove any paragraphs between headers */
          .response-content h1 + p:empty,
          .response-content h2 + p:empty,
          .response-content h3 + p:empty {
            display: none;
          }
          
          /* Remove breaks around headers */
          .response-content br + h1,
          .response-content br + h2,
          .response-content br + h3 {
            margin-top: 0;
          }
          
          .response-content h1 + br,
          .response-content h2 + br,
          .response-content h3 + br {
            display: none;
          }
          .response-content ul {
            margin: 0.4em 0;
            padding-left: 1.2em;
            list-style-position: outside;
            list-style-type: disc;
          }
          /* Add rules for ordered lists to match unordered */
          .response-content ol {
            margin: 0.4em 0;
            padding-left: 1.2em;
            list-style-position: outside;
          }
          /* Apply consistent styling to all list items */
          .response-content ul li,
          .response-content ol li {
            margin: 0.2em 0;
            padding-left: 0.1em;
            line-height: 1.5;
          }
          /* Nested lists */
          .response-content ul ul,
          .response-content ol ol,
          .response-content ul ol,
          .response-content ol ul {
            margin: 0.1em 0;
          }
          .response-content li.sublist {
            margin: 0;
          }
          .response-content br {
            margin: 0;
            line-height: 1;
          }
          .response-content p {
            margin: 0 0 0.5em 0;
            line-height: 1.5;
          }
          .response-content p:last-child {
            margin-bottom: 0;
          }
          /* Zajistit konzistentní spacing pro všechny elementy */
          .response-content > *:first-child {
            margin-top: 0 !important;
          }
          .response-content a {
            word-break: break-all;
          }
          /* Add spacing for adjacent links */
          .response-content a + a {
            margin-top: 0;
          }
          /* Responsive image styles to prevent overflow */
          .response-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0;
          }
          /* Line separator styling */
          .response-content hr.markdown-separator {
            border: none;
            height: 1px;
            background-color: #E5E7EB;
            width: 100%;
            margin: 0.15em 0;
          }
          /* Added styles for headings */
          .response-content .answer-h1 {
            font-size: 1.3em;
            margin: 0;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h1:first-child {
            margin-top: 0;
          }
          .response-content .answer-h2 {
            font-size: 1.2em;
            margin: 0;
            font-weight: 600;
            line-height: 1.2;
          }
          .response-content .answer-h2:first-child {
            margin-top: 0;
          }
          .response-content .answer-h3 {
            font-size: 1.1em;
            margin: 0;
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
          .response-content .markdown-table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.6em 0;
            font-size: 14px;
          }
          .response-content .markdown-table th,
          .response-content .markdown-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .response-content .markdown-table th {
            background-color: #f6f8fa;
            font-weight: 600;
          }
          .response-content .markdown-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .ai-thinking-section {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            margin: 1.2em 0 0.6em 0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          .ai-thinking-header {
            background-color: ${reasoningBgColour};
            border-bottom: none;
            border-radius: 6px;
            padding: 6px 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s ease, border-radius 0.3s ease;
            user-select: none;
          }
          .ai-thinking-header:hover {
            background-color: ${darkerBgColour};
          }
          .ai-thinking-header.expanded {
            background-color: ${darkerBgColour};
            border-radius: 6px 6px 0 0;
            border-bottom: 1px solid #E2E8F0;
          }
          .ai-thinking-icon {
            color: #333333;
            font-size: 14px;
            margin-right: 6px;
            flex-shrink: 0;
            line-height: 1;
          }
          .ai-thinking-title {
            font-weight: 600;
            color: #333333;
            font-size: 13px;
            line-height: 1.2;
            flex-grow: 1;
          }
          .ai-thinking-arrow {
            color: #333333;
            font-size: 12px;
            transition: transform 0.2s ease;
          }
          .ai-thinking-header.expanded .ai-thinking-arrow {
            transform: rotate(180deg);
          }
          .ai-thinking-content {
            padding: 0;
            background-color: #FFFFFF;
            border-top: none;
            display: block;
            font-size: 13px;
            line-height: 1.5;
            color: #374151;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease, border-top 0.3s ease;
          }
          .ai-thinking-content.expanded {
            max-height: 1000px;
            padding: 8px;
            border-top: 1px solid #F1F5F9;
            border-radius: 0 0 6px 6px;
          }
          .ai-thinking-content > *:first-child {
            margin-top: 0;
          }
          .ai-thinking-content > *:last-child {
            margin-bottom: 0;
          }
          .ai-thinking-content p {
            margin: 3px 0;
          }
          .ai-thinking-content ul, .ai-thinking-content ol {
            margin: 3px 0;
            padding-left: 1em;
          }
          .ai-thinking-content li {
            margin: 1px 0;
          }
          /* Add proper spacing around thinking sections */
          .response-content .ai-thinking-section {
            margin: 1.2em 0 0.6em 0 !important;
            padding: 0 !important;
          }
          .response-content .ai-thinking-section + h1,
          .response-content .ai-thinking-section + h2,
          .response-content .ai-thinking-section + h3,
          .response-content .ai-thinking-section + h4,
          .response-content .ai-thinking-section + h5 {
            margin-top: 0.6em !important;
          }
          .response-content .ai-thinking-section + p {
            margin-top: 0.5em !important;
          }
          .response-content .ai-thinking-section + ul,
          .response-content .ai-thinking-section + ol {
            margin-top: 0.5em !important;
          }
          .response-content * + .ai-thinking-section {
            margin-top: 0 !important;
          }
          /* Aggressive margin/padding removal */
          .response-content p:empty {
            display: none;
          }
          .response-content br + .ai-thinking-section,
          .response-content .ai-thinking-section + br {
            display: none;
          }
          .ai-info-footer {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #6B7280;
            cursor: pointer;
            position: relative;
            padding: 6px 8px 0px 0;
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
            white-space: nowrap;
            flex-shrink: 0;
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
          .model-info-tooltip.groq,
          .model-info-tooltip.sambanova,
          .model-info-tooltip.baseten,
          .model-info-tooltip.perplexity {
            background-color: #F3F4F6;
            color: #333;
          }

        </style>
        <div class="response-section">
          <div class="response-content"></div>
        </div>
      `;

    element.appendChild(container);

    // Get references to elements
    const responseSection = container.querySelector(".response-section");
    const responseContent = container.querySelector(".response-content");
    let isFirstChunk = true;
    let buffer = "";
    let deltaCounter = 0;
    let completeResponse = "";

    // Show container immediately with loading animation
    container.style.display = "block";

    // Create URL preview container (from PerplexityExtension)
    const previewContainer = document.createElement('div');
    previewContainer.className = 'url-preview-container';
    document.body.appendChild(previewContainer);

    // Add URL preview styles
    const urlPreviewStyles = document.createElement('style');
    urlPreviewStyles.textContent = `
      .url-preview-container {
        position: absolute;
        z-index: 1000;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .url-preview-container.visible {
        opacity: 1;
        pointer-events: auto;
      }
      .url-preview-content {
        padding: 12px;
      }
      .url-preview-loading {
        padding: 12px;
        text-align: center;
      }
      .url-preview-image {
        width: 100%;
        max-height: 150px;
        object-fit: cover;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      .url-preview-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #1a1e23;
      }
      .url-preview-description {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(urlPreviewStyles);

    // Function to add URL preview handlers
    function addUrlPreviewHandlers() {
      // Function to handle URL preview
      async function handleUrlPreview(event) {
        const link = event.target.closest('a')
        if (!link) return

        const url = link.href
        const rect = link.getBoundingClientRect()

        // Position the preview container
        const previewX = rect.left
        const previewY = rect.bottom + window.scrollY + 10 // 10px below the link

        previewContainer.style.left = `${previewX}px`
        previewContainer.style.top = `${previewY}px`

        try {
          // Show loading state
          previewContainer.innerHTML = `
            <div class="url-preview-loading">
              Loading preview...
            </div>
          `
          previewContainer.classList.add('visible')

          // Check if mql is available for URL preview
          if (typeof window.mql === 'function') {
            const { data } = await window.mql(url, {
              data: {
                title: true,
                description: true,
                image: true,
              },
            })

            const { title, description, image } = data

            let previewHtml = '<div class="url-preview-content">'

            if (image?.url) {
              previewHtml += `<img class="url-preview-image" src="${image.url}" alt="${title || 'Preview'}" />`
            }

            if (title) {
              previewHtml += `<div class="url-preview-title">${title}</div>`
            }

            if (description) {
              previewHtml += `<div class="url-preview-description">${description}</div>`
            }

            previewHtml += '</div>'

            previewContainer.innerHTML = previewHtml
          } else {
            // Fallback preview without mql
            previewContainer.innerHTML = `
              <div class="url-preview-content">
                <div class="url-preview-title">${new URL(url).hostname}</div>
                <div class="url-preview-description">${url}</div>
              </div>
            `
          }
        } catch (error) {
          // If preview fails, show a simple preview
          previewContainer.innerHTML = `
            <div class="url-preview-content">
              <div class="url-preview-title">${new URL(url).hostname}</div>
              <div class="url-preview-description">${url}</div>
            </div>
          `
        }
      }

      // Function to hide URL preview
      function hideUrlPreview() {
        previewContainer.classList.remove('visible')
      }

      // Add event listeners for URL preview
      element.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a')
        if (link) {
          handleUrlPreview(e)
        }
      })

      element.addEventListener('mouseout', (e) => {
        const link = e.target.closest('a')
        if (link) {
          hideUrlPreview()
        }
      })
    }

    // Perplexity-specific functions
    function scrollToBottom() {
      // Use scrollIntoView on our element with padding
      if (element) {
        // Add temporary padding to the bottom
        const originalPadding = element.style.paddingBottom
        element.style.paddingBottom = '80px'

        element.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        })

        // Backup scroll attempt with auto behavior
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'auto',
            block: 'end',
            inline: 'nearest',
          })

          // Restore original padding after scrolling
          setTimeout(() => {
            element.style.paddingBottom = originalPadding
          }, 300)
        }, 100)
      }
    }

    // Function to find the closest scrollable parent
    function findScrollableParent(element) {
      let currentParent = element.parentElement
      while (currentParent) {
        const hasScrollableContent =
          currentParent.scrollHeight > currentParent.clientHeight
        const isScrollable =
          getComputedStyle(currentParent).overflow !== 'visible'

        if (hasScrollableContent && isScrollable) {
          return currentParent
        }
        currentParent = currentParent.parentElement
      }
      return null
    }

    // Function to smoothly scroll to an element
    function scrollIntoViewSmooth(element) {
      // Find the scrollable container by traversing up the DOM
      const scrollContainer = findScrollableParent(element)

      if (scrollContainer) {
        const elementRect = element.getBoundingClientRect()
        const containerRect = scrollContainer.getBoundingClientRect()
        const isElementInView =
          elementRect.top >= containerRect.top &&
          elementRect.bottom <= containerRect.bottom

        if (!isElementInView) {
          const scrollOffset = elementRect.bottom - containerRect.bottom + 50

          // Use scrollIntoView as a fallback if scrollTo is not working
          if (Math.abs(scrollContainer.scrollTop) < 1) {
            element.scrollIntoView({ behavior: 'smooth', block: 'end' })
          } else {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollTop + scrollOffset,
              behavior: 'smooth',
            })
          }
        }
      } else {
        // If no scrollable container is found, try scrollIntoView as fallback
        element.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }

    // Function to create checkbox SVGs for reasoning steps
    function createCheckbox() {
      const checkbox = document.createElement('div')
      checkbox.className = 'step-checkbox'
      checkbox.innerHTML = `
        <svg class="unchecked" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#9CA3AF" stroke-width="2"/>
        </svg>
        <svg class="checked" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="#111827"/>
          <path d="M14 7L8.5 12.5L6 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
      return checkbox
    }

    // Function to create a reasoning group
    function createReasoningGroup() {
      const group = document.createElement('div')
      group.className = 'reasoning-group'
      return group
    }

    // Function to process citations and convert [X] to links
    function processCitations(text, citations, isReasoning = false) {
      if (!citations || !citations.length) return text

      // First normalize spaces in the text
      let processedText = text.replace(/\s+/g, ' ').trim()

      // Add space before citations and convert to links in a single pass
      return processedText.replace(/\s*\[(\d+)\]/g, (match, num) => {
        const index = parseInt(num) - 1
        if (index >= 0 && index < citations.length) {
          // Add space only for answer section
          const prefix = !isReasoning ? ' ' : ''
          return (
            prefix +
            `<a href="${citations[index]}" target="_blank" class="citation-link">[${num}]</a>`
          )
        }
        return match
      })
    }

    // Function to create and append a new reasoning step
    function createReasoningStep(content, group, stepIndex, citations) {
      if (!content || content.length < 5 || content.trim().endsWith('?'))
        return null

      const step = document.createElement('div')
      step.className = 'reasoning-step'

      const checkbox = createCheckbox()
      checkbox.style.display = 'none' // Hide checkbox by default
      const contentDiv = document.createElement('div')
      contentDiv.className = 'step-content'

      // Process citations directly with isReasoning flag set to true
      contentDiv.innerHTML = processCitations(content, citations, true)

      step.appendChild(checkbox)
      step.appendChild(contentDiv)

      return step
    }

    // Add event delegation for thinking section toggles
    responseContent.addEventListener('click', function(event) {
      const header = event.target.closest('.ai-thinking-header');
      if (header) {
        event.preventDefault();
        event.stopPropagation();
        
        const section = header.parentElement;
        const content = section ? section.querySelector('.ai-thinking-content') : null;
        
        if (content) {
          const isExpanded = content.classList.contains('expanded');
          
          if (isExpanded) {
            content.classList.remove('expanded');
            header.classList.remove('expanded');
            header.style.backgroundColor = reasoningBgColour;
          } else {
            content.classList.add('expanded');
            header.classList.add('expanded');
            header.style.backgroundColor = darkerBgColour;
          }
        }
      }

      // Handle reasoning section expansion from Perplexity
      const reasoningHeader = event.target.closest('.reasoning-header');
      if (reasoningHeader) {
        const reasoningSection = reasoningHeader.closest('.reasoning-section');
        if (reasoningSection) {
          const isCollapsed = reasoningSection.classList.contains('collapsed')
          if (isCollapsed) {
            // Expanding
            reasoningSection.classList.remove('collapsed')
            const reasoningContent = reasoningSection.querySelector('.reasoning-content');
            if (reasoningContent) {
              // Restore height and visibility
              reasoningContent.style.height = 'auto'
              reasoningContent.style.overflow = 'visible'
              // Show all completed steps and their checkboxes
              completedSteps.forEach((step) => {
                if (step) {
                  step.style.display = 'flex'
                  const checkbox = step.querySelector('.step-checkbox')
                  if (checkbox) {
                    checkbox.style.display = 'flex'
                    checkbox.classList.add('is-checked')
                  }
                }
              })
              // Keep height as auto for natural sizing
            }
          } else {
            // Collapsing
            reasoningSection.classList.add('collapsed')
            const reasoningContent = reasoningSection.querySelector('.reasoning-content');
            if (reasoningContent) {
              reasoningContent.style.overflow = 'hidden'
              reasoningContent.style.height = '0'
            }
          }
        }
      }
    });

    // Add hover effects for thinking section headers
    responseContent.addEventListener('mouseover', function(event) {
      const header = event.target.closest('.ai-thinking-header');
      if (header && !header.classList.contains('expanded')) {
        header.style.backgroundColor = darkerBgColour;
      }
    });

    responseContent.addEventListener('mouseout', function(event) {
      const header = event.target.closest('.ai-thinking-header');
      if (header && !header.classList.contains('expanded')) {
        header.style.backgroundColor = reasoningBgColour;
      }
    });

    // Convert HTML to Markdown
    function htmlToMarkdown(html) {
      return (
        html
          // Headers
          .replace(
            /<h[1-3][^>]*>(.*?)<\/h[1-3]>/g,
            (_, content) => `# ${content}\n\n`,
          )
          // Bold
          .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
          // Italic
          .replace(/<em>(.*?)<\/em>/g, "*$1*")
          // Tables
          .replace(
            /<table[^>]*>([\s\S]*?)<\/table>/g,
            (match, tableContent) => {
              const rows =
                tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
              if (rows.length === 0) return match;

              let markdownTable = "\n";
              let headerCreated = false;

              rows.forEach((row) => {
                const cells =
                  row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g) || [];
                if (cells.length === 0) return;

                markdownTable += "|";

                cells.forEach((cell) => {
                  const content = cell
                    .replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g, "$1")
                    .trim();
                  markdownTable += ` ${content} |`;
                });

                markdownTable += "\n";

                // Add separator row after the first row
                if (!headerCreated) {
                  markdownTable += "|";
                  cells.forEach(() => {
                    markdownTable += " --- |";
                  });
                  markdownTable += "\n";
                  headerCreated = true;
                }
              });

              return markdownTable + "\n";
            },
          )
          // Lists
          .replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, content) => {
            return content.replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n");
          })
          .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (_, content) => {
            let counter = 1;
            return content.replace(
              /<li[^>]*>(.*?)<\/li>/g,
              () => `${counter++}. $1\n`,
            );
          })
          // Paragraphs
          .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n\n")
          // Links
          .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
          // Code
          .replace(/<code>(.*?)<\/code>/g, "`$1`")
          // Clean up
          .replace(/\n{3,}/g, "\n\n")
          .trim()
      );
    }

    // Store annotations globally for processing
    let fileSearchAnnotations = [];

    // Function to handle file search annotations
    function handleFileSearchAnnotations(annotationsData) {
      try {
        const data = JSON.parse(annotationsData);
        const annotations = data.annotations || [];
        
        if (trace.payload?.debugMode === 1) {
          console.log('📎 Received file search annotations:', {
            count: annotations.length,
            annotations: annotations,
            text_index: data.text_index
          });
        }

        // Store annotations for later processing
        fileSearchAnnotations = fileSearchAnnotations.concat(annotations);

        // Create citation elements and append to a citation section
        if (annotations.length > 0) {
          addCitationsToUI(annotations);
        }
      } catch (error) {
        if (trace.payload?.debugMode === 1) {
          console.error('Error parsing file search annotations:', error, annotationsData);
        }
      }
    }

    // Function to add citations to UI
    function addCitationsToUI(annotations) {
      // Check if citations section already exists
      let citationsSection = responseContent.querySelector('.file-citations-section');
      
      if (!citationsSection) {
        // Create citations section
        citationsSection = document.createElement('div');
        citationsSection.className = 'file-citations-section';
        citationsSection.innerHTML = `
          <div class="citations-header">
            <h4>📎 Zdroje z dokumentů</h4>
          </div>
          <div class="citations-list"></div>
        `;
        
        // Add CSS for citations
        const citationStyles = document.createElement('style');
        citationStyles.textContent = `
          .file-citations-section {
            margin-top: 16px;
            padding: 12px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
          }
          .citations-header h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
          }
          .citations-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .citation-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            background-color: #ffffff;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
            font-size: 12px;
          }
          .citation-number {
            background-color: #3b82f6;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
          }
          .citation-filename {
            font-weight: 600;
            color: #1f2937;
          }
                     .citation-file-id {
             color: #6b7280;
             font-family: monospace;
           }
           .file-citation-link {
             color: #3b82f6;
             text-decoration: none;
             font-weight: 600;
             margin: 0 1px;
             padding: 1px 3px;
             border-radius: 3px;
             background-color: #eff6ff;
             cursor: pointer;
             transition: background-color 0.2s ease;
           }
           .file-citation-link:hover {
             background-color: #dbeafe;
             text-decoration: underline;
           }
        `;
        
        if (!document.head.querySelector('#file-citations-styles')) {
          citationStyles.id = 'file-citations-styles';
          document.head.appendChild(citationStyles);
        }
        
        // Append to response content
        responseContent.appendChild(citationsSection);
      }

      const citationsList = citationsSection.querySelector('.citations-list');
      
      // Add new citations
      annotations.forEach((annotation, index) => {
        if (annotation.type === 'file_citation') {
          // Check if citation already exists
          const existingCitation = citationsList.querySelector(`[data-file-id="${annotation.file_id}"]`);
          
          if (!existingCitation) {
            const citationItem = document.createElement('div');
            citationItem.className = 'citation-item';
            citationItem.setAttribute('data-file-id', annotation.file_id);
            
            // Calculate citation number based on all existing citations
            const citationNumber = fileSearchAnnotations.filter(a => 
              a.type === 'file_citation' && a.file_id === annotation.file_id
            ).length;
            
            citationItem.innerHTML = `
              <div class="citation-number">${citationNumber}</div>
              <div class="citation-filename">${annotation.filename || 'Unknown file'}</div>
              <div class="citation-file-id">${annotation.file_id}</div>
            `;
            
            citationsList.appendChild(citationItem);
            
            if (trace.payload?.debugMode === 1) {
              console.log('📎 Added citation to UI:', {
                file_id: annotation.file_id,
                filename: annotation.filename,
                citation_number: citationNumber
              });
            }
          }
        }
      });
    }

    // Function to convert file citations in text to clickable links
    function processFileCitations(text) {
      if (!fileSearchAnnotations || fileSearchAnnotations.length === 0) {
        return text;
      }

      let processedText = text;
      
      // Create a map of file_id to citation info
      const citationMap = {};
      let citationCounter = 1;
      
      fileSearchAnnotations.forEach(annotation => {
        if (annotation.type === 'file_citation' && !citationMap[annotation.file_id]) {
          citationMap[annotation.file_id] = {
            number: citationCounter++,
            filename: annotation.filename || 'Unknown file',
            file_id: annotation.file_id
          };
        }
      });

      // Replace file citations with clickable links
      Object.entries(citationMap).forEach(([fileId, citationInfo]) => {
        const citationRegex = new RegExp(`\\[${citationInfo.number}\\]`, 'g');
        processedText = processedText.replace(citationRegex, 
          `<a href="#citation-${fileId}" class="file-citation-link" title="${citationInfo.filename}">[${citationInfo.number}]</a>`
        );
      });

      return processedText;
    }

    // Function to add citation link handlers
    function addCitationLinkHandlers() {
      const citationLinks = responseContent.querySelectorAll('.file-citation-link');
      
      citationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          
          const href = this.getAttribute('href');
          if (href && href.startsWith('#citation-')) {
            const fileId = href.replace('#citation-', '');
            const targetCitation = responseContent.querySelector(`[data-file-id="${fileId}"]`);
            
            if (targetCitation) {
              // Highlight the citation temporarily
              targetCitation.style.backgroundColor = '#fef3c7';
              targetCitation.style.transition = 'background-color 0.3s ease';
              
              // Scroll to citation
              targetCitation.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              
              // Remove highlight after 2 seconds
              setTimeout(() => {
                targetCitation.style.backgroundColor = '#ffffff';
              }, 2000);
              
              if (trace.payload?.debugMode === 1) {
                console.log('📎 Scrolled to citation:', fileId);
              }
            }
          }
        });
      });
    }

    // Update the answer content with markdown support
    function updateContent(text) {
      if (!text) return;

      // Handle first chunk
      if (isFirstChunk) {
        // Hide loading animation when we receive the first content
        const thinkingHeader = container.querySelector(".thinking-header");
        if (thinkingHeader) {
          thinkingHeader.classList.add("hidden");
        }
        responseSection.classList.add("visible");
        isFirstChunk = false;
      }

      // Append to buffer
      buffer += text;
      
      // Keep track of complete response for final processing
      completeResponse += text;

      // Post-process buffer to handle various image URL patterns

      // Pattern 1: Complete URLs with image extensions (including query parameters)
      buffer = buffer.replace(
        /\b(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)\b/gi,
        function (match, imageUrl) {
          // Skip if already in markdown or HTML format
          const beforeMatch = buffer.substring(0, buffer.indexOf(match));
          if (
            beforeMatch.includes("![") &&
            beforeMatch.lastIndexOf("![") > beforeMatch.lastIndexOf(")")
          ) {
            return match;
          }
          if (beforeMatch.includes("<img")) {
            return match;
          }
          return `![Image](${imageUrl})`;
        },
      );

      // Pattern 2: Image filenames with query parameters (e.g., DSC_6532.jpg?tok=xyz)
      buffer = buffer.replace(
        /\b([a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|gif|webp|svg)\?[a-zA-Z0-9=&_.-]+)\b/gi,
        function (match, imageUrl) {
          // Skip if already in markdown or HTML format
          const beforeMatch = buffer.substring(0, buffer.indexOf(match));
          if (
            beforeMatch.includes("![") &&
            beforeMatch.lastIndexOf("![") > beforeMatch.lastIndexOf(")")
          ) {
            return match;
          }
          if (beforeMatch.includes("<img")) {
            return match;
          }
          return `![Image](${imageUrl})`;
        },
      );

      // Pattern 3: Standalone image filenames (without query params)
      buffer = buffer.replace(
        /\b([a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|gif|webp|svg))\b/gi,
        function (match, filename) {
          // Skip if already in markdown or HTML format
          const beforeMatch = buffer.substring(0, buffer.indexOf(match));
          if (
            beforeMatch.includes("![") &&
            beforeMatch.lastIndexOf("![") > beforeMatch.lastIndexOf(")")
          ) {
            return match;
          }
          if (beforeMatch.includes("<img")) {
            return match;
          }
          // Skip if this looks like it might be part of a larger URL
          const contextBefore = buffer.substring(
            Math.max(0, buffer.indexOf(match) - 10),
            buffer.indexOf(match),
          );
          const contextAfter = buffer.substring(
            buffer.indexOf(match) + match.length,
            buffer.indexOf(match) + match.length + 10,
          );
          if (contextBefore.includes("?") || contextAfter.match(/^[\?=&]/)) {
            return match; // Skip fragments that will be processed by other patterns
          }
          return `![Image](${filename})`;
        },
      );


      
      // Special handling for streaming headers - process only complete lines
      let processBuffer = buffer;
      
      // If buffer doesn't end with newline and contains incomplete header, delay processing
      if (buffer.includes('##') && !buffer.endsWith('\n') && !buffer.endsWith('\r\n')) {
        const lines = buffer.split(/\r?\n/);
        const lastLine = lines[lines.length - 1];
        
        // If last line looks like incomplete header, process only complete lines
        if (lastLine.includes('##') && lastLine.length < 100) {
          // Process all but the last line
          processBuffer = lines.slice(0, -1).join('\n') + (lines.length > 1 ? '\n' : '');
        }
      }

      // Format markdown content - CRITICAL: Process images BEFORE italic formatting to prevent URL corruption
      const formattedContent = processBuffer
        // Process POSTUP tags FIRST to avoid conflicts with other formatting
        .replace(/\[\[POSTUP_START\]\]([\s\S]*?)\[\[POSTUP_END\]\]/g, function(match, content) {
          return `<div class="ai-thinking-section"><div class="ai-thinking-header" style="background-color: ${reasoningBgColour} !important;"><div class="ai-thinking-icon" style="color: #333333;">🔎</div><div class="ai-thinking-title" style="color: #333333;">Myšlenkový proces</div><div class="ai-thinking-arrow" style="color: #333333;">▼</div></div><div class="ai-thinking-content">${content.trim()}</div></div>`;
        })
        // Process Database Sources tags
        .replace(/\[\[Database_Sources_Start\]\]([\s\S]*?)\[\[Database_Sources_End\]\]/g, function(match, content) {
          return `<div class="ai-thinking-section"><div class="ai-thinking-header" style="background-color: ${reasoningBgColour} !important;"><div class="ai-thinking-icon" style="color: #333333;">🗄️</div><div class="ai-thinking-title" style="color: #333333;">Databázové zdroje</div><div class="ai-thinking-arrow" style="color: #333333;">▼</div></div><div class="ai-thinking-content">${content.trim()}</div></div>`;
        })
        // Process Web Search Sources tags
        .replace(/\[\[Web_Search_Sources_Start\]\]([\s\S]*?)\[\[Web_Search_Sources_End\]\]/g, function(match, content) {
          return `<div class="ai-thinking-section"><div class="ai-thinking-header" style="background-color: ${reasoningBgColour} !important;"><div class="ai-thinking-icon" style="color: #333333;">🌐</div><div class="ai-thinking-title" style="color: #333333;">Webové zdroje</div><div class="ai-thinking-arrow" style="color: #333333;">▼</div></div><div class="ai-thinking-content">${content.trim()}</div></div>`;
        })
        // Remove empty paragraphs and extra whitespace around thinking sections
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/\n\s*<div class="ai-thinking-section">/g, '<div class="ai-thinking-section">')
        .replace(/<\/div>\s*\n/g, '</div>')
        // Headers - H1 to H5 (multiple approaches for robustness)
        .replace(/^(\s*)#{5}\s+(.+?)$/gm, "<h5>$2</h5>")
        .replace(/^(\s*)#{4}\s+(.+?)$/gm, "<h4>$2</h4>")
        .replace(/^(\s*)#{3}\s+(.+?)$/gm, "<h3>$2</h3>")
        .replace(/^(\s*)#{2}\s+(.+?)$/gm, "<h2>$2</h2>")
        .replace(/^(\s*)#{1}\s+(.+?)$/gm, "<h1>$2</h1>")
        // Fallback headers - no leading whitespace
        .replace(/^##### (.+)$/gm, "<h5>$1</h5>")
        .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // Ultra-simple fallback for stubborn cases
        .replace(/##\s+([^\n\r]+)/g, "<h2>$1</h2>")
        .replace(/#\s+([^\n\r]+)/g, "<h1>$1</h1>")
        // Brutal fallback - replace any remaining ## patterns
        .replace(/##\s*([^#\n\r]+)/g, "<h2>$1</h2>")
        .replace(/^([^<\n\r]*?)##\s*([^#\n\r]+)/gm, "$1<h2>$2</h2>")
        // Images: Convert markdown images to HTML (MUST be done BEFORE italic formatting to prevent URL corruption)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (match, alt, url) {
          // Clean and validate the URL
          let cleanUrl = url.trim();

          // Convert HTTP to HTTPS if it's a full URL starting with http://
          if (cleanUrl.match(/^http:\/\//i)) {
            cleanUrl = cleanUrl.replace(/^http:\/\//i, "https://");
          }

          // Use alt text if provided, otherwise use empty string
          const altText = alt ? alt.trim() : "";

          if (trace.payload?.debugMode === 1) {
            console.log("Converting markdown image to HTML:", {
              original: match,
              cleanUrl,
              altText,
            });
          }

          return `<img src="${cleanUrl}" alt="${altText}" style="max-width:100%; height:auto; display:block; margin:0.5em 0;">`;
        })
        // Bold formatting only (AFTER image processing to prevent URL corruption)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Double asterisks for bold
        // Line separators (three or more hyphens)
        .replace(/^-{3,}$/gm, '<hr class="markdown-separator" />')
        // List items
        .replace(/^\* (.*$)/gm, "<li>$1</li>")
        .replace(/^- (.*$)/gm, "<li>$1</li>")
        .replace(/^\s{2}- (.*$)/gm, '<li class="sublist">$1</li>')
        .replace(/^\\d+\\.\\s+(.*$)/gm, "<li>$1</li>")
        // Code
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        // Tables - Improved processing for markdown tables
        .replace(
          /(?:^|\n)(\s*\|[^\n]+\|\n\s*\|[\s\-:|]+\|\n(?:\s*\|[^\n]+\|\n?)*)/gm,
          function (match) {
            // Clean up the match and split into lines
            const tableContent = match.trim();
            const rows = tableContent.split("\n").filter((row) => row.trim());

            // Check if this is really a table (at least 2 rows: header + separator)
            if (rows.length < 2) return match;

            let tableHtml = '<table class="markdown-table">\n';
            let headerProcessed = false;

            // Process each row
            rows.forEach((row, rowIndex) => {
              const trimmedRow = row.trim();

              // Skip the separator row (contains only dashes, spaces, pipes, and colons)
              if (rowIndex === 1 && /^\s*\|[\s\-:|]+\|\s*$/.test(trimmedRow)) {
                return;
              }

              // Start the row
              tableHtml += "  <tr>\n";

              // Extract cells - handle pipes that might be at start/end
              let cells;
              if (trimmedRow.startsWith("|") && trimmedRow.endsWith("|")) {
                cells = trimmedRow.slice(1, -1).split("|");
              } else {
                cells = trimmedRow.split("|");
              }

              // Process each cell
              cells.forEach((cell) => {
                const cellContent = cell.trim();
                // First row (after potential separator) is header
                const cellTag =
                  !headerProcessed && rowIndex === 0 ? "th" : "td";
                tableHtml += `    <${cellTag}>${cellContent}</${cellTag}>\n`;
              });

              // Mark header as processed after first actual content row
              if (!headerProcessed && rowIndex === 0) {
                headerProcessed = true;
              }

              // End the row
              tableHtml += "  </tr>\n";
            });

            // End the table
            tableHtml += "</table>";
            return tableHtml;
          },
        )
        // Convert regular markdown links to HTML links (AFTER image processing)
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        )
        .replace(/^- (.*$)/gm, (match, content) => {
          const indentation = match.match(/^\s*/)[0].length;
          return `<li class="${indentation > 0 ? "sublist" : ""}">${content.trim()}</li>`;
        })
        .replace(/(?:^|\n)(<li)/g, "\n<ul>$1")
        .replace(/(<\/li>)(?:\n(?!<li)|$)/g, "$1</ul>");



      // --- BEGIN: Post-process lists and clean up empty items ---
      const tempContainer = document.createElement("div");
      // Use DOMParser for potentially cleaner initial parsing if needed, but innerHTML is often sufficient
      tempContainer.innerHTML = formattedContent;

      // Function to wrap consecutive LIs
      function wrapListItems(listType /* 'ol' or 'ul' */) {
        const items = tempContainer.querySelectorAll("li"); // Get all LIs
        let currentList = null;

        items.forEach((li, index) => {
          // Rough heuristic: Check if it looks like a numbered list item was intended
          // This relies on the number potentially being left as text by the simple regex
          const looksNumbered = /^\\d+\\.\\s*/.test(li.textContent.trim());
          const targetListType = looksNumbered ? "ol" : "ul";

          // Only process items matching the current function call type (ol or ul)
          if (targetListType !== listType) return;

          // Skip items already inside a list (e.g., nested lists - handle later if needed)
          if (
            li.parentElement.tagName === "OL" ||
            li.parentElement.tagName === "UL"
          ) {
            currentList = null; // Reset sequence if we encounter an already nested item
            return;
          }

          const prevSibling = li.previousElementSibling;

          // Start a new list if needed
          if (
            !currentList ||
            !prevSibling ||
            prevSibling.tagName !== "LI" ||
            prevSibling.parentElement.tagName !== listType.toUpperCase()
          ) {
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
      wrapListItems("ol");
      wrapListItems("ul");

      // Clean up empty numbered list items (modified check)
      const listItems = tempContainer.querySelectorAll("ol > li, ul > li");
      listItems.forEach((li) => {
        // Check if the list item is effectively empty or just a marker
        const contentCheck = li.innerHTML.replace(/^\\d+\\.\\s*/, "").trim(); // Remove number marker for check
        if (contentCheck === "" || contentCheck === "<br>") {
          // Check if it's truly empty, not containing other important tags
          if (!li.querySelector("a, img, code, strong, em, ul, ol")) {
            li.remove();
          }
        }
      });

      // Remove any potentially empty OL/UL tags left after cleaning LIs
      tempContainer.querySelectorAll("ol, ul").forEach((list) => {
        if (!list.hasChildNodes()) {
          list.remove();
        }
      });

      const cleanedHtml = tempContainer.innerHTML;
      // --- END: Post-process lists and clean up empty items ---



      // Process file citations in the cleaned HTML
      const htmlWithCitations = processFileCitations(cleanedHtml);
      
      // Update content with formatting using the processed HTML
      responseContent.innerHTML = htmlWithCitations;

      // Add URL preview functionality for citation links (from PerplexityExtension)
      addUrlPreviewHandlers();
      
      // Add citation link handlers
      addCitationLinkHandlers();

      // Scroll handling
      const scrollContainer = findScrollableParent(element);
      if (scrollContainer) {
        const maxScroll =
          scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const isNearBottom =
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          maxScroll - 100;

        if (isNearBottom) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }

    // Main models registry
    const modelsRegistry = [
      // Claude models
      {
        id: 1,
        name: "claude-sonnet-4-20250514",
        type: "claude",
        endpoint: "/api/claude-stream",
        displayName: "Claude 4 Sonnet",
      },
      {
        id: 2,
        name: "claude-3-5-haiku-20241022",
        type: "claude",
        endpoint: "/api/claude-stream",
        displayName: "Claude 3.5 Haiku",
      },
      {
        id: 3,
        name: "claude-3-sonnet-20240229",
        type: "claude",
        endpoint: "/api/claude-stream",
        displayName: "Claude 3 Sonnet",
      },

      // OpenAI models
      {
        id: 4,
        name: "gpt-4.1-2025-04-14",
        type: "openai",
        endpoint: "/api/openai-stream",
        displayName: "GPT-4.1",
      },
      {
        id: 5,
        name: "gpt-4.1-mini-2025-04-14",
        type: "openai",
        endpoint: "/api/openai-stream",
        displayName: "GPT-4.1 Mini",
      },

      // Gemini models
      {
        id: 6,
        name: "gemini-2.5-pro-preview-06-05",
        type: "gemini",
        endpoint: "/api/gemini-stream",
        displayName: "Gemini 2.5 Pro",
      },
      {
        id: 7,
        name: "gemini-2.5-flash-preview-05-20",
        type: "gemini",
        endpoint: "/api/gemini-stream",
        displayName: "Gemini 2.5 Flash",
      },

      // Groq models
      {
        id: 8,
        name: "meta-llama/llama-4-maverick-17b-128e-instruct",
        type: "groq",
        endpoint: "/api/groq-stream",
        displayName: "Llama 4 Maverick",
      },
      {
        id: 9,
        name: "deepseek-r1-distill-llama-70b",
        type: "groq",
        endpoint: "/api/groq-stream",
        displayName: "Llama 70B",
      },

      // SambaNova models
      {
        id: 10,
        name: "Llama-4-Maverick-17B-128E-Instruct",
        type: "sambanova",
        endpoint: "/api/sambanova-stream",
        displayName: "Llama 4 Maverick 17B 128E Instruct",
      },

      // Baseten models
      {
        id: 11,
        name: "deepseek-ai/DeepSeek-V3-0324",
        type: "baseten",
        endpoint: "/api/baseten-stream",
        displayName: "Baseten",
      },
      {
        id: 12,
        name: "deepseek-ai/DeepSeek-R1-0528",
        type: "baseten",
        endpoint: "/api/baseten-stream",
        displayName: "Baseten thinking",
      },

      // Perplexity models
      {
        id: 13,
        name: "sonar-reasoning",
        type: "perplexity",
        endpoint: "/api/perplexity-stream",
        displayName: "Sonar Reasoning",
      },
      {
        id: 14,
        name: "sonar-reasoning-pro",
        type: "perplexity",
        endpoint: "/api/perplexity-stream",
        displayName: "Sonar Reasoning Pro",
      },

      // OpenRouter models
      {
        id: 15,
        name: "openrouter/auto",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "OpenRouter Auto",
      },
      {
        id: 16,
        name: "openai/gpt-4o",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "GPT-4o (OpenRouter)",
      },
      {
        id: 17,
        name: "anthropic/claude-3.5-sonnet",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "Claude 3.5 Sonnet (OpenRouter)",
      },
      {
        id: 18,
        name: "meta-llama/llama-3.1-70b-instruct",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "Llama 3.1 70B (OpenRouter)",
      },
      {
        id: 19,
        name: "google/gemini-2.5-pro-preview",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "Gemini 2.5 Pro (OpenRouter)",
      },
      {
        id: 20,
        name: "google/gemini-2.5-flash-lite-preview-06-17:nitro",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "Gemini 2.5 Flash Lite 06-17 (OpenRouter)",
      },
      {
        id: 21,
        name: "google/gemini-2.5-pro",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "Gemini 2.5 Pro (OpenRouter)",
      },
      {
        id: 22,
        name: "anthropic/claude-sonnet-4",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "Claude Sonnet 4 (OpenRouter)",
      },
      {
        id: 23,
        name: "openai/gpt-4.1",
        type: "openrouter",
        endpoint: "/api/openrouter-stream",
        displayName: "GPT-4.1 (OpenRouter)",
      },
    ];

    // Function to process model sequence
    function parseModelSequence(sequenceStr) {
      if (!sequenceStr) return [1]; // Default to first model if none specified

      // Parse sequence string to array of numbers
      return sequenceStr
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id) && modelsRegistry.some((m) => m.id === id));
    }

    // Function to get detailed model info by ID
    function getModelDetailById(modelId) {
      const model = modelsRegistry.find((m) => m.id === modelId);
      return model
        ? `ID:${model.id} | ${model.displayName} (${model.type}) | Model: ${model.name}`
        : `Unknown model ID: ${modelId}`;
    }

    // Adds AI info footer to the UI
    function addAIInfoFooter(attemptedModels) {
      // Determine overall success and find the successful model details
      const successfulAttempt = attemptedModels.find((m) => m.success === true);
      const successfulModel = successfulAttempt
        ? modelsRegistry.find((m) => m.id === successfulAttempt.id)
        : null;
      const wasSuccess = !!successfulModel;

      // Create footer container
      const aiInfoFooter = document.createElement("div");
      aiInfoFooter.className = "ai-info-footer";
      aiInfoFooter.style.position = "relative"; // Add relative positioning for tooltip
      aiInfoFooter.setAttribute(
        "title",
        "Click to show/hide AI model execution details",
      );

      // Create AI icon
      const aiIcon = document.createElement("div");
      aiIcon.className = "ai-icon";
      aiIcon.textContent = "AI";

      // Create info text
      const aiInfoText = document.createElement("div");
      aiInfoText.className = "ai-info-text";

      // Language support for messages
      const languageMessages = {
        cs: {
          success: "Odpověď generována pomocí AI.",
          failure: "AI generování selhalo.",
        },
        en: {
          success: "Response generated by AI.",
          failure: "AI generation failed.",
        },
        de: {
          success: "Antwort durch KI generiert.",
          failure: "KI-Generierung fehlgeschlagen.",
        },
        uk: {
          success: "Відповідь згенерована ШІ.",
          failure: "Генерація ШІ не вдалася.",
        },
        sl: {
          success: "Odgovor ustvarila umetna inteligenca.",
          failure: "Ustvarjanje z umetno inteligenco ni uspelo.",
        },
        sk: {
          success: "Odpoveď generovaná umelou inteligenciou.",
          failure: "Generovanie AI zlyhalo.",
        },
        pl: {
          success: "Odpowiedź wygenerowana przez AI.",
          failure: "Generowanie AI nie powiodło się.",
        },
      };

      // Get language from payload, default to Czech
      const userLang = trace.payload?.lang || "cs";
      // Get language messages or fall back to Czech if not supported
      const messages = languageMessages[userLang] || languageMessages.cs;

      if (wasSuccess) {
        aiInfoText.textContent = messages.success;
      } else {
        aiInfoText.textContent = messages.failure;
        aiInfoFooter.style.color = "#DC2626"; // Indicate failure visually
      }

      // Create tooltip with simplified model sequence info
      const modelInfoTooltip = document.createElement("div");
      const modelTypeClass = successfulModel ? successfulModel.type : "failed"; // Use type for styling or 'failed'
      modelInfoTooltip.className = `model-info-tooltip ${modelTypeClass}`;

      // Language support for tooltip messages
      const tooltipMessages = {
        cs: {
          title: "Spuštěné AI modely:",
          noModels: "Žádné modely nebyly spuštěny.",
          allFailed: "(Všechny selhaly)",
          unknown: "Neznámý ID:",
        },
        en: {
          title: "AI models executed:",
          noModels: "No models were executed.",
          allFailed: "(All failed)",
          unknown: "Unknown ID:",
        },
        de: {
          title: "Ausgeführte KI-Modelle:",
          noModels: "Es wurden keine Modelle ausgeführt.",
          allFailed: "(Alle fehlgeschlagen)",
          unknown: "Unbekannte ID:",
        },
        uk: {
          title: "Виконані моделі ШІ:",
          noModels: "Жодна модель не була виконана.",
          allFailed: "(Усі не вдалися)",
          unknown: "Невідомий ID:",
        },
        sl: {
          title: "Izvedeni modeli UI:",
          noModels: "Noben model ni bil izveden.",
          allFailed: "(Vsi neuspešni)",
          unknown: "Neznan ID:",
        },
        sk: {
          title: "Spustené AI modely:",
          noModels: "Žiadne modely neboli spustené.",
          allFailed: "(Všetky zlyhali)",
          unknown: "Neznáme ID:",
        },
        pl: {
          title: "Wykonane modele AI:",
          noModels: "Żaden model nie został wykonany.",
          allFailed: "(Wszystkie nie powiodły się)",
          unknown: "Nieznane ID:",
        },
      };

      // Get tooltip messages or fall back to Czech if not supported
      const tooltipText = tooltipMessages[userLang] || tooltipMessages.cs;

      let tooltipHTML = `<strong>${tooltipText.title}</strong> `;
      if (attemptedModels.length > 0) {
        tooltipHTML += attemptedModels
          .map((attempt) => {
            const modelInfo = modelsRegistry.find((m) => m.id === attempt.id);
            const displayName = modelInfo
              ? modelInfo.displayName
              : `${tooltipText.unknown}${attempt.id}`;
            const statusIcon = attempt.success === true ? "✅" : "❌";
            return `${statusIcon} ${displayName}`;
          })
          .join(" → "); // Use arrow separator
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
      aiInfoFooter.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const isVisible = modelInfoTooltip.classList.toggle("visible");
        // Toggle class on footer for icon rotation
        if (isVisible) {
          aiInfoFooter.classList.add("tooltip-visible");
        } else {
          aiInfoFooter.classList.remove("tooltip-visible");
        }
      });

      // Prevent tooltip from closing when clicking inside it
      modelInfoTooltip.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      // Close tooltip only when clicking outside both the footer and tooltip
      document.addEventListener("click", function (e) {
        if (
          !aiInfoFooter.contains(e.target) &&
          !modelInfoTooltip.contains(e.target)
        ) {
          modelInfoTooltip.classList.remove("visible");
          aiInfoFooter.classList.remove("tooltip-visible"); // Also remove class here
        }
      });

      // Add the footer after the response content
      // Ensure it's added only once (important if called on failure after potential partial success render)
      const existingFooter = responseSection.querySelector(".ai-info-footer");
      if (existingFooter) {
        existingFooter.remove();
      }
      responseSection.appendChild(aiInfoFooter);
    }

    // Function to handle Perplexity-specific streaming with reasoning
    async function callPerplexityAPI(endpoint, payload) {
      try {
        if (payload.debugMode === 1) {
          console.log('🔮 Perplexity Model:', payload.model);
          console.log('🔮 Perplexity Extended Parameters:', {
            search_mode: payload.search_mode,
            search_context_size: payload.search_context_size,
            user_location: payload.user_location,
            search_domain_filter: payload.search_domain_filter,
            return_images: payload.return_images,
            return_related_questions: payload.return_related_questions,
            search_recency_filter: payload.search_recency_filter,
            search_after_date_filter: payload.search_after_date_filter,
            search_before_date_filter: payload.search_before_date_filter,
            last_updated_after_filter: payload.last_updated_after_filter,
            last_updated_before_filter: payload.last_updated_before_filter,
            reasoning_effort: payload.reasoning_effort,
            top_p: payload.top_p,
            top_k: payload.top_k,
            presence_penalty: payload.presence_penalty,
            frequency_penalty: payload.frequency_penalty,
            response_format: payload.response_format,
            web_search_options: payload.web_search_options
          });
        }

        // Check if model name contains "reasoning"
        const modelName = (payload.model || '').toLowerCase()
        const isReasoningModel = modelName.includes('reasoning')

        // Create reasoning section for reasoning models
        let reasoningSection = null;
        let reasoningContent = null;
        let answerSection = null;
        let answerContent = null;

        if (isReasoningModel) {
          // Create Perplexity reasoning UI - kompaktní verze
          const reasoningHTML = `<div class="reasoning-section"><div class="reasoning-header"><div class="reasoning-icon" style="color: #333333; font-size: 14px; margin-right: 6px; flex-shrink: 0; line-height: 1;">🔎</div><div class="reasoning-title-wrapper"><div class="reasoning-title" style="font-weight: 600; color: #333333; font-size: 13px; line-height: 1.2; flex-grow: 1;">Myšlenkový proces</div><svg class="toggle-icon" viewBox="0 0 20 20" fill="currentColor" style="color: #333333; font-size: 12px; transition: transform 0.2s ease;"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg></div></div><div class="reasoning-content" id="reasoning-content"></div></div><div class="answer-section"><div class="answer-content" id="answer-content" style="padding-top: 12px;"></div></div>`;
          
          // Replace responseContent with Perplexity UI
          responseContent.innerHTML = reasoningHTML;
          
          // Get references to new elements
          reasoningSection = responseContent.querySelector('.reasoning-section');
          reasoningContent = responseContent.querySelector('#reasoning-content');
          answerContent = responseContent.querySelector('#answer-content');
          answerSection = responseContent.querySelector('.answer-section');
          
          // Create initial reasoning group
          const reasoningGroup = createReasoningGroup();
          reasoningContent.appendChild(reasoningGroup);
          activeReasoningGroup = reasoningGroup;
          isStreaming = true;
          
          // Add overflow handling styles
          reasoningContent.style.overflow = 'visible';
        }

        const proxyUrl = `https://utils.hypedigitaly.ai${endpoint}`;
        if (payload.debugMode === 1) {
          console.log(`🌐 Calling Perplexity proxy URL: ${proxyUrl}`);
        }

        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorText = `HTTP error! status: ${response.status}`;
          try {
            errorText += `, body: ${await response.text()}`;
          } catch (e) { /* ignore */ }
          throw new Error(errorText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        let answer = '';
        let hasStartedAnswer = false;
        let isFirstChunk = true;
        let isInThinkBlock = false;
        let thinkBuffer = '';
        let citations = [];
        let currentStep = null;

        // Show main container and hide loading animation
        if (isFirstChunk) {
          const thinkingHeader = container.querySelector(".thinking-header");
          if (thinkingHeader) {
            thinkingHeader.classList.add("hidden");
          }
          responseSection.classList.add("visible");
          isFirstChunk = false;
        }

        // Helper functions for reasoning steps
        function createNewStep(content, isComplete = false) {
          const step = createReasoningStep(content, activeReasoningGroup, activeReasoningGroup.children.length, citations);
          
          if (step) {
            activeReasoningGroup.appendChild(step);
            
            const checkbox = step.querySelector('.step-checkbox');
            if (checkbox) {
              checkbox.style.display = 'flex';
              if (isComplete) {
                checkbox.classList.add('is-checked');
                completedSteps.push(step);
              }
            }
            
            reasoningContent.style.height = 'auto';
            
            void reasoningContent.offsetHeight;
            setTimeout(scrollToBottom, 10);
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 100);
            
            return step;
          }
          return null;
        }

        function updateStep(step, content, complete = false) {
          if (!step) return;
          
          const contentDiv = step.querySelector('.step-content');
          if (contentDiv) {
            contentDiv.innerHTML = processCitations(content, citations, true);
            if (payload.debugMode === 1) {
              console.log('🔄 Updated step with citations:', citations?.length || 0);
            }
          }
          
          if (complete && !completedSteps.includes(step)) {
            const checkbox = step.querySelector('.step-checkbox');
            if (checkbox) {
              checkbox.classList.add('is-checked');
            }
            completedSteps.push(step);
          }
          
          reasoningContent.style.height = 'auto';
          
          void reasoningContent.offsetHeight;
          setTimeout(scrollToBottom, 10);
          setTimeout(scrollToBottom, 50);
          setTimeout(scrollToBottom, 100);
        }

        // Process thinking content
        function processThinkingContent(content) {
          thinkBuffer += content;
          
          const parts = thinkBuffer.split('\n');
          const incompletePart = parts.pop() || '';
          const completeParts = parts.filter((part) => part.trim());
          
          for (const line of completeParts) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              if (currentStep) {
                updateStep(currentStep, trimmedLine, true);
                currentStep = null;
              } else {
                const existingSteps = Array.from(activeReasoningGroup.querySelectorAll('.step-content'));
                const hasStep = existingSteps.some((step) => step.textContent.replace(/\s+/g, ' ').trim() === trimmedLine);
                if (!hasStep) {
                  createNewStep(trimmedLine, true);
                }
              }
            }
          }
          
          if (incompletePart.trim()) {
            if (!currentStep) {
              currentStep = createNewStep(incompletePart.trim(), false);
            } else {
              updateStep(currentStep, incompletePart.trim(), false);
            }
          } else if (currentStep) {
            const contentDiv = currentStep.querySelector('.step-content');
            if (contentDiv) {
              const currentText = contentDiv.textContent.replace(/\s+/g, ' ').trim();
              updateStep(currentStep, currentText, true);
            }
            currentStep = null;
          }
          
          thinkBuffer = incompletePart;
        }

        // Update answer content with simplified markdown support and citations
        function updateAnswerContent(text) {
          const trimmedText = text.trim();
          
          // Process citations first
          const textWithCitations = processCitations(trimmedText, citations, false);
          
          if (payload.debugMode === 1) {
            console.log('🔍 PERPLEXITY DEBUG: Raw text for formatting:', textWithCitations.substring(0, 200) + '...');
            console.log('🔍 PERPLEXITY DEBUG: Contains ###?', textWithCitations.includes('###'));
            console.log('🔍 PERPLEXITY DEBUG: Contains line breaks?', textWithCitations.includes('\n'));
          }
          
          // First, normalize line breaks and ensure proper formatting for streaming content
          let normalizedText = textWithCitations
            // Ensure line breaks before and after markdown headers
            .replace(/([.!?])\s*###\s*/g, '$1\n\n### ')
            .replace(/###\s*([^\n]+)/g, '\n\n### $1\n\n')
            // Ensure line breaks before list items
            .replace(/([.!?])\s*-\s+/g, '$1\n- ')
            .replace(/([.!?])\s*\*\s+/g, '$1\n* ')
            // Ensure line breaks after sentences for better processing
            .replace(/([.!?])\s+([A-ZČŠŽŘŮĚÝÁÍÉÓÚĎ])/g, '$1\n$2');
          
          if (payload.debugMode === 1) {
            console.log('🔍 PERPLEXITY DEBUG: After normalization:', normalizedText.substring(0, 300) + '...');
          }
          
          // Simplified markdown processing for Perplexity complete text
          let formattedContent = normalizedText
            // Headers - handle both line-start and mid-text headers
            .replace(/^##### (.+)$/gm, "<h5>$1</h5>")
            .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            // Also handle headers not at line start (for streaming content)
            .replace(/\n### ([^\n]+)\n/g, '\n<h3>$1</h3>\n')
            .replace(/\n## ([^\n]+)\n/g, '\n<h2>$1</h2>\n')
            .replace(/\n# ([^\n]+)\n/g, '\n<h1>$1</h1>\n')
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            // Code
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (match, alt, url) {
              let cleanUrl = url.trim();
              if (cleanUrl.match(/^http:\/\//i)) {
                cleanUrl = cleanUrl.replace(/^http:\/\//i, "https://");
              }
              const altText = alt ? alt.trim() : "";
              return `<img src="${cleanUrl}" alt="${altText}" style="max-width:100%; height:auto; display:block; margin:0.5em 0;">`;
            })
            // Links (but not citations which are already processed)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Line separators
            .replace(/^-{3,}$/gm, '<hr class="markdown-separator" />')
            // Lists - bullet points (both at line start and after line breaks)
            .replace(/^- (.+)$/gm, "<li>$1</li>")
            .replace(/^\* (.+)$/gm, "<li>$1</li>")
            .replace(/\n- (.+)/g, '\n<li>$1</li>')
            .replace(/\n\* (.+)/g, '\n<li>$1</li>')
            // Numbered lists  
            .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
            .replace(/\n(\d+)\. (.+)/g, '\n<li>$2</li>');

          // Wrap consecutive list items in ul tags
          formattedContent = formattedContent
            .replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, function(match) {
              // Check if already wrapped
              if (match.includes('<ul>')) {
                return match;
              }
              return `<ul>${match}</ul>`;
            })
            // Clean up multiple ul/ol tags
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/<\/ol>\s*<ol>/g, '');

          // Process tables
          formattedContent = formattedContent.replace(
            /(?:^|\n)(\s*\|[^\n]+\|\n\s*\|[\s\-:|]+\|\n(?:\s*\|[^\n]+\|\n?)*)/gm,
            function (match) {
              const tableContent = match.trim();
              const rows = tableContent.split("\n").filter((row) => row.trim());

              if (rows.length < 2) return match;

              let tableHtml = '<table class="markdown-table">\n';
              let headerProcessed = false;

              rows.forEach((row, rowIndex) => {
                const trimmedRow = row.trim();

                // Skip separator row
                if (rowIndex === 1 && /^\s*\|[\s\-:|]+\|\s*$/.test(trimmedRow)) {
                  return;
                }

                tableHtml += "  <tr>\n";

                let cells;
                if (trimmedRow.startsWith("|") && trimmedRow.endsWith("|")) {
                  cells = trimmedRow.slice(1, -1).split("|");
                } else {
                  cells = trimmedRow.split("|");
                }

                cells.forEach((cell) => {
                  const cellContent = cell.trim();
                  const cellTag = !headerProcessed && rowIndex === 0 ? "th" : "td";
                  tableHtml += `    <${cellTag}>${cellContent}</${cellTag}>\n`;
                });

                if (!headerProcessed && rowIndex === 0) {
                  headerProcessed = true;
                }

                tableHtml += "  </tr>\n";
              });

              tableHtml += "</table>";
              return tableHtml;
            }
          );
          
          // Convert remaining line breaks to HTML breaks for better formatting
          formattedContent = formattedContent.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>');
          
          if (payload.debugMode === 1) {
            console.log('🔍 PERPLEXITY DEBUG: Final formatted content:', formattedContent.substring(0, 300) + '...');
            if (formattedContent.includes('<h3>')) {
              console.log('🔍 PERPLEXITY DEBUG: Successfully found H3 tags!');
            }
            if (formattedContent.includes('<li>')) {
              console.log('🔍 PERPLEXITY DEBUG: Successfully found LI tags!');
            }
          }
          
          if (answerContent) {
            answerContent.innerHTML = formattedContent;
            if (payload.debugMode === 1) {
              console.log('📝 Updated answer content with citations:', citations?.length || 0);
            }
          }
        }

        // Process stream data
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            isStreaming = false;
            break;
          }



          const chunk = decoder.decode(value);
          let jsonBuffer = streamBuffer + chunk;
          streamBuffer = '';

          const lines = jsonBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;
            if (line === 'data: [DONE]') continue;

            try {
              const jsonStr = line.slice(5);
              const data = JSON.parse(jsonStr);
              
              if (data.citations) {
                citations = data.citations;
                if (payload.debugMode === 1) {
                  console.log('📎 Citations updated:', citations);
                }
                
                // Re-process all existing reasoning steps with new citations
                if (activeReasoningGroup) {
                  const steps = activeReasoningGroup.querySelectorAll('.reasoning-step');
                  steps.forEach((step) => {
                    const contentDiv = step.querySelector('.step-content');
                    if (contentDiv) {
                      // Get original content without any HTML
                      const currentText = contentDiv.textContent.replace(/\s+/g, ' ').trim();
                      // Process citations directly with isReasoning flag
                      contentDiv.innerHTML = processCitations(currentText, citations, true);
                    }
                  });
                }
              }

              if (data.choices?.[0]?.delta?.content !== null && data.choices?.[0]?.delta?.content !== undefined) {
                const content = data.choices[0].delta.content;
                
                // Mark first chunk as processed
                if (isFirstChunk) {
                  isFirstChunk = false;
                }

                // Handle think block content for reasoning models
                if (isReasoningModel) {
                  if (content.includes('<think>')) {
                    isInThinkBlock = true;
                    const afterThink = content.split('<think>')[1] || '';
                    if (afterThink) {
                      processThinkingContent(afterThink);
                    }
                  } else if (content.includes('</think>')) {
                    isInThinkBlock = false;
                    const beforeThinkEnd = content.split('</think>')[0];
                    if (beforeThinkEnd) {
                      processThinkingContent(beforeThinkEnd);
                    }
                    if (currentStep) {
                      const contentDiv = currentStep.querySelector('.step-content');
                      if (contentDiv) {
                        const currentText = contentDiv.textContent;
                        updateStep(currentStep, currentText, true);
                      }
                      currentStep = null;
                    }
                    const afterThink = content.split('</think>')[1] || '';
                    if (afterThink) {
                      answer += afterThink;
                      updateAnswerContent(answer);
                    }
                  } else if (isInThinkBlock) {
                    processThinkingContent(content);
                  } else {
                    answer += content;
                    updateAnswerContent(answer);
                    
                    if (!hasStartedAnswer) {
                      hasStartedAnswer = true;
                      setTimeout(() => {
                        if (reasoningSection) {
                          reasoningSection.classList.add('collapsed');
                          reasoningSection.classList.add('has-answer');
                        }
                        if (answerSection) {
                          answerSection.classList.add('visible');
                          answerSection.style.display = 'block';
                        }
                        if (answerContent) {
                          scrollIntoViewSmooth(answerContent);
                        }
                      }, 500);
                    }
                  }
                } else {
                  // For non-reasoning models, just update regular content
                  updateContent(content);
                }
              }
            } catch (e) {
              // Skip incomplete chunks silently
            }
          }
        }

        // Process any remaining complete data in buffer
        if (streamBuffer.trim() && streamBuffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(streamBuffer.slice(5));
            // Process final chunk if needed
          } catch (e) {
            // Ignore parsing errors for final incomplete chunk
          }
        }

        return true; // Success
      } catch (error) {
        if (payload.debugMode === 1) {
          console.error('❌ Perplexity API Error:', error);
        }
        
        // Show error in UI
        if (responseContent) {
          responseContent.innerHTML = `<p style="color: #DC2626;">Error: Failed to get response from Perplexity API - ${error.message}</p>`;
        }
        
        return false; // Failure
      } finally {
        isStreaming = false;
      }
    }

    // Generic function to call any LLM API provider with TTFT timeout
    async function callLLMAPI(endpoint, payload) {
      // Determine TTFT timeout based on web search usage
      const hasWebSearch = payload.enableWebSearch || payload.forceWebSearch;
      const TTFT_TIMEOUT_MS = hasWebSearch ? 30000 : 10000; // 30s for web search, 10s otherwise
      
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
            console.log(
              `⏰ TTFT Timeout (${TTFT_TIMEOUT_MS}ms) reached for ${endpoint}. Aborting fetch.`,
            );
          }
          // Abort the fetch *before* rejecting due to timeout
          if (!abortController.signal.aborted) {
            abortController.abort("TTFT Timeout"); // Use a reason for clarity
          }
          reject(
            new Error(
              `TTFT timeout after ${TTFT_TIMEOUT_MS}ms for ${endpoint}`,
            ),
          );
        }, TTFT_TIMEOUT_MS);
      });

      // This function handles the actual fetch and stream processing
      const processStream = async () => {
        let response;
        let localCompleteResponse = "";
        let receivedAnyContent = false; // Track if *any* content was processed successfully

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
              user_id: payload.user_id,
            });
            console.log(
              `�� Calling proxy URL: ${proxyUrl} with TTFT ${TTFT_TIMEOUT_MS}ms`,
            );
          }

          response = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: abortController.signal, // Use the abort signal
          });

          if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try {
              errorText += `, body: ${await response.text()}`;
            } catch (e) {
              /* ignore */
            }
            // Reject the firstChunkPromise if the initial fetch fails
            throw new Error(errorText);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let streamBuffer = "";

          while (true) {
            // Check for abort *before* reading - handles external aborts or quick timeouts
            if (abortController.signal.aborted) {
              throw new Error(
                `Fetch aborted during read for ${endpoint}. Reason: ${abortController.signal.reason || "Unknown"}`,
              );
            }

            const { done, value } = await reader.read();

            if (value) {
              streamBuffer += decoder.decode(value, { stream: true });
            }

            let lines = streamBuffer.split("\n");
            streamBuffer = done ? "" : lines.pop() || "";

            for (const line of lines) {
              if (abortController.signal.aborted) {
                // Stop processing immediately if aborted (e.g., by timeout while processing buffer)
                throw new Error(
                  `Fetch aborted during line processing for ${endpoint}. Reason: ${abortController.signal.reason || "Unknown"}`,
                );
              }

              if (!line.trim() || !line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();

              if (data === "[DONE]") {
                if (payload.debugMode === 1)
                  console.log(`[DONE] received for ${endpoint}.`);
                // Attempt Voiceflow update only if content was actually received and processed
                if (receivedAnyContent) {
                  await updateVoiceflowVariable(payload, localCompleteResponse);
                } else if (payload.debugMode === 1) {
                  console.log(
                    "⚠️ No content received before [DONE], skipping Voiceflow update.",
                  );
                }
                return { success: true }; // Signal successful completion
              }

              try {
                if (data.startsWith("{") && data.endsWith("}")) {
                  const parsed = JSON.parse(data);

                  if (payload.debugMode === 1) {
                    console.log(`📥 Frontend chunk from ${endpoint}:`, parsed);
                  }

                  if (parsed.error) {
                    throw new Error(
                      `Stream error from ${endpoint}: ${parsed.error}`,
                    );
                  }

                  // Handle different types of content
                  if (parsed.type === 'annotations') {
                    // Handle file search annotations (citations)
                    if (payload.debugMode === 1) {
                      console.log('📎 Processing file search annotations:', parsed.content);
                    }
                    handleFileSearchAnnotations(parsed.content);
                    receivedAnyContent = true;
                  } else {
                    // Handle regular content
                    const content = parsed.content || "";
                    if (content || typeof content === "string") {
                      // Handle empty string content too
                      receivedAnyContent = true; // Mark that we have received processable content

                      // --- TTFT Logic ---
                      if (!firstChunkReceived) {
                        firstChunkReceived = true;
                        if (payload.debugMode === 1)
                          console.log(
                            `✅ First chunk received from ${endpoint} within timeout.`,
                          );
                        // Crucially, clear the TTFT timer now
                        if (ttftTimeoutId) clearTimeout(ttftTimeoutId);
                        // Signal that the TTFT hurdle is passed
                        resolveFirstChunkPromise();
                      }
                      // --- End TTFT Logic ---

                      // Update UI only if the fetch wasn't aborted *before* this point
                      if (!abortController.signal.aborted) {
                        updateContent(content);
                        localCompleteResponse += content;
                      } else {
                        // Should theoretically not happen if abort check is robust, but good failsafe
                        if (payload.debugMode === 1)
                          console.warn(
                            `⚠️ Content received for ${endpoint} *after* abort signal. Discarding.`,
                          );
                        // Do not update UI or localCompleteResponse if aborted
                      }
                    }
                  }
                } else if (payload.debugMode === 1 && data) {
                  console.log(
                    `Received non-JSON data chunk from ${endpoint}:`,
                    data,
                  );
                }
              } catch (parseError) {
                if (payload.debugMode === 1)
                  console.warn(
                    `Failed to parse SSE data line for ${endpoint}:`,
                    parseError,
                    "Data:",
                    data,
                  );
              }
            } // End line processing loop

            if (done) {
              if (payload.debugMode === 1)
                console.log(
                  `Stream ended naturally (done=true) for ${endpoint}.`,
                );
              // If stream ends without [DONE], but we got content, consider it success
              if (receivedAnyContent) {
                if (payload.debugMode === 1)
                  console.log(
                    "Attempting Voiceflow update on natural stream end.",
                  );
                await updateVoiceflowVariable(payload, localCompleteResponse);
                return { success: true };
              } else {
                // No content AND no [DONE] -> Treat as failure for this provider
                throw new Error(
                  `Stream ended for ${endpoint} without [DONE] signal or any valid content.`,
                );
              }
            }
          } // End while true loop
        } catch (error) {
          // Catch all errors from fetch, reading, processing
          if (error.name === "AbortError") {
            // Log abort reason, but the failure is handled by the Promise.race outcome
            if (payload.debugMode === 1)
              console.log(
                `Fetch aborted for ${endpoint}. Reason: ${abortController.signal.reason || "Unknown"}`,
              );
          } else {
            // Log other errors
            if (payload.debugMode === 1)
              console.error(
                `Error during stream processing for ${endpoint}:`,
                error,
              );
          }
          // If an error occurs *before* the first chunk, reject the firstChunkPromise
          if (!firstChunkReceived) {
            try {
              rejectFirstChunkPromise(error);
            } catch (e) {
              /* ignore if already settled */
            }
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
          if (payload.debugMode === 1)
            console.log("Skipping Voiceflow update: No content generated.");
          return;
        }
        try {
          if (payload.debugMode === 1)
            console.log(
              "📤 Updating Voiceflow variable with response length:",
              completeResponse.length,
            );
          const updateResponse = await fetch(
            "https://utils.hypedigitaly.ai/api/voiceflow-variable-update",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: payload.user_id,
                projectName: payload.projectName,
                variables: { LLM_Main_Response: completeResponse },
                debugMode: payload.debugMode || 0,
              }),
            },
          );
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            if (payload.debugMode === 1)
              console.error("Failed to update Voiceflow variables:", errorText);
          } else if (payload.debugMode === 1) {
            console.log("✅ Voiceflow update attempted successfully.");
            try {
              const responseData = await updateResponse.json();
              console.log("Voiceflow update response:", responseData);
            } catch (e) {
              console.log("Voiceflow update status:", updateResponse.status);
            }
          }
        } catch (error) {
          if (payload.debugMode === 1)
            console.error("Error during Voiceflow variable update:", error);
        }
      }

      // --- Main Execution Logic ---
      try {
        // Start processing the stream in the background. We don't await it here directly.
        const streamProcessingResultPromise = processStream();

        // Race: Wait for EITHER the first chunk OR the TTFT timeout.
        await Promise.race([firstChunkPromise, ttftTimeoutPromise]);

        // ---- If we reach this point, firstChunkPromise resolved successfully (TTFT met) ----
        if (payload.debugMode === 1)
          console.log(
            `TTFT met for ${endpoint}. Waiting for stream completion...`,
          );

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
          if (error.message.startsWith("TTFT timeout")) {
            console.warn(
              `callLLMAPI failed for ${endpoint} due to TTFT timeout.`,
            );
          } else {
            console.error(
              `callLLMAPI failed for ${endpoint} before first chunk. Reason:`,
              error.message,
            );
          }
        }

        // Ensure fetch is aborted if it hasn't been already (especially for non-timeout errors)
        if (!abortController.signal.aborted) {
          abortController.abort("callLLMAPI error before first chunk");
        }

        // Make sure thinking animation is hidden if we fail early
        if (isFirstChunk) {
          const thinkingHeader = container.querySelector(".thinking-header");
          if (thinkingHeader && !thinkingHeader.classList.contains("hidden")) {
            thinkingHeader.classList.add("hidden");
            responseSection.classList.add("visible"); // Show section even on failure
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
        console.log(
          `📋 Raw sequence: ${trace.payload.modelSequence || "Default"}`,
        );
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

        const model = modelsRegistry.find((m) => m.id === modelId);

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
          console.log(
            `\n🔄 ATTEMPT ${attemptedModels.length}/${modelSequence.length}: Using model ID:${model.id}`,
          );
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

        // Add OpenAI-specific web search and file search parameters
        if (model.type === 'openai') {
          // OpenAI web search parameters
          if (trace.payload.enableWebSearch !== undefined) payload.enableWebSearch = trace.payload.enableWebSearch;
          if (trace.payload.forceWebSearch !== undefined) payload.forceWebSearch = trace.payload.forceWebSearch;
          if (trace.payload.searchContextSize) payload.searchContextSize = trace.payload.searchContextSize;
          if (trace.payload.userLocation) payload.userLocation = trace.payload.userLocation;
          if (trace.payload.tool_choice) payload.tool_choice = trace.payload.tool_choice;
          
          // OpenAI file search parameters
          if (trace.payload.enableFileSearch !== undefined) payload.enableFileSearch = trace.payload.enableFileSearch;
          if (trace.payload.vectorStoreIds) payload.vectorStoreIds = trace.payload.vectorStoreIds;
          if (trace.payload.fileSearchMaxResults) payload.fileSearchMaxResults = trace.payload.fileSearchMaxResults;
          if (trace.payload.fileSearchRewriteQuery !== undefined) payload.fileSearchRewriteQuery = trace.payload.fileSearchRewriteQuery;
          if (trace.payload.fileSearchInclude) payload.fileSearchInclude = trace.payload.fileSearchInclude;
          if (trace.payload.fileSearchFilters) payload.fileSearchFilters = trace.payload.fileSearchFilters;
          if (trace.payload.fileSearchRankingOptions) payload.fileSearchRankingOptions = trace.payload.fileSearchRankingOptions;
          
          // OpenAI reasoning and tools parameters
          if (trace.payload.reasoning !== undefined) payload.reasoning = trace.payload.reasoning;
          if (trace.payload.tools) payload.tools = trace.payload.tools;
        }

        // Add Perplexity-specific parameters
        // Full parameter documentation available in pages/api/perplexity-stream.js
        if (model.type === 'perplexity') {
          payload.apiKey = trace.payload.apiKey;
          payload.messages = trace.payload.messages || trace.payload.userData;
          
          // Web search options
          if (trace.payload.search_mode) payload.search_mode = trace.payload.search_mode;
          if (trace.payload.search_context_size) payload.search_context_size = trace.payload.search_context_size;
          if (trace.payload.user_location) payload.user_location = trace.payload.user_location;
          if (trace.payload.search_domain_filter) payload.search_domain_filter = trace.payload.search_domain_filter;
          if (trace.payload.return_images !== undefined) payload.return_images = trace.payload.return_images;
          if (trace.payload.return_related_questions !== undefined) payload.return_related_questions = trace.payload.return_related_questions;
          if (trace.payload.search_recency_filter) payload.search_recency_filter = trace.payload.search_recency_filter;
          if (trace.payload.search_after_date_filter) payload.search_after_date_filter = trace.payload.search_after_date_filter;
          if (trace.payload.search_before_date_filter) payload.search_before_date_filter = trace.payload.search_before_date_filter;
          if (trace.payload.last_updated_after_filter) payload.last_updated_after_filter = trace.payload.last_updated_after_filter;
          if (trace.payload.last_updated_before_filter) payload.last_updated_before_filter = trace.payload.last_updated_before_filter;
          
          // Reasoning and model parameters
          if (trace.payload.reasoning_effort) payload.reasoning_effort = trace.payload.reasoning_effort;
          if (trace.payload.top_p !== undefined) payload.top_p = trace.payload.top_p;
          if (trace.payload.top_k !== undefined) payload.top_k = trace.payload.top_k;
          if (trace.payload.presence_penalty !== undefined) payload.presence_penalty = trace.payload.presence_penalty;
          if (trace.payload.frequency_penalty !== undefined) payload.frequency_penalty = trace.payload.frequency_penalty;
          if (trace.payload.response_format) payload.response_format = trace.payload.response_format;
          
          // Web search options object (takes precedence over individual parameters)
          if (trace.payload.web_search_options) payload.web_search_options = trace.payload.web_search_options;
        }

        // Add OpenRouter-specific parameters
        // Full parameter documentation available in pages/api/openrouter-stream.js
        if (model.type === 'openrouter') {
          payload.apiKey = trace.payload.apiKey;
          payload.messages = trace.payload.messages || trace.payload.userData;
          
          // Model routing parameters
          if (trace.payload.models) payload.models = trace.payload.models; // Fallback models array
          
          // Provider routing parameters
          if (trace.payload.provider) payload.provider = trace.payload.provider;
          
          // Web search plugin parameters
          if (trace.payload.plugins) payload.plugins = trace.payload.plugins;
          if (trace.payload.enableWebSearch !== undefined) payload.enableWebSearch = trace.payload.enableWebSearch;
          
          // Standard OpenAI-compatible parameters supported by OpenRouter
          if (trace.payload.top_p !== undefined) payload.top_p = trace.payload.top_p;
          if (trace.payload.top_k !== undefined) payload.top_k = trace.payload.top_k;
          if (trace.payload.presence_penalty !== undefined) payload.presence_penalty = trace.payload.presence_penalty;
          if (trace.payload.frequency_penalty !== undefined) payload.frequency_penalty = trace.payload.frequency_penalty;
          if (trace.payload.response_format) payload.response_format = trace.payload.response_format;
          if (trace.payload.tools) payload.tools = trace.payload.tools;
          if (trace.payload.tool_choice) payload.tool_choice = trace.payload.tool_choice;
          if (trace.payload.seed !== undefined) payload.seed = trace.payload.seed;
          if (trace.payload.stop) payload.stop = trace.payload.stop;
          
          // OpenRouter-specific headers
          if (trace.payload.site_url) payload.site_url = trace.payload.site_url;
          if (trace.payload.site_name) payload.site_name = trace.payload.site_name;
        }

        // Call the appropriate LLM API based on model type
        let success;
        if (model.type === 'perplexity') {
          success = await callPerplexityAPI(model.endpoint, payload);
        } else if (model.type === 'openrouter') {
          success = await callLLMAPI(model.endpoint, payload);
        } else {
          success = await callLLMAPI(model.endpoint, payload);
        }

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
            console.log(
              `📌 Attempt: ${attemptedModels.length}/${modelSequence.length}`,
            );
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
            console.log(
              `📌 Attempt: ${attemptedModels.length}/${modelSequence.length}`,
            );
          }

          // *** IMPORTANT: Clear content before trying the next model ***
          if (responseContent) {
            if (trace.payload.debugMode === 1) {
              console.log(`🧼 Clearing response content before next attempt.`);
            }
            responseContent.innerHTML = ""; // Clear the displayed content
            completeResponse = ""; // Reset the global complete response accumulator
            // We might potentially reset isFirstChunk = true here if we want the loader again
            // For now, just clearing content.
          }

          // Check if there are more models to try
          const nextModelIndex = modelSequence.indexOf(modelId) + 1;
          if (nextModelIndex < modelSequence.length) {
            const nextModelId = modelSequence[nextModelIndex];
            const nextModel = modelsRegistry.find((m) => m.id === nextModelId);
            if (nextModel && trace.payload.debugMode === 1) {
              console.log(
                `📌 Next attempt: ${getModelDetailById(nextModelId)}`,
              );
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
            const status =
              attempt.success === null
                ? "(Not Run)"
                : attempt.success
                  ? "(Success - Error in Logic?)"
                  : "(Failed/Timed Out)";
            console.log(`   ${index + 1}. ${detail} ${status}`);
          });
          console.log(`📌 Result: No successful responses`);
          console.log(`=============================`);
        }
        // Add the footer indicating failure, showing all attempts
        addAIInfoFooter(attemptedModels);
      }
    }

    // Add final processing function for when streaming ends
    async function finalizeContent() {
      if (buffer !== completeResponse && buffer.includes('##')) {
        if (trace.payload?.debugMode === 1) {
          console.log("🔍 FINALIZE: Processing remaining buffer content");
        }
        updateContent(''); // Trigger final processing with complete buffer
      }
    }

    // Start the LLM orchestration
    await orchestrateLLMCalls(trace);
    
    // Final processing after streaming completes
    setTimeout(() => finalizeContent(), 100);

    // Cleanup function for URL preview container
    const cleanup = () => {
      if (previewContainer && previewContainer.parentNode) {
        previewContainer.parentNode.removeChild(previewContainer);
      }
      if (urlPreviewStyles && urlPreviewStyles.parentNode) {
        urlPreviewStyles.parentNode.removeChild(urlPreviewStyles);
      }
    };

    // Schedule cleanup after interaction completes
    setTimeout(cleanup, 5000);

    window.voiceflow.chat.interact({ type: "continue" });
  },
};

