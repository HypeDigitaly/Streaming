import { OpenAI } from 'openai';
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
    /*
     * EXPANDED WEB SEARCH PARAMETERS:
     * 
     * enableWebSearch: boolean - Enable web search tool (model can choose to use it)
     * forceWebSearch: boolean - Force web search tool usage on every request using tool_choice
     * searchContextSize: string - 'low', 'medium', 'high' - Controls search context size (affects cost/quality/latency)
     * userLocation: object - Geographic location for search refinement
     *   - country: string (ISO country code, e.g., 'US', 'CZ')
     *   - city: string (free text, e.g., 'Prague')
     *   - region: string (free text, e.g., 'Prague Region')
     *   - timezone: string (IANA timezone, e.g., 'Europe/Prague')
     * tool_choice: object - Custom tool choice override (e.g., {type: 'web_search_preview'})
     * 
     * Example payload for forced web search with Czech location:
     * {
     *   "forceWebSearch": true,
     *   "searchContextSize": "high",
     *   "userLocation": {
     *     "country": "CZ",
     *     "city": "Prague",
     *     "region": "Prague Region",
     *     "timezone": "Europe/Prague"
     *   }
     * }
     */
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id, reasoning, tools, enableWebSearch, enableFileSearch, userLocation, searchContextSize, forceWebSearch, tool_choice } = req.body;

    // Validate web search parameters
    if (searchContextSize && !['low', 'medium', 'high'].includes(searchContextSize)) {
      throw new Error(`Invalid searchContextSize '${searchContextSize}'. Must be 'low', 'medium', or 'high'.`);
    }

    if (userLocation && typeof userLocation !== 'object') {
      throw new Error('userLocation must be an object with country, city, region, and/or timezone properties.');
    }

    if (userLocation?.country && typeof userLocation.country !== 'string') {
      throw new Error('userLocation.country must be a string (ISO country code, e.g., "CZ", "US").');
    }

    // Check if web search is supported for the model
    const currentModel = model || 'o4-mini';
    if ((enableWebSearch || forceWebSearch) && currentModel === 'gpt-4.1-nano') {
      throw new Error('Web search is not supported for gpt-4.1-nano model.');
    }

    // Function to check if a model is a reasoning model
    function isReasoningModel(modelName) {
      const reasoningModels = ["o4-mini", "o3-mini", "o3"];
      return reasoningModels.includes(modelName);
    }

    // Select API key based on projectName
    const apiKey = process.env[`OPENAI_API_KEY_${projectName?.toUpperCase()}`] || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    if (debugMode === 1) {
        console.log('📡 OpenAI Payload values:', {
          model,
          max_tokens,
          temperature,
          projectName,
          debugMode,
          systemPrompt,
          user_id,
          reasoning,
          tools,
          enableWebSearch,
          enableFileSearch,
          forceWebSearch,
          tool_choice,
          userLocation,
          searchContextSize
        });
      }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const toolsArray = [];
        
        // Add web search tool if enabled or forced
        if (enableWebSearch || forceWebSearch) {
            const webSearchTool = { type: 'web_search_preview' };

            // Add user location if provided
            if (userLocation) {
                webSearchTool.user_location = {
                    type: 'approximate',
                    country: userLocation.country || 'US',
                    city: userLocation.city || null,
                    region: userLocation.region || null,
                    timezone: userLocation.timezone || null
                };
            }

            // Add search context size if provided (low, medium, high)
            if (searchContextSize) {
                webSearchTool.search_context_size = searchContextSize;
            }

            toolsArray.push(webSearchTool);
            if (debugMode === 1) {
                console.log('🌐 WEB SEARCH TOOL ADDED:', {
                    ...webSearchTool,
                    forced: forceWebSearch || false,
                    enabled: enableWebSearch || false
                });
            }
        }

        if (enableFileSearch) {
            toolsArray.push({ type: 'file_search' });
            if (debugMode === 1) {
                console.log('📄 FILE SEARCH TOOL ADDED');
            }
        }

    // Use the new Responses API if reasoning or tools are requested
      if (reasoning || tools || toolsArray.length > 0) {
        const responsesPayload = {
          model: model || 'o4-mini',
          max_output_tokens: max_tokens || 4096,
          instructions: systemPrompt,
          input: [{ role: 'user', content: userData }],
          reasoning: reasoning,
          tools: toolsArray.length > 0 ? toolsArray : tools,
          stream: true, // Always use streaming for real-time updates
        };

        // Force web search tool usage if forceWebSearch is true or tool_choice is explicitly set
        if (forceWebSearch) {
          responsesPayload.tool_choice = { type: 'web_search_preview' };
          if (debugMode === 1) {
            console.log('🔧 FORCING WEB SEARCH via tool_choice');
          }
        } else if (tool_choice) {
          responsesPayload.tool_choice = tool_choice;
          if (debugMode === 1) {
            console.log('🔧 CUSTOM tool_choice SET:', tool_choice);
          }
        }

      const response = await openai.responses.create(responsesPayload);

      if (debugMode === 1) {
        console.log('📥 OpenAI Responses API Response initialized');
      }

      // Process streaming Responses API events
      for await (const chunk of response) {
        if (debugMode === 1) {
          console.log('📥 Responses API Chunk:', JSON.stringify(chunk, null, 2));
        }

        let streamType = null;
        let content = null;

        // Handle different event types from Responses API
        if (chunk.type === 'response.output_text.delta') {
          streamType = 'content';
          content = chunk.delta;
          if (debugMode === 1) {
            console.log('📝 CONTENT DELTA:', {
              length: content?.length || 0,
              content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
              chunk_type: chunk.type
            });
          }
        } else if (chunk.type === 'response.reasoning.delta' && chunk.delta?.text) {
          streamType = 'reasoning';
          content = chunk.delta.text;
          if (debugMode === 1) {
            console.log('🔎 REASONING DELTA:', {
              length: content?.length || 0,
              content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
              chunk_type: chunk.type
            });
          }
        } else if (chunk.type === 'response.reasoning_summary.delta' && chunk.delta?.text) {
          streamType = 'reasoning';
          content = chunk.delta.text;
          if (debugMode === 1) {
            console.log('🔎 REASONING SUMMARY DELTA:', {
              length: content?.length || 0,
              content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
              chunk_type: chunk.type
            });
          }
        } else if (chunk.type === 'response.reasoning_summary_text.delta') {
          streamType = 'reasoning';
          content = chunk.delta;
          if (debugMode === 1) {
            console.log('🔎 REASONING SUMMARY TEXT DELTA:', {
              length: content?.length || 0,
              content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
              chunk_type: chunk.type
            });
          }
        } else if (chunk.type === 'response.web_search_call.in_progress') {
          streamType = 'tool_call';
          const webSearchCall = chunk.web_search_call || {};
          content = JSON.stringify({
            tool_name: 'web_search_preview',
            arguments: webSearchCall.query || 'Searching...',
            status: 'searching',
            query: webSearchCall.query,
            step: 'Vyhledávání na webu...',
            action: webSearchCall.action || 'search'
          });
          if (debugMode === 1) {
            console.log('🌐 WEB SEARCH IN PROGRESS:', {
              chunk_type: chunk.type,
              web_search_call: webSearchCall,
              query: webSearchCall.query,
              action: webSearchCall.action
            });
          }
        } else if (chunk.type === 'response.web_search_call.searching') {
          streamType = 'tool_call';
          const webSearchCall = chunk.web_search_call || {};
          content = JSON.stringify({
            tool_name: 'web_search_preview',
            arguments: webSearchCall.query || 'Searching...',
            status: 'searching',
            query: webSearchCall.query,
            step: 'Prohledávání webu...',
            action: webSearchCall.action || 'search'
          });
          if (debugMode === 1) {
            console.log('🌐 WEB SEARCH SEARCHING:', {
              chunk_type: chunk.type,
              web_search_call: webSearchCall
            });
          }
        } else if (chunk.type === 'response.web_search_call.completed') {
          streamType = 'tool_response';
          const webSearchCall = chunk.web_search_call || {};
          const results = webSearchCall.results || [];
          const resultsCount = results.length;
          const topResults = results.slice(0, 3).map(r => ({
            title: r.title || 'Bez názvu',
            url: r.url || '',
            snippet: r.snippet ? (r.snippet.substring(0, 100) + (r.snippet.length > 100 ? '...' : '')) : 'Bez popisu'
          }));

          content = JSON.stringify({
            tool_name: 'web_search_preview',
            response: `Nalezeno ${resultsCount} výsledků`,
            results_count: resultsCount,
            top_results: topResults,
            query: webSearchCall.query,
            status: 'completed',
            action: webSearchCall.action || 'search',
            domains: webSearchCall.domains || [],
            raw_results: results // Add raw results for debugging
          });
          if (debugMode === 1) {
            console.log('🌐 WEB SEARCH COMPLETED:', {
              chunk_type: chunk.type,
              web_search_call: webSearchCall,
              results_count: resultsCount,
              top_results: topResults,
              raw_results: results,
              query: webSearchCall.query
            });
          }
        } else if (chunk.type === 'response.file_search_call.in_progress') {
          streamType = 'tool_call';
          content = JSON.stringify({
            tool_name: 'file_search',
            arguments: 'Searching files...'
          });
          if (debugMode === 1) {
            console.log('📄 FILE SEARCH IN PROGRESS:', chunk);
          }
        } else if (chunk.type === 'response.file_search_call.completed') {
          streamType = 'tool_response';
          content = JSON.stringify({
            tool_name: 'file_search',
            response: 'File search completed'
          });
          if (debugMode === 1) {
            console.log('📄 FILE SEARCH COMPLETED:', chunk);
          }
        } else if (chunk.type === 'response.completed') {
          if (debugMode === 1) {
            console.log('✅ RESPONSES API STREAM COMPLETED:', {
              chunk_type: chunk.type,
              timestamp: new Date().toISOString()
            });
          }
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        } else if (chunk.type === 'error') {
          if (debugMode === 1) {
            console.error('❌ RESPONSES API ERROR:', {
              error: chunk.error?.message || 'Unknown error',
              chunk_type: chunk.type,
              full_error: JSON.stringify(chunk.error, null, 2)
            });
          }
          res.write(`data: ${JSON.stringify({ error: chunk.error.message })}\n\n`);
          res.end();
          return;
        } else {
          if (debugMode === 1) {
            console.log('❓ UNKNOWN RESPONSES API CHUNK TYPE:', {
              chunk_type: chunk.type,
              full_chunk: JSON.stringify(chunk, null, 2)
            });
          }
        }

        if (streamType && content) {
          const data = {
            type: streamType,
            content: content,
          };
          if (debugMode === 1) {
            console.log('📤 SENDING TO FRONTEND:', {
              type: streamType,
              content_length: content.length,
              content_preview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
            });
          }
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          res.flush?.();
        }
      }
    } else {
      // Use Chat Completions API for non-reasoning models
      const chatPayload = {
        model: model || 'gpt-4.1-2025-04-14',
        max_tokens: max_tokens || 4096,
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
        temperature: temperature || 0,
      };

      const response = await openai.chat.completions.create(chatPayload);

      if (debugMode === 1) {
        console.log('📥 OpenAI Chat Completions API Response initialized');
      }

      // Process Chat Completions streaming
      for await (const chunk of response) {
        if (debugMode === 1) {
          console.log('📥 Chat Completion Chunk:', JSON.stringify(chunk, null, 2));
        }

        const choice = chunk.choices?.[0];
        if (choice?.delta?.content) {
          const data = {
            type: 'content',
            content: choice.delta.content,
          };
          if (debugMode === 1) {
            console.log('📤 SENDING CHAT CONTENT TO FRONTEND:', {
              content_length: choice.delta.content.length,
              content_preview: choice.delta.content.substring(0, 50) + (choice.delta.content.length > 50 ? '...' : '')
            });
          }
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          res.flush?.();
        }

        if (choice?.finish_reason) {
          if (debugMode === 1) {
            console.log('✅ CHAT COMPLETION FINISHED:', choice.finish_reason);
          }
          res.write('data: [DONE]\n\n');
          res.end();
          return;
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