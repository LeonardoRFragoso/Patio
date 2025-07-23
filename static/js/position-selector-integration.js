/**
 * ========================================
 * INTEGRAÇÃO DO SELETOR DE POSIÇÕES MELHORADO
 * Substitui o organizador atual pelo componente melhorado
 * ========================================
 */

// Instâncias ativas dos seletores
const activeSelectorInstances = new Map();

/**
 * Função principal para inicializar o seletor melhorado
 * Substitui a função organizarComboboxPosicoes original
 */
function initImprovedPositionSelectorIntegration(selectElement, positions, options = {}) {
  try {
    // Destruir instância anterior se existir
    const existingInstance = activeSelectorInstances.get(selectElement.id);
    if (existingInstance) {
      existingInstance.destroy();
      activeSelectorInstances.delete(selectElement.id);
    }
    
    // Configurações padrão melhoradas
    const defaultOptions = {
      showStats: true,
      showSearch: true,
      showFilters: true,
      allowMultiSelect: false,
      theme: 'modern',
      containerSize: 20,
      searchPlaceholderValue: 'Buscar por bay (A-E), posição (01-20) ou altura (1-5)...',
      onPositionSelect: null,
      ...options
    };
    
    // Criar nova instância
    const selectorInstance = new PositionSelectorImproved(selectElement, defaultOptions);
    
    // Carregar posições se fornecidas
    if (positions && positions.length > 0) {
      selectorInstance.loadPositions(positions);
    }
    
    // Armazenar instância
    activeSelectorInstances.set(selectElement.id, selectorInstance);
    
    // Configurar callback de seleção se fornecido
    if (defaultOptions.onPositionSelect) {
      selectElement.addEventListener('positionSelectionChanged', (event) => {
        const selectedPositions = event.detail.positions;
        if (selectedPositions.length > 0) {
          defaultOptions.onPositionSelect(selectedPositions[0].id, selectedPositions[0]);
        }
      });
    }
    
    console.log(`✅ Seletor melhorado inicializado para ${selectElement.id} com ${positions.length} posições`);
    
    // Retornar objeto compatível com o organizador anterior
    return {
      choices: selectorInstance,
      stats: {
        totalPosicoes: positions.length,
        porBay: groupPositionsByBay(positions),
        porAltura: groupPositionsByHeight(positions)
      },
      instance: selectorInstance
    };
    
  } catch (error) {
    console.error('❌ Erro ao inicializar seletor melhorado:', error);
    
    // Fallback para organizador original se disponível
    if (typeof window.organizarComboboxPosicoes === 'function' && 
        window.organizarComboboxPosicoes !== initImprovedPositionSelectorIntegration) {
      console.warn('⚠️ Usando fallback para organizador original');
      return window.organizarComboboxPosicoes(selectElement, positions, options);
    }
    
    // Fallback final para Choices.js básico
    return initBasicChoicesFallback(selectElement, positions, options);
  }
}

/**
 * Agrupa posições por bay para estatísticas
 */
function groupPositionsByBay(positions) {
  const grouped = {};
  
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d{2})-(\d+)$/);
    if (match) {
      const bay = match[1];
      if (!grouped[bay]) {
        grouped[bay] = 0;
      }
      grouped[bay]++;
    }
  });
  
  return grouped;
}

/**
 * Agrupa posições por altura para estatísticas
 */
function groupPositionsByHeight(positions) {
  const grouped = {};
  
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d{2})-(\d+)$/);
    if (match) {
      const altura = match[3];
      if (!grouped[altura]) {
        grouped[altura] = 0;
      }
      grouped[altura]++;
    }
  });
  
  return grouped;
}

/**
 * Fallback básico usando Choices.js
 */
function initBasicChoicesFallback(selectElement, positions, options = {}) {
  console.warn('⚠️ Usando fallback básico com Choices.js');
  
  try {
    if (!window.Choices) {
      throw new Error('Choices.js não disponível');
    }
    
    // Preparar opções
    const choicesData = positions.map(pos => ({
      value: pos,
      label: formatPositionLabel(pos)
    }));
    
    // Limpar select
    selectElement.innerHTML = '';
    
    // Inicializar Choices
    const choices = new Choices(selectElement, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: '',
      searchPlaceholderValue: options.searchPlaceholderValue || 'Buscar posição...',
      classNames: {
        containerInner: 'choices__inner'
      }
    });
    
    // Adicionar opções
    if (choicesData.length > 0) {
      choices.setChoices(choicesData, 'value', 'label', true);
    } else {
      choices.setChoices([{
        value: '',
        label: 'Nenhuma posição disponível',
        disabled: true
      }], 'value', 'label', true);
    }
    
    return {
      choices,
      stats: {
        totalPosicoes: positions.length,
        porBay: groupPositionsByBay(positions),
        porAltura: groupPositionsByHeight(positions)
      }
    };
    
  } catch (error) {
    console.error('❌ Erro no fallback básico:', error);
    
    // Fallback final - select nativo
    return initNativeSelectFallback(selectElement, positions);
  }
}

