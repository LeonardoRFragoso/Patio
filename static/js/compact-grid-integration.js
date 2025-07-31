/**
 * ========================================
 * INTEGRAÇÃO DO COMPACT POSITION SELECTOR
 * Substitui automaticamente os grids existentes
 * ========================================
 */

console.log('🔄 Iniciando integração do Compact Position Selector...');

// Configuração global
const COMPACT_SELECTOR_CONFIG = {
  autoUpgrade: true,
  preserveOriginal: true,
  enableStats: true,
  enableQuickActions: true,
  enableKeyboardShortcuts: true,
  maxSuggestions: 30,
  groupByBay: true
};

/**
 * Função principal para integrar o seletor compacto
 */
function integrateCompactSelector() {
  console.log('🎯 Integrando Compact Position Selector...');
  
  // Aguardar carregamento completo
  if (typeof CompactPositionSelector === 'undefined') {
    console.log('⏳ Aguardando carregamento do CompactPositionSelector...');
    setTimeout(integrateCompactSelector, 500);
    return;
  }
  
  // Encontrar e atualizar seletores de posição existentes
  upgradeExistingSelectors();
  
  // Observar novos elementos adicionados dinamicamente
  observeNewSelectors();
  
  // Integrar com formulários de descarga
  integrateWithDescargaForm();
  
  // Integrar com formulários de movimentação
  integrateWithMovimentacaoForm();
  
  console.log('✅ Compact Position Selector integrado com sucesso!');
}

/**
 * Atualizar seletores existentes
 */
function upgradeExistingSelectors() {
  // Seletores de posição comuns
  const selectors = [
    'select[id*="posicao"]',
    'select[name*="posicao"]',
    'select[id*="position"]',
    'select[name*="position"]',
    '.position-selector select',
    '.posicao-selector select'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!element.dataset.compactUpgraded) {
        upgradeSelector(element);
      }
    });
  });
}

/**
 * Atualizar um seletor específico
 */
function upgradeSelector(selectElement) {
  console.log('🔧 Atualizando seletor:', selectElement.id || selectElement.name);
  
  try {
    // Marcar como atualizado
    selectElement.dataset.compactUpgraded = 'true';
    
    // Configurações específicas baseadas no contexto
    const config = getConfigForSelector(selectElement);
    
    // Criar seletor compacto
    const compactSelector = upgradeToCompactSelector(selectElement, config);
    
    // Integrar com validações existentes
    integrateWithValidations(selectElement, compactSelector);
    
    // Integrar com eventos existentes
    integrateWithEvents(selectElement, compactSelector);
    
    console.log('✅ Seletor atualizado:', selectElement.id || selectElement.name);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar seletor:', error);
  }
}

/**
 * Obter configuração específica para um seletor
 */
function getConfigForSelector(selectElement) {
  const baseConfig = { ...COMPACT_SELECTOR_CONFIG };
  
  // Configurações específicas por contexto
  if (selectElement.id.includes('descarga')) {
    baseConfig.placeholder = 'Selecione posição para descarga (ex: A01-1, B5, C12-3)...';
    baseConfig.onSelect = (position) => {
      console.log('📦 Posição selecionada para descarga:', position);
      // Integrar com lógica de descarga
      handleDescargaPositionSelect(position, selectElement);
    };
  }
  
  if (selectElement.id.includes('movimentacao') || selectElement.id.includes('nova')) {
    baseConfig.placeholder = 'Nova posição para movimentação (ex: A01-1, B5, C12-3)...';
    baseConfig.onSelect = (position) => {
      console.log('🔄 Nova posição selecionada:', position);
      // Integrar com lógica de movimentação
      handleMovimentacaoPositionSelect(position, selectElement);
    };
  }
  
  return baseConfig;
}

/**
 * Integrar com validações existentes
 */
function integrateWithValidations(selectElement, compactSelector) {
  // Preservar validações do HTML5
  if (selectElement.required) {
    const wrapper = compactSelector.container;
    const input = wrapper.querySelector('.compact-search-input');
    if (input) {
      input.required = true;
    }
  }
  
  // Integrar com validações customizadas
  const form = selectElement.closest('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      const selectedPosition = compactSelector.getSelectedPosition();
      if (selectElement.required && !selectedPosition) {
        e.preventDefault();
        compactSelector.focus();
        
        // Mostrar erro
        if (window.Swal) {
          Swal.fire({
            icon: 'warning',
            title: 'Posição obrigatória',
            text: 'Por favor, selecione uma posição no pátio.',
            confirmButtonText: 'OK'
          });
        }
        
        return false;
      }
    });
  }
}

