import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PODRequest {
  order_id: string
  method: 'OTP' | 'QR' | 'PHOTO' | 'SIGNATURE'
  otp_code?: string
  qr_payload?: string
  file_data?: {
    name: string
    type: string
    data: string // base64
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { order_id, method, otp_code, qr_payload, file_data }: PODRequest = await req.json()
    
    if (!order_id || !method) {
      throw new Error('order_id and method are required')
    }

    console.log(`POD request for order ${order_id}, method: ${method}`)

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get order details and validate permissions
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(owner_id, name)
      `)
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Validate order status
    if (!['ARRIVED_AT_DESTINATION', 'OUT_FOR_DELIVERY'].includes(order.status)) {
      throw new Error('Order is not ready for delivery confirmation')
    }

    let podData: any = {
      order_id,
      method,
      created_at: new Date().toISOString()
    }

    let fileUrl = null

    // Process based on method
    switch (method) {
      case 'OTP':
        if (!otp_code) {
          throw new Error('OTP code is required')
        }
        
        // Validate OTP (in production, you'd generate and validate actual OTPs)
        // For now, accept any 4-6 digit code
        if (!/^\d{4,6}$/.test(otp_code)) {
          throw new Error('Invalid OTP format')
        }
        
        podData.otp_code = otp_code
        podData.confirmed_by = user.id
        podData.confirmed_at = new Date().toISOString()
        break

      case 'QR':
        if (!qr_payload) {
          throw new Error('QR payload is required')
        }
        
        podData.qr_payload = qr_payload
        podData.confirmed_by = user.id
        podData.confirmed_at = new Date().toISOString()
        break

      case 'PHOTO':
      case 'SIGNATURE':
        if (!file_data) {
          throw new Error('File data is required for photo/signature')
        }

        // Validate courier permission for photo/signature
        if (order.courier_id !== user.id) {
          throw new Error('Only assigned courier can upload photo/signature')
        }

        // Upload file to storage
        const fileName = `${order_id}/${method.toLowerCase()}_${crypto.randomUUID()}.jpg`
        const fileBuffer = Uint8Array.from(atob(file_data.data), c => c.charCodeAt(0))

        const { data: uploadData, error: uploadError } = await supabaseService.storage
          .from('pod-media')
          .upload(fileName, fileBuffer, {
            contentType: file_data.type,
            upsert: false
          })

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`)
        }

        // Get public URL (or signed URL for private buckets)
        const { data: { publicUrl } } = supabaseService.storage
          .from('pod-media')
          .getPublicUrl(fileName)

        fileUrl = publicUrl

        if (method === 'PHOTO') {
          podData.photo_url = fileUrl
        } else {
          podData.signature_url = fileUrl
        }

        // Auto-confirm for photo/signature uploads
        podData.confirmed_by = user.id
        podData.confirmed_at = new Date().toISOString()
        break

      default:
        throw new Error('Invalid POD method')
    }

    // Insert or update POD record
    const { error: podError } = await supabaseService
      .from('order_pod')
      .upsert(podData)

    if (podError) {
      throw new Error(`POD creation failed: ${podError.message}`)
    }

    // Update order status to DELIVERED if confirmed
    if (podData.confirmed_at) {
      const { error: statusError } = await supabaseService
        .rpc('update_order_status_v3', {
          p_order_id: order_id,
          p_to_status: 'DELIVERED',
          p_actor_id: user.id,
          p_actor_role: 'courier',
          p_notes: `Delivery confirmed via ${method}`
        })

      if (statusError) {
        console.error('Status update error:', statusError)
        throw new Error(`Failed to mark order as delivered: ${statusError.message}`)
      }

      // Send delivery confirmation notifications
      try {
        // Notify customer
        await supabaseService.functions.invoke('send-notification', {
          body: {
            user_id: order.user_id,
            title: 'Pedido Entregue!',
            message: `Seu pedido do ${order.restaurant?.name} foi entregue com sucesso`,
            type: 'ORDER_DELIVERED',
            data: { order_id, method }
          }
        })

        // Notify restaurant
        if (order.restaurant?.owner_id) {
          await supabaseService.functions.invoke('send-notification', {
            body: {
              user_id: order.restaurant.owner_id,
              title: 'Pedido Concluído',
              message: `Pedido #${order_id.substr(-8)} foi entregue com sucesso`,
              type: 'ORDER_COMPLETED',
              data: { order_id, method }
            }
          })
        }
      } catch (notificationError) {
        console.error('Notification error:', notificationError)
      }

      // Broadcast delivery confirmation
      await supabaseService
        .channel(`order:${order_id}`)
        .send({
          type: 'broadcast',
          event: 'delivery_confirmed',
          payload: {
            order_id,
            method,
            confirmed_by: user.id,
            timestamp: podData.confirmed_at,
            file_url: fileUrl
          }
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        method,
        confirmed: !!podData.confirmed_at,
        file_url: fileUrl,
        timestamp: podData.confirmed_at || podData.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('POD error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})