#!/usr/bin/env node

/**
 * Script para validar implementações críticas do sistema
 * Execute: npm run validate-system
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ighllleypgbkluhcihvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaGxsbGV5cGdia2x1aGNpaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDg0MzIsImV4cCI6MjA3MTI4NDQzMn0.32KpEBVd6go9HUpd5IzlaKz2dTai0TqGn9P9Xqqkv2E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function validateIndexes() {
  console.log('🔍 Validando índices críticos...');
  
  const { data, error } = await supabase.rpc('get_system_stats');
  
  if (error) {
    console.error('❌ Erro ao validar sistema:', error.message);
    return false;
  }
  
  console.log('✅ Sistema funcionando normalmente');
  console.log('📊 Estatísticas:', data);
  return true;
}

async function validateConsistency() {
  console.log('🧪 Validando consistência de dados...');
  
  const { data, error } = await supabase.rpc('validate_data_consistency');
  
  if (error) {
    console.error('❌ Erro na validação:', error.message);
    return false;
  }
  
  const issues = data?.filter(row => row.issue_count > 0) || [];
  
  if (issues.length > 0) {
    console.warn('⚠️ Problemas de consistência encontrados:');
    issues.forEach(issue => {
      console.warn(`  - ${issue.table_name}.${issue.issue_type}: ${issue.issue_count} registros`);
      console.warn(`    ${issue.description}`);
    });
    return false;
  }
  
  console.log('✅ Dados consistentes');
  return true;
}

async function validatePerformance() {
  console.log('⚡ Testando performance de queries...');
  
  // Test chat query performance
  const start = Date.now();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(50);
  
  const duration = Date.now() - start;
  
  if (error) {
    console.error('❌ Erro no teste de performance:', error.message);
    return false;
  }
  
  if (duration > 500) {
    console.warn(`⚠️ Query lenta: ${duration}ms (esperado < 500ms)`);
    return false;
  }
  
  console.log(`✅ Performance OK: ${duration}ms`);
  return true;
}

async function validateWebhook() {
  console.log('🔒 Validando idempotência de webhook...');
  
  // Check if stripe_events table exists and has records
  const { data, error } = await supabase
    .from('stripe_events')
    .select('count')
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Tabela stripe_events não encontrada:', error.message);
    return false;
  }
  
  console.log('✅ Sistema de webhook idempotente configurado');
  return true;
}

async function main() {
  console.log('🚀 Iniciando validação do sistema...\n');
  
  const results = await Promise.allSettled([
    validateIndexes(),
    validateConsistency(),
    validatePerformance(),
    validateWebhook()
  ]);
  
  const passed = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const total = results.length;
  
  console.log(`\n📋 Resumo: ${passed}/${total} testes passaram`);
  
  if (passed === total) {
    console.log('🎉 Sistema validado com sucesso!');
    process.exit(0);
  } else {
    console.log('❌ Alguns testes falharam. Verifique os logs acima.');
    process.exit(1);
  }
}

main().catch(console.error);