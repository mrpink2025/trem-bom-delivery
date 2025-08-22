import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Courier sign upload function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SignUploadRequest {
  type: 'CNH_FRENTE' | 'CNH_VERSO' | 'SELFIE' | 'CPF_RG' | 'COMPROVANTE_ENDERECO' | 'CRLV' | 'FOTO_VEICULO' | 'FOTO_PLACA'
  filename: string
  mime: string
  size: number
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
    
    if (!body.type || !body.filename || !body.mime || !body.size) {
      return new Response(
        JSON.stringify({ error: 'type, filename, mime, and size are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating signed URL for user ${user.id}, type: ${body.type}`)

    // Validações de segurança
    const allowedMimes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'application/pdf'
    ]
    
    if (!allowedMimes.includes(body.mime)) {
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
    if (body.size > maxSize) {
      return new Response(
        JSON.stringify({ 
          error: 'File too large',
          max_size: maxSize,
          provided_size: body.size
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se courier pode fazer upload (DRAFT ou REJECTED)
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('status')
      .eq('id', user.id)
      .single()

    if (courierError) {
      // Se não existe courier ainda, criar um DRAFT
      if (courierError.code === 'PGRST116') {
        console.log('Creating new courier profile for user:', user.id)
        
        // Obter dados básicos do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', user.id)
          .single()

        const { error: createError } = await supabase
          .from('couriers')
          .insert({
            id: user.id,
            full_name: profile?.full_name || 'Nome não informado',
            birth_date: '1990-01-01', // Placeholder - será atualizado no wizard
            cpf: '00000000000', // Placeholder - será atualizado no wizard  
            phone: profile?.phone || '00000000000', // Placeholder
            status: 'DRAFT'
          })

        if (createError) {
          console.error('Error creating courier profile:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to initialize courier profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        console.error('Error fetching courier:', courierError)
        return new Response(
          JSON.stringify({ error: 'Error checking courier status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (courier && !['DRAFT', 'REJECTED'].includes(courier.status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot upload documents in current status',
          current_status: courier.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determinar bucket baseado no tipo
    let bucket = 'courier-docs'
    if (body.type === 'SELFIE') {
      bucket = 'courier-photos'
    }

    // Gerar nome único do arquivo
    const fileExt = body.filename.split('.').pop() || 'bin'
    const uniqueId = crypto.randomUUID()
    const filePath = `${user.id}/${body.type}_${uniqueId}.${fileExt}`

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
          type: body.type,
          original_filename: body.filename,
          mime: body.mime,
          size: body.size
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in courier sign upload:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})