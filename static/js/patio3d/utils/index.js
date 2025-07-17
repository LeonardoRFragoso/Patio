/**
 * Índice dos Utilitários - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: utils/index.js
 * 
 * Este arquivo facilita a importação de todos os módulos utils
 */

// Exportar constantes
export { CONFIG, CORES, CORES_ARMADORES, API_ENDPOINTS } from './constants.js';

// Exportar validador de dependências
export { validateDependencies } from './dependencies-validator.js';

// Exportar monitor de performance
export { PerformanceMonitor } from './performance-monitor.js';

// Exportar funções auxiliares
export { HelperUtils } from './helpers.js';

// Export default com todos os utilitários
export default {
  CONFIG,
  CORES, 
  CORES_ARMADORES,
  API_ENDPOINTS,
  validateDependencies,
  PerformanceMonitor,
  HelperUtils
};