/**
 * ========================================
 * PATCH DE ORDENAÇÃO PARA ORGANIZADOR ATUAL
 * Corrige problema de ordenação A11-1 antes de A01-1
 * ========================================
 */

(function() {
  'use strict';
  
  // Aguardar carregamento do organizador original
  function waitForOrganizer() {
    if (typeof window.organizarComboboxPosicoes === 'function' && 
        typeof window.PositionSortingUtils !== 'undefined') {
      applyPositionSortingPatch();
    } else {
      setTimeout(waitForOrganizer, 100);
    }
  }
  
  function applyPositionSortingPatch() {
    // Salvar função original
    const originalOrganizarComboboxPosicoes = window.organizarComboboxPosicoes;
    
    // Função patcheada que garante ordenação correta
    window.organizarComboboxPosicoes = function(selectElement, posicoes, options = {}) {
      try {
        // Ordenar posições antes de passar para o organizador original
        const posicoesOrdenadas = window.PositionSortingUtils.sortPositionStrings(posicoes);
        
        console.log(`🔧 Patch de ordenação aplicado: ${posicoes.length} posições ordenadas`);
        
        // Chamar função original com posições ordenadas
        return originalOrganizarComboboxPosicoes(selectElement, posicoesOrdenadas, options);
        
      } catch (error) {
        console.warn('⚠️ Erro no patch de ordenação, usando função original:', error);
        return originalOrganizarComboboxPosicoes(selectElement, posicoes, options);
      }
    };
    
    // Manter referência da função original
    window.organizarComboboxPosicoes._original = originalOrganizarComboboxPosicoes;
    window.organizarComboboxPosicoes._patched = true;
    
    console.log('✅ Patch de ordenação de posições aplicado ao organizador atual');
  }
  
  // Função para remover o patch se necessário
  window.removePositionSortingPatch = function() {
    if (window.organizarComboboxPosicoes && window.organizarComboboxPosicoes._original) {
      window.organizarComboboxPosicoes = window.organizarComboboxPosicoes._original;
      console.log('✅ Patch de ordenação removido');
    }
  };
  
  // Aplicar patch quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForOrganizer);
  } else {
    waitForOrganizer();
  }
  
})();

console.log('✅ Patch de ordenação de posições carregado');
