/**
 * fix-posicoes-disponiveis.js
 * Sistema modular para gerenciamento de posições disponíveis no pátio
 * 
 * Funcionalidades:
 * - Carregamento inteligente com cache
 * - Filtros por TEU e status
 * - Interface visual aprimorada
 * - Integração com validação TEU
 * - Estatísticas de ocupação
 * 
 * @author Sistema Pátio Suzano
 * @version 2.0.0
 */

// ========================================
// CONFIGURAÇÕES E CONSTANTES
// ========================================

// Proteção contra redeclaração
if (typeof window.POSICOES_CONFIG !== 'undefined') {
  console.warn('⚠️ POSICOES_CONFIG já foi declarado, pulando redeclaração');
  // Usar configuração existente
  var POSICOES_CONFIG = window.POSICOES_CONFIG;
} else {
  const POSICOES_CONFIG = {
    // Cache e performance
    CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutos
    REQUEST_TIMEOUT: 10000, // 10 segundos
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 segundo
    
    // API endpoints
    API_ENDPOINTS: {
      POSICOES_DISPONIVEIS: '/api/posicoes/disponiveis',
      ESTATISTICAS: '/api/posicoes/estatisticas'
    },
    
    // Elementos DOM
    ELEMENTOS: {
      DROPDOWN_POSICOES: 'dropdown-posicoes',
      ESTATISTICAS: 'estatisticas-posicoes',
      LOADING_INDICATOR: 'loading-posicoes',
      REFRESH_BUTTON: 'refresh-posicoes'
    },
    
    // Configurações visuais
    UI: {
      SHOW_STATISTICS: true,
      SHOW_LOADING: true,
      ANIMATE_UPDATES: true,
      GROUP_BY_BAIA: true
    },
    
    // Debug e logs
    ENABLE_DEBUG: false,
    LOG_PERFORMANCE: false
  };
  
  // Exportar configuração globalmente
  window.POSICOES_CONFIG = POSICOES_CONFIG;
}

// ========================================
// CLASSE PRINCIPAL - GERENCIADOR DE POSIÇÕES
// ========================================

/**
 * Classe para gerenciar posições disponíveis no pátio
 */
class GerenciadorPosicoes {
  constructor(config = {}) {
    this.config = { ...POSICOES_CONFIG, ...config };
    this.posicoesDisponiveis = new Map(); // Cache por status/TEU
    this.ultimaAtualizacao = new Map();
    this.requestsAtivas = new Set();
    this.isInitialized = false;
    
    // Bind methods
    this.handleRefreshClick = this.handleRefreshClick.bind(this);
    this.handlePosicaoSelect = this.handlePosicaoSelect.bind(this);
  }
  
