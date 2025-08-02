/**
 * Utilitários de Validação de Posicionamento - VERSÃO CORRIGIDA BASEADA EM DADOS REAIS
 * Arquivo: utils/validation.js
 * 
 * 🔴 IMPLEMENTA AS REGRAS REAIS DO PÁTIO SUZANO-SP:
 * - Baseado em dados reais de posicao_suzano.txt
 * - TODAS as baias 01-20 existem
 * - Container 20ft: ocupa 1 baia
 * - Container 40ft: ocupa 2 baias consecutivas
 * - Bloqueio por ocupação física, não por regras artificiais
 */

import { CONFIG } from './constants.js';

// ===== FUNÇÕES DE VERIFICAÇÃO DE TIPO =====

/**
 * Verifica se um container é do tipo 40ft TEU
 * @param {Object} container - Objeto do container
 * @returns {boolean} - true se for 40ft
 */
export function isContainer40TEU(container) {
  if (!container) return false;
  
  // Verificar por diferentes propriedades possíveis
  const tipo = container.tipo || container.type || container.tamanho || container.size;
  
  if (typeof tipo === 'string') {
    return tipo.includes('40') || tipo.toLowerCase().includes('quarenta');
  }
  
  // Verificar por dimensões se disponível
  if (container.comprimento || container.length) {
    const comprimento = container.comprimento || container.length;
    return comprimento >= 12; // 40ft ≈ 12.2m
  }
  
  return false;
}

// ===== FUNÇÕES DE VALIDAÇÃO DE POSICIONAMENTO =====

/**
 * Verifica se um container 20ft pode ser colocado em uma posição
 * @param {string} row - Row (A, B, C, D, E)
 * @param {number} baia - Número da baia (deve ser ímpar: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19)
 * @param {number} altura - Altura (1-5)
 * @param {Array} containersExistentes - Lista de containers já posicionados
 * @returns {boolean} - true se pode colocar
 */
export function podeColocar20ft(row, baia, altura, containersExistentes = []) {
  // 1. 🔴 NOVA REGRA: Container 20ft só pode usar posições físicas ímpares
  if (!CONFIG.BAIAS_FISICAS.includes(baia)) {
    console.warn(`❌ Container 20ft só pode usar posições físicas ímpares. Baia ${baia} é inválida. Use: ${CONFIG.BAIAS_FISICAS.join(', ')}`);
    return false;
  }
  
  // 2. Verificar se posição física não está ocupada
  if (posicaoOcupada(row, baia, altura, containersExistentes)) {
    return false;
  }
  
  // 3. Verificar altura máxima para o row
  const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
  if (altura > alturaMaxima) {
    console.warn(`❌ Altura ${altura} excede máximo para row ${row}: ${alturaMaxima}`);
    return false;
  }
  
  // 4. Verificar suporte (se altura > 1, deve ter container embaixo)
  if (altura > 1) {
    const temSuporte = posicaoOcupada(row, baia, altura - 1, containersExistentes);
    if (!temSuporte) {
      console.warn(`❌ Container em ${row}${baia.toString().padStart(2, '0')}-${altura} precisa de suporte`);
      return false;
    }
  }
  
  return true;
}

/**
 * Verifica se um container 40ft pode ser colocado em uma posição
 * @param {string} row - Row (A, B, C, D, E)
 * @param {number} baia - Número da baia lógica par (2, 4, 6, 8, 10, 12, 14, 16, 18)
 * @param {number} altura - Altura (1-5)
 * @param {Array} containersExistentes - Lista de containers já posicionados
 * @returns {boolean} - true se pode colocar
 */
