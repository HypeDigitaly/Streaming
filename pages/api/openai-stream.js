import { OpenAI } from 'openai';

export default async function handler(req, res) {
  const whitelistedDomains = [
    'icuk.cz',
    'kr-ustecky.cz',
    'kr-vysocina.cz',
    'setrivodou.cz',
    'healthytwenty.cz',
    'barber-mnb.cz',
    'teplice.cz',
    'hypedigitaly.ai',
    'litomerice.cz'
  ];

  const origin = req.headers.origin;

  // Check if origin is in whitelist
  const hostname = new URL(origin).hostname.replace(/^www\./, '');
  if (!origin || !whitelistedDomains.includes(hostname)) {
    return res.status(403).json({ error: 'Access denied - domain not whitelisted' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, debug');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    if (req.headers.debug === '1' || req.body.debugMode === 1) {
      console.error('❌ Proxy: Invalid method', req.method);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id } = req.body;

    // Select API key based on projectName
    const apiKey = process.env[`OPENAI_API_KEY_${projectName?.toUpperCase()}`] || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    if (debugMode === 1) {
      console.log('📡 OpenAI Payload values:', {
        model,
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (debugMode === 1) {
        console.log('⏱️ OpenAI API request timed out after 10 seconds');
      }
    }, 10000); // 10 seconds timeout - increased from 5 seconds

    try {
      const response = await openai.chat.completions.create({
        model: model || 'gpt-4.1-2025-04-14',
        max_tokens: max_tokens || 4096,
        temperature: temperature || 0,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userData
          }
        ],
        stream: true,
      }, { signal: controller.signal });

    if (debugMode === 1) {
      console.log('📥 OpenAI API Response initialized');
    }

    for await (const chunk of response) {
      if (debugMode === 1) {
        console.log('📥 Response Chunk:', JSON.stringify(chunk, null, 2));
      }

      if (chunk.choices[0]?.delta?.content) {
        const data = {
          type: 'content',
          content: chunk.choices[0].delta.content
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
        res.flush?.();
      }
    }

    // Explicitly send DONE signal to trigger Voiceflow variable update
    if (debugMode === 1) {
      console.log('📤 Sending [DONE] signal to complete stream');
    }
    res.write('data: [DONE]\n\n');
    res.end();
    
    // Clear the timeout
    clearTimeout(timeoutId);

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      if (debugMode === 1) {
        console.warn('⏱️ OpenAI request timed out after 5 seconds');
      }
      res.write(`data: ${JSON.stringify({ error: 'Request timed out after 5 seconds' })}\n\n`);
    } else if (req.body.debugMode === 1) {
      console.error('Stream Error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
    res.end();
  }
}