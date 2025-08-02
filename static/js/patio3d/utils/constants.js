/**
 * Constantes e Configurações do Sistema 3D - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: utils/constants.js
 */

// Configurações visuais melhoradas com LÓGICA CORRIGIDA DE BAIAS
export const CONFIG = {
    ROWS: ["A", "B", "C", "D", "E"],
    BAIAS_MAX: 20,
    ALTURAS_MAX: 5,
    ALTURAS_MAX_POR_ROW: {
      A: 2,
      B: 3,
      C: 4,
      D: 5,
      E: 5,
    },
    
    // 🔴 SISTEMA DE BAIAS CORRIGIDO - LÓGICA REAL DO PÁTIO SUZANO-SP
    // BASEADO NA EXPLICAÇÃO CORRETA DO USUÁRIO:
    // - Posições FÍSICAS: Apenas ímpares (A01, A03, A05, A07, A09, A11, A13, A15, A17, A19)
    // - Posições LÓGICAS: Pares (A02, A04, A06, A08, A10, A12, A14, A16, A18, A20)

    // POSIÇÕES FÍSICAS REAIS (apenas ímpares)
    BAIAS_FISICAS: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
    
    // POSIÇÕES LÓGICAS (pares - representam containers 40ft)
    BAIAS_LOGICAS: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],

    // LÓGICA DE OCUPAÇÃO CORRETA:
    // - Container 20ft: ocupa 1 posição física ímpar (A01, A03, A05, etc.)
    // - Container 40ft: ocupa 2 posições físicas ímpares subsequentes (A01+A03, A03+A05, etc.)
    //   e é representado pela posição lógica par correspondente (A02, A04, etc.)

    // MAPEAMENTO: POSIÇÃO LÓGICA → POSIÇÕES FÍSICAS OCUPADAS
    MAPEAMENTO_40FT: {
      2: [1, 3],   // A02 representa container 40ft ocupando A01+A03
      4: [3, 5],   // A04 representa container 40ft ocupando A03+A05
      6: [5, 7],   // A06 representa container 40ft ocupando A05+A07
      8: [7, 9],   // A08 representa container 40ft ocupando A07+A09
      10: [9, 11], // A10 representa container 40ft ocupando A09+A11
      12: [11, 13],// A12 representa container 40ft ocupando A11+A13
      14: [13, 15],// A14 representa container 40ft ocupando A13+A15
      16: [15, 17],// A16 representa container 40ft ocupando A15+A17
      18: [17, 19],// A18 representa container 40ft ocupando A17+A19
      20: [19, 21] // A20 seria A19+A21, mas A21 não existe - INVÁLIDA
    },

    // BAIAS VÁLIDAS POR TIPO DE CONTAINER
    BAIAS_POR_TIPO: {
      '20ft': [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],        // 20ft usa posições físicas ímpares
      '40ft': [2, 4, 6, 8, 10, 12, 14, 16, 18]            // 40ft usa posições lógicas pares (exceto 20 que seria inválida)
    },
    
    ESPACAMENTO_BAIA: 7,
    ESPACAMENTO_ROW: 2.5,
    TAMANHO_CONTAINER: 3,
    ALTURA_CONTAINER: 2.5,
    CONTAINER_20_LARGURA: 2.5,
    CONTAINER_20_COMPRIMENTO: 7,
    CONTAINER_40_LARGURA: 2.5,
    CONTAINER_40_COMPRIMENTO: 14,
    HOVER_ALTURA: 1,
    QUALIDADE_SOMBRAS: 2048,
    DISTANCIA_NEVOA: 800,
    INTENSIDADE_BLOOM: 1.2,
    REFLEXO_INTENSIDADE: 0.3,
  };
  
  // Cores melhoradas com valores HDR
  export const CORES = {
    VAZIA: new THREE.Color(0.8, 0.8, 0.8),
    OCUPADA: new THREE.Color(0.3, 0.7, 0.3),
    VISTORIADA: new THREE.Color(0.1, 0.6, 0.9),
    FLUTUANTE: new THREE.Color(1.0, 0.2, 0.2),
    CONTAINER_40: new THREE.Color(0.6, 0.2, 0.7),
    SELECIONADA: new THREE.Color(1.0, 0.9, 0.2),
    GRID: new THREE.Color(0.5, 0.5, 0.5),
    MURO: new THREE.Color(0.6, 0.3, 0.2),
    HOVER: new THREE.Color(1.0, 0.8, 0.4),
    URGENTE: new THREE.Color(1.0, 0.3, 0.1),
    ANTIGO: new THREE.Color(0.5, 0.3, 0.3),
  };
  
  // Cores dos armadores com valores mais ricos
  export const CORES_ARMADORES = {
    EVERGREEN: new THREE.Color(0.2, 0.8, 0.3),
    MAERSK: new THREE.Color(0.1, 0.6, 0.95),
    MSC: new THREE.Color(1.0, 0.6, 0.0),
    COSCO: new THREE.Color(0.95, 0.2, 0.2),
    "CMA CGM": new THREE.Color(0.6, 0.15, 0.7),
    "HAPAG-LLOYD": new THREE.Color(1.0, 0.3, 0.1),
    ONE: new THREE.Color(0.4, 0.5, 0.6),
    "YANG MING": new THREE.Color(0.5, 0.3, 0.3),
    PIL: new THREE.Color(0.0, 0.6, 0.5),
    ZIM: new THREE.Color(0.9, 0.1, 0.4),
    HYUNDAI: new THREE.Color(0.2, 0.3, 0.7),
    OOCL: new THREE.Color(0.5, 0.8, 0.3),
    DEFAULT: new THREE.Color(0.6, 0.6, 0.6),
  };
  
  // Endpoints da API
  export const API_ENDPOINTS = {
    containers: "/operacoes/containers/patio-3d",
    buscarContainer: "/operacoes/buscar_container",
    validarPosicao: "/operacoes/validar_posicao_suzano",
    sugestoesPosicoes: "/operacoes/sugestoes_posicoes",
  };