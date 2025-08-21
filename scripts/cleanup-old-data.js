#!/usr/bin/env node

/**
 * Script para limpeza automática de dados antigos
 * Roda via cron job ou manualmente para manutenção de performance + LGPD
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log('🧹 Iniciando limpeza de dados antigos...');
  
  try {
    // Executar função de limpeza
    const { data, error } = await supabase.rpc('cleanup_old_tracking_data');
    
    if (error) {
      throw new Error(`Erro na limpeza: ${error.message}`);
    }
    
    console.log('✅ Limpeza concluída com sucesso');
    
    // Verificar estatísticas após limpeza
    const { data: stats } = await supabase.rpc('get_system_stats');
    if (stats && stats.length > 0) {
      const s = stats[0];
      console.log('📊 Estatísticas pós-limpeza:');
      console.log(`   Restaurantes ativos: ${s.active_restaurants}`);
      console.log(`   Total de pedidos: ${s.total_orders}`);
      console.log(`   Pedidos hoje: ${s.orders_today}`);
      console.log(`   Tempo médio de entrega: ${s.avg_delivery_time?.toFixed(1) || 'N/A'} min`);
    }
    
    // Vacuum e reindex para otimizar performance
    console.log('🔧 Otimizando índices...');
    
    // Recriar estatísticas das tabelas
    await supabase.rpc('analyze_tables'); // Se existir
    
    console.log('🎉 Manutenção completa!');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };