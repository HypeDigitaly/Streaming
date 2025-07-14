# Multi-LLM Streaming Extension

## Overview

This is a Next.js application that serves as a multi-LLM streaming API proxy, designed to provide secure, domain-whitelisted access to multiple LLM providers. The system acts as a middleware layer that handles authentication, routing, and streaming responses from various AI model providers including OpenAI, Anthropic Claude, Google Gemini, Groq, SambaNova, and others.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Enhanced Markdown to HTML Conversion (January 2025)
- **Fixed Empty Line Handling**: Resolved issue where empty lines in markdown were not properly converted to paragraph breaks in HTML
- **Improved Paragraph Separation**: Added intelligent paragraph spacing that creates proper visual breaks between content sections
- **Enhanced Code Block Support**: Added support for both inline code (`code`) and multi-line code blocks (```code```)
- **Added Blockquote Support**: Implemented proper blockquote rendering with > syntax
- **Better Line Break Management**: Improved handling of line breaks to prevent excessive spacing while maintaining readability
- **Enhanced CSS Styling**: Added comprehensive styling for code blocks, blockquotes, and improved paragraph spacing
- **Smart Empty Line Detection**: Empty lines now intelligently create paragraph breaks only when appropriate
- **Improved List Formatting**: Better handling of ordered and unordered lists with proper spacing

### Comprehensive URL Formatting Fix (January 2025)
- **Fixed PDF Link Streaming Issues**: Resolved persistent URL encoding problems that broke PDF and document links during streaming
- **Centralized URL Decoding**: Created decodeUrlSafely() function with comprehensive Czech character decoding including č, ř, á, í, é, š, ž, ý, ě, ů, ú, ň, ď, ť, ó
- **Multi-Stage URL Processing**: Added URL decoding at buffer level, markdown processing, and final content processing stages
- **Enhanced Link Detection**: Improved incomplete link detection to be more permissive with Czech government websites
- **Fixed Database Citation Packing**: Resolved issue where database citations were clustered together instead of being processed individually
- **Individual Citation Processing**: Database citations are now processed line by line to maintain proper formatting and clickable links
- **Comprehensive Debug Logging**: Added extensive logging for URL processing at all stages to track encoding/decoding issues

### Streaming Link Display Fix (January 2025)
- **Fixed PDF Link Streaming**: Resolved issue where PDF links and other URLs were broken during streaming due to URL encoding chunks
- **Enhanced Link Processing**: Improved markdown link regex to handle incomplete links during streaming by delaying processing until complete
- **Added Buffer Management**: Added logic to detect incomplete markdown links and delay processing until the full URL is received
- **Improved URL Decoding**: Added comprehensive URL decoding in finalizeContent() to handle Czech characters and URL encoding
- **Added Debug Logging**: Enhanced debugging for link processing to track incomplete links and URL decoding

### Database Citation Display Fix (January 2025)
- **Fixed Database Section Processing**: Resolved issue where only the first citation was displayed in the "Databázové zdroje" section despite all citations being properly wrapped in database tags
- **Simplified Regex Pattern**: Replaced complex regex patterns with simpler capture for `[[Database_Sources_End]]` markers to ensure all citations are included
- **Added Debug Logging**: Added comprehensive debugging for database section processing to track content capture and processing
- **Fixed JavaScript Syntax Error**: Resolved duplicate `formattedContent` variable declaration that was causing initialization errors

