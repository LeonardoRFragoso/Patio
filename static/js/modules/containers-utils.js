// ========================================
// MÓDULO DE UTILITÁRIOS DE CONTAINERS
// Centraliza todas as operações com containers para evitar duplicação
// Usado por: carregamento, movimentacao, consulta, descarga
// ========================================

import { fetchContainers, fetchContainersAvailable } from './api.js';

/**
 * Estado interno do módulo de containers
 */
const containersState = {
  // Cache de todos os containers
  allContainersCache: [],
  allContainersCacheTime: null,
  
  // Cache de containers disponíveis (no pátio/carregados)
  availableContainersCache: [],
  availableContainersCacheTime: null,
  
  // TTL do cache (2 minutos)
  cacheTTL: 120000,
  
  // Estado de inicialização
  initialized: false
};

/**
 * Inicializa o módulo de containers
 */
export function init() {
  // SEMPRE reinicializar - remover verificação de inicialização
  if (containersState.initialized) {
    console.log('🔄 Reinicializando módulo de containers-utils...');
  } else {
    console.log('🆕 Primeira inicialização do módulo de containers-utils');
  }
  
  console.log('🗃️ Inicializando módulo de utilitários de containers...');
  containersState.initialized = true;
  
  // Sincronizar com cache global se disponível
  sincronizarComCacheGlobal();
  
  console.log('✅ Módulo containers-utils inicializado');
}

/**
 * Sincroniza com cache global do appState
 */
function sincronizarComCacheGlobal() {
  if (window.appState && window.appState.containersCache && window.appState.containersCache.length > 0) {
    containersState.allContainersCache = window.appState.containersCache;
    containersState.allContainersCacheTime = window.appState.containersCacheTime;
    console.log('🔄 Cache sincronizado com appState global');
  }
}

/**
 * Carrega todos os containers do banco de dados com cache
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Promise<Array>} Lista de todos os containers
 */
export async function carregarContainers(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache local
    if (!forceRefresh && 
        containersState.allContainersCacheTime && 
        agora - containersState.allContainersCacheTime < containersState.cacheTTL &&
        containersState.allContainersCache.length > 0) {
      console.log('📦 Usando containers do cache local (containers-utils)');
      return containersState.allContainersCache;
    }
    
    console.log('🔄 Carregando containers do banco de dados (containers-utils)...');
    
    // Tentar usar a função do módulo API primeiro
    let containersData;
    if (typeof fetchContainers === 'function') {
      containersData = await fetchContainers(forceRefresh);
    } else {
      // Fallback para fetch direto
      const response = await fetch(`/operacoes/containers/lista${forceRefresh ? '?refresh=true' : ''}`);
      const result = await response.json();
      containersData = result.success ? result.data : [];
    }
    
    // Atualizar cache local
    containersState.allContainersCache = containersData;
    containersState.allContainersCacheTime = agora;
    
    // Sincronizar com cache global
    if (window.appState) {
      window.appState.containersCache = containersData;
      window.appState.containersCacheTime = agora;
    }
    
    console.log(`✅ ${containersData.length} containers carregados (containers-utils)`);
    return containersData;
    
  } catch (error) {
    console.error('❌ Erro ao carregar containers (containers-utils):', error);
    return [];
  }
}

/**
 * Carrega containers disponíveis para operações (no pátio ou carregados)
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Promise<Array>} Lista de containers disponíveis
 */
export async function carregarContainersDisponiveis(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache específico de containers disponíveis
    if (!forceRefresh && 
        containersState.availableContainersCacheTime && 
        agora - containersState.availableContainersCacheTime < containersState.cacheTTL &&
        containersState.availableContainersCache.length > 0) {
      console.log('📦 Usando containers disponíveis do cache local (containers-utils)');
      return containersState.availableContainersCache;
    }
    
    console.log('🔄 Carregando containers disponíveis (containers-utils)...');
    
    // Tentar usar a função do módulo API primeiro
    let containersData;
    if (typeof fetchContainersAvailable === 'function') {
      containersData = await fetchContainersAvailable(forceRefresh);
    } else {
      // Fallback: carregar todos e filtrar
      const todosContainers = await carregarContainers(forceRefresh);
      containersData = todosContainers.filter(container => 
        container.status === 'no patio' || container.status === 'carregado'
      );
    }
    
    // Atualizar cache específico
    containersState.availableContainersCache = containersData;
    containersState.availableContainersCacheTime = agora;
    
    console.log(`✅ ${containersData.length} containers disponíveis carregados (containers-utils)`);
    return containersData;
    
  } catch (error) {
    console.error('❌ Erro ao carregar containers disponíveis (containers-utils):', error);
    return [];
  }
}

