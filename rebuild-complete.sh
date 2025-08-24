#!/bin/bash

echo "🚀 REBUILD COMPLETO DO TREM BÃO DELIVERY"
echo "========================================"
echo "⚠️  ATENÇÃO: Este script vai APAGAR TUDO e reconstruir do zero!"
echo ""
read -p "Tem certeza que deseja continuar? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada pelo usuário"
    exit 1
fi

echo ""
echo "🗑️  FASE 1: LIMPEZA COMPLETA"
echo "============================"

# Parar todos os processos
echo "🛑 Parando processos..."
pkill -f "vite"
pkill -f "gradle"
pkill -f "java"

# Remover builds antigos
echo "🗂️  Removendo builds antigos..."
rm -rf dist/
rm -rf android/app/build/
rm -rf android/.gradle/
rm -rf android/gradle/
rm -rf /opt/builds-finais/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/

# Limpar cache npm
echo "🧹 Limpando cache npm..."
npm cache clean --force

echo "✅ Limpeza concluída!"
echo ""
echo "🌐 FASE 2: BUILD DA APLICAÇÃO WEB"
echo "================================="

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build da aplicação web
echo "🔨 Buildando aplicação web..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build da aplicação web!"
    exit 1
fi

echo "✅ Build web concluído!"
echo ""
echo "☕ FASE 3: CONFIGURAÇÃO JAVA 21"
echo "==============================="

# Verificar se Java 21 está instalado
if ! java -version 2>&1 | grep -q "21\."; then
    echo "📥 Instalando Java 21..."
    
    # Instalar Java 21
    apt-get update
    apt-get install -y openjdk-21-jdk
    
    # Configurar JAVA_HOME
    export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
    echo "export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64" >> ~/.bashrc
    echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> ~/.bashrc
    
    # Configurar alternativas do Java
    update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk-amd64/bin/java 1
    update-alternatives --install /usr/bin/javac javac /usr/lib/jvm/java-21-openjdk-amd64/bin/javac 1
    update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
    update-alternatives --set javac /usr/lib/jvm/java-21-openjdk-amd64/bin/javac
    
    echo "✅ Java 21 instalado e configurado!"
else
    echo "✅ Java 21 já está instalado!"
fi

echo ""
echo "⚡ FASE 4: CONFIGURAÇÃO CAPACITOR"
echo "================================="

# Instalar dependências Capacitor se necessário
echo "📱 Verificando Capacitor..."
if ! npm list @capacitor/core &> /dev/null; then
    npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
fi

# Configurar Capacitor
echo "🔧 Configurando Capacitor..."
npx cap sync

echo "✅ Capacitor configurado!"
echo ""
echo "🤖 FASE 5: CONFIGURAÇÃO ANDROID"
echo "==============================="

# Criar estrutura de diretórios Android
echo "📁 Criando estrutura Android..."
mkdir -p android/app/src/main/res/{mipmap-mdpi,mipmap-hdpi,mipmap-xhdpi,mipmap-xxhdpi,mipmap-xxxhdpi}
mkdir -p android/app/src/main/res/{drawable,values,xml}

# Configurar permissões e recursos Android
echo "🔐 Configurando permissões Android..."

# AndroidManifest.xml já foi criado anteriormente
# strings.xml
cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Trem Bão Delivery</string>
    <string name="title_activity_main">Trem Bão Delivery</string>
    <string name="package_name">com.trembaodelivery.app</string>
    <string name="custom_url_scheme">com.trembaodelivery.app</string>
</resources>
EOF

# colors.xml já foi criado anteriormente
# styles.xml já foi criado anteriormente  
# file_paths.xml já foi criado anteriormente
# splash.xml já foi criado anteriormente

echo "🎨 Copiando ícones PWA para Android..."
# Copiar ícones do PWA para Android
if [ -f "public/icon-512x512.png" ]; then
    cp public/icon-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
    cp public/icon-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
fi

if [ -f "public/icon-192x192.png" ]; then
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
fi

echo "✅ Configuração Android concluída!"
echo ""
echo "🔧 FASE 6: CONFIGURAÇÃO GRADLE"
echo "=============================="

# Verificar se existe o diretório android
if [ ! -d "android" ]; then
    echo "❌ Diretório android não encontrado!"
    echo "🔄 Adicionando plataforma Android..."
    npx cap add android
fi

# Configurar Gradle para Java 21
echo "⚙️ Configurando Gradle para Java 21..."

# Configurar gradle-wrapper.properties
mkdir -p android/gradle/wrapper
cat > android/gradle/wrapper/gradle-wrapper.properties << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

# Garantir que o build.gradle do app está correto
if [ -f "android/app/build.gradle" ]; then
    echo "📝 Verificando build.gradle..."
    # Adicionar configuração Java 21 se não existir
    if ! grep -q "JavaVersion.VERSION_21" android/app/build.gradle; then
        sed -i '/android {/a\    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_21\n        targetCompatibility JavaVersion.VERSION_21\n    }\n    kotlinOptions {\n        jvmTarget = "21"\n    }' android/app/build.gradle
    fi
fi

echo "✅ Gradle configurado!"
echo ""
echo "🔨 FASE 7: BUILD FINAL ANDROID"
echo "=============================="

# Sync final com Capacitor
echo "🔄 Sync final Capacitor..."
npx cap sync android

# Ir para diretório android
cd android

# Limpar builds anteriores
echo "🧹 Limpando builds anteriores..."
./gradlew clean

# Verificar permissões do wrapper
chmod +x gradlew

