// ========================================
// MÓDULO DE MOVIMENTAÇÃO
// Gerencia toda a lógica relacionada à movimentação de containers
// ========================================

import { fetchContainers } from './api.js';

/**
 * Estado interno do módulo de movimentação
 */
const movimentacaoState = {
  containersCache: [],
  containersCacheTime: null,
  currentContainer: null,
  posicaoAtual: null,
  initialized: false
};

/**
 * Inicializa o módulo de movimentação
 * @param {Object} options - Opções de inicialização
 * @param {Object} options.appState - Estado global da aplicação
 */
export function init(options = {}) {
  console.log('🔄 Inicializando módulo de movimentação...');
  
  const { appState } = options;
  
  // SEMPRE reinicializar - remover verificação de inicialização
  if (movimentacaoState.initialized) {
    console.log('🔄 Reinicializando módulo de movimentação...');
  } else {
    console.log('🆕 Primeira inicialização do módulo de movimentação');
  }
  
  // Configurar estado inicial
  movimentacaoState.initialized = true;
  
  // Mostrar a operação de movimentação
  mostrarOperacaoMovimentacao();
  
  // Configurar event listeners
  configurarEventListeners();
  
  // Carregar dados necessários
  carregarDadosIniciais();
  
  console.log('✅ Módulo de movimentação inicializado com sucesso');
}

/**
 * Mostra a operação de movimentação
 */
function mostrarOperacaoMovimentacao() {
  console.log('📱 Exibindo operação de movimentação...');
  
  // Garantir que a seção de movimentação está visível
  const operacaoMovimentacao = document.getElementById('operacao-movimentacao');
  if (operacaoMovimentacao) {
    operacaoMovimentacao.style.display = 'block';
    
    // Mostrar formulário diretamente (movimentação não tem sub-opções)
    setTimeout(() => {
      mostrarFormularioMovimentacao();
    }, 250);
  } else {
    console.error('❌ Elemento operacao-movimentacao não encontrado');
  }
}

/**
 * Mostra o formulário de movimentação
 */
function mostrarFormularioMovimentacao() {
  const formMovimentacao = document.getElementById('form-movimentacao');
  if (formMovimentacao) {
    console.log('📱 Mostrando formulário de movimentação');
    formMovimentacao.classList.add('show');
    formMovimentacao.style.display = 'block';
    
    // Scroll otimizado para o formulário
    setTimeout(() => {
      scrollToFormulario(formMovimentacao);
    }, 150);
  } else {
    console.error('❌ Formulário de movimentação não encontrado');
  }
}

/**
 * Configura event listeners para movimentação
 */
function configurarEventListeners() {
  console.log('🔧 Configurando event listeners de movimentação...');
  
  // Configurar formulário
  configurarFormulario();
  
  // Configurar campos específicos
  configurarCampos();
  
  // Configurar botões de refresh
  configurarBotoesRefresh();
  
  console.log('✅ Event listeners de movimentação configurados');
}

/**
 * Configura o formulário de movimentação
 */
function configurarFormulario() {
  const formMovimentacao = document.getElementById('form-movimentacao');
  if (formMovimentacao) {
    // Remover event listeners existentes
    const novoForm = formMovimentacao.cloneNode(true);
    formMovimentacao.parentNode.replaceChild(novoForm, formMovimentacao);
    
    novoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validar formato das posições antes de enviar
      if (!validarFormatosDePositions(novoForm)) {
        return;
      }
      
      confirmarMovimentacao(novoForm);
    });
    
    console.log('✅ Formulário de movimentação configurado');
  }
}

/**
 * Configura campos específicos de movimentação
 */
function configurarCampos() {
  // Campo de container com busca automática de posição
  const containerInput = document.getElementById('container_movimentacao');
  if (containerInput) {
    configurarComboboxContainer(containerInput);
    
    // Event listener para buscar posição quando container for selecionado
    containerInput.addEventListener('change', async function() {
      const containerNumero = this.value.trim();
      if (containerNumero && containerNumero.length >= 4) {
        await atualizarPosicaoAtual(containerNumero);
      }
    });
  }
  
  // Campos de posição com formatação automática A01-1
  configurarCamposPosicao();
}

