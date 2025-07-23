/**
 * ========================================
 * SELETOR DE POSIÇÕES MELHORADO
 * Interface moderna e intuitiva para seleção de posições do pátio
 * ========================================
 */

class PositionSelectorImproved {
  constructor(selectElement, options = {}) {
    this.selectElement = selectElement;
    this.options = {
      containerSize: 20,
      showStats: true,
      showSearch: true,
      showFilters: true,
      allowMultiSelect: false,
      theme: 'modern',
      ...options
    };
    
    this.positions = [];
    this.filteredPositions = [];
    this.selectedPositions = [];
    this.currentView = 'cards'; // 'cards', 'list', 'grid'
    this.filters = {
      bay: '',
      altura: '',
      search: ''
    };
    
    this.container = null;
    this.searchInput = null;
    this.statsContainer = null;
    this.positionsContainer = null;
    
    this.init();
  }
  
  /**
   * Inicializa o componente
   */
  init() {
    this.createContainer();
    this.bindEvents();
    console.log('✅ Position Selector Improved inicializado');
  }
  
  /**
   * Cria o container principal do componente
   */
  createContainer() {
    // Ocultar select original
    this.selectElement.style.display = 'none';
    
    // Criar container principal
    this.container = document.createElement('div');
    this.container.className = 'position-selector-improved';
    this.container.innerHTML = this.getContainerHTML();
    
    // Inserir após o select original
    this.selectElement.parentNode.insertBefore(this.container, this.selectElement.nextSibling);
    
    // Referenciar elementos
    this.searchInput = this.container.querySelector('.position-search-input');
    this.statsContainer = this.container.querySelector('.position-stats-container');
    this.positionsContainer = this.container.querySelector('.positions-container');
    this.viewToggle = this.container.querySelector('.view-toggle');
    this.filtersContainer = this.container.querySelector('.filters-container');
  }
  
