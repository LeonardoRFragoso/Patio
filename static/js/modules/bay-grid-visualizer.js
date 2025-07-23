// ========================================
// VISUALIZADOR DE GRID DE BAYS
// Mostra posições lado a lado por bay para seleção visual
// ========================================

/**
 * Configuração do pátio Suzano
 */
const PATIO_CONFIG = {
  BAYS: ['A', 'B', 'C', 'D', 'E'],
  POSICOES_POR_BAY: 20, // 01 a 20
  ALTURAS_MAXIMAS: {
    'A': 2,
    'B': 3,
    'C': 4,
    'D': 5,
    'E': 5
  },
  CORES_ALTURA: {
    1: '#4caf50', // Verde
    2: '#2196f3', // Azul
    3: '#ff9800', // Laranja
    4: '#f44336', // Vermelho
    5: '#9c27b0'  // Roxo
  }
};

/**
 * Cria visualizador de grid de bays
 * @param {Array} posicoes - Lista de posições disponíveis
 * @param {Object} options - Opções de configuração
 * @returns {HTMLElement} Elemento do grid
 */
export function criarBayGridVisualizer(posicoes, options = {}) {
  const {
    onPositionSelect = () => {},
    selectedPosition = null,
    showStats = true,
    containerSize = null
  } = options;

  // Organizar posições por estrutura hierárquica
  const estruturaOrganizada = organizarPosicoesPorBay(posicoes);
  
  // Container principal
  const gridContainer = document.createElement('div');
  gridContainer.className = 'bay-grid-container';
  
  // Header com estatísticas se solicitado
  if (showStats) {
    const statsHeader = criarHeaderEstatisticas(posicoes, containerSize);
    gridContainer.appendChild(statsHeader);
  }
  
  // Grid de bays
  const bayGrid = document.createElement('div');
  bayGrid.className = 'bay-grid';
  
  PATIO_CONFIG.BAYS.forEach(bay => {
    const bayColumn = criarColunaBay(bay, estruturaOrganizada[bay] || {}, {
      onPositionSelect,
      selectedPosition
    });
    bayGrid.appendChild(bayColumn);
  });
  
  gridContainer.appendChild(bayGrid);
  
  // Footer com legenda
  const legend = criarLegendaAlturas();
  gridContainer.appendChild(legend);
  
  return gridContainer;
}

/**
 * Organiza posições por bay
 * @param {Array} posicoes - Lista de posições
 * @returns {Object} Estrutura organizada por bay
 */
function organizarPosicoesPorBay(posicoes) {
  const estrutura = {};
  
  // Inicializar estrutura vazia
  PATIO_CONFIG.BAYS.forEach(bay => {
    estrutura[bay] = {};
    for (let pos = 1; pos <= PATIO_CONFIG.POSICOES_POR_BAY; pos++) {
      const posicaoFormatada = pos.toString().padStart(2, '0');
      estrutura[bay][posicaoFormatada] = [];
    }
  });
  
  // Organizar posições recebidas
  posicoes.forEach(posicao => {
    const match = posicao.match(/^([A-E])(\d{2})-(\d+)$/);
    if (match) {
      const [, bay, pos, altura] = match;
      if (estrutura[bay] && estrutura[bay][pos]) {
        estrutura[bay][pos].push({
          codigo: posicao,
          altura: parseInt(altura),
          descricao: `${bay}${pos}-${altura}`
        });
      }
    }
  });
  
  // Ordenar alturas dentro de cada posição
  Object.keys(estrutura).forEach(bay => {
    Object.keys(estrutura[bay]).forEach(pos => {
      estrutura[bay][pos].sort((a, b) => a.altura - b.altura);
    });
  });
  
  return estrutura;
}

/**
 * Cria header com estatísticas
 * @param {Array} posicoes - Lista de posições
 * @param {number} containerSize - Tamanho do container
 * @returns {HTMLElement} Header element
 */
function criarHeaderEstatisticas(posicoes, containerSize) {
  const header = document.createElement('div');
  header.className = 'bay-grid-header';
  
  const title = document.createElement('h6');
  title.className = 'bay-grid-title';
  title.innerHTML = `
    <i class="fas fa-th-large me-2"></i>
    Posições Disponíveis por Bay
    ${containerSize ? `<span class="badge bg-info ms-2">${containerSize} TEU</span>` : ''}
  `;
  
  const stats = document.createElement('div');
  stats.className = 'bay-grid-stats';
  stats.innerHTML = `
    <span class="total-positions">
      <i class="fas fa-map-marker-alt me-1"></i>
      ${posicoes.length} posições disponíveis
    </span>
  `;
  
  header.appendChild(title);
  header.appendChild(stats);
  
  return header;
}

/**
 * Cria coluna de uma bay
 * @param {string} bay - Nome da bay (A-E)
 * @param {Object} posicoesNaBay - Posições organizadas da bay
 * @param {Object} options - Opções
 * @returns {HTMLElement} Coluna da bay
 */
