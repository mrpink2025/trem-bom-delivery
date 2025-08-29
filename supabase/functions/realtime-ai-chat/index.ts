import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Received request:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Creating OpenAI Realtime session...');
    
    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: `Você é um atendente virtual do aplicativo **Trem Bão Delivery**. 
        Seu papel é conversar com o cliente de forma natural e simpática, ajudando-o a fazer pedidos de comida no aplicativo. 
        
        **REGRAS E COMPORTAMENTO:**

        1. **Contexto e memória curta:**
           - Mantenha o contexto da conversa durante toda a sessão
           - Lembre-se dos itens que o cliente já adicionou ao carrinho
           - Se o cliente mudar de ideia ("troca a pizza grande por média"), atualize o carrinho corretamente

        2. **Fluxo do pedido:**
           - Cumprimente o cliente e pergunte o que ele deseja pedir
           - Reconheça produtos, quantidades e variações (ex: "2 hambúrgueres artesanais, um com cheddar e outro com catupiry")
           - Adicione cada item ao carrinho, confirmando com o cliente antes de prosseguir
           - Pergunte sempre se o cliente deseja adicionar mais algum item
           - Quando o cliente disser que terminou, confirme o resumo do carrinho (todos os itens + valores)
           - Pergunte se deseja prosseguir para o checkout
           - Se sim, finalize o fluxo e direcione para pagamento/checkout

        3. **Comportamento da voz:**
           - Use tom natural, amigável e objetivo
           - Espere o cliente falar antes de responder (não interrompa)
           - Se não entender, peça confirmação de forma educada ("Desculpe, não entendi. Você poderia repetir o item?")
           - Nunca finalize a conversa sem o cliente confirmar

        4. **Exemplo de interação esperada:**
           - Cliente: "Quero uma pizza grande de calabresa"
           - Você: "Ok, adicionei uma pizza grande de calabresa ao carrinho. Deseja acrescentar mais algum item?"
           - Cliente: "Sim, uma coca-cola 2 litros"
           - Você: "Perfeito. Agora temos: 1 pizza grande de calabresa e 1 coca-cola 2 litros. Deseja mais alguma coisa?"
           - Cliente: "Não, pode fechar"
           - Você: "Resumo do seu pedido: 1 pizza grande de calabresa e 1 coca-cola 2 litros. Deseja prosseguir para o checkout e pagamento?"

        5. **Erros e correções:**
           - Se o cliente pedir um item inexistente, responda educadamente: "Esse item não está disponível no momento, deseja escolher outra opção?"
           - Se o cliente não especificar quantidade, assuma 1 unidade

        **FLUXO OBRIGATÓRIO:**
        1. SEMPRE use search_real_restaurants PRIMEIRO antes de qualquer sugestão de restaurante
        2. Com os resultados reais → view_menu(restaurant_id) 
        3. Se usuário quer adicionar item → Certifique-se que está no cardápio certo
        4. Se usuário quer finalizar → view_cart primeiro, depois go_to_checkout

        **OBJETIVO:**
        Guiar o cliente até o checkout de forma clara e sem perder contexto, garantindo que todos os itens estejam confirmados antes de prosseguir.

        Responda SEMPRE em português brasileiro de forma natural e amigável.`,
        tools: [
          {
            type: "function",
            name: "search_real_restaurants",
            description: "SEMPRE use esta função PRIMEIRO para buscar restaurantes REAIS na base de dados antes de fazer qualquer sugestão",
            parameters: {
              type: "object",
              properties: {
                query: { 
                  type: "string", 
                  description: "Termo de busca (nome do restaurante, tipo de comida, etc)" 
                }
              },
              required: ["query"]
            }
          },
          {
            type: "function",
            name: "add_to_cart",
            description: "Adiciona um item ao carrinho de compras. Use quando o usuário quiser pedir algo específico.",
            parameters: {
              type: "object",
              properties: {
                menu_item_id: { 
                  type: "string", 
                  description: "ID do item do menu a ser adicionado" 
                },
                restaurant_id: { 
                  type: "string", 
                  description: "ID do restaurante do item" 
                },
                quantity: { 
                  type: "number", 
                  description: "Quantidade do item (padrão: 1)" 
                },
                special_instructions: { 
                  type: "string", 
                  description: "Instruções especiais para o item" 
                }
              },
              required: ["menu_item_id", "restaurant_id"]
            }
          },
          {
            type: "function",
            name: "view_cart",
            description: "Mostra os itens atualmente no carrinho e o total",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            type: "function",
            name: "go_to_checkout",
            description: "Navega para a página de finalização do pedido",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            type: "function",
            name: "search_restaurants",
            description: "Busca restaurantes por tipo de comida (só use APÓS consultar search_real_restaurants)",
            parameters: {
              type: "object",
              properties: {
                cuisine_type: { 
                  type: "string", 
                  description: "Tipo de culinária (ex: pizza, hambúrguer, japonesa)" 
                },
                location: { 
                  type: "string", 
                  description: "Localização para busca" 
                }
              },
              required: []
            }
          },
          {
            type: "function",
            name: "get_restaurant_info",
            description: "Obtém informações sobre o restaurante atualmente sendo visualizado",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            type: "function",
            name: "clear_cart",
            description: "Remove todos os itens do carrinho",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            type: "function",
            name: "view_menu",
            description: "Abre o cardápio de um restaurante específico usando ID do restaurante",
            parameters: {
              type: "object",
              properties: {
                restaurant_id: { 
                  type: "string", 
                  description: "ID do restaurante obtido de search_real_restaurants" 
                }
              },
              required: ["restaurant_id"]
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Session created successfully:", {
      id: data.id,
      model: data.model,
      expires_at: data.expires_at
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in realtime-ai-chat:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to create OpenAI Realtime session'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});