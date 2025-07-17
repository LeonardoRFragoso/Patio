// ========================================
// MÓDULO DE CARREGAMENTO
// Gerencia toda a lógica relacionada ao carregamento de containers
// ========================================

import { fetchContainersAvailable } from './api.js';

/**
 * Estado interno do módulo de carregamento
 */
const carregamentoState = {
  currentMode: null, // 'rodoviaria' | 'ferroviaria'
  containersDisponiveis: [],
  containersCache: [],
  containersCacheTime: null,
  placasCache: [],
  initialized: false
};

/**
 * Inicializa o módulo de carregamento
 * @param {Object} options - Opções de inicialização
 * @param {Object} options.appState - Estado global da aplicação
 */
export function init(options = {}) {
  console.log('🚛 Inicializando módulo de carregamento...');
  
  const { appState } = options;
  
  if (carregamentoState.initialized) {
    console.log('⚠️ Módulo de carregamento já inicializado');
    return;
  }
  
  // Configurar estado inicial
  carregamentoState.initialized = true;
  
  // Mostrar a operação de carregamento
  mostrarOperacaoCarregamento();
  
  // Configurar event listeners
  configurarEventListeners();
  
  // Carregar dados necessários
  carregarDadosIniciais();
  
  console.log('✅ Módulo de carregamento inicializado com sucesso');
}

/**
 * Mostra a operação de carregamento com sub-opções
 */
function mostrarOperacaoCarregamento() {
  console.log('📱 Exibindo operação de carregamento...');
  
  // Garantir que a seção de carregamento está visível
  const operacaoCarregamento = document.getElementById('operacao-carregamento');
  if (operacaoCarregamento) {
    operacaoCarregamento.style.display = 'block';
    
    // Scroll para a seção
    setTimeout(() => {
      const subOpcoes = operacaoCarregamento.querySelector('.sub-opcoes');
      if (subOpcoes) {
        scrollToFormulario(subOpcoes);
        console.log('✅ Scroll aplicado para sub-opções de carregamento');
      }
    }, 300);
  } else {
    console.error('❌ Elemento operacao-carregamento não encontrado');
  }
}

/**
 * Configura event listeners para carregamento
 */
function configurarEventListeners() {
  console.log('🔧 Configurando event listeners de carregamento...');
  
  // Event listeners para sub-opções
  configurarSubOpcoes();
  
  // Event listeners para formulários
  configurarFormularios();
  
  // Event listeners para botões de refresh
  configurarBotoesRefresh();
  
  console.log('✅ Event listeners de carregamento configurados');
}

/**
 * Configura event listeners para sub-opções
 */
function configurarSubOpcoes() {
  // Sub-opção rodoviária
  const btnRodoviario = document.querySelector('.sub-opcao-btn[onclick*="rodoviaria"]');
  if (btnRodoviario) {
    btnRodoviario.addEventListener('click', (e) => {
      e.preventDefault();
      mostrarSubOpcaoCarregamento('rodoviaria');
    });
  }
  
  // Sub-opção ferroviária
  const btnFerroviario = document.querySelector('.sub-opcao-btn[onclick*="ferroviaria"]');
  if (btnFerroviario) {
    btnFerroviario.addEventListener('click', (e) => {
      e.preventDefault();
      mostrarSubOpcaoCarregamento('ferroviaria');
    });
  }
}

/**
 * Configura formulários de carregamento
 */
function configurarFormularios() {
  // Formulário rodoviário (usar elemento <form> real)
  const formRodoviario = document.getElementById('formCarregamentoRodoviario');
  if (formRodoviario) {
    // Remover event listeners existentes
    const novoForm = formRodoviario.cloneNode(true);
    formRodoviario.parentNode.replaceChild(novoForm, formRodoviario);
    
    novoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processarCarregamento('rodoviaria', novoForm);
    });
    
    console.log('✅ Formulário rodoviário configurado');
  }
  
  // Formulário ferroviário (usar elemento <form> real)
  const formFerroviario = document.getElementById('formCarregamentoFerroviario');
  if (formFerroviario) {
    // Remover event listeners existentes
    const novoForm = formFerroviario.cloneNode(true);
    formFerroviario.parentNode.replaceChild(novoForm, formFerroviario);
    
    novoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processarCarregamento('ferroviaria', novoForm);
    });
    
    console.log('✅ Formulário ferroviário configurado');
  }
}

