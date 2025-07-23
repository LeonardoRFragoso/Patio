/**
 * ========================================
 * UTILITÁRIO DE ORDENAÇÃO DE POSIÇÕES
 * Garante ordenação consistente em todos os componentes
 * ========================================
 */

/**
 * Função de comparação para ordenar posições corretamente
 * @param {Object|String} a - Primeira posição (objeto ou string)
 * @param {Object|String} b - Segunda posição (objeto ou string)
 * @returns {number} Resultado da comparação (-1, 0, 1)
 */
function comparePositions(a, b) {
  // Se são strings, converter para objetos
  const posA = typeof a === 'string' ? parsePositionString(a) : a;
  const posB = typeof b === 'string' ? parsePositionString(b) : b;
  
  if (!posA || !posB) {
    return 0; // Se não conseguir parsear, manter ordem original
  }
  
  // Primeiro por bay (A, B, C, D, E)
  if (posA.bay !== posB.bay) {
    return posA.bay.localeCompare(posB.bay);
  }
  
  // Depois por posição numérica (1, 2, 3, ..., 20)
  if (posA.posicao !== posB.posicao) {
    return posA.posicao - posB.posicao;
  }
  
  // Por último por altura (1, 2, 3, 4, 5)
  return posA.altura - posB.altura;
}

/**
 * Converte string de posição para objeto
 * @param {string} positionString - String no formato A01-1
 * @returns {Object|null} Objeto com bay, posicao e altura
 */
function parsePositionString(positionString) {
  const match = positionString.match(/^([A-E])(\d{2})-(\d+)$/);
  if (match) {
    const [, bay, posicao, altura] = match;
    return {
      bay,
      posicao: parseInt(posicao),
      altura: parseInt(altura),
      original: positionString
    };
  }
  return null;
}

/**
 * Ordena array de posições (strings ou objetos)
 * @param {Array} positions - Array de posições
 * @returns {Array} Array ordenado
 */
function sortPositions(positions) {
  return [...positions].sort(comparePositions);
}

/**
 * Ordena array de strings de posições
 * @param {Array<string>} positionStrings - Array de strings de posições
 * @returns {Array<string>} Array ordenado
 */
function sortPositionStrings(positionStrings) {
  return [...positionStrings].sort((a, b) => {
    const posA = parsePositionString(a);
    const posB = parsePositionString(b);
    return comparePositions(posA, posB);
  });
}

/**
 * Agrupa posições por bay mantendo ordenação
 * @param {Array} positions - Array de posições
 * @returns {Object} Objeto agrupado por bay
 */
function groupPositionsByBaySorted(positions) {
  const grouped = {};
  
  // Primeiro ordenar todas as posições
  const sortedPositions = sortPositions(positions);
  
  // Depois agrupar
  sortedPositions.forEach(pos => {
    const bay = typeof pos === 'string' ? parsePositionString(pos)?.bay : pos.bay;
    if (bay) {
      if (!grouped[bay]) {
        grouped[bay] = [];
      }
      grouped[bay].push(pos);
    }
  });
  
  return grouped;
}

/**
 * Valida se uma posição está no formato correto
 * @param {string} position - String da posição
 * @returns {boolean} True se válida
 */
function isValidPositionFormat(position) {
  return /^[A-E]\d{2}-\d+$/.test(position);
}

/**
 * Formata posição para exibição padronizada
 * @param {string|Object} position - Posição (string ou objeto)
 * @returns {string} Posição formatada
 */
function formatPositionDisplay(position) {
  if (typeof position === 'string') {
    const parsed = parsePositionString(position);
    if (parsed) {
      return `${parsed.bay}${parsed.posicao.toString().padStart(2, '0')}-${parsed.altura}`;
    }
    return position;
  }
  
  if (position && position.bay && position.posicao && position.altura) {
    return `${position.bay}${position.posicao.toString().padStart(2, '0')}-${position.altura}`;
  }
  
  return position?.original || position?.id || 'Posição inválida';
}

/**
 * Cria descrição detalhada da posição
 * @param {string|Object} position - Posição
 * @returns {string} Descrição detalhada
 */
function createPositionDescription(position) {
  const parsed = typeof position === 'string' ? parsePositionString(position) : position;
  if (parsed) {
    return `Bay ${parsed.bay}, Posição ${parsed.posicao}, Altura ${parsed.altura}`;
  }
  return 'Posição inválida';
}

/**
 * Filtra posições por critérios
 * @param {Array} positions - Array de posições
 * @param {Object} filters - Filtros { bay, altura, search }
 * @returns {Array} Posições filtradas e ordenadas
 */
function filterAndSortPositions(positions, filters = {}) {
  let filtered = positions.filter(pos => {
    const parsed = typeof pos === 'string' ? parsePositionString(pos) : pos;
    if (!parsed) return false;
    
    // Filtro por bay
    if (filters.bay && parsed.bay !== filters.bay) {
      return false;
    }
    
    // Filtro por altura
    if (filters.altura && parsed.altura !== parseInt(filters.altura)) {
      return false;
    }
    
    // Filtro por busca
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = `${parsed.bay}${parsed.posicao.toString().padStart(2, '0')}-${parsed.altura} ${createPositionDescription(parsed)}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
  
  return sortPositions(filtered);
}

/**
 * Obtém estatísticas das posições
 * @param {Array} positions - Array de posições
 * @returns {Object} Estatísticas
 */
function getPositionStats(positions) {
  const stats = {
    total: positions.length,
    porBay: {},
    porAltura: {},
    containers20ft: 0,
    containers40ft: 0
  };
  
  positions.forEach(pos => {
    const parsed = typeof pos === 'string' ? parsePositionString(pos) : pos;
    if (parsed) {
      // Por bay
      if (!stats.porBay[parsed.bay]) {
        stats.porBay[parsed.bay] = 0;
      }
      stats.porBay[parsed.bay]++;
      
      // Por altura
      if (!stats.porAltura[parsed.altura]) {
        stats.porAltura[parsed.altura] = 0;
      }
      stats.porAltura[parsed.altura]++;
      
      // Por tamanho de container
      if (parsed.posicao % 2 !== 0) {
        stats.containers20ft++;
      } else {
        stats.containers40ft++;
      }
    }
  });
  
  return stats;
}

// Exportar funções
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    comparePositions,
    parsePositionString,
    sortPositions,
    sortPositionStrings,
    groupPositionsByBaySorted,
    isValidPositionFormat,
    formatPositionDisplay,
    createPositionDescription,
    filterAndSortPositions,
    getPositionStats
  };
} else {
  // Browser
  window.PositionSortingUtils = {
    comparePositions,
    parsePositionString,
    sortPositions,
    sortPositionStrings,
    groupPositionsByBaySorted,
    isValidPositionFormat,
    formatPositionDisplay,
    createPositionDescription,
    filterAndSortPositions,
    getPositionStats
  };
}

console.log('✅ Utilitário de ordenação de posições carregado');
