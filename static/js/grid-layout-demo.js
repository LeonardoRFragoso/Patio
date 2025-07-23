/**
 * ========================================
 * DEMONSTRAÇÃO DOS LAYOUTS ALTERNATIVOS
 * Script para testar e escolher o melhor layout
 * ========================================
 */

console.log('🎭 Carregando demonstração de layouts...');

// Posições de exemplo para teste
const SAMPLE_POSITIONS = [
  'A01-1', 'A01-2', 'A01-3', 'A03-1', 'A03-2', 'A05-1', 'A05-2', 'A05-3',
  'B01-1', 'B01-2', 'B03-1', 'B03-2', 'B03-3', 'B05-1', 'B05-2',
  'C01-1', 'C01-2', 'C01-3', 'C03-1', 'C03-2', 'C05-1',
  'D01-1', 'D01-2', 'D03-1', 'D03-2', 'D03-3', 'D05-1', 'D05-2',
  'E01-1', 'E01-2', 'E01-3', 'E03-1', 'E03-2', 'E05-1'
];

/**
 * Criar modal de demonstração dos layouts
 */
function createLayoutDemoModal() {
  const modalHtml = `
    <div class="modal fade" id="layoutDemoModal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-palette"></i> Teste dos Layouts de Grid - Escolha o Melhor
            </h5>
            <button type="button" class="close" data-dismiss="modal">
              <span>&times;</span>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Seletor de Layout -->
            <div class="layout-selector mb-4">
              <div class="btn-group btn-group-toggle" data-toggle="buttons">
                <label class="btn btn-outline-primary active">
                  <input type="radio" name="layoutOption" value="table" checked> 
                  📊 Tabela
                </label>
                <label class="btn btn-outline-success">
                  <input type="radio" name="layoutOption" value="cards"> 
                  🃏 Cards
                </label>
                <label class="btn btn-outline-info">
                  <input type="radio" name="layoutOption" value="matrix"> 
                  🔢 Matriz
                </label>
                <label class="btn btn-outline-warning">
                  <input type="radio" name="layoutOption" value="touch"> 
                  📱 Touch
                </label>
              </div>
              
              <div class="ml-3">
                <button class="btn btn-success" id="applySelectedLayout">
                  <i class="fas fa-check"></i> Usar Este Layout
                </button>
                <button class="btn btn-secondary" id="resetToOriginal">
                  <i class="fas fa-undo"></i> Voltar ao Original
                </button>
              </div>
            </div>
            
            <!-- Descrições dos Layouts -->
            <div class="layout-descriptions mb-4">
              <div class="alert alert-info layout-desc" data-layout="table">
                <strong>📊 Layout Tabela:</strong> Familiar como planilha, fácil de navegar, ideal para operadores acostumados com sistemas tradicionais.
              </div>
              <div class="alert alert-success layout-desc" data-layout="cards" style="display: none;">
                <strong>🃏 Layout Cards:</strong> Visual e intuitivo, cada posição é um card separado, ótimo para telas grandes.
              </div>
              <div class="alert alert-info layout-desc" data-layout="matrix" style="display: none;">
                <strong>🔢 Layout Matriz:</strong> Visão completa do pátio, estilo planilha avançada, ideal para análise rápida.
              </div>
              <div class="alert alert-warning layout-desc" data-layout="touch" style="display: none;">
                <strong>📱 Layout Touch:</strong> Otimizado para tablets e touch, botões grandes e fáceis de tocar.
              </div>
            </div>
            
            <!-- Container para o layout atual -->
            <div id="currentLayoutDemo" style="min-height: 400px; border: 2px dashed #dee2e6; border-radius: 8px; padding: 20px;">
              <!-- Layout será inserido aqui -->
            </div>
            
            <!-- Feedback do usuário -->
            <div class="user-feedback mt-4">
              <h6>💬 Avalie este layout:</h6>
              <div class="btn-group">
                <button class="btn btn-outline-success feedback-btn" data-rating="excellent">
                  <i class="fas fa-thumbs-up"></i> Excelente
                </button>
                <button class="btn btn-outline-primary feedback-btn" data-rating="good">
                  <i class="fas fa-smile"></i> Bom
                </button>
                <button class="btn btn-outline-warning feedback-btn" data-rating="ok">
                  <i class="fas fa-meh"></i> OK
                </button>
                <button class="btn btn-outline-danger feedback-btn" data-rating="bad">
                  <i class="fas fa-thumbs-down"></i> Ruim
                </button>
              </div>
              <div class="feedback-text mt-2">
                <textarea class="form-control" placeholder="Comentários sobre este layout..." rows="2"></textarea>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <div class="selected-position-display">
              <strong>Posição Selecionada:</strong> <span id="demoSelectedPosition">Nenhuma</span>
            </div>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal existente se houver
  const existingModal = document.getElementById('layoutDemoModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Adicionar novo modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Adicionar event listeners
  setupDemoEventListeners();
  
  console.log('✅ Modal de demonstração criado');
}

/**
 * Configurar event listeners do modal
 */
function setupDemoEventListeners() {
  const modal = document.getElementById('layoutDemoModal');
  
  // Mudança de layout
  modal.addEventListener('change', (e) => {
    if (e.target.name === 'layoutOption') {
      const selectedLayout = e.target.value;
      showLayoutDemo(selectedLayout);
      updateLayoutDescription(selectedLayout);
    }
  });
  
  // Aplicar layout selecionado
  modal.querySelector('#applySelectedLayout').addEventListener('click', () => {
    const selectedLayout = modal.querySelector('input[name="layoutOption"]:checked').value;
    applyLayoutToSystem(selectedLayout);
    $('#layoutDemoModal').modal('hide');
  });
  
  // Reset para original
  modal.querySelector('#resetToOriginal').addEventListener('click', () => {
    resetToOriginalGrid();
    $('#layoutDemoModal').modal('hide');
  });
  
  // Feedback buttons
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('feedback-btn')) {
      // Remove active from all feedback buttons
      modal.querySelectorAll('.feedback-btn').forEach(btn => 
        btn.classList.remove('active'));
      
      // Add active to clicked button
      e.target.classList.add('active');
      
      const rating = e.target.dataset.rating;
      const layout = modal.querySelector('input[name="layoutOption"]:checked').value;
      
      console.log(`📝 Feedback: Layout ${layout} avaliado como ${rating}`);
    }
  });
}

/**
 * Mostrar demonstração do layout selecionado
 */
function showLayoutDemo(layoutType) {
  const container = document.getElementById('currentLayoutDemo');
  
  if (!window.ALTERNATIVE_GRID_LAYOUTS || !window.ALTERNATIVE_GRID_LAYOUTS[layoutType]) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        Layout "${layoutType}" não está disponível. Verifique se os scripts foram carregados.
      </div>
    `;
    return;
  }
  
  console.log(`🎨 Mostrando demo do layout: ${layoutType}`);
  
  // Criar layout
  const layoutFunction = window.ALTERNATIVE_GRID_LAYOUTS[layoutType];
  const layoutInstance = layoutFunction(container, SAMPLE_POSITIONS, {
    onPositionSelect: (position) => {
      document.getElementById('demoSelectedPosition').textContent = position || 'Nenhuma';
      console.log(`🎯 Posição selecionada no demo: ${position}`);
    }
  });
  
  console.log(`✅ Layout ${layoutType} carregado no demo`);
}