  /**
   * Inicializa o gerenciador
   */
  initialize() {
    if (this.isInitialized) {
      this.log('ℹ️ Gerenciador já inicializado');
      return;
    }

    this.setupEventListeners();
    this.isInitialized = true;
    this.log('✅ Gerenciador de posições inicializado');
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Botão de refresh
    const refreshButton = document.getElementById(this.config.ELEMENTOS.REFRESH_BUTTON);
    if (refreshButton) {
      refreshButton.addEventListener('click', this.handleRefreshClick);
    }

    // Listener para seleção de posições
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('posicao-item')) {
        this.handlePosicaoSelect(event);
      }
    });
  }

  /**
   * Busca posições disponíveis do servidor
   * @param {Object} options - Opções de busca
   * @param {string} options.status - Status do container (CHEIO, VAZIO)
   * @param {number} options.tamanhoTEU - Tamanho do container em TEU (20, 40)
   * @param {boolean} options.forceRefresh - Forçar atualização do cache
   * @returns {Promise<Array>} Promise com array de posições disponíveis
   */
  async buscarPosicoesDisponiveis(options = {}) {
    const { status = 'CHEIO', tamanhoTEU = 20, forceRefresh = false } = options;
    const cacheKey = `${status}_${tamanhoTEU}`;
    
    this.log(`🔍 Buscando posições: ${status} ${tamanhoTEU}TEU`);
    
    try {
      // Verificar cache
      if (!forceRefresh && this.isCacheValid(cacheKey)) {
        this.log('📦 Usando cache');
        return this.posicoesDisponiveis.get(cacheKey) || [];
      }
      
      // Evitar requisições duplicadas
      if (this.requestsAtivas.has(cacheKey)) {
        this.log('⏳ Aguardando requisição existente');
        return await this.waitForRequest(cacheKey);
      }
      
      // Marcar requisição como ativa
      this.requestsAtivas.add(cacheKey);
      
      // Mostrar loading
      this.showLoading(true);
      
      // Buscar do servidor com retry
      const posicoes = await this.fetchWithRetry(status, tamanhoTEU);
      
      // Filtrar por TEU
      const posicoesFiltradas = this.filtrarPosicoesPorTEU(posicoes, tamanhoTEU);
      
      // Atualizar cache
      this.updateCache(cacheKey, posicoesFiltradas);
      
      // Disparar evento
      this.dispatchEvent('posicoesCarregadas', {
        posicoes: posicoesFiltradas,
        status,
        tamanhoTEU,
        timestamp: new Date()
      });
      
      this.log(`✅ ${posicoesFiltradas.length} posições carregadas`);
      return posicoesFiltradas;
      
    } catch (error) {
      this.log(`❌ Erro: ${error.message}`, 'error');
      return [];
    } finally {
      this.requestsAtivas.delete(cacheKey);
      this.showLoading(false);
    }
  }

  /**
   * Verifica se o cache é válido
   */
  isCacheValid(cacheKey) {
    const ultimaAtualizacao = this.ultimaAtualizacao.get(cacheKey);
    const posicoes = this.posicoesDisponiveis.get(cacheKey);
    
    return ultimaAtualizacao && 
           posicoes && 
           posicoes.length > 0 && 
           (Date.now() - ultimaAtualizacao < this.config.CACHE_TIMEOUT);
  }

  /**
   * Aguarda requisição existente
   */
  async waitForRequest(cacheKey) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.requestsAtivas.has(cacheKey)) {
          clearInterval(checkInterval);
          resolve(this.posicoesDisponiveis.get(cacheKey) || []);
        }
      }, 100);
    });
  }

  /**
   * Faz requisição com retry
   */
  async fetchWithRetry(status, tamanhoTEU, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);
      
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const url = `${this.config.API_ENDPOINTS.POSICOES_DISPONIVEIS}?status=${status}&tamanho=${tamanhoTEU}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erro na resposta da API');
      }
      
      return data.posicoes || [];
      
    } catch (error) {
      if (attempt < this.config.RETRY_ATTEMPTS) {
        this.log(`⚠️ Tentativa ${attempt} falhou, tentando novamente...`);
        await this.delay(this.config.RETRY_DELAY * attempt);
        return this.fetchWithRetry(status, tamanhoTEU, attempt + 1);
      }
      throw error;
    }
  }
  
  /**
   * Métodos utilitários
   */
  updateCache(cacheKey, posicoes) {
    this.posicoesDisponiveis.set(cacheKey, posicoes);
    this.ultimaAtualizacao.set(cacheKey, Date.now());
  }

  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showLoading(show) {
    if (!this.config.UI.SHOW_LOADING) return;
    
    const loadingElement = document.getElementById(this.config.ELEMENTOS.LOADING_INDICATOR);
    if (loadingElement) {
      loadingElement.style.display = show ? 'block' : 'none';
    }
  }

  log(message, level = 'info') {
    if (!this.config.ENABLE_DEBUG) return;
    
    const prefix = '[GerenciadorPosicoes]';
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Filtra posições pelo tamanho TEU
   * @param {Array} posicoes - Array de posições
   * @param {number} tamanhoTEU - Tamanho do container em TEU (20, 40)
   * @returns {Array} Array de posições filtradas
   */
  filtrarPosicoesPorTEU(posicoes, tamanhoTEU) {
    if (!Array.isArray(posicoes) || posicoes.length === 0) {
      return [];
    }
    
    this.log(`🔍 Filtrando ${posicoes.length} posições para ${tamanhoTEU}TEU`);
    
    const posicoesFiltradas = posicoes.filter(posicao => {
      const codigo = posicao.codigo || posicao;
      
      // Usar validação TEU se disponível
      if (window.validarPosicaoPorTEU) {
        const resultado = window.validarPosicaoPorTEU(codigo, tamanhoTEU);
        return resultado.valido;
      }
      
      // Fallback para validação local
      return this.validarPosicaoTEULocal(codigo, tamanhoTEU);
    });
    
    this.log(`✅ ${posicoesFiltradas.length} posições compatíveis`);
    return posicoesFiltradas;
  }

  /**
   * Validação TEU local (fallback)
   */
  validarPosicaoTEULocal(codigo, tamanhoTEU) {
    const match = codigo.match(/^[A-E](\d{2})-\d$/);
    if (!match) {
      this.log(`⚠️ Formato inválido: ${codigo}`, 'warn');
      return false;
    }
    
    const baia = parseInt(match[1], 10);
    const ehPar = baia % 2 === 0;
    
    return (tamanhoTEU === 20 && !ehPar) || (tamanhoTEU === 40 && ehPar);
  }

  /**
   * Event handlers
   */
  handleRefreshClick(event) {
    event.preventDefault();
    this.log('🔄 Refresh solicitado pelo usuário');
    
    // Obter parâmetros atuais
    const status = this.getCurrentStatus();
    const tamanhoTEU = this.getCurrentTamanhoTEU();
    
    // Forçar refresh
    this.buscarPosicoesDisponiveis({
      status,
      tamanhoTEU,
      forceRefresh: true
    });
  }

  handlePosicaoSelect(event) {
    event.preventDefault();
    const posicao = event.target.dataset.posicao;
    
    if (posicao) {
      this.log(`📍 Posição selecionada: ${posicao}`);
      
      // Disparar evento de seleção
      this.dispatchEvent('posicaoSelecionada', {
        posicao,
        timestamp: new Date()
      });
      
      // Atualizar campo se disponível
      this.updatePosicaoField(posicao);
    }
  }

  getCurrentStatus() {
    // Tentar obter do contexto global ou campo específico
    return window.containerSelecionado?.status || 'CHEIO';
  }

  getCurrentTamanhoTEU() {
    // Tentar obter do contexto global ou campo específico
    if (window.containerSelecionado?.tamanho) {
      return parseInt(window.containerSelecionado.tamanho.replace(' pés', ''));
    }
    return 20;
  }

  updatePosicaoField(posicao) {
    // Tentar atualizar campos de posição conhecidos
    const campos = ['nova_posicao', 'posicao_destino', 'posicao'];
    
    for (const campo of campos) {
      const element = document.getElementById(campo);
      if (element && element.offsetParent !== null) { // Visível
        element.value = posicao;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
  }

  /**
   * Atualiza o dropdown de posições disponíveis
   * @param {Array} posicoes - Array de posições disponíveis
   * @param {string} dropdownId - ID do elemento dropdown
   */
  atualizarDropdownPosicoes(posicoes, dropdownId = 'dropdown-posicoes') {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
      this.log(`⚠️ Dropdown ${dropdownId} não encontrado`, 'warn');
      return;
    }
    
    this.log(`🔄 Atualizando dropdown com ${posicoes.length} posições`);
    
    if (posicoes.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-item text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Nenhuma posição disponível</div>';
      return;
    }
    
    if (!this.config.UI.GROUP_BY_BAIA) {
      // Lista simples
      const html = posicoes.map(posicao => `
        <a href="#" class="dropdown-item posicao-item" data-posicao="${posicao.codigo}">
          <i class="fas fa-map-marker-alt me-2"></i>${posicao.codigo}
        </a>
      `).join('');
      dropdown.innerHTML = html;
      return;
    }
    
    // Agrupar por baia
    const posicoesPorBaia = {};
    posicoes.forEach(posicao => {
      const baia = posicao.codigo.charAt(0);
      if (!posicoesPorBaia[baia]) {
        posicoesPorBaia[baia] = [];
      }
      posicoesPorBaia[baia].push(posicao);
    });
    
    // Gerar HTML agrupado
    let html = '';
    Object.keys(posicoesPorBaia).sort().forEach(baia => {
      const count = posicoesPorBaia[baia].length;
      html += `<h6 class="dropdown-header"><i class="fas fa-warehouse me-2"></i>Baia ${baia} (${count})</h6>`;
      
      posicoesPorBaia[baia].forEach(posicao => {
        html += `
          <a href="#" class="dropdown-item posicao-item" data-posicao="${posicao.codigo}">
            <i class="fas fa-map-marker-alt me-2"></i>${posicao.codigo}
          </a>
        `;
      });
      
      if (Object.keys(posicoesPorBaia).indexOf(baia) < Object.keys(posicoesPorBaia).length - 1) {
        html += '<div class="dropdown-divider"></div>';
      }
    });
    
    dropdown.innerHTML = html;
  }
}

// ========================================
// INICIALIZAÇÃO E INSTÂNCIA GLOBAL
// ========================================

// Criar instância global do gerenciador de posições
let gerenciadorPosicoes = null;

/**
 * Inicializa o gerenciador de posições
 */
function initGerenciadorPosicoes() {
  if (gerenciadorPosicoes) {
    return gerenciadorPosicoes;
  }
  
  // Configuração dinâmica baseada em parâmetros URL
  const urlParams = new URLSearchParams(window.location.search);
  const config = {
    ENABLE_DEBUG: urlParams.has('debug') || urlParams.has('debug_posicoes')
  };
  
  gerenciadorPosicoes = new GerenciadorPosicoes(config);
  gerenciadorPosicoes.initialize();
  
  // Exportar globalmente
  window.gerenciadorPosicoes = gerenciadorPosicoes;
  
  return gerenciadorPosicoes;
}

// ========================================
// FUNÇÕES GLOBAIS PARA COMPATIBILIDADE
// ========================================

/**
 * Carrega posições disponíveis filtradas por status e tamanho TEU
 * @param {string} status - Status do container (CHEIO, VAZIO)
 * @param {number} tamanhoTEU - Tamanho do container em TEU (20, 40)
 * @param {boolean} forceRefresh - Forçar atualização do cache
 * @returns {Promise<Array>} Promise com array de posições disponíveis
 */
async function carregarPosicoesDisponiveis(status = 'CHEIO', tamanhoTEU = 20, forceRefresh = false) {
  try {
    const gerenciador = initGerenciadorPosicoes();
    
    gerenciador.log(`🔄 Carregando posições: ${status} ${tamanhoTEU}TEU`);
    
    // Buscar posições disponíveis
    const posicoes = await gerenciador.buscarPosicoesDisponiveis({
      status,
      tamanhoTEU,
      forceRefresh
    });
    
    // Atualizar dropdown de posições
    gerenciador.atualizarDropdownPosicoes(posicoes);
    
    // Mostrar estatísticas se habilitado
    if (gerenciador.config.UI.SHOW_STATISTICS) {
      mostrarEstatisticasPosicoes(posicoes, tamanhoTEU);
    }
    
    return posicoes;
  } catch (error) {
    console.error('❌ Erro ao carregar posições disponíveis:', error);
    return [];
  }
}

/**
 * Atualiza posições disponíveis (função de conveniência)
 * @param {Object} options - Opções de atualização
 */
async function atualizarPosicoesDisponiveis(options = {}) {
  const gerenciador = initGerenciadorPosicoes();
  
  const status = options.status || gerenciador.getCurrentStatus();
  const tamanhoTEU = options.tamanhoTEU || gerenciador.getCurrentTamanhoTEU();
  
  return carregarPosicoesDisponiveis(status, tamanhoTEU, true);
}

/**
 * Mostra estatísticas de posições disponíveis
 * @param {Array} posicoes - Array de posições disponíveis
 * @param {number} tamanhoTEU - Tamanho do container em TEU (20, 40)
 */
function mostrarEstatisticasPosicoes(posicoes, tamanhoTEU) {
  const estatisticasElement = document.getElementById('estatisticas-posicoes');
  if (!estatisticasElement) return;
  
  if (!Array.isArray(posicoes) || posicoes.length === 0) {
    estatisticasElement.innerHTML = `
      <div class="alert alert-warning mt-3">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Nenhuma posição disponível para containers de ${tamanhoTEU} pés
      </div>
    `;
    return;
  }
  
  // Contar posições por baia
  const posicoesPorBaia = {};
  let totalPosicoes = 0;
  
  posicoes.forEach(posicao => {
    const baia = posicao.codigo.charAt(0);
    if (!posicoesPorBaia[baia]) {
      posicoesPorBaia[baia] = 0;
    }
    posicoesPorBaia[baia]++;
    totalPosicoes++;
  });
  
  const numBaias = Object.keys(posicoesPorBaia).length;
  
  // Gerar HTML com estatísticas melhoradas
  let html = `
    <div class="card mt-3 shadow-sm">
      <div class="card-header bg-primary text-white">
        <div class="d-flex justify-content-between align-items-center">
          <span><i class="fas fa-chart-bar me-2"></i>Estatísticas de Posições</span>
          <span class="badge bg-light text-primary">${totalPosicoes} disponíveis</span>
        </div>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="text-center">
              <h4 class="text-primary mb-0">${totalPosicoes}</h4>
              <small class="text-muted">Total de Posições</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center">
              <h4 class="text-success mb-0">${numBaias}</h4>
              <small class="text-muted">Baias Ativas</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center">
              <h4 class="text-info mb-0">${tamanhoTEU}TEU</h4>
              <small class="text-muted">Tamanho Container</small>
            </div>
          </div>
        </div>
        
        <h6 class="mb-3">Distribuição por Baia:</h6>
        <div class="row">
  `;
  
  // Adicionar estatísticas por baia com melhor visual
  Object.keys(posicoesPorBaia).sort().forEach(baia => {
    const count = posicoesPorBaia[baia];
    const percentage = ((count / totalPosicoes) * 100).toFixed(1);
    
    html += `
      <div class="col-md-3 col-sm-6 mb-3">
        <div class="card border-0 bg-light">
          <div class="card-body p-3 text-center">
            <h5 class="card-title mb-1 text-primary">Baia ${baia}</h5>
            <h6 class="text-dark mb-1">${count} posições</h6>
            <small class="text-muted">${percentage}% do total</small>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
        <div class="mt-3 pt-2 border-top">
          <small class="text-muted">
            <i class="fas fa-clock me-1"></i>
            Última atualização: ${new Date().toLocaleString()}
          </small>
        </div>
      </div>
    </div>
  `;
  
  estatisticasElement.innerHTML = html;
}

// ========================================
// EXPORTAÇÕES GLOBAIS E INICIALIZAÇÃO
// ========================================

// Exportar funções globalmente para compatibilidade
window.carregarPosicoesDisponiveis = carregarPosicoesDisponiveis;
window.atualizarPosicoesDisponiveis = atualizarPosicoesDisponiveis;
window.mostrarEstatisticasPosicoes = mostrarEstatisticasPosicoes;
window.GerenciadorPosicoes = GerenciadorPosicoes;

// Inicialização automática quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGerenciadorPosicoes);
} else {
  // DOM já carregado
  initGerenciadorPosicoes();
}

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
  if (gerenciadorPosicoes) {
    gerenciadorPosicoes.log('🧹 Limpando recursos...');
    // Cancelar requisições ativas se necessário
    gerenciadorPosicoes.requestsAtivas.clear();
  }
});

console.log('✅ fix-posicoes-disponiveis.js carregado e modularizado');