/**
 * Busca a posição atual de um container específico
 * @param {string} containerNumero - Número do container
 * @returns {Promise<Object>} Resultado da busca
 */
export async function buscarPosicaoContainer(containerNumero) {
  try {
    console.log(`🔍 Buscando posição do container: ${containerNumero} (containers-utils)`);
    
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(containerNumero)}`);
    const result = await response.json();
    
    if (result.success && result.container) {
      return {
        success: true,
        posicao: result.container.posicao_atual,
        status: result.container.status,
        container: result.container
      };
    } else {
      return {
        success: false,
        error: result.message || 'Container não encontrado'
      };
    }
  } catch (error) {
    console.error('❌ Erro ao buscar posição do container (containers-utils):', error);
    return {
      success: false,
      error: 'Erro de conexão'
    };
  }
}

/**
 * Verifica se um container está disponível para operações
 * @param {string} numeroContainer - Número do container
 * @returns {Promise<boolean>} Se o container está disponível
 */
export async function verificarContainerDisponivel(numeroContainer) {
  if (!numeroContainer) {
    console.warn('⚠️ Número de container não fornecido para verificação (containers-utils)');
    return false;
  }
  
  console.log(`🔍 Verificando disponibilidade do container: ${numeroContainer} (containers-utils)`);
  
  try {
    // Primeiro verifica no cache local
    const containersDisponiveis = await carregarContainersDisponiveis();
    
    const containerCached = containersDisponiveis.find(
      c => c.numero.toUpperCase() === numeroContainer.toUpperCase()
    );
    
    if (containerCached) {
      console.log(`✅ Container ${numeroContainer} encontrado no cache e está disponível (containers-utils)`);
      return true;
    }
    
    // Se não encontrar no cache, consulta a API
    console.log(`🌐 Container não encontrado no cache, consultando API... (containers-utils)`);
    const resultado = await buscarPosicaoContainer(numeroContainer);
    
    if (!resultado.success || !resultado.container) {
      console.warn(`⚠️ Container ${numeroContainer} não encontrado (containers-utils)`);
      return false;
    }
    
    const disponivel = resultado.container.status === 'no patio' && resultado.container.posicao_atual;
    
    if (disponivel) {
      console.log(`✅ Container ${numeroContainer} está disponível para operações (containers-utils)`);
    } else {
      console.warn(`⚠️ Container ${numeroContainer} não está disponível. Status: ${resultado.container.status} (containers-utils)`);
    }
    
    return disponivel;
  } catch (error) {
    console.error(`❌ Erro ao verificar disponibilidade do container ${numeroContainer} (containers-utils):`, error);
    return false;
  }
}

/**
 * Configura combobox para containers
 * @param {HTMLElement} inputElement - Campo de input
 * @param {Array} containers - Lista de containers
 * @param {Object} options - Opções de configuração
 */
export function criarComboboxContainers(inputElement, containers, options = {}) {
  if (!inputElement || !containers) {
    console.warn('⚠️ Parâmetros inválidos para criarComboboxContainers (containers-utils)');
    return;
  }
  
  const {
    filtrarPorStatus = null, // null = todos, 'disponivel' = no patio/carregado
    mostrarPosicao = true,
    onContainerSelect = null,
    buscarPosicaoAutomaticamente = false
  } = options;
  
  // Limpar event listeners existentes
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);
  
  // Configurar autocomplete
  newInput.setAttribute('autocomplete', 'off');
  
  // Filtrar containers baseado nas opções
  let containersFiltrados = containers;
  if (filtrarPorStatus === 'disponivel') {
    containersFiltrados = containers.filter(container => 
      (container.status === 'no patio' || container.status === 'carregado') &&
      container.posicao_atual
    );
  }
  
  // Event listeners
  newInput.addEventListener('input', function() {
    mostrarSugestoesContainers(this, containersFiltrados, { mostrarPosicao });
  });
  
  newInput.addEventListener('focus', function() {
    mostrarSugestoesContainers(this, containersFiltrados, { mostrarPosicao });
  });
  
  // Event listener para buscar posição quando container for selecionado
  if (buscarPosicaoAutomaticamente) {
    newInput.addEventListener('change', async function() {
      const containerNumero = this.value.trim();
      if (containerNumero && containerNumero.length >= 4) {
        await atualizarPosicaoAtual(containerNumero);
      }
    });
  }
  
  // Callback personalizado quando container é selecionado
  if (typeof onContainerSelect === 'function') {
    newInput.addEventListener('containerSelected', function(event) {
      onContainerSelect(event.detail.container, event.detail.input);
    });
  }
  
  console.log(`✅ Combobox de containers configurado (containers-utils) - ${containersFiltrados.length} containers`);
}

/**
 * Mostra sugestões de containers baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 * @param {Object} options - Opções de exibição
 */
export function mostrarSugestoesContainers(input, containers, options = {}) {
  const { mostrarPosicao = true, maxSuggestions = 10 } = options;
  
  // Se o input tem o atributo data-selection-active, não mostrar sugestões
  if (input.getAttribute('data-selection-active') === 'true') {
    input.removeAttribute('data-selection-active');
    return;
  }
  
  // Remover lista existente
  const existingList = document.querySelector('.combobox-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.toUpperCase();
  
  // Filtrar containers que correspondem ao termo
  const containersFiltrados = containers
    .filter(container => container.numero.toUpperCase().includes(termo))
    .slice(0, maxSuggestions);
  
  if (containersFiltrados.length === 0) return;
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'combobox-suggestions';
  suggestionsList.style.cssText = `
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1050;
  `;
  
  containersFiltrados.forEach(container => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f8f9fa;
      transition: background-color 0.2s;
    `;
    
    // Construir conteúdo da sugestão
    let conteudo = `<div><strong>${container.numero}</strong>`;
    
    if (mostrarPosicao && container.posicao_atual) {
      conteudo += `<div class="suggestion-meta" style="font-size: 0.85rem; color: #6c757d;">
        Posição: ${container.posicao_atual}
      </div>`;
    }
    
    if (container.status) {
      const statusClass = getStatusClass(container.status);
      conteudo += `<div class="suggestion-meta" style="font-size: 0.85rem;">
        <span class="badge ${statusClass}">${formatarStatus(container.status)}</span>
      </div>`;
    }
    
    conteudo += '</div>';
    item.innerHTML = conteudo;
    
    // Event listeners para hover
    item.addEventListener('mouseenter', function() {
      this.style.backgroundColor = '#f8f9fa';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'white';
    });
    
    // Event listener para seleção
    item.addEventListener('click', async function() {
      input.value = container.numero;
      input.classList.add('is-valid');
      
      // Definir flag que previne a reabertura imediata do dropdown
      input.setAttribute('data-selection-active', 'true');
      
      // Remover lista de sugestões
      suggestionsList.remove();
      
      // Disparar evento personalizado
      const event = new CustomEvent('containerSelected', {
        detail: { container, input }
      });
      input.dispatchEvent(event);
      
      // Manter foco no input
      input.focus();
    });
    
    suggestionsList.appendChild(item);
  });
  
  // Adicionar à página
  const wrapper = input.closest('.combobox-wrapper') || input.parentElement;
  if (wrapper) {
    wrapper.appendChild(suggestionsList);
  }
  
  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function closeSuggestions(e) {
      if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.remove();
        document.removeEventListener('click', closeSuggestions);
      }
    });
  }, 100);
}

