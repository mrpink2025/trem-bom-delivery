import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`[POOL-WS-SIMPLE] ${req.method} ${req.url}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const upgrade = req.headers.get('upgrade')
  if (upgrade?.toLowerCase() !== 'websocket') {
    return new Response('WebSocket upgrade required', { status: 400 })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('[POOL-WS-SIMPLE] WebSocket upgrade successful')

    socket.onopen = () => {
      console.log('[POOL-WS-SIMPLE] Connection opened')
      socket.send(JSON.stringify({
        type: 'connection_ready',
        message: 'WebSocket connected successfully'
      }))
    }

    socket.onmessage = (event) => {
      console.log('[POOL-WS-SIMPLE] Message received:', event.data)
      try {
        const data = JSON.parse(event.data)
        socket.send(JSON.stringify({
          type: 'echo',
          originalMessage: data,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.error('[POOL-WS-SIMPLE] Error parsing message:', e)
      }
    }

    socket.onclose = (event) => {
      console.log(`[POOL-WS-SIMPLE] Connection closed: ${event.code}`)
    }

    socket.onerror = (error) => {
      console.error('[POOL-WS-SIMPLE] WebSocket error:', error)
    }

    return response
  } catch (error) {
    console.error('[POOL-WS-SIMPLE] Upgrade failed:', error)
    return new Response('WebSocket upgrade failed', { status: 500 })
  }
})