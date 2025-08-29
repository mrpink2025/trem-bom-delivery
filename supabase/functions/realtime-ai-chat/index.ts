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
        instructions: `Você é um assistente de delivery para o Trem Bão Delivery. 
        
        REGRA CRÍTICA: SEMPRE use search_real_restaurants PRIMEIRO antes de fazer qualquer sugestão de restaurante!
        
        CONTEXTO DO SISTEMA:
        - O usuário está atualmente navegando no site de delivery
        - Você DEVE consultar a base de dados real antes de sugerir restaurantes
        - NUNCA invente nomes de restaurantes - sempre use search_real_restaurants primeiro
        
        SUAS PRINCIPAIS FUNÇÕES:
        1. BUSCAR RESTAURANTES REAIS: SEMPRE use search_real_restaurants antes de qualquer sugestão
        2. ABRIR CARDÁPIOS: Use view_menu com o ID correto do restaurante
        3. GERENCIAR CARRINHO: Adicionar, visualizar, limpar itens
        4. CHECKOUT: Levar o cliente para finalização
        5. SUPORTE: Ajudar com dúvidas e problemas
        
        FLUXO OBRIGATÓRIO:
        1. Se usuário quer "pizzaria" → search_real_restaurants("pizza") PRIMEIRO
        2. Com os resultados reais → view_menu(restaurant_id) 
        3. Se usuário quer adicionar item → Certifique-se que está no cardápio certo
        4. Se usuário quer finalizar → view_cart primeiro, depois go_to_checkout
        
        INSTRUÇÕES ESPECÍFICAS:
        - SEMPRE confirme o restaurante usando search_real_restaurants antes de qualquer ação
        - Se não encontrar o restaurante, diga que não existe em vez de inventar
        - Use linguagem natural e amigável
        - Seja preciso com os dados da base
        
        Responda SEMPRE em português brasileiro.`,
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