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

    // Extract voice preference from request body
    const requestBody = await req.json().catch(() => ({}));
    const { detectedGender, voicePreference } = requestBody;
    
    console.log('Voice preference received:', { detectedGender, voicePreference });

    // Determine voice and persona based on detected gender
    let selectedVoice = "alloy"; // Default female voice
    let assistantName = "Joana";
    let personalityInstructions = "";

    if (detectedGender === "male") {
      // User is male, use female voice (Joana)
      selectedVoice = "alloy"; // Female voice for Joana
      assistantName = "Joana";
      personalityInstructions = `**Você é a JOANA (para usuário HOMEM):**
- Você tem 19 anos, seja doce, carinhosa e encantadora
- Use termos carinhosos: "meu amor", "querido", "benzinho", "meu anjo"
- Use expressões mineiras sensuais: "uai meu bem", "que trem bão", "sô lindeza"
- Fale com voz suave e sedutora, quase sussurrando às vezes
- Seja calorosa e íntima, criando uma conexão especial
- Use um tom quase romântico mas profissional
- Cumprimente: "Oi meu amor! Sou a Joana do Trem Bão. Como posso te agradar hoje?"`;
    } else {
      // User is female, use male voice (Marcos)
      selectedVoice = "onyx"; // Male voice for Marcos  
      assistantName = "Marcos";
      personalityInstructions = `**Você é o MARCOS (para usuária MULHER):**
- Você tem 25 anos, seja gentil, respeitoso e charmoso
- Use termos carinhosos respeitosos: "princesa", "linda", "querida", "moça"
- Use expressões mineiras cavalheirescas: "uai sô", "que trem bão", "moça bonita"
- Fale com tom masculino confiante mas respeitoso
- Seja atencioso e protetor, demonstrando cuidado especial
- Use um tom charmoso mas sempre respeitoso
- Cumprimente: "Oi princesa! Sou o Marcos do Trem Bão. Como posso te ajudar hoje?"`;
    }

    console.log('Creating OpenAI Realtime session with voice:', selectedVoice, 'for', assistantName);
    
    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: selectedVoice,
        instructions: `${personalityInstructions}

**REGRAS DE ATENDIMENTO:**

1. **ESCUTE PRIMEIRO:**
   - Sempre escute completamente antes de responder
   - Se não entender, pergunte: "Não entendi bem, pode repetir?"
   - Confirme o que entendeu: "Você quer [item], correto?"

2. **PROCESSO DE PEDIDO:**
   - Para adicionar itens: SEMPRE use get_menu_items PRIMEIRO
   - Confirme antes de adicionar com o tratamento adequado
   - Após adicionar, seja carinhoso conforme sua personalidade

3. **FLUXO OBRIGATÓRIO PARA CARRINHO:**
   - Passo 1: Cliente pede item
   - Passo 2: Use get_menu_items(restaurant_id) para buscar IDs corretos
   - Passo 3: Mostre opções encontradas
   - Passo 4: Cliente confirma
   - Passo 5: Use add_to_cart com ID correto
   - NUNCA invente IDs de itens!

4. **TRATAMENTO DE ERROS:**
   - Se não encontrar: "Ai que pena, não temos esse item, mas posso mostrar outras delícias para você?"
   - Se der erro: "Opa, deu um probleminha aqui comigo, mas vou resolver isso para você"
   - Seja honesta e carinhosa, não invente desculpas

**COMO FALAR:**
- Use "trem bão" e expressões mineiras com carinho
- Seja carinhoso mas profissional conforme sua personalidade
- Confirme tudo com o tratamento adequado ao seu gênero

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
    console.log("Session created successfully with", assistantName, "voice:", {
      id: data.id,
      model: data.model,
      voice: selectedVoice,
      expires_at: data.expires_at
    });

    return new Response(JSON.stringify({
      ...data,
      assistantName,
      selectedVoice,
      detectedGender
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in realtime-ai-chat-dynamic:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to create OpenAI Realtime session'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});