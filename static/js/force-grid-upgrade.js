/**
 * ========================================
 * FORÇAR UPGRADE DO GRID - SUBSTITUIÇÃO DIRETA
 * Este script força a substituição do grid antigo pelo melhorado
 * ========================================
 */

console.log('🚀 Iniciando substituição forçada do grid...');

// Aguardar carregamento completo
function forceGridUpgrade() {
  console.log('🔍 Verificando se o grid melhorado está disponível...');
  
  if (typeof GridSelectorImproved === 'undefined') {
    console.log('❌ GridSelectorImproved não encontrado, tentando novamente em 1s...');
    setTimeout(forceGridUpgrade, 1000);
    return;
  }
  
  console.log('✅ GridSelectorImproved encontrado, iniciando substituição...');
  
  // Interceptar a função criarBayGridVisualizer
  if (typeof window.criarBayGridVisualizer === 'function') {
    console.log('🔄 Substituindo criarBayGridVisualizer...');
    
    // Salvar original
    window._originalCriarBayGridVisualizer = window.criarBayGridVisualizer;
    
    // Substituir pela versão melhorada
    window.criarBayGridVisualizer = function(posicoes, options = {}) {
      console.log('🎯 criarBayGridVisualizer chamado com', posicoes.length, 'posições');
      
      // Encontrar o select element baseado no contexto
      let selectElement = null;
      
      // Tentar encontrar o select de posições ativo
      const selects = document.querySelectorAll('select[id*="posicao"]');
      for (const select of selects) {
        if (select.offsetParent !== null) { // Elemento visível
          selectElement = select;
          break;
        }
      }
      
      if (!selectElement) {
        console.warn('⚠️ Select element não encontrado, usando fallback');
        return window._originalCriarBayGridVisualizer(posicoes, options);
      }
      
      console.log('📍 Select encontrado:', selectElement.id);
      
      // Usar grid melhorado
      return initImprovedGridSelector(selectElement, posicoes, {
        ...options,
        showSearch: true,
        showFilters: true,
        showStats: true,
        onPositionSelect: (positionId, positionInfo) => {
          console.log('🎯 Posição selecionada no grid melhorado:', positionId);
          
          // Atualizar select original
          selectElement.value = positionId || '';
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Callback original se fornecido
          if (options.onPositionSelect) {
            options.onPositionSelect(positionId, positionInfo);
          }
        }
      });
    };
    
    console.log('✅ criarBayGridVisualizer substituído com sucesso');
  }
  
  // Também interceptar organizarComboboxPosicoes para forçar grid melhorado
  if (typeof window.organizarComboboxPosicoes === 'function') {
    console.log('🔄 Interceptando organizarComboboxPosicoes...');
    
    const original = window.organizarComboboxPosicoes;
    
    window.organizarComboboxPosicoes = function(selectElement, posicoes, options = {}) {
      console.log('🎯 organizarComboboxPosicoes chamado, forçando grid melhorado...');
      
      // Forçar showGridView para usar o grid melhorado
      const newOptions = {
        ...options,
        showGridView: true // Sempre usar grid view melhorado
      };
      
      // Se showGridView está ativado, usar grid melhorado diretamente
      if (newOptions.showGridView) {
        console.log('🚀 Usando grid melhorado diretamente...');
        return initImprovedGridSelector(selectElement, posicoes, newOptions);
      }
      
      // Fallback para original
      return original.call(this, selectElement, posicoes, newOptions);
    };
    
    console.log('✅ organizarComboboxPosicoes interceptado com sucesso');
  }
  
  // Forçar atualização de qualquer grid já existente
  setTimeout(() => {
    console.log('🔄 Procurando grids existentes para atualizar...');
    
    // Procurar por elementos do grid antigo
    const oldGrids = document.querySelectorAll('.bay-grid-container, .position-grid-container');
    oldGrids.forEach((grid, index) => {
      console.log(`🔄 Atualizando grid existente ${index + 1}...`);
      
      // Encontrar select relacionado
      const container = grid.closest('.form-group, .input-group, .position-container');
      if (container) {
        const select = container.querySelector('select[id*="posicao"]');
        if (select) {
          console.log('📍 Select relacionado encontrado:', select.id);
          
          // Obter posições atuais do select
          const positions = Array.from(select.options)
            .filter(option => option.value && option.value !== '')
            .map(option => option.value);
          
          if (positions.length > 0) {
            console.log(`🚀 Substituindo grid com ${positions.length} posições...`);
            
            // Criar novo grid melhorado
            const newGrid = initImprovedGridSelector(select, positions, {
              showSearch: true,
              showFilters: true,
              showStats: true,
              containerSize: 20 // Default
            });
            
            // Remover grid antigo
            grid.style.display = 'none';
            
            console.log('✅ Grid substituído com sucesso');
          }
        }
      }
    });
  }, 2000);
  
  console.log('🎉 Substituição forçada do grid concluída!');
}

// Iniciar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', forceGridUpgrade);
} else {
  forceGridUpgrade();
}

// Também tentar após um delay para garantir
setTimeout(forceGridUpgrade, 3000);

console.log('✅ Script de substituição forçada carregado');
