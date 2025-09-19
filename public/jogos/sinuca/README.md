# Sinuca Trem Bão - Standalone Version

## 🎮 Acesso

### Standalone HTML:
```
/jogos/sinuca/index.html
```
**Nota**: Redireciona automaticamente para a versão React em `/jogos/sinuca`

### React Component:
```
/jogos/sinuca
```

### Com Parâmetros:
```
/jogos/sinuca/?uid=user123&logoScale=0.8&logoOpacity=0.7&targetOrigin=https://meudominio.com
```

## 📡 Eventos Disponíveis

Todos os eventos são enviados via `postMessage`:

### gameStart
```javascript
{
  type: 'sinuca-gameStart',
  uid: 'user123',
  ts: 1234567890,
  gameMode: '1P' | '2P'
}
```

### shot
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
```javascript
{
  type: 'sinuca-foul',
  uid: 'user123',
  ts: 1234567890,
  reason: 'cue_ball_pocketed' | 'no_ball_hit' | 'wrong_ball_first'
}
```

### potted
```javascript
{
  type: 'sinuca-potted',
  uid: 'user123',
  ts: 1234567890,
  ball: { number: 8, type: 'EIGHT' }
}
```

### frameEnd
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
```javascript
{
  type: 'sinuca-heartbeat',
  uid: 'user123',
  ts: 1234567890,
  playtimeSec: 150     // tempo total de jogo
}
```

## 🔧 Parâmetros Suportados

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `uid` | string | 'guest' | ID do usuário |
| `jwt` | string | '' | Token JWT (propagado) |
| `sig` | string | '' | Assinatura |
| `returnUrl` | string | '' | URL de retorno |
| `logoUrl` | string | '/assets/brand/trembao-logo.png' | URL do logo |
| `logoScale` | number | 0.6 | Escala do logo (0-1) |
| `logoOpacity` | number | 0.9 | Opacidade (0-1) |
| `logoRotation` | number | 0 | Rotação em graus |
| `targetOrigin` | string | window.location.origin | Domínio para postMessage |

## 📱 Como Usar

### 1. Via iframe:
```html
<iframe 
  src="/jogos/sinuca/index.html?uid=user123&targetOrigin=https://meudominio.com"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

### 2. Via Redirect:
```javascript
// A versão standalone redireciona automaticamente para a React
window.location.href = '/jogos/sinuca/index.html?uid=user123';
```

### 3. Listener de Eventos:
```javascript
window.addEventListener('message', (event) => {
  // IMPORTANTE: Sempre verificar origem
  if (event.origin !== 'https://seudominio.com') return;
  
  const { type, uid, ts, ...payload } = event.data;
  
  if (type?.startsWith('sinuca-')) {
    const eventType = type.replace('sinuca-', '');
    console.log('Evento do jogo:', eventType, payload);
    
    // Processar eventos do jogo
    switch (eventType) {
      case 'gameStart':
        // Jogo iniciado
        break;
      case 'frameEnd':
        // Jogo finalizado - atualizar créditos/ranking
        break;
    }
  }
});
```

## ✅ Status

- ✅ Interface standalone (redireciona para React)
- ✅ Componente React totalmente funcional
- ✅ Sistema de eventos via postMessage
- ✅ Configuração por URL parameters
- ✅ Branding customizável com logo
- ✅ Physics engine com IA integrada
- ✅ Sistema de som procedural
- ✅ Mobile responsive

## 🎯 URLs de Teste

- **Básico**: `/jogos/sinuca/`
- **Com usuário**: `/jogos/sinuca/?uid=teste123`
- **Logo customizado**: `/jogos/sinuca/?logoScale=0.8&logoRotation=45`
- **Iframe ready**: `/jogos/sinuca/?targetOrigin=https://meudominio.com`

---

**IMPORTANTE**: Configure sempre `targetOrigin` para segurança em produção!