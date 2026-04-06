/**
 * Normaliza texto para o padrão do sistema:
 * - Converte para MAIÚSCULAS
 * - Remove acentuação
 * - Substitui ç por C
 * 
 * @param text - Texto a ser normalizado
 * @returns Texto normalizado
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Mapeamento de caracteres especiais comuns
      const map: Record<string, string> = {
        'Ç': 'C',
        'ª': 'A',
        'º': 'O',
        '°': 'O',
      };
      return map[char] || char;
    });
}

/**
 * Normaliza um objeto aplicando normalizeText em campos de texto específicos
 * @param obj - Objeto a ser normalizado
 * @param fields - Array de campos que devem ser normalizados
 * @returns Objeto com campos normalizados
 */
export function normalizeObjectFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const normalized = { ...obj };
  
  for (const field of fields) {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeText(normalized[field] as string) as T[typeof field];
    }
  }
  
  return normalized;
}



