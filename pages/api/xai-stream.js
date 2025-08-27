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
      console.error('❌ XAI Proxy: Invalid method', req.method);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id } = req.body;

    // Select API key based on projectName
    const apiKey = process.env[`XAI_API_KEY_${projectName?.toUpperCase()}`] || process.env.XAI_API_KEY;

    if (!apiKey) {
      throw new Error(`XAI API key not found for project: ${projectName}`);
    }

    // Create OpenAI client with X.AI base URL
    const xai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1'
    });

    // Default model to grok-4 if not specified
    const modelName = model || 'grok-4';

    // Validate that only supported models are used
    const supportedModels = ['grok-4', 'grok-code-fast-1', 'grok-3', 'grok-2-image'];
    if (!supportedModels.includes(modelName)) {
      throw new Error(`Unsupported model: ${modelName}. Supported models: ${supportedModels.join(', ')}`);
    }

    if (debugMode === 1) {
      console.log('📡 XAI Payload values:', {
        model: modelName,
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id
      });

      console.log('📤 XAI Full Request Payload:', JSON.stringify({
        model: modelName,
        max_tokens: max_tokens || 4096,
        temperature: temperature || 0,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userData }
        ],
        stream: true
      }, null, 2));
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Prepare messages array
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userData });

    // Create chat completion with streaming
    const completion = await xai.chat.completions.create({
      model: modelName,
      messages: messages,
      max_tokens: max_tokens || 4096,
      temperature: temperature || 0,
      stream: true,
    });

    if (debugMode === 1) {
      console.log('📥 XAI Stream Response initialized');
    }

    // Process streaming response
    for await (const chunk of completion) {
      if (debugMode === 1) {
        console.log('📥 XAI Chunk:', JSON.stringify(chunk, null, 2));
      }

      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        const streamData = {
          type: 'content',
          content: delta.content
        };

        if (debugMode === 1) {
          console.log('📝 XAI CONTENT DELTA:', {
            length: delta.content?.length || 0,
            content: delta.content?.substring(0, 50) + (delta.content?.length > 50 ? '...' : ''),
            chunk_type: 'chat.completion.chunk'
          });
        }

        res.write(`data: ${JSON.stringify(streamData)}\n\n`);
        res.flush?.();
      }

      // Handle finish reason
      if (chunk.choices?.[0]?.finish_reason) {
        if (debugMode === 1) {
          console.log('✅ XAI Stream finished:', chunk.choices[0].finish_reason);
        }
        
        const finishData = {
          type: 'finish',
          finish_reason: chunk.choices[0].finish_reason
        };
        
        res.write(`data: ${JSON.stringify(finishData)}\n\n`);
        res.flush?.();
        break;
      }
    }

    res.end();

  } catch (error) {
    if (req.body.debugMode === 1) {
      console.error('❌ XAI Stream Error:', error);
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}