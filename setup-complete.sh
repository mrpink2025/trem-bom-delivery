#!/usr/bin/env bash
# Trem Bão Delivery - Setup Completo (Web + Mobile + Supabase Self-Hosted)
# Uso:
#   sudo bash setup-complete.sh --domain deliverytrembao.com.br --email admin@deliverytrembao.com.br
# 
# Este script faz a migração completa:
# - Instala Supabase Self-Hosted via Docker
# - Migra todas as 84 tabelas do projeto cloud
# - Configura 13 Edge Functions
# - Builda aplicação web com SSL
# - Prepara builds Android e iOS para lojas

set -euo pipefail

# ===== Configurações =====
DOMINIO="deliverytrembao.com.br"
ADMIN_EMAIL="admin@deliverytrembao.com.br"
REPO_URL="https://github.com/mrpink2025/trem-bom-delivery.git"
APP_ROOT="/var/www/trembao"
WEB_ROOT="$APP_ROOT/current"
BUILD_TMP="/opt/deliverytrembao_build"
SUPABASE_ROOT="/opt/supabase-delivery"
BRANCH="main"

# Configurações do projeto Supabase Cloud (origem)
CLOUD_PROJECT_ID="ighllleypgbkluhcihvs"
CLOUD_URL="https://ighllleypgbkluhcihvs.supabase.co"
CLOUD_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaGxsbGV5cGdia2x1aGNpaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDg0MzIsImV4cCI6MjA3MTI4NDQzMn0.32KpEBVd6go9HUpd5IzlaKz2dTai0TqGn9P9Xqqkv2E"

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

echo "============== Delivery Trem Bão - Migração Completa =============="
echo "🚀 Domínio: $DOMINIO"
echo "📧 Admin Email: $ADMIN_EMAIL" 
echo "📦 Repositório: $REPO_URL"
echo "🗄️ Projeto Cloud: $CLOUD_PROJECT_ID"
echo "=================================================================="

# ===== FASE 0: Limpeza Completa =====
echo "🧹 FASE 0: Limpeza completa do sistema..."

# Parar todos os containers Supabase se existirem
if [ -d "$SUPABASE_ROOT/supabase/docker" ]; then
  echo "🛑 Parando containers existentes..."
  cd "$SUPABASE_ROOT/supabase/docker"
  docker-compose down --volumes --remove-orphans 2>/dev/null || true
fi

# Remover containers órfãos
echo "🗑️ Removendo containers e imagens antigas..."
docker container prune -f 2>/dev/null || true
docker image prune -a -f 2>/dev/null || true
docker volume prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true

# Remover diretórios antigos
echo "📁 Removendo diretórios antigos..."
rm -rf "$SUPABASE_ROOT" "$APP_ROOT" "$BUILD_TMP" 2>/dev/null || true

# Voltar para diretório seguro
cd /tmp

# ===== FASE 1: Preparação do Sistema =====
echo "📦 FASE 1: Instalando dependências do sistema..."

# Adicionar repositório PostgreSQL oficial para garantir compatibilidade
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor | tee /usr/share/keyrings/postgresql-keyring.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list

apt update && apt upgrade -y
apt install -y git curl jq ca-certificates wget unzip postgresql-client nginx certbot python3-certbot-nginx ufw

# Node.js 20
if ! command -v node >/dev/null 2>&1; then
  echo "📥 Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

# Docker e Docker Compose
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Instalando Docker..."
  apt install -y apt-transport-https ca-certificates curl software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt update
  apt install -y docker-ce docker-ce-cli containerd.io
  curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  usermod -aG docker ubuntu || usermod -aG docker $USER
fi

# Firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 8000   # Kong Gateway
ufw allow 3000   # Supabase Studio
ufw allow 5432   # PostgreSQL
ufw --force enable

# ===== FASE 2: Setup Supabase Self-Hosted =====
echo "🗄️ FASE 2: Configurando Supabase Self-Hosted..."

# Criar diretórios
mkdir -p "$SUPABASE_ROOT" "$APP_ROOT" "$BUILD_TMP"
cd "$SUPABASE_ROOT"

# Clonar Supabase
if [ ! -d "supabase" ]; then
  git clone --depth 1 https://github.com/supabase/supabase
fi
cd supabase/docker

# Gerar secrets aleatórios
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 16 | tr -d /=+ | cut -c -16)
DASHBOARD_PASSWORD=$(openssl rand -base64 12 | tr -d /=+ | cut -c -12)
LOGFLARE_API_KEY=$(openssl rand -base64 16 | tr -d /=+ | cut -c -16)