/**
 * Configura botões de refresh
 */
function configurarBotoesRefresh() {
  const botoesRefresh = document.querySelectorAll('#form-carregamento-rodoviario .btn-refresh, #form-carregamento-ferroviario .btn-refresh');
  
  botoesRefresh.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await atualizarContainersCarregamento();
    });
  });
}

/**
 * Mostra sub-opção de carregamento
 * @param {string} modo - Modo de carregamento ('rodoviaria' | 'ferroviaria')
 */
async function mostrarSubOpcaoCarregamento(modo) {
  console.log(`📱 Mostrando sub-opção de carregamento: ${modo}`);
  
  carregamentoState.currentMode = modo;
  
  // Esconder outros formulários
  esconderTodosFormulariosCarregamento();
  
  // Ativar botão de sub-opção
  ativarBotaoSubOpcao(modo);
  
  // Mostrar formulário específico
  const formId = `form-carregamento-${modo === 'rodoviaria' ? 'rodoviario' : 'ferroviario'}`;
  const form = document.getElementById(formId);
  
  if (form) {
    form.style.display = 'block';
    form.classList.add('show');
    
    // Carregar containers disponíveis
    await carregarContainersDisponiveis();
    
    // Configurar combobox de containers
    configurarComboboxContainer(modo);
    
    // Configurar combobox de placas (se rodoviário)
    if (modo === 'rodoviaria') {
      configurarComboboxPlacas();
    }
    
    // Scroll para o formulário
    setTimeout(() => {
      scrollToFormulario(form);
    }, 200);
    
    console.log(`✅ Formulário de carregamento ${modo} exibido`);
  } else {
    console.error(`❌ Formulário ${formId} não encontrado`);
  }
}

/**
 * Esconde todos os formulários de carregamento
 */
function esconderTodosFormulariosCarregamento() {
  const formularios = [
    'form-carregamento-rodoviario',
    'form-carregamento-ferroviario'
  ];
  
  formularios.forEach(id => {
    const form = document.getElementById(id);
    if (form) {
      form.style.display = 'none';
      form.classList.remove('show');
    }
  });
}

/**
 * Ativa o botão de sub-opção
 * @param {string} modo - Modo de carregamento
 */
function ativarBotaoSubOpcao(modo) {
  // Remover classe ativa de todos os botões
  document.querySelectorAll('.sub-opcao-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Ativar botão específico
  const selector = `.sub-opcao-btn[onclick*="${modo}"]`;
  const btn = document.querySelector(selector);
  if (btn) {
    btn.classList.add('active');
  }
}

/**
 * Carrega dados iniciais necessários
 */
async function carregarDadosIniciais() {
  console.log('🔄 Carregando dados iniciais para carregamento...');
  
  try {
    // Carregar containers disponíveis
    await carregarContainersDisponiveis();
    
    // Carregar placas
    await carregarPlacas();
    
    console.log('✅ Dados iniciais carregados');
  } catch (error) {
    console.error('❌ Erro ao carregar dados iniciais:', error);
  }
}

/**
 * Carrega containers disponíveis para carregamento
 * @param {boolean} forceRefresh - Forçar atualização do cache
 * @returns {Array} Lista de containers disponíveis
 */
async function carregarContainersDisponiveis(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache local
    if (!forceRefresh && 
        carregamentoState.containersCacheTime && 
        agora - carregamentoState.containersCacheTime < 120000 &&
        carregamentoState.containersCache.length > 0) {
      console.log('📦 Usando containers do cache local');
      return carregamentoState.containersCache;
    }
    
    console.log('🔄 Carregando containers do banco de dados...');
    
    // Tentar usar a função do módulo API primeiro
    let containersData;
    if (typeof fetchContainersAvailable === 'function') {
      containersData = await fetchContainersAvailable(forceRefresh);
    } else {
      // Fallback para fetch direto
      const response = await fetch(`/operacoes/containers/lista${forceRefresh ? '?refresh=true' : ''}`);
      const result = await response.json();
      containersData = result.success ? result.data : [];
    }
    
    // Filtrar apenas containers disponíveis para carregamento
    const containersDisponiveis = containersData.filter(container => 
      container.status === 'no patio' || container.status === 'carregado'
    );
    
    // Atualizar cache
    carregamentoState.containersCache = containersDisponiveis;
    carregamentoState.containersCacheTime = agora;
    carregamentoState.containersDisponiveis = containersDisponiveis;
    
    console.log(`✅ ${containersDisponiveis.length} containers disponíveis para carregamento`);
    return containersDisponiveis;
    
  } catch (error) {
    console.error('❌ Erro ao carregar containers disponíveis:', error);
    return [];
  }
}

