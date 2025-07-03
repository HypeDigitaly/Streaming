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
    const debugMode = req.body?.debugMode || 0;
    if (req.headers.debug === '1' || debugMode === 1) {
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
      apiKey,
      messages,
      // Web search options
      search_mode,
      search_context_size,
      user_location,
      search_domain_filter,
      return_images,
      return_related_questions,
      search_recency_filter,
      search_after_date_filter,
      search_before_date_filter,
      last_updated_after_filter,
      last_updated_before_filter,
      // Reasoning and model parameters
      reasoning_effort,
      top_p,
      top_k,
      presence_penalty,
      frequency_penalty,
      response_format,
      web_search_options
    } = req.body;

    // Use provided apiKey or get from environment based on projectName
    const perplexityApiKey = apiKey || 
      process.env[`PERPLEXITY_API_KEY_${projectName?.toUpperCase()}`] || 
      process.env.PERPLEXITY_API_KEY;

    if (!perplexityApiKey) {
      throw new Error(`Perplexity API key not found for project: ${projectName}`);
    }

    // Prepare messages for Perplexity API
    let perplexityMessages;
    if (messages && Array.isArray(messages)) {
      perplexityMessages = messages;
    } else if (userData) {
      perplexityMessages = [
        {
          role: 'user',
          content: userData
        }
      ];
      
      // Add system prompt if provided
      if (systemPrompt) {
        perplexityMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
      }
    } else {
      throw new Error('No messages or userData provided');
    }

    // Validate parameters
    if (temperature !== undefined && (temperature < 0 || temperature >= 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
    
    if (top_p !== undefined && (top_p < 0 || top_p > 1)) {
      throw new Error('top_p must be between 0 and 1');
    }
    
    if (top_k !== undefined && top_k < 0) {
      throw new Error('top_k must be 0 or positive');
    }
    
    if (presence_penalty !== undefined && (presence_penalty < 0 || presence_penalty > 2)) {
      throw new Error('presence_penalty must be between 0 and 2');
    }
    
    if (frequency_penalty !== undefined && (frequency_penalty < 0 || frequency_penalty > 2)) {
      throw new Error('frequency_penalty must be between 0 and 2');
    }
    
    if (search_mode && !['web', 'academic'].includes(search_mode)) {
      throw new Error('search_mode must be "web" or "academic"');
    }
    
    if (reasoning_effort && !['low', 'medium', 'high'].includes(reasoning_effort)) {
      throw new Error('reasoning_effort must be "low", "medium", or "high"');
    }
    
    if (search_context_size && !['low', 'medium', 'high'].includes(search_context_size)) {
      throw new Error('search_context_size must be "low", "medium", or "high"');
    }
    
    if (search_domain_filter && (!Array.isArray(search_domain_filter) || search_domain_filter.length > 10)) {
      throw new Error('search_domain_filter must be an array with maximum 10 domains');
    }
    
    if (user_location && (!user_location.latitude || !user_location.longitude)) {
      throw new Error('user_location must have latitude and longitude properties');
    }
    
    // Validate date filters format (%m/%d/%Y)
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (search_after_date_filter && !dateRegex.test(search_after_date_filter)) {
      throw new Error('search_after_date_filter must be in format %m/%d/%Y (e.g., 3/1/2025)');
    }
    if (search_before_date_filter && !dateRegex.test(search_before_date_filter)) {
      throw new Error('search_before_date_filter must be in format %m/%d/%Y (e.g., 3/1/2025)');
    }
    if (last_updated_after_filter && !dateRegex.test(last_updated_after_filter)) {
      throw new Error('last_updated_after_filter must be in format %m/%d/%Y (e.g., 3/1/2025)');
    }
    if (last_updated_before_filter && !dateRegex.test(last_updated_before_filter)) {
      throw new Error('last_updated_before_filter must be in format %m/%d/%Y (e.g., 3/1/2025)');
    }

    const requestPayload = {
      model: model || 'sonar-reasoning',
      messages: perplexityMessages,
      stream: true,
      max_tokens: max_tokens || 4096,
      temperature: temperature !== undefined ? temperature : 0.2,
      
      // Web search parameters
      search_mode: search_mode || 'web',
      return_images: return_images !== undefined ? return_images : false,
      return_related_questions: return_related_questions !== undefined ? return_related_questions : false,
      
      // Optional parameters - only include if provided
      ...(top_p !== undefined && { top_p }),
      ...(top_k !== undefined && { top_k }),
      ...(presence_penalty !== undefined && { presence_penalty }),
      ...(frequency_penalty !== undefined && { frequency_penalty }),
      ...(reasoning_effort && { reasoning_effort }),
      ...(search_domain_filter && { search_domain_filter }),
      ...(search_recency_filter && { search_recency_filter }),
      ...(search_after_date_filter && { search_after_date_filter }),
      ...(search_before_date_filter && { search_before_date_filter }),
      ...(last_updated_after_filter && { last_updated_after_filter }),
      ...(last_updated_before_filter && { last_updated_before_filter }),
      ...(response_format && { response_format }),
      
      // Web search options object
      ...(web_search_options && { web_search_options }),
      
      // If no web_search_options provided but search_context_size or user_location are provided individually
      ...(!web_search_options && (search_context_size || user_location) && {
        web_search_options: {
          ...(search_context_size && { search_context_size }),
          ...(user_location && { user_location })
        }
      })
    };

    if (debugMode === 1) {
      console.log('🔮 Perplexity Payload values:', {
        model,
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id,
        messagesLength: perplexityMessages?.length,
        // Web search options
        search_mode,
        search_context_size,
        user_location,
        search_domain_filter,
        return_images,
        return_related_questions,
        search_recency_filter,
        search_after_date_filter,
        search_before_date_filter,
        last_updated_after_filter,
        last_updated_before_filter,
        // Reasoning and model parameters
        reasoning_effort,
        top_p,
        top_k,
        presence_penalty,
        frequency_penalty,
        response_format,
        web_search_options
      });

      console.log('📤 Full Perplexity Request Payload:', JSON.stringify(requestPayload, null, 2));
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    if (debugMode === 1) {
      console.log('🚀 Making Perplexity API call to: https://api.perplexity.ai/chat/completions');
    }

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    if (debugMode === 1) {
      console.log('📥 Perplexity API Response Status:', response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (debugMode === 1) {
            console.log('📤 Perplexity stream completed');
          }
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
            if (debugMode === 1) {
              console.log('📤 Received [DONE] from Perplexity, forwarding to client');
            }
            res.write('data: [DONE]\n\n');
            continue;
          }

          try {
            // Remove 'data: ' prefix and parse
            const jsonStr = line.slice(5);
            const data = JSON.parse(jsonStr);

            // Transform Perplexity response format to our standard format
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const transformedData = {
                type: 'content',
                content: data.choices[0].delta.content || '',
                choices: data.choices,
                citations: data.citations || null
              };

              if (debugMode === 1 && data.choices[0].delta.content) {
                console.log('📥 Perplexity Response Chunk:', {
                  content: data.choices[0].delta.content.substring(0, 100) + '...',
                  hasCitations: !!data.citations,
                  citationsCount: data.citations?.length || 0
                });
              }

              res.write(`data: ${JSON.stringify(transformedData)}\n\n`);
              res.flush?.();
            } else if (debugMode === 1) {
              console.log('📥 Perplexity Non-content chunk:', JSON.stringify(data, null, 2));
            }
          } catch (parseError) {
            if (debugMode === 1) {
              console.warn('Failed to parse Perplexity SSE data line:', parseError, 'Data:', line);
            }
          }
        }
      }

      // Process any remaining complete data in buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(5);
          const data = JSON.parse(jsonStr);
          
          if (data.choices && data.choices[0] && data.choices[0].delta) {
            const transformedData = {
              type: 'content',
              content: data.choices[0].delta.content || '',
              choices: data.choices,
              citations: data.citations || null
            };
            res.write(`data: ${JSON.stringify(transformedData)}\n\n`);
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
        console.log('📤 Sending final [DONE] signal to complete Perplexity stream');
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }

  } catch (error) {
    const debugMode = req.body?.debugMode || 0;
    if (debugMode === 1) {
      console.error('🔮 Perplexity Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
} 