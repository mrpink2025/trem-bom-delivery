#!/bin/bash

echo "🔧 Sincronizando permissões do Android..."

# Criar diretórios se não existirem
mkdir -p android/app/src/main/res/xml
mkdir -p android/app/src/main/res/values

# Criar strings.xml se não existir
if [ ! -f "android/app/src/main/res/values/strings.xml" ]; then
cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Trem Bão Delivery</string>
    <string name="title_activity_main">Trem Bão Delivery</string>
    <string name="package_name">com.trembaodelivery.app</string>
    <string name="custom_url_scheme">com.trembaodelivery.app</string>
</resources>
EOF
fi

# Criar colors.xml se não existir
if [ ! -f "android/app/src/main/res/values/colors.xml" ]; then
cat > android/app/src/main/res/values/colors.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#3880ff</color>
    <color name="colorPrimaryDark">#3171e0</color>
    <color name="colorAccent">#3880ff</color>
</resources>
EOF
fi

# Criar styles.xml se não existir  
if [ ! -f "android/app/src/main/res/values/styles.xml" ]; then
cat > android/app/src/main/res/values/styles.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <!-- Customize your theme here. -->
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowBackground">@drawable/splash</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="AppTheme">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
    </style>
</resources>
EOF
fi

echo "✅ Arquivos de recursos criados"

# Sincronizar com Capacitor
echo "📱 Sincronizando com Capacitor..."
npx cap sync

# Build final
echo "🔨 Fazendo build final com permissões..."
cd android
./gradlew clean
./gradlew assembleRelease
./gradlew bundleRelease

echo "🎉 Build concluído com todas as permissões!"
echo "📦 Arquivos gerados:"
echo "   - APK: android/app/build/outputs/apk/release/app-release.apk" 
echo "   - AAB: android/app/build/outputs/bundle/release/app-release.aab"