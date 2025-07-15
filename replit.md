# Multi-LLM Streaming Extension

## Overview

This is a Next.js-based API proxy service that provides unified streaming capabilities for multiple Large Language Model (LLM) providers. The system acts as a middleware layer that handles authentication, domain security, and streaming responses from various AI providers including OpenAI, Anthropic Claude, Google Gemini, Groq, SambaNova, Perplexity, and others.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 15, 2025 - Fixed Database Section Packing Issue (Revised Approach)
- **Two-stage processing approach**: Database_Sources_End marker is now replaced with DATABASE_SOURCES_CITATIONS_START to mark where citations should be captured
- **Improved citation capture**: Added regex pattern `\[\[DATABASE_SOURCES_CITATIONS_START\]\]([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)` to capture citations that follow the end marker
- **Better streaming handling**: Citations are now processed in a separate stage after the Database_Sources_End marker is encountered
- **Enhanced content validation**: Added logic to differentiate between citation lines starting with `[digits]` and other content
- **Fixed citation overflow**: Citations [1], [2], [3] now properly wrapped in Database Sources section instead of appearing outside
- **Flexible content boundaries**: Stop processing citations when encountering double newlines, capital letters, or headers
- **Enhanced streaming buffer management**: Added special handling for incomplete Database_Sources_End markers to prevent premature processing

### January 15, 2025 - Fixed Download Links with Parentheses in Filenames
- **Fixed file link parsing issue**: Updated markdown link regex from `/\[([^\]]+)\]\(([^)]+)\)/g` to `/\[([^\]]+)\]\(([^)]+(?:\)[^)\s]*)*[^)\s]*)\)/g` to properly handle parentheses in filenames
- **Unique symbol wrapping**: Added `⟨⟨FILELINK_START⟩⟩` and `⟨⟨FILELINK_END⟩⟩` symbols around file links during processing to prevent conflicts with other formatting
- **Symbol removal**: Added code to remove unique symbols after all markdown processing is complete
- **Multiple file fixes**: Updated both StreamingResponseExtension.js and PerplexityStreamingExtension.js
- **Affected sections**: Fixed link processing in POSTUP, Database Sources, Web Search Sources, and general markdown sections
- **Examples fixed**: Links like `0350(2025)/BOD.pdf)` now work correctly instead of being truncated at the first parenthesis

### January 14, 2025 - Fixed Bold Text Color in Streaming Extensions
- **Changed bold text color from blue to black**: Updated all instances of bold text formatting in both StreamingResponseExtension.js and PerplexityStreamingExtension.js
- **Preserved blue color for URLs**: Kept the blue color styling for URL links as requested
- **Consistent formatting**: Ensured all bold text now uses `color: #000000` instead of the previous blue color `#2563eb`
- **Multiple function updates**: Fixed bold text formatting in `updateContent`, `updateAnswerContent`, and `markdownToHtml` functions

### January 14, 2025 - Improved Markdown-to-HTML Formatting
- **Fixed empty line handling**: Replaced `<br>` tags with properly spaced paragraph breaks using `<p style="margin: 0.5em 0; height: 1em;">&nbsp;</p>`
- **Enhanced header formatting**: Added proper styling with margins and font weights for H1, H2, H3 tags
- **Improved list formatting**: Added proper spacing and padding for ordered/unordered lists
- **Better blockquote styling**: Added background color, borders, and italic styling for blockquotes
- **Enhanced text formatting**: Added colored styling for bold, italic, and code elements
- **Improved table styling**: Added borders, proper cell padding, and header styling
- **Better link styling**: Added blue color and underline styling for links
- **Enhanced horizontal rules**: Added proper margin and border styling for separators

### January 14, 2025 - Fixed File & Link Formatting Issues
- **Improved URL decoding**: Enhanced `decodeUrlSafely()` function to handle double-encoded URLs and additional special characters
- **Fixed Database Sources overflow**: Added proper CSS styling to contain long URLs within collapsible sections
- **Enhanced link containment**: Added `word-break: break-all` and `overflow-wrap: break-word` for all links in thinking sections
- **Improved thinking section styling**: Updated Database Sources, Web Search Sources, and POSTUP sections with better URL handling
- **Added CSS word wrapping**: Enhanced ai-thinking-content styles to prevent text overflow in Voiceflow UI

### January 14, 2025 - Enhanced Multi-Level URL Decoding
- **Iterative URL decoding**: Implemented recursive decoding that handles multiple levels of URL encoding (e.g., `%20` → ` `)
- **Manual fallback decoding**: Added comprehensive manual character replacement for Czech characters and special symbols
- **Debug logging**: Added detailed logging to track URL decoding process and identify encoding issues
- **Infinite loop protection**: Added safety limits to prevent infinite decoding loops
- **Improved file link handling**: Better processing of heavily encoded file identifiers in Database Sources

