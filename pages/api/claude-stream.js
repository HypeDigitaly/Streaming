
import { Anthropic } from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  const whitelistedDomains = [
    'icuk.cz',
    'kr-ustecky.cz',
    'kr-vysocina.cz',
    'setrivodou.cz',
    'healthytwenty.cz',
    'barber-mnb.cz',
    'teplice.cz'
  ];

  const origin = req.headers.origin;
  
  // Check if origin is in whitelist
  const hostname = new URL(origin).hostname.replace(/^www\./, '');
  if (!origin || !whitelistedDomains.includes(hostname)) {
    return res.status(403).json({ error: 'Access denied - domain not whitelisted' });
  }
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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

    console.log('Received request:', {
      model,
      max_tokens,
      temperature,
      projectName,
      systemPrompt: systemPrompt?.substring(0, 100) + '...'
    });

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
