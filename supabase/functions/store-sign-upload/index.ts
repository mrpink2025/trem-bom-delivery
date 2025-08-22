import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Store sign upload function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SignUploadRequest {
  fileName: string
  fileType: string
  fileSize: number
  docType: string
  storeId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: SignUploadRequest = await req.json()
    
    if (!body.fileName || !body.fileType || !body.fileSize || !body.docType) {
      return new Response(
        JSON.stringify({ error: 'fileName, fileType, fileSize, and docType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating signed URL for user ${user.id}, docType: ${body.docType}`)

    // Validações de segurança
    const allowedMimes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'application/pdf'
    ]
    
    if (!allowedMimes.includes(body.fileType)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid file type',
          allowed_types: allowedMimes
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar tamanho (10MB máximo)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (body.fileSize > maxSize) {
      return new Response(
        JSON.stringify({ 
          error: 'File too large',
          max_size: maxSize,
          provided_size: body.fileSize
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar bucket baseado no tipo de documento
    let bucket = 'restaurant-docs'
    if (body.docType === 'logo') {
      bucket = 'restaurants'
    }

    // Gerar nome único do arquivo
    const fileExt = body.fileName.split('.').pop() || 'bin'
    const uniqueId = crypto.randomUUID()
    const filePath = `${user.id}/${body.docType}_${uniqueId}.${fileExt}`

    // Gerar signed URL para upload
    const { data: signedUrl, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, {
        upsert: true // Permite sobrescrever
      })

    if (signError) {
      console.error('Error creating signed URL:', signError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate upload URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Signed URL generated for path: ${filePath}`)

    return new Response(
      JSON.stringify({
        success: true,
        upload_url: signedUrl.signedUrl,
        path: filePath,
        bucket: bucket,
        expires_in: 3600, // 1 hora
        metadata: {
          docType: body.docType,
          original_filename: body.fileName,
          fileType: body.fileType,
          fileSize: body.fileSize
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in store sign upload:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})