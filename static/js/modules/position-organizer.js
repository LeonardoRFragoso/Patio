// ========================================
// MÓDULO ORGANIZADOR DE POSIÇÕES DO PÁTIO
// Organiza posições por bay, row e altura para melhor UX
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
  }
};

/**
 * Organiza posições em estrutura hierárquica por bay, posição e altura
 * @param {Array} posicoes - Lista de posições no formato A01-1
 * @returns {Object} Estrutura organizada
 */
export function organizarPosicoesPorHierarquia(posicoes) {
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
 * Cria opções organizadas para o select com grupos
 * @param {Object} estruturaOrganizada - Estrutura hierárquica das posições
 * @returns {Array} Array de opções para o select
 */
export function criarOpcoesOrganizadas(estruturaOrganizada) {
  const opcoes = [];
  
  Object.keys(estruturaOrganizada).forEach(bay => {
    // Verificar se há posições disponíveis nesta bay
    const posicoesDisponiveis = Object.values(estruturaOrganizada[bay])
      .flat()
      .filter(pos => pos.codigo);
    
    if (posicoesDisponiveis.length > 0) {
      // Adicionar header da bay
      opcoes.push({
        type: 'group',
        label: `BAY ${bay} (${posicoesDisponiveis.length} posições)`,
        disabled: true,
        value: `header-${bay}`
      });
      
      // Adicionar posições organizadas por número (ordenação numérica)
      Object.keys(estruturaOrganizada[bay])
        .filter(pos => estruturaOrganizada[bay][pos].length > 0)
        .sort((a, b) => parseInt(a) - parseInt(b)) // Ordenação numérica correta
        .forEach(pos => {
          const alturas = estruturaOrganizada[bay][pos];
          
          if (alturas.length === 1) {
            // Uma única altura disponível
            const posicao = alturas[0];
            opcoes.push({
              type: 'option',
              value: posicao.codigo,
              label: `  ${posicao.descricao}`,
              searchTerms: [bay, pos, posicao.altura.toString()]
            });
          } else {
            // Múltiplas alturas - agrupar por posição
            opcoes.push({
              type: 'subgroup',
              label: `  Posição ${bay}${pos}:`,
              disabled: true,
              value: `subheader-${bay}${pos}`
            });
            
            alturas.forEach(posicao => {
              opcoes.push({
                type: 'option',
                value: posicao.codigo,
                label: `    Altura ${posicao.altura} (${posicao.descricao})`,
                searchTerms: [bay, pos, posicao.altura.toString()]
              });
            });
          }
        });
    }
  });
  
  return opcoes;
}

/**
 * Aplica a organização ao select usando Choices.js
 * @param {HTMLSelectElement} selectElement - Elemento select
 * @param {Array} posicoes - Lista de posições
 * @param {Object} options - Opções adicionais
 * @returns {Choices} Instância do Choices.js
 */
export function aplicarOrganizacaoAoSelect(selectElement, posicoes, options = {}) {
  // Organizar posições
  const estruturaOrganizada = organizarPosicoesPorHierarquia(posicoes);
  const opcoesOrganizadas = criarOpcoesOrganizadas(estruturaOrganizada);
  
  // Limpar select
  selectElement.innerHTML = '<option value="">Selecione a posição</option>';
  
  // Criar grupos no select
  let currentOptGroup = null;
  
  opcoesOrganizadas.forEach(opcao => {
    if (opcao.type === 'group') {
      // Criar novo optgroup para bay
      currentOptGroup = document.createElement('optgroup');
      currentOptGroup.label = opcao.label;
      selectElement.appendChild(currentOptGroup);
    } else if (opcao.type === 'subgroup') {
      // Adicionar separador visual para subgrupo
      if (currentOptGroup) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = opcao.label;
        option.style.fontWeight = 'bold';
        option.style.fontStyle = 'italic';
        currentOptGroup.appendChild(option);
      }
    } else if (opcao.type === 'option') {
      // Adicionar opção real
      const option = document.createElement('option');
      option.value = opcao.value;
      option.textContent = opcao.label;
      
      if (currentOptGroup) {
        currentOptGroup.appendChild(option);
      } else {
        selectElement.appendChild(option);
      }
    }
  });
  
  // Configurar Choices.js com busca aprimorada
  const choicesConfig = {
    searchEnabled: true,
    shouldSort: false,
    placeholderValue: 'Selecione a posição ou digite para buscar...',
    itemSelectText: '',
    noResultsText: 'Nenhuma posição encontrada',
    loadingText: 'Carregando posições...',
    searchPlaceholderValue: 'Digite bay (A-E), posição (01-20) ou altura (1-5)...',
    searchFields: ['label', 'value'],
    fuseOptions: {
      threshold: 0.3,
      keys: ['label', 'value']
    },
    ...options
  };
  
  // Destruir instância anterior se existir
  if (selectElement._choices) {
    selectElement._choices.destroy();
  }
  
  // Criar nova instância
  const choices = new Choices(selectElement, choicesConfig);
  
  // Armazenar referência para destruição posterior
  selectElement._choices = choices;
  
  return choices;
}

