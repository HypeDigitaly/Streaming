import fetch from 'node-fetch';
import { whitelistedDomains, isDomainWhitelisted } from '../../config/domains';

export default async function handler(req, res) {
  console.log('🚀 perplexity-stream: Handler invoked. Method:', req.method, 'Origin:', req.headers.origin);

  const origin = req.headers.origin;

  // Check if origin is in whitelist
  if (!isDomainWhitelisted(origin)) {
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
  
  console.log('🚀 perplexity-stream: Passed initial checks (CORS, Method).');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    model,
    userData,
    systemPrompt,
    max_tokens,
    temperature,
    debugMode,
    allowedDomains,
    projectName,
    user_id,
  } = req.body;

  // Parse allowed domains from comma-separated string to array of strings
  let search_domain_filter = [];
  if (allowedDomains) {
    search_domain_filter = allowedDomains.split(',')
      .map(domain => domain.trim())
      .filter(Boolean);
  }

  if (debugMode === 1) {
    console.log('📦 perplexity-stream: Request body:', {
      model,
      max_tokens,
      temperature,
      projectName,
      userData: userData?.substring(0, 100) + (userData?.length > 100 ? '...' : ''),
      systemPrompt: systemPrompt?.substring(0, 100) + (systemPrompt?.length > 100 ? '...' : ''),
      allowedDomains,
      search_domain_filter
    });
  }

  // Build request body for Perplexity API
  const requestBody = {
    model: model || "sonar-reasoning-pro",
    temperature: parseFloat(temperature) || 0.25,
    top_p: parseFloat(temperature) || 0.25,
    return_images: true,
    return_related_questions: true,
    top_k: 0,
    stream: true,
    presence_penalty: 0,
    frequency_penalty: 1,
    web_search_options: {
      search_context_size: "high"
    },
    messages: [
      {
        role: "system",
        content: systemPrompt || "You are a helpful assistant."
      },
      {
        role: "user",
        content: userData || "Hello"
      }
    ],
    max_tokens: parseInt(max_tokens) || 1000
  };

  // Add search_domain_filter only if there are domains specified
  if (search_domain_filter.length > 0) {
    requestBody.search_domain_filter = search_domain_filter;
  }

  // Console.log the full request body for debugging
  if (debugMode === 1) {
    console.log('📤 Perplexity: Full Request Payload:', JSON.stringify({
      ...requestBody,
      // Only log a few characters of userData to avoid polluting logs
      messages: requestBody.messages.map(m => ({
        ...m,
        content: m.content && m.content.length > 50 ? `${m.content.substring(0, 50)}...` : m.content
      }))
    }, null, 2));
  }

  try {
    console.log('🚀 perplexity-stream: Entering main try block.');
    // Select API key based on projectName
    const apiKey = process.env[`PERPLEXITY_API_KEY_${projectName?.toUpperCase()}`] || process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      console.error(`❌ API key not found for project: ${projectName}`);
      throw new Error(`API key not found for project: ${projectName}`);
    }

    if (debugMode === 1) {
      console.log('📡 Perplexity API config:', {
        apiKeyExists: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        projectName,
        model,
        user_id
      });
    }

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }).catch(err => {
      console.error('❌ Perplexity fetch error:', err.message);
      console.error('❌ Perplexity fetch error object:', err);
      console.error('❌ Perplexity fetch error stack:', err.stack);
      throw err;
    });

    if (debugMode === 1) {
      console.log(`🚦 Perplexity API Raw Response Status: ${perplexityResponse.status}`);
      console.log(`🚦 Perplexity API Raw Response OK: ${perplexityResponse.ok}`);
      console.log(`🚦 Perplexity API Raw Response Headers:`, perplexityResponse.headers.raw());
    }

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('❌ perplexity-stream: API error:', perplexityResponse.status, errorText);
      // Ensure we return here and don't try to read the body further
      return res.status(perplexityResponse.status).json({
        error: `Perplexity API error: ${perplexityResponse.status}`,
        details: errorText
      });
    }

    // Set up SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (debugMode === 1) {
      console.log('📥 Perplexity API Response initialized, attempting to get reader...');
    }

    // ---> ADDED TRY/CATCH around getReader <---
    let reader;
    try {
      reader = perplexityResponse.body.getReader();
      if (debugMode === 1) {
         console.log('✅ Successfully got stream reader.');
      }
    } catch (getReaderError) {
      console.error('❌ perplexity-stream: CRITICAL - Failed to get reader from response body:', getReaderError);
      return res.status(500).json({
        error: 'Internal server error',
        details: `Failed to get reader from response body: ${getReaderError.message}`
      });
    }
    // ---> END ADDED TRY/CATCH <---

    const decoder = new TextDecoder();
    let thinkingContent = '';
    let citations = [];
    let responseContent = '';
    let isThinking = false;
    let citationsSent = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Send final [DONE] signal
          if (debugMode === 1) {
            console.log('📤 Perplexity: Stream completed, sending [DONE]');
          }
          res.write('data: [DONE]\n\n');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        if (debugMode === 1 && chunk.length < 1000) {
          console.log('📥 Perplexity: Received chunk:', chunk);
        }

        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data:') && line.trim() !== 'data: [DONE]') {
            try {
              const data = line.substring(6);
              if (!data.trim()) continue;
              
              const parsed = JSON.parse(data);
              
              if (parsed.choices && parsed.choices[0]) {
                const choice = parsed.choices[0];
                const content = choice.delta?.content || choice.message?.content || '';
                
                // Handle thinking part
                if (content.includes('<think>') && content.includes('</think>')) {
                  const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
                  if (thinkMatch && thinkMatch[1]) {
                    thinkingContent = thinkMatch[1].trim();
                    isThinking = true;
                    
                    // Send thinking content
                    res.write(`data: ${JSON.stringify({ content: thinkingContent, isThinking: true })}\n\n`);
                  }
                  
                  // Extract the actual response (after thinking)
                  const afterThink = content.split('</think>')[1]?.trim();
                  if (afterThink) {
                    responseContent = afterThink;
                  }
                } 
                // Regular delta update (no thinking tags)
                else if (content) {
                  if (isThinking) {
                    // We've transitioned from thinking to response
                    isThinking = false;
                    
                    // If we have citations and haven't sent them yet, send them
                    if (parsed.citations && parsed.citations.length > 0 && !citationsSent) {
                      citations = parsed.citations;
                      res.write(`data: ${JSON.stringify({ citations })}\n\n`);
                      citationsSent = true;
                    }
                  }
                  
                  responseContent += content;
                  // Send actual response content
                  res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
              }
              
              // Handle citations if they weren't sent earlier
              if (parsed.citations && parsed.citations.length > 0 && !citationsSent) {
                citations = parsed.citations;
                res.write(`data: ${JSON.stringify({ citations })}\n\n`);
                citationsSent = true;
              }
              
            } catch (error) {
              if (debugMode === 1) {
                console.error('❌ perplexity-stream: Error parsing SSE data:', error, line);
              }
            }
          }
        }
      }
      
      res.end();
      
    } catch (error) {
      console.error('❌ perplexity-stream: Error:', error.message, error.stack);
      
      // If headers haven't been sent yet, return error as JSON
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error', details: error.message });
      }
      
      // Otherwise send error as SSE message
      try {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (sendError) {
        console.error('❌ perplexity-stream: Error sending error message:', sendError);
      }
    }
  } catch (error) {
    console.error('❌ perplexity-stream: Error:', error.message, error.stack);
    
    // If headers haven't been sent yet, return error as JSON
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
    
    // Otherwise send error as SSE message
    try {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (sendError) {
      console.error('❌ perplexity-stream: Error sending error message:', sendError);
    }
  }
} 