import { Anthropic } from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  const allowedDomainNames = [
    'kr-vysocina.cz',
    'kr-ustecky.cz',
    'teplice.cz',
    'setrivodou.cz',
    'barber-mnb.cz',
    'healthytwenty.cz',
    'icuk.cz'
  ];
  
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originDomain = new URL(origin).hostname;
      const isAllowed = allowedDomainNames.some(domain => originDomain.endsWith(domain));
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } catch (e) {
      console.error('Invalid origin:', origin);
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validate API key from request header
  const apiKeyHeader = req.headers['x-api-key'];
  if (!apiKeyHeader || apiKeyHeader !== process.env.ENDPOINT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    console.error('❌ Proxy: Invalid method', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { model, max_tokens, temperature, userData, systemPrompt, projectName } = req.body;

    // Select API key based on projectName
    const apiKey = process.env[`ANTHROPIC_API_KEY_${projectName?.toUpperCase()}`] || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Received request:', {
        model,
        max_tokens,
        temperature,
        // Omit sensitive data from logs
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const response = await anthropic.messages.create({
      model: model || 'claude-3-sonnet-20241022',
      max_tokens: max_tokens || 4096,
      temperature: temperature || 0,
      messages: [{
        role: 'user',
        content: userData
      }],
      system: [{
        type: "text",
        text: systemPrompt,
        cache_control: {
          type: "ephemeral"
        }
      }],
      stream: true,
    });

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