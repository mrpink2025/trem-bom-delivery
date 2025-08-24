#!/bin/bash

# =============================================================================
# 🚀 TREM BÃO DELIVERY - DEPLOY COMPLETO DO ZERO
# =============================================================================
# Este script faz deploy completo baixando do git e configurando tudo
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
REPO_URL="https://github.com/mrpink2025/trem-bom-delivery.git"  # ⚠️ ALTERAR AQUI
PROJECT_NAME="trem-bao-delivery"
WORK_DIR="/opt/$PROJECT_NAME"
BUILDS_DIR="/opt/builds-finais"

echo -e "${BLUE}🚀 TREM BÃO DELIVERY - DEPLOY COMPLETO${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "${YELLOW}⚠️  ATENÇÃO: Este script vai APAGAR TUDO e reconfigurar do zero!${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada."
    exit 1
fi

echo -e "\n${GREEN}🗑️  FASE 1: LIMPEZA COMPLETA${NC}"
echo -e "${GREEN}============================${NC}"
echo "🛑 Parando processos..."
pkill -f "vite" 2>/dev/null || true
pkill -f "gradle" 2>/dev/null || true
pkill -f "java" 2>/dev/null || true

echo "🗂️  Removendo diretórios antigos..."
rm -rf $WORK_DIR 2>/dev/null || true
rm -rf $BUILDS_DIR 2>/dev/null || true
rm -rf ~/.gradle 2>/dev/null || true
rm -rf ~/.android 2>/dev/null || true
rm -rf /var/www/* 2>/dev/null || true
rm -rf /etc/nginx/sites-enabled/* 2>/dev/null || true
rm -rf /opt/builds-* 2>/dev/null || true

echo "🛑 Parando serviços web..."
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true

echo "🧹 Limpando cache..."
apt-get clean 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

echo -e "✅ Limpeza concluída!\n"

echo -e "${GREEN}🔧 FASE 2: CONFIGURAÇÃO DO SISTEMA${NC}"
echo -e "${GREEN}=================================${NC}"
echo "📦 Atualizando sistema..."
apt-get update -y

echo "🛠️ Instalando dependências base..."
apt-get install -y \
    curl \
    wget \
    unzip \
    git \
    build-essential \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release

echo "📱 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "☕ Configurando Java 21..."
apt-get install -y openjdk-21-jdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> /etc/environment
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> /etc/environment
update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk-amd64/bin/java 1
update-alternatives --install /usr/bin/javac javac /usr/lib/jvm/java-21-openjdk-amd64/bin/javac 1

echo "🤖 Configurando Android SDK..."
ANDROID_HOME=/opt/android-sdk
export ANDROID_HOME
echo "export ANDROID_HOME=$ANDROID_HOME" >> /etc/environment
echo "export PATH=\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH" >> /etc/environment

# Remover completamente qualquer instalação anterior do Android SDK
rm -rf $ANDROID_HOME 2>/dev/null || true

# Criar diretório limpo e baixar Android SDK
mkdir -p $ANDROID_HOME/cmdline-tools
cd $ANDROID_HOME/cmdline-tools
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
mv cmdline-tools latest
rm commandlinetools-linux-11076708_latest.zip

# Aceitar licenças automaticamente
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
echo "🤖 Aceitando licenças Android automaticamente..."
printf 'y\ny\ny\ny\ny\ny\ny\ny\ny\ny\n' | sdkmanager --licenses --sdk_root=$ANDROID_HOME
sdkmanager --update --sdk_root=$ANDROID_HOME

# Instalar componentes Android
sdkmanager "platform-tools" "platforms;android-34" "platforms;android-35" "build-tools;34.0.0" "build-tools;35.0.0"

echo -e "✅ Sistema configurado!\n"

echo -e "${GREEN}📁 FASE 3: BAIXANDO PROJETO DO GIT${NC}"
echo -e "${GREEN}=================================${NC}"
cd /opt
echo "📥 Clonando repositório..."
git clone $REPO_URL $PROJECT_NAME
cd $WORK_DIR

echo -e "✅ Projeto baixado!\n"

echo -e "${GREEN}🌐 FASE 4: BUILD DA APLICAÇÃO WEB${NC}"
echo -e "${GREEN}=================================${NC}"
echo "📦 Instalando dependências npm..."
npm install

echo "🔨 Fazendo build da aplicação..."
npm run build

echo -e "✅ Build web concluído!\n"

echo -e "${GREEN}🌐 FASE 5: CONFIGURAÇÃO WEB SERVIDOR${NC}"
echo -e "${GREEN}====================================${NC}"
echo "🔧 Instalando e configurando Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx

echo "📝 Configurando site Nginx..."
cat > /etc/nginx/sites-available/trem-bao-delivery << 'EOF'
server {
    listen 80;
    server_name _;
    root /opt/trem-bao-delivery/dist;
    index index.html;

    # Configurações para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compressão gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cabeçalhos de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

echo "🔗 Ativando site Nginx..."
ln -sf /etc/nginx/sites-available/trem-bao-delivery /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "🔄 Testando configuração Nginx..."
nginx -t

echo "🚀 Iniciando Nginx..."
systemctl enable nginx
systemctl restart nginx

echo "🔐 Configurando certificados SSL..."
echo "ℹ️  Para configurar SSL com domínio próprio, execute após o build:"
echo "   sudo certbot --nginx -d seudominio.com"
echo "   Isso configurará automaticamente HTTPS com certificado gratuito"

echo "🔒 Configurando firewall básico..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

echo "🌐 Aplicação web disponível em:"
echo "   http://$(hostname -I | awk '{print $1}')"
echo "   http://localhost (se local)"

echo -e "✅ Servidor web configurado!\n"

echo -e "${GREEN}📱 FASE 6: CONFIGURAÇÃO CAPACITOR${NC}"
echo -e "${GREEN}=================================${NC}"
echo "⚙️ Instalando Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

echo "🔄 Sincronizando Capacitor..."
npx cap sync

echo "📱 Removendo plataforma Android existente..."
rm -rf android 2>/dev/null || true

echo "📱 Adicionando plataforma Android..."
npx cap add android

echo "🔄 Sincronizando novamente após adicionar Android..."
npx cap sync

echo -e "✅ Capacitor configurado!\n"

echo -e "${GREEN}🤖 FASE 7: CONFIGURAÇÃO ANDROID${NC}"
echo -e "${GREEN}===============================${NC}"
echo "📁 Criando estrutura de diretórios..."
mkdir -p android/app/src/main/res/{drawable,drawable-hdpi,drawable-mdpi,drawable-xhdpi,drawable-xxhdpi,drawable-xxxhdpi}
mkdir -p android/app/src/main/res/values

echo "🖼️ Copiando ícones PWA para Android..."
# Copiar ícones do public/ para Android
if [ -f "public/icon-192x192.png" ]; then
    cp public/icon-192x192.png android/app/src/main/res/drawable-xxxhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/drawable-xxhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/drawable-xhdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/drawable-hdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/drawable-mdpi/ic_launcher.png
    cp public/icon-192x192.png android/app/src/main/res/drawable/ic_launcher.png
fi

echo "⚙️ Configurando strings.xml..."
cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Trem Bão Delivery</string>
    <string name="title_activity_main">Trem Bão Delivery</string>
    <string name="package_name">com.trembaodelivery.app</string>
    <string name="custom_url_scheme">com.trembaodelivery.app</string>
</resources>
EOF

echo "🎨 Configurando styles.xml..."
cat > android/app/src/main/res/values/styles.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
    
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowBackground">@drawable/splash</item>
        <item name="android:statusBarColor">@color/colorPrimaryDark</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="AppTheme">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">false</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:statusBarColor">@color/colorPrimaryDark</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
EOF

echo "🌈 Configurando colors.xml..."
cat > android/app/src/main/res/values/colors.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#D97706</color>
    <color name="colorPrimaryDark">#92400E</color>
    <color name="colorAccent">#F59E0B</color>
    <color name="ic_launcher_background">#D97706</color>
</resources>
EOF

echo "💫 Configurando splash.xml..."
cat > android/app/src/main/res/drawable/splash.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/ic_launcher_background"/>
    <item android:width="200dp" android:height="200dp" android:drawable="@drawable/ic_launcher" android:gravity="center"/>
</layer-list>
EOF

echo -e "✅ Android configurado!\n"

echo -e "${GREEN}🔧 FASE 8: CONFIGURAÇÃO GRADLE${NC}"
echo -e "${GREEN}==============================${NC}"
echo "📁 Criando estrutura do Gradle..."
mkdir -p android/gradle/wrapper

echo "⚙️ Configurando gradle-wrapper.properties..."
cat > android/gradle/wrapper/gradle-wrapper.properties << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

echo "🔧 Atualizando build.gradle para Java 21..."
if [ -f "android/app/build.gradle" ]; then
    sed -i 's/compileSdk .*/compileSdk 35/' android/app/build.gradle
    sed -i 's/targetSdk .*/targetSdk 35/' android/app/build.gradle
    sed -i 's/sourceCompatibility .*/sourceCompatibility JavaVersion.VERSION_21/' android/app/build.gradle
    sed -i 's/targetCompatibility .*/targetCompatibility JavaVersion.VERSION_21/' android/app/build.gradle
    
    # Adicionar compatibilidade Java 21 se não existir
    grep -q "compileOptions" android/app/build.gradle || cat >> android/app/build.gradle << 'EOF'

android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }
}
EOF
fi

