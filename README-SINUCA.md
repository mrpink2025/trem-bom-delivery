# Sinuca Trem Bão - White Label Billiards Game

Uma versão white-label do jogo de sinuca para o Trem Bão Delivery, com branding customizável, eventos para sistema de créditos e otimizada para performance.

## 🚀 Instalação e Build

```bash
# Instalar dependências
npm install

# Build para produção
npm run build

# Servir localmente para testes
npm run dev
```

## 🎮 Modos de Uso

### 1. Standalone (HTML puro)
Acesse: `/jogos/sinuca/index.html`

### 2. Componente React
```jsx
import SinucaTremBao from '@/components/SinucaTremBao';

function App() {
  const handleGameEvent = (eventType, payload) => {
    console.log('Game event:', eventType, payload);
  };

  return (
    <SinucaTremBao 
      config={{
        uid: 'user123',
        logoUrl: '/custom-logo.png',
        logoScale: 0.8,
        targetOrigin: 'https://meudominio.com'
      }}
      onGameEvent={handleGameEvent}
    />
  );
}
```

## 🔧 Parâmetros de URL

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `uid` | string | 'guest' | ID único do usuário |
| `jwt` | string | '' | Token JWT (apenas propagado) |
| `sig` | string | '' | Assinatura de segurança |
| `returnUrl` | string | '' | URL de retorno |
| `logoUrl` | string | '/assets/brand/trembao-logo.png' | URL do logo |
| `logoScale` | number | 0.6 | Escala do logo (0-1) |
| `logoOpacity` | number | 0.9 | Opacidade do logo (0-1) |
| `logoRotation` | number | 0 | Rotação do logo em graus |
| `targetOrigin` | string | window.location.origin | Domínio para postMessage |

### Exemplo de URL:
```
/jogos/sinuca/?uid=user123&logoScale=0.8&logoOpacity=0.7&logoRotation=15
```

## 📡 Eventos (postMessage)

Todos os eventos são enviados via `window.postMessage()` para o parent window com o prefixo `sinuca-`.

### gameStart
Disparado ao iniciar uma partida.
```javascript
{
  type: 'sinuca-gameStart',
  uid: 'user123',
  ts: 1234567890,
  gameMode: '1P' | '2P'
}
```

### shot
Disparado a cada tacada.
```javascript
{
  type: 'sinuca-shot',
  uid: 'user123',
  ts: 1234567890,
  power: 0.75,    // 0-1
  angle: 1.57     // radianos
}
```

### foul
Disparado quando ocorrer uma falta.
```javascript
{
  type: 'sinuca-foul',
  uid: 'user123',
  ts: 1234567890,
  reason: 'cue_ball_pocketed' | 'no_ball_hit' | 'wrong_ball_first'
}
```

### potted
Disparado quando uma bola é encaçapada.
```javascript
{
  type: 'sinuca-potted',
  uid: 'user123',
  ts: 1234567890,
  ball: {
    number: 8,
    type: 'EIGHT'
  }
}
```

### frameEnd
Disparado ao final de cada frame.
```javascript
{
  type: 'sinuca-frameEnd',
  uid: 'user123',
  ts: 1234567890,
  winner: 1,           // 1 ou 2
  durationSec: 120,    // duração em segundos
  fouls: 2             // total de faltas
}
```

### heartbeat
Enviado a cada 30 segundos durante o jogo.
```javascript
{
  type: 'sinuca-heartbeat',
  uid: 'user123',
  ts: 1234567890,
  playtimeSec: 150     // tempo total de jogo
}
```

## 🎯 Implementação no Parent Window

