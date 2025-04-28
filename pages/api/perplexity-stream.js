
// Perplexity API stream handler

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
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id } = req.body;

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
        user_id
      });
      console.log('🔍 System Prompt full text:', systemPrompt);
      console.log('🔍 User Input full text:', userData);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Create the request payload
    const payload = {
      temperature: temperature || 0,
      top_p: temperature || 0,
      return_images: true,
      return_related_questions: true,
      top_k: 0,
      stream: true,
      presence_penalty: 0,
      frequency_penalty: 1,
      web_search_options: {
        search_context_size: "high"
      },
      model: model || "sonar-reasoning-pro",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userData
        }
      ],
      max_tokens: max_tokens || 4096
    };

    if (debugMode === 1) {
      console.log('🚀 Making Perplexity API call with payload:', JSON.stringify(payload, null, 2));
      console.log('⏳ Starting API stream request to Perplexity...');
      
      // Send debug information to client console
      res.write(`data: ${JSON.stringify({
        type: 'debug',
        content: {
          message: '🚀 Making Perplexity API call',
          payload: JSON.stringify(payload, null, 2),
          timestamp: new Date().toISOString()
        }
      })}\n\n`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear the timeout if the request completes

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorData}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Initialize variables to track the entire response
    let fullResponse = '';
    let thinkingContent = '';
    let allCitations = [];
    let tokenCount = 0;
    let isInThinkingBlock = false;
    let allStreamChunks = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
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
          // Send [DONE] signal to client
          if (debugMode === 1) {
            console.log('🏁 Received [DONE] signal from Perplexity API');
          }
          res.write('data: [DONE]\n\n');
          continue;
        }

        try {
          // Remove 'data: ' prefix and parse
          const jsonStr = line.slice(5);
          const data = JSON.parse(jsonStr);
          
          // Save the raw stream chunk
          allStreamChunks.push(data);
          
          if (debugMode === 1) {
            console.log(`📥 Perplexity Response Chunk #${tokenCount + 1}:`, JSON.stringify(data, null, 2));
            
            // Send debug information to client console
            res.write(`data: ${JSON.stringify({
              type: 'debug',
              content: {
                message: `📥 Perplexity Response Chunk #${tokenCount + 1}`,
                data: JSON.stringify(data, null, 2),
                timestamp: new Date().toISOString()
              }
            })}\n\n`);
            res.flush?.();
          }

          // Process response content - handle both thinking (Perplexity-specific) and regular response
          if (data.choices && data.choices[0]) {
            const { delta } = data.choices[0];
            
            if (delta.content !== undefined && delta.content !== null) {
              // Increment token count
              tokenCount++;
              
              // Check for thinking tags in the content
              if (delta.content.includes('<think>')) {
                isInThinkingBlock = true;
                const afterThinkTag = delta.content.split('<think>')[1] || '';
                thinkingContent += afterThinkTag;
                
                if (debugMode === 1) {
                  console.log('🧠 Entering thinking block');
                  if (afterThinkTag) {
                    console.log('🧠 First thinking content:', afterThinkTag);
                  }
                  
                  // Send thinking block debug info to client console
                  res.write(`data: ${JSON.stringify({
                    type: 'debug',
                    content: {
                      message: '🧠 Entering thinking block',
                      thinking: afterThinkTag ? `First thinking content: ${afterThinkTag}` : '',
                      timestamp: new Date().toISOString()
                    }
                  })}\n\n`);
                  res.flush?.();
                }
              } else if (delta.content.includes('</think>')) {
                isInThinkingBlock = false;
                const beforeThinkEndTag = delta.content.split('</think>')[0] || '';
                thinkingContent += beforeThinkEndTag;
                
                if (debugMode === 1) {
                  console.log('🧠 Exiting thinking block');
                  if (beforeThinkEndTag) {
                    console.log('🧠 Final thinking content:', beforeThinkEndTag);
                  }
                  console.log('🧠 COMPLETE THINKING PROCESS:', thinkingContent);
                  
                  // Send thinking block completion to client console
                  res.write(`data: ${JSON.stringify({
                    type: 'debug',
                    content: {
                      message: '🧠 Exiting thinking block',
                      thinkingFinal: beforeThinkEndTag || '',
                      completeThinking: thinkingContent,
                      timestamp: new Date().toISOString()
                    }
                  })}\n\n`);
                  res.flush?.();
                }
                
                // Get content after </think> tag
                const afterThinkEndTag = delta.content.split('</think>')[1] || '';
                if (afterThinkEndTag) {
                  fullResponse += afterThinkEndTag;
                  if (debugMode === 1) {
                    console.log('💬 Content after thinking:', afterThinkEndTag);
                  }
                }
              } else if (isInThinkingBlock) {
                thinkingContent += delta.content;
                if (debugMode === 1) {
                  console.log(`🧠 Thinking token #${tokenCount}:`, delta.content);
                }
              } else {
                // Regular content
                fullResponse += delta.content;
                if (debugMode === 1) {
                  console.log(`💬 Response token #${tokenCount}:`, delta.content);
                }
              }
              
              const responseData = {
                type: 'content',
                content: delta.content
              };
              
              res.write(`data: ${JSON.stringify(responseData)}\n\n`);
              res.flush?.();
            }
          }

          // Handle citations if they exist in the response
          if (data.citations) {
            // Track all citations
            allCitations = data.citations;
            
            if (debugMode === 1) {
              console.log('📚 Citations received:', JSON.stringify(data.citations, null, 2));
              console.log(`📚 Total citations: ${data.citations.length}`);
              
              // Send citations debug info to client console
              res.write(`data: ${JSON.stringify({
                type: 'debug',
                content: {
                  message: `📚 Citations received (${data.citations.length} total)`,
                  citations: JSON.stringify(data.citations, null, 2),
                  timestamp: new Date().toISOString()
                }
              })}\n\n`);
              res.flush?.();
            }
            
            const citationsData = {
              type: 'citations',
              citations: data.citations
            };
            
            res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
            res.flush?.();
          }
        } catch (e) {
          if (debugMode === 1) {
            console.error('❌ Failed to parse Perplexity chunk:', e, 'Line:', line);
          }
          // Skip incomplete chunks silently
        }
      }
    }
    
    // Log the complete response data at the end
    if (debugMode === 1) {
      console.log('\n==== PERPLEXITY STREAMING SUMMARY ====');
      console.log(`🔢 Total tokens streamed: ${tokenCount}`);
      console.log(`📚 Total citations: ${allCitations.length}`);
      console.log('📚 All citations:', JSON.stringify(allCitations, null, 2));
      console.log('🧠 Complete thinking process:', thinkingContent);
      console.log('💬 Complete final response:', fullResponse);
      console.log('📊 All stream chunks:', JSON.stringify(allStreamChunks, null, 2));
      console.log('==== END SUMMARY ====\n');
      
      // Send comprehensive summary to client console
      res.write(`data: ${JSON.stringify({
        type: 'debug',
        content: {
          message: '==== PERPLEXITY STREAMING SUMMARY ====',
          totalTokens: tokenCount,
          totalCitations: allCitations.length,
          allCitations: allCitations,
          completeThinking: thinkingContent,
          completeResponse: fullResponse,
          allStreamChunks: allStreamChunks,
          timestamp: new Date().toISOString()
        }
      })}\n\n`);
      res.flush?.();
    }

    // Explicitly send DONE signal to ensure it's always sent
    if (debugMode === 1) {
      console.log('📤 Sending final [DONE] signal to complete stream');
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('❌ Stream Error:', error);
      console.error('❌ Error Stack:', error.stack);
      console.error('❌ Error occurred during Perplexity API request processing');
      
      // Try to extract additional error information if available
      if (error.response) {
        try {
          const errorBody = await error.response.text();
          console.error('❌ Perplexity API Error Response:', errorBody);
        } catch (e) {
          console.error('❌ Could not extract error response body:', e);
        }
      }
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
