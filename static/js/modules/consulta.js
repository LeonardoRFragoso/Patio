// ========================================
// MÓDULO DE CONSULTA DE CONTAINERS
// Gerencia toda a lógica relacionada à consulta e busca de containers
// ========================================

import { fetchContainers } from './api.js';

/**
 * Estado interno do módulo de consulta
 */
const consultaState = {
  containersCache: [],
  containersCacheTime: null,
  ultimaConsulta: null,
  resultadoAtual: null,
  initialized: false
};

/**
 * Inicializa o módulo de consulta
 * @param {Object} options - Opções de inicialização
 * @param {Object} options.appState - Estado global da aplicação
 */
export function init(options = {}) {
  console.log('🔍 Inicializando módulo de consulta...');
  
  const { appState } = options;
  
  if (consultaState.initialized) {
    console.log('⚠️ Módulo de consulta já inicializado');
    return;
  }
  
  // Configurar estado inicial
  consultaState.initialized = true;
  
  // Mostrar a operação de consulta
  mostrarOperacaoConsulta();
  
  // Configurar event listeners
  configurarEventListeners();
  
  // Carregar dados necessários
  carregarDadosIniciais();
  
  console.log('✅ Módulo de consulta inicializado com sucesso');
}

/**
 * Mostra a operação de consulta
 */
function mostrarOperacaoConsulta() {
  console.log('📱 Exibindo operação de consulta de container...');
  
  // Garantir que a seção de consulta está visível
  const consultaContainer = document.getElementById('operacao-consultar');
  if (consultaContainer) {
    consultaContainer.style.display = 'block';
    
    // Mostrar formulário de consulta
    setTimeout(() => {
      mostrarFormularioConsulta();
    }, 200);
  } else {
    console.error('❌ Elemento operacao-consultar não encontrado no DOM');
  }
}

/**
 * Mostra o formulário de consulta
 */
function mostrarFormularioConsulta() {
  const formConsulta = document.getElementById('form-consulta');
  if (formConsulta) {
    console.log('📱 Mostrando formulário de consulta');
    formConsulta.classList.add('show');
    formConsulta.style.display = 'block';
    
    // Focar no campo de consulta
    setTimeout(() => {
      const containerInput = document.getElementById('container_consulta');
      if (containerInput) {
        containerInput.focus();
        console.log('✅ Campo de consulta de container em foco');
      }
    }, 300);
    

  } else {
    console.error('❌ Formulário de consulta não encontrado');
  }
}

/**
 * Configura event listeners para consulta
 */
function configurarEventListeners() {
  console.log('🔧 Configurando event listeners de consulta...');
  
  // Configurar formulário de busca
  configurarFormularioBusca();
  
  // Configurar campo de input com combobox
  configurarCampoConsulta();
  
  // Configurar botões de refresh
  configurarBotoesRefresh();
  
  console.log('✅ Event listeners de consulta configurados');
}

/**
 * Configura o formulário de busca
 */
function configurarFormularioBusca() {
  const formConsulta = document.getElementById('form-consulta');
  if (formConsulta) {
    // Remover event listeners existentes
    const novoForm = formConsulta.cloneNode(true);
    formConsulta.parentNode.replaceChild(novoForm, formConsulta);
    
    novoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processarConsulta();
    });
    
    console.log('✅ Formulário de consulta configurado');
  }
  
  // Configurar botão de busca se existir
  const btnBuscar = document.getElementById('btn-buscar-container');
  if (btnBuscar) {
    btnBuscar.addEventListener('click', (e) => {
      e.preventDefault();
      processarConsulta();
    });
  }
}

/**
 * Configura campo de consulta com combobox
 */
function configurarCampoConsulta() {
  const containerInput = document.getElementById('container_consulta');
  if (containerInput) {
    configurarComboboxConsulta(containerInput);
    
    // Event listener para Enter
    containerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        processarConsulta();
      }
    });
    
    console.log('✅ Campo de consulta configurado');
  }
}

/**
 * Configura combobox de consulta
 * @param {HTMLElement} inputElement - Campo de input
 */
function configurarComboboxConsulta(inputElement) {
  if (!inputElement) return;
  
  // Limpar event listeners existentes
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);
  
  // Configurar autocomplete
  newInput.setAttribute('autocomplete', 'off');
  
  // Event listeners
  newInput.addEventListener('input', function() {
    mostrarSugestoesConsulta(this, consultaState.containersCache);
  });
  
  newInput.addEventListener('focus', function() {
    mostrarSugestoesConsulta(this, consultaState.containersCache);
  });
  
  console.log('✅ Combobox de consulta configurado');
}

