// ========================================
// MÓDULO DE UTILITÁRIOS DE INTERFACE
// Centraliza todas as funções auxiliares de UI reutilizadas
// Loading states, alertas, validações, scroll, formatação
// Usado por: todos os módulos
// ========================================

/**
 * Estado interno do módulo de UI
 */
const uiState = {
    // Configurações de scroll
    scrollOffset: 100,
    scrollBehavior: 'smooth',
    
    // Configurações de loading
    loadingButtons: new Set(),
    
    // Configurações de SweetAlert2
    defaultSwalConfig: {
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#ef4444',
      reverseButtons: true
    },
    
    // Cache de elementos DOM
    elementsCache: new Map(),
    
    // Estado de inicialização
    initialized: false
  };
  
  /**
   * Inicializa o módulo de UI
   */
  export function init() {
    if (uiState.initialized) {
      console.log('⚠️ Módulo ui-utils já inicializado');
      return;
    }
    
    console.log('🎨 Inicializando módulo de utilitários de interface...');
    uiState.initialized = true;
    
    // Configurar observadores globais se necessário
    configurarObservadoresGlobais();
    
    console.log('✅ Módulo ui-utils inicializado');
  }
  
  /**
   * Configura observadores globais de UI
   */
  function configurarObservadoresGlobais() {
    // Observador de mudanças de tema/modo escuro (se implementado)
    if ('matchMedia' in window) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', (e) => {
        console.log('🌙 Modo escuro:', e.matches ? 'ativado' : 'desativado');
        // Atualizar estilos se necessário
      });
    }
    
    // Cleanup de elementos cache quando página for recarregada
    window.addEventListener('beforeunload', () => {
      uiState.elementsCache.clear();
      uiState.loadingButtons.clear();
    });
  }
  
  // ========================================
  // FUNÇÕES DE LOADING E ESTADOS
  // ========================================
  
  /**
   * Mostra indicador de carregamento no botão
   * @param {HTMLButtonElement} button - Botão
   * @param {string} text - Texto durante carregamento (opcional)
   */
  export function showLoading(button, text = 'Processando...') {
    if (!button) {
      console.warn('⚠️ Botão não fornecido para showLoading (ui-utils)');
      return;
    }
    
    // Armazenar estado original
    const originalText = button.innerHTML;
    const originalDisabled = button.disabled;
    
    button.setAttribute('data-original-text', originalText);
    button.setAttribute('data-original-disabled', originalDisabled.toString());
    
    // Aplicar estado de loading
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${text}`;
    button.disabled = true;
    button.classList.add('processing');
    
    // Adicionar ao set de botões em loading
    uiState.loadingButtons.add(button);
    
    console.log('🔄 Loading ativado para botão (ui-utils)');
  }
  
  /**
   * Esconde indicador de carregamento do botão
   * @param {HTMLButtonElement} button - Botão
   */
  export function hideLoading(button) {
    if (!button) {
      console.warn('⚠️ Botão não fornecido para hideLoading (ui-utils)');
      return;
    }
    
    // Restaurar estado original
    const originalText = button.getAttribute('data-original-text');
    const originalDisabled = button.getAttribute('data-original-disabled') === 'true';
    
    if (originalText) {
      button.innerHTML = originalText;
      button.removeAttribute('data-original-text');
    }
    
    button.disabled = originalDisabled;
    button.removeAttribute('data-original-disabled');
    button.classList.remove('processing');
    
    // Remover do set de botões em loading
    uiState.loadingButtons.delete(button);
    
    console.log('✅ Loading removido do botão (ui-utils)');
  }
  
  /**
   * Mostra estado de sucesso temporário no botão
   * @param {HTMLButtonElement} button - Botão
   * @param {string} text - Texto de sucesso
   * @param {number} duration - Duração em ms (padrão: 2000)
   */
  export function showButtonSuccess(button, text = '✅ Sucesso!', duration = 2000) {
    if (!button) return;
    
    const originalText = button.innerHTML;
    const originalClass = button.className;
    
    button.innerHTML = text;
    button.classList.add('btn-success');
    button.disabled = true;
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.className = originalClass;
      button.disabled = false;
    }, duration);
  }
  
  /**
   * Mostra estado de erro temporário no botão
   * @param {HTMLButtonElement} button - Botão
   * @param {string} text - Texto de erro
   * @param {number} duration - Duração em ms (padrão: 3000)
   */
  export function showButtonError(button, text = '❌ Erro', duration = 3000) {
    if (!button) return;
    
    const originalText = button.innerHTML;
    const originalClass = button.className;
    
    button.innerHTML = text;
    button.classList.add('btn-danger');
    button.disabled = true;
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.className = originalClass;
      button.disabled = false;
    }, duration);
  }
  
  // ========================================
  // FUNÇÕES DE ALERTAS E NOTIFICAÇÕES
  // ========================================
  
  /**
   * Mostra alerta usando SweetAlert2 com configurações padrão
   * @param {string} titulo - Título do alerta
   * @param {string} mensagem - Mensagem do alerta
   * @param {string} tipo - Tipo: 'success', 'error', 'warning', 'info', 'question'
   * @param {Object} options - Opções adicionais
   */
  export function mostrarAlerta(titulo, mensagem, tipo = 'info', options = {}) {
    if (typeof Swal === 'undefined') {
      console.error('❌ SweetAlert2 não disponível, usando alert nativo (ui-utils)');
      alert(`${titulo}\n\n${mensagem}`);
      return Promise.resolve({ isConfirmed: true });
    }
    
    const config = {
      title: titulo,
      text: mensagem,
      icon: tipo,
      confirmButtonText: 'OK',
      ...uiState.defaultSwalConfig,
      ...options
    };
    
    console.log(`🔔 Alerta exibido: ${tipo} - ${titulo} (ui-utils)`);
    return Swal.fire(config);
  }
  
  /**
   * Mostra notificação toast
   * @param {string} titulo - Título da notificação
   * @param {string} tipo - Tipo: 'success', 'error', 'warning', 'info'
   * @param {Object} options - Opções adicionais
   */
  export function mostrarToast(titulo, tipo = 'info', options = {}) {
    if (typeof Swal === 'undefined') {
      console.log(`📢 Toast: ${titulo} (ui-utils)`);
      return;
    }
    
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
      ...options
    });
    
    console.log(`📢 Toast exibido: ${tipo} - ${titulo} (ui-utils)`);
    return Toast.fire({
      icon: tipo,
      title: titulo
    });
  }
  
  /**
   * Mostra modal de confirmação
   * @param {string} titulo - Título da confirmação
   * @param {string|HTMLElement} mensagem - Mensagem da confirmação ou conteúdo HTML
   * @param {Object} options - Opções adicionais
   */
  export function mostrarConfirmacao(titulo, mensagem, options = {}) {
    if (typeof Swal === 'undefined') {
      console.error('❌ SweetAlert2 não disponível, usando confirm nativo (ui-utils)');
      return Promise.resolve({ isConfirmed: confirm(`${titulo}\n\n${mensagem}`) });
    }
    
    // Verificar se a mensagem contém HTML
    const isHTML = mensagem && (
      mensagem.includes('<') && mensagem.includes('>') ||
      typeof mensagem === 'object'
    );
    
    const config = {
      title: titulo,
      // Usar html ou text dependendo do conteúdo
      ...(isHTML ? { html: mensagem } : { text: mensagem }),
      icon: options.icon || 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      ...uiState.defaultSwalConfig,
      ...options
    };
    
    // Remover icon se não for necessário
    if (options.hideIcon) {
      delete config.icon;
    }
    
    console.log(`❓ Confirmação exibida: ${titulo} (ui-utils)`);
    return Swal.fire(config);
  }
  
  // ========================================
  // FUNÇÕES DE SCROLL E NAVEGAÇÃO
  // ========================================
  
  /**
   * Faz scroll otimizado para mostrar todo o formulário ou elemento
   * @param {HTMLElement} elemento - Elemento para fazer scroll
   * @param {Object} options - Opções de scroll
   */
  export function scrollToFormulario(elemento, options = {}) {
    if (!elemento) {
      console.warn('⚠️ Elemento não fornecido para scrollToFormulario (ui-utils)');
      return;
    }
    
    const {
      offset = uiState.scrollOffset,
      behavior = uiState.scrollBehavior,
      block = 'start'
    } = options;
    
    console.log('📜 Iniciando scroll otimizado para formulário (ui-utils)...');
    
    // Verificar se o elemento está visível
    const rect = elemento.getBoundingClientRect();
    const elementoVisivel = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    // Se o elemento não estiver completamente visível, fazer scroll
    if (!elementoVisivel) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + rect.top - offset),
        behavior: behavior
      });
      
      console.log('📜 Scroll principal aplicado (ui-utils)');
    }
    
    // Scroll adicional para garantir visibilidade completa
    setTimeout(() => {
      const viewportHeight = window.innerHeight;
      const elementoAltura = elemento.offsetHeight;
      
      if (elementoAltura > viewportHeight * 0.7) {
        // Elemento grande - garantir que o topo seja visível
        const novoRect = elemento.getBoundingClientRect();
        if (novoRect.top > offset) {
          window.scrollTo({
            top: Math.max(0, window.scrollY + novoRect.top - offset),
            behavior: behavior
          });
        }
      } else {
        // Elemento menor - tentar centralizar
        const novoRect = elemento.getBoundingClientRect();
        const centroElemento = novoRect.top + (elementoAltura / 2);
        const centroViewport = viewportHeight / 2;
        
        if (Math.abs(centroElemento - centroViewport) > 100) {
          window.scrollTo({
            top: window.scrollY + (centroElemento - centroViewport),
            behavior: behavior
          });
        }
      }
      
      console.log('✅ Scroll otimizado concluído (ui-utils)');
    }, 400);
  }
  
  /**
   * Scroll suave para o topo da página
   */
  export function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: uiState.scrollBehavior
    });
    console.log('⬆️ Scroll para o topo executado (ui-utils)');
  }
  
  /**
   * Scroll suave para elemento por ID
   * @param {string} elementId - ID do elemento
   * @param {Object} options - Opções de scroll
   */
  export function scrollToElement(elementId, options = {}) {
    const elemento = document.getElementById(elementId);
    if (elemento) {
      scrollToFormulario(elemento, options);
    } else {
      console.warn(`⚠️ Elemento com ID '${elementId}' não encontrado (ui-utils)`);
    }
  }
  
  // ========================================
  // FUNÇÕES DE VALIDAÇÃO DE FORMULÁRIOS
  // ========================================
  
  /**
   * Valida um formulário marcando campos obrigatórios
   * @param {HTMLFormElement} form - Formulário a ser validado
   * @param {Object} options - Opções de validação
   * @returns {boolean} True se válido
   */
  export function validateForm(form, options = {}) {
    if (!form) {
      console.warn('⚠️ Formulário não fornecido para validateForm (ui-utils)');
      return false;
    }
    
    const {
      showValidation = true,
      focusFirstInvalid = true,
      customValidators = {}
    } = options;
    
    let isValid = true;
    let firstInvalidField = null;
    const requiredFields = form.querySelectorAll('[required]');
    
    console.log(`🔍 Validando formulário com ${requiredFields.length} campos obrigatórios (ui-utils)`);
    
    requiredFields.forEach((field) => {
      // Remover classes existentes
      if (showValidation) {
        field.classList.remove('is-invalid', 'is-valid');
      }
      
      let fieldValid = true;
      
      // Validação básica
      if (!field.value.trim()) {
        fieldValid = false;
      }
      
      // Validações customizadas
      if (fieldValid && customValidators[field.name]) {
        const customResult = customValidators[field.name](field.value);
        if (!customResult.valid) {
          fieldValid = false;
          mostrarMensagemValidacao(field, customResult.message);
        }
      }
      
      // Aplicar classes visuais
      if (showValidation) {
        if (fieldValid) {
          field.classList.add('is-valid');
        } else {
          field.classList.add('is-invalid');
          if (!firstInvalidField) {
            firstInvalidField = field;
          }
        }
      }
      
      if (!fieldValid) {
        isValid = false;
      }
    });
    
    // Focar no primeiro campo inválido
    if (!isValid && focusFirstInvalid && firstInvalidField) {
      firstInvalidField.focus();
      scrollToFormulario(firstInvalidField, { offset: 150 });
    }
    
    console.log(`${isValid ? '✅' : '❌'} Validação do formulário: ${isValid ? 'válido' : 'inválido'} (ui-utils)`);
    return isValid;
  }
  
  /**
   * Mostra mensagem de validação para um campo
   * @param {HTMLElement} field - Campo do formulário
   * @param {string} message - Mensagem de erro
   */
  function mostrarMensagemValidacao(field, message) {
    const formGroup = field.closest('.form-group') || field.closest('.mb-3') || field.parentElement;
    if (!formGroup) return;
    
    // Remover mensagem existente
    const existingFeedback = formGroup.querySelector('.invalid-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    // Criar nova mensagem
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    formGroup.appendChild(feedback);
  }
  
  /**
   * Limpa todos os formulários removendo valores e estados de validação
   * @param {HTMLFormElement|NodeList|string} target - Formulário, lista de formulários ou seletor
   */
  export function clearAllForms(target = '.operacao-form, form') {
    let forms = [];
    
    if (typeof target === 'string') {
      forms = document.querySelectorAll(target);
    } else if (target.nodeName === 'FORM') {
      forms = [target];
    } else if (target.length !== undefined) {
      forms = Array.from(target);
    }
    
    console.log(`🧹 Limpando ${forms.length} formulário(s) (ui-utils)...`);
    
    forms.forEach(form => {
      resetFormElement(form);
    });
    
    console.log('✅ Formulários limpos (ui-utils)');
  }
  
  /**
   * Reseta um elemento de formulário
   * @param {HTMLFormElement} form - Formulário a ser resetado
   */
  function resetFormElement(form) {
    if (!form || form.nodeName !== 'FORM') return;
    
    // Resetar campos nativos
    if (typeof form.reset === 'function') {
      form.reset();
    }
    
    // Remover estados de validação Bootstrap
    form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
    });
    
    // Limpar mensagens de feedback
    form.querySelectorAll('.invalid-feedback, .valid-feedback').forEach(fb => {
      if (!fb.classList.contains('static-feedback')) {
        fb.innerHTML = '';
      }
    });
    
    // Resetar selects com Choices.js se existirem
    form.querySelectorAll('.choices__inner').forEach(choicesElement => {
      const originalSelect = choicesElement.closest('.choices')?.querySelector('select');
      if (originalSelect && originalSelect.choices) {
        originalSelect.choices.setChoiceByValue('');
      }
    });
  }
  
  // ========================================
  // FUNÇÕES DE FORMATAÇÃO E EXIBIÇÃO
  // ========================================
  
  /**
   * Retorna classe CSS para status do container
   * @param {string} status - Status do container
   * @returns {string} Classe CSS
   */
  export function getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case 'no patio':
        return 'bg-success text-white';
      case 'carregado':
        return 'bg-warning text-dark';
      case 'em transito':
        return 'bg-info text-white';
      case 'descarregado':
        return 'bg-secondary text-white';
      case 'vistoriado':
        return 'bg-primary text-white';
      default:
        return 'bg-secondary text-white';
    }
  }
  
  /**
   * Retorna classe CSS para badge baseado no tipo de operação
   * @param {string} tipo - Tipo da operação
   * @returns {string} Classe CSS
   */
  export function getBadgeClass(tipo) {
    switch (tipo?.toLowerCase()) {
      case 'descarga':
        return 'success';
      case 'carregamento':
        return 'warning';
      case 'movimentacao':
        return 'info';
      case 'consulta':
        return 'primary';
      default:
        return 'secondary';
    }
  }
  
  /**
   * Formata status para exibição
   * @param {string} status - Status bruto
   * @returns {string} Status formatado
   */
  export function formatarStatus(status) {
    switch (status?.toLowerCase()) {
      case 'no patio':
        return 'No Pátio';
      case 'carregado':
        return 'Carregado';
      case 'em transito':
        return 'Em Trânsito';
      case 'descarregado':
        return 'Descarregado';
      case 'vistoriado':
        return 'Vistoriado';
      default:
        return status || 'Indefinido';
    }
  }
  
  /**
   * Formata data para exibição em português
   * @param {string|Date} data - Data para formatar
   * @param {Object} options - Opções de formatação
   * @returns {string} Data formatada
   */
  export function formatarData(data, options = {}) {
    if (!data) return '-';
    
    const {
      incluirHora = true,
      formato = 'pt-BR'
    } = options;
    
    try {
      const dataObj = typeof data === 'string' ? new Date(data) : data;
      
      if (incluirHora) {
        return dataObj.toLocaleString(formato);
      } else {
        return dataObj.toLocaleDateString(formato);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao formatar data (ui-utils):', error);
      return data.toString();
    }
  }
  
  /**
   * Formata número com separadores de milhares
   * @param {number|string} numero - Número para formatar
   * @param {Object} options - Opções de formatação
   * @returns {string} Número formatado
   */
  export function formatarNumero(numero, options = {}) {
    if (numero === null || numero === undefined) return '-';
    
    const {
      locale = 'pt-BR',
      minimumFractionDigits = 0,
      maximumFractionDigits = 2
    } = options;
    
    try {
      return Number(numero).toLocaleString(locale, {
        minimumFractionDigits,
        maximumFractionDigits
      });
    } catch (error) {
      console.warn('⚠️ Erro ao formatar número (ui-utils):', error);
      return numero.toString();
    }
  }
  
  // ========================================
  // FUNÇÕES DE GERAÇÃO DE HTML
  // ========================================
  
  /**
   * Gera HTML para exibir status de container
   * @param {Object} container - Dados do container
   * @param {Array} operacoes - Lista de operações
   * @returns {string} HTML gerado
   */
  export function generateContainerStatusHTML(container, operacoes = []) {
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
            </div>
            <div class="col-md-6">
              <div class="status-item">
                <strong>Tamanho:</strong> ${container.tamanho || 'N/A'} pés
              </div>
              <div class="status-item">
                <strong>Tipo:</strong> ${container.tipo || 'N/A'}
              </div>
              <div class="status-item">
                <strong>Última Atualização:</strong> 
                ${formatarData(container.ultima_atualizacao)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Adicionar histórico se existir
    if (operacoes && operacoes.length > 0) {
      html += generateOperationsHistoryHTML(operacoes);
    }
    
    return html;
  }
  
  /**
   * Gera HTML para histórico de operações
   * @param {Array} operacoes - Lista de operações
   * @returns {string} HTML do histórico
   */
  export function generateOperationsHistoryHTML(operacoes) {
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
                <strong>${formatarData(operacao.data_operacao)}</strong>
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
  
  // ========================================
  // FUNÇÕES DE CSRF E SEGURANÇA
  // ========================================
  
  /**
   * Obtém token CSRF de múltiplas fontes
   * @returns {string|null} Token CSRF ou null se não encontrado
   */
  export function getCsrfToken() {
    console.log('🔍 Buscando token CSRF (ui-utils)...');
    
    // Fontes de token em ordem de prioridade
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
          console.log('✅ Token CSRF obtido (ui-utils)');
          return token;
        }
      } catch (e) {
        // Continuar tentando outras fontes
      }
    }
    
    console.error('❌ Token CSRF não encontrado em nenhuma fonte (ui-utils)');
    return null;
  }
  
  // ========================================
  // FUNÇÕES DE CACHE E PERFORMANCE
  // ========================================
  
  /**
   * Obtém elemento do cache ou busca no DOM
   * @param {string} selector - Seletor CSS
   * @param {boolean} useCache - Se deve usar cache
   * @returns {HTMLElement|null} Elemento encontrado
   */
  export function getElement(selector, useCache = true) {
    if (useCache && uiState.elementsCache.has(selector)) {
      const cached = uiState.elementsCache.get(selector);
      // Verificar se elemento ainda está no DOM
      if (document.contains(cached)) {
        return cached;
      } else {
        uiState.elementsCache.delete(selector);
      }
    }
    
    const element = document.querySelector(selector);
    if (element && useCache) {
      uiState.elementsCache.set(selector, element);
    }
    
    return element;
  }
  
  /**
   * Limpa cache de elementos
   */
  export function clearElementsCache() {
    console.log('🧹 Limpando cache de elementos (ui-utils)');
    uiState.elementsCache.clear();
  }
  
  /**
   * Debounce para funções
   * @param {Function} func - Função para debounce
   * @param {number} delay - Delay em ms
   * @returns {Function} Função com debounce
   */
  export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  /**
   * Throttle para funções
   * @param {Function} func - Função para throttle
   * @param {number} delay - Delay em ms
   * @returns {Function} Função com throttle
   */
  export function throttle(func, delay) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, delay);
      }
    };
  }
  
  // ========================================
  // FUNÇÕES DE LIMPEZA E ESTATÍSTICAS
  // ========================================
  
  /**
   * Para todos os loading states ativos
   */
  export function stopAllLoading() {
    console.log(`🛑 Parando ${uiState.loadingButtons.size} loading states (ui-utils)`);
    
    uiState.loadingButtons.forEach(button => {
      hideLoading(button);
    });
    
    uiState.loadingButtons.clear();
  }
  
  /**
   * Obtém estatísticas do módulo UI
   * @returns {Object} Estatísticas detalhadas
   */
  export function obterEstatisticasUI() {
    return {
      loading: {
        activeButtons: uiState.loadingButtons.size,
        buttonsList: Array.from(uiState.loadingButtons).map(btn => btn.id || btn.textContent?.slice(0, 20))
      },
      cache: {
        elementsCount: uiState.elementsCache.size,
        cachedSelectors: Array.from(uiState.elementsCache.keys())
      },
      config: {
        scrollOffset: uiState.scrollOffset,
        scrollBehavior: uiState.scrollBehavior,
        defaultSwalConfig: uiState.defaultSwalConfig
      },
      estado: {
        initialized: uiState.initialized
      }
    };
  }
  
  /**
   * Cleanup geral do módulo
   */
  export function cleanup() {
    console.log('🧹 Executando cleanup do módulo UI (ui-utils)...');
    
    stopAllLoading();
    clearElementsCache();
    
    console.log('✅ Cleanup do UI concluído (ui-utils)');
  }
  
  // ========================================
  // COMPATIBILIDADE COM CÓDIGO EXISTENTE
  // ========================================
  
  // Expor funções globais para compatibilidade
  if (typeof window !== 'undefined') {
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.mostrarAlerta = mostrarAlerta;
    window.mostrarToast = mostrarToast;
    window.mostrarConfirmacao = mostrarConfirmacao;
    window.scrollToFormulario = scrollToFormulario;
    window.scrollToTop = scrollToTop;
    window.scrollToElement = scrollToElement;
    window.validateForm = validateForm;
    window.clearAllForms = clearAllForms;
    window.getStatusClass = getStatusClass;
    window.getBadgeClass = getBadgeClass;
    window.formatarStatus = formatarStatus;
    window.formatarData = formatarData;
    window.formatarNumero = formatarNumero;
    window.generateContainerStatusHTML = generateContainerStatusHTML;
    window.generateOperationsHistoryHTML = generateOperationsHistoryHTML;
    window.getCsrfToken = getCsrfToken;
    window.getElement = getElement;
    window.debounce = debounce;
    window.throttle = throttle;
    window.stopAllLoading = stopAllLoading;
    window.obterEstatisticasUI = obterEstatisticasUI;
  }
  
  // Auto-inicialização quando carregado
  init();
  
  console.log('✅ Módulo ui-utils carregado e pronto para uso');