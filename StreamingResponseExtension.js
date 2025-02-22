export const StreamingResponseExtension = {
  name: 'StreamingResponse',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'ext_streamingResponse' ||
    trace.payload?.name === 'ext_streamingResponse',
  render: async ({ trace, element }) => {
    console.log('🚀 StreamingResponseExtension: Starting render', { trace })
    
    const container = document.createElement('div')
    container.className = 'streaming-response-container'

    // Add enhanced styles for debug messages
    container.innerHTML = `
      <style>
        .streaming-response-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 0;
        }
        .response-content {
          font-size: 14px;
          line-height: 1.4;
          color: #374151;
          margin: 0;
          padding: 0;
        }
        .debug-message {
          font-size: 12px;
          padding: 4px 8px;
          margin: 4px 0;
          border-radius: 4px;
          font-family: monospace;
        }
        .debug-info {
          background: #e5f6fd;
          color: #0369a1;
          border: 1px solid #0369a1;
        }
        .debug-error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #dc2626;
        }
      </style>
      <div class="debug-message debug-info">🔄 Initializing streaming response...</div>
      <div class="response-content" id="response-content"></div>
    `

    // Add container to element
    element.appendChild(container)

    // Get reference to content div
    const responseContent = container.querySelector('#response-content')

    // Function to add debug messages to UI
    function addDebugMessage(message, type = 'info') {
      const debugDiv = document.createElement('div')
      debugDiv.className = `debug-message debug-${type}`
      debugDiv.textContent = message
      container.insertBefore(debugDiv, responseContent)
      console.log(`Debug ${type}:`, message)
    }

    // Function to update content
    function updateContent(text) {
      responseContent.textContent += text
      // Scroll to bottom
      element.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }

    // Function to make Claude API call through proxy
    async function callClaudeAPI(payload) {
      try {
        const proxyUrl = 'https://hypedigitaly-streaming.replit.app/api/claude-stream'
        console.log('📤 Extension -> Proxy: Sending request to:', proxyUrl, payload)
        addDebugMessage(`🌐 Connecting to Claude API via proxy: ${proxyUrl}`)

        // Call proxy endpoint
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        console.log('📥 Proxy -> Extension: Stream connection established')
        addDebugMessage('✅ Stream connection established')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let isFirstChunk = true

        while (true) { 
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('📥 Proxy -> Extension: Stream completed')
            addDebugMessage('✅ Streaming completed')
            break
          }

          // Process the stream chunks
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue
            if (line === 'data: [DONE]') continue

            try {
              const data = JSON.parse(line.slice(5))
              console.log('📥 Claude -> Proxy -> Extension: Received chunk', data)
              
              if (isFirstChunk) {
                console.log('📝 First chunk received, starting content display')
                addDebugMessage('🎯 Starting to receive Claude\'s response')
                isFirstChunk = false
              }

              // Handle different event types
              if (data.type === 'content_block_delta' && 
                  data.delta.type === 'text_delta') {
                updateContent(data.delta.text)
              }
            } catch (e) {
              console.warn('⚠️ Error processing chunk:', e)
              // Skip incomplete chunks silently
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in streaming response:', error)
        addDebugMessage(`❌ Error: ${error.message}`, 'error')
        responseContent.textContent = 'Error: Failed to get response from Claude API'
      }
    }

    if (trace.payload) {
      console.log('🎯 UI -> Extension: Received payload', trace.payload)
      await callClaudeAPI({
        model: trace.payload.model,
        max_tokens: trace.payload.max_tokens,
        temperature: trace.payload.temperature,
        userData: trace.payload.userData,
        systemPrompt: trace.payload.systemPrompt
      })
    } else {
      console.error('❌ No payload received from UI')
      addDebugMessage('❌ Error: No payload received', 'error')
    }

    console.log('🏁 StreamingResponseExtension: Completing render')
    window.voiceflow.chat.interact({
      type: 'continue',
    })
  },
}
