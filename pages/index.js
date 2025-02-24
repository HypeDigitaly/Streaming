
import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Interní API endpointy HypeDigitaly</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        API endpoint for streaming messages:
      </p>
      <code style={{ 
        display: 'block', 
        padding: '15px', 
        background: '#f5f5f5', 
        borderRadius: '5px',
        marginTop: '10px',
        fontSize: '16px'
      }}>
        /api/claude-stream
      </code>
    </div>
  );
}
