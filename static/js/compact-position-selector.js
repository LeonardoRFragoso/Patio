/**
 * ========================================
 * COMPACT POSITION SELECTOR
 * Seletor ultra-compacto para posições do pátio
 * ========================================
 */

console.log('🎯 Carregando Compact Position Selector...');

class CompactPositionSelector {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      placeholder: 'Digite para buscar posição (ex: A01-1, B5, C12-3)...',
      showStats: true,
      enableQuickActions: true,
      enableKeyboardShortcuts: true,
      maxSuggestions: 50,
      groupByBay: true,
      onSelect: null,
      onClear: null,
      ...options
    };
    
    this.positions = [];
    this.filteredPositions = [];
    this.selectedPosition = null;
    this.highlightedIndex = -1;
    this.isOpen = false;
    
    this.init();
  }
  
  init() {
    this.createHTML();
    this.attachEvents();
    this.loadPositions();
  }
  
  createHTML() {
    this.container.innerHTML = `
      <div class="compact-position-selector">
        <div class="compact-selector-container">
          <input 
            type="text" 
            class="compact-search-input" 
            placeholder="${this.options.placeholder}"
            autocomplete="off"
            spellcheck="false"
          />
          
          <div class="selected-position-indicator empty">
            <i class="fas fa-map-marker-alt"></i>
            <span class="position-text">--</span>
          </div>
          
          ${this.options.enableQuickActions ? `
            <div class="quick-actions">
              <button class="quick-action-btn" title="Limpar seleção" data-action="clear">
                <i class="fas fa-times"></i>
              </button>
              <button class="quick-action-btn" title="Atualizar posições" data-action="refresh">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button class="quick-action-btn" title="Ajuda" data-action="help">
                <i class="fas fa-question"></i>
              </button>
            </div>
          ` : ''}
          
          <div class="keyboard-hint">
            <i class="fas fa-keyboard"></i> Tab/Enter
          </div>
        </div>
        
        <div class="compact-suggestions-dropdown">
          ${this.options.showStats ? `
            <div class="suggestions-header">
              <div class="suggestions-stats">
                <div class="stat-item">
                  <div class="stat-dot available"></div>
                  <span class="available-count">0</span> disponíveis
                </div>
                <div class="stat-item">
                  <div class="stat-dot selected"></div>
                  <span class="filtered-count">0</span> filtradas
                </div>
              </div>
              <div class="search-info">
                Digite bay + posição (A1, B05, C12-3)
              </div>
            </div>
          ` : ''}
          
          <div class="suggestions-content">
            <div class="loading-indicator">
              <div class="loading-spinner"></div>
              Carregando posições...
            </div>
          </div>
          
          <div class="quick-bay-selector">
            <button class="bay-quick-btn bay-A" data-bay="A">A</button>
            <button class="bay-quick-btn bay-B" data-bay="B">B</button>
            <button class="bay-quick-btn bay-C" data-bay="C">C</button>
            <button class="bay-quick-btn bay-D" data-bay="D">D</button>
            <button class="bay-quick-btn bay-E" data-bay="E">E</button>
          </div>
        </div>
      </div>
    `;
    
    // Referências aos elementos
    this.searchInput = this.container.querySelector('.compact-search-input');
    this.dropdown = this.container.querySelector('.compact-suggestions-dropdown');
    this.suggestionsContent = this.container.querySelector('.suggestions-content');
    this.positionIndicator = this.container.querySelector('.selected-position-indicator');
    this.positionText = this.container.querySelector('.position-text');
    this.selectorContainer = this.container.querySelector('.compact-selector-container');
    
    if (this.options.showStats) {
      this.availableCount = this.container.querySelector('.available-count');
      this.filteredCount = this.container.querySelector('.filtered-count');
    }
  }
  
  attachEvents() {
    // Eventos do input de busca
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.searchInput.addEventListener('focus', () => this.handleFocus());
    this.searchInput.addEventListener('blur', (e) => this.handleBlur(e));
    this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Eventos dos botões de ação rápida
    if (this.options.enableQuickActions) {
      this.container.addEventListener('click', (e) => {
        if (e.target.closest('.quick-action-btn')) {
          const action = e.target.closest('.quick-action-btn').dataset.action;
          this.handleQuickAction(action);
        }
      });
    }
    
    // Eventos dos botões de bay
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('bay-quick-btn')) {
        const bay = e.target.dataset.bay;
        this.filterByBay(bay);
      }
    });
    
    // Eventos das sugestões
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.suggestion-item')) {
        const position = e.target.closest('.suggestion-item').dataset.position;
        this.selectPosition(position);
      }
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }
  
  async loadPositions() {
    try {
      // Simular carregamento de posições - você pode substituir pela sua API
      const response = await this.fetchPositions();
      this.positions = response;
      this.updateStats();
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao carregar posições:', error);
      this.showError('Erro ao carregar posições disponíveis');
    }
  }
  
  async fetchPositions() {
    // Simular API call - substitua pela sua implementação
    return new Promise((resolve) => {
      setTimeout(() => {
        // Posições de exemplo
        const positions = [];
        const bays = ['A', 'B', 'C', 'D', 'E'];
        
        bays.forEach(bay => {
          for (let pos = 1; pos <= 20; pos++) {
            for (let height = 1; height <= (bay === 'A' ? 2 : bay === 'B' ? 3 : bay === 'C' ? 4 : 5); height++) {
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
        
        resolve(positions);
      }, 500);
    });
  }
  
  handleSearch(query) {
    this.filterPositions(query);
    this.showDropdown();
    this.highlightedIndex = -1;
    
    // Auto-completar inteligente
    if (query.length >= 1) {
      const autoComplete = this.getAutoComplete(query);
      if (autoComplete && autoComplete !== query) {
        // Mostrar sugestão de auto-complete
        this.showAutoCompleteHint(autoComplete);
      }
    }
  }
  
  filterPositions(query) {
    if (!query.trim()) {
      this.filteredPositions = this.positions.filter(p => p.available);
    } else {
      const searchTerm = query.toUpperCase().trim();
      
      this.filteredPositions = this.positions.filter(position => {
        if (!position.available) return false;
        
        // Busca flexível
        const code = position.code.toUpperCase();
        const bay = position.bay;
        const pos = position.position.toString();
        const height = position.height.toString();
        
        return (
          code.includes(searchTerm) ||
          code.startsWith(searchTerm) ||
          (searchTerm.length >= 1 && bay === searchTerm[0]) ||
          (searchTerm.match(/^[A-E]\d+$/) && code.startsWith(searchTerm)) ||
          (searchTerm.match(/^[A-E]\d+-\d+$/) && code === searchTerm)
        );
      });
    }
    
    // Limitar resultados
    this.filteredPositions = this.filteredPositions.slice(0, this.options.maxSuggestions);
    
    this.renderSuggestions();
    this.updateStats();
  }
  
  renderSuggestions() {
    if (this.filteredPositions.length === 0) {
      this.suggestionsContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-search"></i>
          </div>
          <div>Nenhuma posição encontrada</div>
          <small>Tente buscar por bay (A, B, C, D, E) ou posição específica</small>
        </div>
      `;
      return;
    }
    
    let html = '<ul class="suggestions-list">';
    
    if (this.options.groupByBay) {
      const groupedPositions = this.groupPositionsByBay(this.filteredPositions);
      
      Object.keys(groupedPositions).sort().forEach(bay => {
        html += `
          <li class="suggestion-group">
            <div class="group-header">Bay ${bay}</div>
        `;
        
        groupedPositions[bay].forEach((position, index) => {
          html += this.renderSuggestionItem(position, index);
        });
        
        html += '</li>';
      });
    } else {
      this.filteredPositions.forEach((position, index) => {
        html += this.renderSuggestionItem(position, index);
      });
    }
    
    html += '</ul>';
    this.suggestionsContent.innerHTML = html;
  }
  
  renderSuggestionItem(position, index) {
    const isSelected = this.selectedPosition === position.code;
    const isHighlighted = this.highlightedIndex === index;
    
    return `
      <button class="suggestion-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}" 
              data-position="${position.code}" 
              data-index="${index}">
        <div class="suggestion-content">
          <div class="position-badge bay-${position.bay}">
            ${position.bay}
          </div>
          <div class="position-info">
            <div class="position-code">${position.code}</div>
            <div class="position-details">${position.description}</div>
          </div>
          <div class="position-status available">
            Disponível
          </div>
        </div>
      </button>
    `;
  }
  
  groupPositionsByBay(positions) {
    return positions.reduce((groups, position) => {
      const bay = position.bay;
      if (!groups[bay]) groups[bay] = [];
      groups[bay].push(position);
      return groups;
    }, {});
  }
  
  getAutoComplete(query) {
    const upperQuery = query.toUpperCase();
    
    // Auto-complete patterns
    if (/^[A-E]$/.test(upperQuery)) {
      return `${upperQuery}01-1`;
    }
    
    if (/^[A-E]\d{1}$/.test(upperQuery)) {
      const bay = upperQuery[0];
      const num = upperQuery[1];
      return `${bay}0${num}-1`;
    }
    
    if (/^[A-E]\d{2}$/.test(upperQuery)) {
      return `${upperQuery}-1`;
    }
    
    return null;
  }
  
  handleKeydown(e) {
    if (!this.isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.highlightNext();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.highlightPrevious();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.highlightedIndex >= 0) {
          const position = this.filteredPositions[this.highlightedIndex];
          this.selectPosition(position.code);
        } else if (this.filteredPositions.length === 1) {
          this.selectPosition(this.filteredPositions[0].code);
        }
        break;
        
      case 'Tab':
        if (this.filteredPositions.length === 1) {
          e.preventDefault();
          this.selectPosition(this.filteredPositions[0].code);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        break;
    }
  }
  
  highlightNext() {
    this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredPositions.length - 1);
    this.updateHighlight();
  }
  
  highlightPrevious() {
    this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
    this.updateHighlight();
  }
  
  updateHighlight() {
    const items = this.container.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      item.classList.toggle('highlighted', index === this.highlightedIndex);
    });
    
    // Scroll para o item destacado
    if (this.highlightedIndex >= 0) {
      const highlightedItem = items[this.highlightedIndex];
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }
  
  selectPosition(positionCode) {
    this.selectedPosition = positionCode;
    this.searchInput.value = positionCode;
    
    // Atualizar indicador visual
    this.positionIndicator.classList.remove('empty');
    this.positionText.textContent = positionCode;
    
    // Callback
    if (this.options.onSelect) {
      this.options.onSelect(positionCode);
    }
    
    this.closeDropdown();
    
    // Trigger change event para compatibilidade
    const event = new CustomEvent('change', { detail: { position: positionCode } });
    this.container.dispatchEvent(event);
  }
  
  clearSelection() {
    this.selectedPosition = null;
    this.searchInput.value = '';
    this.positionIndicator.classList.add('empty');
    this.positionText.textContent = '--';
    
    if (this.options.onClear) {
      this.options.onClear();
    }
    
    this.closeDropdown();
  }
  
  handleQuickAction(action) {
    switch (action) {
      case 'clear':
        this.clearSelection();
        break;
        
      case 'refresh':
        this.loadPositions();
        break;
        
      case 'help':
        this.showHelp();
        break;
    }
  }
  
  filterByBay(bay) {
    // Remover seleção anterior de bay
    this.container.querySelectorAll('.bay-quick-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Ativar bay selecionado
    const bayBtn = this.container.querySelector(`[data-bay="${bay}"]`);
    if (bayBtn) {
      bayBtn.classList.add('active');
    }
    
    // Filtrar por bay
    this.searchInput.value = bay;
    this.handleSearch(bay);
    this.searchInput.focus();
  }
  
  handleFocus() {
    this.selectorContainer.classList.add('focused');
    this.showDropdown();
    
    if (!this.searchInput.value) {
      this.filterPositions('');
    }
  }
  
  handleBlur(e) {
    // Delay para permitir cliques nos botões
    setTimeout(() => {
      if (!this.container.contains(document.activeElement)) {
        this.selectorContainer.classList.remove('focused');
        this.closeDropdown();
      }
    }, 150);
  }
  
  showDropdown() {
    this.isOpen = true;
    this.dropdown.classList.add('show');
  }
  
  closeDropdown() {
    this.isOpen = false;
    this.dropdown.classList.remove('show');
    this.highlightedIndex = -1;
    
    // Remover seleção de bay
    this.container.querySelectorAll('.bay-quick-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }
  
  updateStats() {
    if (!this.options.showStats) return;
    
    const availableCount = this.positions.filter(p => p.available).length;
    const filteredCount = this.filteredPositions.length;
    
    if (this.availableCount) this.availableCount.textContent = availableCount;
    if (this.filteredCount) this.filteredCount.textContent = filteredCount;
  }
  
  hideLoading() {
    const loadingIndicator = this.container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
  
  showError(message) {
    this.suggestionsContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div>${message}</div>
        <button class="btn btn-sm btn-outline-primary mt-2" onclick="this.closest('.compact-position-selector').compactSelector.loadPositions()">
          Tentar novamente
        </button>
      </div>
    `;
  }
  
  showHelp() {
    const helpContent = `
      <div class="help-modal">
        <h6>Como usar o seletor de posições:</h6>
        <ul>
          <li><strong>A1</strong> - Buscar bay A, posição 1</li>
          <li><strong>B05</strong> - Buscar bay B, posição 05</li>
          <li><strong>C12-3</strong> - Posição específica C12, altura 3</li>
          <li><strong>↑↓</strong> - Navegar pelas sugestões</li>
          <li><strong>Enter/Tab</strong> - Selecionar posição</li>
          <li><strong>Esc</strong> - Fechar</li>
        </ul>
      </div>
    `;
    
    // Mostrar em modal ou tooltip
    if (window.Swal) {
      Swal.fire({
        title: 'Ajuda - Seletor de Posições',
        html: helpContent,
        icon: 'info',
        confirmButtonText: 'Entendi'
      });
    } else {
      alert('Ajuda: Digite bay + posição (ex: A1, B05, C12-3). Use setas para navegar, Enter para selecionar.');
    }
  }
  
  // Métodos públicos
  getSelectedPosition() {
    return this.selectedPosition;
  }
  
  setPositions(positions) {
    this.positions = positions;
    this.updateStats();
    this.hideLoading();
  }
  
  setValue(positionCode) {
    if (positionCode) {
      this.selectPosition(positionCode);
    } else {
      this.clearSelection();
    }
  }
  
  focus() {
    this.searchInput.focus();
  }
  
  disable() {
    this.searchInput.disabled = true;
    this.selectorContainer.style.opacity = '0.6';
    this.selectorContainer.style.pointerEvents = 'none';
  }
  
  enable() {
    this.searchInput.disabled = false;
    this.selectorContainer.style.opacity = '1';
    this.selectorContainer.style.pointerEvents = 'auto';
  }
}

// Factory function para criar seletor compacto
function createCompactPositionSelector(container, options = {}) {
  const selector = new CompactPositionSelector(container, options);
  
  // Expor referência no container para acesso externo
  container.compactSelector = selector;
  
  return selector;
}

// Função para substituir seletores existentes
function upgradeToCompactSelector(selectElement, options = {}) {
  const container = selectElement.parentElement;
  
  // Preservar valor atual se houver
  const currentValue = selectElement.value;
  
  // Criar wrapper se necessário
  let wrapper = container.querySelector('.compact-selector-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'compact-selector-wrapper';
    container.insertBefore(wrapper, selectElement);
  }
  
  // Ocultar select original
  selectElement.style.display = 'none';
  
  // Criar seletor compacto
  const compactSelector = createCompactPositionSelector(wrapper, {
    ...options,
    onSelect: (position) => {
      // Sincronizar com select original
      selectElement.value = position;
      selectElement.dispatchEvent(new Event('change'));
      
      if (options.onSelect) {
        options.onSelect(position);
      }
    }
  });
  
  // Definir valor inicial
  if (currentValue) {
    compactSelector.setValue(currentValue);
  }
  
  return compactSelector;
}

// Expor globalmente
window.CompactPositionSelector = CompactPositionSelector;
window.createCompactPositionSelector = createCompactPositionSelector;
window.upgradeToCompactSelector = upgradeToCompactSelector;

console.log('✅ Compact Position Selector carregado');