/**
 * Configura combobox de containers para movimentação
 * @param {HTMLElement} inputElement - Campo de input
 */
function configurarComboboxContainer(inputElement) {
  if (!inputElement) return;
  
  // Limpar event listeners existentes
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);
  
  // Configurar autocomplete
  newInput.setAttribute('autocomplete', 'off');
  
  // Event listeners
  newInput.addEventListener('input', function() {
    mostrarSugestoesContainers(this, movimentacaoState.containersCache);
  });
  
  newInput.addEventListener('focus', function() {
    mostrarSugestoesContainers(this, movimentacaoState.containersCache);
  });
  
  console.log('✅ Combobox de container configurado para movimentação');
}

/**
 * Configura campos de posição com formatação automática
 */
function configurarCamposPosicao() {
  const camposPosicao = [
    'posicao_original',
    'posicao_nova'
  ];
  
  camposPosicao.forEach(campoId => {
    const campo = document.getElementById(campoId);
    if (campo) {
      aplicarMascaraPosicao(campo);
      console.log(`✅ Máscara de posição aplicada ao campo ${campoId}`);
    }
  });
}

/**
 * Configura botões de refresh
 */
function configurarBotoesRefresh() {
  const botoesRefresh = document.querySelectorAll('#form-movimentacao .btn-refresh');

  botoesRefresh.forEach(btn => {
    // Se o botão já possui handler inline para carregar posições, não sobrescrever
    const inline = btn.getAttribute('onclick') || '';
    if (inline.includes('carregarPosicoesMovimentacao')) {
      // Este botão deve atualizar somente as posições, manter comportamento original
      return;
    }

    // Remover event listeners anteriores clonando o nó
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);

    // Adicionar listener para atualizar containers
    novoBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await atualizarContainersMovimentacao();
    });
  });
}

/**
 * Carrega dados iniciais necessários
 */
async function carregarDadosIniciais() {
  console.log('🔄 Carregando dados iniciais para movimentação...');
  
  try {
    // Carregar containers disponíveis
    await carregarContainers();
    
    console.log('✅ Dados iniciais carregados');
  } catch (error) {
    console.error('❌ Erro ao carregar dados iniciais:', error);
  }
}

/**
 * Carrega containers disponíveis para movimentação
 * @param {boolean} forceRefresh - Forçar atualização do cache
 * @returns {Array} Lista de containers
 */
async function carregarContainers(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache local
    if (!forceRefresh && 
        movimentacaoState.containersCacheTime && 
        agora - movimentacaoState.containersCacheTime < 120000 &&
        movimentacaoState.containersCache.length > 0) {
      console.log('📦 Usando containers do cache local');
      return movimentacaoState.containersCache;
    }
    
    console.log('🔄 Carregando containers do banco de dados...');
    
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
    movimentacaoState.containersCache = containersData;
    movimentacaoState.containersCacheTime = agora;
    
    console.log(`✅ ${containersData.length} containers carregados para movimentação`);
    return containersData;
    
  } catch (error) {
    console.error('❌ Erro ao carregar containers:', error);
    return [];
  }
}

