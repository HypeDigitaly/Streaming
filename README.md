
# Multi-LLM Streaming Extension

A Next.js API extension that provides streaming capabilities for multiple LLM providers including OpenAI, Anthropic Claude, Google Gemini, Groq, and SambaNova.

## Features

- Stream responses from multiple LLM providers
- Support for OpenAI, Claude, Gemini, and Groq
- Domain whitelisting for security
- Project-specific API key management
- Debug mode for troubleshooting

## Usage

### Setup

1. Clone/fork this template
2. Add your API keys as Secrets in the Replit environment:
   - `OPENAI_API_KEY` 
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `SAMBANOVA_API_KEY`
   - For project-specific keys, use format: `OPENAI_API_KEY_PROJECTNAME`

3. Update the whitelist in `config/domains.js` with the domains allowed to access your API

### Streaming API Endpoints

Each LLM provider has its own endpoint:

- `/api/openai-stream` - OpenAI GPT models
- `/api/claude-stream` - Anthropic Claude models
- `/api/gemini-stream` - Google Gemini models
- `/api/groq-stream` - Groq models
- `/api/sambanova-stream` - SambaNova models

### Example Request

```javascript
const response = await fetch('https://your-repl-url.repl.co/api/openai-stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4.1-2025-04-14',
    userData: 'Your prompt here',
    systemPrompt: 'Instructions for the model',
    temperature: 0,
    max_tokens: 4096,
    projectName: 'YOUR_PROJECT',
    debugMode: 0
  })
});

// Process the streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process each event
  const events = chunk.split('\n\n').filter(Boolean);
  for (const event of events) {
    if (event.startsWith('data: ')) {
      const data = event.slice(6);
      if (data === '[DONE]') break;
      
      try {
        const parsedData = JSON.parse(data);
        // Process the content
        console.log(parsedData.content);
      } catch (e) {
        console.error('Error parsing JSON:', e);
      }
    }
  }
}
```

## Configuration

This template uses Next.js. You can modify the following files to customize:

- `next.config.js` - Configure Next.js settings
- `config/domains.js` - Manage whitelisted domains
- `pages/api/*.js` - Modify API endpoints

## License

MIT License