echo -e "✅ Gradle configurado!\n"

echo -e "${GREEN}📱 FASE 9: BUILD FINAL ANDROID${NC}"
echo -e "${GREEN}==============================${NC}"
echo "🔄 Sincronização final do Capacitor..."
npx cap sync android

echo "🏗️ Fazendo build Android..."
cd android

echo "🧹 Limpando build anterior..."
./gradlew clean

echo "📱 Construindo APK Debug..."
./gradlew assembleDebug

echo "📦 Construindo APK Release..."
./gradlew assembleRelease

echo "📦 Construindo AAB Release..."
./gradlew bundleRelease

cd ..

echo -e "✅ Build Android concluído!\n"

echo -e "${GREEN}📦 FASE 10: ORGANIZANDO BUILDS FINAIS${NC}"
echo -e "${GREEN}===================================${NC}"
echo "📁 Criando diretório de builds finais..."
mkdir -p $BUILDS_DIR

echo "📱 Copiando APK e AAB..."
find android/app/build/outputs -name "*.apk" -exec cp {} $BUILDS_DIR/ \;
find android/app/build/outputs -name "*.aab" -exec cp {} $BUILDS_DIR/ \;

echo "🌐 Copiando build web..."
cp -r dist $BUILDS_DIR/

echo "📄 Gerando documentação..."
cat > $BUILDS_DIR/README-COMPLETO.md << EOF
# 🚀 Trem Bão Delivery - Build Completo

