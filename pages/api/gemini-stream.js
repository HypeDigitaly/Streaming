
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    const { model, max_tokens, temperature, userData, systemPrompt, projectName, debugMode, user_id } = req.body;

    // Select API key based on projectName
    const apiKey = process.env[`GEMINI_API_KEY_${projectName?.toUpperCase()}`] || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for project: ${projectName}`);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Get the generative model
    const genModel = genAI.getGenerativeModel({
      model: model || 'gemini-2.5-pro-preview-03-25',
    });

    if (debugMode === 1) {
      console.log('📡 Gemini Payload values:', {
        model,
        max_tokens,
        temperature,
        projectName,
        debugMode,
        systemPrompt,
        user_id
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Create a chat instance with system instruction
    const chat = genModel.startChat({
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: max_tokens || 4096,
        temperature: temperature || 0,
      },
    });

    // Send message and get streamed response
    const response = await chat.sendMessageStream(userData);

    if (debugMode === 1) {
      console.log('📥 Gemini API Response initialized');
    }

    for await (const chunk of response.stream) {
      if (debugMode === 1) {
        console.log('📥 Response Chunk:', JSON.stringify(chunk, null, 2));
      }

      const text = chunk.text();
      if (text) {
        const data = {
          type: 'content',
          content: text
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
        res.flush?.();
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