/**
 * Configura botões de refresh
 */
function configurarBotoesRefresh() {
  const botoesRefresh = document.querySelectorAll('#form-consulta .btn-refresh');
  
  botoesRefresh.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await atualizarContainersConsulta();
    });
  });
}

/**
 * Carrega dados iniciais necessários
 */
async function carregarDadosIniciais() {
  console.log('🔄 Carregando dados iniciais para consulta...');
  
  try {
    // Carregar todos os containers para consulta
    await carregarContainers();
    
    console.log('✅ Dados iniciais carregados para consulta');
  } catch (error) {
    console.error(' Erro ao carregar dados iniciais:', error);
  }
}

/**
 * Carrega containers para consulta
 * @param {boolean} forceRefresh - Forçar atualização do cache
 * @returns {Array} Lista de containers
 */
async function carregarContainers(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache local
    if (!forceRefresh && 
        consultaState.containersCacheTime && 
        agora - consultaState.containersCacheTime < 120000 &&
        consultaState.containersCache.length > 0) {
      console.log(' Usando containers do cache local');
      return consultaState.containersCache;
    }
    
    console.log(' Carregando containers do banco de dados...');
    
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
    
    // Atualizar cache
    consultaState.containersCache = containersData;
    consultaState.containersCacheTime = agora;
    
    console.log(` ${containersData.length} containers carregados para consulta`);
    return containersData;
    
  } catch (error) {
    console.error(' Erro ao carregar containers:', error);
    return [];
  }
}

/**
 * Atualiza a lista de containers e reconfigura o combobox
 * @param {string} tipo - Tipo de operação (consulta, geral, etc)
 */
async function atualizarContainers(tipo = 'consulta') {
  console.log(` Atualizando containers para ${tipo}...`);
  
  try {
    // Mostrar indicador de carregamento
    const btnRefresh = document.querySelector(`#form-${tipo} .btn-refresh`);
    if (btnRefresh) {
      btnRefresh.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btnRefresh.disabled = true;
    }
    
    // Forçar atualização do cache
    const containers = await carregarContainers(true);
    
    // Reconfigurar combobox específico
    if (tipo === 'consulta') {
      const containerInput = document.getElementById('container_consulta');
      if (containerInput) {
        configurarComboboxConsulta(containerInput);
      }
    }
    
    // Restaurar botão
    if (btnRefresh) {
      setTimeout(() => {
        btnRefresh.innerHTML = '<i class="fas fa-sync-alt"></i>';
        btnRefresh.disabled = false;
      }, 500);
    }
    
    console.log(` ${containers.length} containers atualizados para ${tipo}`);
    return containers;
    
  } catch (error) {
    console.error(` Erro ao atualizar containers para ${tipo}:`, error);
    
    // Restaurar botão em caso de erro
    const btnRefresh = document.querySelector(`#form-${tipo} .btn-refresh`);
    if (btnRefresh) {
      btnRefresh.innerHTML = '<i class="fas fa-sync-alt"></i>';
      btnRefresh.disabled = false;
    }
    
    return [];
  }
}

// Exportar funções globalmente para uso em HTML
window.atualizarContainers = atualizarContainers;
window.limparConsulta = limparConsulta;

export { atualizarContainers, limparConsulta };