/**
 * Atualiza a posição atual do container automaticamente
 * @param {string} containerNumero - Número do container
 * @param {string} targetFieldId - ID do campo para preencher (padrão: 'posicao_original')
 */
export async function atualizarPosicaoAtual(containerNumero, targetFieldId = 'posicao_original') {
  const posicaoField = document.getElementById(targetFieldId);
  const statusIndicator = document.getElementById('posicao_status');
  
  if (!posicaoField || !containerNumero) return;
  
  // Mostrar indicador de carregamento
  posicaoField.value = '';
  posicaoField.placeholder = 'Buscando posição...';
  if (statusIndicator) {
    statusIndicator.style.display = 'block';
    statusIndicator.className = 'status-indicator status-loading';
    statusIndicator.textContent = 'Buscando...';
  }
  
  try {
    const resultado = await buscarPosicaoContainer(containerNumero);
    
    if (resultado.success) {
      posicaoField.value = resultado.posicao || 'Sem posição definida';
      posicaoField.placeholder = 'Posição atual do container';
      
      if (statusIndicator) {
        statusIndicator.className = 'status-indicator status-found';
        statusIndicator.textContent = 'Encontrado';
      }
      
      // Marcar como válido
      posicaoField.classList.remove('is-invalid');
      posicaoField.classList.add('is-valid');
      
      console.log(`✅ Posição encontrada: ${resultado.posicao} (containers-utils)`);
    } else {
      posicaoField.value = '';
      posicaoField.placeholder = 'Container não encontrado ou fora do pátio';
      
      if (statusIndicator) {
        statusIndicator.className = 'status-indicator status-not-found';
        statusIndicator.textContent = 'Não encontrado';
      }
      
      // Marcar como inválido
      posicaoField.classList.remove('is-valid');
      posicaoField.classList.add('is-invalid');
      
      console.warn(`⚠️ ${resultado.error} (containers-utils)`);
    }
    
    // Esconder indicador após 3 segundos
    if (statusIndicator) {
      setTimeout(() => {
        statusIndicator.style.display = 'none';
      }, 3000);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar posição (containers-utils):', error);
    
    posicaoField.value = '';
    posicaoField.placeholder = 'Erro ao buscar posição';
    
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator status-not-found';
      statusIndicator.textContent = 'Erro';
      
      setTimeout(() => {
        statusIndicator.style.display = 'none';
      }, 3000);
    }
  }
}

