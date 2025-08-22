import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { order_id, method, file_type, file_size } = await req.json()
    
    if (!order_id || !method || !file_type) {
      throw new Error('order_id, method, and file_type are required')
    }

    console.log(`Signed upload request for order ${order_id}, method: ${method}`)

    // Use service role for validation
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate order and courier assignment
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('id, status, courier_id, user_id')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    if (order.courier_id !== user.id) {
      throw new Error('Only assigned courier can upload POD media')
    }

    if (!['OUT_FOR_DELIVERY', 'ARRIVED_AT_DESTINATION'].includes(order.status)) {
      throw new Error('Order is not ready for delivery confirmation')
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file_type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed')
    }

    const maxSizeMB = 10
    if (file_size && file_size > maxSizeMB * 1024 * 1024) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
    }

    // Generate unique filename
    const fileExtension = file_type.split('/')[1]
    const fileName = `${order_id}/${method.toLowerCase()}_${crypto.randomUUID()}.${fileExtension}`

    // Create signed URL for upload
    const { data: signedUrlData, error: urlError } = await supabaseService.storage
      .from('pod-media')
      .createSignedUploadUrl(fileName, {
        upsert: false
      })

    if (urlError) {
      throw new Error(`Failed to create signed URL: ${urlError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        upload_url: signedUrlData.signedUrl,
        file_path: fileName,
        expires_in: 3600, // 1 hour
        order_id,
        method
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Signed upload error:', error)
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