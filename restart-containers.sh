#!/bin/bash
# Script para reiniciar containers com imagens atualizadas

echo "🔄 Parando containers antigos..."
cd /opt/supabase-delivery/supabase/docker
docker-compose down

echo "🗑️ Removendo imagens antigas..."
docker image prune -f

echo "🚀 Iniciando containers com imagens atualizadas..."
docker-compose up -d

echo "⏳ Aguardando inicialização..."
sleep 30

echo "📊 Status dos containers:"
docker-compose ps

echo "✅ Containers reiniciados com sucesso!"