// This is the Mistral AI streaming chat completion endpoint
// It follows the same pattern as other providers in this codebase

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
      console.error('❌ Mistral: Invalid method', req.method);
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
      // Mistral-specific parameters
      top_p,
      presence_penalty,
      frequency_penalty,
      random_seed,
      safe_prompt,
      prompt_mode
    } = req.body;

    // Select API key based on projectName
    const apiKey = process.env[`MISTRAL_API_KEY_${projectName?.toUpperCase()}`] || process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error(`Mistral API key not found for project: ${projectName}`);
    }

    if (debugMode === 1) {
      console.log('📡 Mistral Payload values:', {
        model,
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id,
        top_p,
        presence_penalty,
        frequency_penalty,
        random_seed,
        safe_prompt,
        prompt_mode
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

    // Prepare request payload for Mistral API
    const payload = {
      model: model || 'mistral-small-latest',
      messages: messagesArray,
      max_tokens: max_tokens || 4096,
      temperature: temperature || 0.7,
      stream: true
    };

    // Add optional parameters if provided
    if (top_p !== undefined) payload.top_p = top_p;
    if (presence_penalty !== undefined) payload.presence_penalty = presence_penalty;
    if (frequency_penalty !== undefined) payload.frequency_penalty = frequency_penalty;
    if (random_seed !== undefined) payload.random_seed = random_seed;
    if (safe_prompt !== undefined) payload.safe_prompt = safe_prompt;
    if (prompt_mode !== undefined) payload.prompt_mode = prompt_mode;

    if (debugMode === 1) {
      console.log('📤 Mistral API Request payload:', JSON.stringify(payload, null, 2));
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (debugMode === 1) {
      console.log('📥 Mistral API Response initialized');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

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
              const content = parsed.choices[0].delta.content;
              const responseData = {
                type: 'content',
                content: content
              };

              res.write(`data: ${JSON.stringify(responseData)}\n\n`);
              res.flush?.();
            }
          } catch (parseError) {
            if (debugMode === 1) {
              console.error('Error parsing Mistral chunk:', parseError);
            }
            // Continue processing other chunks
          }
        }
      }
    }

    // Send final DONE signal if not already sent
    if (debugMode === 1) {
      console.log('📤 Sending final [DONE] signal to complete Mistral stream');
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('Mistral Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}