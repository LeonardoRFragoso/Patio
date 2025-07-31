/**
 * ========================================
 * DEMONSTRAÇÃO DO COMPACT POSITION SELECTOR
 * Script para testar e demonstrar o novo layout compacto
 * ========================================
 */

console.log('🎪 Carregando demonstração do Compact Position Selector...');

/**
 * Criar modal de demonstração do layout compacto
 */
function createCompactSelectorDemo() {
  const modalHtml = `
    <div class="modal fade" id="compactSelectorDemoModal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-rocket"></i> Novo Layout Compacto - Demonstração
            </h5>
            <button type="button" class="close text-white" data-dismiss="modal">
              <span>&times;</span>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Comparação: Antes vs Depois -->
            <div class="comparison-section mb-4">
              <h6 class="text-center mb-3">
                <i class="fas fa-balance-scale"></i> Comparação: Layout Atual vs Novo Layout Compacto
              </h6>
              
              <div class="row">
                <!-- Layout Atual -->
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header bg-danger text-white">
                      <small><i class="fas fa-times"></i> Layout Atual - Problemático</small>
                    </div>
                    <div class="card-body">
                      <div class="old-layout-demo">
                        <select class="form-control mb-2">
                          <option>Selecione a posição</option>
                          <option>A01-1</option>
                          <option>A01-2</option>
                          <option>A03-1</option>
                          <!-- Simulação de muitas opções -->
                        </select>
                        <div class="alert alert-warning">
                          <small>
                            ❌ Ocupa muito espaço<br>
                            ❌ Difícil de navegar<br>
                            ❌ Sem busca inteligente<br>
                            ❌ Não é user-friendly
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Layout Novo -->
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header bg-success text-white">
                      <small><i class="fas fa-check"></i> Novo Layout Compacto</small>
                    </div>
                    <div class="card-body">
                      <div id="compactSelectorDemo"></div>
                      <div class="alert alert-success mt-2">
                        <small>
                          ✅ Ultra-compacto (1 linha)<br>
                          ✅ Busca inteligente<br>
                          ✅ Atalhos de teclado<br>
                          ✅ User-friendly
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Funcionalidades -->
            <div class="features-section mb-4">
              <h6><i class="fas fa-star"></i> Principais Funcionalidades</h6>
              <div class="row">
                <div class="col-md-4">
                  <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <h6>Busca Inteligente</h6>
                    <small>Digite A1, B05, C12-3 e encontre rapidamente</small>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="feature-card">
                    <div class="feature-icon">⌨️</div>
                    <h6>Atalhos de Teclado</h6>
                    <small>Setas, Enter, Tab para navegação rápida</small>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h6>Estatísticas Visuais</h6>
                    <small>Veja quantas posições estão disponíveis</small>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Instruções de Uso -->
            <div class="instructions-section">
              <h6><i class="fas fa-graduation-cap"></i> Como Usar</h6>
              <div class="instruction-steps">
                <div class="step">
                  <span class="step-number">1</span>
                  <div class="step-content">
                    <strong>Digite para buscar:</strong> A1, B05, C12-3, etc.
                  </div>
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  <div class="step-content">
                    <strong>Use as setas:</strong> ↑↓ para navegar pelas sugestões
                  </div>
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  <div class="step-content">
                    <strong>Selecione:</strong> Enter ou Tab para confirmar
                  </div>
                </div>
                <div class="step">
                  <span class="step-number">4</span>
                  <div class="step-content">
                    <strong>Botões rápidos:</strong> Clique nas letras A-E para filtrar por bay
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-success" id="activateCompactLayout">
              <i class="fas fa-rocket"></i> Ativar Layout Compacto
            </button>
            <button type="button" class="btn btn-outline-secondary" id="testCompactLayout">
              <i class="fas fa-play"></i> Testar Mais
            </button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal existente se houver
  const existingModal = document.getElementById('compactSelectorDemoModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Adicionar novo modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Configurar eventos
  setupDemoEvents();
  
  // Criar demonstração do seletor compacto
  setTimeout(createCompactDemo, 500);
}

/**
 * Criar demonstração do seletor compacto
 */
function createCompactDemo() {
  const demoContainer = document.getElementById('compactSelectorDemo');
  if (!demoContainer || typeof CompactPositionSelector === 'undefined') {
    console.log('⏳ Aguardando carregamento do CompactPositionSelector...');
    setTimeout(createCompactDemo, 500);
    return;
  }
  
  // Criar seletor compacto para demonstração
  const compactSelector = new CompactPositionSelector(demoContainer, {
    placeholder: 'Teste aqui: digite A1, B05, C12-3...',
    showStats: true,
    enableQuickActions: true,
    enableKeyboardShortcuts: true,
    maxSuggestions: 20,
    groupByBay: true,
    onSelect: (position) => {
      showNotification(`✅ Posição selecionada: ${position}`, 'success');
      
      // Animar seleção
      const indicator = demoContainer.querySelector('.selected-position-indicator');
      if (indicator) {
        indicator.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
          indicator.style.animation = '';
        }, 500);
      }
    },
    onClear: () => {
      showNotification('🗑️ Seleção limpa', 'info');
    }
  });
  
  // Carregar posições de exemplo
  const samplePositions = generateSamplePositions();
  compactSelector.setPositions(samplePositions);
  
  console.log('✅ Demonstração do Compact Selector criada');
}

/**
 * Configurar eventos da demonstração
 */
function setupDemoEvents() {
  const modal = document.getElementById('compactSelectorDemoModal');
  
  // Botão para ativar layout compacto
  const activateBtn = modal.querySelector('#activateCompactLayout');
  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      activateCompactLayoutGlobally();
      $('#compactSelectorDemoModal').modal('hide');
    });
  }
  
  // Botão para testar mais
  const testBtn = modal.querySelector('#testCompactLayout');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      createTestScenarios();
    });
  }
}

/**
 * Ativar layout compacto globalmente
 */
function activateCompactLayoutGlobally() {
  console.log('🚀 Ativando layout compacto globalmente...');
  
  // Salvar preferência
  localStorage.setItem('useCompactPositionSelector', 'true');
  
  // Integrar com sistema existente
  if (window.COMPACT_GRID_INTEGRATION) {
    window.COMPACT_GRID_INTEGRATION.integrate();
  }
  
  // Mostrar confirmação
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Layout Compacto Ativado!',
      text: 'O novo layout compacto foi ativado. Todos os seletores de posição agora usarão o design otimizado.',
      confirmButtonText: 'Perfeito!',
      timer: 3000
    });
  } else {
    showNotification('🚀 Layout Compacto ativado com sucesso!', 'success');
  }
  
  // Forçar atualização dos seletores existentes
  setTimeout(() => {
    const selectors = document.querySelectorAll('select[id*="posicao"]');
    selectors.forEach(selector => {
      if (!selector.dataset.compactUpgraded && window.upgradeToCompactSelector) {
        window.upgradeToCompactSelector(selector);
      }
    });
  }, 1000);
}

/**
 * Criar cenários de teste
 */
function createTestScenarios() {
  const scenarios = [
    {
      title: 'Busca por Bay',
      instruction: 'Digite "A" para ver todas as posições do Bay A',
      testValue: 'A'
    },
    {
      title: 'Busca Específica',
      instruction: 'Digite "B05" para buscar posição específica',
      testValue: 'B05'
    },
    {
      title: 'Posição Completa',
      instruction: 'Digite "C12-3" para posição completa',
      testValue: 'C12-3'
    }
  ];
  
  let currentScenario = 0;
  
  const runNextScenario = () => {
    if (currentScenario >= scenarios.length) {
      showNotification('✅ Todos os cenários testados!', 'success');
      return;
    }
    
    const scenario = scenarios[currentScenario];
    const demoContainer = document.getElementById('compactSelectorDemo');
    const input = demoContainer?.querySelector('.compact-search-input');
    
    if (input) {
      // Limpar input
      input.value = '';
      input.dispatchEvent(new Event('input'));
      
      // Mostrar instrução
      showNotification(`🧪 Teste ${currentScenario + 1}: ${scenario.title} - ${scenario.instruction}`, 'info');
      
      // Simular digitação após delay
      setTimeout(() => {
        input.value = scenario.testValue;
        input.dispatchEvent(new Event('input'));
        input.focus();
        
        currentScenario++;
        setTimeout(runNextScenario, 3000);
      }, 1000);
    }
  };
  
  runNextScenario();
}

/**
 * Gerar posições de exemplo para demonstração
 */
function generateSamplePositions() {
  const positions = [];
  const bays = ['A', 'B', 'C', 'D', 'E'];
  const maxHeights = { A: 2, B: 3, C: 4, D: 5, E: 5 };
  
  bays.forEach(bay => {
    // Gerar apenas algumas posições para demonstração
    const samplePositions = [1, 3, 5, 7, 9, 12, 15, 18, 20];
    
    samplePositions.forEach(pos => {
      for (let height = 1; height <= Math.min(maxHeights[bay], 3); height++) {
        const positionCode = `${bay}${pos.toString().padStart(2, '0')}-${height}`;
        positions.push({
          id: positionCode,
          bay: bay,
          position: pos,
          height: height,
          available: Math.random() > 0.2, // 80% disponíveis para demo
          code: positionCode,
          description: `Bay ${bay}, Posição ${pos.toString().padStart(2, '0')}, Altura ${height}`
        });
      }
    });
  });
  
  return positions;
}

/**
 * Mostrar notificação
 */
function showNotification(message, type = 'info') {
  const alertClass = type === 'success' ? 'alert-success' : 
                    type === 'error' ? 'alert-danger' : 'alert-info';
  
  const notification = document.createElement('div');
  notification.className = `alert ${alertClass} alert-dismissible fade show compact-demo-notification`;
  notification.style.cssText = `
    position: fixed; 
    top: 20px; 
    right: 20px; 
    z-index: 9999; 
    min-width: 300px;
    animation: slideInRight 0.3s ease-out;
  `;
  notification.innerHTML = `
    ${message}
    <button type="button" class="close" onclick="this.parentElement.remove()">
      <span>&times;</span>
    </button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove após 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 4000);
}

