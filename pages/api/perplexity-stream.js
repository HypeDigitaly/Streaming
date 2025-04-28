import { createParser } from 'eventsource-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    model,
    max_tokens,
    temperature,
    userData,
    systemPrompt,
    projectName,
    debugMode = 0
  } = req.body;

  if (!userData) {
    res.status(400).json({ error: 'Missing required field: userData' });
    return;
  }

  // Get API key from environment variables
  const apiKey = process.env[`PERPLEXITY_${projectName}`];
  if (!apiKey) {
    res.status(500).json({ error: `API key not found for project: ${projectName}` });
    return;
  }

  try {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });

    // Create the request payload
    const payload = {
      model: model || 'sonar-reasoning-pro',
      temperature: parseFloat(temperature) || 0.7,
      top_p: parseFloat(temperature) || 0.7,
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
          content: systemPrompt || ""
        },
        {
          role: "user",
          content: userData
        }
      ],
      max_tokens: parseInt(max_tokens) || 2048
    };

    if (debugMode === 1) {
      console.log('Perplexity API Request:', {
        model: payload.model,
        max_tokens: payload.max_tokens,
        temperature: payload.temperature,
        systemPrompt: systemPrompt ? `${systemPrompt.substring(0, 50)}...` : 'None',
        userData: userData ? `${userData.substring(0, 50)}...` : 'None'
      });
    }

    // Make the API request
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    // Set up SSE parser
    const parser = createParser((event) => {
      if (event.type === 'event') {
        if (event.data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        try {
          const data = JSON.parse(event.data);
          
          // Process response chunk
          if (data && data.choices && data.choices[0].delta) {
            const content = data.choices[0].delta.content;
            if (content !== undefined && content !== null) {
              const chunk = {
                content: content
              };
              
              // Add citations if present
              if (data.citations) {
                chunk.citations = data.citations;
              }
              
              // Detect thinking sections for better UI handling
              if (debugMode === 1) {
                // Only log in debug mode to avoid noisy logs
                if (content.includes('<think>')) {
                  console.log('Detected thinking start in Perplexity response');
                } else if (content.includes('</think>')) {
                  console.log('Detected thinking end in Perplexity response');
                }
              }
              
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      }
    });

    // Process the stream
    for await (const chunk of streamResponse(response.body)) {
      const text = new TextDecoder().decode(chunk);
      parser.feed(text);
    }

  } catch (error) {
    console.error('Perplexity streaming error:', error);
    
    // Try to send error to client if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
      return;
    }
    
    // If headers already sent, try to send error in SSE format
    try {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e) {
      // Last resort - just end the response
      try { res.end(); } catch (e) { /* ignore */ }
    }
  }
}

// Helper function to handle streaming response
async function* streamResponse(readableStream) {
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
} 