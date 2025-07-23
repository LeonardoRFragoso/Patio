/**
 * ========================================
 * LAYOUTS ALTERNATIVOS PARA O GRID
 * Diferentes opções de interface mais usuais para operadores
 * ========================================
 */

console.log('🎨 Carregando layouts alternativos para o grid...');

/**
 * LAYOUT 1: ESTILO TABELA SIMPLES
 * Similar a uma planilha - familiar para operadores
 */
function createTableStyleGrid(container, positions, options = {}) {
  console.log('📊 Criando grid estilo tabela...');
  
  // Organizar posições
  const positionsByBay = {};
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d+)-(\d+)$/);
    if (match) {
      const [, bay, position, height] = match;
      if (!positionsByBay[bay]) positionsByBay[bay] = {};
      if (!positionsByBay[bay][position]) positionsByBay[bay][position] = [];
      positionsByBay[bay][position].push({
        id: pos,
        bay, position: position.padStart(2, '0'), height: parseInt(height)
      });
    }
  });
  
  let html = `
    <div class="table-grid-container">
      <div class="grid-header">
        <h6><i class="fas fa-table"></i> Selecionar Posição - Estilo Tabela</h6>
        <input type="text" class="form-control form-control-sm" placeholder="Buscar..." style="width: 200px;">
      </div>
      
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead class="thead-dark">
            <tr>
              <th>Bay</th>
              <th>Posição</th>
              <th>Alturas Disponíveis</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  Object.keys(positionsByBay).sort().forEach(bay => {
    const sortedPositions = Object.keys(positionsByBay[bay]).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedPositions.forEach(position => {
      const heights = positionsByBay[bay][position].sort((a, b) => a.height - b.height);
      
      html += `
        <tr>
          <td><strong>${bay}</strong></td>
          <td>${bay}${position.padStart(2, '0')}</td>
          <td>
            <div class="height-buttons">
      `;
      
      heights.forEach(height => {
        html += `
          <button class="btn btn-sm btn-outline-primary height-btn-table" 
                  data-position="${height.id}" 
                  style="margin: 2px;">
            ${height.height}
          </button>
        `;
      });
      
      html += `
            </div>
          </td>
        </tr>
      `;
    });
  });
  
  html += `
          </tbody>
        </table>
      </div>
      
      <div class="selected-info">
        <span id="selectedTablePosition">Nenhuma posição selecionada</span>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  return addTableGridEvents(container, options);
}

/**
 * LAYOUT 2: ESTILO LISTA VERTICAL COM CARDS
 * Cards grandes e claros - fácil de navegar
 */
