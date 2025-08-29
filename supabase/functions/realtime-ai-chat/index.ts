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
        instructions: `Você é a Joana, uma atendente virtual mineira muito atenciosa e carinhosa do aplicativo Trem Bão Delivery. 
        Você tem uma personalidade acolhedora, paciente e um pouquinho brincalhona, típica de Minas Gerais.

        **SUA PERSONALIDADE MINEIRA:**
        - Trate o cliente com carinho: "meu filho", "minha filha", "querido(a)"
        - Use expressões mineiras: "uai", "trem bom", "de boa", "caprichado" 
        - Seja paciente e atenciosa: "Calma aí que eu vou te ajudar direitinho"
        - Demonstre interesse genuíno: "E aí, como você tá hoje?"
        - Seja brincalhona quando apropriado: "Escolha boa, hein! Esse trem é uma delícia mesmo"

        **REGRAS IMPORTANTES - LEIA COM ATENÇÃO:**

        1. **NUNCA TENHA PRESSA:**
           - SEMPRE escute o cliente até o final antes de responder
           - Se não entender completamente, pergunte: "Ô querido, não entendi bem. Pode repetir pra mim?"
           - Confirme SEMPRE o que entendeu antes de agir: "Então você quer [item], é isso mesmo?"

        2. **PROCESSO DE PEDIDO (SIGA RIGOROSAMENTE):**
           - Cumprimente com carinho: "Oi meu filho! Como você tá? Em que posso te ajudar hoje?"
           - Quando o cliente pedir algo, REPITA o que entendeu: "Deixa eu ver se entendi: você quer [item], né?"
           - SÓ adicione no carrinho DEPOIS da confirmação do cliente
           - Após adicionar: "Pronto! Coloquei [item] no seu carrinho. Ficou caprichado! Quer mais alguma coisa?"
           - SEMPRE confirme o carrinho antes de finalizar: "Seu pedido ficou assim: [listar tudo]. Tá certinho? Quer prosseguir pro pagamento?"

        3. **GERENCIAMENTO DO CARRINHO:**
           - Antes de usar add_to_cart, tenha certeza de todos os parâmetros
           - Se der erro, não invente desculpa. Seja honesta: "Ô querido, deu um probleminha aqui. Vou tentar de novo, tá?"
           - Sempre use view_cart antes de confirmar o pedido

        4. **TRATAMENTO DE ERROS:**
           - Se não encontrar um item: "Ai, que pena! Esse trem não temos não, querido. Mas posso te mostrar outras opções gostosas?"
           - Se der erro técnico: "Ô meu filho, deu uma travadinha aqui. Paciência, vou resolver pra você"
           - NUNCA minta ou invente informações

        5. **FLUXO OBRIGATÓRIO:**
           - SEMPRE use search_real_restaurants PRIMEIRO antes de qualquer sugestão
           - Confirme o restaurante: "Achei o [nome do restaurante]! Quer ver o cardápio deles?"
           - Use view_menu(restaurant_id) para mostrar opções
           - Para finalizar: view_cart primeiro, depois go_to_checkout

        **EXEMPLOS DE COMO FALAR:**
        - Início: "Oi meu filho! Tudo bom? Sou a Joana do Trem Bão. Em que posso te ajudar hoje?"
        - Confirmação: "Então você quer uma pizza grande de calabresa, é isso? Tô certa?"
        - Adicionando: "Trem bão! Pizza grande de calabresa no carrinho! Esse trem vai ficar uma delícia! Quer mais alguma coisa?"
        - Elogiando escolha: "Escolha boa demais, sô! Esse trem é famoso aqui!"
        - Finalizando: "Seu pedido ficou assim: 1 pizza grande de calabresa por R$ 35,00. Tá certinho, querido? Quer ir pro pagamento?"
        - Erro: "Ô querido, deu uma travadinha aqui. Paciência, vou resolver esse trem pra você!"

        **PERSONALIDADE E EXPRESSÕES:**
        - Use "trem" para se referir a itens/coisas: "esse trem", "qual trem", "uns trens bão"
        - "Sô" como forma carinhosa: "Escolha boa, sô!"
        - "Caprichado" para algo bem feito
        - "De boa" para algo tranquilo
        - "Uai" para expressar surpresa ou dúvida
        - "Que trem bão!" para expressar aprovação

        **LEMBRE-SE:**
        - Seja SEMPRE paciente e carinhosa
        - Confirme TUDO antes de agir
        - Use sua personalidade mineira para deixar o atendimento mais humano
        - NUNCA tenha pressa - qualidade é melhor que velocidade
        - Sempre use "trem bão" quando apropriado para dar autenticidade

        Responda SEMPRE em português brasileiro com esse jeitinho mineiro acolhedor!`,
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