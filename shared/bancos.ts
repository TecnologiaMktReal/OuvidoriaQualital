/**
 * Lista de Bancos Brasileiros
 * Fonte: https://github.com/guibranco/BancosBrasileiros
 * Atualizado automaticamente
 */

import bancosData from './bancosBrasil.json';

export interface Banco {
  codigo: string;
  nome: string;
}

// Processar e exportar lista simplificada de bancos
export const BANCOS_BRASIL: Banco[] = bancosData
  .map((banco: any) => ({
    codigo: banco.COMPE,
    nome: banco.ShortName || banco.LongName,
  }))
  .filter((banco) => banco.codigo && banco.nome)
  .sort((a, b) => a.codigo.localeCompare(b.codigo));

// Função auxiliar para buscar banco por código
export function getBancoPorCodigo(codigo: string): Banco | undefined {
  return BANCOS_BRASIL.find((banco) => banco.codigo === codigo);
}

// Função auxiliar para buscar bancos por nome (busca parcial)
export function buscarBancosPorNome(termo: string): Banco[] {
  const termoNormalizado = termo.toUpperCase();
  return BANCOS_BRASIL.filter((banco) =>
    banco.nome.toUpperCase().includes(termoNormalizado)
  );
}