/**
 * Atualizar descrição do layout
 */
function updateLayoutDescription(layoutType) {
  const descriptions = document.querySelectorAll('.layout-desc');
  descriptions.forEach(desc => {
    desc.style.display = desc.dataset.layout === layoutType ? 'block' : 'none';
  });
}

/**
 * Aplicar layout selecionado ao sistema
 */
function applyLayoutToSystem(layoutType) {
  console.log(`🚀 Aplicando layout ${layoutType} ao sistema...`);
  
  // Salvar preferência
  localStorage.setItem('preferredGridLayout', layoutType);
  
  // Substituir função do grid
  if (window.ALTERNATIVE_GRID_LAYOUTS && window.ALTERNATIVE_GRID_LAYOUTS[layoutType]) {
    const layoutFunction = window.ALTERNATIVE_GRID_LAYOUTS[layoutType];
    
    // Substituir criarBayGridVisualizer
    window._originalCriarBayGridVisualizer = window.criarBayGridVisualizer || window._originalCriarBayGridVisualizer;
    
    window.criarBayGridVisualizer = function(posicoes, options = {}) {
      console.log(`🎯 Usando layout ${layoutType} no sistema`);
      
      // Encontrar container
      let container = document.querySelector('.bay-grid-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'bay-grid-container alternative-grid-container';
        
        // Encontrar onde inserir
        const positionSelects = document.querySelectorAll('select[id*="posicao"]');
        if (positionSelects.length > 0) {
          const select = positionSelects[positionSelects.length - 1];
          select.parentNode.insertBefore(container, select.nextSibling);
          select.style.display = 'none';
        }
      }
      
      return layoutFunction(container, posicoes, {
        ...options,
        onPositionSelect: (position, info) => {
          // Atualizar select original
          const selects = document.querySelectorAll('select[id*="posicao"]');
          selects.forEach(select => {
            if (select.offsetParent !== null || select.style.display !== 'none') {
              select.value = position || '';
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          
          // Callback original
          if (options.onPositionSelect) {
            options.onPositionSelect(position, info);
          }
        }
      });
    };
    
    // Mostrar notificação
    showNotification(`✅ Layout ${layoutType.toUpperCase()} aplicado com sucesso!`, 'success');
    
    // Forçar atualização de grids existentes
    setTimeout(() => {
      const existingGrids = document.querySelectorAll('.bay-grid-container');
      existingGrids.forEach(grid => {
        if (grid.innerHTML.trim()) {
          // Simular clique no toggle para recriar o grid
          const toggles = document.querySelectorAll('[data-toggle-view="grid"]');
          toggles.forEach(toggle => {
            if (toggle.classList.contains('active')) {
              toggle.click();
              setTimeout(() => toggle.click(), 100);
            }
          });
        }
      });
    }, 500);
    
  } else {
    showNotification(`❌ Erro: Layout ${layoutType} não disponível`, 'error');
  }
}

/**
 * Resetar para grid original
 */
function resetToOriginalGrid() {
  console.log('🔄 Resetando para grid original...');
  
  // Remover preferência
  localStorage.removeItem('preferredGridLayout');
  
  // Restaurar função original
  if (window._originalCriarBayGridVisualizer) {
    window.criarBayGridVisualizer = window._originalCriarBayGridVisualizer;
  }
  
  showNotification('✅ Grid original restaurado!', 'success');
  
  // Forçar atualização
  setTimeout(() => {
    const toggles = document.querySelectorAll('[data-toggle-view="grid"]');
    toggles.forEach(toggle => {
      if (toggle.classList.contains('active')) {
        toggle.click();
        setTimeout(() => toggle.click(), 100);
      }
    });
  }, 500);
}

/**
 * Mostrar notificação
 */
function showNotification(message, type = 'info') {
  const alertClass = type === 'success' ? 'alert-success' : 
                    type === 'error' ? 'alert-danger' : 'alert-info';
  
  const notification = document.createElement('div');
  notification.className = `alert ${alertClass} alert-dismissible fade show`;
  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  notification.innerHTML = `
    ${message}
    <button type="button" class="close" data-dismiss="alert">
      <span>&times;</span>
    </button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove após 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

/**
 * Inicializar demonstração
 */
function initLayoutDemo() {
  // Aguardar carregamento dos layouts alternativos
  const checkAndInit = () => {
    if (window.ALTERNATIVE_GRID_LAYOUTS) {
      createLayoutDemoModal();
      
      // Aplicar layout salvo se houver
      const savedLayout = localStorage.getItem('preferredGridLayout');
      if (savedLayout && window.ALTERNATIVE_GRID_LAYOUTS[savedLayout]) {
        console.log(`🔄 Aplicando layout salvo: ${savedLayout}`);
        applyLayoutToSystem(savedLayout);
      }
      
      console.log('✅ Demonstração de layouts inicializada');
    } else {
      setTimeout(checkAndInit, 500);
    }
  };
  
  checkAndInit();
}

/**
 * Adicionar botão para abrir demonstração
 */
function addDemoButton() {
  // Procurar por containers de grid existentes
  const containers = document.querySelectorAll('.position-organizer-container, .form-group');
  
  containers.forEach(container => {
    const select = container.querySelector('select[id*="posicao"]');
    if (select && !container.querySelector('.demo-layout-btn')) {
      const button = document.createElement('button');
      button.className = 'btn btn-outline-info btn-sm demo-layout-btn ml-2';
      button.innerHTML = '<i class="fas fa-palette"></i> Testar Layouts';
      button.title = 'Testar diferentes layouts de grid';
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        $('#layoutDemoModal').modal('show');
        // Mostrar layout padrão
        setTimeout(() => showLayoutDemo('table'), 500);
      });
      
      // Inserir após o select ou toggle
      const insertAfter = container.querySelector('.view-toggle-container') || select;
      insertAfter.parentNode.insertBefore(button, insertAfter.nextSibling);
    }
  });
}

// Expor funções globalmente
window.GRID_LAYOUT_DEMO = {
  show: () => $('#layoutDemoModal').modal('show'),
  apply: applyLayoutToSystem,
  reset: resetToOriginalGrid
};

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initLayoutDemo();
    setTimeout(addDemoButton, 2000);
  });
} else {
  initLayoutDemo();
  setTimeout(addDemoButton, 2000);
}

console.log('✅ Sistema de demonstração de layouts carregado');
