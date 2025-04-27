import got from 'got';
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

    // Create request for Perplexity API
    const perplexityStream = got.stream.post('https://api.perplexity.ai/chat/completions', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      json: requestBody,
      timeout: { request: 30000 },
      retry: { limit: 0 }
    });

    // Event listener for response status/headers
    perplexityStream.on('response', (response) => {
      if (debugMode === 1) {
        console.log(`🚦 [got] Perplexity API Response Status: ${response.statusCode}`);
        console.log(`🚦 [got] Perplexity API Response Headers:`, response.headers);
      }

      // Check if the status code indicates success
      if (response.statusCode < 200 || response.statusCode >= 300) {
         console.error(`❌ [got] Perplexity API error: Status ${response.statusCode}`);
         try {
            if (!res.headersSent) {
               res.status(response.statusCode).json({ error: `Perplexity API error: ${response.statusCode}` });
            } else {
               res.end();
            }
         } catch (e) {
            console.error("Error sending error response to client:", e);
         }
         perplexityStream.destroy(new Error(`Perplexity API error: ${response.statusCode}`));
         return;
      }

      // Check Content-Type header
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('text/event-stream')) {
        console.error(`❌ [got] Unexpected Content-Type: ${contentType}. Expected text/event-stream.`);
        try {
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error', details: `Unexpected Content-Type from Perplexity: ${contentType}` });
          } else {
            res.end();
          }
        } catch (e) {
          console.error("Error sending error response to client:", e);
        }
        perplexityStream.destroy(new Error(`Unexpected Content-Type: ${contentType}`));
        return;
      }

      // Set up SSE response headers for the client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.writeHead(200);
      if (debugMode === 1) {
        console.log('✅ [got] Perplexity stream response validated. Processing stream...');
      }
    });

    // Process stream data instead of piping directly
    let buffer = '';
    let lastCitationsHash = '';
    let citationsSent = false;
    
    perplexityStream.on('data', (chunk) => {
      try {
        const decodedChunk = chunk.toString();
        
        if (debugMode === 1) {
          console.log('📥 [got] Processing chunk:', decodedChunk.substring(0, 100) + (decodedChunk.length > 100 ? '...' : ''));
        }
        
        buffer += decodedChunk;
        
        // Process complete SSE events
        let processedBuffer = '';
        const lines = buffer.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Keep incomplete line in buffer
          if (i === lines.length - 1 && !line.trim().endsWith('}}') && !line.includes('[DONE]')) {
            processedBuffer = line;
            continue;
          }
          
          if (!line.trim() || !line.startsWith('data: ')) {
            continue;
          }
          
          const data = line.slice(6);
          
          // Handle end of stream
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            continue;
          }
          
          // Parse JSON data
          try {
            const parsed = JSON.parse(data);
            
            // Handle citations only once per unique set (use hash to compare)
            if (parsed.citations && Array.isArray(parsed.citations)) {
              const citationsHash = JSON.stringify(parsed.citations);
              
              // Only send citations if they're new or we haven't sent any yet
              if (citationsHash !== lastCitationsHash || !citationsSent) {
                lastCitationsHash = citationsHash;
                citationsSent = true;
                
                if (debugMode === 1) {
                  console.log(`📋 Sending citations to client (once):`, parsed.citations.length);
                }
                
                // Send citations as a separate event
                res.write(`data: ${JSON.stringify({ citations: parsed.citations })}\n\n`);
              }
            }
            
            // Forward content data to client
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
              const delta = parsed.choices[0].delta;
              if (delta.content) {
                // Send content delta to client
                res.write(`data: ${JSON.stringify({ 
                  choices: [{ delta: { content: delta.content } }] 
                })}\n\n`);
              }
            }
            
            // If isThinking is present, pass it through
            if (parsed.isThinking !== undefined) {
              res.write(`data: ${JSON.stringify({ 
                content: parsed.content || '',
                isThinking: parsed.isThinking
              })}\n\n`);
            }
            
          } catch (e) {
            if (debugMode === 1) {
              console.warn(`Failed to parse SSE data: ${e.message}`);
            }
          }
        }
        
        // Update buffer with any unprocessed content
        buffer = processedBuffer;
        
      } catch (e) {
        console.error('Error processing chunk:', e);
      }
    });

    // Handle potential errors during the stream transfer
    perplexityStream.on('error', (error) => {
      console.error('❌ [got] Perplexity stream error:', error.message);
      try {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
        } else {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } catch (e) {
        console.error('Error sending error response to client:', e);
      }
    });

    // Handle the end of the stream
    perplexityStream.on('end', () => {
      if (debugMode === 1) {
        console.log('📤 [got] Perplexity stream ended.');
      }
      
      // Make sure we send [DONE] at the end
      if (!res.writableEnded) {
        try {
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (e) {
          console.error('Error ending response stream:', e);
        }
      }
    });

  } catch (error) {
    // This catch block now primarily handles errors *before* the stream starts
    // (e.g., API key not found, initial got request setup error)
    console.error('❌ perplexity-stream: Setup Error:', error.message, error.stack);
    
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