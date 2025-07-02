
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
      search_mode,
      reasoning_effort,
      top_p,
      search_domain_filter,
      return_images,
      return_related_questions,
      search_recency_filter,
      search_after_date_filter,
      search_before_date_filter,
      last_updated_after_filter,
      last_updated_before_filter,
      top_k,
      presence_penalty,
      frequency_penalty,
      response_format,
      web_search_context_size,
      user_location_latitude,
      user_location_longitude,
      user_location_country
    } = req.body;

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
        user_id,
        search_mode,
        reasoning_effort,
        top_p,
        search_domain_filter,
        return_images,
        return_related_questions,
        search_recency_filter,
        search_after_date_filter,
        search_before_date_filter,
        last_updated_after_filter,
        last_updated_before_filter,
        top_k,
        presence_penalty,
        frequency_penalty,
        response_format,
        web_search_context_size,
        user_location_latitude,
        user_location_longitude,
        user_location_country
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Build the request payload
    const requestPayload = {
      model: model || 'sonar',
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
    };

    // Add optional parameters if provided
    if (max_tokens) requestPayload.max_tokens = max_tokens;
    if (temperature !== undefined) requestPayload.temperature = temperature;
    if (search_mode) requestPayload.search_mode = search_mode;
    if (reasoning_effort) requestPayload.reasoning_effort = reasoning_effort;
    if (top_p !== undefined) requestPayload.top_p = top_p;
    if (search_domain_filter) requestPayload.search_domain_filter = search_domain_filter;
    if (return_images !== undefined) requestPayload.return_images = return_images;
    if (return_related_questions !== undefined) requestPayload.return_related_questions = return_related_questions;
    if (search_recency_filter) requestPayload.search_recency_filter = search_recency_filter;
    if (search_after_date_filter) requestPayload.search_after_date_filter = search_after_date_filter;
    if (search_before_date_filter) requestPayload.search_before_date_filter = search_before_date_filter;
    if (last_updated_after_filter) requestPayload.last_updated_after_filter = last_updated_after_filter;
    if (last_updated_before_filter) requestPayload.last_updated_before_filter = last_updated_before_filter;
    if (top_k !== undefined) requestPayload.top_k = top_k;
    if (presence_penalty !== undefined) requestPayload.presence_penalty = presence_penalty;
    if (frequency_penalty !== undefined) requestPayload.frequency_penalty = frequency_penalty;
    if (response_format) requestPayload.response_format = response_format;
    
    // Build web_search_options object properly
    if (web_search_context_size || user_location_latitude || user_location_longitude || user_location_country) {
      requestPayload.web_search_options = {};
      
      if (web_search_context_size) {
        requestPayload.web_search_options.search_context_size = web_search_context_size;
      }
      
      if (user_location_latitude !== undefined || user_location_longitude !== undefined || user_location_country) {
        requestPayload.web_search_options.user_location = {};
        
        if (user_location_latitude !== undefined) {
          requestPayload.web_search_options.user_location.latitude = user_location_latitude;
        }
        if (user_location_longitude !== undefined) {
          requestPayload.web_search_options.user_location.longitude = user_location_longitude;
        }
        if (user_location_country) {
          requestPayload.web_search_options.user_location.country = user_location_country;
        }
      }
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    if (debugMode === 1) {
      console.log('📥 Perplexity API Response initialized');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      let jsonBuffer = buffer + chunk;
      buffer = '';

      // Split into lines and process each complete line
      const lines = jsonBuffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') {
          if (debugMode === 1) {
            console.log('📤 Sending [DONE] signal to complete stream');
          }
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        try {
          const jsonStr = line.slice(5);
          const data = JSON.parse(jsonStr);
          
          if (debugMode === 1) {
            console.log('📥 Perplexity Chunk:', JSON.stringify(data, null, 2));
          }

          if (data.choices && data.choices[0] && data.choices[0].delta) {
            const { content } = data.choices[0].delta;

            if (content !== null && content !== undefined) {
              const responseData = {
                type: 'content',
                content: content,
                citations: data.citations || null,
                search_results: data.search_results || null
              };

              if (debugMode === 1) {
                console.log('📤 SENDING TO FRONTEND:', {
                  type: 'content',
                  content_length: content.length,
                  content_preview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                  has_citations: !!(data.citations && data.citations.length),
                  has_search_results: !!(data.search_results && data.search_results.length)
                });
              }

              res.write(`data: ${JSON.stringify(responseData)}\n\n`);
              res.flush?.();
            }
          }
        } catch (e) {
          if (debugMode === 1) {
            console.warn('Failed to parse SSE data line:', e, 'Data:', line);
          }
        }
      }
    }

    // Process any remaining complete data in buffer
    if (buffer.trim() && buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(5));
        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
          const responseData = {
            type: 'content',
            content: data.choices[0].delta.content,
            citations: data.citations || null,
            search_results: data.search_results || null
          };
          res.write(`data: ${JSON.stringify(responseData)}\n\n`);
        }
      } catch (e) {
        // Ignore parsing errors for final incomplete chunk
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('Perplexity Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