### January 14, 2025 - Fixed Link Text Decoding
- **Link text decoding**: Added URL decoding to link text (filenames) in addition to URLs in all thinking sections
- **Database Sources improvement**: Fixed display of encoded filenames like `KUSK0C1CC9FT%20P%C5%99%C3%ADloha` → `KUSK0C1CC9FT Příloha`
- **Comprehensive link processing**: Updated POSTUP, Database Sources, and Web Search Sources to decode both URLs and link text
- **Czech character support**: Proper decoding of Czech characters in file names and link text

### January 14, 2025 - Fixed General Markdown Link Text Decoding
- **General markdown links**: Fixed link text decoding in general markdown processing (not just special sections)
- **Consistent encoding**: Ensured all markdown link patterns decode both URLs and link text consistently
- **File link formatting**: Fixed issue where file links displayed with encoded characters in link text
- **Improved readability**: Link text now properly displays Czech characters and spaces instead of URL encoding

These changes address the formatting issues in the Voiceflow UI where line breaks and empty lines were not displaying properly, and fix the URL encoding and overflow issues in the Database Sources section, making the content more readable and visually appealing.

## System Architecture

### Backend Architecture
- **Framework**: Next.js with API routes
- **Runtime**: Node.js serverless functions
- **Architecture Pattern**: Proxy/Gateway pattern with individual endpoints per provider
- **Security**: Domain whitelist-based access control
- **Response Format**: Server-Sent Events (SSE) for real-time streaming

### Frontend Extensions
- **Streaming Response Extension**: JavaScript client-side extension for rendering streaming responses
- **Perplexity Reasoner Extension**: Specialized extension for handling Perplexity's reasoning capabilities
- **Integration**: Designed to work with Voiceflow chat widgets

## Key Components

### API Endpoints
Each LLM provider has its own dedicated streaming endpoint:
- `/api/openai-stream` - OpenAI GPT models with web search and reasoning capabilities
- `/api/claude-stream` - Anthropic Claude models
- `/api/gemini-stream` - Google Gemini models
- `/api/groq-stream` - Groq models
- `/api/sambanova-stream` - SambaNova models
- `/api/perplexity-stream` - Perplexity models with web search
- `/api/openrouter-stream` - OpenRouter proxy for multiple models
- `/api/baseten-stream` - Baseten model hosting platform
- `/api/voiceflow-variable-update` - Voiceflow state management

### Security Layer
- **Domain Whitelist**: Centralized domain validation through `config/domains.js`
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **API Key Management**: Project-specific API key selection with fallback to default keys

### Client Extensions
- **StreamingResponseExtension.js**: Handles real-time streaming, model failover, and UI rendering
- **PerplexityReasonerExtension.js**: Specialized for Perplexity's reasoning display

## Data Flow

1. **Request Validation**: Origin domain checked against whitelist
2. **API Key Selection**: Project-specific or default API key selection
3. **Provider Routing**: Request forwarded to appropriate LLM provider
4. **Streaming Response**: Real-time response streaming via SSE
5. **Client Rendering**: JavaScript extensions handle UI updates and display

## External Dependencies

### LLM Provider SDKs
- `@anthropic-ai/sdk` - Anthropic Claude integration
- `openai` - OpenAI API client
- `@google/generative-ai` - Google Gemini integration
- `groq-sdk` - Groq API client
- `node-fetch` - HTTP client for other providers

### Framework Dependencies
- `next` - Next.js framework
- `react` and `react-dom` - React runtime

### Environment Variables
- Provider API keys (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
- Project-specific keys (e.g., `OPENAI_API_KEY_PROJECTNAME`)
- Voiceflow integration keys

## Deployment Strategy

### Environment Setup
- **Platform**: Designed for serverless deployment (Replit, Vercel, etc.)
- **Configuration**: Environment variables for API keys and secrets
- **Domain Management**: Whitelist configuration for security

### Key Features
- **Multi-Model Support**: Single interface for multiple LLM providers
- **Failover Logic**: Automatic model switching on failures
- **Debug Mode**: Comprehensive logging for troubleshooting
- **Customizable UI**: Configurable colors and styling for chat interfaces
- **Web Search Integration**: Advanced search capabilities through OpenAI and Perplexity
- **Reasoning Display**: Visual representation of model reasoning processes

### Project Structure
```
/pages/api/          # API endpoints for each provider
/config/             # Configuration files (domains, etc.)
/                    # Client-side extensions
/attached_assets/    # Documentation and examples
```

The system is designed to be easily extensible for new LLM providers and can be customized for specific use cases while maintaining security and performance standards.