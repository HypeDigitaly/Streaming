
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
      // Perplexity-specific parameters
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
      web_search_options
    } = req.body;

    // Select API key based on projectName
    const apiKey = process.env[`PERPLEXITY_API_KEY_${projectName?.toUpperCase()}`] || process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    if (debugMode === 1) {
      console.log('📡 Perplexity API Request:', {
        model: model || 'sonar',
        max_tokens,
        temperature,
        search_mode,
        reasoning_effort,
        projectName,
        debugMode,
        systemPrompt: systemPrompt ? `${systemPrompt.substring(0, 100)}...` : 'None',
        user_id,
        return_images,
        return_related_questions,
        web_search_options
      });
    }

    // Build messages array
    const messages = [];
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    messages.push({
      role: 'user',
      content: userData
    });

    // Build request payload with all Perplexity parameters
    const payload = {
      model: model || 'sonar',
      messages: messages,
      stream: true
    };

    // Add optional parameters only if they're provided
    if (max_tokens) payload.max_tokens = max_tokens;
    if (temperature !== undefined) payload.temperature = temperature;
    if (search_mode) payload.search_mode = search_mode;
    if (reasoning_effort) payload.reasoning_effort = reasoning_effort;
    if (top_p !== undefined) payload.top_p = top_p;
    if (search_domain_filter) payload.search_domain_filter = search_domain_filter;
    if (return_images !== undefined) payload.return_images = return_images;
    if (return_related_questions !== undefined) payload.return_related_questions = return_related_questions;
    if (search_recency_filter) payload.search_recency_filter = search_recency_filter;
    if (search_after_date_filter) payload.search_after_date_filter = search_after_date_filter;
    if (search_before_date_filter) payload.search_before_date_filter = search_before_date_filter;
    if (last_updated_after_filter) payload.last_updated_after_filter = last_updated_after_filter;
    if (last_updated_before_filter) payload.last_updated_before_filter = last_updated_before_filter;
    if (top_k !== undefined) payload.top_k = top_k;
    if (presence_penalty !== undefined) payload.presence_penalty = presence_penalty;
    if (frequency_penalty !== undefined) payload.frequency_penalty = frequency_penalty;
    if (response_format) payload.response_format = response_format;
    if (web_search_options) payload.web_search_options = web_search_options;

    if (debugMode === 1) {
      console.log('📤 Perplexity Full Payload:', JSON.stringify(payload, null, 2));
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (debugMode === 1) {
      console.log('📥 Perplexity API Response initialized');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') continue;

        try {
          const data = JSON.parse(line.slice(6));
          
          if (debugMode === 1) {
            console.log('📥 Perplexity chunk:', data);
          }

          if (data.choices?.[0]?.delta?.content) {
            const content = data.choices[0].delta.content;
            
            // Send content with perplexity type for special processing
            res.write(`data: ${JSON.stringify({ 
              content: content,
              type: 'perplexity_content',
              citations: data.citations,
              search_results: data.search_results
            })}\n\n`);
          }
        } catch (error) {
          if (debugMode === 1) {
            console.error('Error parsing Perplexity chunk:', error);
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
      console.error('Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
