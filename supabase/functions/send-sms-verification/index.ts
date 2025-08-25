import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const infobipApiKey = Deno.env.get('INFOBIP_API_KEY');
const infobipBaseUrl = 'https://rpezx1.api.infobip.com';

interface SendSMSRequest {
  phone: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code }: SendSMSRequest = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: 'Phone and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!infobipApiKey) {
      console.error('INFOBIP_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Format for Brazilian number (+55)
    const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

    const smsPayload = {
      messages: [
        {
          destinations: [
            {
              to: formattedPhone
            }
          ],
          from: "TremBao",
          text: `Seu código de verificação do Trem Bão é: ${code}. Válido por 5 minutos. Não compartilhe este código.`
        }
      ]
    };

    console.log('Sending SMS to:', formattedPhone);

    const response = await fetch(`${infobipBaseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${infobipApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Infobip SMS error:', result);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS',
          details: result
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: result.messages?.[0]?.messageId,
        status: result.messages?.[0]?.status?.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-sms-verification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);