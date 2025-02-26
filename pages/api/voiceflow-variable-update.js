import { NextResponse } from 'next/server';

export default async function handler(req, res) {
  const whitelistedDomains = [
    'icuk.cz',
    'kr-ustecky.cz',
    'kr-vysocina.cz',
    'setrivodou.cz',
    'healthytwenty.cz',
    'barber-mnb.cz',
    'teplice.cz',
    'hypedigitaly.ai'
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, projectName, variables, debugMode } = req.body;

    if (!user_id || !variables) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Select API key based on projectName - follows the same pattern as Claude API key selection
    const apiKey = process.env[`VOICEFLOW_API_KEY_${projectName?.toUpperCase()}`] || process.env.VOICEFLOW_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: `API key not found for project: ${projectName}` });
    }

    if (debugMode === 1) {
      console.log('📡 Voiceflow Variable Update Request:', {
        user_id,
        projectName,
        variableKeys: Object.keys(variables),
        endpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`
      });
    }

    const response = await fetch(`https://general-runtime.voiceflow.com/state/user/${user_id}/variables`, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'versionID': 'production',
        'Authorization': apiKey
      },
      body: JSON.stringify(variables)
    });

    const responseData = await response.text();
    
    if (!response.ok) {
      if (debugMode === 1) {
        console.error('❌ Voiceflow Variable Update Error:', {
          status: response.status,
          statusText: response.statusText,
          response: responseData
        });
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to update Voiceflow variables',
        status: response.status,
        message: responseData
      });
    }

    if (debugMode === 1) {
      console.log('✅ Voiceflow Variable Update Success:', {
        status: response.status,
        response: responseData || 'No response body'
      });
    }

    res.status(200).json({ 
      success: true,
      status: response.status,
      message: responseData || 'Variables updated successfully'
    });
  } catch (error) {
    console.error('Error updating Voiceflow variables:', error);
    res.status(500).json({ error: error.message });
  }
} 