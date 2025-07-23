/**
 * ========================================
 * SELETOR DE GRID MELHORADO
 * Interface intuitiva e amigável para operadores
 * ========================================
 */

class GridSelectorImproved {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showSearch: true,
      showFilters: true,
      showStats: true,
      containerSize: 20,
      onPositionSelect: null,
      selectedPosition: null,
      ...options
    };
    
    this.positions = [];
    this.filteredPositions = [];
    this.selectedPosition = this.options.selectedPosition;
    this.filters = {
      bay: '',
      search: '',
      altura: ''
    };
    
    this.init();
  }
  
  init() {
    this.createInterface();
    this.bindEvents();
    console.log('✅ Grid Selector Improved inicializado');
  }
  
  createInterface() {
    this.container.innerHTML = `
      <div class="grid-selector-improved">
        ${this.createHeader()}
        ${this.createSearchAndFilters()}
        ${this.createGridContainer()}
        ${this.createFooter()}
      </div>
    `;
    
    this.bindElements();
  }
  
  createHeader() {
    if (!this.options.showStats) return '';
    
    return `
      <div class="grid-header">
        <div class="grid-title">
          <i class="fas fa-th-large me-2"></i>
          <span>Selecionar Posição no Pátio</span>
          ${this.options.containerSize ? `<span class="badge bg-info ms-2">${this.options.containerSize}ft</span>` : ''}
        </div>
        <div class="grid-stats">
          <span class="total-count">0 posições disponíveis</span>
        </div>
      </div>
    `;
  }
  
  createSearchAndFilters() {
    let html = '';
    
    if (this.options.showSearch || this.options.showFilters) {
      html += '<div class="grid-controls">';
      
      if (this.options.showSearch) {
        html += `
          <div class="search-container">
            <div class="input-group">
              <span class="input-group-text">
                <i class="fas fa-search"></i>
              </span>
              <input type="text" 
                     class="form-control search-input" 
                     placeholder="Buscar posição (ex: A01, B05-2)..."
                     autocomplete="off">
              <button class="btn btn-outline-secondary clear-search" type="button">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `;
      }
      
      if (this.options.showFilters) {
        html += `
          <div class="filters-container">
            <div class="row g-2">
              <div class="col-md-6">
                <select class="form-select bay-filter">
                  <option value="">Todas as Bays</option>
                  <option value="A">Bay A</option>
                  <option value="B">Bay B</option>
                  <option value="C">Bay C</option>
                  <option value="D">Bay D</option>
                  <option value="E">Bay E</option>
                </select>
              </div>
              <div class="col-md-6">
                <select class="form-select altura-filter">
                  <option value="">Todas as Alturas</option>
                  <option value="1">Altura 1</option>
                  <option value="2">Altura 2</option>
                  <option value="3">Altura 3</option>
                  <option value="4">Altura 4</option>
                  <option value="5">Altura 5</option>
                </select>
              </div>
            </div>
          </div>
        `;
      }
      
      html += '</div>';
    }
    
    return html;
  }
  
  createGridContainer() {
    return `
      <div class="grid-positions-container">
        <div class="loading-state">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
          <p class="mt-2 text-muted">Carregando posições...</p>
        </div>
      </div>
    `;
  }
  
  createFooter() {
    return `
      <div class="grid-footer">
        <div class="selected-position-info">
          <span class="selected-label">Posição selecionada:</span>
          <span class="selected-value">Nenhuma</span>
        </div>
        <div class="grid-actions">
          <button type="button" class="btn btn-outline-secondary btn-sm clear-selection">
            <i class="fas fa-times me-1"></i>Limpar
          </button>
        </div>
      </div>
    `;
  }
  
  bindElements() {
    this.searchInput = this.container.querySelector('.search-input');
    this.bayFilter = this.container.querySelector('.bay-filter');
    this.alturaFilter = this.container.querySelector('.altura-filter');
    this.gridContainer = this.container.querySelector('.grid-positions-container');
    this.totalCount = this.container.querySelector('.total-count');
    this.selectedValue = this.container.querySelector('.selected-value');
  }
  
  bindEvents() {
    // Busca
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }
    
    // Filtros
    if (this.bayFilter) {
      this.bayFilter.addEventListener('change', (e) => {
        this.filters.bay = e.target.value;
        this.applyFilters();
      });
    }
    
    if (this.alturaFilter) {
      this.alturaFilter.addEventListener('change', (e) => {
        this.filters.altura = e.target.value;
        this.applyFilters();
      });
    }
    
    // Limpar busca
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.clear-search')) {
        this.searchInput.value = '';
        this.filters.search = '';
        this.applyFilters();
      }
      
      if (e.target.closest('.clear-selection')) {
        this.clearSelection();
      }
    });
  }
  
  loadPositions(positions) {
    this.positions = this.parsePositions(positions);
    this.filteredPositions = [...this.positions];
    
    this.applyFilters();
    this.hideLoading();
    
    console.log(`✅ ${this.positions.length} posições carregadas no grid melhorado`);
  }
  
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
          containerSize: parseInt(posicao) % 2 !== 0 ? 20 : 40
        };
      }
      return null;
    }).filter(Boolean).sort((a, b) => {
      if (a.bay !== b.bay) return a.bay.localeCompare(b.bay);
      if (a.posicao !== b.posicao) return a.posicao - b.posicao;
      return a.altura - b.altura;
    });
  }
  
  applyFilters() {
    this.filteredPositions = this.positions.filter(pos => {
      if (this.filters.bay && pos.bay !== this.filters.bay) return false;
      if (this.filters.altura && pos.altura !== parseInt(this.filters.altura)) return false;
      
      if (this.filters.search) {
        const searchTerm = this.filters.search.toLowerCase();
        const searchableText = `${pos.label} ${pos.description}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    });
    
    this.updateStats();
    this.renderGrid();
  }
  
  renderGrid() {
    if (this.filteredPositions.length === 0) {
      this.gridContainer.innerHTML = this.createEmptyState();
      return;
    }
    
    // Agrupar por bay
    const groupedByBay = this.groupByBay(this.filteredPositions);
    
    let html = '<div class="improved-grid">';
    
    Object.keys(groupedByBay).forEach(bay => {
      const positions = groupedByBay[bay];
      html += this.createBaySection(bay, positions);
    });
    
    html += '</div>';
    
    this.gridContainer.innerHTML = html;
    this.bindPositionEvents();
  }
  
  createBaySection(bay, positions) {
    const bayColors = {
      'A': '#e91e63',
      'B': '#2196f3', 
      'C': '#4caf50',
      'D': '#ff9800',
      'E': '#9c27b0'
    };
    
    let html = `
      <div class="bay-section" data-bay="${bay}">
        <div class="bay-section-header" style="background-color: ${bayColors[bay]}">
          <h6 class="bay-section-title">
            <i class="fas fa-layer-group me-2"></i>
            Bay ${bay}
          </h6>
          <span class="bay-section-count">${positions.length} posições</span>
        </div>
        <div class="bay-section-content">
    `;
    
    // Agrupar por posição
    const groupedByPosition = this.groupByPosition(positions);
    
    Object.keys(groupedByPosition).forEach(posicao => {
      const alturas = groupedByPosition[posicao];
      html += this.createPositionGroup(bay, posicao, alturas);
    });
    
    html += '</div></div>';
    
    return html;
  }
  
  createPositionGroup(bay, posicao, alturas) {
    let html = `
      <div class="position-group">
        <div class="position-group-header">
          <span class="position-number">${bay}${posicao.padStart(2, '0')}</span>
          <span class="position-count">${alturas.length} altura${alturas.length > 1 ? 's' : ''}</span>
        </div>
        <div class="position-heights">
    `;
    
    alturas.forEach(pos => {
      const isSelected = this.selectedPosition === pos.id;
      const alturaColors = {
        1: '#4caf50',
        2: '#2196f3',
        3: '#ff9800', 
        4: '#f44336',
        5: '#9c27b0'
      };
      
      html += `
        <button type="button" 
                class="height-btn ${isSelected ? 'selected' : ''}"
                data-position="${pos.id}"
                data-bay="${pos.bay}"
                data-posicao="${pos.posicao}"
                data-altura="${pos.altura}"
                style="border-left-color: ${alturaColors[pos.altura]}">
          <div class="height-btn-content">
            <span class="height-number">${pos.altura}</span>
            <span class="height-label">Alt ${pos.altura}</span>
          </div>
          <div class="height-btn-info">
            <small>${pos.label}</small>
          </div>
        </button>
      `;
    });
    
    html += '</div></div>';
    
    return html;
  }
  
  createEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-search fa-3x text-muted"></i>
        </div>
        <h6 class="empty-state-title">Nenhuma posição encontrada</h6>
        <p class="empty-state-text">
          Tente ajustar os filtros ou termo de busca
        </p>
        <button type="button" class="btn btn-outline-primary btn-sm clear-all-filters">
          <i class="fas fa-filter me-1"></i>Limpar Filtros
        </button>
      </div>
    `;
  }
  
  groupByBay(positions) {
    const grouped = {};
    positions.forEach(pos => {
      if (!grouped[pos.bay]) grouped[pos.bay] = [];
      grouped[pos.bay].push(pos);
    });
    return grouped;
  }
  
  groupByPosition(positions) {
    const grouped = {};
    positions.forEach(pos => {
      const key = pos.posicao.toString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(pos);
    });
    
    // Ordenar por posição numérica
    const sortedKeys = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b));
    const sortedGrouped = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key].sort((a, b) => a.altura - b.altura);
    });
    
    return sortedGrouped;
  }
  
  bindPositionEvents() {
    this.container.addEventListener('click', (e) => {
      const heightBtn = e.target.closest('.height-btn');
      if (heightBtn) {
        const positionId = heightBtn.dataset.position;
        this.selectPosition(positionId);
      }
      
      if (e.target.closest('.clear-all-filters')) {
        this.clearAllFilters();
      }
    });
  }
  
  selectPosition(positionId) {
    // Remover seleção anterior
    this.container.querySelectorAll('.height-btn.selected').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    // Selecionar nova posição
    const button = this.container.querySelector(`[data-position="${positionId}"]`);
    if (button) {
      button.classList.add('selected');
      this.selectedPosition = positionId;
      
      // Atualizar footer
      if (this.selectedValue) {
        this.selectedValue.textContent = positionId;
      }
      
      // Callback
      if (this.options.onPositionSelect) {
        const position = this.positions.find(p => p.id === positionId);
        this.options.onPositionSelect(positionId, position);
      }
      
      console.log(`🎯 Posição selecionada no grid: ${positionId}`);
    }
  }
  
  clearSelection() {
    this.container.querySelectorAll('.height-btn.selected').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    this.selectedPosition = null;
    
    if (this.selectedValue) {
      this.selectedValue.textContent = 'Nenhuma';
    }
    
    if (this.options.onPositionSelect) {
      this.options.onPositionSelect(null, null);
    }
  }
  
  clearAllFilters() {
    this.filters = { bay: '', search: '', altura: '' };
    
    if (this.searchInput) this.searchInput.value = '';
    if (this.bayFilter) this.bayFilter.value = '';
    if (this.alturaFilter) this.alturaFilter.value = '';
    
    this.applyFilters();
  }
  
  updateStats() {
    if (this.totalCount) {
      const total = this.filteredPositions.length;
      const originalTotal = this.positions.length;
      
      let text = `${total} posições disponíveis`;
      if (total !== originalTotal) {
        text += ` de ${originalTotal}`;
      }
      
      this.totalCount.textContent = text;
    }
  }
  
  hideLoading() {
    const loading = this.container.querySelector('.loading-state');
    if (loading) {
      loading.style.display = 'none';
    }
  }
  
  getSelectedPosition() {
    return this.selectedPosition;
  }
  
  setSelectedPosition(positionId) {
    this.selectPosition(positionId);
  }
  
  destroy() {
    this.container.innerHTML = '';
  }
}

// Exportar para uso global
window.GridSelectorImproved = GridSelectorImproved;

console.log('✅ Grid Selector Improved carregado');
