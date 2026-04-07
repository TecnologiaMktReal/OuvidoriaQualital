import "dotenv/config";
import { createAttendanceReason, getDb } from "../server/db";

const DEFAULT_DB = "mysql://root:root@localhost:3307/app_db";

const motivos = [
  "ALT. CONTA",
  "APP BUG",
  "APP CAD",
  "APP DUVIDAS",
  "APR. EMPRESTIMO",
  "ATEND. OWL",
  "ATR. PGTO COTA-PARTE",
  "ATR. PGTO DESC/SOBRAS",
  "ATR. PGTO ESTORNO",
  "CONVOCACOES",
  "COTA-PARTE DUVIDAS",
  "COTA-PARTE PGTO",
  "DADOS CADASTRAIS",
  "DATA PAGAMENTO",
  "DECIMO TERCEIRO",
  "DECLARACOES",
  "DEMONST. PAGAMENTO",
  "DESCANSO REMUNERADAS",
  "DIFICULDADE COORDENADOR",
  "ESTORNO DE PRODUTIVIDADE",
  "MATERNIDADE",
  "NAO CLIENTE",
  "OWL CELEBRA",
  "PARCERIAS",
  "PREENCHIMENTO OBRIGATORIO",
  "PROCESSO SELETIVO",
  "PRODUTIVIDADE FINAL DE SEMANA E FERIADOS",
  "RECLAMACAO COORDENADOR",
  "RECLAMACAO OWL",
  "RECLAMACAO VALORES INDEVIDOS NA PRODUTIVIDADE",
  "RECLAMACOES ATENDIMENTO",
  "RECLAMACOES FINANCEIRO",
  "RECLAMACOES LOGISTICA",
  "RECLAMACOES OUVIDORIA",
  "RECLAMACOES RH",
  "SEM RESPOSTA",
  "SOLICITACAO DE EMPRESTIMOS",
  "SOLICITACAO DE FARDAMENTO",
  "SOLICITACAO DESLIGAMENTO",
  "SOLICITACAO FICHA CADASTRAL",
  "SUGESTOES",
  "TAXAS INDEVIDAS COOPEDU",
  "TAXAS INDEVIDAS OWL",
  "TICKET FECHADO",
];

function normalize(str: string) {
  return str.trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = DEFAULT_DB;
  }

  const db = await getDb();
  if (!db) {
    throw new Error("DB não disponível");
  }

  for (const motivo of motivos) {
    await createAttendanceReason({
      name: normalize(motivo),
      slaHours: 600, // armazenado em minutos no campo compatível
      isActive: true,
    } as any);
  }

  console.log(`Seed finalizado (${motivos.length} motivos).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



