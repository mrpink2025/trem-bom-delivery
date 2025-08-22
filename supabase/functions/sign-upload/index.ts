import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

interface SignUploadRequest {
  kind: 'merchant' | 'courier'
  id: string
  type: string
  filename: string
  mime: string
  size: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { kind, id, type, filename, mime, size }: SignUploadRequest = await req.json()

    if (!kind || !id || !type || !filename || !mime || !size) {
      return new Response(JSON.stringify({ 
        error: 'kind, id, type, filename, mime, and size are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validar MIME types permitidos
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf'
    ]

    if (!allowedMimeTypes.includes(mime.toLowerCase())) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Only JPG, PNG, and PDF files are allowed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validar tamanho (10MB máximo)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (size > maxSize) {
      return new Response(JSON.stringify({ 
        error: 'File too large. Maximum size is 10MB' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar permissões
    if (kind === 'merchant') {
      // Verificar se o merchant pertence ao usuário
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('id, status, owner_user_id')
        .eq('id', id)
        .single()

      if (merchantError || !merchant) {
        return new Response(JSON.stringify({ error: 'Merchant not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar se é o dono ou admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const isOwner = merchant.owner_user_id === user.id
      const isAdmin = profile?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar se pode editar (DRAFT/REJECTED ou admin)
      if (!isAdmin && !['DRAFT', 'REJECTED'].includes(merchant.status)) {
        return new Response(JSON.stringify({ 
          error: 'Documents can only be uploaded in DRAFT or REJECTED status' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validar tipo de documento merchant
      const validMerchantTypes = ['CNPJ', 'CONTRATO_SOCIAL', 'ALVARA', 'VISA_SANITARIA', 'ENDERECO', 'LOGO', 'BANNER']
      if (!validMerchantTypes.includes(type)) {
        return new Response(JSON.stringify({ 
          error: `Invalid document type. Valid types: ${validMerchantTypes.join(', ')}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

    } else {
      // Verificar se o courier é o próprio usuário
      const { data: courier, error: courierError } = await supabase
        .from('couriers')
        .select('id, status')
        .eq('id', id)
        .single()

      if (courierError || !courier) {
        return new Response(JSON.stringify({ error: 'Courier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar se é o próprio courier ou admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const isOwn = courier.id === user.id
      const isAdmin = profile?.role === 'admin'

      if (!isOwn && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar se pode editar (DRAFT/REJECTED ou admin)
      if (!isAdmin && !['DRAFT', 'REJECTED'].includes(courier.status)) {
        return new Response(JSON.stringify({ 
          error: 'Documents can only be uploaded in DRAFT or REJECTED status' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validar tipo de documento courier
      const validCourierTypes = ['CNH_FRENTE', 'CNH_VERSO', 'SELFIE', 'CPF_RG', 'COMPROVANTE_ENDERECO', 'CRLV', 'FOTO_VEICULO', 'FOTO_PLACA']
      if (!validCourierTypes.includes(type)) {
        return new Response(JSON.stringify({ 
          error: `Invalid document type. Valid types: ${validCourierTypes.join(', ')}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Gerar nome de arquivo único
    const fileExtension = filename.split('.').pop()?.toLowerCase()
    const uniqueId = crypto.randomUUID()
    const bucketName = kind === 'merchant' ? 'merchant-docs' : 'courier-docs'
    const filePath = `${id}/${type}_${uniqueId}.${fileExtension}`

    // Criar signed URL para upload
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath, {
        upsert: true // Permitir sobrescrever
      })

    if (signedUrlError || !signedUrl) {
      console.error('Error creating signed URL:', signedUrlError)
      return new Response(JSON.stringify({ 
        error: 'Failed to create upload URL' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Salvar registro do documento na tabela apropriada
    const documentData = {
      [`${kind}_id`]: id,
      type: type,
      file_url: filePath,
      mime: mime,
      size_bytes: size,
      verified: false
    }

    const tableName = kind === 'merchant' ? 'merchant_documents' : 'courier_documents'
    
    // Upsert documento (inserir ou atualizar se já existe)
    const { error: insertError } = await supabase
      .from(tableName)
      .upsert(documentData, {
        onConflict: kind === 'merchant' ? 'merchant_id,type' : 'courier_id,type'
      })

    if (insertError) {
      console.error('Error saving document record:', insertError)
      return new Response(JSON.stringify({ 
        error: 'Failed to save document record' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      upload_url: signedUrl.signedUrl,
      token: signedUrl.token,
      path: signedUrl.path,
      file_path: filePath,
      expires_in: 3600, // 1 hora
      document_type: type,
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': mime,
          'Content-Length': size.toString()
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in sign-upload:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})