/**
 * Atualiza cache de containers e recarrega dados
 * @param {string} tipo - Tipo de atualização: 'geral', 'disponivel', 'todos'
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function atualizarContainers(tipo = 'geral') {
  try {
    console.log(`🔄 Atualizando containers - Tipo: ${tipo} (containers-utils)`);
    
    let containers = [];
    let containersDisponiveis = [];
    
    // Carregar dados baseado no tipo
    switch (tipo) {
      case 'disponivel':
        containersDisponiveis = await carregarContainersDisponiveis(true);
        containers = containersDisponiveis;
        break;
      case 'todos':
        containers = await carregarContainers(true);
        containersDisponiveis = await carregarContainersDisponiveis(true);
        break;
      case 'geral':
      default:
        containers = await carregarContainers(true);
        break;
    }
    
    console.log(`✅ Atualização concluída - ${containers.length} containers carregados (containers-utils)`);
    
    return {
      success: true,
      containers: containers,
      containersDisponiveis: containersDisponiveis,
      total: containers.length,
      totalDisponiveis: containersDisponiveis.length
    };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar containers (containers-utils):', error);
    
    return {
      success: false,
      error: error.message,
      containers: [],
      containersDisponiveis: [],
      total: 0,
      totalDisponiveis: 0
    };
  }
}

/**
 * Inicializa comboboxes de containers em elementos específicos
 * @param {Array} elementos - Lista de elementos ou seletores
 * @param {Object} options - Opções globais de configuração
 */
export async function inicializarComboboxesContainers(elementos = [], options = {}) {
  try {
    console.log('🔧 Inicializando comboboxes de containers (containers-utils)...');
    
    // Carregar containers
    const containers = await carregarContainers();
    const containersDisponiveis = await carregarContainersDisponiveis();
    
    if (containers.length === 0) {
      console.warn('⚠️ Nenhum container carregado - usando campos de texto normais (containers-utils)');
      return false;
    }
    
    // Se nenhum elemento especificado, usar seletores padrão
    if (elementos.length === 0) {
      elementos = [
        '#container_consulta',
        '#container_movimentacao',
        '#container_carregamento_rod',
        '#container_carregamento_fer'
      ];
    }
    
    let configurados = 0;
    
    // Configurar cada elemento
    elementos.forEach(elemento => {
      let inputElement;
      
      if (typeof elemento === 'string') {
        inputElement = document.getElementById(elemento.replace('#', ''));
      } else {
        inputElement = elemento;
      }
      
      if (inputElement) {
        // Determinar opções específicas baseado no ID
        const opcoes = { ...options };
        
        if (inputElement.id.includes('carregamento')) {
          opcoes.filtrarPorStatus = 'disponivel';
          criarComboboxContainers(inputElement, containersDisponiveis, opcoes);
        } else {
          criarComboboxContainers(inputElement, containers, opcoes);
        }
        
        configurados++;
        console.log(`✅ Combobox configurado para ${inputElement.id} (containers-utils)`);
      }
    });
    
    console.log(`✅ ${configurados} comboboxes de containers configurados (containers-utils)`);
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao inicializar comboboxes de containers (containers-utils):', error);
    return false;
  }
}

