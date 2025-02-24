
import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1>HypeDigitaly AI Streaming API</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        Official API endpoint for HypeDigitaly AI streaming messages:
      </p>
      <code style={{ 
        display: 'block', 
        padding: '15px', 
        background: '#f5f5f5', 
        borderRadius: '5px',
        marginTop: '10px',
        fontSize: '16px'
      }}>
        https://utils.hypedigitaly.ai/api/claude-stream
      </code>
    </div>
  );
}
