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

    // Always log detailed information to debug the current issue
    console.log('📡 VOICEFLOW API REQUEST RECEIVED');
    console.log('📡 Voiceflow Variable Update Request:', {
      user_id,
      projectName,
      variableKeys: Object.keys(variables),
      endpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`
    });
    
    console.log('📤 Voiceflow variables to update:', variables);
    
    // Create the actual API request that will be sent to Voiceflow
    const voiceflowRequestBody = JSON.stringify(variables);
    console.log('📤 EXACT BODY SENT TO VOICEFLOW API:', voiceflowRequestBody);

    // Create and log the actual CURL command (with masked API key)
    const maskedKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log('\n🔄 EXACT VOICEFLOW PATCH CURL COMMAND:');
    console.log(`curl --request PATCH \\
     --url https://general-runtime.voiceflow.com/state/user/${user_id}/variables \\
     --header 'Authorization: ${maskedKey}' \\
     --header 'accept: application/json' \\
     --header 'content-type: application/json' \\
     --header 'versionID: production' \\
     --data '${voiceflowRequestBody}'`);

    // Log the complete request details
    console.log('📤 COMPLETE VOICEFLOW API REQUEST:', {
      url: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`,
      method: 'PATCH',
      headers: {
        'Authorization': `${maskedKey}`,
        'accept': 'application/json',
        'content-type': 'application/json',
        'versionID': 'production'
      },
      body: voiceflowRequestBody
    });

    // Add a very visible log marker that will be easy to spot in any log output
    console.log('\n\n');
    console.log('**************************************************************');
    console.log('**************** VOICEFLOW PATCH REQUEST START ***************');
    console.log('**************************************************************');
    console.log('\n');
    
    // Log complete request details with easy-to-spot formatting
    console.log(`🔴 SENDING PATCH REQUEST TO: https://general-runtime.voiceflow.com/state/user/${user_id}/variables`);
    console.log('🔴 REQUEST METHOD: PATCH');
    console.log('🔴 REQUEST HEADERS:', {
      'Authorization': `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
      'accept': 'application/json',
      'content-type': 'application/json',
      'versionID': 'production'
    });
    console.log('🔴 REQUEST BODY:', JSON.stringify(variables, null, 2));
    
    const response = await fetch(`https://general-runtime.voiceflow.com/state/user/${user_id}/variables`, {
      method: 'PATCH',
      headers: {
        'Authorization': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
        'versionID': 'production'
      },
      body: JSON.stringify(variables)
    });

    // Handle text or JSON response appropriately
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    // Always log the complete response with clear formatting
    console.log('\n🟢 COMPLETE VOICEFLOW API RESPONSE:');
    console.log('🟢 Status:', response.status, response.statusText);
    console.log('🟢 Headers:', Object.fromEntries([...response.headers.entries()]));
    console.log('🟢 Body:', responseData);
    
    // Log the raw response in JSON format
    console.log('\n🟢 RAW VOICEFLOW API RESPONSE JSON:');
    if (typeof responseData === 'object') {
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      console.log(responseData);
    }
    
    console.log('\n');
    console.log('**************************************************************');
    console.log('**************** VOICEFLOW PATCH REQUEST END *****************');
    console.log('**************************************************************');
    console.log('\n\n');
    
    if (!response.ok) {
      console.error('❌ Voiceflow Variable Update Error:', {
        status: response.status,
        statusText: response.statusText,
        response: responseData
      });
      
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

    // Include request and response details in the response body
    // This will make the logs visible in the client-side console too
    res.status(200).json({ 
      success: true,
      status: response.status,
      message: responseData || 'Variables updated successfully',
      debug_info: {
        request: {
          url: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`,
          method: 'PATCH',
          headers: {
            'Authorization': `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
            'accept': 'application/json',
            'content-type': 'application/json',
            'versionID': 'production'
          },
          body: variables
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseData
        }
      }
    });
  } catch (error) {
    console.error('Error updating Voiceflow variables:', error);
    res.status(500).json({ error: error.message });
  }
} 