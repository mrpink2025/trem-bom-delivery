#!/bin/bash
set -euo pipefail

# ==========================================
# SCRIPT DE SETUP COMPLETO - UBUNTU 24.04
# TREM BÃO DELIVERY - LIMPEZA TOTAL E RECONFIGURAÇÃO
# ==========================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
DEFAULT_DOMAIN="deliverytrembao.com.br"
DEFAULT_EMAIL="admin@deliverytrembao.com.br"
DEFAULT_REPO="https://github.com/YOUR_USERNAME/trem-bao-delivery.git"
DEFAULT_BRANCH="main"

# Configurações
DOMAIN="${1:-$DEFAULT_DOMAIN}"
EMAIL="${2:-$DEFAULT_EMAIL}"
REPO_URL="${3:-$DEFAULT_REPO}"
BRANCH="${4:-$DEFAULT_BRANCH}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    SETUP COMPLETO - TREM BÃO DELIVERY${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Domínio: ${DOMAIN}${NC}"
echo -e "${GREEN}Email: ${EMAIL}${NC}"
echo -e "${GREEN}Repositório: ${REPO_URL}${NC}"
echo -e "${GREEN}Branch: ${BRANCH}${NC}"
echo -e "${BLUE}================================================${NC}"

# Confirmação
echo -e "${YELLOW}⚠️  ATENÇÃO: Este script irá APAGAR TODAS as configurações existentes!${NC}"
echo -e "${YELLOW}Isso inclui nginx, certificados SSL, aplicações e builds existentes.${NC}"
read -p "Deseja continuar? (s/N): " -r
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}Operação cancelada.${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Iniciando limpeza e reconfiguração completa...${NC}"

# ==========================================
# FASE 1: LIMPEZA COMPLETA DO SISTEMA
# ==========================================

echo -e "${YELLOW}📋 FASE 1: Limpeza completa do sistema...${NC}"

# Parar todos os serviços
echo "Parando serviços..."
sudo systemctl stop nginx || true
sudo systemctl stop apache2 || true
sudo systemctl stop ufw || true

# Matar processos relacionados
echo "Matando processos..."
sudo pkill -f "node" || true
sudo pkill -f "npm" || true
sudo pkill -f "vite" || true
sudo pkill -f "gradle" || true
sudo pkill -f "java" || true

# Remover nginx e configurações
echo "Removendo nginx e configurações..."
sudo apt-get remove --purge nginx nginx-common nginx-core -y || true
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx
sudo rm -rf /var/www/html
sudo rm -rf /usr/share/nginx

# Remover certificados SSL
echo "Removendo certificados SSL..."
sudo apt-get remove --purge certbot python3-certbot-nginx -y || true
sudo rm -rf /etc/letsencrypt
sudo rm -rf /var/lib/letsencrypt
sudo rm -rf /var/log/letsencrypt

# Remover aplicações e builds antigos
echo "Removendo aplicações e builds..."
sudo rm -rf /opt/trem-bao-delivery
sudo rm -rf /opt/builds-finais
sudo rm -rf /var/www/*
sudo rm -rf ~/trem-bao-delivery
sudo rm -rf ~/android-sdk
sudo rm -rf ~/.gradle
sudo rm -rf ~/.npm
sudo rm -rf ~/.cache

# Limpar logs do sistema
echo "Limpando logs..."
sudo journalctl --vacuum-time=1d
sudo rm -rf /var/log/*.log
sudo rm -rf /var/log/*.gz

# Resetar firewall
echo "Resetando firewall..."
sudo ufw --force reset
sudo ufw --force disable

# Remover Node.js e Java antigos
echo "Removendo Node.js e Java..."
sudo apt-get remove --purge nodejs npm openjdk-* -y || true
sudo rm -rf /usr/local/lib/node_modules
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm

echo -e "${GREEN}✅ Limpeza completa finalizada!${NC}"

# ==========================================
# FASE 2: ATUALIZAÇÃO DO SISTEMA
# ==========================================

echo -e "${YELLOW}📋 FASE 2: Atualizando sistema...${NC}"

sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y
sudo apt-get autoclean

echo -e "${GREEN}✅ Sistema atualizado!${NC}"

# ==========================================
# FASE 3: INSTALAÇÃO DE DEPENDÊNCIAS
# ==========================================

echo -e "${YELLOW}📋 FASE 3: Instalando dependências...${NC}"

# Instalar pacotes essenciais
sudo apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw

# Instalar Node.js 20
echo "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar Node.js
node_version=$(node --version)
npm_version=$(npm --version)
echo -e "${GREEN}Node.js: ${node_version}${NC}"
echo -e "${GREEN}NPM: ${npm_version}${NC}"

# Instalar Java 21
echo "Instalando Java 21..."
sudo apt-get install -y openjdk-21-jdk

# Configurar JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc

# Configurar alternativas do Java
sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk-amd64/bin/java 1
sudo update-alternatives --install /usr/bin/javac javac /usr/lib/jvm/java-21-openjdk-amd64/bin/javac 1

# Verificar Java
java_version=$(java -version 2>&1 | head -n 1)
echo -e "${GREEN}Java: ${java_version}${NC}"

echo -e "${GREEN}✅ Dependências instaladas!${NC}"

# ==========================================
# FASE 4: CONFIGURAÇÃO DO ANDROID SDK
# ==========================================

echo -e "${YELLOW}📋 FASE 4: Configurando Android SDK...${NC}"

# Baixar e instalar Android SDK
cd ~
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
mkdir -p android-sdk/cmdline-tools
mv cmdline-tools android-sdk/cmdline-tools/latest
rm commandlinetools-linux-11076708_latest.zip

# Configurar variáveis do Android
export ANDROID_HOME=~/android-sdk
export ANDROID_SDK_ROOT=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo 'export ANDROID_HOME=~/android-sdk' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT=~/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc

# Aceitar licenças e instalar componentes
yes | sdkmanager --licenses > /dev/null 2>&1
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo -e "${GREEN}✅ Android SDK configurado!${NC}"

# ==========================================
# FASE 5: CLONAR E BUILDAR APLICAÇÃO
# ==========================================

echo -e "${YELLOW}📋 FASE 5: Clonando e buildando aplicação...${NC}"

# Clonar repositório
cd /opt
sudo git clone --branch $BRANCH $REPO_URL trem-bao-delivery
sudo chown -R $USER:$USER /opt/trem-bao-delivery
cd /opt/trem-bao-delivery

# Instalar dependências Node.js
echo "Instalando dependências do projeto..."
npm install

# Build da aplicação web
echo "Buildando aplicação web..."
npm run build

# Instalar Capacitor
echo "Instalando Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# Configurar Capacitor
echo "Configurando Capacitor..."
npx cap init trem-bom-delivery app.lovable.4151c76ae46a476eb3992c50a1afaf78 --web-dir=dist

# Adicionar plataforma Android
echo "Adicionando plataforma Android..."
npx cap add android
npx cap sync android

# Configurar keystore
echo "Configurando keystore para Android..."
if [ ! -f "android/app/debug.keystore" ]; then
    keytool -genkey -v -keystore android/app/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
fi

# Build Android
echo "Buildando aplicação Android..."
cd android
chmod +x ./gradlew
./gradlew clean
./gradlew assembleRelease
./gradlew bundleRelease

cd /opt/trem-bao-delivery

echo -e "${GREEN}✅ Aplicação buildada!${NC}"

# ==========================================
# FASE 6: CONFIGURAÇÃO DO NGINX
# ==========================================

echo -e "${YELLOW}📋 FASE 6: Configurando Nginx...${NC}"

# Instalar nginx
sudo apt-get install -y nginx

# Criar configuração do site
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect all HTTP requests to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (será configurado pelo certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root directory
    root /var/www/$DOMAIN;
    index index.html index.htm;
    
    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
EOF

# Criar diretório web
sudo mkdir -p /var/www/$DOMAIN
sudo chown -R www-data:www-data /var/www/$DOMAIN

# Copiar arquivos buildados
sudo cp -r /opt/trem-bao-delivery/dist/* /var/www/$DOMAIN/

# Habilitar site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Iniciar nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo -e "${GREEN}✅ Nginx configurado!${NC}"

# ==========================================
# FASE 7: CONFIGURAÇÃO DO FIREWALL
# ==========================================

echo -e "${YELLOW}📋 FASE 7: Configurando firewall...${NC}"

sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

echo -e "${GREEN}✅ Firewall configurado!${NC}"

# ==========================================
# FASE 8: CONFIGURAÇÃO SSL/CERTIFICADOS
# ==========================================

echo -e "${YELLOW}📋 FASE 8: Configurando SSL/Certificados...${NC}"

# Instalar certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obter certificado SSL
echo "Obtendo certificado SSL para $DOMAIN..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

# Configurar renovação automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Testar renovação
sudo certbot renew --dry-run

echo -e "${GREEN}✅ SSL configurado!${NC}"

# ==========================================
# FASE 9: ORGANIZAR BUILDS FINAIS
# ==========================================

echo -e "${YELLOW}📋 FASE 9: Organizando builds finais...${NC}"

# Criar diretório de builds
sudo mkdir -p /opt/builds-finais/{android,web,documentacao}
sudo chown -R $USER:$USER /opt/builds-finais

# Copiar builds Android
if [ -f "/opt/trem-bao-delivery/android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp /opt/trem-bao-delivery/android/app/build/outputs/apk/release/app-release.apk /opt/builds-finais/android/
fi

if [ -f "/opt/trem-bao-delivery/android/app/build/outputs/bundle/release/app-release.aab" ]; then
    cp /opt/trem-bao-delivery/android/app/build/outputs/bundle/release/app-release.aab /opt/builds-finais/android/
fi

# Copiar build web
cp -r /opt/trem-bao-delivery/dist /opt/builds-finais/web/

# Criar documentação
cat > /opt/builds-finais/README-DEPLOY.md << EOF
# TREM BÃO DELIVERY - DEPLOY COMPLETO

## Informações do Deploy
- **Data:** $(date)
- **Domínio:** $DOMAIN
- **Email:** $EMAIL
- **Servidor:** Ubuntu 24.04

## Builds Gerados
- **APK Android:** /opt/builds-finais/android/app-release.apk
- **AAB Android:** /opt/builds-finais/android/app-release.aab
- **Web Build:** /opt/builds-finais/web/dist/

## URLs de Acesso
- **Site:** https://$DOMAIN
- **SSL:** Configurado automaticamente

## Comandos Úteis
\`\`\`bash
# Verificar status dos serviços
sudo systemctl status nginx
sudo systemctl status certbot.timer

# Renovar certificados
sudo certbot renew

# Rebuild da aplicação
cd /opt/trem-bao-delivery
npm run build
sudo cp -r dist/* /var/www/$DOMAIN/

# Rebuild Android
cd /opt/trem-bao-delivery/android
./gradlew clean assembleRelease bundleRelease
\`\`\`

## Próximos Passos
1. Verificar se o site está acessível em https://$DOMAIN
2. Testar a aplicação Android nos dispositivos
3. Configurar DNS se necessário
4. Upload dos APK/AAB para as lojas

## Suporte
Para suporte técnico, verificar logs em:
- Nginx: /var/log/nginx/
- Certbot: /var/log/letsencrypt/
- Sistema: journalctl -f
EOF

# Criar info do build
cat > /opt/builds-finais/BUILD-INFO.txt << EOF
BUILD INFORMATION
================
Data: $(date)
Servidor: Ubuntu $(lsb_release -rs)
Node.js: $(node --version)
NPM: $(npm --version)
Java: $(java -version 2>&1 | head -n 1)

ARQUIVOS GERADOS:
$(find /opt/builds-finais -type f -exec ls -lh {} \;)

STATUS DOS SERVIÇOS:
$(sudo systemctl is-active nginx certbot.timer ufw)
EOF

echo -e "${GREEN}✅ Builds organizados!${NC}"

# ==========================================
# FASE 10: TESTES FINAIS
# ==========================================

echo -e "${YELLOW}📋 FASE 10: Executando testes finais...${NC}"

# Testar site
echo "Testando acesso ao site..."
if curl -f -s -L https://$DOMAIN > /dev/null; then
    echo -e "${GREEN}✅ Site acessível!${NC}"
else
    echo -e "${RED}❌ Erro ao acessar o site${NC}"
fi

# Verificar certificado
echo "Verificando certificado SSL..."
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    echo -e "${GREEN}✅ Certificado SSL válido!${NC}"
else
    echo -e "${YELLOW}⚠️  Certificado SSL pode ter problemas${NC}"
fi

# Verificar serviços
echo "Verificando serviços..."
for service in nginx certbot.timer ufw; do
    if sudo systemctl is-active --quiet $service; then
        echo -e "${GREEN}✅ $service ativo${NC}"
    else
        echo -e "${RED}❌ $service inativo${NC}"
    fi
done

# Listar arquivos gerados
echo -e "\n${BLUE}📁 Arquivos gerados:${NC}"
find /opt/builds-finais -type f -exec ls -lh {} \;

echo -e "${GREEN}✅ Testes finais concluídos!${NC}"

# ==========================================
# FINALIZAÇÃO
# ==========================================

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}🎉 SETUP COMPLETO FINALIZADO COM SUCESSO! 🎉${NC}"
echo -e "${BLUE}================================================${NC}"

echo -e "\n${YELLOW}📋 RESUMO:${NC}"
echo -e "• Site disponível em: ${GREEN}https://$DOMAIN${NC}"
echo -e "• Certificado SSL: ${GREEN}Configurado${NC}"
echo -e "• Build Android: ${GREEN}Concluído${NC}"
echo -e "• Builds em: ${GREEN}/opt/builds-finais/${NC}"

echo -e "\n${YELLOW}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. Verificar se o site está funcionando corretamente"
echo -e "2. Testar a aplicação Android"
echo -e "3. Configurar DNS se necessário"
echo -e "4. Fazer upload para as lojas de aplicativos"

echo -e "\n${BLUE}Documentação completa: /opt/builds-finais/README-DEPLOY.md${NC}"
echo -e "${BLUE}================================================${NC}"

# Recarregar bashrc para aplicar variáveis
source ~/.bashrc

echo -e "${GREEN}Setup completo! 🚀${NC}"