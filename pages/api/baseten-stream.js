
import { whitelistedDomains } from '../../config/domains';

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // Set CORS headers before any checks so error responses also carry proper CORS context
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  }

  // Check if origin is in whitelist
  let hostname = '';
  try {
    hostname = origin ? new URL(origin).hostname.replace(/^www\./, '') : '';
  } catch (e) {
    hostname = '';
  }
  if (!origin || !whitelistedDomains.includes(hostname)) {
    return res.status(403).json({ error: 'Access denied - domain not whitelisted' });
  }

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
    const apiKey = process.env[`BASETEN_API_KEY_${projectName?.toUpperCase()}`] || process.env.BASETEN_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    if (debugMode === 1) {
      console.log('📡 Baseten Payload values:', {
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

    // Use Baseten's native API endpoint
    const response = await fetch('https://inference.baseten.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`, // Baseten uses Api-Key format
      },
      body: JSON.stringify({
        model: model || 'meta-llama/Llama-4-Maverick-17B-128E-Instruct',
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
        max_tokens: max_tokens || 1000,
        temperature: temperature || 1,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        stop: [],
        stream: true,
        stream_options: {
          include_usage: true,
          continuous_usage_stats: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Baseten API error: ${response.status} ${response.statusText}`);
    }

    if (debugMode === 1) {
      console.log('📥 Baseten API Response initialized');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            if (debugMode === 1) {
              console.log('📤 Sending [DONE] signal to complete stream');
            }
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (debugMode === 1) {
              console.log('📥 Response Chunk:', JSON.stringify(parsed, null, 2));
            }

            if (parsed.choices && parsed.choices[0]?.delta?.content) {
              const responseData = {
                type: 'content',
                content: parsed.choices[0].delta.content
              };

              res.write(`data: ${JSON.stringify(responseData)}\n\n`);
              res.flush?.();
            }
          } catch (parseError) {
            if (debugMode === 1) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    }

    // Explicitly send DONE signal to trigger Voiceflow variable update
    if (debugMode === 1) {
      console.log('📤 Sending [DONE] signal to complete stream');
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('Baseten Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