/**
 * Integrar com eventos existentes
 */
function integrateWithEvents(selectElement, compactSelector) {
  // Preservar event listeners existentes
  const originalOnChange = selectElement.onchange;
  if (originalOnChange) {
    compactSelector.options.onSelect = (position) => {
      selectElement.value = position;
      originalOnChange.call(selectElement);
    };
  }
  
  // Integrar com jQuery events se disponível
  if (window.$ && $(selectElement).data('events')) {
    const events = $(selectElement).data('events');
    if (events.change) {
      events.change.forEach(handler => {
        compactSelector.container.addEventListener('change', handler.handler);
      });
    }
  }
}

/**
 * Observar novos elementos adicionados dinamicamente
 */
function observeNewSelectors() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Verificar se o próprio node é um seletor
          if (node.matches && node.matches('select[id*="posicao"], select[name*="posicao"]')) {
            if (!node.dataset.compactUpgraded) {
              setTimeout(() => upgradeSelector(node), 100);
            }
          }
          
          // Verificar seletores dentro do node
          const selectors = node.querySelectorAll && node.querySelectorAll('select[id*="posicao"], select[name*="posicao"]');
          if (selectors) {
            selectors.forEach(selector => {
              if (!selector.dataset.compactUpgraded) {
                setTimeout(() => upgradeSelector(selector), 100);
              }
            });
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Integração específica com formulário de descarga
 */
function integrateWithDescargaForm() {
  // Aguardar carregamento do formulário de descarga
  const checkDescargaForm = () => {
    const descargaContainer = document.getElementById('descarga-formulario-container');
    if (descargaContainer) {
      // Observer para quando o formulário for carregado dinamicamente
      const observer = new MutationObserver(() => {
        const positionSelects = descargaContainer.querySelectorAll('select[id*="posicao"]');
        positionSelects.forEach(select => {
          if (!select.dataset.compactUpgraded) {
            setTimeout(() => upgradeSelector(select), 200);
          }
        });
      });
      
      observer.observe(descargaContainer, {
        childList: true,
        subtree: true
      });
    } else {
      setTimeout(checkDescargaForm, 1000);
    }
  };
  
  checkDescargaForm();
}

/**
 * Integração específica com formulário de movimentação
 */
function integrateWithMovimentacaoForm() {
  const movimentacaoForm = document.getElementById('form-movimentacao');
  if (movimentacaoForm) {
    const positionSelect = movimentacaoForm.querySelector('#posicao_nova');
    if (positionSelect && !positionSelect.dataset.compactUpgraded) {
      upgradeSelector(positionSelect);
    }
  }
}

/**
 * Handler para seleção de posição na descarga
 */
function handleDescargaPositionSelect(position, selectElement) {
  // Atualizar select original
  selectElement.value = position;
  
  // Trigger eventos necessários
  selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Integrar com lógica específica de descarga se existir
  if (window.atualizarPosicaoDescarga) {
    window.atualizarPosicaoDescarga(position);
  }
}

/**
 * Handler para seleção de posição na movimentação
 */
function handleMovimentacaoPositionSelect(position, selectElement) {
  // Atualizar select original
  selectElement.value = position;
  
  // Trigger eventos necessários
  selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Integrar com lógica específica de movimentação se existir
  if (window.validarNovaPosicao) {
    window.validarNovaPosicao(position);
  }
}

/**
 * Função para carregar posições da API
 */
async function loadPositionsFromAPI() {
  try {
    // Usar a API existente do sistema
    const response = await fetch('/api/posicoes/livres', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('[name=csrf_token]')?.value || ''
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.posicoes || [];
    } else {
      console.warn('Erro ao carregar posições da API, usando dados mock');
      return generateMockPositions();
    }
  } catch (error) {
    console.warn('Erro na requisição de posições, usando dados mock:', error);
    return generateMockPositions();
  }
}

/**
 * Gerar posições mock para desenvolvimento
 */
function generateMockPositions() {
  const positions = [];
  const bays = ['A', 'B', 'C', 'D', 'E'];
  const maxHeights = { A: 2, B: 3, C: 4, D: 5, E: 5 };
  
  bays.forEach(bay => {
    for (let pos = 1; pos <= 20; pos++) {
      for (let height = 1; height <= maxHeights[bay]; height++) {
        const positionCode = `${bay}${pos.toString().padStart(2, '0')}-${height}`;
        positions.push({
          id: positionCode,
          bay: bay,
          position: pos,
          height: height,
          available: Math.random() > 0.3, // 70% disponíveis
          code: positionCode,
          description: `Bay ${bay}, Posição ${pos}, Altura ${height}`
        });
      }
    }
  });
  
  return positions;
}

/**
 * Sobrescrever função criarBayGridVisualizer se existir
 */
function overrideBayGridVisualizer() {
  if (window.criarBayGridVisualizer) {
    // Backup da função original
    window._originalCriarBayGridVisualizer = window.criarBayGridVisualizer;
    
    // Nova implementação usando compact selector
    window.criarBayGridVisualizer = function(posicoes, options = {}) {
      console.log('🎯 Usando Compact Position Selector em vez do grid original');
      
      const container = options.container || document.querySelector('.position-selector-container');
      if (!container) {
        console.warn('Container não encontrado para compact selector');
        return window._originalCriarBayGridVisualizer(posicoes, options);
      }
      
      // Criar seletor compacto
      const compactSelector = createCompactPositionSelector(container, {
        ...COMPACT_SELECTOR_CONFIG,
        onSelect: options.onPositionSelect || options.onSelect,
        onClear: options.onClear
      });
      
      // Carregar posições
      if (posicoes && posicoes.length > 0) {
        const formattedPositions = posicoes.map(pos => ({
          id: pos,
          bay: pos[0],
          position: parseInt(pos.substring(1, 3)),
          height: parseInt(pos.substring(4)),
          available: true,
          code: pos,
          description: `Bay ${pos[0]}, Posição ${pos.substring(1, 3)}, Altura ${pos.substring(4)}`
        }));
        
        compactSelector.setPositions(formattedPositions);
      } else {
        // Carregar da API
        loadPositionsFromAPI().then(positions => {
          compactSelector.setPositions(positions);
        });
      }
      
      return compactSelector;
    };
  }
}

/**
 * Adicionar botão para alternar entre layouts
 */
function addLayoutToggleButton() {
  // Procurar containers de formulário
  const containers = document.querySelectorAll('.operacao-form, .form-group');
  
  containers.forEach(container => {
    const positionSelect = container.querySelector('select[id*="posicao"]');
    if (positionSelect && !container.querySelector('.layout-toggle-btn')) {
      const button = document.createElement('button');
      button.className = 'btn btn-outline-secondary btn-sm layout-toggle-btn';
      button.innerHTML = '<i class="fas fa-exchange-alt"></i> Layout';
      button.title = 'Alternar entre layouts de seleção';
      button.type = 'button';
      
      button.addEventListener('click', () => {
        toggleSelectorLayout(positionSelect);
      });
      
      // Inserir após o select
      positionSelect.parentNode.insertBefore(button, positionSelect.nextSibling);
    }
  });
}

/**
 * Alternar entre layout compacto e original
 */
function toggleSelectorLayout(selectElement) {
  const wrapper = selectElement.parentNode.querySelector('.compact-selector-wrapper');
  
  if (wrapper && wrapper.style.display !== 'none') {
    // Mostrar original, ocultar compacto
    wrapper.style.display = 'none';
    selectElement.style.display = 'block';
    
    // Sincronizar valores
    const compactSelector = wrapper.compactSelector;
    if (compactSelector) {
      const selectedPosition = compactSelector.getSelectedPosition();
      if (selectedPosition) {
        selectElement.value = selectedPosition;
      }
    }
  } else {
    // Mostrar compacto, ocultar original
    if (wrapper) {
      wrapper.style.display = 'block';
    }
    selectElement.style.display = 'none';
    
    // Sincronizar valores
    if (wrapper && wrapper.compactSelector && selectElement.value) {
      wrapper.compactSelector.setValue(selectElement.value);
    }
  }
}

/**
 * Inicialização
 */
function initializeCompactIntegration() {
  console.log('🚀 Inicializando integração do Compact Position Selector...');
  
  // Aguardar DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', integrateCompactSelector);
  } else {
    integrateCompactSelector();
  }
  
  // Sobrescrever função de grid se existir
  setTimeout(overrideBayGridVisualizer, 1000);
  
  // Adicionar botões de toggle
  setTimeout(addLayoutToggleButton, 2000);
}

// Auto-inicializar
initializeCompactIntegration();

// Expor funções globalmente
window.COMPACT_GRID_INTEGRATION = {
  integrate: integrateCompactSelector,
  upgrade: upgradeSelector,
  toggle: toggleSelectorLayout,
  loadPositions: loadPositionsFromAPI
};

console.log('✅ Compact Grid Integration carregado e pronto!');
