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
 * @param {number} baia - Número da baia (1-20, qualquer uma)
 * @param {number} altura - Altura (1-5)
 * @param {Array} containersExistentes - Lista de containers já posicionados
 * @returns {boolean} - true se pode colocar
 */
export function podeColocar20ft(row, baia, altura, containersExistentes = []) {
  // 1. Verificar se baia está no range válido (1-20)
  if (baia < 1 || baia > 20) {
    console.warn(`❌ Baia ${baia} fora do range válido (1-20)`);
    return false;
  }
  
  // 2. Verificar se posição não está ocupada
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
 * @param {number} baia - Número da baia inicial (1-19, precisa de baia+1 livre)
 * @param {number} altura - Altura (1-5)
 * @param {Array} containersExistentes - Lista de containers já posicionados
 * @returns {boolean} - true se pode colocar
 */
export function podeColocar40ft(row, baia, altura, containersExistentes = []) {
  // 1. Verificar se baia está no range válido para início de 40ft (1-19)
  if (baia < 1 || baia > 19) {
    console.warn(`❌ Baia ${baia} inválida para container 40ft (precisa de 1-19 para ocupar 2 baias)`);
    return false;
  }
  
  // 2. Verificar altura máxima para o row
  const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
  if (altura > alturaMaxima) {
    console.warn(`❌ Altura ${altura} excede máximo para row ${row}: ${alturaMaxima}`);
    return false;
  }
  
  // 3. REGRA CRÍTICA: Container 40ft ocupa 2 baias consecutivas
  const baiaInicial = baia;
  const baiaFinal = baia + 1;
  
  // Verificar se ambas as baias estão livres na mesma altura
  const inicialLivre = !posicaoOcupada(row, baiaInicial, altura, containersExistentes);
  const finalLivre = !posicaoOcupada(row, baiaFinal, altura, containersExistentes);
  
  if (!inicialLivre || !finalLivre) {
    console.warn(`❌ Container 40ft precisa de baias ${baiaInicial} e ${baiaFinal} livres em ${row}-${altura}`);
    return false;
  }
  
  // 4. Verificar suporte (se altura > 1, ambas as baias devem ter suporte)
  if (altura > 1) {
    const suporteInicial = posicaoOcupada(row, baiaInicial, altura - 1, containersExistentes);
    const suporteFinal = posicaoOcupada(row, baiaFinal, altura - 1, containersExistentes);
    
    if (!suporteInicial || !suporteFinal) {
      console.warn(`❌ Container 40ft precisa de suporte em ambas as baias ${baiaInicial} e ${baiaFinal}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Verifica se uma posição está bloqueada por um container 40ft
 * @param {string} row - Row (A, B, C, D, E)
 * @param {number} baia - Número da baia a verificar
 * @param {number} altura - Altura (1-5)
 * @param {Array} containersExistentes - Lista de containers já posicionados
 * @returns {boolean} - true se está bloqueada
 */
export function baiaBloqueadaPor40ft(row, baia, altura, containersExistentes = []) {
  // Verificar se há container 40ft que ocupa esta baia
  for (const container of containersExistentes) {
    if (container.row === row && container.altura === altura && isContainer40TEU(container)) {
      const baiaInicial = container.baia;
      const baiaFinal = container.baia + 1;
      
      // Se a baia verificada está dentro do range ocupado pelo 40ft
      if (baia >= baiaInicial && baia <= baiaFinal) {
        console.log(`🚫 Baia ${baia} ocupada por container 40ft nas baias ${baiaInicial}-${baiaFinal}`);
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
 * 🔴 FUNÇÃO PARA OBTER TODAS AS POSIÇÕES DISPONÍVEIS
 * @param {Array} containers - Lista de containers existentes
 * @param {string} tipoContainer - '20ft' ou '40ft'
 * @returns {Array} Lista de posições disponíveis
 */
export function obterPosicoesDisponiveis(containers = [], tipoContainer = '20ft') {
  const posicoesDisponiveis = [];
  
  CONFIG.ROWS.forEach(row => {
    const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
    
    // Para 20ft: testar todas as baias (1-20)
    // Para 40ft: testar baias 1-19 (precisa de 2 baias consecutivas)
    const baiaMax = tipoContainer === '40ft' ? 19 : 20;
    
    for (let baia = 1; baia <= baiaMax; baia++) {
      for (let altura = 1; altura <= alturaMaxima; altura++) {
        let podeColocar = false;
        
        if (tipoContainer === '40ft') {
          podeColocar = podeColocar40ft(row, baia, altura, containers);
        } else {
          podeColocar = podeColocar20ft(row, baia, altura, containers);
        }
        
        if (podeColocar) {
          posicoesDisponiveis.push({
            row,
            baia,
            altura,
            posicao: `${row}${String(baia).padStart(2, '0')}-${altura}`,
            tipo: tipoContainer
          });
        }
      }
    }
  });
  
  return posicoesDisponiveis;
}

console.log("✅ Utilitários de validação com lógica corrigida carregados!");
