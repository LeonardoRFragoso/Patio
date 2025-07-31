/**
 * ========================================
 * SIMPLE POSITION SELECTOR
 * Substitui o grid complexo por um dropdown simples
 * ========================================
 */

console.log('🎯 Carregando Simple Position Selector...');

/**
 * Substituir grid complexo por dropdown simples
 */
function replaceGridWithSimpleSelector() {
  console.log('🔄 Substituindo grid complexo por seletor simples...');
  
  // Encontrar containers do grid atual
  const gridContainers = [
    '.bay-grid-container',
    '.position-grid-container', 
    '.grid-container',
    '[class*="bay-grid"]',
    '[class*="position-grid"]'
  ];
  
  gridContainers.forEach(selector => {
    const containers = document.querySelectorAll(selector);
    containers.forEach(container => {
      if (container && !container.dataset.simplifiedGrid) {
        replaceContainerWithSimpleDropdown(container);
      }
    });
  });
  
  // Procurar por grids específicos na descarga
  const descargaContainer = document.getElementById('descarga-formulario-container');
  if (descargaContainer) {
    observeDescargaChanges(descargaContainer);
  }
}

/**
 * Substituir container específico por dropdown simples
 */
function replaceContainerWithSimpleDropdown(container) {
  console.log('🔧 Substituindo container por dropdown simples:', container);
  
  // Marcar como processado
  container.dataset.simplifiedGrid = 'true';
  
  // Criar dropdown simples
  const simpleSelector = createSimplePositionDropdown();
  
  // Substituir conteúdo
  container.innerHTML = '';
  container.appendChild(simpleSelector);
  
  // Aplicar estilos minimalistas
  container.style.cssText = `
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
  `;
}

/**
 * Criar dropdown simples de posições
 */
function createSimplePositionDropdown() {
  const wrapper = document.createElement('div');
  wrapper.className = 'simple-position-selector';
  
  wrapper.innerHTML = `
    <div class="simple-selector-header">
      <label class="form-label mb-2">
        <i class="fas fa-map-marker-alt text-primary"></i>
        <strong>Selecionar Posição no Pátio</strong>
      </label>
      <small class="text-muted">Escolha uma posição disponível (formato: A01-1, B05-2, etc.)</small>
    </div>
    
    <div class="simple-selector-input">
      <div class="input-group">
        <select class="form-select simple-position-select" id="simplePositionSelect">
          <option value="">🔍 Selecione ou digite uma posição...</option>
        </select>
        <button class="btn btn-outline-secondary" type="button" title="Atualizar posições">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
    </div>
    
    <div class="simple-selector-info mt-2">
      <small class="text-info">
        <i class="fas fa-lightbulb"></i>
        <strong>Dica:</strong> Digite para buscar rapidamente (ex: A1, B05, C12-3)
      </small>
    </div>
  `;
  
  // Configurar funcionalidade
  setTimeout(() => setupSimpleSelector(wrapper), 100);
  
  return wrapper;
}

/**
 * Configurar funcionalidade do seletor simples
 */
function setupSimpleSelector(wrapper) {
  const select = wrapper.querySelector('.simple-position-select');
  const refreshBtn = wrapper.querySelector('.btn');
  
  if (!select) return;
  
  // Carregar posições
  loadSimplePositions(select);
  
  // Configurar Choices.js para autocomplete
  if (window.Choices) {
    const choices = new Choices(select, {
      searchEnabled: true,
      searchChoices: true,
      searchPlaceholderValue: 'Digite para buscar posição...',
      noResultsText: 'Nenhuma posição encontrada',
      noChoicesText: 'Carregando posições...',
      itemSelectText: 'Clique para selecionar',
      removeItemButton: true,
      searchResultLimit: 20,
      shouldSort: false
    });
    
    // Eventos
    select.addEventListener('change', (e) => {
      const selectedPosition = e.target.value;
      if (selectedPosition) {
        console.log('📍 Posição selecionada:', selectedPosition);
        handlePositionSelection(selectedPosition);
      }
    });
    
    // Botão de refresh
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        loadSimplePositions(select).then(() => {
          refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        });
      });
    }
    
    // Salvar referência
    wrapper.choicesInstance = choices;
  }
}

/**
 * Carregar posições para o dropdown simples
 */
async function loadSimplePositions(select) {
  try {
    // Tentar carregar da API
    const positions = await fetchAvailablePositions();
    
    // Limpar opções existentes
    select.innerHTML = '<option value="">🔍 Selecione uma posição...</option>';
    
    // Agrupar por bay para organização
    const groupedPositions = groupPositionsByBay(positions);
    
    // Adicionar opções agrupadas
    Object.keys(groupedPositions).sort().forEach(bay => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = `Bay ${bay} (${groupedPositions[bay].length} posições)`;
      
      groupedPositions[bay].forEach(position => {
        const option = document.createElement('option');
        option.value = position;
        option.textContent = `${position} - Bay ${bay}`;
        optgroup.appendChild(option);
      });
      
      select.appendChild(optgroup);
    });
    
    // Atualizar Choices.js se existir
    const wrapper = select.closest('.simple-position-selector');
    if (wrapper && wrapper.choicesInstance) {
      wrapper.choicesInstance.clearStore();
      wrapper.choicesInstance.setChoices([
        { value: '', label: '🔍 Selecione uma posição...', disabled: true },
        ...positions.map(pos => ({
          value: pos,
          label: `${pos} - Bay ${pos[0]}`,
          customProperties: { bay: pos[0] }
        }))
      ], 'value', 'label', true);
    }
    
    console.log(`✅ ${positions.length} posições carregadas no dropdown simples`);
    
  } catch (error) {
    console.error('❌ Erro ao carregar posições:', error);
    
    // Fallback com posições de exemplo
    const fallbackPositions = generateFallbackPositions();
    fallbackPositions.forEach(position => {
      const option = document.createElement('option');
      option.value = position;
      option.textContent = position;
      select.appendChild(option);
    });
  }
}