/**
 * Limpa cache de containers
 * @param {string} tipo - Tipo de cache: 'all', 'available', 'both'
 */
export function limparCacheContainers(tipo = 'both') {
  console.log(`🧹 Limpando cache de containers - Tipo: ${tipo} (containers-utils)`);
  
  switch (tipo) {
    case 'all':
      containersState.allContainersCache = [];
      containersState.allContainersCacheTime = null;
      break;
    case 'available':
      containersState.availableContainersCache = [];
      containersState.availableContainersCacheTime = null;
      break;
    case 'both':
    default:
      containersState.allContainersCache = [];
      containersState.allContainersCacheTime = null;
      containersState.availableContainersCache = [];
      containersState.availableContainersCacheTime = null;
      break;
  }
  
  // Sincronizar com cache global
  if (window.appState && tipo !== 'available') {
    window.appState.containersCache = [];
    window.appState.containersCacheTime = null;
  }
  
  console.log('✅ Cache de containers limpo (containers-utils)');
}

/**
 * Obtém estatísticas do cache
 * @returns {Object} Estatísticas do cache
 */
export function obterEstatisticasCache() {
  const agora = new Date();
  
  return {
    allContainers: {
      count: containersState.allContainersCache.length,
      lastUpdate: containersState.allContainersCacheTime,
      isExpired: containersState.allContainersCacheTime ? 
        (agora - containersState.allContainersCacheTime > containersState.cacheTTL) : true
    },
    availableContainers: {
      count: containersState.availableContainersCache.length,
      lastUpdate: containersState.availableContainersCacheTime,
      isExpired: containersState.availableContainersCacheTime ? 
        (agora - containersState.availableContainersCacheTime > containersState.cacheTTL) : true
    },
    cacheTTL: containersState.cacheTTL,
    initialized: containersState.initialized
  };
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Retorna classe CSS para status do container
 * @param {string} status - Status do container
 * @returns {string} Classe CSS
 */
function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'no patio':
      return 'bg-success text-white';
    case 'carregado':
      return 'bg-warning text-dark';
    case 'em transito':
      return 'bg-info text-white';
    case 'descarregado':
      return 'bg-secondary text-white';
    default:
      return 'bg-secondary text-white';
  }
}

/**
 * Formata status para exibição
 * @param {string} status - Status bruto
 * @returns {string} Status formatado
 */
function formatarStatus(status) {
  switch (status?.toLowerCase()) {
    case 'no patio':
      return 'No Pátio';
    case 'carregado':
      return 'Carregado';
    case 'em transito':
      return 'Em Trânsito';
    case 'descarregado':
      return 'Descarregado';
    default:
      return status || 'Indefinido';
  }
}

// ========================================
// COMPATIBILIDADE COM CÓDIGO EXISTENTE
// ========================================

// Expor funções globais para compatibilidade
if (typeof window !== 'undefined') {
  window.carregarContainers = carregarContainers;
  window.carregarContainersDisponiveis = carregarContainersDisponiveis;
  window.criarComboboxContainers = criarComboboxContainers;
  window.mostrarSugestoesContainers = mostrarSugestoesContainers;
  window.buscarPosicaoContainer = buscarPosicaoContainer;
  window.verificarContainerDisponivel = verificarContainerDisponivel;
  window.atualizarPosicaoAtual = atualizarPosicaoAtual;
  window.atualizarContainers = atualizarContainers;
  window.inicializarComboboxesContainers = inicializarComboboxesContainers;
}

// Auto-inicialização quando carregado
init();

console.log('✅ Módulo containers-utils carregado e pronto para uso');