/**
 * Mostra sugestões de containers para consulta
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 */
function mostrarSugestoesConsulta(input, containers) {
  // Se o input tem o atributo data-selection-active, não mostrar sugestões
  if (input.getAttribute('data-selection-active') === 'true') {
    input.removeAttribute('data-selection-active');
    return;
  }
  
  // Remover lista existente
  const existingList = document.querySelector('.combobox-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.toUpperCase();
  
  // Mostrar todas as sugestões se termo estiver vazio e input tem foco
  const mostrarTodas = termo.length === 0 && document.activeElement === input;
  
  // Filtrar containers (mostrar todos os containers para consulta)
  const containersFiltrados = mostrarTodas 
    ? containers.slice(0, 10)
    : containers
        .filter(container => container.numero.toUpperCase().includes(termo))
        .slice(0, 10);
  
  if (containersFiltrados.length === 0) return;
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'combobox-suggestions';
  
  containersFiltrados.forEach(container => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    
    // Determinar cor do status
    const statusClass = getStatusClass(container.status);
    
    item.innerHTML = `
      <div>
        <strong>${container.numero}</strong>
        <div class="suggestion-meta">
          Posição: ${container.posicao_atual || 'N/A'} | 
          <span class="status-badge ${statusClass}">${container.status}</span>
        </div>
      </div>
      <div class="suggestion-meta">
        Atualizado: ${container.ultima_atualizacao ? 
          new Date(container.ultima_atualizacao).toLocaleDateString('pt-BR') : 'N/A'}
      </div>
    `;
    
    item.addEventListener('mouseenter', function() {
      this.style.backgroundColor = 'var(--bg-glass, #f8f9fa)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'white';
    });
    
    item.addEventListener('click', function() {
      input.value = container.numero;
      input.classList.add('is-valid');
      
      // Definir flag que previne a reabertura imediata do dropdown
      input.setAttribute('data-selection-active', 'true');
      
      // Remover lista de sugestões
      suggestionsList.remove();
      
      // Processar consulta automaticamente
      setTimeout(() => {
        processarConsulta();
      }, 100);
      
      // Manter foco no input
      input.focus();
    });
    
    suggestionsList.appendChild(item);
  });
  
  // Adicionar à página
  input.closest('.combobox-wrapper')?.appendChild(suggestionsList);
  
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
 * Processa a consulta de container
 */
async function processarConsulta() {
  const containerInput = document.getElementById('container_consulta');
  if (!containerInput) {
    console.error('❌ Campo de consulta não encontrado');
    return;
  }
  
  const containerNumero = containerInput.value.trim();
  if (!containerNumero) {
    mostrarAlerta('Campo obrigatório', 'Por favor, digite o número do container para consultar.', 'warning');
    containerInput.focus();
    return;
  }
  
  console.log(`🔍 Processando consulta do container: ${containerNumero}`);
  
  // Buscar container
  const btnBuscar = document.getElementById('btn-buscar-container');
  await buscarStatusContainer(containerNumero, btnBuscar);
}

/**
 * Busca status de um container
 * @param {string} containerNumber - Número do container
 * @param {HTMLButtonElement} searchButton - Botão de busca
 */
async function buscarStatusContainer(containerNumber, searchButton) {
  showLoading(searchButton);
  
  try {
    console.log(`🔍 Buscando container: ${containerNumber}`);
    
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(containerNumber)}`);
    const result = await response.json();
    
    hideLoading(searchButton);
    
    if (result.success && result.container) {
      console.log('✅ Container encontrado:', result.container);
      consultaState.ultimaConsulta = containerNumber;
      consultaState.resultadoAtual = result;
      
      // Exibir resultado
      exibirStatusContainer(result.container, result.operacoes || []);
    } else {
      console.log('⚠️ Container não encontrado:', result.message);
      
      // Limpar resultado anterior
      limparResultadoConsulta();
      
      Swal.fire({
        icon: 'info',
        title: 'Container não encontrado',
        text: result.message || 'Container não foi encontrado no sistema',
        confirmButtonText: 'OK',
        confirmButtonColor: '#667eea'
      });
    }
  } catch (error) {
    hideLoading(searchButton);
    console.error('❌ Erro ao buscar container:', error);
    
    // Limpar resultado anterior
    limparResultadoConsulta();
    
    Swal.fire({
      icon: 'error',
      title: 'Erro de conexão',
      text: 'Erro de conexão. Verifique sua internet e tente novamente.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#ef4444'
    });
  }
}

/**
 * Exibe o status de um container
 * @param {Object} container - Dados do container
 * @param {Array} operacoes - Lista de operações
 */
function exibirStatusContainer(container, operacoes = []) {
  const resultContainer = document.getElementById('resultado-consulta');
  const infoContainer = document.getElementById('info-container');
  
  if (resultContainer && infoContainer) {
    // Inserir o HTML no elemento info-container
    infoContainer.innerHTML = gerarHTMLStatus(container, operacoes);
    
    // Mostrar o container pai
    resultContainer.style.display = 'block';
    
    setTimeout(() => {
      resultContainer.classList.add('show');
      
      // Scroll para mostrar o resultado
      scrollToFormulario(resultContainer);
    }, 100);
    
    console.log('✅ Status do container exibido');
  } else {
    console.error('❌ Elementos necessários não encontrados: resultado-consulta ou info-container');
  }
}

/**
 * Gera HTML para exibir status do container
 * @param {Object} container - Dados do container
 * @param {Array} operacoes - Lista de operações
 * @returns {string} HTML gerado
 */
function gerarHTMLStatus(container, operacoes = []) {
  const statusClass = getStatusClass(container.status);
  
  let html = `
    <div class="status-card">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">
          <i class="fas fa-cube text-primary me-2"></i>Informações do Container
        </h6>
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="limparConsulta()">
          <i class="fas fa-times me-1"></i>Limpar
        </button>
      </div>
      
      <div class="status-info">
        <div class="row">
          <div class="col-md-6">
            <div class="status-item">
              <strong>Número:</strong> 
              <span class="container-number">${container.numero}</span>
            </div>
            <div class="status-item">
              <strong>Status:</strong> 
              <span class="badge ${statusClass}">${formatarStatus(container.status)}</span>
            </div>
            <div class="status-item">
              <strong>Posição Atual:</strong> 
              <span class="posicao-atual">${container.posicao_atual || 'Não informada'}</span>
            </div>
            <div class="status-item">
              <strong>Condição:</strong> 
              <span>${container.condicao || 'N/A'}</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="status-item">
              <strong>Tamanho:</strong> ${container.tamanho || 'N/A'} pés
            </div>
            <div class="status-item">
              <strong>Tipo:</strong> ${container.tipo_container || container.tipo || 'N/A'}
            </div>
            <div class="status-item">
              <strong>Última Atualização:</strong> 
              ${container.ultima_atualizacao ? 
                new Date(container.ultima_atualizacao).toLocaleString('pt-BR') : 'N/A'}
            </div>
          </div>
        </div>
        
        <hr class="my-3">
        
        <div class="row">
          <div class="col-md-6">
            <div class="status-item">
              <strong>Armador:</strong> ${container.armador || container.armador_linha || 'N/A'}
            </div>
            <div class="status-item">
              <strong>Booking:</strong> ${container.booking || 'N/A'}
            </div>
            ${container.capacidade ? `
            <div class="status-item">
              <strong>Capacidade:</strong> ${container.capacidade} kg
            </div>` : ''}
          </div>
          <div class="col-md-6">
            ${container.tara ? `
            <div class="status-item">
              <strong>Tara:</strong> ${container.tara} kg
            </div>` : ''}
            ${container.placa ? `
            <div class="status-item">
              <strong>Placa:</strong> ${container.placa}
            </div>` : ''}
            ${container.vagao ? `
            <div class="status-item">
              <strong>Vagão:</strong> ${container.vagao}
            </div>` : ''}
          </div>
        </div>
        
        ${container.data_vistoria ? `
        <div class="alert alert-info mt-3 mb-0">
          <i class="fas fa-clipboard-check me-2"></i>
          <strong>Última vistoria:</strong> ${new Date(container.data_vistoria).toLocaleString('pt-BR')}
        </div>` : ''}
      </div>
    </div>
  `;
  
  // Adicionar histórico de operações se existir
  if (operacoes && operacoes.length > 0) {
    html += gerarHTMLHistorico(operacoes);
  } else {
    html += `
      <div class="status-card mt-3">
        <h6><i class="fas fa-history text-secondary me-2"></i>Histórico de Operações</h6>
        <div class="alert alert-info mb-0">
          <i class="fas fa-info-circle me-2"></i>
          Nenhuma operação registrada para este container.
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Gera HTML para histórico de operações
 * @param {Array} operacoes - Lista de operações
 * @returns {string} HTML do histórico
 */
function gerarHTMLHistorico(operacoes) {
  let html = `
    <div class="status-card mt-3">
      <h6><i class="fas fa-history text-secondary me-2"></i>Histórico de Operações</h6>
      <div class="status-info">
  `;
  
  operacoes.forEach((operacao, index) => {
    const badgeClass = getBadgeClass(operacao.tipo);
    const isFirst = index === 0;
    
    html += `
      <div class="status-item ${isFirst ? 'operacao-recente' : ''}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <strong>${new Date(operacao.data_operacao).toLocaleString('pt-BR')}</strong>
              ${isFirst ? '<span class="badge bg-warning ms-2">Mais Recente</span>' : ''}
            </div>
            <div class="mb-1">
              <span class="badge bg-${badgeClass} me-2">${operacao.tipo.toUpperCase()}</span>
              ${operacao.modo ? `<span class="text-muted">Modo: ${operacao.modo}</span>` : ''}
            </div>
            ${operacao.posicao ? `<div class="text-muted"><strong>Posição:</strong> ${operacao.posicao}</div>` : ''}
            ${operacao.placa ? `<div class="text-muted"><strong>Placa:</strong> ${operacao.placa}</div>` : ''}
            ${operacao.vagao ? `<div class="text-muted"><strong>Vagão:</strong> ${operacao.vagao}</div>` : ''}
            ${operacao.observacoes ? 
              `<div class="text-muted mt-1"><em>"${operacao.observacoes}"</em></div>` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Retorna classe CSS para status
 * @param {string} status - Status do container
 * @returns {string} Classe CSS
 */
function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case 'no patio':
      return 'bg-success';
    case 'carregado':
      return 'bg-warning';
    case 'em transito':
      return 'bg-info';
    case 'descarregado':
      return 'bg-secondary';
    default:
      return 'bg-secondary';
  }
}

/**
 * Retorna classe CSS para badge baseado no tipo de operação
 * @param {string} tipo - Tipo da operação
 * @returns {string} Classe CSS
 */
function getBadgeClass(tipo) {
  switch (tipo?.toLowerCase()) {
    case 'descarga':
      return 'success';
    case 'carregamento':
      return 'warning';
    case 'movimentacao':
      return 'info';
    default:
      return 'secondary';
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

/**
 * Limpa resultado da consulta
 */
function limparResultadoConsulta() {
  const resultContainer = document.getElementById('resultado-consulta');
  const infoContainer = document.getElementById('info-container');
  
  if (resultContainer) {
    resultContainer.style.display = 'none';
    resultContainer.classList.remove('show');
  }
  
  if (infoContainer) {
    infoContainer.innerHTML = '';
  }
  
  consultaState.ultimaConsulta = null;
  consultaState.resultadoAtual = null;
}

/**
 * Atualiza containers para consulta
 */
async function atualizarContainersConsulta() {
  try {
    // Adicionar animação aos botões de refresh
    const refreshButtons = document.querySelectorAll('#form-consulta .btn-refresh');
    refreshButtons.forEach(btn => {
      btn.classList.add('refreshing');
      btn.disabled = true;
    });
    
    console.log('🔄 Atualizando containers para consulta...');
    
    // Carregar containers
    const containers = await carregarContainers(true);
    
    // Reconfigurar combobox
    const containerInput = document.getElementById('container_consulta');
    if (containerInput) {
      configurarComboboxConsulta(containerInput);
    }
    
    // Remover animação e feedback
    refreshButtons.forEach(btn => {
      btn.classList.remove('refreshing');
      btn.disabled = false;
      btn.classList.add('refresh-success');
      setTimeout(() => btn.classList.remove('refresh-success'), 1000);
    });
    
    // Toast de sucesso
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    
    Toast.fire({
      icon: 'success',
      title: `${containers.length} containers atualizados`
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar containers:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Erro ao atualizar',
      text: 'Não foi possível atualizar a lista de containers.',
      confirmButtonColor: '#d33'
    });
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

/**
 * Mostra alerta
 * @param {string} titulo - Título
 * @param {string} mensagem - Mensagem
 * @param {string} tipo - Tipo do alerta
 */
function mostrarAlerta(titulo, mensagem, tipo) {
  if (typeof window.mostrarAlerta === 'function') {
    window.mostrarAlerta(titulo, mensagem, tipo);
  } else {
    Swal.fire({ title: titulo, text: mensagem, icon: tipo });
  }
}

/**
 * Mostra loading no botão
 * @param {HTMLButtonElement} button - Botão
 */
function showLoading(button) {
  if (typeof window.showLoading === 'function') {
    window.showLoading(button);
  } else if (button) {
    const originalText = button.innerHTML;
    button.setAttribute('data-original-text', originalText);
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
    button.disabled = true;
  }
}

/**
 * Esconde loading do botão
 * @param {HTMLButtonElement} button - Botão
 */
function hideLoading(button) {
  if (typeof window.hideLoading === 'function') {
    window.hideLoading(button);
  } else if (button) {
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
      button.innerHTML = originalText;
    }
    button.disabled = false;
  }
}

// ========================================
// FUNÇÕES PÚBLICAS PARA USO GLOBAL
// ========================================

/**
 * Função global para limpar consulta
 */
function limparConsulta() {
  const containerInput = document.getElementById('container_consulta');
  if (containerInput) {
    containerInput.value = '';
    containerInput.classList.remove('is-valid', 'is-invalid');
    containerInput.focus();
  }
  
  limparResultadoConsulta();
  console.log('🧹 Consulta limpa');
}

/**
 * Função global para inicializar combobox de consulta
 */
function inicializarComboboxConsulta() {
  const containerInput = document.getElementById('container_consulta');
  if (containerInput && consultaState.containersCache.length > 0) {
    configurarComboboxConsulta(containerInput);
    console.log('✅ Combobox de consulta inicializado');
  }
}

// Expor funções globais
window.limparConsulta = limparConsulta;
window.inicializarComboboxConsulta = inicializarComboboxConsulta;

console.log('✅ Módulo de consulta carregado');