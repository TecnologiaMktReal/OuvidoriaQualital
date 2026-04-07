#!/usr/bin/env node
/**
 * Script para aplicar schema no banco de produção (Zeabur)
 * 
 * Uso:
 *   node scripts/apply-schema-production.mjs
 * 
 * Pré-requisitos:
 *   - Variável de ambiente PRODUCTION_DATABASE_URL configurada
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applySchemaToProduction() {
  const prodDbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL_PRODUCTION;

  if (!prodDbUrl) {
    log('\n❌ ERRO: Variável de ambiente PRODUCTION_DATABASE_URL não configurada!\n', 'red');
    log('Configure a variável de ambiente com a connection string do MySQL do Zeabur:', 'yellow');
    log('  PRODUCTION_DATABASE_URL="mysql://user:password@host:port/database"\n', 'blue');
    log('Exemplo para Windows (PowerShell):', 'yellow');
    log('  $env:PRODUCTION_DATABASE_URL="mysql://user:password@host:port/database"', 'blue');
    log('  node scripts/apply-schema-production.mjs\n', 'blue');
    process.exit(1);
  }

  log('\n🚀 Iniciando aplicação de schema em PRODUÇÃO (Zeabur)...', 'bright');
  log(`📊 Database: ${prodDbUrl.replace(/:[^:]*@/, ':****@')}\n`, 'blue');

  let connection;

  try {
    // Conectar ao banco
    log('📡 Conectando ao banco de dados...', 'yellow');
    connection = await mysql.createConnection(prodDbUrl);
    log('✅ Conexão estabelecida!\n', 'green');

    // Ler o script SQL
    const sqlFilePath = path.join(__dirname, 'apply-superadmin-zeabur.sql');
    log(`📄 Lendo script: ${path.basename(sqlFilePath)}`, 'yellow');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Dividir em statements individuais (removendo comentários)
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    log(`📝 Encontrados ${statements.length} comandos SQL\n`, 'blue');

    // Executar cada statement
    log('⚙️  Executando comandos SQL...', 'yellow');
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Pular comentários de bloco e linhas vazias
      if (stmt.startsWith('/*') || stmt.trim() === '') continue;

      try {
        // Extrair descrição do comando para log
        let description = 'Executando comando SQL';
        if (stmt.toUpperCase().includes('ALTER TABLE USERS')) {
          description = 'Atualizando enum da tabela users';
        } else if (stmt.toUpperCase().includes('ALTER TABLE USER_PROFILE_TYPES')) {
          description = 'Atualizando enum da tabela user_profile_types';
        } else if (stmt.toUpperCase().includes('INSERT INTO USER_PROFILE_TYPES')) {
          description = 'Criando profile type SuperAdmin';
        } else if (stmt.toUpperCase().includes('UPDATE USERS')) {
          description = 'Promovendo usuário para SuperAdmin';
        } else if (stmt.toUpperCase().includes('UPDATE PROFILES')) {
          description = 'Atualizando profile do usuário';
        } else if (stmt.toUpperCase().includes('SELECT')) {
          description = 'Verificando resultado';
        } else if (stmt.toUpperCase().includes('SET @')) {
          description = 'Configurando variável';
        }

        log(`  ${i + 1}/${statements.length} - ${description}...`, 'blue');
        const [result] = await connection.execute(stmt);

        // Se for um SELECT, mostrar resultado
        if (stmt.toUpperCase().trim().startsWith('SELECT') && Array.isArray(result) && result.length > 0) {
          console.log('\n  📋 Resultado:');
          console.table(result);
        }
      } catch (error) {
        // Ignorar erro de "duplicate entry" (já existe)
        if (error.code === 'ER_DUP_ENTRY') {
          log(`  ⚠️  Registro já existe (ignorando)`, 'yellow');
        } else {
          throw error;
        }
      }
    }

    log('\n✅ Schema aplicado com SUCESSO no banco de produção!', 'green');
    log('\n🎉 Próximos passos:', 'bright');
    log('  1. Acesse a aplicação no Zeabur', 'blue');
    log('  2. Faça login como ricardo.palacio@coopedu.com.br', 'blue');
    log('  3. Valide acesso às rotas administrativas\n', 'blue');

  } catch (error) {
    log('\n❌ ERRO ao aplicar schema:', 'red');
    log(`   ${error.message}\n`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 Dica: Verifique se o host e porta estão corretos', 'yellow');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('💡 Dica: Verifique usuário e senha da connection string', 'yellow');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      log('💡 Dica: Verifique o nome do banco de dados', 'yellow');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('🔌 Conexão encerrada\n', 'blue');
    }
  }
}

// Executar
applySchemaToProduction().catch(error => {
  log(`\n❌ Erro inesperado: ${error.message}\n`, 'red');
  process.exit(1);
});