function criarColunaBay(bay, posicoesNaBay, options = {}) {
  const { onPositionSelect, selectedPosition } = options;
  
  // Contar posições disponíveis nesta bay
  const totalPosicoes = Object.values(posicoesNaBay)
    .flat()
    .filter(pos => pos.codigo).length;
  
  const bayColumn = document.createElement('div');
  bayColumn.className = 'bay-column';
  
  // Header da bay
  const bayHeader = document.createElement('div');
  bayHeader.className = 'bay-header';
  bayHeader.innerHTML = `
    <div class="bay-name">BAY ${bay}</div>
    <div class="bay-count">${totalPosicoes} posições</div>
  `;
  
  // Container de posições
  const positionsContainer = document.createElement('div');
  positionsContainer.className = 'bay-positions';
  
  // Criar posições (01-20)
  for (let pos = 1; pos <= PATIO_CONFIG.POSICOES_POR_BAY; pos++) {
    const posicaoFormatada = pos.toString().padStart(2, '0');
    const alturas = posicoesNaBay[posicaoFormatada] || [];
    
    if (alturas.length > 0) {
      const positionGroup = criarGrupoPosicao(bay, posicaoFormatada, alturas, {
        onPositionSelect,
        selectedPosition
      });
      positionsContainer.appendChild(positionGroup);
    }
  }
  
  // Se não há posições, mostrar mensagem
  if (totalPosicoes === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'bay-empty';
    emptyMessage.innerHTML = '<i class="fas fa-ban me-1"></i>Sem posições disponíveis';
    positionsContainer.appendChild(emptyMessage);
  }
  
  bayColumn.appendChild(bayHeader);
  bayColumn.appendChild(positionsContainer);
  
  return bayColumn;
}

/**
 * Cria grupo de posição (ex: A01 com suas alturas)
 * @param {string} bay - Bay (A-E)
 * @param {string} posicao - Posição (01-20)
 * @param {Array} alturas - Alturas disponíveis
 * @param {Object} options - Opções
 * @returns {HTMLElement} Grupo de posição
 */
function criarGrupoPosicao(bay, posicao, alturas, options = {}) {
  const { onPositionSelect, selectedPosition } = options;
  
  const positionGroup = document.createElement('div');
  positionGroup.className = 'position-group';
  
  // Label da posição
  const positionLabel = document.createElement('div');
  positionLabel.className = 'position-label';
  positionLabel.textContent = `${bay}${posicao}`;
  
  // Container de alturas
  const heightsContainer = document.createElement('div');
  heightsContainer.className = 'heights-container';
  
  alturas.forEach(posicaoInfo => {
    const heightButton = document.createElement('button');
    heightButton.type = 'button';
    heightButton.className = 'height-button';
    heightButton.dataset.position = posicaoInfo.codigo;
    heightButton.style.borderLeftColor = PATIO_CONFIG.CORES_ALTURA[posicaoInfo.altura];
    
    // Marcar como selecionado se necessário
    if (selectedPosition === posicaoInfo.codigo) {
      heightButton.classList.add('selected');
    }
    
    heightButton.innerHTML = `
      <span class="height-number">${posicaoInfo.altura}</span>
      <span class="height-label">Alt ${posicaoInfo.altura}</span>
    `;
    
    // Event listener para seleção
    heightButton.addEventListener('click', () => {
      // Remover seleção anterior
      document.querySelectorAll('.height-button.selected').forEach(btn => {
        btn.classList.remove('selected');
      });
      
      // Marcar como selecionado
      heightButton.classList.add('selected');
      
      // Callback de seleção
      onPositionSelect(posicaoInfo.codigo, posicaoInfo);
    });
    
    // Tooltip com informações detalhadas
    heightButton.title = `Posição: ${posicaoInfo.descricao}\nAltura: ${posicaoInfo.altura}\nClique para selecionar`;
    
    heightsContainer.appendChild(heightButton);
  });
  
  positionGroup.appendChild(positionLabel);
  positionGroup.appendChild(heightsContainer);
  
  return positionGroup;
}

/**
 * Cria legenda das cores das alturas
 * @returns {HTMLElement} Legenda
 */
function criarLegendaAlturas() {
  const legend = document.createElement('div');
  legend.className = 'bay-grid-legend';
  
  const legendTitle = document.createElement('div');
  legendTitle.className = 'legend-title';
  legendTitle.innerHTML = '<i class="fas fa-palette me-1"></i>Legenda de Alturas:';
  
  const legendItems = document.createElement('div');
  legendItems.className = 'legend-items';
  
  Object.entries(PATIO_CONFIG.CORES_ALTURA).forEach(([altura, cor]) => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background-color: ${cor}"></div>
      <span>Altura ${altura}</span>
    `;
    legendItems.appendChild(legendItem);
  });
  
  legend.appendChild(legendTitle);
  legend.appendChild(legendItems);
  
  return legend;
}

/**
 * Atualiza posições no grid existente
 * @param {HTMLElement} gridContainer - Container do grid
 * @param {Array} novasPosicoes - Novas posições
 * @param {Object} options - Opções
 */
export function atualizarBayGrid(gridContainer, novasPosicoes, options = {}) {
  // Encontrar o grid atual
  const bayGrid = gridContainer.querySelector('.bay-grid');
  if (!bayGrid) return;
  
  // Recriar o grid com as novas posições
  const novoGrid = criarBayGridVisualizer(novasPosicoes, options);
  
  // Substituir o conteúdo
  gridContainer.innerHTML = '';
  gridContainer.appendChild(novoGrid);
}

/**
 * Obtém posição selecionada do grid
 * @param {HTMLElement} gridContainer - Container do grid
 * @returns {string|null} Posição selecionada
 */
export function obterPosicaoSelecionada(gridContainer) {
  const selectedButton = gridContainer.querySelector('.height-button.selected');
  return selectedButton ? selectedButton.dataset.position : null;
}

/**
 * Define posição selecionada no grid
 * @param {HTMLElement} gridContainer - Container do grid
 * @param {string} posicao - Posição a selecionar
 */
export function definirPosicaoSelecionada(gridContainer, posicao) {
  // Remover seleção anterior
  gridContainer.querySelectorAll('.height-button.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Selecionar nova posição
  if (posicao) {
    const button = gridContainer.querySelector(`[data-position="${posicao}"]`);
    if (button) {
      button.classList.add('selected');
    }
  }
}

console.log('✅ Módulo Bay Grid Visualizer carregado');
