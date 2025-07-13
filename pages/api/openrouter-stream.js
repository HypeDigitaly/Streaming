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
      console.error('❌ OpenRouter Proxy: Invalid method', req.method);
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
      messages,
      systemPrompt, 
      projectName, 
      debugMode, 
      user_id,
      apiKey,
      // OpenRouter-specific parameters
      models, // Fallback models array
      provider, // Provider routing preferences
      plugins, // Web search and other plugins
      enableWebSearch,
      // Standard OpenAI-compatible parameters
      top_p,
      top_k,
      presence_penalty,
      frequency_penalty,
      response_format,
      tools,
      tool_choice,
      seed,
      stop,
      // OpenRouter headers
      site_url,
      site_name
    } = req.body;

    // Validate required parameters
    if (!model && !models) {
      throw new Error('Either model or models array must be provided');
    }

    // Select API key based on projectName or use provided apiKey
    const openrouterApiKey = apiKey || 
      process.env[`OPENROUTER_API_KEY_${projectName?.toUpperCase()}`] || 
      process.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      throw new Error(`OpenRouter API key not found for project: ${projectName}`);
    }

    if (debugMode === 1) {
      console.log('📡 OpenRouter Payload values:', {
        model,
        models,
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id,
        provider,
        plugins,
        enableWebSearch,
        site_url,
        site_name
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Prepare messages array
    let messagesArray = [];

    // Add system message if provided
    if (systemPrompt) {
      messagesArray.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Handle messages format - either from messages parameter or userData
    if (messages && Array.isArray(messages)) {
      messagesArray = messagesArray.concat(messages);
    } else if (userData) {
      messagesArray.push({
        role: 'user',
        content: userData
      });
    }

    // Prepare request payload
    const payload = {
      model: model || models?.[0], // Use primary model or first from models array
      messages: messagesArray,
      max_tokens: max_tokens || 4096,
      temperature: temperature !== undefined ? temperature : 0.7,
      stream: true
    };

    // Add optional parameters if provided
    if (top_p !== undefined) payload.top_p = top_p;
    if (top_k !== undefined) payload.top_k = top_k;
    if (presence_penalty !== undefined) payload.presence_penalty = presence_penalty;
    if (frequency_penalty !== undefined) payload.frequency_penalty = frequency_penalty;
    if (response_format) payload.response_format = response_format;
    if (tools) payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;
    if (seed !== undefined) payload.seed = seed;
    if (stop) payload.stop = stop;

    // Add OpenRouter-specific parameters
    if (models && models.length > 1) {
      payload.models = models; // Fallback models for routing
    }
    if (provider) payload.provider = provider;

    // Handle web search - either via plugins or enableWebSearch flag
    if (plugins && Array.isArray(plugins)) {
      payload.plugins = plugins;
    } else if (enableWebSearch) {
      // Add web search plugin if enableWebSearch is true
      payload.plugins = [{ id: 'web' }];
    }

    // Handle model shortcuts (e.g., ":online" for web search)
    if (typeof payload.model === 'string' && payload.model.includes(':online')) {
      payload.model = payload.model.replace(':online', '');
      if (!payload.plugins) {
        payload.plugins = [{ id: 'web' }];
      }
    }

    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json'
    };

    // Add OpenRouter-specific headers if provided
    if (site_url) headers['HTTP-Referer'] = site_url;
    if (site_name) headers['X-Title'] = site_name;

    if (debugMode === 1) {
      console.log('🚀 OpenRouter Request Payload:', JSON.stringify(payload, null, 2));
      console.log('🔑 OpenRouter Headers:', { 
        ...headers, 
        'Authorization': `Bearer ${openrouterApiKey.substring(0, 10)}...` 
      });
    }

    // Make request to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = `HTTP error! status: ${response.status}`;
      try {
        const errorBody = await response.text();
        errorText += `, body: ${errorBody}`;
      } catch (e) {
        // ignore
      }
      throw new Error(errorText);
    }

    if (debugMode === 1) {
      console.log('📥 OpenRouter API Response initialized');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (debugMode === 1) {
            console.log('📥 OpenRouter stream completed');
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            if (debugMode === 1) {
              console.log('📥 [DONE] received from OpenRouter');
            }
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }

          // Handle SSE comments (keep-alive messages)
          if (line.startsWith(': ')) {
            if (debugMode === 1) {
              console.log('📥 OpenRouter keep-alive comment:', line);
            }
            continue;
          }

          try {
            if (data.startsWith('{') && data.endsWith('}')) {
              const parsed = JSON.parse(data);

              if (debugMode === 1) {
                console.log('📥 OpenRouter chunk:', parsed);
              }

              if (parsed.error) {
                throw new Error(`OpenRouter API error: ${parsed.error.message || parsed.error}`);
              }

              // Handle different response formats
              if (parsed.choices && parsed.choices[0]) {
                const choice = parsed.choices[0];

                // Handle content delta
                if (choice.delta && choice.delta.content) {
                  const responseData = {
                    content: choice.delta.content
                  };

                  if (debugMode === 1) {
                    console.log('📤 Sending content to frontend:', {
                      content_length: choice.delta.content.length,
                      content_preview: choice.delta.content.substring(0, 50) + 
                        (choice.delta.content.length > 50 ? '...' : '')
                    });
                  }

                  res.write(`data: ${JSON.stringify(responseData)}\n\n`);
                  res.flush?.();
                }

                // Handle tool calls if present
                if (choice.delta && choice.delta.tool_calls) {
                  const toolCallData = {
                    type: 'tool_calls',
                    content: JSON.stringify(choice.delta.tool_calls)
                  };

                  if (debugMode === 1) {
                    console.log('🔧 Tool calls detected:', choice.delta.tool_calls);
                  }

                  res.write(`data: ${JSON.stringify(toolCallData)}\n\n`);
                  res.flush?.();
                }

                // Handle web search citations if present (from annotations)
                if (parsed.message && parsed.message.annotations) {
                  const citationsData = {
                    type: 'annotations',
                    content: JSON.stringify({
                      annotations: parsed.message.annotations
                    })
                  };

                  if (debugMode === 1) {
                    console.log('📎 Citations found:', parsed.message.annotations.length);
                  }

                  res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
                  res.flush?.();
                }

                // Handle finish reason
                if (choice.finish_reason) {
                  if (debugMode === 1) {
                    console.log('✅ OpenRouter completion finished:', choice.finish_reason);
                  }
                  res.write('data: [DONE]\n\n');
                  res.end();
                  return;
                }
              }
            }
          } catch (parseError) {
            if (debugMode === 1) {
              console.warn('Failed to parse OpenRouter SSE data:', parseError, 'Data:', data);
            }
            // Continue processing other lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Send final [DONE] if not already sent
    if (debugMode === 1) {
      console.log('📤 Sending final [DONE] signal');
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('❌ OpenRouter Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
} 