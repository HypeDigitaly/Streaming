
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, response } = req.body;
  const projectName = req.headers['x-project-name'];
  
  const voiceflowApiKey = process.env[`VOICEFLOW_API_KEY_${projectName?.toUpperCase()}`] || process.env.VOICEFLOW_API_KEY;

  try {
    const patchResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${user_id}/variables`, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'versionID': 'production',
        'Authorization': voiceflowApiKey
      },
      body: JSON.stringify({
        "LLM_Main_Response": response
      })
    });

    if (!patchResponse.ok) {
      throw new Error('Failed to update Voiceflow variables');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating Voiceflow variables:', error);
    res.status(500).json({ error: 'Failed to update Voiceflow variables' });
  }
}
