import { NextResponse } from 'next/server';
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, projectName, variables, debugMode, updateState } = req.body;

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
        updateState: updateState === 1,
        endpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`
      });
    }

    // Step 1: PATCH variables
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

    const responseText = await response.text();
    let stateData;
    
    try {
      stateData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      stateData = { raw: responseText };
    }
    
    if (!response.ok) {
      if (debugMode === 1) {
        console.error('❌ Voiceflow Variable Update Error:', {
          status: response.status,
          statusText: response.statusText,
          response: stateData
        });
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to update Voiceflow variables',
        status: response.status,
        message: stateData
      });
    }

    if (debugMode === 1) {
      console.log('✅ Voiceflow Variable Update Success:', {
        status: response.status,
        response: stateData
      });
    }

    // Step 2: PUT state (if updateState is enabled)
    if (updateState === 1 && stateData.stack && stateData.storage && stateData.variables) {
      if (debugMode === 1) {
        console.log('📡 Voiceflow State Update Request:', {
          user_id,
          endpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}`,
          stateKeys: {
            stack: stateData.stack?.length || 0,
            storage: Object.keys(stateData.storage || {}).length,
            variables: Object.keys(stateData.variables || {}).length
          }
        });
      }

      const stateResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${user_id}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'versionID': 'production',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          stack: stateData.stack,
          storage: stateData.storage,
          variables: stateData.variables
        })
      });

      const stateResponseText = await stateResponse.text();
      let updatedStateData;
      
      try {
        updatedStateData = stateResponseText ? JSON.parse(stateResponseText) : {};
      } catch (parseError) {
        updatedStateData = { raw: stateResponseText };
      }

      if (!stateResponse.ok) {
        if (debugMode === 1) {
          console.error('❌ Voiceflow State Update Error:', {
            status: stateResponse.status,
            statusText: stateResponse.statusText,
            response: updatedStateData
          });
        }
        
        return res.status(stateResponse.status).json({ 
          error: 'Failed to update Voiceflow state',
          status: stateResponse.status,
          message: updatedStateData,
          variablesUpdated: true
        });
      }

      if (debugMode === 1) {
        console.log('✅ Voiceflow State Update Success:', {
          status: stateResponse.status,
          response: updatedStateData
        });
      }

      return res.status(200).json({ 
        success: true,
        status: stateResponse.status,
        variablesUpdated: true,
        stateUpdated: true,
        message: updatedStateData || 'Variables and state updated successfully'
      });
    }

    res.status(200).json({ 
      success: true,
      status: response.status,
      variablesUpdated: true,
      stateUpdated: false,
      message: stateData || 'Variables updated successfully'
    });
  } catch (error) {
    console.error('Error updating Voiceflow variables:', error);
    res.status(500).json({ error: error.message });
  }
} 