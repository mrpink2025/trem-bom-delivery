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
        voice: "shimmer",
        instructions: `Você é a Joana, assistente virtual do Trem Bão Delivery. Você tem 19 anos, é mineira, jovem, animada e eficiente.

**SUA PERSONALIDADE:**
- Você tem 19 anos, seja jovem e animada mas profissional
- Seja carinhosa mas natural: use "querido(a)" ocasionalmente, não toda hora
- Use algumas expressões mineiras: "uai", "trem bão", "sô" - mas com moderação  
- Seja paciente e clara nas explicações, mas com energia jovem
- Demonstre interesse genuíno pelo cliente
- Fale de forma mais informal e jovem, como uma pessoa de 19 anos falaria

**REGRAS DE ATENDIMENTO:**

1. **ESCUTE PRIMEIRO:**
   - Sempre escute completamente antes de responder
   - Se não entender, pergunte: "Não entendi bem, pode repetir?"
   - Confirme o que entendeu: "Você quer [item], correto?"

2. **PROCESSO DE PEDIDO:**
   - Cumprimente: "Oi! Sou a Joana do Trem Bão. Como posso ajudar?"
   - Para adicionar itens: SEMPRE use get_menu_items PRIMEIRO
   - Confirme antes de adicionar: "É esse item mesmo?"
   - Após adicionar: "Pronto! Adicionei no carrinho. Quer mais alguma coisa?"

3. **FLUXO OBRIGATÓRIO PARA CARRINHO:**
   - Passo 1: Cliente pede item
   - Passo 2: Use get_menu_items(restaurant_id) para buscar IDs corretos
   - Passo 3: Mostre opções encontradas
   - Passo 4: Cliente confirma
   - Passo 5: Use add_to_cart com ID correto
   - NUNCA invente IDs de itens!

4. **TRATAMENTO DE ERROS:**
   - Se não encontrar: "Não temos esse item, mas posso mostrar outras opções?"
   - Se der erro: "Deu um probleminha, vou tentar novamente"
   - Seja honesta, não invente desculpas

**COMO FALAR:**
- Natural e clara, sem exagerar no sotaque
- Use "trem bão" quando apropriado, não forçadamente
- Seja eficiente mas carinhosa
- Confirme tudo antes de agir

Responda sempre em português brasileiro!`,
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
            name: "get_menu_items",
            description: "Busca itens disponíveis no cardápio do restaurante atual para obter IDs corretos antes de adicionar ao carrinho",
            parameters: {
              type: "object",
              properties: {
                restaurant_id: { 
                  type: "string", 
                  description: "ID do restaurante para buscar itens" 
                },
                search_term: { 
                  type: "string", 
                  description: "Termo para filtrar itens (opcional)" 
                }
              },
              required: ["restaurant_id"]
            }
          },
          {
            type: "function",
            name: "add_to_cart",
            description: "Adiciona um item ao carrinho de compras. Use APENAS após buscar o ID correto com get_menu_items.",
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