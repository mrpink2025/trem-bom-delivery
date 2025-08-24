#!/bin/bash

echo "🔍 LOCALIZANDO PROJETO TREM BÃO DELIVERY"
echo "========================================"

# Procurar pelo package.json do projeto
echo "📂 Procurando diretório do projeto..."

# Locais possíveis onde o projeto pode estar
POSSIBLE_LOCATIONS=(
    "/opt/deliverytrembao_build/delivery-app"
    "/opt/trembao"
    "/opt/delivery"
    "/home/ubuntu/delivery"
    "/home/ubuntu/trembao"
    "/root/delivery"
    "/var/www/delivery"
)

PROJECT_DIR=""

# Procurar em locais conhecidos
for location in "${POSSIBLE_LOCATIONS[@]}"; do
    if [ -f "$location/package.json" ]; then
        echo "✅ Projeto encontrado em: $location"
        PROJECT_DIR="$location"
        break
    fi
done

# Se não encontrou, fazer busca global
if [ -z "$PROJECT_DIR" ]; then
    echo "🔍 Fazendo busca global por package.json..."
    
    # Buscar por package.json que contenha "trem" ou "delivery" ou "capacitor"
    FOUND_DIRS=$(find / -name "package.json" -exec grep -l "trem\|delivery\|capacitor" {} \; 2>/dev/null | head -5)
    
    if [ ! -z "$FOUND_DIRS" ]; then
        echo "📋 Possíveis projetos encontrados:"
        select dir in $FOUND_DIRS; do
            if [ -n "$dir" ]; then
                PROJECT_DIR=$(dirname "$dir")
                echo "✅ Selecionado: $PROJECT_DIR"
                break
            fi
        done
    fi
fi

# Se ainda não encontrou, perguntar ao usuário
if [ -z "$PROJECT_DIR" ]; then
    echo "❓ Não foi possível localizar automaticamente o projeto."
    echo "📂 Listando conteúdo do diretório atual:"
    ls -la
    echo ""
    read -p "Digite o caminho completo do diretório do projeto: " PROJECT_DIR
    
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        echo "❌ package.json não encontrado em $PROJECT_DIR"
        exit 1
    fi
fi

echo "🎯 Projeto localizado em: $PROJECT_DIR"
echo "📂 Conteúdo do diretório:"
ls -la "$PROJECT_DIR"

# Verificar se é o projeto correto
if grep -q "trem.*delivery\|delivery.*trem" "$PROJECT_DIR/package.json" 2>/dev/null; then
    echo "✅ Confirmado: Este é o projeto Trem Bão Delivery!"
elif grep -q "capacitor" "$PROJECT_DIR/package.json" 2>/dev/null; then
    echo "✅ Projeto Capacitor encontrado!"
else
    echo "⚠️ Projeto encontrado, mas pode não ser o correto."
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Operação cancelada"
        exit 1
    fi
fi

# Mudar para o diretório do projeto
cd "$PROJECT_DIR"
echo "📁 Mudando para diretório: $(pwd)"

# Verificar se o script rebuild-complete.sh existe
if [ ! -f "rebuild-complete.sh" ]; then
    echo "📝 Criando rebuild-complete.sh no diretório correto..."
    
    # Criar o script no local correto
cat > rebuild-complete.sh << 'EOF'
#!/bin/bash

echo "🚀 REBUILD COMPLETO DO TREM BÃO DELIVERY"
echo "========================================"
echo "📁 Executando do diretório: $(pwd)"
echo ""

if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado neste diretório!"
    echo "📂 Conteúdo atual:"
    ls -la
    exit 1
fi

echo "✅ package.json encontrado!"
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
pkill -f "vite" 2>/dev/null || true
pkill -f "gradle" 2>/dev/null || true
pkill -f "java" 2>/dev/null || true

# Remover builds antigos
echo "🗂️  Removendo builds antigos..."
rm -rf dist/ 2>/dev/null || true
rm -rf android/app/build/ 2>/dev/null || true
rm -rf android/.gradle/ 2>/dev/null || true
rm -rf android/gradle/ 2>/dev/null || true
rm -rf /opt/builds-finais/ 2>/dev/null || true
rm -rf node_modules/.vite/ 2>/dev/null || true
rm -rf node_modules/.cache/ 2>/dev/null || true

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

if [ $? -ne 0 ]; then
    echo "❌ Erro na instalação das dependências!"
    exit 1
fi

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
cat > android/gradle/wrapper/gradle-wrapper.properties << 'EOFINNER'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOFINNER

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

echo ""
echo "🎉 BUILD COMPLETO FINALIZADO!"
echo "================================"
echo "📁 ARQUIVOS FINAIS EM: /opt/builds-finais/"
echo "   - 📱 Android: APK + AAB prontos para publicação"
echo "   - 🌐 Web: Build PWA pronto para deploy"
echo ""
echo "💡 Para executar novamente: sudo bash rebuild-complete.sh"
EOF

    chmod +x rebuild-complete.sh
    echo "✅ Script criado!"
fi

echo ""
echo "🚀 EXECUTANDO REBUILD COMPLETO DO PROJETO..."
echo "============================================="
echo ""

# Executar o rebuild
sudo bash rebuild-complete.sh

echo ""
echo "✅ PROCESSO CONCLUÍDO!"