export function podeColocar40ft(row, baia, altura, containersExistentes = []) {
  // 1. 🔴 NOVA REGRA: Container 40ft usa posição lógica par
  if (!CONFIG.BAIAS_POR_TIPO['40ft'].includes(baia)) {
    console.warn(`❌ Container 40ft só pode usar posições lógicas pares. Baia ${baia} é inválida. Use: ${CONFIG.BAIAS_POR_TIPO['40ft'].join(', ')}`);
    return false;
  }
  
  // 2. Obter as posições físicas ímpares que serão ocupadas
  const posicoesOcupadas = CONFIG.MAPEAMENTO_40FT[baia];
  if (!posicoesOcupadas) {
    console.warn(`❌ Mapeamento não encontrado para baia lógica ${baia}`);
    return false;
  }
  
  const [baiaFisica1, baiaFisica2] = posicoesOcupadas;
  
  // 3. Verificar se a segunda posição física existe (para evitar A20 que seria A19+A21)
  if (!CONFIG.BAIAS_FISICAS.includes(baiaFisica2)) {
    console.warn(`❌ Posição lógica ${baia} requer posição física ${baiaFisica2} que não existe`);
    return false;
  }
  
  // 4. Verificar altura máxima para o row
  const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
  if (altura > alturaMaxima) {
    console.warn(`❌ Altura ${altura} excede máximo para row ${row}: ${alturaMaxima}`);
    return false;
  }
  
  // 5. 🔴 REGRA CRÍTICA: Verificar se ambas as posições físicas ímpares estão livres
  const fisica1Livre = !posicaoOcupada(row, baiaFisica1, altura, containersExistentes);
  const fisica2Livre = !posicaoOcupada(row, baiaFisica2, altura, containersExistentes);
  
  if (!fisica1Livre || !fisica2Livre) {
    console.warn(`❌ Container 40ft (posição lógica ${baia}) precisa das posições físicas ${baiaFisica1} e ${baiaFisica2} livres. ${baiaFisica1}: ${fisica1Livre ? 'livre' : 'ocupada'}, ${baiaFisica2}: ${fisica2Livre ? 'livre' : 'ocupada'}`);
    return false;
  }
  
  // 6. Verificar suporte (se altura > 1, ambas as posições físicas devem ter suporte)
  if (altura > 1) {
    const suporteFisica1 = posicaoOcupada(row, baiaFisica1, altura - 1, containersExistentes);
    const suporteFisica2 = posicaoOcupada(row, baiaFisica2, altura - 1, containersExistentes);
    
    if (!suporteFisica1 || !suporteFisica2) {
      console.warn(`❌ Container 40ft em altura ${altura} precisa de suporte em ambas as posições físicas. Suporte ${baiaFisica1}: ${suporteFisica1 ? 'ok' : 'faltando'}, Suporte ${baiaFisica2}: ${suporteFisica2 ? 'ok' : 'faltando'}`);
      return false;
    }
  }
  
  console.log(`✅ Container 40ft pode ser colocado na posição lógica ${row}${baia.toString().padStart(2, '0')}-${altura} (ocupará posições físicas ${baiaFisica1} e ${baiaFisica2})`);
  return true;
}

/**
 * Verifica se uma posição física está bloqueada por um container 40ft
 * @param {string} row - Row (A, B, C, D, E)
 * @param {number} baia - Número da baia física ímpar a verificar
 * @param {number} altura - Altura (1-5)
 * @param {Array} containersExistentes - Lista de containers já posicionados
 * @returns {boolean} - true se está bloqueada
 */