/**
 * Mostra sugestões de containers para movimentação
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 */
function mostrarSugestoesContainers(input, containers) {
  // Se o input tem o atributo data-selection-active, não mostrar sugestões
  if (input.getAttribute('data-selection-active') === 'true') {
    input.removeAttribute('data-selection-active');
    return;
  }
  
  // Remover lista existente
  const existingList = document.querySelector('.combobox-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.toUpperCase();
  
  // Filtrar containers disponíveis para movimentação (no pátio ou carregados)
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
    
    item.addEventListener('mouseenter', function() {
      this.style.backgroundColor = 'var(--bg-glass)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'white';
    });
    
    item.addEventListener('click', async function() {
      input.value = container.numero;
      input.classList.add('is-valid');
      
      // Definir flag que previne a reabertura imediata do dropdown
      input.setAttribute('data-selection-active', 'true');
      
      // Remover lista de sugestões
      suggestionsList.remove();
      
      // Buscar e preencher posição automaticamente
      await atualizarPosicaoAtual(container.numero);
      
      // Carregar posições disponíveis para movimentação
      await carregarPosicoesDisponiveis(container.numero);
      
      // Disparar evento de change
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
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
 * Busca a posição atual de um container específico
 * @param {string} containerNumero - Número do container
 * @returns {Object} Resultado da busca
 */
async function buscarPosicaoContainer(containerNumero) {
  try {
    console.log(`🔍 Buscando posição do container: ${containerNumero}`);
    
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(containerNumero)}`);
    const result = await response.json();
    
    if (result.success && result.container) {
      return {
        success: true,
        posicao: result.container.posicao_atual,
        status: result.container.status
      };
    } else {
      return {
        success: false,
        error: result.message || 'Container não encontrado'
      };
    }
  } catch (error) {
    console.error('❌ Erro ao buscar posição do container:', error);
    return {
      success: false,
      error: 'Erro de conexão'
    };
  }
}

/**
 * Carrega posições disponíveis para movimentação de forma robusta
 * @param {string} containerNumero - Número do container
 */
async function carregarPosicoesDisponiveis(containerNumero) {
  console.log(' [MOVIMENTACAO] Carregando posições disponíveis para:', containerNumero);
  
  const select = document.getElementById('posicao_nova');
  if (!select || !containerNumero) {
    console.error(' [MOVIMENTACAO] Elementos não encontrados ou container vazio');
    return false;
  }
  
  try {
    // Mostrar loading
    select.innerHTML = '<option value=""> Carregando posições...</option>';
    select.disabled = true;
    
    // 1. Buscar dados do container
    const containerResp = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(containerNumero)}`);
    const containerData = await containerResp.json();
    
    if (!containerData.success) {
      throw new Error(containerData.message || 'Container não encontrado');
    }
    
    const container = containerData.container;
    const containerSize = parseInt(container.tamanho) || 20;
    const statusContainer = container.status || 'CHEIO';
    const posicaoAtual = container.posicao_atual;
    
    console.log(` [MOVIMENTACAO] Container: ${containerSize}TEU, status: ${statusContainer}, posição atual: ${posicaoAtual}`);
    
    // 2. Buscar posições disponíveis
    const posicoesResp = await fetch(`/api/posicoes/disponiveis?status=${statusContainer}&unidade=SUZANO&container_size=${containerSize}`);
    const posicoesResult = await posicoesResp.json();
    
    if (!posicoesResult.success) {
      throw new Error('Erro ao buscar posições disponíveis');
    }
    
    // 3. Processar posições (excluir posição atual)
    const posicoes = posicoesResult.posicoes
      .map(p => `${p.baia_posicao}-${p.altura}`)
      .filter(p => p !== posicaoAtual)
      .sort();
    
    console.log(` [MOVIMENTACAO] Encontradas ${posicoes.length} posições disponíveis (excluindo ${posicaoAtual})`);
    
    if (posicoes.length === 0) {
      select.innerHTML = '<option value=""> Nenhuma posição disponível</option>';
      select.disabled = true;
      console.warn(' [MOVIMENTACAO] Nenhuma posição disponível para movimentação');
      return false;
    }
    
    // 4. Construir HTML com organizador hierárquico
    let html = '<option value="">Selecione a nova posição</option>';
    
    // Usar organizador hierárquico se disponível
    if (window.organizarComboboxPosicoes && posicoes.length <= 50) {
      console.log(' [MOVIMENTACAO] Usando organizador hierárquico');
      const posicoesObj = posicoes.map(pos => {
        const [baia, altura] = pos.split('-');
        return { baia_posicao: baia, altura: parseInt(altura) };
      });
      
      try {
        const htmlOrganizado = window.organizarComboboxPosicoes(posicoesObj, 'movimentacao');
        if (htmlOrganizado && htmlOrganizado.trim()) {
          html = '<option value="">Selecione a nova posição</option>' + htmlOrganizado;
        } else {
          throw new Error('Organizador retornou HTML vazio');
        }
      } catch (orgError) {
        console.warn(' [MOVIMENTACAO] Erro no organizador, usando fallback simples:', orgError);
        html = criarHTMLSimplesPosicoes(posicoes);
      }
    } else {
      console.log(' [MOVIMENTACAO] Usando organização simples (fallback)');
      html = criarHTMLSimplesPosicoes(posicoes);
    }
    
    // 5. Atualizar select de forma segura
    select.innerHTML = html;
    select.disabled = false;
    
    console.log(` [MOVIMENTACAO] ${posicoes.length} posições carregadas com sucesso`);
    
    return true;
    
  } catch (error) {
    console.error(' [MOVIMENTACAO] Erro ao carregar posições:', error);
    
    select.innerHTML = '<option value=""> Erro - Tente novamente</option>';
    select.disabled = false;
    
    return false;
  }
}

/**
 * Cria HTML simples para posições (fallback)
 * @param {Array} posicoes - Array de posições
 * @returns {string} HTML das opções
 */
function criarHTMLSimplesPosicoes(posicoes) {
  let html = '';
  
  // Agrupar por bay para melhor UX
  const porBay = {};
  posicoes.forEach(pos => {
    const bay = pos[0];
    if (!porBay[bay]) porBay[bay] = [];
    porBay[bay].push(pos);
  });
  
  // Construir optgroups
  Object.keys(porBay).sort().forEach(bay => {
    html += `<optgroup label="Bay ${bay} (${porBay[bay].length} posições)">`;
    porBay[bay].forEach(pos => {
      html += `<option value="${pos}">${pos}</option>`;
    });
    html += '</optgroup>';
  });
  
  return html;
}

/**
 * Atualiza a posição atual do container automaticamente
 * @param {string} containerNumero - Número do container
 */
async function atualizarPosicaoAtual(containerNumero) {
  const posicaoField = document.getElementById('posicao_original');
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
      
      // Armazenar posição atual no estado
      movimentacaoState.currentContainer = containerNumero;
      movimentacaoState.posicaoAtual = resultado.posicao;
      
      console.log(`✅ Posição encontrada: ${resultado.posicao}`);
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
      
      console.warn(`⚠️ ${resultado.error}`);
    }
    
    // Esconder indicador após 3 segundos
    if (statusIndicator) {
      setTimeout(() => {
        statusIndicator.style.display = 'none';
      }, 3000);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar posição:', error);
    
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
 * Valida formatos de posição no formulário
 * @param {HTMLFormElement} form - Formulário
 * @returns {boolean} Se todas as posições são válidas
 */
function validarFormatosDePositions(form) {
  let todasValidas = true;
  
  // Validar posição original
  const posicaoOriginalInput = form.querySelector('input[name="posicao_original"]');
  if (posicaoOriginalInput && posicaoOriginalInput.value) {
    const resultadoOriginal = validarFormatoPosicao(posicaoOriginalInput.value);
    if (!resultadoOriginal.valido) {
      mostrarAlerta('Erro de Formato', `Posição original: ${resultadoOriginal.mensagem}`, 'error');
      todasValidas = false;
    }
  }
  
  // Validar nova posição
  const posicaoNovaInput = form.querySelector('input[name="posicao"]');
  if (posicaoNovaInput && posicaoNovaInput.value) {
    const resultadoNova = validarFormatoPosicao(posicaoNovaInput.value);
    if (!resultadoNova.valido) {
      mostrarAlerta('Erro de Formato', `Nova posição: ${resultadoNova.mensagem}`, 'error');
      todasValidas = false;
    }
  }
  
  return todasValidas;
}

/**
 * Confirma e processa a movimentação
 * @param {HTMLFormElement} form - Formulário de movimentação
 */
async function confirmarMovimentacao(form) {
  try {
    console.log('🔧 Iniciando confirmação de movimentação...');
    
    // Obter dados do formulário
    const container = document.getElementById('container_movimentacao').value;
    const posicaoOriginal = document.getElementById('posicao_original').value;
    const posicaoNova = document.getElementById('posicao_nova').value;
    const observacoes = document.getElementById('observacoes_movimentacao').value;
    
    console.log('🔧 Dados do formulário:', {
      container,
      posicaoOriginal,
      posicaoNova,
      observacoes
    });
    
    // Validar dados obrigatórios
    if (!container || !posicaoNova) {
      Swal.fire({
        icon: 'error',
        title: 'Dados incompletos',
        text: 'Por favor, preencha o número do container e a nova posição.',
        confirmButtonColor: '#dc3545'
      });
      return;
    }
    
    // Verificar se as posições são diferentes
    if (posicaoOriginal === posicaoNova) {
      Swal.fire({
        icon: 'warning',
        title: 'Posições iguais',
        text: 'A nova posição deve ser diferente da posição atual.',
        confirmButtonColor: '#f39c12'
      });
      return;
    }
    
    // Exibir modal de confirmação
    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirmar Movimentação',
      html: `
        <div class="text-left">
          <p><strong>Container:</strong> ${container}</p>
          <p><strong>Posição Atual:</strong> ${posicaoOriginal}</p>
          <p><strong>Nova Posição:</strong> ${posicaoNova}</p>
          ${observacoes ? `<p><strong>Observações:</strong> ${observacoes}</p>` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      reverseButtons: true
    });
    
    // Se confirmado, processar movimentação
    if (result.isConfirmed) {
      await processarMovimentacao({
        container,
        posicaoOriginal,
        posicaoNova,
        observacoes
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao confirmar movimentação:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Ocorreu um erro ao processar a movimentação. Tente novamente.',
      confirmButtonColor: '#dc3545'
    });
  }
}

/**
 * Processa a movimentação no servidor
 * @param {Object} dados - Dados da movimentação
 */
async function processarMovimentacao(dados) {
  try {
    // Mostrar loading
    Swal.fire({
      title: 'Processando...',
      text: 'Registrando movimentação, aguarde...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Obter token CSRF
    const csrfToken = await obterTokenCSRF();
    
    // Preparar dados para envio
    const dadosMovimentacao = {
      numero_container: dados.container,
      tipo_operacao: 'movimentacao',
      posicao: dados.posicaoNova,
      posicao_anterior: dados.posicaoOriginal,
      modo: 'manual',
      observacoes: dados.observacoes || ''
    };
    
    // Enviar dados via AJAX
    const response = await fetch('/operacoes/registrar_operacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify(dadosMovimentacao)
    });
    
    const result = await response.json();
    
    console.log('🔧 Resposta do servidor:', result);
    
    if (result.success) {
      console.log('🎉 Movimentação bem-sucedida!');
      
      // Atualizar formulário com nova posição
      document.getElementById('posicao_original').value = dados.posicaoNova;
      
      // Limpar campos
      document.getElementById('posicao_nova').value = '';
      document.getElementById('observacoes_movimentacao').value = '';
      
      // Mostrar mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: result.message || 'Movimentação registrada com sucesso!',
        confirmButtonColor: '#28a745'
      });
      
      // Atualizar cache de containers
      await atualizarCacheContainers();
      
    } else {
      // Mostrar mensagem de erro
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: result.message || 'Ocorreu um erro ao processar a movimentação.',
        confirmButtonColor: '#dc3545'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao processar movimentação:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Ocorreu um erro ao processar a movimentação. Tente novamente.',
      confirmButtonColor: '#dc3545'
    });
  }
}

/**
 * Atualiza cache de containers
 */
async function atualizarCacheContainers() {
  try {
    await carregarContainers(true);
    
    // Atualizar cache global se disponível
    if (window.appState && typeof window.carregarContainers === 'function') {
      await window.carregarContainers(true);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar cache de containers:', error);
  }
}

/**
 * Atualiza containers para movimentação
 */
async function atualizarContainersMovimentacao() {
  try {
    // Adicionar animação aos botões de refresh
    const refreshButtons = document.querySelectorAll('#form-movimentacao .btn-refresh');
    refreshButtons.forEach(btn => {
      btn.classList.add('refreshing');
      btn.disabled = true;
    });
    
    console.log('🔄 Atualizando containers para movimentação...');
    
    // Carregar containers
    const containers = await carregarContainers(true);
    
    // Reconfigurar combobox
    const containerInput = document.getElementById('container_movimentacao');
    if (containerInput) {
      configurarComboboxContainer(containerInput);
    }
    
    // Remover animação e feedback
    refreshButtons.forEach(btn => {
      btn.classList.remove('refreshing');
      btn.disabled = false;
      btn.classList.add('refresh-success');
      setTimeout(() => btn.classList.remove('refresh-success'), 1000);
    });
    
    // Log silencioso de sucesso (sem toast interferente)
    console.log(`✅ [MOVIMENTACAO] ${containers.length} containers carregados para movimentação`);
    
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
 * Valida formato de posição A01-1
 * @param {string} posicao - Posição a ser validada
 * @returns {Object} Resultado da validação
 */
function validarFormatoPosicao(posicao) {
  if (typeof window.validarFormatoPosicao === 'function') {
    return window.validarFormatoPosicao(posicao);
  }
  
  // Fallback básico
  const padrao = /^[A-E][0-9]{2}-[1-5]$/;
  if (!padrao.test(posicao)) {
    return {
      valido: false,
      mensagem: 'Formato inválido. Use A01-1 (letra + 2 dígitos + hífen + 1 dígito)'
    };
  }
  
  return { valido: true, mensagem: '' };
}

/**
 * Aplica máscara de posição A01-1
 * @param {HTMLInputElement} input - Campo de input
 */
function aplicarMascaraPosicao(input) {
  if (typeof window.aplicarMascaraPosicao === 'function') {
    window.aplicarMascaraPosicao(input);
    return;
  }
  
  // Fallback básico
  input.addEventListener('input', function(e) {
    let valor = e.target.value.toUpperCase();
    valor = valor.replace(/[^A-Z0-9-]/g, '');
    
    if (valor.length >= 1) {
      const letra = valor[0];
      let resto = valor.substring(1).replace(/[^0-9-]/g, '');
      
      if (resto.length >= 2 && !resto.includes('-')) {
        resto = resto.substring(0, 2) + '-' + resto.substring(2);
      }
      
      if (resto.length > 4) {
        resto = resto.substring(0, 4);
      }
      
      valor = letra + resto;
    }
    
    e.target.value = valor;
  });
}

// ========================================
// EXPORTAÇÕES GLOBAIS PARA COMPATIBILIDADE
// ========================================

// Exportar funções principais para uso global
window.carregarPosicoesMovimentacao = carregarPosicoesDisponiveis;
window.carregarPosicoesDisponiveis = carregarPosicoesDisponiveis;
window.atualizarContainersMovimentacao = atualizarContainersMovimentacao;
window.buscarPosicaoContainer = buscarPosicaoContainer;

// Aliases para compatibilidade com scripts antigos
window.carregarPosicoes = carregarPosicoesDisponiveis;
window.atualizarPosicoes = carregarPosicoesDisponiveis;

console.log('✅ Módulo de movimentação carregado');
console.log('🔗 Funções exportadas globalmente: carregarPosicoesMovimentacao, carregarPosicoesDisponiveis, atualizarContainersMovimentacao');
console.log('🔄 Aliases compatíveis: carregarPosicoes, atualizarPosicoes');