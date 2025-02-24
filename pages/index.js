
import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API Documentation</h1>
      
      <section>
        <h2>Endpoints</h2>
        
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '5px', marginTop: '20px' }}>
          <h3>POST /api/claude-stream</h3>
          <p><strong>Description:</strong> Streams Claude AI responses using Server-Sent Events (SSE)</p>
          
          <h4>Headers Required:</h4>
          <ul>
            <li><code>X-API-Key</code>: Your API key for authentication</li>
            <li><code>Content-Type</code>: application/json</li>
          </ul>
          
          <h4>Request Body:</h4>
          <pre style={{ background: '#e0e0e0', padding: '10px', borderRadius: '3px' }}>
{`{
  "model": "claude-3-sonnet-20241022",  // optional
  "max_tokens": 4096,                   // optional
  "temperature": 0,                     // optional
  "userData": "Your prompt here",       // required
  "systemPrompt": "System instructions" // required
}`}
          </pre>
          
          <h4>CORS Access:</h4>
          <p>Available only for the following domains:</p>
          <ul>
            <li>kr-vysocina.cz</li>
            <li>kr-ustecky.cz</li>
            <li>teplice.cz</li>
            <li>setrivodou.cz</li>
            <li>barber-mnb.cz</li>
            <li>healthytwenty.cz</li>
            <li>icuk.cz</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
