import { Anthropic } from '@anthropic-ai/sdk';

// Load environment variables 
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  const origin = req.headers.origin || 'https://hypedigitaly.ai';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.error('❌ Proxy: Invalid method', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { model, max_tokens, temperature, userData, systemPrompt } = req.body;
    console.log('📤 Proxy -> Claude: Preparing request with payload:', {
      model,
      max_tokens,
      temperature,
      systemPrompt: systemPrompt.substring(0, 100) + '...', // Truncate for logging
      userDataLength: userData.length
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'x-api-key': ANTHROPIC_API_KEY,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature,
        stream: true,
        system: [{
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }],
        messages: [{
          role: "user",
          content: userData
        }]
      })
    });

    // Instead of piping, manually forward the stream
    const reader = response.body.getReader();
    
    // Read the stream
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Forward the chunks to the client
      res.write(value);
    }

    res.end();

  } catch (error) {
    console.error('❌ Proxy: Error in stream handling:', error);
    
    // Send error as SSE event instead of JSON response
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: { message: error.message }
    })}\n\n`);
    res.end();
  }
}
