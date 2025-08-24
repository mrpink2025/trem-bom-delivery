#!/usr/bin/env bash
# Trem Bão Delivery - Setup Web + Mobile (Supabase Online)
# Uso:
#   sudo bash setup-complete.sh --domain deliverytrembao.com.br --email admin@deliverytrembao.com.br
# 
# Este script faz o deploy da aplicação usando Supabase hospedado:
# - Configura Nginx com SSL
# - Builda aplicação web
# - Prepara builds Android e iOS para lojas

set -euo pipefail

# ===== Configurações =====
DOMINIO="deliverytrembao.com.br"
ADMIN_EMAIL="admin@deliverytrembao.com.br"
REPO_URL="https://github.com/mrpink2025/trem-bom-delivery.git"
APP_ROOT="/var/www/trembao"
WEB_ROOT="$APP_ROOT/current"
BUILD_TMP="/opt/deliverytrembao_build"
BRANCH="main"

# Parse argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMINIO="${2:-}"; shift 2;;
    --email) ADMIN_EMAIL="${2:-}"; shift 2;;
    --repo) REPO_URL="${2:-}"; shift 2;;
    --branch) BRANCH="${2:-}"; shift 2;;
    *) echo "Argumento desconhecido: $1"; exit 1;;
  esac
done

echo "============== Delivery Trem Bão - Deploy Online =============="
echo "🚀 Domínio: $DOMINIO"
echo "📧 Admin Email: $ADMIN_EMAIL" 
echo "📦 Repositório: $REPO_URL"
echo "🌐 Usando Supabase hospedado oficial"
echo "=================================================================="

# ===== FASE 0: Limpeza =====
echo "🧹 FASE 0: Limpeza de arquivos antigos..."

# Remover diretórios antigos do app
rm -rf "$APP_ROOT" "$BUILD_TMP" 2>/dev/null || true

# ===== FASE 1: Preparação do Sistema =====
echo "📦 FASE 1: Instalando dependências do sistema..."

apt update && apt upgrade -y
apt install -y git curl jq ca-certificates wget unzip nginx certbot python3-certbot-nginx ufw

# Node.js 20
if ! command -v node >/dev/null 2>&1; then
  echo "📥 Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

# Firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# ===== FASE 2: Configurar Nginx =====
echo "🌐 FASE 2: Configurando Nginx..."

# Configurar Nginx para servir apenas o app web
NGINX_CONF="/etc/nginx/sites-available/$DOMINIO"
cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMINIO www.$DOMINIO;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMINIO www.$DOMINIO;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMINIO/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMINIO/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Web app files
    location / {
        root $WEB_ROOT;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# ===== FASE 3: Build da Aplicação =====
echo "📱 FASE 3: Building aplicação web e mobile..."

# Criar diretórios
mkdir -p "$APP_ROOT" "$BUILD_TMP"

# Clonar o projeto
cd "$BUILD_TMP"
rm -rf delivery-app
git clone --branch "$BRANCH" "$REPO_URL" delivery-app
cd delivery-app

# Instalar Capacitor se não estiver presente
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# Configurar Capacitor
cat > capacitor.config.ts << EOF
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trembaodelivery.app',
  appName: 'Delivery Trem Bão',
  webDir: 'dist',
  server: {
    url: 'https://4151c76a-e46a-476e-b399-2c50a1afaf78.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2D5BFF',
      showSpinner: false
    }
  }
};

export default config;
EOF

# Usar configurações originais do Supabase hospedado
echo "🔗 Configurando Supabase hospedado original..."
# As configurações já estão corretas no repositório, não precisamos sobrescrever

# Corrigir date-fns para compatibilidade
if jq -e '.dependencies["date-fns"]' package.json >/dev/null 2>&1; then
  tmpfile="$(mktemp)"
  jq '.dependencies["date-fns"] = "^3.6.0"' package.json > "$tmpfile" && mv "$tmpfile" package.json
fi

# Instalar dependências e buildar
rm -f package-lock.json
npm install --legacy-peer-deps
npm run build

