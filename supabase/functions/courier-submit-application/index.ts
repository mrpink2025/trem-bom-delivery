import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Courier submit application function started")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SubmissionRequest {
  courier_id?: string
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

    let courierId = user.id
    
    // Se for admin, pode especificar courier_id no body
    if (req.method === 'POST') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profile?.role === 'admin') {
        const body: SubmissionRequest = await req.json()
        if (body.courier_id) {
          courierId = body.courier_id
        }
      }
    }

    console.log(`Processing submission for courier: ${courierId}`)

    // Verificar se existe registro do courier
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('*')
      .eq('id', courierId)
      .single()

    if (courierError || !courier) {
      return new Response(
        JSON.stringify({ error: 'Courier profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se pode submeter (DRAFT ou REJECTED)
    if (!['DRAFT', 'REJECTED'].includes(courier.status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Application can only be submitted when status is DRAFT or REJECTED',
          current_status: courier.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar documentos obrigatórios
    const requiredDocs = ['CNH_FRENTE', 'SELFIE', 'COMPROVANTE_ENDERECO', 'CRLV', 'FOTO_VEICULO', 'FOTO_PLACA']
    
    const { data: documents, error: docsError } = await supabase
      .from('courier_documents')
      .select('type')
      .eq('courier_id', courierId)

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return new Response(
        JSON.stringify({ error: 'Error checking documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingDocTypes = documents?.map(doc => doc.type) || []
    const missingDocs = requiredDocs.filter(doc => !existingDocTypes.includes(doc))

    if (missingDocs.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required documents',
          missing_documents: missingDocs
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Tentar atualizar status para UNDER_REVIEW
    // O trigger validate_courier_submission fará todas as validações
    const { data: updatedCourier, error: updateError } = await supabase
      .from('couriers')
      .update({ 
        status: 'UNDER_REVIEW',
        submitted_at: new Date().toISOString()
      })
      .eq('id', courierId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating courier status:', updateError)
      
      // Se foi erro de validação do trigger, retornar erro específico
      if (updateError.message) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed',
            details: updateError.message
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to submit application' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar notificação para administradores
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminProfiles && adminProfiles.length > 0) {
      const notifications = adminProfiles.map(admin => ({
        user_id: admin.user_id,
        type: 'courier_application',
        title: 'Nova solicitação de entregador',
        message: `${courier.full_name} enviou documentos para análise`,
        data: {
          courier_id: courierId,
          courier_name: courier.full_name
        }
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
    }

    console.log(`Application submitted successfully for courier: ${courierId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application submitted successfully',
        courier: updatedCourier
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in courier submit application:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})