/**
 * Buscar posições disponíveis da API
 */
async function fetchAvailablePositions() {
  try {
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
    }
  } catch (error) {
    console.warn('API não disponível, usando posições de exemplo');
  }
  
  // Fallback
  return generateFallbackPositions();
}

/**
 * Gerar posições de fallback
 */
function generateFallbackPositions() {
  const positions = [];
  const bays = ['A', 'B', 'C', 'D', 'E'];
  
  bays.forEach(bay => {
    // Gerar algumas posições de exemplo
    for (let pos = 1; pos <= 20; pos += 2) { // Apenas posições ímpares para exemplo
      for (let height = 1; height <= 2; height++) {
        positions.push(`${bay}${pos.toString().padStart(2, '0')}-${height}`);
      }
    }
  });
  
  return positions.slice(0, 50); // Limitar para não sobrecarregar
}

/**
 * Agrupar posições por bay
 */
function groupPositionsByBay(positions) {
  return positions.reduce((groups, position) => {
    const bay = position[0];
    if (!groups[bay]) groups[bay] = [];
    groups[bay].push(position);
    return groups;
  }, {});
}

/**
 * Lidar com seleção de posição
 */
function handlePositionSelection(position) {
  console.log('📍 Posição selecionada:', position);
  
  // Integrar com sistema existente
  if (window.onPositionSelect) {
    window.onPositionSelect(position);
  }
  
  // Trigger eventos para compatibilidade
  const event = new CustomEvent('positionSelected', { 
    detail: { position: position },
    bubbles: true 
  });
  document.dispatchEvent(event);
  
  // Mostrar confirmação visual
  showPositionConfirmation(position);
}

/**
 * Mostrar confirmação de seleção
 */
function showPositionConfirmation(position) {
  // Criar toast simples
  const toast = document.createElement('div');
  toast.className = 'position-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-check-circle text-success"></i>
      <span>Posição <strong>${position}</strong> selecionada</span>
    </div>
  `;
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #28a745;
    border-radius: 6px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  // Remover após 3 segundos
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/**
 * Observar mudanças no container de descarga
 */
function observeDescargaChanges(container) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Procurar por grids adicionados dinamicamente
          const grids = node.querySelectorAll && node.querySelectorAll('[class*="grid"], [class*="bay"]');
          if (grids) {
            grids.forEach(grid => {
              if (!grid.dataset.simplifiedGrid && grid.offsetHeight > 200) {
                // Se o elemento é muito alto, provavelmente é um grid complexo
                setTimeout(() => replaceContainerWithSimpleDropdown(grid), 500);
              }
            });
          }
        }
      });
    });
  });
  
  observer.observe(container, {
    childList: true,
    subtree: true
  });
}

/**
 * Remover grids existentes
 */
function removeExistingGrids() {
  console.log('🗑️ Removendo grids complexos existentes...');
  
  // Seletores de grids conhecidos
  const gridSelectors = [
    '.bay-grid-visualizer',
    '.position-grid',
    '.grid-container',
    '.matrix-grid-container',
    '.card-list-container',
    '.table-grid-container',
    '.touch-grid-container',
    '[class*="bay-grid"]',
    '[class*="position-grid"]'
  ];
  
  gridSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element.offsetHeight > 150) { // Se for muito alto, é provavelmente um grid complexo
        console.log('🗑️ Removendo grid complexo:', element);
        element.style.display = 'none';
      }
    });
  });
}

/**
 * Adicionar estilos para o seletor simples
 */
function addSimpleStyles() {
  const styles = `
    <style>
      .simple-position-selector {
        max-width: 100%;
      }
      
      .simple-selector-header {
        margin-bottom: 10px;
      }
      
      .simple-selector-header .form-label {
        font-size: 14px;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .simple-position-select {
        font-size: 14px;
      }
      
      .simple-selector-info {
        margin-top: 8px;
      }
      
      .position-toast .toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      
      /* Melhorar aparência do Choices.js */
      .choices {
        margin-bottom: 0;
      }
      
      .choices__inner {
        min-height: 38px;
        padding: 6px 12px;
        border: 1px solid #ced4da;
        border-radius: 0.375rem;
      }
      
      .choices__list--dropdown {
        border: 1px solid #ced4da;
        border-radius: 0.375rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .choices__item--selectable {
        padding: 8px 12px;
      }
      
      .choices__item--selectable:hover {
        background-color: #f8f9fa;
      }
      
      .choices__group .choices__heading {
        font-weight: 600;
        font-size: 12px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 12px 4px;
        background: #f8f9fa;
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

/**
 * Inicializar seletor simples
 */
function initSimplePositionSelector() {
  console.log('🚀 Inicializando Simple Position Selector...');
  
  // Adicionar estilos
  addSimpleStyles();
  
  // Aguardar carregamento completo
  const init = () => {
    // Remover grids existentes
    removeExistingGrids();
    
    // Substituir por seletores simples
    replaceGridWithSimpleSelector();
    
    console.log('✅ Simple Position Selector inicializado');
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Executar novamente após delay para capturar elementos carregados dinamicamente
  setTimeout(init, 2000);
  setTimeout(init, 5000);
}

// Auto-inicializar
initSimplePositionSelector();

// Expor funções globalmente
window.SIMPLE_POSITION_SELECTOR = {
  replace: replaceGridWithSimpleSelector,
  remove: removeExistingGrids,
  init: initSimplePositionSelector
};

console.log('✅ Simple Position Selector carregado!');
