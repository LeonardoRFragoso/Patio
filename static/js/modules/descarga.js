// ========================================
// MÓDULO DE DESCARGA
// Gerencia toda a lógica relacionada à descarga de containers vistoriados
// Consolida lógica do dashboard.js e funções complementares
// ========================================

// REMOVIDO: import { fetchInspectedContainers } from './api.js';
// Causa erro de importação circular - usando fetch direto

/**
 * Estado interno do módulo de descarga
 */
const descargaState = {
  containersVistoriados: {},
  containersVistoriadosCache: [],
  containersVistoriadosCacheTime: null,
  containerAtual: null,
  modoTransporteAtual: null,
  posicaoChoices: null,
  initialized: false
};

/**
 * Inicializa o módulo de descarga
 * @param {Object} options - Opções de inicialização
 * @param {Object} options.appState - Estado global da aplicação
 */
export function init(options = {}) {
  console.log('[DESCARGA] Inicializando módulo de descarga...');
  console.log('[DESCARGA] Options recebidas:', options);
  
  const { appState } = options;
  
  // SEMPRE reinicializar - remover verificação de inicialização
  if (descargaState.initialized) {
    console.log('[DESCARGA] Reinicializando módulo de descarga...');
  } else {
    console.log('[DESCARGA] Primeira inicialização do módulo de descarga');
  }
  
  // Configurar estado inicial
  descargaState.initialized = true;
  
  // Mostrar a operação de descarga
  mostrarOperacaoDescarga();
  
  // Configurar event listeners
  configurarEventListeners();
  
  // Carregar dados necessários
  carregarDadosIniciais();
  
  console.log('[DESCARGA] Módulo de descarga inicializado com sucesso');
}

/**
 * Mostra a operação de descarga
 */
function mostrarOperacaoDescarga() {
  console.log('[DESCARGA] Exibindo operação de descarga...');
  
  // Garantir que a seção de descarga está visível
  const operacaoDescarga = document.getElementById('operacao-descarga');
  if (operacaoDescarga) {
    operacaoDescarga.style.display = 'block';
    
    // Mostrar loading e carregar containers vistoriados
    setTimeout(() => {
      carregarEConfigurarDescarga();
    }, 100);
  } else {
    console.error('[DESCARGA] ERRO: Elemento operacao-descarga não encontrado');
  }
}

/**
 * Carrega e configura formulário de descarga
 */
async function carregarEConfigurarDescarga() {
  const descargaContainer = document.getElementById('descarga-formulario-container');
  
  if (descargaContainer) {
    // Mostrar loading
    descargaContainer.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2">Carregando containers vistoriados...</p>
      </div>
    `;
    descargaContainer.style.display = 'block';
    
    try {
      // Carregar containers vistoriados
      const containers = await carregarContainersVistoriados(true);
      
      if (containers.length === 0) {
        descargaContainer.innerHTML = `
          <div class="alert alert-warning" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Não há containers vistoriados disponíveis para descarga.
          </div>
        `;
      } else {
        // Configurar formulário único de seleção
        configurarFormularioDescargaUnico(containers);
      }
      
      // Scroll para mostrar o formulário
      setTimeout(() => {
        scrollToFormulario(descargaContainer);
      }, 400);
      
    } catch (error) {
      console.error('❌ Erro ao carregar containers vistoriados:', error);
      descargaContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <i class="fas fa-exclamation-circle me-2"></i>
          Erro ao carregar containers vistoriados. Tente novamente.
        </div>
      `;
    }
  }
}

/**
 * Configura event listeners para descarga
 */
function configurarEventListeners() {
  console.log('🔧 Configurando event listeners de descarga...');
  
  // Event listeners serão configurados dinamicamente quando o formulário for criado
  console.log('✅ Event listeners de descarga configurados');
}

/**
 * Carrega dados iniciais necessários
 */
async function carregarDadosIniciais() {
  console.log('🔄 Carregando dados iniciais para descarga...');
  
  try {
    // Carregar containers vistoriados
    await carregarContainersVistoriados();
    
    console.log('✅ Dados iniciais carregados para descarga');
  } catch (error) {
    console.error('❌ Erro ao carregar dados iniciais:', error);
  }
}

/**
 * Carrega containers vistoriados do banco de dados com cache local
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Array} Lista de containers vistoriados
 */
