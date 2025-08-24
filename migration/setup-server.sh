#!/bin/bash

# Delivery Trem Bão - Supabase Self-Hosted Setup Script
# This script will install and configure everything needed for the migration

set -e

echo "🚀 Starting Delivery Trem Bão Supabase Self-Hosted Setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install additional tools
echo "🛠️ Installing additional tools..."
sudo apt install -y git curl wget unzip postgresql-client-14 nginx certbot python3-certbot-nginx

# Create supabase directory
echo "📁 Creating project directory..."
mkdir -p ~/supabase-delivery
cd ~/supabase-delivery

# Download and setup Supabase self-hosted
echo "📥 Setting up Supabase Self-Hosted..."
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy our custom configuration files
echo "⚙️ Copying configuration files..."
cp /tmp/docker-compose.yml ./docker-compose.yml
cp /tmp/.env ./.env

# Create necessary directories
mkdir -p volumes/db/data
mkdir -p volumes/storage
mkdir -p volumes/functions
mkdir -p volumes/logs

# Set proper permissions
sudo chown -R $USER:$USER volumes/
chmod -R 755 volumes/

# Setup PostgreSQL configuration
echo "🗄️ Setting up PostgreSQL configuration..."
cat > volumes/db/postgresql.conf << 'EOF'
# PostgreSQL configuration for Supabase
shared_preload_libraries = 'pg_stat_statements,pg_cron'
wal_level = logical
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = '1GB'
max_slot_wal_keep_size = '1GB'

# Performance tuning
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'all'
log_duration = on
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on

# Extensions
max_connections = 100
EOF

# Setup Kong configuration
echo "🌐 Setting up Kong API Gateway..."
mkdir -p volumes/api
cat > volumes/api/kong.yml << 'EOF'
_format_version: "1.1"

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}

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

  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors

  - name: auth-v1
    _comment: "GoTrue: /auth/v1/* -> http://auth:9999/*"
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
    _comment: "PostgREST: /rest/v1/* -> http://rest:3000/*"
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
    _comment: "Realtime: /realtime/v1/* -> ws://realtime:4000/socket/*"
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
    _comment: "Storage: /storage/v1/* -> http://storage:5000/*"
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors

  - name: functions-v1
    _comment: "Edge Functions: /functions/v1/* -> http://functions:9000/*"
    url: http://functions:9000/
    routes:
      - name: functions-v1-all
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors

  - name: meta
    _comment: "pg-meta: /pg/* -> http://meta:8080/*"
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

# Setup Vector logging
mkdir -p volumes/logs
cat > volumes/logs/vector.yml << 'EOF'
data_dir: /vector-data-dir

sources:
  docker_host:
    type: docker_logs

transforms:
  only_supabase_logs:
    type: filter
    inputs:
      - docker_host
    condition: |
      .label."com.docker.compose.project" == "supabase" ||
      .label."com.docker.compose.project" == "docker"

sinks:
  logflare_logs:
    type: http
    inputs:
      - only_supabase_logs
    uri: http://analytics:4000/api/logs
    method: post
    healthcheck_uri: http://analytics:4000/health
    headers:
      Content-Type: application/json
      X-API-KEY: ${LOGFLARE_API_KEY}
    encoding:
      codec: json
    batch:
      max_bytes: 1048576
    request:
      retry_attempts: 10
EOF

