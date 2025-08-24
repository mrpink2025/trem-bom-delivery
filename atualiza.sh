#!/bin/bash
set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 SCRIPT DE ATUALIZAÇÃO - TREM BÃO DELIVERY${NC}"
echo "=================================================="
echo -e "${YELLOW}⚠️  Este script irá atualizar o projeto e rebuildar os APKs${NC}"
echo -e "${YELLOW}⚠️  Não irá tocar na configuração SSL/Certbot${NC}"
echo
read -p "Deseja continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 1
fi

cd ~

echo -e "\n${BLUE}📁 FASE 1: LIMPEZA E PREPARAÇÃO${NC}"
echo "================================="
echo "🧹 Parando processos..."
pkill -f vite || true
pkill -f gradle || true
pkill -f java || true

echo "🗂️ Removendo diretório antigo..."
rm -rf trem-bao-delivery || true

echo -e "\n${BLUE}📥 FASE 2: BAIXANDO PROJETO ATUALIZADO${NC}"
echo "======================================="
echo "📦 Clonando repositório..."
git clone https://github.com/your-username/trem-bao-delivery.git
cd trem-bao-delivery

echo -e "\n${BLUE}🔧 FASE 3: CONFIGURAÇÃO DO AMBIENTE${NC}"
echo "===================================="
echo "☕ Verificando Java 21..."
if ! java -version 2>&1 | grep -q "openjdk version \"21"; then
    echo "📥 Instalando Java 21..."
    sudo apt update
    sudo apt install -y openjdk-21-jdk
    sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk-amd64/bin/java 1
    sudo update-alternatives --install /usr/bin/javac javac /usr/lib/jvm/java-21-openjdk-amd64/bin/javac 1
fi

export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"

echo -e "\n${BLUE}📦 FASE 4: BUILD DA APLICAÇÃO WEB${NC}"
echo "=================================="
echo "📥 Instalando dependências..."
npm ci

echo "🏗️ Buildando aplicação web..."
npm run build

echo -e "\n${BLUE}📱 FASE 5: CONFIGURAÇÃO CAPACITOR${NC}"
echo "=================================="
echo "⚡ Instalando/atualizando Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android

echo "🔄 Sincronizando Capacitor..."
npx cap sync

echo -e "\n${BLUE}🤖 FASE 6: CONFIGURAÇÃO ANDROID${NC}"
echo "================================="

# Criar diretórios necessários
mkdir -p android/app/src/main/res/values
mkdir -p android/app/src/main/res/drawable
mkdir -p android/app/src/main/res/xml

# Copiar ícones PWA para Android
echo "🎨 Configurando ícones..."
cp public/icon-192x192.png android/app/src/main/res/drawable/ 2>/dev/null || true
cp public/icon-512x512.png android/app/src/main/res/drawable/ 2>/dev/null || true

# Criar strings.xml
echo "📝 Criando strings.xml..."
cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Trem Bão Delivery</string>
    <string name="title_activity_main">Trem Bão Delivery</string>
    <string name="package_name">com.trembaodelivery.app</string>
    <string name="custom_url_scheme">com.trembaodelivery.app</string>
</resources>
EOF

echo -e "\n${BLUE}⚙️ FASE 7: CONFIGURAÇÃO GRADLE${NC}"
echo "================================"

# Adicionar plataforma se não existir
if [ ! -d "android" ]; then
    echo "📱 Adicionando plataforma Android..."
    npx cap add android
fi

# Configurar gradle-wrapper
echo "🔧 Configurando Gradle wrapper..."
mkdir -p android/gradle/wrapper
cat > android/gradle/wrapper/gradle-wrapper.properties << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

echo -e "\n${BLUE}🏗️ FASE 8: BUILD ANDROID FINAL${NC}"
echo "==============================="
echo "🔄 Sincronização final do Capacitor..."
npx cap sync android

echo "📱 Entrando no diretório Android..."
cd android

echo "🧹 Limpando builds anteriores..."
./gradlew clean || true

echo "🔨 Buildando APK debug..."
./gradlew assembleDebug

echo "📦 Buildando APK release..."
./gradlew assembleRelease

echo "📦 Buildando AAB release..."
./gradlew bundleRelease

cd ..

echo -e "\n${BLUE}📁 FASE 9: ORGANIZANDO BUILDS FINAIS${NC}"
echo "====================================="

# Criar diretório para builds finais
sudo mkdir -p /opt/builds-finais
sudo chown $USER:$USER /opt/builds-finais

echo "📦 Copiando APKs e AAB..."
cp android/app/build/outputs/apk/debug/app-debug.apk /opt/builds-finais/ 2>/dev/null || echo "❌ APK debug não encontrado"
cp android/app/build/outputs/apk/release/app-release-unsigned.apk /opt/builds-finais/ 2>/dev/null || echo "❌ APK release não encontrado"
cp android/app/build/outputs/bundle/release/app-release.aab /opt/builds-finais/ 2>/dev/null || echo "❌ AAB não encontrado"

echo "🌐 Copiando build web..."
cp -r dist /opt/builds-finais/

echo "📊 Arquivos gerados:"
ls -la /opt/builds-finais/ | grep -E '\.(apk|aab)$|^d.*dist'

# Gerar informações do build
cat > /opt/builds-finais/BUILD-INFO-$(date +%Y%m%d-%H%M).txt << EOF
=== INFORMAÇÕES DO BUILD - $(date) ===

📱 APLICAÇÃO: Trem Bão Delivery
🏗️ BUILD: $(date +%Y%m%d-%H%M%S)
💻 SERVIDOR: $(hostname)
👤 USUÁRIO: $(whoami)

📦 VERSÕES:
- Node.js: $(node --version)
- NPM: $(npm --version)  
- Java: $(java -version 2>&1 | head -n1)
- Gradle: $(cd android && ./gradlew --version | grep "Gradle " | head -n1)

📁 ARQUIVOS GERADOS:
$(ls -la /opt/builds-finais/ | grep -E '\.(apk|aab)$' | awk '{print $9 " - " $5 " bytes"}')

🌐 WEB BUILD: dist/ ($(du -sh /opt/builds-finais/dist 2>/dev/null | cut -f1 || echo "N/A"))

EOF

echo -e "\n${GREEN}✅ ATUALIZAÇÃO CONCLUÍDA!${NC}"
echo "========================"
echo -e "${GREEN}📱 APKs disponíveis em: /opt/builds-finais/${NC}"
echo -e "${GREEN}📄 Informações do build salvas${NC}"
echo -e "${BLUE}🚀 Web continua rodando no Nginx${NC}"
echo
echo -e "${YELLOW}📋 PRÓXIMOS PASSOS:${NC}"
echo "1. Testar APKs: /opt/builds-finais/"
echo "2. Para instalar: adb install app-debug.apk"
echo "3. Para release: assinar o APK antes da publicação"