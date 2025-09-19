# Sinuca Trem Bão - Standalone Version

## 🎮 Como Testar

### Acesso Direto:
```
/jogos/sinuca/index.html
```

### Com Parâmetros:
```
/jogos/sinuca/index.html?uid=user123&logoScale=0.8&logoOpacity=0.7&logoRotation=15&targetOrigin=https://meudominio.com
```

## 📡 Eventos Testáveis

O jogo emite eventos via `postMessage` que podem ser capturados pelo parent:

```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://seudominio.com') return; // Verificar origem!
  
  const { type, uid, ts, ...payload } = event.data;
  
  if (type?.startsWith('sinuca-')) {
    console.log('Evento recebido:', type, payload);
    
    switch (type.replace('sinuca-', '')) {
      case 'gameStart':
        // Jogo iniciado
        break;
      case 'shot':
        // Tacada executada
        break;
      case 'potted':
        // Bola encaçapada
        break;
      case 'foul':
        // Falta cometida
        break;
      case 'frameEnd':
        // Jogo finalizado
        break;
      case 'heartbeat':
        // Heartbeat (a cada 30s)
        break;
    }
  }
});
```

## 🔧 Parâmetros Suportados

- `uid`: ID do usuário (default: 'guest')
- `logoUrl`: URL do logo (default: '/assets/brand/trembao-logo.png')
- `logoScale`: Escala do logo 0-1 (default: 0.6)
- `logoOpacity`: Opacidade do logo 0-1 (default: 0.9)
- `logoRotation`: Rotação em graus (default: 0)
- `targetOrigin`: Domínio para postMessage (IMPORTANTE para segurança)

## 🚀 Status

- ✅ Interface standalone funcional
- ✅ Sistema de eventos implementado
- ✅ Configuração por URL parameters
- ✅ Branding customizável
- ⚠️ Game engine em integração
- 🔄 Bundle de produção em desenvolvimento

## 📱 Como Integrar

1. **Via iframe:**
```html
<iframe 
  src="/jogos/sinuca/index.html?uid=user123&targetOrigin=https://meudominio.com"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

2. **Via componente React:**
```jsx
import SinucaPage from '@/pages/SinucaPage';
// Acesse em /jogos/sinuca no app React
```