/**
 * Fallback final usando select nativo
 */
function initNativeSelectFallback(selectElement, positions) {
  console.warn('⚠️ Usando fallback final com select nativo');
  
  selectElement.innerHTML = '<option value="" disabled selected>Selecione uma posição...</option>';
  
  positions.forEach(pos => {
    const option = document.createElement('option');
    option.value = pos;
    option.textContent = formatPositionLabel(pos);
    selectElement.appendChild(option);
  });
  
  return {
    choices: null,
    stats: {
      totalPosicoes: positions.length,
      porBay: groupPositionsByBay(positions),
      porAltura: groupPositionsByHeight(positions)
    }
  };
}

/**
 * Formata label da posição
 */
function formatPositionLabel(position) {
  const match = position.match(/^([A-E])(\d{2})-(\d+)$/);
  if (match) {
    const [, bay, pos, altura] = match;
    return `${bay}${pos}-${altura} (Bay ${bay}, Pos ${parseInt(pos)}, Alt ${altura})`;
  }
  return position;
}

/**
 * Função para limpar todas as instâncias ativas
 */
function clearAllSelectorInstances() {
  activeSelectorInstances.forEach((instance, id) => {
    try {
      instance.destroy();
    } catch (error) {
      console.warn(`⚠️ Erro ao destruir instância ${id}:`, error);
    }
  });
  activeSelectorInstances.clear();
  console.log('✅ Todas as instâncias do seletor foram limpas');
}

/**
 * Função para obter instância ativa por ID do select
 */
function getSelectorInstance(selectId) {
  return activeSelectorInstances.get(selectId);
}

/**
 * Função para verificar se o seletor melhorado está disponível
 */
function isImprovedSelectorAvailable() {
  return typeof PositionSelectorImproved !== 'undefined';
}

/**
 * Função para migrar do organizador antigo para o novo
 */
function migrateToImprovedSelector() {
  // Salvar referência da função original se existir
  if (typeof window.organizarComboboxPosicoes === 'function') {
    window._originalOrganizarComboboxPosicoes = window.organizarComboboxPosicoes;
  }
  
  // Substituir pela versão melhorada
  window.organizarComboboxPosicoes = initImprovedPositionSelectorIntegration;
  
  console.log('✅ Migração para seletor melhorado concluída');
}

/**
 * Função para reverter para o organizador original
 */
function revertToOriginalSelector() {
  if (window._originalOrganizarComboboxPosicoes) {
    // Limpar instâncias ativas
    clearAllSelectorInstances();
    
    // Restaurar função original
    window.organizarComboboxPosicoes = window._originalOrganizarComboboxPosicoes;
    delete window._originalOrganizarComboboxPosicoes;
    
    console.log('✅ Revertido para organizador original');
  }
}

/**
 * Inicialização automática quando o DOM estiver pronto
 */
function initAutoMigration() {
  // Aguardar carregamento do PositionSelectorImproved
  const checkAndMigrate = () => {
    if (isImprovedSelectorAvailable()) {
      migrateToImprovedSelector();
      
      // Adicionar listener para limpeza ao sair da página
      window.addEventListener('beforeunload', clearAllSelectorInstances);
      
      console.log('✅ Auto-migração para seletor melhorado ativada');
    } else {
      // Tentar novamente em 100ms
      setTimeout(checkAndMigrate, 100);
    }
  };
  
  // Iniciar verificação
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndMigrate);
  } else {
    checkAndMigrate();
  }
}

// Expor funções globalmente
window.initImprovedPositionSelectorIntegration = initImprovedPositionSelectorIntegration;
window.clearAllSelectorInstances = clearAllSelectorInstances;
window.getSelectorInstance = getSelectorInstance;
window.isImprovedSelectorAvailable = isImprovedSelectorAvailable;
window.migrateToImprovedSelector = migrateToImprovedSelector;
window.revertToOriginalSelector = revertToOriginalSelector;

// Inicializar auto-migração
initAutoMigration();

console.log('✅ Integração do seletor melhorado carregada');
