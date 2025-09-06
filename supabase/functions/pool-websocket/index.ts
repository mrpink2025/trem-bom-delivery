import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('[POOL-WEBSOCKET] Starting server...')

serve(async (req) => {
  console.log('[POOL-WEBSOCKET] Request received:', req.method, req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[POOL-WEBSOCKET] Handling CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }
  
  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""
  
  console.log('[POOL-WEBSOCKET] Upgrade header:', upgradeHeader)

  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.log('[POOL-WEBSOCKET] Not a websocket request, returning 426')
    return new Response("Expected websocket", { status: 426, headers: corsHeaders })
  }

  console.log('[POOL-WEBSOCKET] Upgrading to WebSocket...')

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log(`[POOL-WEBSOCKET] WebSocket upgraded successfully`)

    socket.onopen = () => {
      console.log(`[POOL-WEBSOCKET] ✅ Connection opened`)
      socket.send(JSON.stringify({ type: 'connected' }))
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log(`[POOL-WEBSOCKET] 📥 Message received:`, message.type)

        if (message.type === 'join_match') {
          console.log(`[POOL-WEBSOCKET] User joining match:`, message.matchId)
          socket.send(JSON.stringify({ 
            type: 'joined', 
            matchId: message.matchId
          }))
        }

        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
        }

      } catch (error) {
        console.error(`[POOL-WEBSOCKET] Error parsing message:`, error)
      }
    }

    socket.onclose = (event) => {
      console.log(`[POOL-WEBSOCKET] 🔌 Connection closed, code: ${event.code}`)
    }

    socket.onerror = (error) => {
      console.error(`[POOL-WEBSOCKET] ❌ Socket error:`, error)
    }

    return response
  } catch (error) {
    console.error('[POOL-WEBSOCKET] ❌ Error upgrading to WebSocket:', error)
    return new Response("WebSocket upgrade failed", { status: 500, headers: corsHeaders })
  }
})