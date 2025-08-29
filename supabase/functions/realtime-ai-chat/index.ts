import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
        
        IMPORTANTE: Quando o usuário mencionar um restaurante específico pelo nome, use a função search_restaurants para encontrá-lo primeiro, depois use view_menu para abrir o cardápio.
        
        CONTEXTO DO SISTEMA:
        - O usuário está atualmente navegando no site de delivery
        - Restaurantes disponíveis incluem: pizzarias, hamburguerias, comida japonesa, comida goiana, pamonharias
        - Para adicionar itens ao carrinho, você PRECISA do menu_item_id e restaurant_id corretos
        
        SUAS PRINCIPAIS FUNÇÕES:
        1. BUSCAR RESTAURANTES: Use search_restaurants para encontrar estabelecimentos
        2. ABRIR CARDÁPIOS: Use view_menu com o slug correto do restaurante
        3. GERENCIAR CARRINHO: Adicionar, visualizar, limpar itens
        4. CHECKOUT: Levar o cliente para finalização
        5. SUPORTE: Ajudar com dúvidas e problemas
        
        FLUXO RECOMENDADO:
        1. Se usuário quer "pizzaria X" → search_restaurants("pizza") → view_menu("slug-da-pizzaria")
        2. Se usuário quer adicionar item → Primeiro certifique-se que está no cardápio certo
        3. Se usuário quer finalizar → view_cart primeiro, depois go_to_checkout
        
        RESTAURANTES CONHECIDOS (use estes slugs):
        - "tempero-goiano" para comida goiana
        - "pamonharia-central" para pamonhas
        - "burger-king" para hambúrgueres
        - "pizza-hut" para pizzas
        
        INSTRUÇÕES ESPECÍFICAS:
        - SEMPRE confirme o restaurante antes de adicionar itens
        - Se não souber o menu_item_id, peça para o usuário navegar primeiro
        - Seja proativo em oferecer ajuda para navegar
        - Use linguagem natural e amigável
        
        Responda SEMPRE em português brasileiro.`,
        tools: [
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
            description: "Busca restaurantes por tipo de comida ou localização",
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
            description: "Obtém informações sobre o restaurante atualmente sendo visualizado para ajudar com contexto",
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
            description: "Abre o cardápio de um restaurante específico",
            parameters: {
              type: "object",
              properties: {
                restaurant_slug: { 
                  type: "string", 
                  description: "Slug/identificador do restaurante" 
                }
              },
              required: ["restaurant_slug"]
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