/**
 * Adicionar estilos para a demonstração
 */
function addDemoStyles() {
  const styles = `
    <style>
      .feature-card {
        text-align: center;
        padding: 15px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 15px;
        transition: transform 0.2s;
      }
      
      .feature-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      
      .feature-icon {
        font-size: 2rem;
        margin-bottom: 10px;
      }
      
      .instruction-steps {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .step {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .step-number {
        width: 30px;
        height: 30px;
        background: #007bff;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .step-content {
        flex: 1;
      }
      
      .old-layout-demo select {
        height: 200px !important;
        overflow-y: auto;
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

/**
 * Adicionar botão para abrir demonstração
 */
function addDemoButton() {
  // Procurar por área adequada para adicionar o botão
  const targetAreas = [
    '.operacoes-header',
    '.card-header',
    '.welcome-section'
  ];
  
  let targetArea = null;
  for (const selector of targetAreas) {
    targetArea = document.querySelector(selector);
    if (targetArea) break;
  }
  
  if (targetArea && !document.getElementById('compactSelectorDemoBtn')) {
    const button = document.createElement('button');
    button.id = 'compactSelectorDemoBtn';
    button.className = 'btn btn-outline-primary btn-sm';
    button.innerHTML = '<i class="fas fa-rocket"></i> Novo Layout Compacto';
    button.title = 'Testar o novo layout compacto para seleção de posições';
    button.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10;';
    
    button.addEventListener('click', () => {
      $('#compactSelectorDemoModal').modal('show');
    });
    
    // Adicionar posicionamento relativo ao container pai se necessário
    if (getComputedStyle(targetArea).position === 'static') {
      targetArea.style.position = 'relative';
    }
    
    targetArea.appendChild(button);
  }
}

/**
 * Inicializar demonstração
 */
function initCompactSelectorDemo() {
  console.log('🎪 Inicializando demonstração do Compact Position Selector...');
  
  // Aguardar carregamento completo
  const checkAndInit = () => {
    if (typeof CompactPositionSelector !== 'undefined') {
      addDemoStyles();
      createCompactSelectorDemo();
      
      // Adicionar botão após delay
      setTimeout(addDemoButton, 2000);
      
      console.log('✅ Demonstração do Compact Position Selector inicializada');
    } else {
      setTimeout(checkAndInit, 500);
    }
  };
  
  checkAndInit();
}

// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCompactSelectorDemo);
} else {
  initCompactSelectorDemo();
}

// Expor funções globalmente
window.COMPACT_SELECTOR_DEMO = {
  show: () => $('#compactSelectorDemoModal').modal('show'),
  activate: activateCompactLayoutGlobally,
  test: createTestScenarios
};

console.log('✅ Compact Selector Demo carregado!');