/**
 * Cria estatísticas das posições organizadas
 * @param {Object} estruturaOrganizada - Estrutura hierárquica
 * @returns {Object} Estatísticas
 */
export function obterEstatisticasPosicoes(estruturaOrganizada) {
  const stats = {
    totalPosicoes: 0,
    porBay: {},
    porAltura: {},
    distribuicao: []
  };
  
  Object.keys(estruturaOrganizada).forEach(bay => {
    let countBay = 0;
    
    Object.keys(estruturaOrganizada[bay]).forEach(pos => {
      const alturas = estruturaOrganizada[bay][pos];
      countBay += alturas.length;
      
      alturas.forEach(posicao => {
        stats.totalPosicoes++;
        
        // Contar por altura
        const altura = posicao.altura;
        stats.porAltura[altura] = (stats.porAltura[altura] || 0) + 1;
      });
    });
    
    stats.porBay[bay] = countBay;
  });
  
  // Criar distribuição visual
  Object.keys(stats.porBay).forEach(bay => {
    if (stats.porBay[bay] > 0) {
      stats.distribuicao.push({
        bay,
        count: stats.porBay[bay],
        percentage: ((stats.porBay[bay] / stats.totalPosicoes) * 100).toFixed(1)
      });
    }
  });
  
  return stats;
}

/**
 * Cria tooltip informativo com estatísticas
 * @param {Object} stats - Estatísticas das posições
 * @returns {string} HTML do tooltip
 */
export function criarTooltipEstatisticas(stats) {
  const distribuicaoHtml = stats.distribuicao
    .map(item => `<li>Bay ${item.bay}: ${item.count} posições (${item.percentage}%)</li>`)
    .join('');
  
  const alturasHtml = Object.keys(stats.porAltura)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(altura => `<li>Altura ${altura}: ${stats.porAltura[altura]} posições</li>`)
    .join('');
  
  return `
    <div class="position-stats-tooltip">
      <h6><i class="fas fa-chart-bar me-1"></i>Posições Disponíveis</h6>
      <p><strong>Total: ${stats.totalPosicoes} posições</strong></p>
      
      <div class="row">
        <div class="col-6">
          <h6>Por Bay:</h6>
          <ul class="small mb-0">${distribuicaoHtml}</ul>
        </div>
        <div class="col-6">
          <h6>Por Altura:</h6>
          <ul class="small mb-0">${alturasHtml}</ul>
        </div>
      </div>
    </div>
  `;
}

/**
 * Função principal para aplicar organização completa
 * @param {HTMLSelectElement} selectElement - Elemento select
 * @param {Array} posicoes - Lista de posições
 * @param {Object} options - Opções adicionais
 * @returns {Object} Resultado com choices e estatísticas
 */
export function organizarComboboxPosicoes(selectElement, posicoes, options = {}) {
  console.log(`📊 Organizando ${posicoes.length} posições por hierarquia...`);
  
  const {
    showGridView = false,
    containerSize = null,
    onPositionSelect = null
  } = options;
  
  // Se solicitada visualização em grid, criar grid ao invés de combobox
  if (showGridView) {
    return criarVisualizacaoGrid(selectElement, posicoes, options);
  }
  
  // Aplicar organização tradicional no combobox
  const choices = aplicarOrganizacaoAoSelect(selectElement, posicoes, options);
  
  // Obter estatísticas
  const estruturaOrganizada = organizarPosicoesPorHierarquia(posicoes);
  const stats = obterEstatisticasPosicoes(estruturaOrganizada);
  
  // Adicionar controles de visualização
  adicionarControlesVisualizacao(selectElement, posicoes, options, stats);
  
  console.log(`✅ Organização aplicada: ${stats.totalPosicoes} posições em ${Object.keys(stats.porBay).length} bays`);
  
  return {
    choices,
    stats,
    estruturaOrganizada
  };
}

/**
 * Cria visualização em grid das posições
 * @param {HTMLSelectElement} selectElement - Elemento select (será ocultado)
 * @param {Array} posicoes - Lista de posições
 * @param {Object} options - Opções
 * @returns {Object} Resultado com grid e estatísticas
 */