# Build debug primeiro para verificar se está tudo OK
echo "🔍 Testando build debug..."
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    echo "❌ Erro no build debug! Verificando configuração..."
    cd ..
    exit 1
fi

echo "✅ Build debug OK!"

# Build release
echo "🚀 Gerando APK release..."
./gradlew assembleRelease

if [ $? -ne 0 ]; then
    echo "❌ Erro no build APK release!"
    cd ..
    exit 1
fi

echo "✅ APK gerado!"

# Build AAB
echo "📦 Gerando AAB release..."
./gradlew bundleRelease

if [ $? -ne 0 ]; then
    echo "❌ Erro no build AAB release!"
    cd ..
    exit 1
fi

echo "✅ AAB gerado!"

# Voltar para diretório raiz
cd ..

echo ""
echo "📋 FASE 8: ORGANIZANDO BUILDS FINAIS"
echo "===================================="

# Criar diretório de builds finais
mkdir -p /opt/builds-finais/android
mkdir -p /opt/builds-finais/web
mkdir -p /opt/builds-finais/documentacao

# Copiar builds
echo "📁 Copiando arquivos finais..."

# Android builds
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp android/app/build/outputs/apk/release/app-release.apk /opt/builds-finais/android/trem-bao-delivery.apk
    echo "✅ APK copiado para /opt/builds-finais/android/"
fi

if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
    cp android/app/build/outputs/bundle/release/app-release.aab /opt/builds-finais/android/trem-bao-delivery.aab
    echo "✅ AAB copiado para /opt/builds-finais/android/"
fi

# Web build
if [ -d "dist" ]; then
    cp -r dist/* /opt/builds-finais/web/
    echo "✅ Build web copiado para /opt/builds-finais/web/"
fi

# Gerar documentação
cat > /opt/builds-finais/README-COMPLETO.md << 'EOF'
# Trem Bão Delivery - Builds Completos

## 📱 Android
- **APK**: `android/trem-bao-delivery.apk` - Para instalação direta
- **AAB**: `android/trem-bao-delivery.aab` - Para Google Play Store

## 🌐 Web  
- **Pasta web/**: Build completo para deploy web
- **PWA**: Suporte completo a Progressive Web App

## ✅ Funcionalidades Implementadas
- [x] Permissões Android completas (localização, câmera, notificações, armazenamento)
- [x] Ícones consistentes entre PWA e Android
- [x] StatusBar respeitando área de notificação
- [x] Java 21 configurado
- [x] Gradle 8.11.1 
- [x] Capacitor sincronizado
- [x] Build otimizado para produção

## 🚀 Como publicar

### Google Play Store (AAB)
1. Faça upload do arquivo `trem-bao-delivery.aab`
2. Configure as screenshots e descrição
3. Envie para revisão

### Instalação Direta (APK)  
1. Use o arquivo `trem-bao-delivery.apk`
2. Ative "Fontes desconhecidas" no Android
3. Instale o APK

### Web Deploy
1. Faça upload da pasta `web/` para seu servidor
2. Configure HTTPS
3. Configure Service Worker para PWA

## 📞 Suporte
Em caso de problemas, execute: `sudo bash rebuild-complete.sh`
EOF

# Gerar informações do build
echo "📊 Gerando informações do build..."
cat > /opt/builds-finais/BUILD-INFO.txt << EOF
TREM BÃO DELIVERY - BUILD INFORMATION
=====================================

Build Date: $(date '+%d/%m/%Y %H:%M:%S')
Java Version: $(java -version 2>&1 | head -n 1)
Gradle Version: 8.11.1
Node Version: $(node --version)
NPM Version: $(npm --version)

ANDROID BUILDS:
- APK Size: $(du -h /opt/builds-finais/android/trem-bao-delivery.apk 2>/dev/null | cut -f1 || echo "N/A")
- AAB Size: $(du -h /opt/builds-finais/android/trem-bao-delivery.aab 2>/dev/null | cut -f1 || echo "N/A")

WEB BUILD:
- Size: $(du -sh /opt/builds-finais/web 2>/dev/null | cut -f1 || echo "N/A")

STATUS: ✅ BUILD COMPLETO
EOF

# Listar arquivos gerados
echo ""
echo "📋 ARQUIVOS GERADOS:"
ls -la /opt/builds-finais/android/ 2>/dev/null || echo "   Nenhum arquivo Android encontrado"
echo ""
echo "📱 Tamanhos dos arquivos:"
du -h /opt/builds-finais/android/* 2>/dev/null || echo "   N/A"

echo ""
echo "🎉 BUILD COMPLETO FINALIZADO!"
echo "================================"
echo ""
echo "✅ TODAS AS FASES CONCLUÍDAS:"
echo "   1. ✅ Limpeza completa"
echo "   2. ✅ Build da aplicação web"  
echo "   3. ✅ Configuração Java 21"
echo "   4. ✅ Configuração Capacitor"
echo "   5. ✅ Configuração Android"
echo "   6. ✅ Configuração Gradle"
echo "   7. ✅ Build final Android"
echo "   8. ✅ Organização builds finais"
echo ""
echo "📁 ARQUIVOS FINAIS EM: /opt/builds-finais/"
echo "   - 📱 Android: APK + AAB prontos para publicação"
echo "   - 🌐 Web: Build PWA pronto para deploy"
echo "   - 📋 Documentação completa"
echo ""
echo "🚀 PRÓXIMOS PASSOS:"
echo "   1. Teste o APK em um dispositivo físico"
echo "   2. Faça upload do AAB para Google Play"
echo "   3. Deploy do build web em seu servidor"
echo ""
echo "💡 Para executar novamente: sudo bash rebuild-complete.sh"