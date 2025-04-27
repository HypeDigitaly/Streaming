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

    // ---> MODIFIED: Call Perplexity API using got <---
    const perplexityStream = got.stream.post('https://api.perplexity.ai/chat/completions', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream' // Explicitly accept event stream
      },
      json: requestBody, // Send body as JSON
      timeout: { request: 30000 }, // Set a request timeout (e.g., 30 seconds)
      retry: { limit: 0 } // Disable retries for streaming
    });

    // Event listener for the 'response' event to check status code and headers
    perplexityStream.on('response', (response) => {
      if (debugMode === 1) {
        console.log(`🚦 [got] Perplexity API Response Status: ${response.statusCode}`);
        console.log(`🚦 [got] Perplexity API Response Headers:`, response.headers);
      }

      // Check if the status code indicates success
      if (response.statusCode < 200 || response.statusCode >= 300) {
         console.error(`❌ [got] Perplexity API error: Status ${response.statusCode}`);
         // Attempt to close the client connection gracefully
         try {
            if (!res.headersSent) {
               res.status(response.statusCode).json({ error: `Perplexity API error: ${response.statusCode}` });
            } else {
               res.end(); // End the stream if headers were already sent
            }
         } catch (e) {
            console.error("Error sending error response to client:", e);
         }
         perplexityStream.destroy(new Error(`Perplexity API error: ${response.statusCode}`)); // Destroy the got stream
         return; // Stop further processing on this stream instance
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

      // Set up SSE response headers for the client *after* receiving a valid response from Perplexity
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.writeHead(200); // Send 200 OK to client now
      if (debugMode === 1) {
        console.log('✅ [got] Perplexity stream response validated. Processing stream...');
      }
    });

    // ---> MODIFIED: Process the stream instead of piping directly <---

    // Variables for stream processing
    let buffer = '';
    let isInThinkBlock = false;
    let citations = [];
    let seenDoneMessage = false;

    // Process incoming data from Perplexity
    perplexityStream.on('data', (chunk) => {
      try {
        const decodedChunk = chunk.toString();

        if (debugMode === 1) {
          console.log('📥 [got] Received chunk:', decodedChunk);
        }

        // Add to buffer and process line by line
        buffer += decodedChunk;

        // Process complete lines (events)
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          // Handle DONE marker
          if (line === 'data: [DONE]') {
            if (!seenDoneMessage) {
              // Send the [DONE] marker to client only once
              res.write('data: [DONE]\n\n');
              seenDoneMessage = true;
            }
            continue;
          }

          try {
            // Remove 'data: ' prefix and parse
            const jsonStr = line.slice(5);
            const data = JSON.parse(jsonStr);

            // Handle Perplexity-specific formats

            // 1. Handle citations if present
            if (data.citations && Array.isArray(data.citations)) {
              if (debugMode === 1) {
                console.log('🔗 [got] Received citations:', data.citations.length);
              }
              
              citations = data.citations;
              // Send citations as part of the stream in a format StreamingResponseExtension can parse
              const citationsData = { 
                citations: data.citations
              };
              res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
            }

            // 2. Process content - handle content directly in data (Perplexity can send this format)
            if (data.content !== undefined) {
              const content = data.content;
              
              if (content !== null && content !== undefined) {
                // Process thinking/regular content with the same logic as below
                processContentChunk(content, res);
              }
              continue; // Skip to next line after processing direct content
            }

            // 3. Process standard OpenAI-like format
            if (data.choices && data.choices[0] && data.choices[0].delta) {
              const { content } = data.choices[0].delta;

              if (content !== null && content !== undefined) {
                processContentChunk(content, res);
              }
            } else if (data.error) {
              // Handle error in the stream data
              console.error('❌ [got] Perplexity stream data error:', data.error);
              res.write(`data: ${JSON.stringify({ error: data.error })}\n\n`);
            }
          } catch (e) {
            console.error('Error parsing JSON in stream:', e, 'Line:', line);
            // Skip invalid lines rather than failing the entire stream
          }
        }
      } catch (e) {
        console.error('Error processing perplexity stream chunk:', e);
      }
    });

    // Helper function to process content chunks and handle think blocks
    function processContentChunk(content, res) {
      // Check for think blocks that span across multiple chunks
      if (content.includes('<think>') && content.includes('</think>')) {
        // Case: Both tags in same chunk
        const beforeThink = content.split('<think>')[0];
        if (beforeThink.trim()) {
          const regularData = {
            choices: [{
              delta: { content: beforeThink }
            }]
          };
          res.write(`data: ${JSON.stringify(regularData)}\n\n`);
        }
        
        const thinkContent = content.split('<think>')[1].split('</think>')[0];
        if (thinkContent.trim()) {
          const thinkingData = {
            choices: [{
              delta: { content: thinkContent }
            }],
            isThinking: true
          };
          res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
        }
        
        const afterThink = content.split('</think>')[1];
        if (afterThink.trim()) {
          const regularData = {
            choices: [{
              delta: { content: afterThink }
            }]
          };
          res.write(`data: ${JSON.stringify(regularData)}\n\n`);
        }
        
        // No need to update isInThinkBlock flag since we're handling the entire block
      }
      else if (content.includes('<think>')) {
        // Start of think block
        isInThinkBlock = true;
        
        // Process any content before the think tag
        const beforeThink = content.split('<think>')[0];
        if (beforeThink.trim()) {
          const regularData = {
            choices: [{
              delta: { content: beforeThink }
            }]
          };
          res.write(`data: ${JSON.stringify(regularData)}\n\n`);
        }
        
        // Process content after think tag
        const afterThink = content.split('<think>')[1] || '';
        if (afterThink) {
          const thinkingData = {
            choices: [{
              delta: { content: afterThink }
            }],
            isThinking: true
          };
          res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
        }
      } 
      else if (content.includes('</think>')) {
        // End of think block
        isInThinkBlock = false;
        
        // Get content before </think>
        const beforeThinkEnd = content.split('</think>')[0];
        if (beforeThinkEnd) {
          const thinkingData = {
            choices: [{
              delta: { content: beforeThinkEnd }
            }],
            isThinking: true
          };
          res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
        }

        // Get content after </think>
        const afterThink = content.split('</think>')[1] || '';
        if (afterThink) {
          const regularData = {
            choices: [{
              delta: { content: afterThink }
            }]
          };
          res.write(`data: ${JSON.stringify(regularData)}\n\n`);
        }
      } 
      else if (isInThinkBlock) {
        // Inside think block
        const thinkingData = {
          choices: [{
            delta: { content: content }
          }],
          isThinking: true
        };
        res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
      } 
      else {
        // Regular content outside think block
        const regularData = {
          choices: [{
            delta: { content: content }
          }]
        };
        res.write(`data: ${JSON.stringify(regularData)}\n\n`);
      }
    }

    // Handle potential errors during the stream transfer
    perplexityStream.on('error', (error) => {
      console.error('❌ [got] Perplexity stream error:', error.message);
      try {
        // If headers haven't been sent, send a 500 status
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: error.message });
        } else {
          // If headers were sent, send error as SSE
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } catch (e) {
        console.error('Error sending error response to client:', e);
      }
    });

    // Handle the end of the stream from Perplexity
    perplexityStream.on('end', () => {
      if (debugMode === 1) {
        console.log('📤 [got] Perplexity stream ended.');
      }

      // Send any remaining buffer content if it's a complete data line
      if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
        try {
          const jsonStr = buffer.trim().slice(5);
          const data = JSON.parse(jsonStr);
          // Process the final data chunk
          if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
            res.write(buffer.trim() + '\n\n');
          }
        } catch (e) {
          // Ignore parsing errors for incomplete chunks
        }
      }

      // Send final [DONE] marker if not sent already
      res.write('data: [DONE]\n\n');

      // Ensure the client response stream is properly ended
      if (!res.writableEnded) {
        res.end();
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