async function carregarContainersVistoriados(forceRefresh = false) {
  console.log('[DESCARGA] carregarContainersVistoriados chamada, forceRefresh:', forceRefresh);
  try {
    const agora = new Date();
    
    // Verificar cache local (válido por 2 minutos)
    if (!forceRefresh && 
        descargaState.containersVistoriadosCacheTime && 
        agora - descargaState.containersVistoriadosCacheTime < 120000 &&
        descargaState.containersVistoriadosCache.length > 0) {
      console.log('[DESCARGA] Usando containers vistoriados do cache local');
      return descargaState.containersVistoriadosCache;
    }
    
    console.log('[DESCARGA] Carregando containers vistoriados do banco de dados...');
    
    // Usar fetch direto para evitar dependência circular
    const response = await fetch(`/operacoes/containers/vistoriados${forceRefresh ? '?refresh=true' : ''}`);
    const result = await response.json();
    const containersData = result.success ? result.data : [];
    
    if (Array.isArray(containersData)) {
      // Processar containers para determinar modo de transporte
      const containersProcessados = containersData.map(container => {
        let modoTransporte = 'indefinido';
        
        if (container.vagao && container.vagao.trim()) {
          modoTransporte = 'ferroviaria';
          console.log(`🚂 Container ${container.numero} - Modo ferroviário - vagão: '${container.vagao}'`);
        } else if (container.placa && container.placa.trim()) {
          modoTransporte = 'rodoviaria';
          console.log(`🚛 Container ${container.numero} - Modo rodoviário - placa: '${container.placa}'`);
        } else {
          console.log(`⚠️ Container ${container.numero} - Modo indefinido - vagão: '${container.vagao || "vazio"}', placa: '${container.placa || "vazio"}'`);
        }
        
        // Armazenar no objeto global
        descargaState.containersVistoriados[container.numero] = {
          ...container,
          modoTransporte: modoTransporte
        };
        
        return {
          ...container,
          modoTransporte: modoTransporte
        };
      });
      
      // Atualizar cache
      descargaState.containersVistoriadosCache = containersProcessados;
      descargaState.containersVistoriadosCacheTime = agora;
      
      // Sincronizar com cache global se disponível
      if (window.appState) {
        window.appState.containersVistoriadosCache = containersProcessados;
        window.appState.containersVistoriadosCacheTime = agora;
      }
      
      // Criar objeto global para compatibilidade
      window.containersVistoriados = descargaState.containersVistoriados;
      
      console.log(`✅ ${containersProcessados.length} containers vistoriados carregados`);
      return containersProcessados;
    } else {
      console.error('❌ Formato de resposta inválido para containers vistoriados');
      return [];
    }
  } catch (error) {
    console.error('❌ Erro na requisição de containers vistoriados:', error);
    throw error;
  }
}

/**
 * Configura formulário único de descarga com seleção de container
 * @param {Array} containers - Lista de containers vistoriados
 */
