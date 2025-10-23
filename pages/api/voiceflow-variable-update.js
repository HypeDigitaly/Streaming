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

    // Server-side logging
    if (debugMode === 1) {
      console.log('✅ PATCH /state/user/{userID}/variables - SUCCESS');
      console.log('📊 PATCH Response Status:', response.status);
      console.log('📦 FULL PATCH API Response:', JSON.stringify(stateData, null, 2));
      console.log('🔍 PATCH Response Analysis:', {
        hasStack: !!stateData.stack,
        hasStorage: !!stateData.storage,
        hasVariables: !!stateData.variables
      });
    }

    // Step 2: PUT state (if updateState is enabled)
    if (updateState === 1) {
      // Ensure stack, storage, and variables exist - use empty if not present
      const putBody = {
        stack: stateData.stack !== undefined ? stateData.stack : [],
        storage: stateData.storage !== undefined ? stateData.storage : {},
        variables: stateData.variables !== undefined ? stateData.variables : {}
      };

      // Server-side logging
      if (debugMode === 1) {
        console.log('📡 Voiceflow State Update Request (PUT):', {
          user_id,
          endpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}`,
          bodyFromPatchResponse: putBody
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
        body: JSON.stringify(putBody)
      });

      const stateResponseText = await stateResponse.text();
      let updatedStateData;
      
      try {
        updatedStateData = stateResponseText ? JSON.parse(stateResponseText) : {};
      } catch (parseError) {
        updatedStateData = { raw: stateResponseText };
      }

      if (!stateResponse.ok) {
        // Server-side logging
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
          variablesUpdated: true,
          ...(debugMode === 1 && {
            debug: {
              patchResponse: {
                status: response.status,
                data: stateData
              },
              putResponse: {
                status: stateResponse.status,
                data: updatedStateData
              }
            }
          })
        });
      }

      // Server-side logging
      if (debugMode === 1) {
        console.log('✅ PUT /state/user/{userID} - SUCCESS');
        console.log('📊 PUT Response Status:', stateResponse.status);
        console.log('📦 FULL PUT API Response:', JSON.stringify(updatedStateData, null, 2));
      }

      return res.status(200).json({ 
        success: true,
        status: stateResponse.status,
        variablesUpdated: true,
        stateUpdated: true,
        message: updatedStateData || 'Variables and state updated successfully',
        ...(debugMode === 1 && {
          debug: {
            patchResponse: {
              status: response.status,
              data: stateData
            },
            putResponse: {
              status: stateResponse.status,
              data: updatedStateData
            }
          }
        })
      });
    }

    res.status(200).json({ 
      success: true,
      status: response.status,
      variablesUpdated: true,
      stateUpdated: false,
      message: stateData || 'Variables updated successfully',
      ...(debugMode === 1 && {
        debug: {
          patchResponse: {
            status: response.status,
            data: stateData
          }
        }
      })
    });
  } catch (error) {
    console.error('Error updating Voiceflow variables:', error);
    res.status(500).json({ error: error.message });
  }
} 