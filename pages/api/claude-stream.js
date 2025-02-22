import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    
    console.log('Received request:', {
      model,
      max_tokens,
      temperature,
      systemPrompt: systemPrompt?.substring(0, 100) + '...'
    });

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const response = await anthropic.messages.create({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: max_tokens || 1024,
      temperature: temperature || 0.7,
      messages: [{
        role: 'user',
        content: userData
      }],
      system: systemPrompt,
      stream: true,
    });

    // Process the stream
    for await (const messageChunk of response) {
      if (messageChunk.type === 'message_start') {
        continue;
      }
      
      if (messageChunk.type === 'content_block_start') {
        continue;
      }

      if (messageChunk.type === 'content_block_delta') {
        const data = {
          type: 'content',
          content: messageChunk.delta?.text || ''
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        res.flush?.();
      }

      if (messageChunk.type === 'message_stop') {
        res.write('data: [DONE]\n\n');
        break;
      }
    }

    res.end();

  } catch (error) {
    console.error('Stream Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