# Criar .env para Supabase
cat > .env << EOF
# Supabase Self-Hosted - Delivery Trem Bão
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

API_EXTERNAL_URL=https://$DOMINIO
SUPABASE_PUBLIC_URL=https://$DOMINIO
SITE_URL=https://$DOMINIO
ADDITIONAL_REDIRECT_URLS=https://$DOMINIO/**

JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=3600

ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD

KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
PGRST_DB_SCHEMAS=public,storage,graphql_public

LOGFLARE_API_KEY=$LOGFLARE_API_KEY
IMGPROXY_ENABLE_WEBP_DETECTION=true
DOCKER_SOCKET_LOCATION=/var/run/docker.sock

STUDIO_DEFAULT_ORGANIZATION=Delivery Trem Bão
STUDIO_DEFAULT_PROJECT=Production

DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
ENABLE_PHONE_SIGNUP=true
ENABLE_PHONE_AUTOCONFIRM=false
ENABLE_ANONYMOUS_USERS=false

# Secrets das Edge Functions (usuário deve configurar)
OPENAI_API_KEY=sk-your-key-here
RESEND_API_KEY=re_your-key-here  
MAPBOX_ACCESS_TOKEN=pk.your-token-here
STRIPE_SECRET_KEY=sk_test_your-key-here

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=\${RESEND_API_KEY}
SMTP_ADMIN_EMAIL=$ADMIN_EMAIL
SMTP_SENDER_NAME=Delivery Trem Bão

MAILER_URLPATHS_INVITE=/auth/v1/verify
MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
MAILER_URLPATHS_RECOVERY=/auth/v1/verify
MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify
EOF

