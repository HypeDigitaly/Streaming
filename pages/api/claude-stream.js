
import { Anthropic } from '@anthropic-ai/sdk';

// Load environment variables 
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  // Set CORS headers with specific origin
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    console.log('🌐 Proxy: Initiating Claude API stream');
    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      temperature: temperature,
      stream: true,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: {
            type: "ephemeral"
          }
        }
      ],
      messages: [
        {
          role: "user",
          content: userData
        }
      ]
    });

    console.log('✅ Proxy: Claude stream connected, forwarding to extension');

    // Forward the stream to the client
    for await (const chunk of stream) {
      console.log('📤 Claude -> Proxy -> Extension: Forwarding chunk', {
        type: chunk.type,
        contentLength: JSON.stringify(chunk).length
      });
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    console.log('🏁 Proxy: Stream completed');
    res.end();
  } catch (error) {
    console.error('❌ Proxy: Error in stream handling:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
  }
}