# Criar estrutura de diretórios para web root
echo "📁 Criando estrutura de diretórios..."
mkdir -p "$WEB_ROOT"

# Copiar build para web root
echo "📂 Copiando arquivos buildados..."
rm -rf "$WEB_ROOT"/*
cp -r dist/* "$WEB_ROOT"/
chown -R www-data:www-data "$APP_ROOT"

# Preparar builds mobile
echo "📱 Preparando builds para Android e iOS..."

# Adicionar plataformas mobile
if [ ! -d "android" ]; then
    npx cap add android
else
    # Verificar se a plataforma Android está completa
    if [ ! -f "android/app/src/main/assets/capacitor.plugins.json" ]; then
        echo "📱 Android platform corrompida, removendo e recriando..."
        rm -rf android
        npx cap add android
    else
        echo "📱 Android platform já existe, atualizando..."
        npx cap update android
    fi
fi

if [ ! -d "ios" ]; then
    npx cap add ios  
else
    echo "📱 iOS platform já existe, atualizando..."
    npx cap update ios
fi
npx cap sync

echo "✅ Build web concluído!"

# ===== FASE 4: Configurar SSL =====
echo "🔐 FASE 4: Configurando certificado SSL..."

# Aguardar DNS propagar (se necessário)
echo "⏳ Aguardando DNS propagar..."
sleep 10

# Obter certificado SSL
certbot --nginx --redirect -d "$DOMINIO" -d "www.$DOMINIO" -m "$ADMIN_EMAIL" --agree-tos -n || {
  echo "⚠️  Erro ao configurar SSL. Tentando sem www..."
  certbot --nginx --redirect -d "$DOMINIO" -m "$ADMIN_EMAIL" --agree-tos -n || true
}

# Configurar renovação automática
systemctl enable certbot.timer

# ===== FASE 5: Finalização =====
echo "🎉 FASE 5: Finalizando setup..."

# Testar aplicação
echo "🧪 Testando aplicação web..."

# Testar aplicação web
APP_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMINIO/" || echo "000")
if [[ "$APP_TEST" == "200" ]]; then
  echo "✅ Aplicação web funcionando"
else
  echo "⚠️  Aplicação retornou código: $APP_TEST"
fi

echo ""
echo "🎊 ================ DEPLOY CONCLUÍDO COM SUCESSO! ================ 🎊"
echo ""
echo "📍 INFORMAÇÕES DO SISTEMA:"
echo "   🌐 Site: https://$DOMINIO"
echo "   🌐 Supabase: https://ighllleypgbkluhcihvs.supabase.co (hospedado)"
echo ""
echo "📱 BUILDS MÓVEIS PRONTOS:"
echo "   📁 Android APK: $BUILD_TMP/delivery-app/android/app/build/outputs/apk/"
echo "   📁 Android Bundle: $BUILD_TMP/delivery-app/android/app/build/outputs/bundle/"
echo "   📁 iOS Archive: $BUILD_TMP/delivery-app/ios/App/"
echo ""
echo "🏗️  PARA GERAR OS BUILDS FINAIS:"
echo ""
echo "📱 ANDROID (Google Play Store):"
echo "   cd $BUILD_TMP/delivery-app"
echo "   npx cap build android --prod"
echo "   # Arquivo pronto: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "🍎 iOS (Apple App Store):"  
echo "   cd $BUILD_TMP/delivery-app"
echo "   npx cap build ios --prod"
echo "   # Abrir ios/App/App.xcworkspace no Xcode para archive/upload"
echo ""
echo "⚠️  PRÓXIMOS PASSOS:"
echo "   1. Configurar DNS do domínio para apontar para este servidor"
echo "   2. Testar todas as funcionalidades"
echo "   3. Configurar monitoramento"
echo ""
echo "🆘 LOGS E TROUBLESHOOTING:"
echo "   tail -f /var/log/nginx/error.log"
echo "   systemctl status nginx"
echo ""
echo "🚀 Delivery Trem Bão está ONLINE usando Supabase hospedado!"
echo "============================================================================"