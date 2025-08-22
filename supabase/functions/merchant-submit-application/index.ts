import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

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

    const { merchant_id } = await req.json()

    if (!merchant_id) {
      return new Response(JSON.stringify({ error: 'merchant_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se o merchant pertence ao usuário
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, status, owner_user_id')
      .eq('id', merchant_id)
      .eq('owner_user_id', user.id)
      .single()

    if (merchantError || !merchant) {
      return new Response(JSON.stringify({ error: 'Merchant not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se está em status que permite submissão
    if (!['DRAFT', 'REJECTED'].includes(merchant.status)) {
      return new Response(JSON.stringify({ 
        error: 'Merchant must be in DRAFT or REJECTED status to submit' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar documentos obrigatórios
    const requiredDocs = ['CNPJ', 'CONTRATO_SOCIAL', 'ALVARA', 'VISA_SANITARIA', 'ENDERECO', 'LOGO']
    
    const { data: existingDocs } = await supabase
      .from('merchant_documents')
      .select('type')
      .eq('merchant_id', merchant_id)

    const existingDocTypes = existingDocs?.map(doc => doc.type) || []
    const missingDocs = requiredDocs.filter(doc => !existingDocTypes.includes(doc))

    if (missingDocs.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Documentos obrigatórios faltando',
        missing_documents: missingDocs
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Atualizar status para UNDER_REVIEW
    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        status: 'UNDER_REVIEW',
        submitted_at: new Date().toISOString(),
        rejection_reason: null // Limpar motivo de rejeição anterior
      })
      .eq('id', merchant_id)

    if (updateError) {
      console.error('Error updating merchant status:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to submit application' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      table_name: 'merchants',
      operation: 'MERCHANT_SUBMITTED',
      record_id: merchant_id,
      user_id: user.id,
      new_values: {
        status: 'UNDER_REVIEW',
        submitted_at: new Date().toISOString()
      }
    })

    // Notificar admins (opcional - implementar depois se necessário)
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'merchant_submitted',
          merchant_id: merchant_id,
          message: 'Nova solicitação de lojista para análise'
        }
      })
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
      // Não falhar a operação por causa da notificação
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Application submitted successfully',
      merchant_id: merchant_id,
      status: 'UNDER_REVIEW',
      submitted_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in merchant-submit-application:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})