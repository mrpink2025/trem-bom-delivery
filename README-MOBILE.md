# Trem Bão Delivery - Mobile App Setup

Este projeto agora está configurado com Capacitor para suporte nativo a Android e iOS.

## Configuração Inicial (Já Feita)

✅ Dependências instaladas:
- @capacitor/core
- @capacitor/cli
- @capacitor/ios
- @capacitor/android
- @capacitor/status-bar 
- @capacitor/splash-screen
- @capacitor/haptics
- @capacitor/keyboard
- @capacitor/push-notifications

✅ Configuração criada em `capacitor.config.ts`
✅ Compatibilidade com PWA e app nativo

## Para Executar no Dispositivo/Emulador

1. **Exporte para Github**: Use o botão "Export to Github" no Lovable
2. **Clone o projeto**: `git pull` do seu repositório Github
3. **Instale dependências**: `npm install`
4. **Adicione plataformas**:
   - Android: `npx cap add android`
   - iOS: `npx cap add ios`
5. **Atualize dependências nativas**: 
   - Android: `npx cap update android`
   - iOS: `npx cap update ios`
6. **Build do projeto**: `npm run build`
7. **Sincronize**: `npx cap sync`
8. **Execute**:
   - Android: `npx cap run android`
   - iOS: `npx cap run ios` (requer Mac com Xcode)

## Recursos Nativos Incluídos

- ✅ Status Bar configurada
- ✅ Splash Screen
- ✅ Haptic Feedback
- ✅ Keyboard Management
- ✅ Push Notifications
- ✅ Detecção de plataforma nativa
- ✅ PWA desabilitado em apps nativos

## Compatibilidade

- ✅ Android (API 22+)
- ✅ iOS (13.0+)
- ✅ Web (PWA mantido para navegadores)

## Próximos Passos

Após fazer qualquer mudança no código:
1. `git pull` (se usando Github)
2. `npm run build`
3. `npx cap sync`
4. `npx cap run [android|ios]`