/**
 * ========================================
 * INTEGRAÇÃO DO GRID MELHORADO
 * Substitui o grid atual pelo componente melhorado
 * ========================================
 */

// Instâncias ativas dos grids
const activeGridInstances = new Map();

/**
 * Função principal para inicializar o grid melhorado
 * Substitui a função criarVisualizacaoGrid original
 */
function initImprovedGridSelector(selectElement, positions, options = {}) {
  try {
    // Destruir instância anterior se existir
    const existingInstance = activeGridInstances.get(selectElement.id);
    if (existingInstance) {
      existingInstance.destroy();
      activeGridInstances.delete(selectElement.id);
    }
    
    // Ocultar select original
    selectElement.style.display = 'none';
    
    // Criar container para o grid
    let gridContainer = selectElement.parentNode.querySelector('.improved-grid-container');
    if (!gridContainer) {
      gridContainer = document.createElement('div');
      gridContainer.className = 'improved-grid-container';
      selectElement.parentNode.insertBefore(gridContainer, selectElement.nextSibling);
    }
    
    // Configurações padrão melhoradas
    const defaultOptions = {
      showSearch: true,
      showFilters: true,
      showStats: true,
      containerSize: options.containerSize || 20,
      selectedPosition: options.selectedPosition || null,
      onPositionSelect: (positionId, positionInfo) => {
        // Atualizar select original
        selectElement.value = positionId || '';
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Callback original se fornecido
        if (options.onPositionSelect) {
          options.onPositionSelect(positionId, positionInfo);
        }
        
        console.log(`🎯 Posição selecionada no grid melhorado: ${positionId}`);
      },
      ...options
    };
    
    // Criar nova instância do grid melhorado
    const gridInstance = new GridSelectorImproved(gridContainer, defaultOptions);
    
    // Carregar posições se fornecidas
    if (positions && positions.length > 0) {
      gridInstance.loadPositions(positions);
    }
    
    // Armazenar instância
    activeGridInstances.set(selectElement.id, gridInstance);
    
    console.log(`✅ Grid melhorado inicializado para ${selectElement.id} com ${positions.length} posições`);
    
    // Retornar objeto compatível com o grid anterior
    return {
      gridInstance,
      container: gridContainer,
      selectElement,
      getSelectedPosition: () => gridInstance.getSelectedPosition(),
      setSelectedPosition: (positionId) => gridInstance.setSelectedPosition(positionId),
      updatePositions: (newPositions) => gridInstance.loadPositions(newPositions),
      destroy: () => {
        gridInstance.destroy();
        activeGridInstances.delete(selectElement.id);
        selectElement.style.display = 'block';
        if (gridContainer.parentNode) {
          gridContainer.parentNode.removeChild(gridContainer);
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao inicializar grid melhorado:', error);
    
    // Fallback para grid original se disponível
    if (typeof window.criarBayGridVisualizer === 'function') {
      console.warn('⚠️ Usando fallback para grid original');
      return window.criarBayGridVisualizer(positions, options);
    }
    
    // Fallback final - mostrar select original
    selectElement.style.display = 'block';
    return null;
  }
}

/**
 * Função para migrar do grid antigo para o novo
 */
function migrateToImprovedGrid() {
  // Salvar referência da função original se existir
  if (typeof window.criarVisualizacaoGrid === 'function') {
    window._originalCriarVisualizacaoGrid = window.criarVisualizacaoGrid;
  }
  
  // Substituir pela versão melhorada
  window.criarVisualizacaoGrid = initImprovedGridSelector;
  
  // Também interceptar outras funções relacionadas ao grid
  if (typeof window.criarBayGridVisualizer === 'function') {
    window._originalCriarBayGridVisualizer = window.criarBayGridVisualizer;
    window.criarBayGridVisualizer = initImprovedGridSelector;
  }
  
  console.log('✅ Migração para grid melhorado concluída');
}

/**
 * Função para reverter para o grid original
 */
function revertToOriginalGrid() {
  // Limpar instâncias ativas
  clearAllGridInstances();
  
  // Restaurar funções originais
  if (window._originalCriarVisualizacaoGrid) {
    window.criarVisualizacaoGrid = window._originalCriarVisualizacaoGrid;
    delete window._originalCriarVisualizacaoGrid;
  }
  
  if (window._originalCriarBayGridVisualizer) {
    window.criarBayGridVisualizer = window._originalCriarBayGridVisualizer;
    delete window._originalCriarBayGridVisualizer;
  }
  
  console.log('✅ Revertido para grid original');
}

/**
 * Função para limpar todas as instâncias ativas
 */
function clearAllGridInstances() {
  activeGridInstances.forEach((instance, id) => {
    try {
      instance.destroy();
    } catch (error) {
      console.warn(`⚠️ Erro ao destruir instância de grid ${id}:`, error);
    }
  });
  activeGridInstances.clear();
  console.log('✅ Todas as instâncias do grid foram limpas');
}

/**
 * Função para obter instância ativa por ID do select
 */
function getGridInstance(selectId) {
  return activeGridInstances.get(selectId);
}

/**
 * Função para verificar se o grid melhorado está disponível
 */
function isImprovedGridAvailable() {
  return typeof GridSelectorImproved !== 'undefined';
}

/**
 * Função para atualizar posições em um grid específico
 */
function updateGridPositions(selectId, newPositions) {
  const instance = activeGridInstances.get(selectId);
  if (instance && instance.updatePositions) {
    instance.updatePositions(newPositions);
    console.log(`✅ Posições atualizadas no grid ${selectId}`);
  }
}

/**
 * Função para integrar com o organizador de posições existente
 */
function integrateWithPositionOrganizer() {
  // Aguardar carregamento do organizador
  const checkOrganizer = () => {
    if (typeof window.organizarComboboxPosicoes === 'function') {
      const original = window.organizarComboboxPosicoes;
      
      window.organizarComboboxPosicoes = function(selectElement, posicoes, options = {}) {
        // Se showGridView está ativado, usar grid melhorado
        if (options.showGridView) {
          return initImprovedGridSelector(selectElement, posicoes, options);
        }
        
        // Caso contrário, usar organizador original
        return original.call(this, selectElement, posicoes, options);
      };
      
      console.log('✅ Integração com organizador de posições concluída');
    } else {
      setTimeout(checkOrganizer, 100);
    }
  };
  
  checkOrganizer();
}

/**
 * Inicialização automática quando o DOM estiver pronto
 */
function initAutoMigration() {
  console.log('🔄 Iniciando auto-migração para grid melhorado...');
  
  // Aguardar carregamento do GridSelectorImproved
  const checkAndMigrate = () => {
    console.log('🔍 Verificando disponibilidade do GridSelectorImproved...', typeof GridSelectorImproved);
    
    if (isImprovedGridAvailable()) {
      console.log('✅ GridSelectorImproved disponível, iniciando migração...');
      migrateToImprovedGrid();
      integrateWithPositionOrganizer();
      
      // Adicionar listener para limpeza ao sair da página
      window.addEventListener('beforeunload', clearAllGridInstances);
      
      console.log('✅ Auto-migração para grid melhorado ativada');
    } else {
      console.log('⏳ GridSelectorImproved não disponível ainda, tentando novamente...');
      // Tentar novamente em 500ms (aumentei o tempo)
      setTimeout(checkAndMigrate, 500);
    }
  };
  
  // Iniciar verificação
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndMigrate);
  } else {
    checkAndMigrate();
  }
}

/**
 * Função para aplicar melhorias específicas ao grid no contexto do pátio
 */
function applyPatioGridEnhancements() {
  // Melhorias específicas para o contexto do pátio Suzano
  const patioEnhancements = {
    // Cores específicas por bay baseadas no layout real
    bayColors: {
      'A': '#e91e63', // Rosa para Bay A
      'B': '#2196f3', // Azul para Bay B  
      'C': '#4caf50', // Verde para Bay C
      'D': '#ff9800', // Laranja para Bay D
      'E': '#9c27b0'  // Roxo para Bay E
    },
    
    // Configurações específicas para containers 20ft e 40ft
    containerSizeConfig: {
      20: {
        title: 'Posições para Containers 20ft',
        description: 'Baias ímpares (01, 03, 05, ...)',
        color: '#4caf50'
      },
      40: {
        title: 'Posições para Containers 40ft', 
        description: 'Baias pares (02, 04, 06, ...)',
        color: '#2196f3'
      }
    },
    
    // Mensagens específicas para o contexto
    messages: {
      emptyState: 'Nenhuma posição disponível para este tipo de container',
      loadingText: 'Carregando posições do pátio...',
      selectionHint: 'Clique em uma altura para selecionar a posição'
    }
  };
  
  // Aplicar melhorias globalmente
  window.PATIO_GRID_ENHANCEMENTS = patioEnhancements;
  
  console.log('✅ Melhorias específicas do pátio aplicadas ao grid');
}

// Expor funções globalmente
window.initImprovedGridSelector = initImprovedGridSelector;
window.migrateToImprovedGrid = migrateToImprovedGrid;
window.revertToOriginalGrid = revertToOriginalGrid;
window.clearAllGridInstances = clearAllGridInstances;
window.getGridInstance = getGridInstance;
window.isImprovedGridAvailable = isImprovedGridAvailable;
window.updateGridPositions = updateGridPositions;

// Inicializar melhorias e auto-migração
applyPatioGridEnhancements();
initAutoMigration();

console.log('✅ Integração do grid melhorado carregada');