# Setup Nginx reverse proxy
echo "🌐 Setting up Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/deliverytrembao << 'EOF'
server {
    listen 80;
    server_name deliverytrembao.com.br www.deliverytrembao.com.br;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name deliverytrembao.com.br www.deliverytrembao.com.br;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/deliverytrembao.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deliverytrembao.com.br/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;

    # Supabase API endpoints
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /rest/ {
        proxy_pass http://localhost:8000/rest/;
    }

    location /realtime/ {
        proxy_pass http://localhost:8000/realtime/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /storage/ {
        proxy_pass http://localhost:8000/storage/;
    }

    location /functions/ {
        proxy_pass http://localhost:8000/functions/;
    }

    # Studio (admin panel)
    location /studio/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Main application (will serve the React app)
    location / {
        # For now, just proxy to a placeholder
        return 200 'Delivery Trem Bão - Migration in Progress';
        add_header Content-Type text/plain;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/deliverytrembao /etc/nginx/sites-enabled/
sudo nginx -t

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Create migration scripts directory
mkdir -p ~/migration-scripts
cd ~/migration-scripts

# Copy migration SQL files
cp /tmp/migrate-data.sql ./
cp /tmp/rls-policies.sql ./

# Create data backup script
cat > backup-cloud-data.sh << 'EOF'
#!/bin/bash

# Backup script for cloud Supabase data
echo "🔄 Starting backup of cloud Supabase data..."

# Set your cloud project details
CLOUD_PROJECT_ID="ighllleypgbkluhcihvs"
CLOUD_URL="https://ighllleypgbkluhcihvs.supabase.co"
CLOUD_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaGxsbGV5cGdia2x1aGNpaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDg0MzIsImV4cCI6MjA3MTI4NDQzMn0.32KpEBVd6go9HUpd5IzlaKz2dTai0TqGn9P9Xqqkv2E"

echo "📊 Backing up database schema and data..."
pg_dump "postgresql://postgres:$POSTGRES_PASSWORD@db.ighllleypgbkluhcihvs.supabase.co:5432/postgres" > cloud_backup.sql

echo "✅ Backup completed: cloud_backup.sql"
echo "File size: $(ls -lh cloud_backup.sql | awk '{print $5}')"
EOF

chmod +x backup-cloud-data.sh

# Create restore script
cat > restore-to-local.sh << 'EOF'
#!/bin/bash

# Restore script for local Supabase instance
echo "🔄 Starting restore to local Supabase..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec supabase-db pg_isready -U postgres -d postgres; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Apply database schema and data
echo "📊 Applying database schema..."
docker exec -i supabase-db psql -U postgres -d postgres < migrate-data.sql

echo "🔐 Applying RLS policies..."
docker exec -i supabase-db psql -U postgres -d postgres < rls-policies.sql

if [ -f "cloud_backup.sql" ]; then
    echo "📥 Restoring cloud data..."
    docker exec -i supabase-db psql -U postgres -d postgres < cloud_backup.sql
fi

echo "✅ Restore completed successfully!"
EOF

chmod +x restore-to-local.sh

# Create Edge Functions directory and setup
echo "⚡ Setting up Edge Functions..."
cd ~/supabase-delivery/supabase/docker/volumes/functions

# Copy all edge functions from the cloud project
mkdir -p admin-approve admin-pending admin-reject admin-reports admin-suspend admin-user-action admin-users
mkdir -p auto-cancel-orders calculate-pricing calculate-quote cart-abandonment cleanup-old-data
mkdir -p courier-admin-approve courier-admin-pending courier-admin-reject courier-admin-suspend courier-earnings
mkdir -p get-mapbox-token ip-geolocate order-pod order-status performance-monitor push-notifications
mkdir -p rate-limiter route-eta search-restaurants security-monitor send-notification sign-upload sign-upload-pod
mkdir -p store-admin-approve store-admin-pending store-admin-reject store-admin-suspend store-create store-submit-review
mkdir -p stripe-webhook verify-payment dispatch-accept dispatch-offer dispatch-answer courier-presence location-ping
mkdir -p ops-capacity-set ops-orders-board ops-kds-aggregate merchant-submit-application courier-submit-application
mkdir -p custom-auth-email courier-sign-upload dispatch-stacking-suggest create-payment

# Create main entry point for edge functions
cat > main/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace('/functions/v1/', '')
  
  try {
    // Route to appropriate function based on path
    switch (path) {
      case 'admin-approve':
        const { default: adminApprove } = await import('../admin-approve/index.ts')
        return adminApprove(req)
      // Add all other function routes here...
      default:
        return new Response('Function not found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
EOF

echo "🎯 Migration setup completed!"
echo ""
echo "Next steps:"
echo "1. Update the .env file with your secrets and passwords"
echo "2. Run: docker-compose up -d"
echo "3. Setup SSL certificate: sudo certbot --nginx -d deliverytrembao.com.br"
echo "4. Run the migration scripts to import your data"
echo ""
echo "Access points after setup:"
echo "- Supabase Studio: https://deliverytrembao.com.br/studio"
echo "- API Endpoint: https://deliverytrembao.com.br"
echo "- Database: localhost:5432"
echo ""
echo "🚀 Ready for migration!"
EOF

chmod +x setup-server.sh