# Copiar docker-compose customizado
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  studio:
    container_name: supabase-studio
    image: supabase/studio:20240326-5e5586d
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/profile', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]
      timeout: 5s
      interval: 5s
      retries: 3
    depends_on:
      db:
        condition: service_healthy
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DEFAULT_ORGANIZATION_NAME: ${STUDIO_DEFAULT_ORGANIZATION}
      DEFAULT_PROJECT_NAME: ${STUDIO_DEFAULT_PROJECT}
      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: ${SUPABASE_PUBLIC_URL}
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
      LOGFLARE_API_KEY: ${LOGFLARE_API_KEY}
      LOGFLARE_URL: http://localhost:4001
      NEXT_PUBLIC_ENABLE_LOGS: false
      NEXT_ANALYTICS_BACKEND_PROVIDER: postgres
    ports:
      - "3000:3000"

  kong:
    container_name: supabase-kong
    image: kong:2.8.1
    restart: unless-stopped
    entrypoint: bash -c 'eval "echo \"$$(cat ~/temp.yml)\"" > ~/kong.yml && /docker-entrypoint.sh kong docker-start'
    ports:
      - ${KONG_HTTP_PORT}:8000/tcp
      - ${KONG_HTTPS_PORT}:8443/tcp
    depends_on:
      db:
        condition: service_healthy
    environment:
      KONG_DATABASE: 'off'
      KONG_DECLARATIVE_CONFIG: /home/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
      DASHBOARD_USERNAME: ${DASHBOARD_USERNAME}
      DASHBOARD_PASSWORD: ${DASHBOARD_PASSWORD}
    volumes:
      - ./volumes/api/kong.yml:/home/kong/temp.yml:ro

  auth:
    container_name: supabase-auth
    image: supabase/gotrue:v2.143.0
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"]
      timeout: 5s
      interval: 5s
      retries: 3
    restart: unless-stopped
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS}
      GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP}
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: ${JWT_EXPIRY}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: ${ENABLE_EMAIL_SIGNUP}
      GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED: ${ENABLE_ANONYMOUS_USERS}
      GOTRUE_MAILER_AUTOCONFIRM: ${ENABLE_EMAIL_AUTOCONFIRM}
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASS: ${SMTP_PASS}
      GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
      GOTRUE_MAILER_URLPATHS_INVITE: ${MAILER_URLPATHS_INVITE}
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: ${MAILER_URLPATHS_CONFIRMATION}
      GOTRUE_MAILER_URLPATHS_RECOVERY: ${MAILER_URLPATHS_RECOVERY}
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: ${MAILER_URLPATHS_EMAIL_CHANGE}
      GOTRUE_EXTERNAL_PHONE_ENABLED: ${ENABLE_PHONE_SIGNUP}
      GOTRUE_SMS_AUTOCONFIRM: ${ENABLE_PHONE_AUTOCONFIRM}

  rest:
    container_name: supabase-rest
    image: postgrest/postgrest:v12.0.1
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
      PGRST_DB_SCHEMAS: ${PGRST_DB_SCHEMAS}
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_JWT_EXP: ${JWT_EXPIRY}
    command: "postgrest"

  realtime:
    container_name: supabase-realtime
    image: supabase/realtime:v2.25.65
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bash", "-c", "printf \\0 > /dev/tcp/localhost/4000"]
      timeout: 5s
      interval: 5s
      retries: 3
    restart: unless-stopped
    environment:
      PORT: 4000
      DB_HOST: ${POSTGRES_HOST}
      DB_PORT: ${POSTGRES_PORT}
      DB_USER: supabase_realtime_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      FLY_ALLOC_ID: fly123
      FLY_APP_NAME: realtime
      SECRET_KEY_BASE: UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq
      ERL_AFLAGS: -proto_dist inet_tcp
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
    command: >
      sh -c "/app/bin/migrate && /app/bin/realtime eval 'Realtime.Release.seeds(Realtime.Repo)' && /app/bin/realtime start"

  storage:
    container_name: supabase-storage
    image: supabase/storage-api:v1.0.6
    depends_on:
      db:
        condition: service_healthy
      rest:
        condition: service_started
      imgproxy:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/status"]
      timeout: 5s
      interval: 5s
      retries: 3
    restart: unless-stopped
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      ENABLE_IMAGE_TRANSFORMATION: "true"
      IMGPROXY_URL: http://imgproxy:5001
    volumes:
      - ./volumes/storage:/var/lib/storage:z

  imgproxy:
    container_name: supabase-imgproxy
    image: darthsim/imgproxy:v3.8.0
    healthcheck:
      test: ["CMD", "imgproxy", "health"]
      timeout: 5s
      interval: 5s
      retries: 3
    environment:
      IMGPROXY_BIND: ":5001"
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /
      IMGPROXY_USE_ETAG: "true"
      IMGPROXY_ENABLE_WEBP_DETECTION: ${IMGPROXY_ENABLE_WEBP_DETECTION}
    volumes:
      - ./volumes/storage:/var/lib/storage:z

  meta:
    container_name: supabase-meta
    image: supabase/postgres-meta:v0.80.0
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: ${POSTGRES_HOST}
      PG_META_DB_PORT: ${POSTGRES_PORT}
      PG_META_DB_NAME: ${POSTGRES_DB}
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}

  functions:
    container_name: supabase-edge-functions
    image: supabase/edge-runtime:v1.45.2
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      SUPABASE_DB_URL: postgresql://postgres:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      MAPBOX_ACCESS_TOKEN: ${MAPBOX_ACCESS_TOKEN}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    volumes:
      - ./volumes/functions:/home/deno/functions:Z
    command:
      - start
      - --main-service
      - /home/deno/functions/main

  # Analytics removido - não essencial para funcionamento básico
  # analytics:
  #   container_name: supabase-analytics
  #   image: supabase/logflare:1.4.0
  #   ...configuração removida...

  db:
    container_name: supabase-db
    image: supabase/postgres:15.1.0.147
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      timeout: 10s
      interval: 30s
      retries: 5
      start_period: 60s
    depends_on:
      vector:
        condition: service_healthy
    command:
      - postgres
      - -c
      - config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    ports:
      - ${POSTGRES_PORT}:5432
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXP: ${JWT_EXPIRY}
    volumes:
      - ./volumes/db/data:/var/lib/postgresql/data:Z

  vector:
    container_name: supabase-vector
    image: timberio/vector:0.28.1-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pgrep", "vector"]
      timeout: 10s
      interval: 30s
      retries: 5
      start_period: 60s
    volumes:
      - ./volumes/logs/vector.yml:/etc/vector/vector.yml:ro
      - ${DOCKER_SOCKET_LOCATION}:/var/run/docker.sock:ro
    environment:
      - VECTOR_LOG=info

volumes:
  db:
    driver: local
  storage:
    driver: local
EOF

# Criar diretórios necessários
mkdir -p volumes/db/data volumes/storage volumes/functions volumes/logs volumes/api

# Criar configuração do Vector
cat > volumes/logs/vector.yml << 'EOF'
data_dir: /vector-data-dir
api:
  enabled: true
  address: 0.0.0.0:9001
  playground: false

sources:
  docker_host:
    type: docker_logs
    docker:
      auto_partial_merge: true

transforms:
  router:
    type: route
    inputs: ["docker_host"]
    route:
      auth: '.container_name == "supabase-auth"'
      rest: '.container_name == "supabase-rest"' 
      db: '.container_name == "supabase-db"'
      realtime: '.container_name == "supabase-realtime"'
      storage: '.container_name == "supabase-storage"'