## 📱 Arquivos Gerados

### Android
- **APK Debug**: Para testes em desenvolvimento
- **APK Release**: Para distribuição direta
- **AAB Release**: Para publicação na Google Play Store

### Web
- **dist/**: Build da aplicação web pronta para deploy

## 🚀 Como Publicar

### Google Play Store
1. Faça upload do arquivo \`.aab\` no Google Play Console
2. Configure a listagem da loja
3. Defina preços e distribuição
4. Envie para revisão

### Distribuição Direta
- Use o arquivo \`.apk\` para distribuição direta
- Usuários precisam habilitar "Fontes desconhecidas"

### Deploy Web
- Faça upload da pasta \`dist/\` para seu servidor web
- Configure redirecionamentos para SPA se necessário

## 📋 Informações Técnicas

- **Data do Build**: $(date)
- **Node.js**: $(node --version)
- **npm**: $(npm --version)
- **Java**: $(java --version | head -n1)
- **Gradle**: Wrapper 8.11.1
- **Android SDK**: 34
- **Capacitor**: $(npx cap --version)

## 🔧 Próximos Passos

1. Teste os APKs em dispositivos reais
2. Configure certificados de produção se necessário
3. Configure CI/CD para automatizar builds futuros
4. Monitore crash reports e analytics

---
*Build gerado automaticamente pelo script deploy completo*
EOF

echo "📊 Gerando informações do build..."
cat > $BUILDS_DIR/BUILD-INFO.txt << EOF
TREM BÃO DELIVERY - INFORMAÇÕES DO BUILD
=======================================

Data/Hora: $(date)
Servidor: $(hostname)
Usuário: $(whoami)

VERSÕES:
--------
Node.js: $(node --version)
npm: $(npm --version)
Java: $(java --version | head -n1)
Android SDK: 34
Capacitor: $(npx cap --version)

ARQUIVOS GERADOS:
-----------------
EOF

# Listar arquivos gerados com tamanhos
ls -lh $BUILDS_DIR/ >> $BUILDS_DIR/BUILD-INFO.txt

echo -e "✅ Builds organizados!\n"

echo -e "${GREEN}🌐 FASE 11: CONFIGURAÇÃO DOMÍNIO PERSONALIZADO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo "🔧 Configurando domínio deliverytrembao.com.br..."

# Configurar Nginx para o domínio personalizado
cat > /etc/nginx/sites-available/deliverytrembao.com.br << 'EOF'
server {
    listen 80;
    server_name deliverytrembao.com.br www.deliverytrembao.com.br;
    root /opt/trem-bao-delivery/dist;
    index index.html;

    # Configurações para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compressão gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cabeçalhos de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

echo "🔗 Ativando configuração do domínio..."
ln -sf /etc/nginx/sites-available/deliverytrembao.com.br /etc/nginx/sites-enabled/

echo "🔄 Testando configuração..."
nginx -t

echo "🚀 Recarregando Nginx..."
systemctl reload nginx

echo "🔐 Configurando SSL automático para o domínio..."
echo "ℹ️  Executando certbot para deliverytrembao.com.br..."

# Tentar configurar SSL automaticamente
certbot --nginx -d deliverytrembao.com.br -d www.deliverytrembao.com.br --non-interactive --agree-tos --email admin@deliverytrembao.com.br || echo "⚠️  SSL não configurado automaticamente - execute manualmente após apontar DNS"

echo ""
echo -e "${GREEN}📋 CONFIGURAÇÃO DE DNS NECESSÁRIA:${NC}"
echo -e "${YELLOW}===================================${NC}"
echo "Para completar a configuração, adicione estes registros DNS:"
echo ""
echo -e "${BLUE}Registro A para o domínio raiz:${NC}"
echo "  Tipo: A"
echo "  Nome: @"
echo "  Valor: $(curl -s ifconfig.me || hostname -I | awk '{print $1}')"
echo ""
echo -e "${BLUE}Registro A para www:${NC}"
echo "  Tipo: A"  
echo "  Nome: www"
echo "  Valor: $(curl -s ifconfig.me || hostname -I | awk '{print $1}')"
echo ""
echo -e "${BLUE}Ou se usar Lovable (recomendado):${NC}"
echo "  Tipo: A"
echo "  Nome: @ e www"
echo "  Valor: 185.158.133.1"
echo ""
echo -e "${GREEN}📝 INSTRUÇÕES PARA LOVABLE:${NC}"
echo "1. No projeto Lovable, vá em Settings → Domains"
echo "2. Clique 'Connect Domain'"
echo "3. Digite: deliverytrembao.com.br"
echo "4. Configure os registros DNS fornecidos pelo Lovable"
echo "5. Aguarde propagação (24-48h)"
echo ""
echo -e "${YELLOW}🌐 Após configurar DNS, o site estará disponível em:${NC}"
echo "   https://deliverytrembao.com.br"
echo "   https://www.deliverytrembao.com.br"

echo -e "✅ Configuração do domínio concluída!\n"

echo -e "${GREEN}🎉 DEPLOY COMPLETO FINALIZADO!${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo -e "${BLUE}📁 Arquivos finais em: ${YELLOW}$BUILDS_DIR${NC}"
echo ""
echo -e "${GREEN}📱 Arquivos Android:${NC}"
ls -la $BUILDS_DIR/*.apk $BUILDS_DIR/*.aab 2>/dev/null || echo "   Nenhum arquivo Android encontrado"
echo ""
echo -e "${GREEN}🌐 Build Web:${NC}"
echo "   $BUILDS_DIR/dist/"
echo ""
echo -e "${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "   1. ${YELLOW}Teste os APKs em dispositivos${NC}"
echo -e "   2. ${YELLOW}Configure certificados de produção${NC}"
echo -e "   3. ${YELLOW}Publique na Google Play Store${NC}"
echo -e "   4. ${YELLOW}Deploy da aplicação web${NC}"
echo ""
echo -e "${GREEN}✅ TODAS AS FASES CONCLUÍDAS COM SUCESSO!${NC}"

# Exibir tamanhos dos arquivos
echo -e "\n${BLUE}📊 TAMANHOS DOS ARQUIVOS:${NC}"
du -h $BUILDS_DIR/* 2>/dev/null | head -10

echo -e "\n${GREEN}🚀 Deploy finalizado! Verifique os arquivos em $BUILDS_DIR${NC}"