# Sinuca Trem Bão - Jogo 8-Ball Profissional

Jogo de sinuca 8-ball em Three.js/WebGL com branding Trem Bão Delivery, física realista e integração completa.

## 🎯 Características

- **Mesa Premium**: Pano verde premium com textura e borda de madeira
- **Logo Central**: Logo Trem Bão aplicado como decal no centro da mesa
- **Física Realista**: Colisões, atrito, spin e dinâmica de bolas 3D
- **Mobile-First**: Controles touch otimizados para dispositivos móveis
- **60 FPS**: Performance otimizada para desktops mid-range
- **Integração**: Sistema de eventos postMessage para créditos/rankings

## 🚀 Uso

### Componente React
```tsx
import { SinucaTremBao } from '@/components/games/SinucaTremBao';

<SinucaTremBao
  uid="user123"
  jwt="token..."
  logoUrl="/custom-logo.png"
  logoScale={0.7}
  logoOpacity={0.9}
  onGameEvent={(event) => console.log(event)}
/>
```

### Página Standalone
```
/public/jogos/sinuca/index.html?uid=user123&logoScale=0.6&logoOpacity=0.85
```

## 📋 Parâmetros de URL

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|---------|-----------|
| `uid` | string | - | ID único do usuário |
| `jwt` | string | - | Token de autenticação |
| `sig` | string | - | Assinatura de segurança |
| `returnUrl` | string | - | URL de retorno após o jogo |
| `logoUrl` | string | `/assets/brand/trembao-logo.png` | URL do logo (PNG transparente) |
| `logoScale` | number | 0.6 | Escala do logo (0-1) |
| `logoOpacity` | number | 0.85 | Opacidade do logo (0-1) |
| `logoRotation` | number | 0 | Rotação do logo em graus |

## 🎮 Eventos de Jogo

Os eventos são enviados via `postMessage` para integração:

### gameStart
```javascript
{
  type: 'gameStart',
  data: { mode: '1P' | '2P' },
  timestamp: 1234567890
}
```

### shot
```javascript
{
  type: 'shot',
  player: 1 | 2,
  data: { power: 0.8, angle: 1.57, spin: { x: 0, y: 0 } },
  timestamp: 1234567890
}
```

### potted
```javascript
{
  type: 'potted',
  player: 1 | 2,
  data: { ballId: 5, ballNumber: 5, ballType: 'solid' },
  timestamp: 1234567890
}
```

### foul
```javascript
{
  type: 'foul',
  player: 1 | 2,
  data: { reason: 'cue_ball_pocketed' | 'wrong_group' },
  timestamp: 1234567890
}
```

### frameEnd
```javascript
{
  type: 'frameEnd',
  data: { winner: 1 | 2, reason: '8ball_legal' | '8ball_premature' },
  timestamp: 1234567890
}
```

### heartbeat
```javascript
{
  type: 'heartbeat',
  data: { ballsMoving: false, currentPlayer: 1 },
  timestamp: 1234567890
}
```

## 🎨 Personalização do Logo

### Logo Local
Substitua `/public/assets/brand/trembao-logo.png` pelo seu logo.

**Especificações recomendadas:**
- Formato: PNG com transparência
- Tamanho: 512x512px (1x) ou 1024x1024px (2x)
- Otimização: Use ferramentas como TinyPNG para reduzir o tamanho

### Logo Externo
Use o parâmetro `logoUrl` para carregar logos de URLs externas:
```
?logoUrl=https://exemplo.com/meu-logo.png&logoScale=0.8
```

### Configurações do Logo
- **Escala**: `0.1` a `1.0` (relativo ao tamanho da mesa)
- **Opacidade**: `0.0` a `1.0` (transparência)
- **Rotação**: `0` a `360` graus
- **Margens**: Automáticas (12% de segurança das caçapas)

## 🛡️ Segurança

- **Origin Validation**: Eventos só são enviados para origens autorizadas
- **Rate Limiting**: Proteção contra spam de eventos
- **Idempotência**: Eventos com nonce para evitar duplicatas
- **Anti-AFK**: Jogo pausa automaticamente quando a aba perde foco

## 🔧 Exemplo de Integração

```javascript
// Listener no parent para receber eventos
window.addEventListener('message', (event) => {
  // Validar origem
  if (event.origin !== 'https://meudominio.com') return;
  
  if (event.data.type === 'sinuca-event') {
    const gameEvent = event.data.event;
    
    switch (gameEvent.type) {
      case 'frameEnd':
        // Atualizar ranking, dar créditos, etc.
        updatePlayerRanking(event.data.uid, gameEvent.data.winner);
        break;
        
      case 'shot':
        // Registrar estatísticas
        trackPlayerStats(event.data.uid, gameEvent.data);
        break;
    }
  }
});
```

## 🏗️ Estrutura

```
src/components/games/billiards/
├── engine/BilliardsEngine.ts     # Motor principal do jogo
├── physics/BilliardsPhysics.ts   # Física e colisões
├── render/BilliardsRenderer.ts   # Renderização 3D
├── audio/SoundManager.ts         # Sistema de áudio
├── ui/GameUI.tsx                 # Interface do usuário
└── types/GameTypes.ts            # Tipos TypeScript
```

## 📦 Build e Deploy

O jogo é automaticamente incluído no build do projeto principal. Para usar standalone:

1. Build do projeto: `npm run build`
2. Deploy da pasta `public/jogos/sinuca/`
3. Configure CORS se necessário
4. Teste com diferentes parâmetros de URL

---

**Desenvolvido com ❤️ para Trem Bão Delivery**