function createCardListGrid(container, positions, options = {}) {
  console.log('🃏 Criando grid estilo lista de cards...');
  
  // Organizar posições
  const positionsByBay = {};
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d+)-(\d+)$/);
    if (match) {
      const [, bay, position, height] = match;
      if (!positionsByBay[bay]) positionsByBay[bay] = {};
      if (!positionsByBay[bay][position]) positionsByBay[bay][position] = [];
      positionsByBay[bay][position].push({
        id: pos, bay, position: position.padStart(2, '0'), height: parseInt(height)
      });
    }
  });
  
  const bayColors = {
    'A': '#dc3545', 'B': '#007bff', 'C': '#28a745', 
    'D': '#fd7e14', 'E': '#6f42c1'
  };
  
  let html = `
    <div class="card-list-container">
      <div class="grid-header">
        <h6><i class="fas fa-list"></i> Selecionar Posição - Lista de Cards</h6>
        <input type="text" class="form-control form-control-sm" placeholder="Buscar posição..." style="width: 200px;">
      </div>
      
      <div class="cards-list">
  `;
  
  Object.keys(positionsByBay).sort().forEach(bay => {
    const sortedPositions = Object.keys(positionsByBay[bay]).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedPositions.forEach(position => {
      const heights = positionsByBay[bay][position].sort((a, b) => a.height - b.height);
      
      html += `
        <div class="position-card" data-bay="${bay}" data-position="${position}">
          <div class="card-header" style="background-color: ${bayColors[bay]}; color: white;">
            <strong>Bay ${bay} - Posição ${position.padStart(2, '0')}</strong>
          </div>
          <div class="card-body">
            <div class="heights-row">
      `;
      
      heights.forEach(height => {
        html += `
          <button class="btn btn-success height-btn-card" 
                  data-position="${height.id}"
                  title="Altura ${height.height}">
            <i class="fas fa-layer-group"></i><br>
            Altura ${height.height}
          </button>
        `;
      });
      
      html += `
            </div>
          </div>
        </div>
      `;
    });
  });
  
  html += `
      </div>
      
      <div class="selected-info">
        <div class="alert alert-info">
          <span id="selectedCardPosition">👆 Clique em uma altura para selecionar</span>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  return addCardListEvents(container, options);
}

/**
 * LAYOUT 3: ESTILO MATRIZ/PLANILHA
 * Layout de matriz - muito visual e intuitivo
 */
function createMatrixGrid(container, positions, options = {}) {
  console.log('🔢 Criando grid estilo matriz...');
  
  // Organizar em matriz
  const matrix = {};
  const allBays = ['A', 'B', 'C', 'D', 'E'];
  const maxPositions = 20;
  const maxHeights = 5;
  
  // Inicializar matriz
  allBays.forEach(bay => {
    matrix[bay] = {};
    for (let pos = 1; pos <= maxPositions; pos++) {
      matrix[bay][pos.toString().padStart(2, '0')] = {};
      for (let height = 1; height <= maxHeights; height++) {
        matrix[bay][pos.toString().padStart(2, '0')][height] = null;
      }
    }
  });
  
  // Preencher com posições disponíveis
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d+)-(\d+)$/);
    if (match) {
      const [, bay, position, height] = match;
      const posKey = position.padStart(2, '0');
      if (matrix[bay] && matrix[bay][posKey]) {
        matrix[bay][posKey][parseInt(height)] = pos;
      }
    }
  });
  
  let html = `
    <div class="matrix-grid-container">
      <div class="grid-header">
        <h6><i class="fas fa-th-large"></i> Matriz de Posições</h6>
        <div class="controls">
          <input type="text" class="form-control form-control-sm" placeholder="Buscar..." style="width: 150px; display: inline-block;">
          <select class="form-control form-control-sm ml-2" id="bayFilter" style="width: 100px; display: inline-block;">
            <option value="">Todas Bays</option>
            <option value="A">Bay A</option>
            <option value="B">Bay B</option>
            <option value="C">Bay C</option>
            <option value="D">Bay D</option>
            <option value="E">Bay E</option>
          </select>
        </div>
      </div>
      
      <div class="matrix-scroll">
        <table class="matrix-table">
          <thead>
            <tr>
              <th rowspan="2">Bay</th>
              <th rowspan="2">Pos</th>
              <th colspan="5">Alturas</th>
            </tr>
            <tr>
              <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  allBays.forEach(bay => {
    const positions = Object.keys(matrix[bay]).filter(pos => {
      return Object.values(matrix[bay][pos]).some(height => height !== null);
    });
    
    if (positions.length > 0) {
      positions.forEach((pos, index) => {
        html += `<tr data-bay="${bay}" data-position="${pos}">`;
        
        if (index === 0) {
          html += `<td rowspan="${positions.length}" class="bay-cell bay-${bay}">${bay}</td>`;
        }
        
        html += `<td class="position-cell">${pos}</td>`;
        
        for (let height = 1; height <= 5; height++) {
          const positionId = matrix[bay][pos][height];
          if (positionId) {
            html += `
              <td>
                <button class="matrix-btn available" 
                        data-position="${positionId}"
                        title="${positionId}">
                  ✓
                </button>
              </td>
            `;
          } else {
            html += `<td><span class="matrix-btn unavailable">-</span></td>`;
          }
        }
        
        html += `</tr>`;
      });
    }
  });
  
  html += `
          </tbody>
        </table>
      </div>
      
      <div class="selected-info">
        <div class="alert alert-success">
          <strong>Selecionado:</strong> <span id="selectedMatrixPosition">Nenhuma posição</span>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  return addMatrixEvents(container, options);
}

/**
 * LAYOUT 4: ESTILO MOBILE/TOUCH FRIENDLY
 * Botões grandes para toque - ideal para tablets
 */
function createTouchFriendlyGrid(container, positions, options = {}) {
  console.log('📱 Criando grid touch-friendly...');
  
  const positionsByBay = {};
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d+)-(\d+)$/);
    if (match) {
      const [, bay, position, height] = match;
      const key = `${bay}${position.padStart(2, '0')}`;
      if (!positionsByBay[key]) positionsByBay[key] = [];
      positionsByBay[key].push({ id: pos, bay, position, height: parseInt(height) });
    }
  });
  
  let html = `
    <div class="touch-grid-container">
      <div class="touch-header">
        <h5><i class="fas fa-hand-pointer"></i> Toque para Selecionar</h5>
        <div class="search-box">
          <input type="text" class="form-control" placeholder="🔍 Buscar posição..." style="font-size: 16px;">
        </div>
      </div>
      
      <div class="touch-positions">
  `;
  
  Object.keys(positionsByBay).sort().forEach(positionKey => {
    const heights = positionsByBay[positionKey].sort((a, b) => a.height - b.height);
    const bay = heights[0].bay;
    const position = heights[0].position;
    
    html += `
      <div class="touch-position-group">
        <div class="position-title">
          <span class="bay-badge bay-${bay}">${bay}</span>
          <span class="position-number">${position.padStart(2, '0')}</span>
        </div>
        <div class="touch-heights">
    `;
    
    heights.forEach(height => {
      html += `
        <button class="touch-height-btn" 
                data-position="${height.id}"
                data-bay="${bay}"
                data-pos="${position}"
                data-height="${height.height}">
          <div class="height-icon">📦</div>
          <div class="height-text">Altura ${height.height}</div>
          <div class="position-code">${height.id}</div>
        </button>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
      
      <div class="touch-footer">
        <div class="selected-display">
          <span id="selectedTouchPosition">Nenhuma seleção</span>
          <button class="btn btn-outline-danger btn-sm" id="clearTouch">Limpar</button>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  return addTouchEvents(container, options);
}

