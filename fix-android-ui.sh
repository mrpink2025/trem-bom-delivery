#!/bin/bash

echo "🎨 Configurando ícones e UI do Android..."

# Criar diretórios para os ícones
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Copiar e redimensionar ícones do PWA para Android
echo "📱 Copiando ícones PWA para Android..."

# Copiar o ícone base (assumindo que icon-512x512.png existe)
cp public/icon-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png

# Criar também versão round
cp public/icon-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
cp public/icon-192x192.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png

echo "✅ Ícones copiados"

# Criar drawable para splash screen com ícone correto
mkdir -p android/app/src/main/res/drawable
cat > android/app/src/main/res/drawable/splash.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/colorPrimary"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher"/>
    </item>
</layer-list>
EOF

echo "🎨 Splash screen configurado"

# Ajustar StatusBar no AndroidManifest
echo "📱 Ajustando StatusBar no AndroidManifest..."

# Backup do manifest atual
cp android/app/src/main/AndroidManifest.xml android/app/src/main/AndroidManifest.xml.backup

# Ajustar o AndroidManifest para não usar fullscreen
sed -i 's/android:windowFullscreen">true</android:windowFullscreen">false/g' android/app/src/main/AndroidManifest.xml

echo "✅ StatusBar configurado"

# Sincronizar com Capacitor
echo "🔄 Sincronizando com Capacitor..."
npx cap sync

echo "🎉 Ícones e UI do Android configurados!"
echo "💡 Agora o app vai:"
echo "   - Usar os mesmos ícones do PWA"
echo "   - Respeitar a barra de notificações do sistema"
echo "   - Manter a barra de status visível"