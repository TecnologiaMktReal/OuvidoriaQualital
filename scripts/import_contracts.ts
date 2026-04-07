import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import * as db from '../server/db';
import { fileURLToPath } from 'url';
import { generateContractId, extractSequentialFromContractId, extractUfCodeFromContractId, UF_CODES } from '../shared/ufCodes';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runImport() {
  const csvPath = path.resolve(__dirname, '../CONTRATOS_IMP.csv');
  console.log(`Lendo arquivo: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('Arquivo não encontrado!');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');

  // Buscar todos os contratos uma vez para verificar sequenciais
  console.log('Buscando contratos existentes para evitar duplicidade de IDs...');
  const existingContracts = await db.getAllContracts({ pageSize: 1000 });
  console.log(`Encontrados ${existingContracts.length} contratos existentes.`);

  Papa.parse(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    complete: async (results) => {
      console.log(`Linhas encontradas no CSV: ${results.data.length}`);
      
      const rawData = results.data.map((row: any) => {
        const name = row['NOME DO CONTRATO']?.trim();
        const state = row['UF']?.trim().toUpperCase();
        const city = row['CIDADE']?.trim();
        const validityStr = row['DATA DE VALIDADE']?.trim();

        if (!name || !state || !city) return null;

        let validityDate: Date | undefined = undefined;
        if (validityStr) {
          const [day, month, year] = validityStr.split('/').map(Number);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            validityDate = new Date(year, month - 1, day);
          }
        }

        return { name, state, city, validityDate };
      }).filter((c): c is any => c !== null);

      console.log(`Processando ${rawData.length} contratos válidos do CSV...`);

      // Agrupar por estado para gerar IDs sequenciais
      const stateSequentials: Record<string, number> = {};
      const contractsToImport = [];

      for (const item of rawData) {
        if (!stateSequentials[item.state]) {
          const ufCode = UF_CODES[item.state];
          if (!ufCode) {
            console.warn(`UF desconhecida: ${item.state}. Pulando contrato ${item.name}`);
            continue;
          }

          // Encontrar o maior sequencial para este código de UF no banco
          const usedSeqs = existingContracts
            .filter(c => {
              try {
                return extractUfCodeFromContractId(c.id) === ufCode;
              } catch (e) {
                return false;
              }
            })
            .map(c => extractSequentialFromContractId(c.id));

          const maxSeq = usedSeqs.length > 0 ? Math.max(...usedSeqs) : 0;
          stateSequentials[item.state] = maxSeq + 1;
        }

        const id = generateContractId(item.state, stateSequentials[item.state]);
        
        // Verificar se esse ID já está na lista para ser importado (duplicatas no CSV)
        if (contractsToImport.some(c => c.id === id)) {
           stateSequentials[item.state]++;
           // Tentar gerar de novo com o próximo sequencial
           const newId = generateContractId(item.state, stateSequentials[item.state]);
           contractsToImport.push({ ...item, id: newId, status: 'ativo' as const });
        } else {
           contractsToImport.push({
             ...item,
             id,
             status: 'ativo' as const
           });
        }
        
        stateSequentials[item.state]++;
      }

      console.log(`Gerados ${contractsToImport.length} contratos para inserção.`);

      try {
        const importResult = await db.bulkImportContracts(contractsToImport as any);
        console.log('Resultado da Importação:');
        console.log(`- Sucessos: ${importResult.success}`);
        console.log(`- Erros: ${importResult.errors.length}`);
        
        if (importResult.errors.length > 0) {
          console.log('Primeiros 10 erros:');
          importResult.errors.slice(0, 10).forEach(err => {
            console.log(`  Linha ${err.row}: ${err.error} (${err.data.name})`);
          });
        }

        if (importResult.aborted) {
          console.error(`IMPORTAÇÃO ABORTADA: ${importResult.message}`);
        } else {
          console.log('Importação concluída com sucesso!');
        }
      } catch (err: any) {
        console.error('Erro fatal durante a importação:', err?.message || err);
      } finally {
        process.exit(0);
      }
    },
    error: (error: any) => {
      console.error('Erro ao parsear CSV:', error);
      process.exit(1);
    }
  });
}

runImport();