  /**
   * HTML do container principal
   */
  getContainerHTML() {
    return `
      <div class="position-selector-header">
        ${this.options.showSearch ? this.getSearchHTML() : ''}
        ${this.options.showFilters ? this.getFiltersHTML() : ''}
        ${this.getViewToggleHTML()}
      </div>
      
      ${this.options.showStats ? this.getStatsHTML() : ''}
      
      <div class="positions-container">
        <div class="loading-state">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
          <span class="ms-2">Carregando posições...</span>
        </div>
      </div>
      
      <div class="position-selector-footer">
        <div class="selected-count">
          <span class="badge bg-primary">0 selecionadas</span>
        </div>
        <div class="action-buttons">
          <button type="button" class="btn btn-sm btn-outline-secondary clear-selection">
            <i class="fas fa-times me-1"></i>Limpar
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * HTML da busca
   */
  getSearchHTML() {
    return `
      <div class="position-search-container">
        <div class="input-group">
          <span class="input-group-text">
            <i class="fas fa-search"></i>
          </span>
          <input type="text" 
                 class="form-control position-search-input" 
                 placeholder="Buscar por bay (A-E), posição (01-20) ou altura (1-5)..."
                 autocomplete="off">
          <button class="btn btn-outline-secondary clear-search" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * HTML dos filtros
   */
  getFiltersHTML() {
    return `
      <div class="filters-container">
        <div class="row g-2">
          <div class="col-md-4">
            <select class="form-select form-select-sm bay-filter">
              <option value="">Todas as Bays</option>
              <option value="A">Bay A</option>
              <option value="B">Bay B</option>
              <option value="C">Bay C</option>
              <option value="D">Bay D</option>
              <option value="E">Bay E</option>
            </select>
          </div>
          <div class="col-md-4">
            <select class="form-select form-select-sm altura-filter">
              <option value="">Todas as Alturas</option>
              <option value="1">Altura 1</option>
              <option value="2">Altura 2</option>
              <option value="3">Altura 3</option>
              <option value="4">Altura 4</option>
              <option value="5">Altura 5</option>
            </select>
          </div>
          <div class="col-md-4">
            <select class="form-select form-select-sm container-size-filter">
              <option value="">Todos os Tamanhos</option>
              <option value="20">20ft (Baias Ímpares)</option>
              <option value="40">40ft (Baias Pares)</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * HTML do toggle de visualização
   */
  getViewToggleHTML() {
    return `
      <div class="view-toggle">
        <div class="btn-group btn-group-sm" role="group">
          <input type="radio" class="btn-check" name="view-toggle" id="view-cards" checked>
          <label class="btn btn-outline-primary" for="view-cards">
            <i class="fas fa-th-large me-1"></i>Cards
          </label>
          
          <input type="radio" class="btn-check" name="view-toggle" id="view-list">
          <label class="btn btn-outline-primary" for="view-list">
            <i class="fas fa-list me-1"></i>Lista
          </label>
          
          <input type="radio" class="btn-check" name="view-toggle" id="view-grid">
          <label class="btn btn-outline-primary" for="view-grid">
            <i class="fas fa-th me-1"></i>Grid
          </label>
        </div>
      </div>
    `;
  }
  
  /**
   * HTML das estatísticas
   */
  getStatsHTML() {
    return `
      <div class="position-stats-container">
        <div class="alert alert-info small mb-2">
          <div class="d-flex align-items-center">
            <i class="fas fa-info-circle me-2"></i>
            <span class="stats-text">Carregando estatísticas...</span>
            <button type="button" class="btn btn-link btn-sm ms-auto p-0 stats-details-btn">
              <i class="fas fa-chart-bar"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Carrega posições
   */
  async loadPositions(positions) {
    this.positions = this.parsePositions(positions);
    
    // Ordenar posições globalmente por bay, posição e altura
    this.positions.sort((a, b) => {
      // Primeiro por bay (A, B, C, D, E)
      if (a.bay !== b.bay) {
        return a.bay.localeCompare(b.bay);
      }
      
      // Depois por posição numérica (1, 2, 3, ..., 20)
      if (a.posicao !== b.posicao) {
        return a.posicao - b.posicao;
      }
      
      // Por último por altura (1, 2, 3, 4, 5)
      return a.altura - b.altura;
    });
    
    this.filteredPositions = [...this.positions];
    
    this.updateStats();
    this.renderPositions();
    this.hideLoading();
    
    console.log(`✅ ${this.positions.length} posições carregadas e ordenadas`);
  }
  
  /**
   * Converte posições para formato interno
   */
  parsePositions(positions) {
    return positions.map(pos => {
      const match = pos.match(/^([A-E])(\d{2})-(\d+)$/);
      if (match) {
        const [, bay, posicao, altura] = match;
        return {
          id: pos,
          bay,
          posicao: parseInt(posicao),
          altura: parseInt(altura),
          label: `${bay}${posicao}-${altura}`,
          description: `Bay ${bay}, Posição ${posicao}, Altura ${altura}`,
          isOdd: parseInt(posicao) % 2 !== 0,
          isEven: parseInt(posicao) % 2 === 0,
          containerSize: parseInt(posicao) % 2 !== 0 ? 20 : 40
        };
      }
      return null;
    }).filter(Boolean);
  }
  
  /**
   * Renderiza posições baseado na visualização atual
   */
  renderPositions() {
    const container = this.positionsContainer;
    
    switch (this.currentView) {
      case 'cards':
        container.innerHTML = this.renderCardsView();
        break;
      case 'list':
        container.innerHTML = this.renderListView();
        break;
      case 'grid':
        container.innerHTML = this.renderGridView();
        break;
    }
    
    this.bindPositionEvents();
  }
  
  /**
   * Renderiza visualização em cards
   */
  renderCardsView() {
    const groupedByBay = this.groupPositionsByBay();
    
    let html = '<div class="positions-cards-view">';
    
    Object.keys(groupedByBay).forEach(bay => {
      const positions = groupedByBay[bay];
      const bayStats = this.getBayStats(positions);
      
      html += `
        <div class="bay-card" data-bay="${bay}">
          <div class="bay-header">
            <h6 class="bay-title">
              <i class="fas fa-layer-group me-2"></i>
              Bay ${bay}
            </h6>
            <div class="bay-stats">
              <span class="badge bg-primary">${positions.length} posições</span>
              <span class="badge bg-secondary">Alt. 1-${bayStats.maxAltura}</span>
            </div>
          </div>
          
          <div class="bay-positions">
            ${this.renderBayPositions(positions)}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    if (this.filteredPositions.length === 0) {
      html = this.getEmptyStateHTML();
    }
    
    return html;
  }
  
  /**
   * Renderiza posições de uma bay
   */
  renderBayPositions(positions) {
    return positions.map(pos => `
      <div class="position-card ${this.isSelected(pos.id) ? 'selected' : ''}" 
           data-position="${pos.id}"
           data-bay="${pos.bay}"
           data-altura="${pos.altura}">
        <div class="position-info">
          <div class="position-label">${pos.label}</div>
          <div class="position-details">
            <small class="text-muted">
              <i class="fas fa-arrows-alt-v me-1"></i>Altura ${pos.altura}
              <span class="ms-2">
                <i class="fas fa-cube me-1"></i>${pos.containerSize}ft
              </span>
            </small>
          </div>
        </div>
        <div class="position-actions">
          <button type="button" class="btn btn-sm btn-outline-primary select-position">
            <i class="fas fa-check"></i>
          </button>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Renderiza visualização em lista
   */
  renderListView() {
    if (this.filteredPositions.length === 0) {
      return this.getEmptyStateHTML();
    }
    
    let html = '<div class="positions-list-view">';
    
    this.filteredPositions.forEach(pos => {
      html += `
        <div class="position-list-item ${this.isSelected(pos.id) ? 'selected' : ''}" 
             data-position="${pos.id}">
          <div class="position-info">
            <div class="position-label">${pos.label}</div>
            <div class="position-description">${pos.description}</div>
          </div>
          <div class="position-meta">
            <span class="badge bg-${this.getAlturaColor(pos.altura)}">Alt. ${pos.altura}</span>
            <span class="badge bg-secondary">${pos.containerSize}ft</span>
          </div>
          <div class="position-actions">
            <button type="button" class="btn btn-sm btn-outline-primary select-position">
              <i class="fas fa-check"></i>
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Renderiza visualização em grid
   */
  renderGridView() {
    if (this.filteredPositions.length === 0) {
      return this.getEmptyStateHTML();
    }
    
    let html = '<div class="positions-grid-view">';
    
    this.filteredPositions.forEach(pos => {
      html += `
        <div class="position-grid-item ${this.isSelected(pos.id) ? 'selected' : ''}" 
             data-position="${pos.id}"
             title="${pos.description}">
          <div class="position-grid-content">
            <div class="position-label">${pos.label}</div>
            <div class="position-badges">
              <span class="badge bg-${this.getAlturaColor(pos.altura)}">${pos.altura}</span>
              <span class="badge bg-secondary">${pos.containerSize}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * HTML para estado vazio
   */
  getEmptyStateHTML() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-search fa-3x text-muted"></i>
        </div>
        <h6 class="empty-state-title">Nenhuma posição encontrada</h6>
        <p class="empty-state-text text-muted">
          Tente ajustar os filtros ou termo de busca
        </p>
        <button type="button" class="btn btn-outline-primary btn-sm clear-filters">
          <i class="fas fa-filter me-1"></i>Limpar Filtros
        </button>
      </div>
    `;
  }
  
  /**
   * Agrupa posições por bay
   */
  groupPositionsByBay() {
    const grouped = {};
    
    this.filteredPositions.forEach(pos => {
      if (!grouped[pos.bay]) {
        grouped[pos.bay] = [];
      }
      grouped[pos.bay].push(pos);
    });
    
    // Ordenar posições dentro de cada bay
    Object.keys(grouped).forEach(bay => {
      grouped[bay].sort((a, b) => {
        if (a.posicao !== b.posicao) {
          return a.posicao - b.posicao;
        }
        return a.altura - b.altura;
      });
    });
    
    return grouped;
  }
  
  /**
   * Obtém estatísticas de uma bay
   */
  getBayStats(positions) {
    return {
      total: positions.length,
      maxAltura: Math.max(...positions.map(p => p.altura)),
      minAltura: Math.min(...positions.map(p => p.altura)),
      containers20ft: positions.filter(p => p.containerSize === 20).length,
      containers40ft: positions.filter(p => p.containerSize === 40).length
    };
  }
  
  /**
   * Atualiza estatísticas
   */
  updateStats() {
    if (!this.options.showStats) return;
    
    const total = this.filteredPositions.length;
    const totalOriginal = this.positions.length;
    const bays = [...new Set(this.filteredPositions.map(p => p.bay))].length;
    const selected = this.selectedPositions.length;
    
    const statsText = this.container.querySelector('.stats-text');
    if (statsText) {
      let text = `${total} posições`;
      if (total !== totalOriginal) {
        text += ` de ${totalOriginal}`;
      }
      text += ` em ${bays} bays`;
      if (selected > 0) {
        text += ` • ${selected} selecionadas`;
      }
      
      statsText.textContent = text;
    }
    
    // Atualizar contador de selecionadas
    const selectedCount = this.container.querySelector('.selected-count .badge');
    if (selectedCount) {
      selectedCount.textContent = `${selected} selecionadas`;
    }
  }
  
  /**
   * Aplica filtros
   */
  applyFilters() {
    this.filteredPositions = this.positions.filter(pos => {
      // Filtro por bay
      if (this.filters.bay && pos.bay !== this.filters.bay) {
        return false;
      }
      
      // Filtro por altura
      if (this.filters.altura && pos.altura !== parseInt(this.filters.altura)) {
        return false;
      }
      
      // Filtro por busca
      if (this.filters.search) {
        const searchTerm = this.filters.search.toLowerCase();
        const searchableText = `${pos.bay}${pos.posicao.toString().padStart(2, '0')}-${pos.altura} ${pos.description}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Manter ordenação após filtros
    this.filteredPositions.sort((a, b) => {
      // Primeiro por bay (A, B, C, D, E)
      if (a.bay !== b.bay) {
        return a.bay.localeCompare(b.bay);
      }
      
      // Depois por posição numérica (1, 2, 3, ..., 20)
      if (a.posicao !== b.posicao) {
        return a.posicao - b.posicao;
      }
      
      // Por último por altura (1, 2, 3, 4, 5)
      return a.altura - b.altura;
    });
    
    this.updateStats();
    this.renderPositions();
  }
  
  /**
   * Seleciona/deseleciona posição
   */
  togglePosition(positionId) {
    const index = this.selectedPositions.indexOf(positionId);
    
    if (index === -1) {
      if (this.options.allowMultiSelect) {
        this.selectedPositions.push(positionId);
      } else {
        this.selectedPositions = [positionId];
      }
    } else {
      this.selectedPositions.splice(index, 1);
    }
    
    this.updateSelectElement();
    this.updateStats();
    this.renderPositions();
    
    // Disparar evento
    this.dispatchSelectionEvent();
  }
  
  /**
   * Verifica se posição está selecionada
   */
  isSelected(positionId) {
    return this.selectedPositions.includes(positionId);
  }
  
  /**
   * Atualiza select element original
   */
  updateSelectElement() {
    if (this.options.allowMultiSelect) {
      // Para multi-select, criar options para cada seleção
      this.selectElement.innerHTML = '';
      this.selectedPositions.forEach(posId => {
        const option = document.createElement('option');
        option.value = posId;
        option.selected = true;
        option.textContent = posId;
        this.selectElement.appendChild(option);
      });
    } else {
      // Para single select
      this.selectElement.value = this.selectedPositions[0] || '';
    }
    
    // Disparar evento change
    this.selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  /**
   * Dispara evento de seleção customizado
   */
  dispatchSelectionEvent() {
    const event = new CustomEvent('positionSelectionChanged', {
      detail: {
        selected: this.selectedPositions,
        positions: this.selectedPositions.map(id => 
          this.positions.find(p => p.id === id)
        ).filter(Boolean)
      }
    });
    
    this.selectElement.dispatchEvent(event);
  }
  
  /**
   * Limpa seleção
   */
  clearSelection() {
    this.selectedPositions = [];
    this.updateSelectElement();
    this.updateStats();
    this.renderPositions();
    this.dispatchSelectionEvent();
  }
  
  /**
   * Limpa filtros
   */
  clearFilters() {
    this.filters = { bay: '', altura: '', search: '' };
    
    // Resetar inputs
    if (this.searchInput) this.searchInput.value = '';
    
    const bayFilter = this.container.querySelector('.bay-filter');
    const alturaFilter = this.container.querySelector('.altura-filter');
    const containerSizeFilter = this.container.querySelector('.container-size-filter');
    
    if (bayFilter) bayFilter.value = '';
    if (alturaFilter) alturaFilter.value = '';
    if (containerSizeFilter) containerSizeFilter.value = '';
    
    this.applyFilters();
  }
  
  /**
   * Obtém cor para altura
   */
  getAlturaColor(altura) {
    const colors = {
      1: 'success',
      2: 'primary', 
      3: 'warning',
      4: 'danger',
      5: 'dark'
    };
    return colors[altura] || 'secondary';
  }
  
  /**
   * Oculta loading
   */
  hideLoading() {
    const loading = this.container.querySelector('.loading-state');
    if (loading) {
      loading.style.display = 'none';
    }
  }
  
  /**
   * Vincula eventos
   */
  bindEvents() {
    // Busca
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }
    
    // Clear search
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.clear-search')) {
        this.searchInput.value = '';
        this.filters.search = '';
        this.applyFilters();
      }
    });
    
    // Filtros
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('bay-filter')) {
        this.filters.bay = e.target.value;
        this.applyFilters();
      }
      
      if (e.target.classList.contains('altura-filter')) {
        this.filters.altura = e.target.value;
        this.applyFilters();
      }
    });
    
    // Toggle de visualização
    this.container.addEventListener('change', (e) => {
      if (e.target.name === 'view-toggle') {
        this.currentView = e.target.id.replace('view-', '');
        this.renderPositions();
      }
    });
    
    // Limpar seleção
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.clear-selection')) {
        this.clearSelection();
      }
    });
    
    // Limpar filtros
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.clear-filters')) {
        this.clearFilters();
      }
    });
  }
  
  /**
   * Vincula eventos das posições
   */
  bindPositionEvents() {
    // Seleção de posições
    this.container.addEventListener('click', (e) => {
      const positionElement = e.target.closest('[data-position]');
      if (positionElement) {
        const positionId = positionElement.dataset.position;
        this.togglePosition(positionId);
      }
    });
  }
  
  /**
   * Destrói o componente
   */
  destroy() {
    if (this.container) {
      this.container.remove();
    }
    this.selectElement.style.display = 'block';
  }
}

// Função global para compatibilidade
window.PositionSelectorImproved = PositionSelectorImproved;

// Função helper para inicializar
window.initImprovedPositionSelector = function(selectElement, positions, options = {}) {
  const selector = new PositionSelectorImproved(selectElement, options);
  if (positions && positions.length > 0) {
    selector.loadPositions(positions);
  }
  return selector;
};

console.log('✅ Position Selector Improved carregado');