function configurarFormularioDescargaUnico(containers) {
  try {
    console.log('🔧 Configurando formulário de descarga único...');
    
    const descargaContainer = document.getElementById('descarga-formulario-container');
    if (!descargaContainer) {
      console.error('❌ Elemento descarga-formulario-container não encontrado');
      return;
    }
    
    // Criar interface de seleção
    descargaContainer.innerHTML = `
      <div class="container-fluid p-0">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="card-title mb-0">
              <i class="fas fa-box-open me-2"></i>Selecione um Container para Descarga
            </h5>
          </div>
          <div class="card-body">
            <p class="card-text mb-4">
              <i class="fas fa-info-circle me-2 text-primary"></i>
              Digite ou selecione um container vistoriado na lista para iniciar a operação de descarga.
            </p>
            
            <div class="row mb-4">
              <div class="col-md-8 col-lg-6 mx-auto">
                <div class="combobox-wrapper position-relative">
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="fas fa-search text-muted"></i>
                    </span>
                    <input 
                      type="text" 
                      id="container_descarga" 
                      class="form-control form-control-lg" 
                      placeholder="Buscar e selecionar container vistoriado (ex: TEST123456)" 
                      autocomplete="off"
                    >
                  </div>
                  <small class="form-text text-muted mt-2">
                    <i class="fas fa-lightbulb me-1"></i>
                    Clique em um container da lista para iniciar a descarga automaticamente
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Configurar combobox
    const containerInput = document.getElementById('container_descarga');
    if (containerInput) {
      configurarComboboxContainersVistoriados(containerInput, containers);
    }
    
    console.log('✅ Formulário de descarga único configurado');
  } catch (error) {
    console.error('❌ Erro ao configurar formulário de descarga:', error);
  }
}

/**
 * Configura combobox de containers vistoriados
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 */
function configurarComboboxContainersVistoriados(input, containers) {
  if (!input) return;
  
  // Event listeners
  input.addEventListener('input', function() {
    mostrarSugestoesContainersVistoriados(this, containers);
  });
  
  input.addEventListener('focus', function() {
    mostrarSugestoesContainersVistoriados(this, containers);
  });
  
  console.log('✅ Combobox de containers vistoriados configurado');
}

/**
 * Mostra sugestões de containers vistoriados baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers vistoriados
 */
function mostrarSugestoesContainersVistoriados(input, containers) {
  // Se o input tem o atributo data-selection-active, não mostrar sugestões
  if (input.getAttribute('data-selection-active') === 'true') {
    input.removeAttribute('data-selection-active');
    return;
  }
  
  // Remover lista existente
  const existingList = document.querySelector('.combobox-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.trim().toUpperCase();
  const mostrarTodas = termo.length === 0 && document.activeElement === input;
  
  // Filtrar containers
  const containersFiltrados = mostrarTodas ? containers : containers.filter(container => 
    container.numero.toUpperCase().includes(termo) || 
    (container.iso_container && container.iso_container.toUpperCase().includes(termo))
  );
  
  if (containersFiltrados.length === 0) return;
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'combobox-suggestions';
  suggestionsList.style.cssText = `
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background-color: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    z-index: 1050;
  `;
  
  // Limitar sugestões
  const maxSuggestions = Math.min(8, containersFiltrados.length);
  
  for (let i = 0; i < maxSuggestions; i++) {
    const container = containersFiltrados[i];
    
    // Determinar modo de transporte para exibição
    let modoTransporte = 'indefinido';
    let modoDisplay = '<span class="badge bg-warning">Indefinido</span>';
    let icon = '<i class="fas fa-question-circle text-warning me-1"></i>';
    
    if (container.vagao && container.vagao.trim()) {
      modoTransporte = 'ferroviaria';
      modoDisplay = '<span class="badge bg-primary">Ferroviário</span>';
      icon = '<i class="fas fa-train text-primary me-1"></i>';
    } else if (container.placa && container.placa.trim()) {
      modoTransporte = 'rodoviaria';
      modoDisplay = '<span class="badge bg-success">Rodoviário</span>';
      icon = '<i class="fas fa-truck text-success me-1"></i>';
    }
    
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;
    `;
    
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <strong>${container.numero}</strong>
        <div>${icon} ${modoDisplay}</div>
      </div>
      <div class="text-muted small">
        ISO: ${container.iso_container || '-'} | 
        Capacidade: ${container.capacidade || '-'} | 
        Tara: ${container.tara || '-'} kg
      </div>
    `;
    
    item.addEventListener('click', () => {
      input.value = container.numero;
      input.setAttribute('data-selection-active', 'true');
      suggestionsList.remove();
      
      console.log(`🚛 Container selecionado: ${container.numero} - Iniciando descarga`);
      
      // Garantir que o objeto global está atualizado
      if (!window.containersVistoriados) {
        window.containersVistoriados = {};
      }
      
      window.containersVistoriados[container.numero] = {
        ...container,
        modoTransporte: modoTransporte
      };
      
      // Iniciar descarga automaticamente
      setTimeout(() => {
        iniciarDescargaContainer(container.numero, modoTransporte);
      }, 100);
    });
    
    suggestionsList.appendChild(item);
  }
  
  // Adicionar contador se houver mais resultados
  if (containersFiltrados.length > maxSuggestions) {
    const moreItem = document.createElement('div');
    moreItem.style.cssText = `
      padding: 8px;
      text-align: center;
      font-size: 0.85rem;
      background-color: #f1f5f9;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    `;
    moreItem.textContent = `+${containersFiltrados.length - maxSuggestions} mais resultados. Continue digitando para refinar.`;
    suggestionsList.appendChild(moreItem);
  }
  
  // Adicionar à página
  input.closest('.combobox-wrapper').appendChild(suggestionsList);
  
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
 * Inicia a descarga de um container específico
 * @param {string} containerNumero - Número do container
 * @param {string} modoTransporte - Modo de transporte (ferroviaria/rodoviaria)
 */
async function iniciarDescargaContainer(containerNumero, modoTransporte) {
  try {
    console.log(`🚛 Iniciando descarga: ${containerNumero} - Modo: ${modoTransporte}`);
    
    const descargaContainer = document.getElementById('descarga-formulario-container');
    if (!descargaContainer) {
      console.error('❌ Container de descarga não encontrado');
      return;
    }
    
    // Obter dados do container
    const containerSelecionado = window.containersVistoriados[containerNumero];
    if (!containerSelecionado) {
      console.error('❌ Dados do container não encontrados');
      return;
    }
    
    // Armazenar estado atual
    descargaState.containerAtual = containerNumero;
    descargaState.modoTransporteAtual = modoTransporte;
    
    // Extrair informações do container
    const containerInfo = extrairInformacoesContainer(containerSelecionado);
    
    // Criar formulário de descarga
    descargaContainer.innerHTML = gerarFormularioDescarga(containerSelecionado, modoTransporte, containerInfo);
    
    // Configurar formulário
    configurarFormularioDescarga(modoTransporte);
    
    // Carregar posições disponíveis
    await carregarPosicoesDisponiveis('CHEIO', containerInfo.containerSize);
    
    // Scroll para o formulário
    setTimeout(() => {
      scrollToFormulario(descargaContainer);
    }, 300);
    
    console.log('✅ Formulário de descarga configurado');
  } catch (error) {
    console.error('❌ Erro ao iniciar descarga:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Erro ao iniciar descarga',
      text: 'Ocorreu um erro ao configurar o formulário de descarga.',
      confirmButtonColor: '#d33'
    });
  }
}

