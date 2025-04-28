
// Perplexity API stream handler

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

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
    const apiKey = process.env[`PERPLEXITY_API_KEY_${projectName?.toUpperCase()}`] || process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    if (debugMode === 1) {
      console.log('📡 Perplexity Payload values:', {
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

    // Create the request payload
    const payload = {
      temperature: temperature || 0,
      top_p: temperature || 0,
      return_images: true,
      return_related_questions: true,
      top_k: 0,
      stream: true,
      presence_penalty: 0,
      frequency_penalty: 1,
      web_search_options: {
        search_context_size: "high"
      },
      model: model || "sonar-reasoning-pro",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userData
        }
      ],
      max_tokens: max_tokens || 4096
    };

    if (debugMode === 1) {
      console.log('🚀 Making Perplexity API call with payload:', JSON.stringify(payload, null, 2));
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorData}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      const chunk = decoder.decode(value);
      let jsonBuffer = buffer + chunk;
      buffer = '';

      // Split into lines and process each complete line
      const lines = jsonBuffer.split('\n');
      // Keep the last (potentially incomplete) line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') {
          // Send [DONE] signal to client
          res.write('data: [DONE]\n\n');
          continue;
        }

        try {
          // Remove 'data: ' prefix and parse
          const jsonStr = line.slice(5);
          const data = JSON.parse(jsonStr);
          
          if (debugMode === 1) {
            console.log('📥 Perplexity Response Chunk:', JSON.stringify(data, null, 2));
          }

          // Process response content - handle both thinking (Perplexity-specific) and regular response
          if (data.choices && data.choices[0]) {
            const { delta } = data.choices[0];
            
            if (delta.content !== undefined && delta.content !== null) {
              const responseData = {
                type: 'content',
                content: delta.content
              };
              
              res.write(`data: ${JSON.stringify(responseData)}\n\n`);
              res.flush?.();
            }
          }

          // Handle citations if they exist in the response
          if (data.citations) {
            const citationsData = {
              type: 'citations',
              citations: data.citations
            };
            
            res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
            res.flush?.();
          }
        } catch (e) {
          if (debugMode === 1) {
            console.error('Failed to parse Perplexity chunk:', e, 'Line:', line);
          }
          // Skip incomplete chunks silently
        }
      }
    }

    // Explicitly send DONE signal to ensure it's always sent
    if (debugMode === 1) {
      console.log('📤 Sending final [DONE] signal to complete stream');
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