/**
 * Carrega placas da planilha
 * @param {boolean} forceRefresh - Forçar atualização
 * @returns {Array} Lista de placas
 */
async function carregarPlacas(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache (usar cache global se disponível)
    if (!forceRefresh && 
        window.appState?.placasCacheTime && 
        agora - window.appState.placasCacheTime < 300000 &&
        window.appState.placasCache?.length > 0) {
      carregamentoState.placasCache = window.appState.placasCache;
      return carregamentoState.placasCache;
    }
    
    console.log('🔄 Carregando placas da planilha...');
    
    const response = await fetch(`/api/sharepoint/placas/lista${forceRefresh ? '?refresh=true' : ''}`);
    const result = await response.json();
    
    if (result.success) {
      carregamentoState.placasCache = result.data;
      
      // Atualizar cache global
      if (window.appState) {
        window.appState.placasCache = result.data;
        window.appState.placasCacheTime = agora;
      }
      
      console.log(`✅ ${result.data.length} placas carregadas`);
      return result.data;
    } else {
      console.error('❌ Erro ao carregar placas:', result.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Erro na requisição de placas:', error);
    return [];
  }
}

/**
 * Configura combobox de containers para carregamento
 * @param {string} modo - Modo de carregamento
 */
function configurarComboboxContainer(modo) {
  const inputId = modo === 'rodoviaria' ? 'container_carregamento_rod' : 'container_carregamento_fer';
  const inputElement = document.getElementById(inputId);
  
  if (!inputElement) {
    console.error(`❌ Campo ${inputId} não encontrado`);
    return;
  }
  
  // Limpar event listeners existentes
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);
  
  // Configurar autocomplete
  newInput.setAttribute('autocomplete', 'off');
  
  // Event listeners
  newInput.addEventListener('input', function() {
    mostrarSugestoesContainers(this, carregamentoState.containersDisponiveis);
  });
  
  newInput.addEventListener('focus', function() {
    mostrarSugestoesContainers(this, carregamentoState.containersDisponiveis);
  });
  
  console.log(`✅ Combobox de container configurado para ${modo}`);
}

/**
 * Configura combobox de placas
 */
function configurarComboboxPlacas() {
const placaInput = document.getElementById('placa_carregamento_rod');
if (!placaInput) {
  console.error('❌ Campo placa_carregamento_rod não encontrado');
  return;
}

// Se o módulo de placas já estiver carregado, usar implementação oficial
if (typeof window.criarComboboxPlacas === 'function') {
  try {
    window.criarComboboxPlacas(placaInput, null, {
      showRefreshButton: true,
      maxSuggestions: 15,
    });
    console.log('✅ Combobox de placas configurado via módulo placas.js');
    return;
  } catch (err) {
    console.warn('⚠️ Falha ao usar criarComboboxPlacas do módulo placas.js, fallback interno será usado:', err);
  }
}

// ------------------------------
// Fallback simples (implementação anterior)
// ------------------------------
// Limpar event listeners existentes
const newInput = placaInput.cloneNode(true);
placaInput.parentNode.replaceChild(newInput, placaInput);

newInput.setAttribute('autocomplete', 'off');

newInput.addEventListener('input', function () {
  mostrarSugestoesPlacas(this, carregamentoState.placasCache);
});

newInput.addEventListener('focus', function () {
  mostrarSugestoesPlacas(this, carregamentoState.placasCache);
});

console.log('✅ Combobox de placas configurado (fallback interno)');
}