/**
 * Extrai informações detalhadas do container
 * @param {Object} container - Dados do container
 * @returns {Object} Informações extraídas
 */
function extrairInformacoesContainer(container) {
  let containerSize = 20;
  let tipoContainer = '';
  let armadorContainer = '';
  
  // Extrair tamanho do container do código ISO
  if (container.iso_container) {
    const isoCode = container.iso_container;
    const firstDigit = parseInt(isoCode.charAt(0), 10);
    
    if (firstDigit === 4 || firstDigit === 9 || isoCode.includes('40') || isoCode.includes('45')) {
      containerSize = 40;
    }
    
    // Extrair tipo do container
    if (isoCode.length >= 2) {
      const secondChar = isoCode.charAt(1);
      switch (secondChar) {
        case '0': tipoContainer = 'GENERAL PURPOSE'; break;
        case '1': tipoContainer = 'VENTILADO'; break;
        case '2': tipoContainer = 'REFRIGERADO'; break;
        case '3': tipoContainer = 'OPEN TOP'; break;
        case '4': tipoContainer = 'FLAT RACK'; break;
        case '5': tipoContainer = 'TANQUE'; break;
        case '6': tipoContainer = 'GRANELEIRO'; break;
        default: tipoContainer = 'STANDARD';
      }
    }
  }
  
  // Determinar armador pelo prefixo
  const prefixo = container.numero.substring(0, 3);
  const armadores = {
    'TES': 'PIL',
    'MSC': 'MSC',
    'MAE': 'MAERSK',
    'MED': 'MAERSK',
    'EMC': 'EVERGREEN',
    'EVR': 'EVERGREEN',
    'COS': 'COSCO',
    'HAP': 'HAPAG LLOYD',
    'HLC': 'HAPAG LLOYD',
    'ONE': 'ONE',
    'CMA': 'CMA CGM'
  };
  
  armadorContainer = armadores[prefixo] || '';
  
  // Sobrescrever tamanho caso venha corretamente do backend
  if (container.tamanho !== undefined && container.tamanho !== null && container.tamanho !== '') {
    const tamanhoNum = parseInt(container.tamanho, 10);
    if (!isNaN(tamanhoNum) && (tamanhoNum === 20 || tamanhoNum === 40)) {
      containerSize = tamanhoNum;
    }
  }

  // Usar valores do banco se disponíveis
  const tipoFinal = (container.tipo_container && container.tipo_container !== '-') 
    ? container.tipo_container 
    : tipoContainer || 'STANDARD';
    
  const armadorFinal = (container.armador && container.armador !== '-') 
    ? container.armador 
    : armadorContainer || 'NÃO IDENTIFICADO';
  
  return {
    containerSize,
    tipo: tipoFinal,
    armador: armadorFinal
  };}

