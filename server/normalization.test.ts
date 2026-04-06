import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeObjectFields } from '../shared/textUtils';

describe('Text Normalization', () => {
  describe('normalizeText', () => {
    it('deve converter texto para maiúsculas', () => {
      expect(normalizeText('joão silva')).toBe('JOAO SILVA');
      expect(normalizeText('maria')).toBe('MARIA');
    });

    it('deve remover acentuação', () => {
      expect(normalizeText('São Paulo')).toBe('SAO PAULO');
      expect(normalizeText('José')).toBe('JOSE');
      expect(normalizeText('Ação')).toBe('ACAO');
      expect(normalizeText('Côrte')).toBe('CORTE');
    });

    it('deve substituir ç por C', () => {
      expect(normalizeText('Atenção')).toBe('ATENCAO');
      expect(normalizeText('Serviço')).toBe('SERVICO');
      expect(normalizeText('Açúcar')).toBe('ACUCAR');
    });

    it('deve lidar com texto vazio e null', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });

    it('deve processar texto completo com múltiplos casos', () => {
      expect(normalizeText('joão da silva são josé')).toBe('JOAO DA SILVA SAO JOSE');
      expect(normalizeText('Endereço: Rua José de Alencar, nº 123')).toBe('ENDERECO: RUA JOSE DE ALENCAR, NO 123');
    });
  });

  describe('normalizeObjectFields', () => {
    it('deve normalizar campos específicos de um objeto', () => {
      const obj = {
        name: 'joão silva',
        city: 'são paulo',
        state: 'sp',
        id: 123,
      };

      const normalized = normalizeObjectFields(obj, ['name', 'city']);

      expect(normalized.name).toBe('JOAO SILVA');
      expect(normalized.city).toBe('SAO PAULO');
      expect(normalized.state).toBe('sp'); // não normalizado
      expect(normalized.id).toBe(123); // não normalizado
    });

    it('deve ignorar campos não-string', () => {
      const obj = {
        name: 'josé',
        age: 30,
        active: true,
      };

      const normalized = normalizeObjectFields(obj, ['name', 'age', 'active']);

      expect(normalized.name).toBe('JOSE');
      expect(normalized.age).toBe(30);
      expect(normalized.active).toBe(true);
    });
  });
});