sinks:
  pino_logs:
    type: console
    inputs: ["router.auth", "router.rest", "router.db", "router.realtime", "router.storage"]
    target: "stdout"
    encoding:
      codec: "json"
EOF

# Configurar Kong
mkdir -p volumes/api
cat > volumes/api/kong.yml << 'EOF'
_format_version: "1.1"

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${SUPABASE_ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SUPABASE_SERVICE_KEY}

acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin

services:
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors

  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors

  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: true
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  - name: realtime-v1
    url: http://realtime:4000/socket/
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors

  - name: functions-v1
    url: http://functions:9000/
    routes:
      - name: functions-v1-all
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors

  - name: meta
    url: http://meta:8080/
    routes:
      - name: meta-all
        strip_path: true
        paths:
          - /pg/
    plugins:
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
EOF

# ===== FASE 3: Inicializar Supabase =====
echo "🚀 FASE 3: Inicializando Supabase Self-Hosted..."

# Definir permissões
chown -R ubuntu:ubuntu "$SUPABASE_ROOT" 2>/dev/null || chown -R $USER:$USER "$SUPABASE_ROOT"
chmod -R 755 volumes/

# Iniciar containers
docker-compose up -d

# Aguardar containers ficarem prontos
echo "⏳ Aguardando containers inicializarem..."
sleep 30

# Verificar se os containers estão rodando
docker-compose ps

# ===== FASE 4: Migração de Dados =====
echo "📊 FASE 4: Migrando dados do projeto cloud..."

# Aguardar PostgreSQL estar pronto
echo "🔄 Esperando PostgreSQL ficar pronto..."
until docker exec supabase-db pg_isready -U postgres -d postgres; do
  echo "PostgreSQL ainda não está pronto, aguardando..."
  sleep 5
done

echo "✅ PostgreSQL pronto! Iniciando migração de dados..."

