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

    // Convert debugMode and updateState to numbers (handle both string and number inputs)
    const debugModeNum = Number(debugMode);
    const updateStateNum = Number(updateState);

    // Select API key based on projectName - follows the same pattern as Claude API key selection
    const apiKey = process.env[`VOICEFLOW_API_KEY_${projectName?.toUpperCase()}`] || process.env.VOICEFLOW_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: `API key not found for project: ${projectName}` });
    }

    if (debugModeNum === 1) {
      console.log('📡 Voiceflow Variable Update Request:', {
        user_id,
        projectName,
        variableKeys: Object.keys(variables),
        updateState: updateStateNum,
        updateStateType: typeof updateState,
        updateStateConverted: updateStateNum,
        endpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`
      });
      console.log('🔍 REQUEST BODY RECEIVED - RAW VALUES:', {
        debugMode_RAW: debugMode,
        debugMode_TYPE: typeof debugMode,
        updateState_RAW: updateState,
        updateState_TYPE: typeof updateState
      });
      console.log('🔍 REQUEST BODY RECEIVED - CONVERTED VALUES:', {
        debugModeNum,
        debugModeNum_TYPE: typeof debugModeNum,
        updateStateNum,
        updateStateNum_TYPE: typeof updateStateNum
      });
      console.log('🔍 CONDITIONAL CHECK - Will PUT state be executed?', {
        condition: 'updateStateNum === 1',
        updateStateNum_value: updateStateNum,
        will_execute_PUT: updateStateNum === 1
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
      if (debugModeNum === 1) {
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
    if (debugModeNum === 1) {
      console.log('✅ PATCH /state/user/{userID}/variables - SUCCESS');
      console.log('📊 PATCH Response Status:', response.status);
      console.log('📦 FULL PATCH API Response:', JSON.stringify(stateData, null, 2));
      const attributes = stateData.attributes || stateData;
      console.log('🔍 PATCH Response Analysis:', {
        hasAttributes: !!stateData.attributes,
        hasStack: !!attributes.stack,
        hasStorage: !!attributes.storage,
        hasVariables: !!attributes.variables,
        stackLength: attributes.stack?.length,
        storageKeys: Object.keys(attributes.storage || {}).length,
        variableKeys: Object.keys(attributes.variables || {}).length
      });
    }

    // Add 5 second delay before PUT request
    if (debugModeNum === 1) {
      console.log('⏳ Waiting 5 seconds before executing PUT request...');
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (debugModeNum === 1) {
      console.log('✅ Delay complete, proceeding with PUT request check');
    }

    // Step 2: PUT state (if updateState is enabled)
    if (debugModeNum === 1) {
      console.log('🔍 STEP 2 - PUT STATE CHECK:', {
        updateStateNum,
        condition: 'updateStateNum === 1',
        result: updateStateNum === 1,
        will_execute: updateStateNum === 1 ? 'YES - Executing PUT request' : 'NO - Skipping PUT request'
      });
    }
    
    if (updateStateNum === 1) {
      if (debugModeNum === 1) {
        console.log('✅ PUT STATE - CONDITION MET! Proceeding with PUT request...');
      }
      
      // Ensure stack, storage, and variables exist - use empty if not present
      // Extract from attributes object if present, otherwise from root level
      const attributes = stateData.attributes || stateData;
      const putBody = {
        stack: attributes.stack !== undefined ? attributes.stack : [],
        storage: attributes.storage !== undefined ? attributes.storage : {},
        variables: attributes.variables !== undefined ? attributes.variables : {}
      };

      // Server-side logging
      if (debugModeNum === 1) {
        console.log('');
        console.log('='.repeat(80));
        console.log('🚀 EXECUTING PUT REQUEST TO UPDATE STATE');
        console.log('='.repeat(80));
        console.log('📡 Endpoint:', `https://general-runtime.voiceflow.com/state/user/${user_id}`);
        console.log('📦 PUT Request Body Components:');
        console.log('  - stack (length):', putBody.stack?.length || 0);
        console.log('  - stack:', JSON.stringify(putBody.stack, null, 2));
        console.log('  - storage (keys count):', Object.keys(putBody.storage || {}).length);
        console.log('  - storage:', JSON.stringify(putBody.storage, null, 2));
        console.log('  - variables (keys count):', Object.keys(putBody.variables || {}).length);
        console.log('  - variables (keys):', Object.keys(putBody.variables));
        console.log('');
        console.log('🔍 COMPLETE PUT REQUEST BODY (EXACT JSON BEING SENT):');
        console.log(JSON.stringify(putBody, null, 2));
        console.log('');
        console.log('⚠️ VERIFICATION: This is the EXACT stringified JSON that will be sent in body:');
        console.log('📄 Raw JSON String Length:', JSON.stringify(putBody).length, 'characters');
        console.log('='.repeat(80));
      }
      
      // Create the exact JSON string that will be sent
      const putBodyJSON = JSON.stringify(putBody);

      const stateResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${user_id}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'versionID': 'production',
          'Authorization': apiKey
        },
        body: putBodyJSON
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
        if (debugModeNum === 1) {
          console.error('');
          console.error('='.repeat(80));
          console.error('❌ PUT REQUEST FAILED');
          console.error('='.repeat(80));
          console.error('Status:', stateResponse.status);
          console.error('Status Text:', stateResponse.statusText);
          console.error('Response:', JSON.stringify(updatedStateData, null, 2));
          console.error('='.repeat(80));
        }
        
        return res.status(stateResponse.status).json({
          error: 'Failed to update Voiceflow state',
          success: false,
          status: stateResponse.status,
          variablesUpdated: true,
          stateUpdated: false,
          patchResponse: {
            status: response.status,
            data: stateData
          },
          putResponse: {
            status: stateResponse.status,
            data: updatedStateData,
            error: true
          },
          ...(debugModeNum === 1 && {
            debug: {
              message: 'PATCH succeeded but PUT failed',
              patchEndpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`,
              putEndpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}`,
              putRequestBody: putBody
            }
          })
        });
      }

      // Server-side logging
      if (debugModeNum === 1) {
        console.log('');
        console.log('='.repeat(80));
        console.log('✅ PUT REQUEST SUCCESSFUL');
        console.log('='.repeat(80));
        console.log('📊 PUT Response Status:', stateResponse.status);
        console.log('📦 PUT Response Data Structure:');
        console.log('  - Has stack:', !!updatedStateData.stack, '(length:', updatedStateData.stack?.length + ')');
        console.log('  - Has storage:', !!updatedStateData.storage, '(keys:', Object.keys(updatedStateData.storage || {}).length + ')');
        console.log('  - Has variables:', !!updatedStateData.variables, '(keys:', Object.keys(updatedStateData.variables || {}).length + ')');
        console.log('📦 FULL PUT API Response:', JSON.stringify(updatedStateData, null, 2));
        console.log('');
        console.log('📤 SUMMARY - FINAL RESPONSE TO FRONTEND:');
        console.log('  ✅ PATCH /variables - Status:', response.status);
        console.log('  ✅ PUT /state - Status:', stateResponse.status);
        console.log('  📊 Both requests completed successfully');
        console.log('='.repeat(80));
        console.log('');
      }

      return res.status(200).json({
        success: true,
        status: stateResponse.status,
        variablesUpdated: true,
        stateUpdated: true,
        patchResponse: {
          status: response.status,
          data: stateData
        },
        putResponse: {
          status: stateResponse.status,
          data: updatedStateData
        },
        ...(debugModeNum === 1 && {
          debug: {
            message: 'Both PATCH and PUT requests completed successfully',
            patchEndpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}/variables`,
            putEndpoint: `https://general-runtime.voiceflow.com/state/user/${user_id}`,
            putRequestBody: putBody
          }
        })
      });
    }

    // This block only executes if updateStateNum !== 1
    if (debugModeNum === 1) {
      console.log('ℹ️ FINAL RESPONSE - updateState was NOT 1, returning without PUT execution');
      console.log('🔍 FINAL RESPONSE - Returning data:', {
        success: true,
        variablesUpdated: true,
        stateUpdated: false,
        updateStateNum
      });
    }
    
    res.status(200).json({
      success: true,
      status: response.status,
      variablesUpdated: true,
      stateUpdated: false,
      message: stateData || 'Variables updated successfully',
      ...(debugModeNum === 1 && {
        debug: {
          patchResponse: {
            status: response.status,
            data: stateData
          },
          updateStateReceived: updateStateNum,
          putExecuted: false
        }
      })
    });
  } catch (error) {
    console.error('Error updating Voiceflow variables:', error);
    res.status(500).json({ error: error.message });
  }
} 