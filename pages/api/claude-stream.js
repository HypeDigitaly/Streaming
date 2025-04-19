
import { Anthropic } from '@anthropic-ai/sdk';

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
    const { 
      model, 
      max_tokens, 
      temperature, 
      userData, 
      systemPrompt, 
      projectName, 
      debugMode,
      user_id,
      modelSequence = "claude" // Default to Claude if no sequence provided
    } = req.body;

    // Define available models with their details
    const models = [
      // Claude models
      {
        id: 'claude-3-sonnet-20241022',
        type: 'claude',
        name: 'claude-3-sonnet-20241022',
        description: 'Claude 3 Sonnet - Anthropic\'s advanced reasoning model'
      },
      {
        id: 'claude-3-haiku-20241022',
        type: 'claude',
        name: 'claude-3-haiku-20241022',
        description: 'Claude 3 Haiku - Anthropic\'s fast model'
      },
      {
        id: 'claude',
        type: 'claude',
        name: model || 'claude-3-sonnet-20241022', // Uses the provided model or defaults
        description: 'Claude Default - Based on request parameter'
      },
      
      // OpenAI models
      {
        id: 'gpt-4o',
        type: 'openai',
        name: 'gpt-4o',
        description: 'GPT-4o - OpenAI\'s multimodal model'
      },
      {
        id: 'gpt-4-turbo',
        type: 'openai',
        name: 'gpt-4-turbo',
        description: 'GPT-4 Turbo - OpenAI\'s advanced reasoning model'
      },
      
      // Gemini models
      {
        id: 'gemini-1.5-pro',
        type: 'gemini',
        name: 'gemini-1.5-pro',
        description: 'Gemini 1.5 Pro - Google\'s advanced model'
      },
      {
        id: 'gemini-1.5-flash',
        type: 'gemini',
        name: 'gemini-1.5-flash',
        description: 'Gemini 1.5 Flash - Google\'s fast model'
      },
      
      // Groq models
      {
        id: 'llama-3-70b-8192',
        type: 'groq',
        name: 'llama-3-70b-8192',
        description: 'Llama 3 70B - Groq\'s fast implementation'
      },
      {
        id: 'mixtral-8x7b',
        type: 'groq',
        name: 'mixtral-8x7b-32768',
        description: 'Mixtral 8x7B - Fast model by Groq'
      }
    ];

    // Parse model sequence
    let modelSequenceArray = [];
    if (typeof modelSequence === 'string') {
      modelSequenceArray = modelSequence.split(',').map(id => id.trim());
    } else if (Array.isArray(modelSequence)) {
      modelSequenceArray = modelSequence;
    } else {
      modelSequenceArray = ['claude']; // Default to Claude if invalid
    }

    if (debugMode === 1) {
      console.log('🔄 Model sequence:', modelSequenceArray);
    }

    // Helper function to write SSE data
    const writeSSE = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.flush?.();
    };

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Try each model in sequence until one succeeds
    let success = false;
    let error = null;

    for (const modelId of modelSequenceArray) {
      if (success) break; // Stop if we've already had a successful response
      
      const modelConfig = models.find(m => m.id === modelId);
      
      if (!modelConfig) {
        if (debugMode === 1) {
          console.warn(`⚠️ Unknown model ID: ${modelId}, skipping`);
        }
        continue;
      }

      // Select API key based on model type and projectName
      let apiKey;
      switch (modelConfig.type) {
        case 'claude':
          apiKey = process.env[`ANTHROPIC_API_KEY_${projectName?.toUpperCase()}`] || process.env.ANTHROPIC_API_KEY;
          break;
        case 'openai':
          apiKey = process.env[`OPENAI_API_KEY_${projectName?.toUpperCase()}`] || process.env.OPENAI_API_KEY;
          break;
        case 'gemini':
          apiKey = process.env[`GEMINI_API_KEY_${projectName?.toUpperCase()}`] || process.env.GEMINI_API_KEY;
          break;
        case 'groq':
          apiKey = process.env[`GROQ_API_KEY_${projectName?.toUpperCase()}`] || process.env.GROQ_API_KEY;
          break;
      }

      if (!apiKey) {
        if (debugMode === 1) {
          console.warn(`⚠️ No API key found for ${modelConfig.type} (${modelId}), skipping`);
        }
        continue;
      }

      if (debugMode === 1) {
        console.log(`🚀 Attempting to use ${modelConfig.type} model: ${modelConfig.name}`);
      }

      try {
        // Handle Claude API
        if (modelConfig.type === 'claude') {
          const anthropic = new Anthropic({
            apiKey: apiKey,
          });

          if (debugMode === 1) {
            console.log('📡 Claude Request:', {
              model: modelConfig.name,
              max_tokens: max_tokens || 4096,
              temperature: temperature || 0,
              system: systemPrompt,
              messages: [{
                role: 'user',
                content: userData
              }]
            });
          }

          const response = await anthropic.messages.create({
            model: modelConfig.name,
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
              if (debugMode === 1) {
                console.log('📥 Claude stream started');
              }
              continue;
            }

            if (messageChunk.type === 'content_block_start') {
              continue;
            }

            if (messageChunk.type === 'content_block_delta') {
              const data = {
                type: 'content',
                content: messageChunk.delta?.text || '',
                provider: 'claude',
                model: modelConfig.name
              };

              if (debugMode === 1) {
                console.log('📥 Claude chunk:', data.content);
              }

              writeSSE(data);
              success = true; // Mark that we're getting successful responses
            }

            if (messageChunk.type === 'message_stop') {
              writeSSE({ type: 'info', message: 'Model used: ' + modelConfig.name });
              writeSSE({ type: 'done', provider: 'claude', model: modelConfig.name });
              break;
            }
          }
          
          if (success) break; // Successfully streamed, so break the loop
        }
        
        // Handle OpenAI API
        else if (modelConfig.type === 'openai') {
          if (debugMode === 1) {
            console.log('📡 OpenAI Request:', {
              model: modelConfig.name,
              max_tokens: max_tokens || 4096,
              temperature: temperature || 0
            });
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelConfig.name,
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
              max_tokens: max_tokens || 4096,
              temperature: temperature || 0,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                writeSSE({ type: 'info', message: 'Model used: ' + modelConfig.name });
                writeSSE({ type: 'done', provider: 'openai', model: modelConfig.name });
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  writeSSE({
                    type: 'content',
                    content: content,
                    provider: 'openai',
                    model: modelConfig.name
                  });
                  success = true;
                }
              } catch (e) {
                if (debugMode === 1) {
                  console.warn('⚠️ Failed to parse OpenAI chunk:', e);
                }
              }
            }
          }
          
          if (success) break;
        }
        
        // Handle Gemini API
        else if (modelConfig.type === 'gemini') {
          if (debugMode === 1) {
            console.log('📡 Gemini Request:', {
              model: modelConfig.name,
              maxOutputTokens: max_tokens || 4096,
              temperature: temperature || 0
            });
          }

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.name}:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemPrompt}\n\n${userData}`
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: temperature || 0,
                maxOutputTokens: max_tokens || 4096,
                topP: 0.95,
                topK: 64
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('[')) continue;
              
              try {
                const parsed = JSON.parse(line);
                if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                  const content = parsed.candidates[0].content.parts[0].text;
                  writeSSE({
                    type: 'content',
                    content: content,
                    provider: 'gemini',
                    model: modelConfig.name
                  });
                  success = true;
                }
              } catch (e) {
                if (debugMode === 1) {
                  console.warn('⚠️ Failed to parse Gemini chunk:', e);
                }
              }
            }
          }
          
          writeSSE({ type: 'info', message: 'Model used: ' + modelConfig.name });
          writeSSE({ type: 'done', provider: 'gemini', model: modelConfig.name });
          
          if (success) break;
        }
        
        // Handle Groq API
        else if (modelConfig.type === 'groq') {
          if (debugMode === 1) {
            console.log('📡 Groq Request:', {
              model: modelConfig.name,
              max_tokens: max_tokens || 4096,
              temperature: temperature || 0
            });
          }

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelConfig.name,
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
              max_tokens: max_tokens || 4096,
              temperature: temperature || 0,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                writeSSE({ type: 'info', message: 'Model used: ' + modelConfig.name });
                writeSSE({ type: 'done', provider: 'groq', model: modelConfig.name });
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  writeSSE({
                    type: 'content',
                    content: content,
                    provider: 'groq',
                    model: modelConfig.name
                  });
                  success = true;
                }
              } catch (e) {
                if (debugMode === 1) {
                  console.warn('⚠️ Failed to parse Groq chunk:', e);
                }
              }
            }
          }
          
          if (success) break;
        }
      } catch (error) {
        if (debugMode === 1) {
          console.error(`❌ Error with ${modelConfig.type} (${modelConfig.name}):`, error);
        }
      }
    }

    // If no model succeeded, send error
    if (!success) {
      if (debugMode === 1) {
        console.error('❌ All models failed');
      }
      writeSSE({ error: error?.message || 'All models failed to generate a response' });
    }

    writeSSE({ type: 'done' });
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