```javascript
// Listener para eventos do jogo
window.addEventListener('message', (event) => {
  // IMPORTANTE: Sempre verificar a origem por segurança
  if (event.origin !== 'https://seudominio.com') return;
  
  const { type, uid, ts, ...payload } = event.data;
  
  if (type?.startsWith('sinuca-')) {
    const eventType = type.replace('sinuca-', '');
    
    switch (eventType) {
      case 'gameStart':
        console.log('Jogo iniciado:', payload);
        // Implementar lógica de início
        break;
        
      case 'shot':
        console.log('Tacada:', payload);
        // Implementar sistema de pontuação
        break;
        
      case 'potted':
        console.log('Bola encaçapada:', payload);
        // Implementar recompensas
        break;
        
      case 'frameEnd':
        console.log('Frame finalizado:', payload);
        // Implementar ranking/créditos
        break;
        
      case 'heartbeat':
        // Implementar anti-AFK
        updateUserActivity(uid);
        break;
    }
  }
}, false);
```

## 🎨 Customização do Logo

### Via URL:
```
/jogos/sinuca/?logoUrl=https://cdn.exemplo.com/logo.png&logoScale=0.8
```

### Via Props (React):
```jsx
<SinucaTremBao 
  config={{
    logoUrl: '/custom-logo.png',
    logoScale: 0.8,
    logoOpacity: 0.9,
    logoRotation: 0
  }}
/>
```

### Requisitos do Logo:
- Formato: PNG com transparência
- Resolução recomendada: 512x512px
- Tamanho máximo: 100KB
- O logo será centralizado na mesa e respeitará as margens das caçapas

## ⚡ Performance

### Otimizações Implementadas:
- Render loop otimizado com requestAnimationFrame
- Canvas rendering eficiente
- Lazy loading de assets
- Pausar automaticamente quando a aba não está visível

### Métricas Alvo:
- **Carregamento**: < 3s em conexão 4G
- **FPS**: 60fps desktop, 30-60fps mobile
- **Bundle size**: < 5MB total

## 🔊 Sistema de Som

### Eventos de Áudio:
- Tacada na bola
- Bola encaçapada
- Colisão com a quina
- Som ambiente (opcional)

### Controles:
- Toggle mute/unmute
- Configurações de volume nas opções

## 🎯 Modos de Jogo

### 1 Jogador (vs IA):
- Dificuldades: Easy, Medium, Hard
- IA com comportamento realista
- Sistema de progresso

### 2 Jogadores (Local):
- Turnos alternados
- Pontuação individual
- Sistema de faltas

## 🔐 Segurança

### postMessage:
```javascript
// ✅ CORRETO - sempre especificar targetOrigin
window.parent.postMessage(eventData, 'https://seudominio.com');

// ❌ INCORRETO - nunca usar '*'
window.parent.postMessage(eventData, '*');
```

### JWT:
- O JWT é recebido via URL mas não validado no client
- Apenas propagado nos eventos para validação no backend

## 🏆 Extras (Se Implementados)

### Leaderboard Local:
```javascript
// Salvo no localStorage com namespace por uid
const leaderboard = JSON.parse(
  localStorage.getItem(`sinuca_leaderboard_${uid}`) || '[]'
);
```

### Skins Desbloqueáveis:
```javascript
// Skins cosméticas salvas por usuário
const userSkins = JSON.parse(
  localStorage.getItem(`sinuca_skins_${uid}`) || '{"unlocked": ["default"]}'
);
```

## 🐛 Debug

### Console:
- Todos os eventos são logados com prefixo 🎱
- Estados de jogo são rastreáveis
- Performance metrics disponíveis

### Variáveis Globais (Desenvolvimento):
```javascript
window.SINUCA_DEBUG = true;  // Ativar logs extras
window.SINUCA_CONFIG;        // Ver configuração atual
```

## 📱 Responsividade

### Mobile-First:
- Interface adaptada para touch
- Controles otimizados para mobile
- Layout responsivo
- Performance otimizada para dispositivos móveis

### Breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

---

**TARGET_ORIGIN**: Configure sempre o domínio correto para `targetOrigin` por segurança!

**Exemplo**: `https://trembaodelivery.com` (nunca `*`)