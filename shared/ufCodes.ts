/**
 * Mapeamento de códigos numéricos por UF brasileira
 * Usado para gerar IDs personalizados de contratos
 */
export const UF_CODES: Record<string, number> = {
  'AC': 1, // Acre
  'AL': 2, // Alagoas
  'AP': 3, // Amapá
  'AM': 4, // Amazonas
  'BA': 5, // Bahia
  'CE': 6, // Ceará
  'DF': 7, // Distrito Federal
  'ES': 8, // Espírito Santo
  'GO': 9, // Goiás
  'MA': 10, // Maranhão (1 + 0)
  'MT': 11, // Mato Grosso (1 + 1)
  'MS': 12, // Mato Grosso do Sul (1 + 2)
  'MG': 13, // Minas Gerais (1 + 3)
  'PA': 14, // Pará (1 + 4)
  'PB': 15, // Paraíba (1 + 5)
  'PR': 16, // Paraná (1 + 6)
  'PE': 17, // Pernambuco (1 + 7)
  'PI': 18, // Piauí (1 + 8)
  'RJ': 19, // Rio de Janeiro (1 + 9)
  'RN': 20, // Rio Grande do Norte (2 + 0)
  'RS': 21, // Rio Grande do Sul (2 + 1)
  'RO': 22, // Rondônia (2 + 2)
  'RR': 23, // Roraima (2 + 3)
  'SC': 24, // Santa Catarina (2 + 4)
  'SP': 25, // São Paulo (2 + 5)
  'SE': 26, // Sergipe (2 + 6)
  'TO': 27, // Tocantins (2 + 7)
};

/**
 * Gera um ID personalizado para contrato baseado na UF
 * Formato: [código UF (1-2 dígitos)][sequencial (3 dígitos)]
 * Exemplos: RN (20) + 001 = 20001, SP (25) + 042 = 25042
 */
export function generateContractId(state: string, sequentialNumber: number): number {
  const ufCode = UF_CODES[state.toUpperCase()];
  if (!ufCode) {
    throw new Error(`UF inválida: ${state}`);
  }
  
  // Garantir que o número sequencial tenha 3 dígitos
  const sequential = sequentialNumber.toString().padStart(3, '0');
  
  // Combinar código da UF + sequencial
  return parseInt(`${ufCode}${sequential}`);
}

/**
 * Extrai o código da UF de um ID de contrato
 */
export function extractUfCodeFromContractId(contractId: number): number {
  const idStr = contractId.toString();
  
  // Se o ID tem 4 dígitos, o código da UF é o primeiro dígito
  if (idStr.length === 4) {
    return parseInt(idStr[0]);
  }
  
  // Se o ID tem 5 dígitos, o código da UF são os dois primeiros dígitos
  if (idStr.length === 5) {
    return parseInt(idStr.substring(0, 2));
  }
  
  throw new Error(`ID de contrato inválido: ${contractId}`);
}

/**
 * Extrai o número sequencial de um ID de contrato
 */
export function extractSequentialFromContractId(contractId: number): number {
  const idStr = contractId.toString();
  
  // Se o ID tem 4 dígitos, o sequencial são os últimos 3 dígitos
  if (idStr.length === 4) {
    return parseInt(idStr.substring(1));
  }
  
  // Se o ID tem 5 dígitos, o sequencial são os últimos 3 dígitos
  if (idStr.length === 5) {
    return parseInt(idStr.substring(2));
  }
  
  throw new Error(`ID de contrato inválido: ${contractId}`);
}



