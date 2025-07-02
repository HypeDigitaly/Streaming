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
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id, reasoning, tools } = req.body;

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
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Use the new Responses API if reasoning or tools are requested
    if (reasoning || tools) {
      // For reasoning models, we might need to use non-streaming and simulate streaming
      // if OpenAI doesn't support reasoning streaming yet
      const shouldTryHybridApproach = reasoning && isReasoningModel(model || 'o4-mini');
      
      if (shouldTryHybridApproach && debugMode === 1) {
        console.log('🔄 ATTEMPTING HYBRID APPROACH: Non-streaming with simulated streaming for reasoning model');
      }

      const responsesPayload = {
        model: model || 'o4-mini',
        max_output_tokens: max_tokens || 4096,
        instructions: systemPrompt,
        input: [{ role: 'user', content: userData }],
        reasoning: reasoning,
        tools: tools,
        stream: !shouldTryHybridApproach, // Don't stream for reasoning models in hybrid mode
      };

      // Only add temperature for non-reasoning models
      if (!isReasoningModel(model || 'o4-mini')) {
        responsesPayload.temperature = temperature || 0;
      } else if (debugMode === 1) {
        console.log(`🚫 REASONING MODEL DETECTED: Skipping temperature parameter for ${model || 'o4-mini'}`);
      }

      const response = await openai.responses.create(responsesPayload);

      if (debugMode === 1) {
        console.log('📥 OpenAI Responses API Response initialized');
      }

      // Handle hybrid (non-streaming) approach for reasoning models
      if (shouldTryHybridApproach && !responsesPayload.stream) {
        if (debugMode === 1) {
          console.log('🔄 HYBRID MODE: Processing non-streaming response');
          console.log('📥 Full Response:', JSON.stringify(response, null, 2));
        }
        
        // Extract reasoning if available
        if (response.reasoning) {
          const reasoningData = {
            type: 'reasoning',
            content: response.reasoning
          };
          if (debugMode === 1) {
            console.log('🔎 EXTRACTED REASONING:', {
              reasoning_length: response.reasoning?.length || 0,
              reasoning_preview: response.reasoning?.substring(0, 100) + (response.reasoning?.length > 100 ? '...' : '')
            });
          }
          res.write(`data: ${JSON.stringify(reasoningData)}\n\n`);
          res.flush?.();
        }
        
        // Extract and stream the main response content
        const mainContent = response.output?.[0]?.content || response.content || '';
        if (mainContent) {
          // Simulate streaming by chunking the response
          const chunks = mainContent.match(/.{1,50}/g) || [mainContent];
          for (const chunk of chunks) {
            const data = {
              type: 'content',
              content: chunk
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            res.flush?.();
            // Add small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    } else {
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
      };

      // Only add temperature for non-reasoning models
      if (!isReasoningModel(model || 'gpt-4.1-2025-04-14')) {
        chatPayload.temperature = temperature || 0;
      } else if (debugMode === 1) {
        console.log(`🚫 REASONING MODEL DETECTED: Skipping temperature parameter for ${model || 'gpt-4.1-2025-04-14'}`);
      }

      const response = await openai.chat.completions.create(chatPayload);

      if (debugMode === 1) {
        console.log('📥 OpenAI Chat Completions API Response initialized');
      }

      // Normal streaming approach for non-reasoning models or if reasoning streaming works
      for await (const chunk of response) {
        if (debugMode === 1) {
            console.log('📥 Response Chunk:', JSON.stringify(chunk, null, 2));
            console.log('🔍 Chunk Type Analysis:', {
                chunk_type: chunk.type,
                has_delta: !!chunk.delta,
                delta_length: chunk.delta?.length || 0,
                has_tool_call: !!chunk.tool_call,
                has_error: !!chunk.error,
                full_keys: Object.keys(chunk)
            });
            
            // Additional debugging - check for any reasoning or tool data in unexpected places
            console.log('🔍 DEBUGGING ALL CHUNK FIELDS:', {
                item_id: chunk.item_id,
                output_index: chunk.output_index,
                content_index: chunk.content_index,
                delta_full: chunk.delta,
                reasoning: chunk.reasoning,
                tool_call: chunk.tool_call,
                tool_response: chunk.tool_response,
                status: chunk.status,
                response: chunk.response,
                all_possible_fields: Object.keys(chunk).filter(key => 
                  key.includes('reason') || 
                  key.includes('tool') || 
                  key.includes('think') ||
                  key.includes('search')
                )
            });
        }

        let streamType = null;
        let content = null;

        if (chunk.type === 'response.output_text.delta') {
            streamType = 'content';
            content = chunk.delta;
            if (debugMode === 1) {
                console.log('📝 CONTENT TOKEN:', {
                    length: content?.length || 0,
                    content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
                    chunk_type: chunk.type
                });
            }
        } else if (chunk.type === 'response.reasoning.delta' && chunk.delta?.text) {
            streamType = 'reasoning';
            content = chunk.delta.text;
            if (debugMode === 1) {
                console.log('🔎 RAW REASONING TOKEN:', {
                    length: content?.length || 0,
                    content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
                    chunk_type: chunk.type
                });
            }
        } else if (chunk.type === 'response.reasoning_summary.delta' && chunk.delta?.text) {
            streamType = 'reasoning';
            content = chunk.delta.text;
            if (debugMode === 1) {
                console.log('🔎 REASONING SUMMARY TOKEN (from object):', {
                    length: content?.length || 0,
                    content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
                    chunk_type: chunk.type
                });
            }
        } else if (chunk.type === 'response.tool_call.delta') {
            streamType = 'tool_call';
            content = JSON.stringify({
                tool_name: chunk.tool_call?.name || 'unknown',
                arguments: chunk.tool_call?.arguments || chunk.delta || ''
            });
            if (debugMode === 1) {
                console.log('🔧 TOOL CALL:', {
                    tool_name: chunk.tool_call?.name || 'unknown',
                    arguments: chunk.tool_call?.arguments || chunk.delta || '',
                    chunk_type: chunk.type,
                    full_chunk: JSON.stringify(chunk, null, 2)
                });
            }
        } else if (chunk.type === 'response.tool_response.delta') {
            streamType = 'tool_response';
            content = JSON.stringify({
                tool_name: chunk.tool_call?.name || 'unknown',
                response: chunk.delta || ''
            });
            if (debugMode === 1) {
                console.log('🌐 TOOL RESPONSE:', {
                    tool_name: chunk.tool_call?.name || 'unknown',
                    response_length: (chunk.delta || '').length,
                    response_preview: (chunk.delta || '').substring(0, 100) + ((chunk.delta || '').length > 100 ? '...' : ''),
                    chunk_type: chunk.type
                });
            }
        } else if (chunk.type === 'response.completed') {
            if (debugMode === 1) {
                console.log('✅ STREAM COMPLETED:', {
                    chunk_type: chunk.type,
                    timestamp: new Date().toISOString()
                });
            }
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        } else if (chunk.type === 'error') {
            if (debugMode === 1) {
                console.error('❌ STREAM ERROR:', {
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
                console.log('❓ UNKNOWN CHUNK TYPE:', {
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