### Major Markdown to HTML Conversion Improvements (January 2025)
- **Complete Markdown Parser Rewrite**: Replaced the complex regex-based markdown processing with a robust line-by-line parser
- **Fixed Empty Line Handling**: Empty lines (\n) now properly convert to paragraph breaks instead of interfering with other HTML elements
- **Fixed Bullet Point Processing**: Bullet points (-,*,+) and numbered lists (1.,2.,3.) now properly wrap in `<ul>` and `<ol>` tags
- **Fixed Link Processing**: Markdown links `[text](url)` now correctly convert to `<a href="url" target="_blank">text</a>`
- **Multi-Level List Support**: Added proper support for nested lists with indentation
- **Header Processing**: Improved handling of headers (#, ##, ###) to prevent conflicts with other formatting
- **Paragraph Management**: Added proper paragraph wrapping with `<p>` tags that don't interfere with lists and headers

### HTML Formatting Improvements (January 2025)
- **Line Break Handling**: Fixed empty lines \n not being formatted correctly into HTML by adding proper newline-to-br conversion
- **Database Section End Marking**: Fixed database section end markers to properly format all citations after `[[Database_Sources_End]]` marker, not just the first one
- **Streaming Response Processing**: Improved handling of standalone end markers in streaming responses

## System Architecture

The application follows a simple yet robust architecture:

**Frontend Layer**: Next.js pages with React components for basic UI
**API Layer**: RESTful endpoints that proxy requests to different LLM providers
**Security Layer**: Domain whitelist validation and project-specific API key management
**Streaming Layer**: Server-sent events for real-time response streaming

The system is designed as a proxy service rather than a full-featured application, focusing on secure API access and response streaming.

## Key Components

### API Endpoints Structure
- **Provider-specific endpoints**: Each LLM provider has its own dedicated endpoint (`/api/openai-stream`, `/api/claude-stream`, etc.)
- **Unified request format**: All endpoints accept similar request structures with provider-specific parameters
- **Streaming responses**: All endpoints return Server-Sent Events (SSE) for real-time streaming

### Security Components
- **Domain whitelist**: Centralized domain validation in `config/domains.js`
- **Project-based API keys**: Support for multiple projects with dedicated API keys
- **CORS handling**: Proper cross-origin request handling with credential management

### Frontend Extensions
- **StreamingResponseExtension**: Advanced client-side component for handling streaming responses with reasoning capabilities
- **PerplexityReasonerExtension**: Specialized extension for Perplexity API responses with reasoning display

### Model Management
- **Multi-provider support**: Handles OpenAI, Anthropic, Google Gemini, Groq, SambaNova, OpenRouter, Perplexity, and Baseten
- **Model sequencing**: Supports fallback sequences between different models
- **Provider-specific features**: Each provider endpoint handles unique features like web search, reasoning, and multimodal inputs

## Data Flow

1. **Request Processing**: Client sends POST request to provider-specific endpoint
2. **Security Validation**: Domain whitelist check and API key selection based on project
3. **Provider Routing**: Request forwarded to appropriate LLM provider with proper authentication
4. **Response Streaming**: Provider responses streamed back to client via SSE
5. **Client Rendering**: Frontend extensions handle response display with advanced features

The system uses a simple request-response pattern with streaming capabilities, avoiding complex state management or database operations.

## External Dependencies

### LLM Provider SDKs
- **OpenAI SDK**: For GPT models and advanced features like web search and reasoning
- **Anthropic SDK**: For Claude models with caching support
- **Google Generative AI**: For Gemini models
- **Groq SDK**: For fast inference models
- **Direct API calls**: For SambaNova, Perplexity, OpenRouter, and Baseten

### Core Framework
- **Next.js 14**: Web framework with API routes
- **React 18**: For minimal frontend components
- **Node.js**: Runtime environment

### Utilities
- **node-fetch**: For HTTP requests to providers without official SDKs
- **Server-Sent Events**: Native browser/Node.js streaming support

## Deployment Strategy

The application is designed for simple deployment on platforms like Replit, Vercel, or similar Node.js hosting services:

**Environment Variables**: All API keys stored as environment variables with optional project-specific variants
**Static Configuration**: Domain whitelist stored in code for version control
**Serverless Ready**: API routes designed for serverless deployment
**No Database**: Stateless design eliminates database requirements

The system uses environment-based configuration for API keys (e.g., `OPENAI_API_KEY`, `OPENAI_API_KEY_PROJECTNAME`) and maintains a simple file-based domain whitelist for security.

**Key Architectural Decisions**:
- Chosen stateless design for simplicity and scalability
- Implemented provider-specific endpoints rather than unified endpoint for better error handling and feature support
- Used environment variables for configuration to support multiple deployment environments
- Implemented domain whitelisting for security without requiring complex authentication systems