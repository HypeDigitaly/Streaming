
import { GoogleGenerativeAI } from '@google/generative-ai';
import { whitelistedDomains } from '../../config/domains';

export default async function handler(req, res) {
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
    const { 
      model, 
      max_tokens, 
      temperature, 
      userData, 
      systemPrompt, 
      projectName, 
      debugMode, 
      user_id,
      messages,
      apiKey 
    } = req.body;

    // Use provided apiKey or get from environment based on projectName
    const geminiApiKey = apiKey || 
      process.env[`GEMINI_API_KEY_${projectName?.toUpperCase()}`] || 
      process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      throw new Error(`Gemini API key not found for project: ${projectName}`);
    }

    // Prepare contents for Gemini API
    let contents;
    if (messages && Array.isArray(messages)) {
      // Convert messages to Gemini format
      contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
    } else if (userData) {
      contents = [{
        role: 'user',
        parts: [{ text: userData }]
      }];
    } else {
      throw new Error('No messages or userData provided');
    }

    // Prepare the request payload
    const requestPayload = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 4096,
        temperature: temperature !== undefined ? temperature : 0.7,
      },
      ...(systemPrompt && {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      })
    };

    if (debugMode === 1) {
      console.log('📡 Gemini Payload values:', {
        model: model || 'gemini-2.0-flash-exp',
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id,
        contentsLength: contents?.length
      });
      console.log('📤 Full Gemini Request Payload:', JSON.stringify(requestPayload, null, 2));
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    if (debugMode === 1) {
      console.log('🚀 Making Gemini API call to streamGenerateContent');
    }

    // Call Gemini API directly using fetch
    const modelName = model || 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    if (debugMode === 1) {
      console.log('📥 Gemini API Response Status:', response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (debugMode === 1) {
            console.log('📤 Gemini stream completed');
          }
          break;
        }

        const chunk = decoder.decode(value);
        let dataBuffer = buffer + chunk;
        buffer = '';

        // Split into lines and process each complete line
        const lines = dataBuffer.split('\n');
        // Keep the last (potentially incomplete) line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            // Remove 'data: ' prefix and parse
            const jsonStr = line.slice(5);
            const data = JSON.parse(jsonStr);

            if (debugMode === 1) {
              console.log('📥 Raw Gemini Response Chunk:', JSON.stringify(data, null, 2));
            }

            // Extract text content from Gemini response format
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              const candidate = data.candidates[0];
              const parts = candidate.content.parts || [];
              
              for (const part of parts) {
                if (part.text) {
                  const transformedData = {
                    type: 'content',
                    content: part.text
                  };

                  if (debugMode === 1) {
                    console.log('📥 Gemini Text Chunk:', {
                      content: part.text.substring(0, 100) + '...',
                      finishReason: candidate.finishReason
                    });
                  }

                  res.write(`data: ${JSON.stringify(transformedData)}\n\n`);
                  res.flush?.();
                }
              }

              // Check for finish reason
              if (candidate.finishReason) {
                if (debugMode === 1) {
                  console.log('✅ Gemini stream finished:', candidate.finishReason);
                }
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
            } else if (debugMode === 1) {
              console.log('📥 Gemini Non-content chunk:', JSON.stringify(data, null, 2));
            }
          } catch (parseError) {
            if (debugMode === 1) {
              console.warn('Failed to parse Gemini SSE data line:', parseError, 'Data:', line);
            }
          }
        }
      }

      // Process any remaining complete data in buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(5);
          const data = JSON.parse(jsonStr);
          
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const candidate = data.candidates[0];
            const parts = candidate.content.parts || [];
            
            for (const part of parts) {
              if (part.text) {
                const transformedData = {
                  type: 'content',
                  content: part.text
                };
                res.write(`data: ${JSON.stringify(transformedData)}\n\n`);
              }
            }
          }
        } catch (e) {
          if (debugMode === 1) {
            console.warn('Failed to parse final buffer:', e);
          }
        }
      }

    } finally {
      // Ensure stream is properly closed
      if (debugMode === 1) {
        console.log('📤 Sending final [DONE] signal to complete Gemini stream');
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }

  } catch (error) {
    const debugMode = req.body?.debugMode || 0;
    if (debugMode === 1) {
      console.error('📡 Gemini Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
