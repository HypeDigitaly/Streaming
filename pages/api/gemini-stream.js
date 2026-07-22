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
    if (req.headers.debug === '1' || req.body?.debugMode === 1) {
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
    const apiKey = process.env[`GEMINI_API_KEY_${projectName?.toUpperCase()}`] || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    const modelName = model || 'gemini-2.5-pro';

    if (debugMode === 1) {
      console.log('📡 Gemini Payload values:', {
        model: modelName,
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

    // Prepare the request payload for streamGenerateContent API
    const requestPayload = {
      contents: [
        {
          parts: [
            {
              text: userData
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: max_tokens || 4096,
        temperature: temperature || 0,
      }
    };

    // Add system instruction if provided
    if (systemPrompt) {
      requestPayload.systemInstruction = {
        parts: [
          {
            text: systemPrompt
          }
        ]
      };
    }

    if (debugMode === 1) {
      console.log('📡 Gemini API Request payload:', JSON.stringify(requestPayload, null, 2));
    }

    // Call streamGenerateContent API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    if (debugMode === 1) {
      console.log('📥 Gemini API Response initialized');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          // Process SSE format: "data: {...}"
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // Remove "data: " prefix
            
            if (jsonStr.trim() === '') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              
              if (debugMode === 1) {
                console.log('📥 Gemini Response Chunk:', JSON.stringify(data, null, 2));
              }

              // Extract text from the response according to GenerateContentResponse structure
              if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const content = data.candidates[0].content;
                
                if (content.parts && content.parts[0] && content.parts[0].text) {
                  const text = content.parts[0].text;
                  
                  if (text) {
                    const outputData = {
                      type: 'content',
                      content: text
                    };

                    res.write(`data: ${JSON.stringify(outputData)}\n\n`);
                    res.flush?.();
                  }
                }
              }
              
              // Check for finish reason
              if (data.candidates && data.candidates[0] && data.candidates[0].finishReason) {
                if (debugMode === 1) {
                  console.log('📤 Gemini stream finished with reason:', data.candidates[0].finishReason);
                }
                break;
              }
              
            } catch (parseError) {
              if (debugMode === 1) {
                console.warn('⚠️ Failed to parse JSON chunk:', parseError.message, 'Raw data:', jsonStr);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Explicitly send DONE signal to trigger Voiceflow variable update
    if (debugMode === 1) {
      console.log('📤 Sending [DONE] signal to complete stream');
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body?.debugMode === 1) {
      console.error('❌ Gemini Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