// Event handlers para cada layout
function addTableGridEvents(container, options) {
  let selected = null;
  
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('height-btn-table')) {
      container.querySelectorAll('.height-btn-table.selected').forEach(btn => 
        btn.classList.remove('selected', 'btn-primary'));
      
      e.target.classList.add('selected', 'btn-primary');
      e.target.classList.remove('btn-outline-primary');
      
      selected = e.target.dataset.position;
      container.querySelector('#selectedTablePosition').textContent = `Selecionado: ${selected}`;
      
      if (options.onPositionSelect) options.onPositionSelect(selected);
    }
  });
  
  return { getSelected: () => selected };
}

function addCardListEvents(container, options) {
  let selected = null;
  
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('height-btn-card')) {
      container.querySelectorAll('.height-btn-card.selected').forEach(btn => 
        btn.classList.remove('selected'));
      
      e.target.classList.add('selected');
      selected = e.target.dataset.position;
      container.querySelector('#selectedCardPosition').textContent = `✅ Selecionado: ${selected}`;
      
      if (options.onPositionSelect) options.onPositionSelect(selected);
    }
  });
  
  return { getSelected: () => selected };
}

function addMatrixEvents(container, options) {
  let selected = null;
  
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('matrix-btn') && e.target.classList.contains('available')) {
      container.querySelectorAll('.matrix-btn.selected').forEach(btn => 
        btn.classList.remove('selected'));
      
      e.target.classList.add('selected');
      selected = e.target.dataset.position;
      container.querySelector('#selectedMatrixPosition').textContent = selected;
      
      if (options.onPositionSelect) options.onPositionSelect(selected);
    }
  });
  
  return { getSelected: () => selected };
}

function addTouchEvents(container, options) {
  let selected = null;
  
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('touch-height-btn') || e.target.parentElement.classList.contains('touch-height-btn')) {
      const btn = e.target.classList.contains('touch-height-btn') ? e.target : e.target.parentElement;
      
      container.querySelectorAll('.touch-height-btn.selected').forEach(b => 
        b.classList.remove('selected'));
      
      btn.classList.add('selected');
      selected = btn.dataset.position;
      container.querySelector('#selectedTouchPosition').textContent = `📍 ${selected}`;
      
      if (options.onPositionSelect) options.onPositionSelect(selected);
    }
    
    if (e.target.id === 'clearTouch') {
      container.querySelectorAll('.touch-height-btn.selected').forEach(b => 
        b.classList.remove('selected'));
      selected = null;
      container.querySelector('#selectedTouchPosition').textContent = 'Nenhuma seleção';
      if (options.onPositionSelect) options.onPositionSelect(null);
    }
  });
  
  return { getSelected: () => selected };
}

// Expor layouts globalmente
window.ALTERNATIVE_GRID_LAYOUTS = {
  table: createTableStyleGrid,
  cards: createCardListGrid,
  matrix: createMatrixGrid,
  touch: createTouchFriendlyGrid
};

console.log('✅ Layouts alternativos carregados:', Object.keys(window.ALTERNATIVE_GRID_LAYOUTS));