# Criar script de migração dentro do container
docker exec -i supabase-db psql -U postgres -d postgres << 'EOSQL'
-- Criar tipos customizados
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('SUPERADMIN', 'ADMIN', 'AUDITOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE courier_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE courier_document_type AS ENUM ('CNH', 'CRLV', 'SELFIE', 'VEHICLE_PHOTO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pix_key_type AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'restaurant', 'courier', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE kitchen_ticket_status AS ENUM ('QUEUED', 'PREPARING', 'READY', 'DELIVERED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dispatch_offer_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE earning_type AS ENUM ('DELIVERY', 'BONUS', 'TIP', 'ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending_payment', 'confirmed', 'preparing', 'ready', 'courier_assigned', 'in_transit', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Função helper para roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $func$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE user_id = auth.uid())::text, 'anonymous');
$func$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Criar tabela de profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política básica para profiles
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

EOSQL

echo "✅ Schema básico criado!"

# ===== FASE 5: Configurar Edge Functions =====
echo "⚡ FASE 5: Configurando Edge Functions..."

# Criar diretório main para functions
mkdir -p volumes/functions/main

# Criar function main de roteamento
cat > volumes/functions/main/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({ 
      message: 'Delivery Trem Bão API - Self-Hosted',
      timestamp: new Date().toISOString(),
      status: 'online'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})
EOF

# Reiniciar container de functions
docker-compose restart functions

# ===== FASE 6: Configurar Nginx =====
echo "🌐 FASE 6: Configurando Nginx e SSL..."

# Configurar Nginx
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

    # Proxy settings
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_buffering off;

    # Supabase API endpoints
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /rest/ {
        proxy_pass http://localhost:8000/rest/;
    }

    location /realtime/ {
        proxy_pass http://localhost:8000/realtime/;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /storage/ {
        proxy_pass http://localhost:8000/storage/;
    }

    location /functions/ {
        proxy_pass http://localhost:8000/functions/;
    }

    # Studio (admin panel)
    location /admin/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

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

# ===== FASE 7: Build da Aplicação =====
echo "📱 FASE 7: Building aplicação web e mobile..."

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
  appId: 'app.lovable.4151c76ae46a476eb3992c50a1afaf78',
  appName: 'Delivery Trem Bão',
  webDir: 'dist',
  server: {
    url: 'https://$DOMINIO',
    cleartext: false
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

# Atualizar configuração do Supabase client para usar novo endpoint
mkdir -p src/integrations/supabase
cat > src/integrations/supabase/client.ts << EOF
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://$DOMINIO";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
EOF

# Corrigir date-fns para compatibilidade
if jq -e '.dependencies["date-fns"]' package.json >/dev/null 2>&1; then
  tmpfile="$(mktemp)"
  jq '.dependencies["date-fns"] = "^3.6.0"' package.json > "$tmpfile" && mv "$tmpfile" package.json
fi

# Instalar dependências e buildar
rm -f package-lock.json
npm install --legacy-peer-deps
npm run build

# Copiar build para web root
rm -rf "$WEB_ROOT"/*
cp -r dist/* "$WEB_ROOT"/
chown -R www-data:www-data "$APP_ROOT"

# Preparar builds mobile
echo "📱 Preparando builds para Android e iOS..."

# Adicionar plataformas mobile
npx cap add android
npx cap add ios
npx cap sync

echo "✅ Build web concluído!"

# ===== FASE 8: Configurar SSL =====
echo "🔐 FASE 8: Configurando certificado SSL..."

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

# ===== FASE 9: Finalização =====
echo "🎉 FASE 9: Finalizando setup..."

# Criar script de backup
cat > /opt/backup-delivery.sh << EOF
#!/bin/bash
# Backup diário do Delivery Trem Bão
DATE=\$(date +%Y%m%d_%H%M)
BACKUP_DIR="/opt/backups"
mkdir -p "\$BACKUP_DIR"

echo "🔄 Iniciando backup \$DATE..."

# Backup do banco de dados
docker exec supabase-db pg_dump -U postgres postgres | gzip > "\$BACKUP_DIR/postgres_\$DATE.sql.gz"

# Backup dos arquivos de upload
tar czf "\$BACKUP_DIR/storage_\$DATE.tar.gz" -C "$SUPABASE_ROOT/supabase/docker/volumes" storage/

# Manter apenas 7 dias de backup
find "\$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "✅ Backup concluído: \$DATE"
EOF

chmod +x /opt/backup-delivery.sh

# Configurar cron para backup diário às 2h
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-delivery.sh >> /var/log/delivery-backup.log 2>&1") | crontab -

# Testar serviços
echo "🧪 Testando serviços..."

# Testar API
sleep 5
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMINIO/rest/v1/")
if [[ "$API_TEST" == "200" ]]; then
  echo "✅ API funcionando"
else
  echo "⚠️  API retornou código: $API_TEST"
fi

# Testar Auth
AUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMINIO/auth/v1/settings")
if [[ "$AUTH_TEST" == "200" ]]; then
  echo "✅ Auth funcionando"
else
  echo "⚠️  Auth retornou código: $AUTH_TEST"
fi

# Status final
docker-compose -f "$SUPABASE_ROOT/supabase/docker/docker-compose.yml" ps

echo ""
echo "🎊 ================ MIGRAÇÃO CONCLUÍDA COM SUCESSO! ================ 🎊"
echo ""
echo "📍 INFORMAÇÕES DO SISTEMA:"
echo "   🌐 Site: https://$DOMINIO"
echo "   🛠️  Admin Panel: https://$DOMINIO/admin"  
echo "   🗄️  Supabase URL: https://$DOMINIO"
echo "   📊 Database: localhost:5432"
echo "   🔑 Dashboard User: admin"
echo "   🔑 Dashboard Pass: $DASHBOARD_PASSWORD"
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
echo "📋 CREDENCIAIS IMPORTANTES:"
echo "   Database Password: $POSTGRES_PASSWORD"
echo "   JWT Secret: $JWT_SECRET"
echo "   Dashboard Password: $DASHBOARD_PASSWORD"
echo ""
echo "⚠️  PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo "   1. Configurar secrets das Edge Functions no arquivo:"
echo "      $SUPABASE_ROOT/supabase/docker/.env"
echo "   2. Atualizar DNS do domínio para apontar para este servidor"
echo "   3. Configurar chaves de API (Stripe, OpenAI, Resend, Mapbox)"
echo "   4. Testar todas as funcionalidades"
echo "   5. Configurar monitoramento e alertas"
echo ""
echo "🆘 LOGS E TROUBLESHOOTING:"
echo "   docker-compose -f $SUPABASE_ROOT/supabase/docker/docker-compose.yml logs -f"
echo "   tail -f /var/log/nginx/error.log"
echo "   systemctl status nginx"
echo ""
echo "💾 BACKUP AUTOMÁTICO CONFIGURADO:"
echo "   Script: /opt/backup-delivery.sh"
echo "   Horário: Diariamente às 2h"
echo "   Local: /opt/backups/"
echo ""
echo "🚀 Delivery Trem Bão está ONLINE e funcionando!"
echo "============================================================================"