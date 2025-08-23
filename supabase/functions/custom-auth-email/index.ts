import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  type: 'signup' | 'recovery' | 'email_change' | 'magic_link';
  email: string;
  token: string;
  redirect_to?: string;
  site_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, token, redirect_to, site_url }: AuthEmailRequest = await req.json();

    let subject = "";
    let html = "";

    switch (type) {
      case 'signup':
        subject = "Confirme sua conta - Trem Bom Delivery";
        html = `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Bem-vindo ao Trem Bom!</h1>
            </div>
            <div style="padding: 40px 20px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Confirme sua conta</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Obrigado por se cadastrar! Clique no botão abaixo para confirmar sua conta:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${site_url}/auth/confirm?token=${token}&redirect_to=${redirect_to || ''}" 
                   style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Confirmar Conta
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px;">
                Se você não se cadastrou, pode ignorar este email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'recovery':
        subject = "Redefinir senha - Trem Bom Delivery";
        html = `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Redefinir Senha</h1>
            </div>
            <div style="padding: 40px 20px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Recuperação de senha</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${site_url}/auth/reset-password?token=${token}&redirect_to=${redirect_to || ''}" 
                   style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Redefinir Senha
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px;">
                Se você não solicitou esta alteração, pode ignorar este email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'magic_link':
        subject = "Seu link de acesso - Trem Bom Delivery";
        html = `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Acesso Rápido</h1>
            </div>
            <div style="padding: 40px 20px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Link de acesso</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Clique no botão abaixo para acessar sua conta:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${site_url}/auth/confirm?token=${token}&redirect_to=${redirect_to || ''}" 
                   style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Acessar Conta
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px;">
                Este link expira em 24 horas.
              </p>
            </div>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "Trem Bom Delivery <noreply@seudominio.com>",
      to: [email],
      subject: subject,
      html: html,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending custom auth email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);