function criarVisualizacaoGrid(selectElement, posicoes, options = {}) {
  // Importar dinamicamente o visualizador de grid
  return import('./bay-grid-visualizer.js').then(gridModule => {
    const { criarBayGridVisualizer } = gridModule;
    
    // Ocultar o select original
    selectElement.style.display = 'none';
    
    // Criar grid
    const gridContainer = criarBayGridVisualizer(posicoes, {
      onPositionSelect: (posicao, posicaoInfo) => {
        // Atualizar valor do select oculto
        selectElement.value = posicao;
        
        // Disparar evento change
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Callback personalizado se fornecido
        if (options.onPositionSelect) {
          options.onPositionSelect(posicao, posicaoInfo);
        }
        
        console.log(`🎯 Posição selecionada no grid: ${posicao}`);
      },
      selectedPosition: selectElement.value,
      showStats: options.showStats !== false,
      containerSize: options.containerSize
    });
    
    // Inserir grid após o select
    selectElement.parentNode.insertBefore(gridContainer, selectElement.nextSibling);
    
    // Obter estatísticas
    const estruturaOrganizada = organizarPosicoesPorHierarquia(posicoes);
    const stats = obterEstatisticasPosicoes(estruturaOrganizada);
    
    // Adicionar controles de visualização
    adicionarControlesVisualizacao(selectElement, posicoes, options, stats, gridContainer);
    
    return {
      choices: null,
      stats,
      estruturaOrganizada,
      gridContainer
    };
  }).catch(error => {
    console.error('❌ Erro ao carregar visualizador de grid:', error);
    // Fallback para combobox tradicional
    return organizarComboboxPosicoes(selectElement, posicoes, { ...options, showGridView: false });
  });
}

/**
 * Adiciona controles para alternar entre visualizações
 * @param {HTMLSelectElement} selectElement - Elemento select
 * @param {Array} posicoes - Lista de posições
 * @param {Object} options - Opções
 * @param {Object} stats - Estatísticas
 * @param {HTMLElement} gridContainer - Container do grid (opcional)
 */
function adicionarControlesVisualizacao(selectElement, posicoes, options, stats, gridContainer = null) {
  if (options.showStats === false && options.showViewToggle === false) return;
  
  const container = selectElement.closest('.form-group') || selectElement.parentElement;
  if (!container) return;
  
  let controlsElement = container.querySelector('.position-controls');
  if (!controlsElement) {
    controlsElement = document.createElement('div');
    controlsElement.className = 'position-controls mt-2';
    container.appendChild(controlsElement);
  }
  
  let controlsHTML = '';
  
  // Estatísticas
  if (options.showStats !== false) {
    const tooltipHtml = criarTooltipEstatisticas(stats);
    controlsHTML += `
      <div class="alert alert-info small mb-2" role="alert">
        <div class="d-flex align-items-center">
          <i class="fas fa-info-circle me-2"></i>
          <span><strong>${stats.totalPosicoes} posições</strong> organizadas por bay e altura</span>
          <button type="button" class="btn btn-link btn-sm ms-auto p-0" 
                  data-bs-toggle="tooltip" data-bs-html="true" 
                  title="${tooltipHtml.replace(/"/g, '&quot;')}">
            <i class="fas fa-chart-bar"></i>
          </button>
        </div>
      </div>
    `;
  }
  
  // Controles de visualização REMOVIDOS - apenas dropdown simples
  
  controlsElement.innerHTML = controlsHTML;
  
  // Event listeners de toggle removidos - apenas dropdown simples
  
  // Inicializar tooltips do Bootstrap
  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggers = controlsElement.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggers.forEach(trigger => {
      new bootstrap.Tooltip(trigger);
    });
  }
}

/**
 * Alterna entre visualizações
 * @param {HTMLSelectElement} selectElement - Elemento select
 * @param {Array} posicoes - Lista de posições
 * @param {Object} options - Opções
 */
function alternarVisualizacao(selectElement, posicoes, options) {
  // Remover visualização atual
  const container = selectElement.closest('.form-group') || selectElement.parentElement;
  const existingGrid = container.querySelector('.bay-grid-container');
  if (existingGrid) {
    existingGrid.remove();
  }
  
  // Destruir Choices.js se existir
  if (selectElement._choices) {
    selectElement._choices.destroy();
    selectElement._choices = null;
  }
  
  // Mostrar/ocultar select
  selectElement.style.display = options.showGridView ? 'none' : 'block';
  
  // Aplicar nova organização
  organizarComboboxPosicoes(selectElement, posicoes, options);
}

console.log('✅ Módulo organizador de posições carregado');
