
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
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id, browser_lang } = req.body;

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
        browser_lang
      });
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
    }

    // Initialize thinking and response states
    let isInThinkingMode = false;
    let thinkingContent = '';
    let answerContent = '';
    let citations = [];

    // Send initial UI setup to client
    const setupData = {
      type: 'setup',
      thinkingLabel: getThinkingLabel(browser_lang || 'cs'),
      model: model || "sonar-reasoning-pro"
    };
    res.write(`data: ${JSON.stringify(setupData)}\n\n`);

    // Helper function to get "Thinking" in different languages
    function getThinkingLabel(lang) {
      const translations = {
        'cs': 'Přemýšlím',
        'en': 'Thinking',
        'de': 'Ich denke nach',
        'sk': 'Premýšľam',
        'pl': 'Myślę',
        'uk': 'Обдумую',
        'ru': 'Размышляю'
      };
      return translations[lang] || translations['en'];
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorData}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          // When all content is received, send final completed signal to client
          const completedData = {
            type: 'completed'
          };
          res.write(`data: ${JSON.stringify(completedData)}\n\n`);
          res.write('data: [DONE]\n\n');
          continue;
        }

        try {
          // Remove 'data: ' prefix and parse
          const jsonStr = line.slice(5);
          const data = JSON.parse(jsonStr);
          
          if (debugMode === 1) {
            console.log('📥 Perplexity Response Chunk:', JSON.stringify(data, null, 2));
          }

          // Process citations if they exist
          if (data.citations && data.citations.length > 0) {
            citations = data.citations;
            
            // Send citation data to client
            const citationsData = {
              type: 'citations',
              citations: citations
            };
            res.write(`data: ${JSON.stringify(citationsData)}\n\n`);
          }

          // Process content from response
          if (data.choices && data.choices[0] && data.choices[0].delta) {
            const { delta } = data.choices[0];
            
            if (delta.content !== undefined && delta.content !== null) {
              const content = delta.content;
              
              // Check for <think> tag to enter thinking mode
              if (content.includes('<think>')) {
                isInThinkingMode = true;
                
                // Extract any content after the <think> tag
                const thinkingPart = content.split('<think>')[1];
                if (thinkingPart) {
                  thinkingContent += thinkingPart;
                  
                  // Send thinking content
                  const thinkingData = {
                    type: 'thinking',
                    content: thinkingPart
                  };
                  res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
                }
              } 
              // Check for </think> tag to exit thinking mode
              else if (content.includes('</think>')) {
                // Extract any content before the </think> tag
                const beforeEndTag = content.split('</think>')[0];
                if (beforeEndTag) {
                  thinkingContent += beforeEndTag;
                  
                  // Send final part of thinking content
                  const thinkingData = {
                    type: 'thinking',
                    content: beforeEndTag
                  };
                  res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
                }
                
                isInThinkingMode = false;
                
                // Extract any content after the </think> tag as answer content
                const afterEndTag = content.split('</think>')[1];
                if (afterEndTag) {
                  answerContent += afterEndTag;
                  
                  // Send answer content
                  const answerData = {
                    type: 'answer',
                    content: afterEndTag
                  };
                  res.write(`data: ${JSON.stringify(answerData)}\n\n`);
                }
              }
              // Process content based on current mode
              else if (isInThinkingMode) {
                thinkingContent += content;
                
                // Send thinking content
                const thinkingData = {
                  type: 'thinking',
                  content: content
                };
                res.write(`data: ${JSON.stringify(thinkingData)}\n\n`);
              } 
              else {
                answerContent += content;
                
                // Send answer content
                const answerData = {
                  type: 'answer',
                  content: content
                };
                res.write(`data: ${JSON.stringify(answerData)}\n\n`);
              }
            }
          }
        } catch (e) {
          if (debugMode === 1) {
            console.error('Failed to parse Perplexity chunk:', e, 'Line:', line);
          }
          // Skip incomplete chunks silently
        }
      }
    }

    // Explicitly send DONE signal to ensure it's always sent
    if (debugMode === 1) {
      console.log('📤 Sending final [DONE] signal to complete stream');
    }
    const finalData = {
      type: 'completed'
    };
    res.write(`data: ${JSON.stringify(finalData)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
