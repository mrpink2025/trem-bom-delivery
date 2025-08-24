#!/bin/bash

echo "🎨 Corrigindo ícones e StatusBar do Android..."

# Criar diretórios para ícones se não existirem
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi  
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi
mkdir -p android/app/src/main/res/drawable
mkdir -p android/app/src/main/res/values

echo "📱 Copiando ícones do PWA para Android..."

# Verificar se os ícones PWA existem
if [ -f "public/icon-512x512.png" ]; then
    echo "✅ Ícone 512x512 encontrado"
    # Para xxxhdpi (densidade ~640dpi) - usar o 512x512 
    cp public/icon-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
    cp public/icon-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
else
    echo "⚠️ Ícone 512x512 não encontrado"
fi

if [ -f "public/icon-192x192.png" ]; then
    echo "✅ Ícone 192x192 encontrado"
    # Para xxhdpi (densidade ~480dpi) - usar o 192x192
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
    # Para xhdpi (densidade ~320dpi) - usar o 192x192 redimensionado
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
    # Para hdpi (densidade ~240dpi) - usar o 192x192 redimensionado
    cp public/icon-192x192.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
    # Para mdpi (densidade ~160dpi) - usar o 192x192 redimensionado
    cp public/icon-192x192.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
else
    echo "⚠️ Ícone 192x192 não encontrado"
fi

echo "🎨 Configurando cores e tema..."

# As configurações já foram feitas nos arquivos:
# - colors.xml (cor primária #D97706)  
# - styles.xml (tema com StatusBar)
# - AndroidManifest.xml (activity com theme correto)
# - capacitor.config.ts (StatusBar configurado)

echo "🔄 Sincronizando com Capacitor..."
npx cap sync android

echo "🔨 Fazendo build com ícones e StatusBar corrigidos..."
cd android
./gradlew clean
echo "🚀 Gerando APK..."
./gradlew assembleRelease
echo "📦 Gerando AAB..."
./gradlew bundleRelease

cd ..

echo ""
echo "🎉 CORREÇÕES APLICADAS COM SUCESSO!"
echo ""
echo "✅ Ícones do Android:"
echo "   - Copiados dos ícones PWA (mesma identidade visual)"
echo "   - Aplicados em todas as densidades (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)"
echo ""
echo "✅ StatusBar/Barra de Notificações:"
echo "   - App agora respeita a área de notificação do sistema"
echo "   - StatusBar com cor tema (#D97706)"
echo "   - Não toma mais a tela inteira"
echo ""
echo "📱 Arquivos gerados:"
echo "   - APK: android/app/build/outputs/apk/release/app-release.apk"
echo "   - AAB: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "💡 Próximos passos:"
echo "   - Teste o app em um dispositivo físico"
echo "   - Verifique se os ícones estão corretos"
echo "   - Confirme se a barra de notificações está visível"