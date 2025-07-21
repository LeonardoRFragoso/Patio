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
    
    // 🔴 SISTEMA DE BAIAS CORRIGIDO BASEADO EM DADOS REAIS DO PÁTIO SUZANO-SP
    // Fonte: posicao_suzano.txt - TODAS as baias 01-20 existem

    // TODAS AS BAIAS DISPONÍVEIS (01 a 20)
    TODAS_BAIAS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],

    // LÓGICA DE OCUPAÇÃO FÍSICA:
    // - Container 20ft: ocupa 1 baia
    // - Container 40ft: ocupa 2 baias consecutivas

    // BAIAS VÁLIDAS PARA INÍCIO DE CONTAINER 40FT
    // (deve ter espaço para ocupar a próxima baia também)
    BAIAS_INICIO_40FT: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Não inclui 20 pois não há 21

    // FUNÇÃO PARA VERIFICAR SE BAIA É VÁLIDA PARA TIPO DE CONTAINER
    BAIAS_POR_TIPO: {
      '20ft': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],        // 20ft pode usar qualquer baia
      '40ft': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]   // 40ft precisa de 2 baias consecutivas
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