export function baiaBloqueadaPor40ft(row, baia, altura, containersExistentes = []) {
  // 🔴 NOVA LÓGICA: Verificar se há containers 40ft que ocupam esta posição física ímpar
  for (const container of containersExistentes) {
    if (container.row !== row || container.altura !== altura) continue;
    
    // Se é um container 40ft, verificar se bloqueia a baia física atual
    if (isContainer40TEU(container)) {
      const baiaLogica = container.baia || container.bay;
      
      // Obter as posições físicas ocupadas por este container 40ft
      const posicoesOcupadas = CONFIG.MAPEAMENTO_40FT[baiaLogica];
      if (posicoesOcupadas && posicoesOcupadas.includes(baia)) {
        console.log(`🚫 Posição física ${baia} ocupada por container 40ft na posição lógica ${baiaLogica} (ocupa físicas: ${posicoesOcupadas.join(', ')})`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Verifica se uma posição está ocupada
 * @param {string} row - Fileira (A-E)
 * @param {number} bay - Baia (1-20)
 * @param {number} altura - Altura (1-5)
 * @param {Array} containers - Lista de containers
 * @returns {boolean}
 */
export function posicaoOcupada(row, bay, altura, containers = []) {
  if (!containers || !Array.isArray(containers)) return false;
  
  return containers.some(container => {
    const containerRow = container.row || container.linha;
    const containerBay = parseInt(container.bay || container.baia);
    const containerAltura = parseInt(container.altura);
    
    return containerRow === row && 
           containerBay === bay && 
           containerAltura === altura;
  });
}

/**
 * 🔴 FUNÇÃO PRINCIPAL: Valida posicionamento de qualquer container
 * @param {Array} containers - Lista de containers existentes
 * @param {Object} novoContainer - Container a ser posicionado
 * @returns {Object} {valido: boolean, erro: string}
 */
export function validarPosicionamentoContainer(containers, novoContainer) {
  try {
    const row = novoContainer.row || novoContainer.linha;
    const baia = parseInt(novoContainer.bay || novoContainer.baia);
    const altura = parseInt(novoContainer.altura);
    
    // Validações básicas
    if (!CONFIG.ROWS.includes(row)) {
      return { valido: false, erro: `Fileira ${row} inválida. Use: ${CONFIG.ROWS.join(', ')}` };
    }
    
    if (isNaN(baia) || baia < 1 || baia > CONFIG.BAIAS_MAX) {
      return { valido: false, erro: `Baia ${baia} inválida. Use: 1-${CONFIG.BAIAS_MAX}` };
    }
    
    if (isNaN(altura) || altura < 1 || altura > CONFIG.ALTURAS_MAX) {
      return { valido: false, erro: `Altura ${altura} inválida. Use: 1-${CONFIG.ALTURAS_MAX}` };
    }
    
    // Validar baseado no tipo de container
    const eh40ft = isContainer40TEU(novoContainer);
    
    if (eh40ft) {
      const podeColocar = podeColocar40ft(row, baia, altura, containers);
      return { valido: podeColocar, erro: podeColocar ? null : 'Container 40ft não pode ser posicionado nesta localização' };
    } else {
      const podeColocar = podeColocar20ft(row, baia, altura, containers);
      return { valido: podeColocar, erro: podeColocar ? null : 'Container 20ft não pode ser posicionado nesta localização' };
    }
    
  } catch (error) {
    return { valido: false, erro: `Erro na validação: ${error.message}` };
  }
}

/**
 * 🔴 FUNÇÃO PARA OBTER TODAS AS POSIÇÕES DISPONÍVEIS - NOVA LÓGICA CORRIGIDA
 * @param {Array} containers - Lista de containers existentes
 * @param {string} tipoContainer - '20ft' ou '40ft'
 * @returns {Array} Lista de posições disponíveis
 */
export function obterPosicoesDisponiveis(containers = [], tipoContainer = '20ft') {
  const posicoesDisponiveis = [];
  
  CONFIG.ROWS.forEach(row => {
    const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
    
    // 🔴 NOVA LÓGICA: Usar baias específicas por tipo
    const baiasParaTestar = CONFIG.BAIAS_POR_TIPO[tipoContainer] || [];
    
    for (const baia of baiasParaTestar) {
      for (let altura = 1; altura <= alturaMaxima; altura++) {
        let podeColocar = false;
        
        if (tipoContainer === '40ft') {
          // Container 40ft: testar posição lógica par
          podeColocar = podeColocar40ft(row, baia, altura, containers);
        } else {
          // Container 20ft: testar posição física ímpar
          podeColocar = podeColocar20ft(row, baia, altura, containers);
        }
        
        if (podeColocar) {
          const posicaoInfo = {
            row,
            baia,
            altura,
            posicao: `${row}${String(baia).padStart(2, '0')}-${altura}`,
            tipo: tipoContainer
          };
          
          // Para containers 40ft, adicionar informação das posições físicas ocupadas
          if (tipoContainer === '40ft') {
            const posicoesOcupadas = CONFIG.MAPEAMENTO_40FT[baia];
            if (posicoesOcupadas) {
              posicaoInfo.posicoesOcupadas = posicoesOcupadas;
              posicaoInfo.descricao = `Posição lógica ${baia} (ocupará físicas ${posicoesOcupadas.join(' + ')})`;
            }
          } else {
            posicaoInfo.descricao = `Posição física ${baia}`;
          }
          
          posicoesDisponiveis.push(posicaoInfo);
        }
      }
    }
  });
  
  console.log(`🔍 Posições disponíveis para ${tipoContainer}:`, posicoesDisponiveis.length);
  return posicoesDisponiveis;
}

console.log("✅ Utilitários de validação com lógica corrigida carregados!");