/**
 * Mostra sugestões de containers
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 */
function mostrarSugestoesContainers(input, containers) {
  // Remover lista existente
  const existingList = document.querySelector('.combobox-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.toUpperCase();
  
  // Filtrar containers
  const containersFiltrados = containers
    .filter(container => 
      container.numero.toUpperCase().includes(termo) &&
      (container.status === 'no patio' || container.status === 'carregado') &&
      container.posicao_atual
    )
    .slice(0, 10);
  
  if (containersFiltrados.length === 0) return;
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'combobox-suggestions';
  
  containersFiltrados.forEach(container => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    
    item.innerHTML = `
      <div>
        <strong>${container.numero}</strong>
        <div class="suggestion-meta">Posição: ${container.posicao_atual}</div>
      </div>
      <div class="suggestion-meta">${container.status}</div>
    `;
    
    item.addEventListener('click', function() {
      input.value = container.numero;
      input.classList.add('is-valid');
      suggestionsList.remove();
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
 * Mostra sugestões de placas
 * @param {HTMLElement} input - Campo de input
 * @param {Array} placas - Lista de placas
 */
function mostrarSugestoesPlacas(input, placas) {
  // Remover lista existente
  const existingList = document.querySelector('.placas-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.toUpperCase();
  
  // Filtrar placas
  const placasFiltradas = placas
    .filter(placa => placa.toUpperCase().includes(termo))
    .slice(0, 15);
  
  if (placasFiltradas.length === 0) return;
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'placas-suggestions';
  suggestionsList.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 2px;
  `;
  
  placasFiltradas.forEach(placa => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = placa;
    item.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s;
    `;
    
    item.addEventListener('click', function() {
      input.value = placa;
      input.classList.add('is-valid');
      suggestionsList.remove();
      input.focus();
    });
    
    suggestionsList.appendChild(item);
  });
  
  // Adicionar à página
  input.parentElement.appendChild(suggestionsList);
  
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
 * Processa o carregamento
 * @param {string} modo - Modo de carregamento
 * @param {HTMLFormElement} form - Formulário
 */
async function processarCarregamento(modo, form) {
  console.log(`📝 Processando carregamento ${modo}...`);
  
  try {
    // Obter dados do formulário
    const formData = new FormData(form);
    const container = formData.get('container_id');
    const observacoes = formData.get('observacoes') || '';
    
    let placa, vagao;
    
    if (modo === 'rodoviaria') {
      placa = formData.get('placa');
      if (!container || !placa) {
        mostrarAlerta('Dados incompletos', 'Por favor, preencha o número do container e a placa do caminhão.', 'warning');
        return;
      }
    } else if (modo === 'ferroviaria') {
      vagao = formData.get('vagao');
      if (!container || !vagao) {
        mostrarAlerta('Dados incompletos', 'Por favor, preencha o número do container e o número do vagão.', 'warning');
        return;
      }
    }
    
    // Validar se container está disponível
    const containerDisponivel = await verificarContainerDisponivel(container);
    if (!containerDisponivel) {
      mostrarAlerta('Container indisponível', 'O container selecionado não está disponível para carregamento.', 'error');
      return;
    }
    
    // Desabilitar botão de submit
    const submitBtn = form.querySelector('button[type="submit"]');
    showLoading(submitBtn);
    
    // Preparar dados para envio
    const dadosCarregamento = {
      numero_container: container,
      tipo_operacao: 'carregamento',
      posicao: 'EM TRANSITO',
      observacoes: observacoes,
      modo: modo
    };
    
    if (modo === 'rodoviaria') {
      dadosCarregamento.placa = placa;
    } else if (modo === 'ferroviaria') {
      dadosCarregamento.vagao = vagao;
    }
    
    // Obter token CSRF
    const csrfToken = await obterTokenCSRF();
    
    // Enviar dados
    const response = await fetch('/operacoes/registrar_operacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify(dadosCarregamento)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Sucesso
      Swal.fire({
        icon: 'success',
        title: 'Carregamento registrado!',
        text: `Container ${container} foi carregado com sucesso.`,
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745'
      }).then(() => {
        limparFormulario(form);
        
        // Voltar ao início após delay
        setTimeout(() => {
          if (typeof window.voltarInicio === 'function') {
            window.voltarInicio();
          }
        }, 1000);
      });
      
      // Atualizar cache de containers
      await carregarContainersDisponiveis(true);
      
    } else {
      // Erro
      Swal.fire({
        icon: 'error',
        title: 'Erro ao registrar carregamento',
        text: result.error || 'Ocorreu um erro inesperado.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar carregamento:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Erro de conexão',
      text: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#d33'
    });
    
  } finally {
    // Re-habilitar botão
    const submitBtn = form.querySelector('button[type="submit"]');
    hideLoading(submitBtn);
  }
}

/**
 * Verifica se container está disponível para carregamento
 * @param {string} numeroContainer - Número do container
 * @returns {boolean} Se está disponível
 */
async function verificarContainerDisponivel(numeroContainer) {
  if (!numeroContainer) return false;
  
  try {
    // Verificar no cache primeiro
    const containerCached = carregamentoState.containersDisponiveis.find(
      c => c.numero.toUpperCase() === numeroContainer.toUpperCase()
    );
    
    if (containerCached) {
      return true;
    }
    
    // Verificar na API
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(numeroContainer)}`);
    const data = await response.json();
    
    if (!data.container) return false;
    
    return data.container.status === 'no patio' && data.container.posicao_atual;
    
  } catch (error) {
    console.error('❌ Erro ao verificar container:', error);
    return false;
  }
}

/**
 * Atualiza containers para carregamento
 */
async function atualizarContainersCarregamento() {
  try {
    // Adicionar animação aos botões de refresh
    const refreshButtons = document.querySelectorAll('#form-carregamento-rodoviario .btn-refresh, #form-carregamento-ferroviario .btn-refresh');
    refreshButtons.forEach(btn => {
      btn.classList.add('refreshing');
      btn.disabled = true;
    });
    
    console.log('🔄 Atualizando containers para carregamento...');
    
    // Carregar containers
    const containers = await carregarContainersDisponiveis(true);
    
    // Reconfigurar comboboxes
    if (carregamentoState.currentMode) {
      configurarComboboxContainer(carregamentoState.currentMode);
    }
    
    // Remover animação e feedback
    refreshButtons.forEach(btn => {
      btn.classList.remove('refreshing');
      btn.disabled = false;
      btn.classList.add('refresh-success');
      setTimeout(() => btn.classList.remove('refresh-success'), 1000);
    });
    
    // Toast de sucesso
    if (containers.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Nenhum container disponível',
        text: 'Não há containers disponíveis para carregamento.',
        confirmButtonColor: '#3085d6'
      });
    } else {
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
    }
    
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

/**
 * Limpa formulário
 * @param {HTMLFormElement} form - Formulário a ser limpo
 */
function limparFormulario(form) {
  form.reset();
  
  // Remover classes de validação
  form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
    el.classList.remove('is-valid', 'is-invalid');
  });
  
  // Limpar feedbacks
  form.querySelectorAll('.invalid-feedback, .valid-feedback').forEach(fb => {
    fb.innerHTML = '';
  });
}

/**
 * Obtém token CSRF
 * @returns {string} Token CSRF
 */
async function obterTokenCSRF() {
  try {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    return data.csrf_token;
  } catch (error) {
    console.warn('⚠️ Erro ao obter token CSRF:', error);
    return '';
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
 * Função global para mostrar sub-opção de carregamento
 * @param {string} modo - Modo de carregamento
 */
window.mostrarSubOpcaoCarregamento = mostrarSubOpcaoCarregamento;

console.log('✅ Módulo de carregamento carregado');