/**
 * Gera HTML do formulário de descarga
 * @param {Object} container - Dados do container
 * @param {string} modoTransporte - Modo de transporte
 * @param {Object} containerInfo - Informações extraídas
 * @returns {string} HTML do formulário
 */
function gerarFormularioDescarga(container, modoTransporte, containerInfo) {
  const isFerroviaria = modoTransporte === 'ferroviaria';
  const titulo = isFerroviaria ? 'Descarga Ferroviária' : 'Descarga Rodoviária';
  const icon = isFerroviaria ? 'fa-train' : 'fa-truck';
  
  const campoEspecifico = isFerroviaria 
    ? `
      <div class="mb-3">
        <label for="vagao_descarga" class="form-label">
          <i class="fas fa-train me-2"></i>Número do Vagão
        </label>
        <input type="text" class="form-control" id="vagao_descarga" name="vagao" 
               value="${container.vagao || ''}" readonly>
      </div>
    `
    : `
      <div class="mb-3">
        <label for="placa_descarga" class="form-label">
          <i class="fas fa-truck me-2"></i>Placa do Caminhão
        </label>
        <input type="text" class="form-control" id="placa_descarga" name="placa" 
               value="${container.placa || ''}" readonly>
      </div>
    `;
  
  return `
    <div class="container-fluid p-0">
      <div class="card">
        <div class="card-header bg-success text-white">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">
              <i class="fas ${icon} me-2"></i>${titulo}
            </h5>
            <button type="button" class="btn btn-light btn-sm" onclick="voltarSelecaoContainer()">
              <i class="fas fa-arrow-left me-1"></i>Voltar
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- Informações do Container -->
          <div class="alert alert-info mb-4">
            <div class="row">
              <div class="col-md-6">
                <strong>Container:</strong> ${container.numero}<br>
                <strong>ISO:</strong> ${container.iso_container || '-'}<br>
                <strong>Tipo:</strong> ${containerInfo.tipo}<br>
                <strong>Tamanho:</strong> ${containerInfo.containerSize} pés
              </div>
              <div class="col-md-6">
                <strong>Capacidade:</strong> ${container.capacidade || '-'}<br>
                <strong>Tara:</strong> ${container.tara ? `${container.tara} kg` : '-'}<br>
                <strong>Armador:</strong> ${containerInfo.armador}<br>
                <strong>Status:</strong> ${container.status || 'VISTORIADO'}
              </div>
            </div>
            <div class="row mt-2">
              <div class="col-12">
                <strong>Data Vistoria:</strong> ${container.data_vistoria ? 
                  new Date(container.data_vistoria).toLocaleString('pt-BR') : '-'}
              </div>
            </div>
          </div>
          
          <!-- Formulário de Descarga -->
          <form id="form-descarga-${modoTransporte}">
            <input type="hidden" name="container_numero" value="${container.numero}">
            <input type="hidden" name="modo_transporte" value="${modoTransporte}">
            
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label for="container_descarga_readonly" class="form-label">
                    <i class="fas fa-cube me-2"></i>Container
                  </label>
                  <input type="text" class="form-control" id="container_descarga_readonly" 
                         value="${container.numero}" readonly>
                </div>
              </div>
              <div class="col-md-6">
                ${campoEspecifico}
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label for="posicao_patio_descarga" class="form-label">
                    <i class="fas fa-map-marker-alt me-2"></i>Posição no Pátio
                  </label>
                  <select class="form-select" id="posicao_patio_descarga" name="posicao_patio" required>
                    <option value="" selected disabled>Carregando posições disponíveis...</option>
                  </select>
                  <div class="form-text text-muted">
                    <small><i class="fas fa-info-circle"></i> Posições ordenadas por altura (começando pela altura 1)</small>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label for="observacoes_descarga" class="form-label">
                    <i class="fas fa-comment me-2"></i>Observações
                  </label>
                  <textarea class="form-control" id="observacoes_descarga" name="observacoes" 
                            rows="3" placeholder="Observações adicionais (opcional)"></textarea>
                </div>
              </div>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="voltarSelecaoContainer()">
                <i class="fas fa-times me-1"></i>Cancelar
              </button>
              <button type="submit" class="btn btn-success">
                <i class="fas fa-check me-1"></i>Confirmar Descarga
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

/**
 * Configura o formulário de descarga
 * @param {string} modoTransporte - Modo de transporte
 */
function configurarFormularioDescarga(modoTransporte) {
  const form = document.getElementById(`form-descarga-${modoTransporte}`);
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      processarDescarga(form, modoTransporte);
    });
    
    console.log(`✅ Formulário de descarga ${modoTransporte} configurado`);
  }
}

/**
 * Carrega as posições disponíveis para o dropdown
 * @param {string} statusContainer - Status do container (CHEIO/VAZIO)
 * @param {number} containerSize - Tamanho do container em TEUs (20 ou 40)
 */
async function carregarPosicoesDisponiveis(statusContainer = 'CHEIO', containerSize = 20) {
  try {
    const dropdown = document.getElementById('posicao_patio_descarga');
    if (!dropdown) {
      console.error('❌ Dropdown de posições não encontrado');
      return;
    }
    
    dropdown.innerHTML = '<option value="" selected disabled>Carregando posições disponíveis...</option>';
    
    // Buscar posições da API
    const response = await fetch(`/api/posicoes/disponiveis?status=${statusContainer}&unidade=SUZANO`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar posições (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.posicoes)) {
      // Filtrar por tamanho do container
      const posicoesFiltradasPorTamanho = result.posicoes.filter(posicao => {
        const posNumero = parseInt(posicao.baia_posicao.substring(1), 10);
        if (containerSize === 20) {
          return posNumero % 2 !== 0; // Ímpares
        } else if (containerSize === 40) {
          return posNumero % 2 === 0; // Pares
        }
        return true;
      });
      
      // Ordenar posições
      posicoesFiltradasPorTamanho.sort((a, b) => {
        if (a.baia_posicao[0] !== b.baia_posicao[0]) {
          return a.baia_posicao[0].localeCompare(b.baia_posicao[0]);
        }
        const posA = parseInt(a.baia_posicao.substring(1), 10);
        const posB = parseInt(b.baia_posicao.substring(1), 10);
        if (posA !== posB) return posA - posB;
        return a.altura - b.altura;
      });
      
      // Configurar Choices.js se disponível
      if (window.Choices) {
        try {
          const choicesData = posicoesFiltradasPorTamanho.map(p => ({
            value: p.posicao_completa,
            label: `✓ ${p.baia_posicao}-${p.altura} (Pos ${p.baia_posicao.substring(1).padStart(2,'0')}, Altura ${p.altura})`
          }));
          
          if (descargaState.posicaoChoices) {
            descargaState.posicaoChoices.destroy();
          }
          
          dropdown.innerHTML = '';
          descargaState.posicaoChoices = new Choices(dropdown, {
            searchEnabled: true,
            shouldSort: false,
            itemSelectText: '',
            classNames: { containerInner: 'choices__inner' }
          });
          
          if (choicesData.length > 0) {
            descargaState.posicaoChoices.setChoices(choicesData, 'value', 'label', true);
          } else {
            descargaState.posicaoChoices.setChoices([{ 
              value: '', 
              label: 'Nenhuma posição disponível', 
              disabled: true 
            }], 'value', 'label', true);
          }
          
          console.log(`✅ Choices carregado com ${choicesData.length} posições`);
        } catch (error) {
          console.warn('⚠️ Erro ao inicializar Choices, usando select nativo', error);
          configurarSelectNativo(dropdown, posicoesFiltradasPorTamanho);
        }
      } else {
        configurarSelectNativo(dropdown, posicoesFiltradasPorTamanho);
      }
    } else {
      dropdown.innerHTML = '<option value="" selected disabled>Erro ao carregar posições</option>';
      console.error('❌ Erro ao carregar posições:', result.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar posições:', error);
    const dropdown = document.getElementById('posicao_patio_descarga');
    if (dropdown) {
      dropdown.innerHTML = `<option value="" selected disabled>Erro: ${error.message}</option>`;
    }
  }
}

/**
 * Configura select nativo com posições
 * @param {HTMLSelectElement} dropdown - Elemento select
 * @param {Array} posicoes - Lista de posições
 */
function configurarSelectNativo(dropdown, posicoes) {
  dropdown.innerHTML = '<option value="" selected disabled>Selecione uma posição</option>';
  
  posicoes.forEach(posicao => {
    const option = document.createElement('option');
    option.value = posicao.posicao_completa;
    option.textContent = `${posicao.baia_posicao}-${posicao.altura} (Altura ${posicao.altura})`;
    dropdown.appendChild(option);
  });
  
  console.log(`✅ Select nativo configurado com ${posicoes.length} posições`);
}

/**
 * Processa o formulário de descarga
 * @param {HTMLFormElement} form - Formulário de descarga
 * @param {string} modoTransporte - Modo de transporte
 */
async function processarDescarga(form, modoTransporte) {
  try {
    // Desabilitar botão
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Processando...';
    }
    
    // Obter dados do formulário
    const dados = obterDadosFormulario(form);
    
    // Validar dados
    if (!validarDadosDescarga(dados)) {
      return;
    }
    
    // Obter token CSRF
    const csrfToken = obterTokenCSRF();
    if (!csrfToken) {
      throw new Error('Token CSRF não encontrado. Você pode precisar fazer login novamente.');
    }
    
    // Preparar dados para envio
    const dadosOperacao = {
      tipo: 'descarga',
      container_id: dados.container_numero,
      posicao: dados.posicao_patio,
      modo: modoTransporte,
      observacoes: dados.observacoes || '',
      csrf_token: csrfToken
    };
    
    // Adicionar campos específicos
    if (modoTransporte === 'ferroviaria') {
      dadosOperacao.vagao = dados.vagao || '';
    } else if (modoTransporte === 'rodoviaria') {
      dadosOperacao.placa = dados.placa || '';
    }
    
    console.log('📤 Enviando dados de descarga:', dadosOperacao);
    
    // Enviar requisição
    const response = await fetch('/operacoes/registrar_operacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin',
      body: JSON.stringify(dadosOperacao)
    });
    
    await processarRespostaDescarga(response);
    
  } catch (error) {
    console.error('❌ Erro ao processar descarga:', error);
    
    await Swal.fire({
      icon: 'error',
      title: 'Erro de conexão',
      text: `Não foi possível conectar com o servidor: ${error.message}`,
      confirmButtonColor: '#d33'
    });
  } finally {
    // Re-habilitar botão
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-check me-1"></i>Confirmar Descarga';
    }
  }
}

/**
 * Obtém dados do formulário
 * @param {HTMLFormElement} form - Formulário
 * @returns {Object} Dados do formulário
 */
function obterDadosFormulario(form) {
  return {
    container_numero: form.querySelector('input[name="container_numero"]')?.value,
    posicao_patio: form.querySelector('#posicao_patio_descarga')?.value,
    observacoes: form.querySelector('#observacoes_descarga')?.value,
    vagao: form.querySelector('#vagao_descarga')?.value,
    placa: form.querySelector('#placa_descarga')?.value
  };
}

/**
 * Valida dados de descarga
 * @param {Object} dados - Dados a validar
 * @returns {boolean} Se dados são válidos
 */
function validarDadosDescarga(dados) {
  if (!dados.posicao_patio || dados.posicao_patio === '') {
    Swal.fire({
      icon: 'warning',
      title: 'Posição obrigatória',
      text: 'Selecione uma posição no pátio para continuar',
      confirmButtonColor: '#f39c12'
    });
    return false;
  }
  
  return true;
}

/**
 * Processa resposta da descarga
 * @param {Response} response - Resposta da requisição
 */
async function processarRespostaDescarga(response) {
  console.log(`📥 Resposta recebida: Status ${response.status}`);
  
  // Tratar erros HTTP específicos
  if (response.status === 400 || response.status === 403 || response.status === 401) {
    await tratarErroHTTP(response);
    return;
  }
  
  // Processar resposta JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const result = await response.json();
    
    if (result.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Descarga realizada com sucesso!',
        text: result.message || 'Container descarregado com sucesso.',
        confirmButtonColor: '#28a745'
      });
      
      // Limpar cache e voltar ao início
      limparCacheDescarga();
      voltarInicio();
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Erro na operação',
        text: result.error || 'Ocorreu um erro ao processar a operação.',
        confirmButtonColor: '#d33'
      });
    }
  } else if (response.redirected) {
    await Swal.fire({
      icon: 'success',
      title: 'Operação realizada com sucesso!',
      text: 'A operação foi concluída.',
      confirmButtonColor: '#28a745'
    });
    window.location.href = response.url;
  } else {
    throw new Error(`Resposta inesperada do servidor: ${response.status}`);
  }
}

/**
 * Trata erros HTTP específicos
 * @param {Response} response - Resposta com erro
 */
async function tratarErroHTTP(response) {
  const status = response.status;
  
  if (status === 401) {
    await Swal.fire({
      icon: 'warning',
      title: 'Sessão Expirada',
      text: 'Sua sessão expirou. Por favor, faça login novamente.',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'Fazer Login'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = '/auth/login';
      }
    });
  } else if (status === 403) {
    await Swal.fire({
      icon: 'error',
      title: 'Acesso Negado',
      text: 'Você não tem permissão para realizar esta operação.',
      confirmButtonColor: '#d33',
      footer: '<a href="/auth/login">Fazer login novamente</a>'
    });
  } else if (status === 400) {
    await Swal.fire({
      icon: 'error',
      title: 'Erro de Validação',
      text: 'Ocorreu um erro de validação. Sua sessão pode ter expirado.',
      confirmButtonColor: '#d33',
      footer: '<a href="/auth/login">Fazer login novamente</a>'
    });
  }
}

/**
 * Obtém o token CSRF para requisições
 * @returns {string|null} Token CSRF
 */
function obterTokenCSRF() {
  // Tentar várias fontes de token CSRF
  const sources = [
    () => document.getElementById('csrf-token-input')?.value,
    () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
    () => document.querySelector('input[name="csrf_token"]')?.value,
    () => window.csrfToken
  ];
  
  for (const getToken of sources) {
    try {
      const token = getToken();
      if (token && token.trim()) {
        console.log('✅ Token CSRF obtido');
        return token;
      }
    } catch (e) {
      // Continuar tentando outras fontes
    }
  }
  
  console.error('❌ Token CSRF não encontrado');
  return null;
}

/**
 * Limpa cache de descarga
 */
function limparCacheDescarga() {
  descargaState.containersVistoriadosCache = [];
  descargaState.containersVistoriadosCacheTime = null;
  
  // Limpar cache global também
  if (window.appState) {
    window.appState.containersVistoriadosCache = [];
    window.appState.containersVistoriadosCacheTime = null;
    window.appState.containersCache = [];
    window.appState.containersCacheTime = null;
  }
}

/**
 * Volta para a seleção de container
 */
function voltarSelecaoContainer() {
  console.log('🔙 Voltando para seleção de container');
  
  carregarContainersVistoriados()
    .then(containers => {
      configurarFormularioDescargaUnico(containers);
    })
    .catch(error => {
      console.error('❌ Erro ao voltar para seleção:', error);
      voltarInicio();
    });
}

/**
 * Volta ao início
 */
function voltarInicio() {
  if (typeof window.voltarInicio === 'function') {
    window.voltarInicio();
  } else {
    window.location.reload();
  }
}

// ========================================
// FUNÇÕES AUXILIARES - usar do dashboard global
// ========================================

/**
 * Scroll otimizado para formulário
 * @param {HTMLElement} elemento - Elemento para scroll
 */
function scrollToFormulario(elemento) {
  if (typeof window.scrollToFormulario === 'function') {
    window.scrollToFormulario(elemento);
  } else {
    elemento?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ========================================
// FUNÇÕES PÚBLICAS PARA USO GLOBAL
// ========================================

// Expor funções necessárias globalmente para compatibilidade
window.voltarSelecaoContainer = voltarSelecaoContainer;
window.iniciarDescargaContainer = iniciarDescargaContainer;
window.processarDescarga = processarDescarga;
window.carregarContainersVistoriados = carregarContainersVistoriados;
window.mostrarSugestoesContainersVistoriados = mostrarSugestoesContainersVistoriados;
window.configurarFormularioDescargaUnico = configurarFormularioDescargaUnico;

console.log('✅ Módulo de descarga carregado');