/**
 * ========================================
 * SUBSTITUIÇÃO DIRETA DO GRID - VERSÃO SIMPLIFICADA
 * Substitui imediatamente qualquer grid antigo pelo melhorado
 * ========================================
 */

console.log('🎯 SUBSTITUIÇÃO DIRETA DO GRID INICIADA');

// Função para criar o grid melhorado diretamente no HTML
function createImprovedGridDirectly(container, positions, options = {}) {
  console.log('🚀 Criando grid melhorado diretamente...', positions.length, 'posições');
  
  // Limpar container
  container.innerHTML = '';
  
  // Organizar posições por bay
  const positionsByBay = {};
  positions.forEach(pos => {
    const match = pos.match(/^([A-E])(\d+)-(\d+)$/);
    if (match) {
      const [, bay, position, height] = match;
      if (!positionsByBay[bay]) positionsByBay[bay] = {};
      if (!positionsByBay[bay][position]) positionsByBay[bay][position] = [];
      positionsByBay[bay][position].push({
        id: pos,
        bay,
        position: position.padStart(2, '0'),
        height: parseInt(height),
        label: `${bay}${position.padStart(2, '0')}-${height}`
      });
    }
  });
  
  // Cores por bay
  const bayColors = {
    'A': '#e91e63', 'B': '#2196f3', 'C': '#4caf50', 
    'D': '#ff9800', 'E': '#9c27b0'
  };
  
  // Cores por altura
  const heightColors = {
    1: '#4caf50', 2: '#2196f3', 3: '#ff9800', 
    4: '#f44336', 5: '#9c27b0'
  };
  
  // Criar HTML do grid
  let html = `
    <div class="improved-grid-header">
      <h5><i class="fas fa-th"></i> Posições Disponíveis por Bay</h5>
      <div class="badge badge-primary">${positions.length} posições</div>
    </div>
    
    <div class="improved-grid-search">
      <input type="text" class="form-control" placeholder="Buscar posição (ex: A01, B05-2)..." id="gridSearch">
    </div>
    
    <div class="improved-grid-content">
  `;
  
  // Criar seções por bay
  Object.keys(positionsByBay).sort().forEach(bay => {
    html += `
      <div class="bay-section" data-bay="${bay}">
        <div class="bay-header" style="background-color: ${bayColors[bay]}">
          <strong>BAY ${bay}</strong>
          <span class="badge badge-light">${Object.keys(positionsByBay[bay]).length} posições</span>
        </div>
        <div class="positions-grid">
    `;
    
    // Ordenar posições numericamente
    const sortedPositions = Object.keys(positionsByBay[bay]).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedPositions.forEach(position => {
      const heights = positionsByBay[bay][position].sort((a, b) => a.height - b.height);
      
      html += `
        <div class="position-group" data-position="${bay}${position}">
          <div class="position-label">${bay}${position.padStart(2, '0')}</div>
          <div class="heights-container">
      `;
      
      heights.forEach(height => {
        html += `
          <button class="height-btn" 
                  data-position="${height.id}"
                  data-bay="${bay}"
                  data-pos="${position}"
                  data-height="${height.height}"
                  style="border-color: ${heightColors[height.height]}">
            <div class="height-number">${height.height}</div>
            <div class="height-label">ALT ${height.height}</div>
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
      </div>
    `;
  });
  
  html += `
    </div>
    
    <div class="improved-grid-footer">
      <div class="selected-position">
        <span id="selectedPositionText">Nenhuma posição selecionada</span>
        <button class="btn btn-sm btn-outline-secondary" id="clearSelection">Limpar</button>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Adicionar estilos inline se necessário
  if (!document.getElementById('improvedGridStyles')) {
    const styles = document.createElement('style');
    styles.id = 'improvedGridStyles';
    styles.textContent = `
      .improved-grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 5px;
      }
      
      .improved-grid-search {
        margin-bottom: 15px;
      }
      
      .bay-section {
        margin-bottom: 20px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .bay-header {
        color: white;
        padding: 10px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .positions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        padding: 15px;
      }
      
      .position-group {
        text-align: center;
      }
      
      .position-label {
        font-weight: bold;
        margin-bottom: 8px;
        color: #495057;
      }
      
      .heights-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
      }
      
      .height-btn {
        width: 60px;
        height: 60px;
        border: 2px solid;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      
      .height-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      
      .height-btn.selected {
        background: #007bff;
        color: white;
        transform: scale(1.1);
      }
      
      .height-number {
        font-size: 18px;
        font-weight: bold;
      }
      
      .height-label {
        font-size: 10px;
      }
      
      .improved-grid-footer {
        margin-top: 15px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 5px;
      }
      
      .selected-position {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      @media (max-width: 768px) {
        .positions-grid {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        .height-btn {
          width: 50px;
          height: 50px;
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Adicionar funcionalidade
  let selectedPosition = null;
  const selectedText = container.querySelector('#selectedPositionText');
  const clearBtn = container.querySelector('#clearSelection');
  const searchInput = container.querySelector('#gridSearch');
  
  // Busca
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const buttons = container.querySelectorAll('.height-btn');
    
    buttons.forEach(btn => {
      const position = btn.dataset.position.toLowerCase();
      const visible = position.includes(query);
      btn.style.display = visible ? 'flex' : 'none';
    });
  });
  
  // Seleção de posição
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('height-btn')) {
      // Limpar seleção anterior
      container.querySelectorAll('.height-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
      });
      
      // Selecionar nova posição
      e.target.classList.add('selected');
      selectedPosition = e.target.dataset.position;
      selectedText.textContent = `Selecionado: ${selectedPosition}`;
      
      // Callback
      if (options.onPositionSelect) {
        options.onPositionSelect(selectedPosition, {
          bay: e.target.dataset.bay,
          position: e.target.dataset.pos,
          height: e.target.dataset.height
        });
      }
      
      console.log('🎯 Posição selecionada:', selectedPosition);
    }
  });
  
  // Limpar seleção
  clearBtn.addEventListener('click', () => {
    container.querySelectorAll('.height-btn.selected').forEach(btn => {
      btn.classList.remove('selected');
    });
    selectedPosition = null;
    selectedText.textContent = 'Nenhuma posição selecionada';
    
    if (options.onPositionSelect) {
      options.onPositionSelect(null, null);
    }
  });
  
  console.log('✅ Grid melhorado criado diretamente com sucesso');
  
  return {
    getSelectedPosition: () => selectedPosition,
    setSelectedPosition: (pos) => {
      const btn = container.querySelector(`[data-position="${pos}"]`);
      if (btn) {
        btn.click();
      }
    }
  };
}

// Substituir função do grid imediatamente
function replaceGridFunctions() {
  console.log('🔄 Substituindo funções do grid...');
  
  // Interceptar criarBayGridVisualizer
  if (typeof window.criarBayGridVisualizer === 'function') {
    window._originalCriarBayGridVisualizer = window.criarBayGridVisualizer;
  }
  
  window.criarBayGridVisualizer = function(posicoes, options = {}) {
    console.log('🎯 criarBayGridVisualizer interceptado:', posicoes.length, 'posições');
    
    // Criar container se não existir
    let container = document.querySelector('.bay-grid-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'bay-grid-container improved-grid-container';
      
      // Encontrar onde inserir
      const positionSelects = document.querySelectorAll('select[id*="posicao"]');
      if (positionSelects.length > 0) {
        const select = positionSelects[positionSelects.length - 1];
        select.parentNode.insertBefore(container, select.nextSibling);
        select.style.display = 'none';
      }
    }
    
    return createImprovedGridDirectly(container, posicoes, options);
  };
  
  console.log('✅ Funções do grid substituídas');
}

// Executar imediatamente
replaceGridFunctions();

// Também executar após delay para pegar grids criados posteriormente
setTimeout(replaceGridFunctions, 1000);
setTimeout(replaceGridFunctions, 3000);

console.log('✅ Substituição direta do grid carregada');
