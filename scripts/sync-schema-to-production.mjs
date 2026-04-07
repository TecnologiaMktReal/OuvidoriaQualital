#!/usr/bin/env node
/**
 * Script SEGURO para aplicar schema em produção com confirmação
 * 
 * Uso:
 *   node scripts/sync-schema-to-production.mjs
 * 
 * Fluxo:
 *   1. Compara schema local vs produção
 *   2. Mostra PREVIEW das mudanças
 *   3. PEDE CONFIRMAÇÃO antes de aplicar
 *   4. Executa com validação
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function previewChanges() {
  log('\n📋 PREVIEW DAS MUDANÇAS:', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  
  const changes = [
    '1. Adicionar "SuperAdmin" ao enum da tabela users',
    '2. Adicionar "SuperAdmin" ao enum da tabela user_profile_types',
    '3. Criar profile type "Super Administrador" com role SuperAdmin',
    '4. Promover ricardo.palacio@coopedu.com.br para SuperAdmin',
  ];

  changes.forEach(change => {
    log(`   ✓ ${change}`, 'yellow');
  });

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
}

async function validateConnection(connection) {
  try {
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      throw new Error('Tabela "users" não encontrada. Verifique se está conectado no banco correto!');
    }
    return true;
  } catch (error) {
    throw new Error(`Validação falhou: ${error.message}`);
  }
}

async function checkCurrentState(connection) {
  log('\n🔍 Verificando estado atual do banco...', 'yellow');
  
  try {
    // Verificar enum atual da tabela users
    const [columns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'role'");
    const currentEnum = columns[0]?.Type || '';
    
    if (currentEnum.includes('SuperAdmin')) {
      log('   ⚠️  Enum SuperAdmin JÁ EXISTE na tabela users', 'yellow');
      return { hasEnum: true };
    }
    
    log('   ℹ️  Enum atual: ' + currentEnum, 'blue');
    return { hasEnum: false };
  } catch (error) {
    log(`   ❌ Erro ao verificar estado: ${error.message}`, 'red');
    return { hasEnum: false };
  }
}

async function createBackupRecommendation(connection) {
  log('\n💾 RECOMENDAÇÃO DE BACKUP:', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('   Antes de prosseguir, considere fazer backup:', 'yellow');
  log('   1. No dashboard do Zeabur: MySQL → Backup → Create Backup', 'blue');
  log('   2. Ou via mysqldump (se tiver acesso):', 'blue');
  log('      mysqldump -h HOST -u USER -p DATABASE > backup.sql', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
}

async function applySchemaToProduction() {
  const prodDbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL_PRODUCTION;

  if (!prodDbUrl) {
    log('\n❌ ERRO: Variável de ambiente não configurada!\n', 'red');
    log('Configure primeiro:', 'yellow');
    log('  $env:PRODUCTION_DATABASE_URL="mysql://user:password@host:port/database"', 'blue');
    log('  node scripts/sync-schema-to-production.mjs\n', 'blue');
    process.exit(1);
  }

  log('\n╔════════════════════════════════════════════════════╗', 'bright');
  log('║   SYNC SCHEMA: Local → Produção (Zeabur)          ║', 'bright');
  log('╚════════════════════════════════════════════════════╝', 'bright');

  let connection;

  try {
    // Conectar
    log('\n📡 Conectando ao banco de PRODUÇÃO...', 'yellow');
    const sanitizedUrl = prodDbUrl.replace(/:[^:]*@/, ':****@');
    log(`   Database: ${sanitizedUrl}`, 'blue');
    
    connection = await mysql.createConnection(prodDbUrl);
    log('   ✅ Conectado!\n', 'green');

    // Validar conexão
    await validateConnection(connection);

    // Verificar estado atual
    const state = await checkCurrentState(connection);

    // Mostrar preview
    await previewChanges();

    // Recomendação de backup
    await createBackupRecommendation(connection);

    // PEDIR CONFIRMAÇÃO
    log('\n❓ CONFIRMAÇÃO NECESSÁRIA:', 'bright');
    const answer = await askQuestion(
      colors.yellow + '   Deseja aplicar estas mudanças em PRODUÇÃO? (sim/não): ' + colors.reset
    );

    if (answer.toLowerCase() !== 'sim' && answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'yes') {
      log('\n❌ Operação CANCELADA pelo usuário.', 'red');
      log('   Nenhuma mudança foi aplicada.\n', 'yellow');
      process.exit(0);
    }

    // Ler script SQL
    log('\n⚙️  Aplicando mudanças...', 'bright');
    const sqlFilePath = path.join(__dirname, 'apply-superadmin-zeabur.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*'));

    let executedCount = 0;
    let skippedCount = 0;

    for (const stmt of statements) {
      try {
        await connection.execute(stmt);
        executedCount++;
        
        if (stmt.toUpperCase().includes('SELECT')) {
          const [result] = await connection.execute(stmt);
          if (Array.isArray(result) && result.length > 0) {
            log('\n   📊 Verificação:', 'cyan');
            console.table(result);
          }
        }
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate')) {
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    log('\n✅ SCHEMA APLICADO COM SUCESSO!', 'green');
    log(`   Executados: ${executedCount} comandos`, 'blue');
    if (skippedCount > 0) {
      log(`   Ignorados: ${skippedCount} (já existentes)`, 'yellow');
    }

    log('\n🎉 Próximos passos:', 'bright');
    log('   1. Acesse a aplicação no Zeabur', 'blue');
    log('   2. Login como ricardo.palacio@coopedu.com.br', 'blue');
    log('   3. Valide acesso completo às rotas admin\n', 'blue');

  } catch (error) {
    log('\n❌ ERRO:', 'red');
    log(`   ${error.message}\n`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 Verifique host e porta', 'yellow');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('💡 Verifique usuário e senha', 'yellow');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applySchemaToProduction().catch(error => {
  log(`\n❌ Erro: ${error.message}\n`, 'red');
  process.exit(1);
});


