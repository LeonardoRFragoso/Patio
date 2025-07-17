/**
 * Índice dos Módulos Core - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: core/index.js
 * 
 * Este arquivo facilita a importação de todos os módulos core
 */

// Exportar módulos principais
export { APIManager } from './api-manager.js';
export { SceneManager } from './scene-manager.js';
export { AnimationSystem } from './animation-system.js';
export { DataManager } from './data-manager.js';

// Export default com todos os módulos core
export default {
  APIManager,
  SceneManager,
  AnimationSystem,
  DataManager
};