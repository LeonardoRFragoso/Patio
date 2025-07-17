// ========================================
// MÓDULO DE GESTÃO DE POSIÇÕES DO PÁTIO
// Centraliza todas as operações com posições de containers
// Validações, formatação, API de posições disponíveis
// Usado por: descarga, movimentação
// ========================================

/**
 * Estado interno do módulo de posições
 */
const posicoesState = {
    // Cache de posições livres
    posicoesLivresCache: [],
    posicoesLivresCacheTime: null,
    
    // Cache de posições disponíveis por status/tamanho
    posicoesDisponiveisCache: new Map(),
    posicoesDisponiveisCacheTime: new Map(),
    
    // TTL do cache (2 minutos - posições mudam frequentemente)
    cacheTTL: 120000,
    
    // Configurações de validação
    formatoPosicao: /^[A-E](0[1-9]|1[0-9]|20)-[1-5]$/,
    baiasValidas: ['A', 'B', 'C', 'D', 'E'],
    posicoesValidas: { min: 1, max: 20 },
    alturasValidas: { min: 1, max: 5 },
    
    // Instâncias do Choices.js para cleanup
    choicesInstances: new Map(),
    
    // Estado de inicialização
    initialized: false
  };
  
  /**
   * Inicializa o módulo de posições
   */
  export function init() {
    if (posicoesState.initialized) {
      console.log('⚠️ Módulo posições já inicializado');
      return;
    }
    
    console.log('📍 Inicializando módulo de gestão de posições...');
    posicoesState.initialized = true;
    
    // Sincronizar com cache global se disponível
    sincronizarComCacheGlobal();
    
    console.log('✅ Módulo posições inicializado');
  }
  
  /**
   * Sincroniza com cache global do appState
   */
  function sincronizarComCacheGlobal() {
    if (window.appState && window.appState.posicoesLivresCache) {
      posicoesState.posicoesLivresCache = window.appState.posicoesLivresCache;
      posicoesState.posicoesLivresCacheTime = window.appState.posicoesLivresCacheTime;
      console.log('🔄 Cache de posições sincronizado com appState global');
    }
  }
  
  /**
   * Carrega posições livres do backend com cache
   * @param {boolean} forceRefresh - Forçar atualização, ignorando cache
   * @returns {Promise<Array<string>>} Lista de posições livres
   */
  export async function carregarPosicoesLivres(forceRefresh = false) {
    try {
      const agora = new Date();
      
      // Verificar cache local
      if (!forceRefresh && 
          posicoesState.posicoesLivresCacheTime && 
          agora - posicoesState.posicoesLivresCacheTime < posicoesState.cacheTTL &&
          posicoesState.posicoesLivresCache.length > 0) {
        console.log('📍 Usando posições livres do cache local (posições)');
        return posicoesState.posicoesLivresCache;
      }
      
      console.log('🔄 Carregando posições livres do backend (posições)...');
      
      const response = await fetch(`/operacoes/posicoes/livres${forceRefresh ? '?refresh=true' : ''}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Atualizar cache local
        posicoesState.posicoesLivresCache = data.data;
        posicoesState.posicoesLivresCacheTime = agora;
        
        // Sincronizar com cache global
        if (window.appState) {
          window.appState.posicoesLivresCache = data.data;
          window.appState.posicoesLivresCacheTime = agora;
        }
        
        console.log(`✅ ${data.data.length} posições livres carregadas (posições)`);
        return data.data;
      } else {
        throw new Error(data.error || 'Formato de resposta inválido para posições livres');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar posições livres (posições):', error);
      
      // Retornar cache antigo se disponível
      if (posicoesState.posicoesLivresCache.length > 0) {
        console.warn('⚠️ Usando cache antigo de posições livres como fallback (posições)');
        return posicoesState.posicoesLivresCache;
      }
      
      return [];
    }
  }
  
  /**
   * Carrega posições disponíveis da API com filtros avançados
   * @param {Object} options - Opções de filtro
   * @param {string} options.status - Status do container (CHEIO/VAZIO)
   * @param {number} options.containerSize - Tamanho do container (20/40 pés)
   * @param {string} options.unidade - Unidade (SUZANO, etc.)
   * @param {boolean} forceRefresh - Forçar atualização do cache
   * @returns {Promise<Array>} Lista de posições disponíveis
   */
  export async function carregarPosicoesDisponiveis(options = {}, forceRefresh = false) {
    const {
      status = 'CHEIO',
      containerSize = 20,
      unidade = 'SUZANO'
    } = options;
    
    const cacheKey = `${status}_${containerSize}_${unidade}`;
    const agora = new Date();
    
    try {
      // Verificar cache específico
      if (!forceRefresh && 
          posicoesState.posicoesDisponiveisCacheTime.has(cacheKey) &&
          agora - posicoesState.posicoesDisponiveisCacheTime.get(cacheKey) < posicoesState.cacheTTL &&
          posicoesState.posicoesDisponiveisCache.has(cacheKey)) {
        console.log(`📍 Usando posições disponíveis do cache local (${cacheKey}) (posições)`);
        return posicoesState.posicoesDisponiveisCache.get(cacheKey);
      }
      
      console.log(`🔄 Carregando posições disponíveis (${cacheKey}) (posições)...`);
      
      // Construir URL com parâmetros
      const params = new URLSearchParams({
        status: status,
        unidade: unidade
      });
      
      const response = await fetch(`/api/posicoes/disponiveis?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.posicoes)) {
        // Filtrar posições por tamanho do container
        const posicoesFiltradas = filtrarPosicoesPorTamanho(result.posicoes, containerSize);
        
        // Ordenar posições
        const posicoesOrdenadas = ordenarPosicoes(posicoesFiltradas);
        
        // Atualizar cache específico
        posicoesState.posicoesDisponiveisCache.set(cacheKey, posicoesOrdenadas);
        posicoesState.posicoesDisponiveisCacheTime.set(cacheKey, agora);
        
        console.log(`✅ ${posicoesOrdenadas.length} posições disponíveis carregadas (${cacheKey}) (posições)`);
        return posicoesOrdenadas;
      } else {
        throw new Error(result.error || 'Formato de resposta inválido da API de posições');
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar posições disponíveis (${cacheKey}) (posições):`, error);
      
      // Retornar cache antigo se disponível
      if (posicoesState.posicoesDisponiveisCache.has(cacheKey)) {
        console.warn(`⚠️ Usando cache antigo de posições disponíveis (${cacheKey}) como fallback (posições)`);
        return posicoesState.posicoesDisponiveisCache.get(cacheKey);
      }
      
      return [];
    }
  }
  
  /**
   * Filtra posições baseado no tamanho do container
   * @param {Array} posicoes - Lista de posições
   * @param {number} containerSize - Tamanho do container (20/40 pés)
   * @returns {Array} Posições filtradas
   */
  function filtrarPosicoesPorTamanho(posicoes, containerSize) {
    return posicoes.filter(posicao => {
      const posNumero = parseInt(posicao.baia_posicao.substring(1), 10);
      
      if (containerSize === 20) {
        return posNumero % 2 !== 0; // Posições ímpares para 20 pés
      } else if (containerSize === 40) {
        return posNumero % 2 === 0; // Posições pares para 40 pés
      }
      
      return true; // Se tamanho não especificado, retornar todas
    });
  }
  
  /**
   * Ordena posições por baia, posição e altura
   * @param {Array} posicoes - Lista de posições
   * @returns {Array} Posições ordenadas
   */
  function ordenarPosicoes(posicoes) {
    return posicoes.sort((a, b) => {
      // Primeiro por baia (A, B, C, D, E)
      if (a.baia_posicao[0] !== b.baia_posicao[0]) {
        return a.baia_posicao[0].localeCompare(b.baia_posicao[0]);
      }
      
      // Depois por posição numérica
      const posA = parseInt(a.baia_posicao.substring(1), 10);
      const posB = parseInt(b.baia_posicao.substring(1), 10);
      if (posA !== posB) {
        return posA - posB;
      }
      
      // Por último por altura
      return a.altura - b.altura;
    });
  }
  
  /**
   * Cria datalist de posições livres para input simples
   * @param {HTMLInputElement} inputEl - Input que usará o datalist
   * @param {Array<string>} posicoes - Lista de posições livres
   */
  export function criarDatalistPosicoesDescarga(inputEl, posicoes) {
    if (!inputEl || !Array.isArray(posicoes)) {
      console.warn('⚠️ Parâmetros inválidos para criarDatalistPosicoesDescarga (posições)');
      return;
    }
    
    // Se Choices.js estiver disponível, usar dropdown avançado
    if (window.Choices) {
      try {
        return configurarChoicesParaPosicoes(inputEl, posicoes);
      } catch (err) {
        console.warn('⚠️ Falha ao inicializar Choices.js, usando datalist tradicional (posições)', err);
      }
    }
    
    // Fallback para datalist nativo
    configurarDatalistNativo(inputEl, posicoes);
  }
  
  /**
   * Configura Choices.js para posições
   * @param {HTMLInputElement} inputEl - Input element
   * @param {Array} posicoes - Lista de posições
   */
  function configurarChoicesParaPosicoes(inputEl, posicoes) {
    // Converter lista simples em objetos value/label
    const choicesData = posicoes.map(p => ({
      value: p,
      label: `✓ ${p} (Disponível)`
    }));
    
    // Destruir instância existente se houver
    const instanceKey = inputEl.id || 'default';
    if (posicoesState.choicesInstances.has(instanceKey)) {
      posicoesState.choicesInstances.get(instanceKey).destroy();
      posicoesState.choicesInstances.delete(instanceKey);
    }
    
    // Criar nova instância
    const choices = new Choices(inputEl, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: '',
      noResultsText: 'Nenhuma posição encontrada',
      noChoicesText: 'Nenhuma posição disponível',
      classNames: { containerInner: 'choices__inner big-input' },
      choices: choicesData.length > 0 ? choicesData : [
        { value: '', label: 'Nenhuma posição disponível', disabled: true }
      ]
    });
    
    // Armazenar instância para cleanup posterior
    posicoesState.choicesInstances.set(instanceKey, choices);
    
    console.log(`✅ Choices.js configurado para posições (${choicesData.length} posições) (posições)`);
    return choices;
  }
  
  /**
   * Configura datalist nativo para posições
   * @param {HTMLInputElement} inputEl - Input element
   * @param {Array} posicoes - Lista de posições
   */
  function configurarDatalistNativo(inputEl, posicoes) {
    // Remover datalist antigo, se existir
    const datalistId = `datalist-posicoes-${inputEl.id || 'default'}`;
    const antigoDatalist = document.getElementById(datalistId);
    if (antigoDatalist) antigoDatalist.remove();
    
    // Criar novo datalist
    const dl = document.createElement('datalist');
    dl.id = datalistId;
    
    posicoes.forEach(pos => {
      const opt = document.createElement('option');
      opt.value = pos;
      opt.textContent = `${pos} (Disponível)`;
      dl.appendChild(opt);
    });
    
    document.body.appendChild(dl);
    inputEl.setAttribute('list', datalistId);
    
    console.log(`✅ Datalist nativo configurado para posições (${posicoes.length} posições) (posições)`);
  }
  
  /**
   * Configura dropdown avançado de posições com Choices.js
   * @param {HTMLSelectElement} selectElement - Elemento select
   * @param {Array} posicoes - Lista de posições disponíveis
   * @param {Object} options - Opções de configuração
   */
  export function configurarDropdownPosicoes(selectElement, posicoes, options = {}) {
    const {
      placeholder = 'Selecione uma posição',
      showSearch = true,
      containerSize = 20
    } = options;
    
    if (!selectElement || !Array.isArray(posicoes)) {
      console.warn('⚠️ Parâmetros inválidos para configurarDropdownPosicoes (posições)');
      return null;
    }
    
    try {
      // Limpar select
      selectElement.innerHTML = '<option value="" selected disabled>Carregando posições...</option>';
      
      // Preparar dados para Choices.js
      const choicesData = posicoes.map(p => ({
        value: p.posicao_completa || p,
        label: typeof p === 'object' 
          ? `✓ ${p.baia_posicao}-${p.altura} (Pos ${p.baia_posicao.substring(1).padStart(2,'0')}, Altura ${p.altura})`
          : `✓ ${p} (Disponível)`
      }));
      
      // Destruir instância existente
      const instanceKey = selectElement.id || 'select-default';
      if (posicoesState.choicesInstances.has(instanceKey)) {
        posicoesState.choicesInstances.get(instanceKey).destroy();
        posicoesState.choicesInstances.delete(instanceKey);
      }
      
      // Limpar select novamente
      selectElement.innerHTML = '';
      
      // Criar nova instância
      const choices = new Choices(selectElement, {
        searchEnabled: showSearch,
        shouldSort: false,
        itemSelectText: '',
        placeholderValue: placeholder,
        noResultsText: 'Nenhuma posição encontrada',
        noChoicesText: 'Nenhuma posição disponível',
        classNames: { containerInner: 'choices__inner' }
      });
      
      // Configurar opções
      if (choicesData.length > 0) {
        choices.setChoices(choicesData, 'value', 'label', true);
      } else {
        choices.setChoices([{ 
          value: '', 
          label: 'Nenhuma posição disponível', 
          disabled: true 
        }], 'value', 'label', true);
      }
      
      // Armazenar instância
      posicoesState.choicesInstances.set(instanceKey, choices);
      
      console.log(`✅ Dropdown de posições configurado (${choicesData.length} posições) (posições)`);
      return choices;
      
    } catch (error) {
      console.error('❌ Erro ao configurar dropdown de posições (posições):', error);
      
      // Fallback para select nativo
      configurarSelectNativo(selectElement, posicoes);
      return null;
    }
  }
  
  /**
   * Configura select nativo como fallback
   * @param {HTMLSelectElement} selectElement - Elemento select
   * @param {Array} posicoes - Lista de posições
   */
  function configurarSelectNativo(selectElement, posicoes) {
    selectElement.innerHTML = '<option value="" selected disabled>Selecione uma posição</option>';
    
    posicoes.forEach(posicao => {
      const option = document.createElement('option');
      
      if (typeof posicao === 'object') {
        option.value = posicao.posicao_completa;
        option.textContent = `${posicao.baia_posicao}-${posicao.altura} (Altura ${posicao.altura})`;
      } else {
        option.value = posicao;
        option.textContent = posicao;
      }
      
      selectElement.appendChild(option);
    });
    
    console.log(`✅ Select nativo configurado (${posicoes.length} posições) (posições)`);
  }
  
  /**
   * Valida se uma posição está no formato A01-1
   * @param {string} posicao - A posição a ser validada
   * @returns {Object} Resultado da validação { valido: boolean, mensagem: string }
   */
  export function validarFormatoPosicao(posicao) {
    // Caso especial para carregamento
    if (posicao === 'EM TRANSITO') {
      return { valido: true, mensagem: '' };
    }
    
    // Verificar se está vazio
    if (!posicao || posicao.trim() === '') {
      return { 
        valido: false, 
        mensagem: 'A posição não pode estar vazia' 
      };
    }
    
    const posicaoLimpa = posicao.trim().toUpperCase();
    
    // Verificar formato geral
    if (!posicoesState.formatoPosicao.test(posicaoLimpa)) {
      return { 
        valido: false, 
        mensagem: `Formato de posição inválido: ${posicao}. Use o formato A01-1 (baia + 2 dígitos + hífen + altura).` 
      };
    }
    
    // Extrair componentes
    const baia = posicaoLimpa[0];
    const posicaoNumero = parseInt(posicaoLimpa.substring(1, 3));
    const altura = parseInt(posicaoLimpa[4]);
    
    // Validar baia
    if (!posicoesState.baiasValidas.includes(baia)) {
      return { 
        valido: false, 
        mensagem: `Baia inválida: ${baia}. Baias válidas são ${posicoesState.baiasValidas.join(', ')}.` 
      };
    }
    
    // Validar posição
    if (posicaoNumero < posicoesState.posicoesValidas.min || posicaoNumero > posicoesState.posicoesValidas.max) {
      return { 
        valido: false, 
        mensagem: `Número de posição inválido: ${posicaoNumero}. Deve estar entre ${posicoesState.posicoesValidas.min.toString().padStart(2,'0')} e ${posicoesState.posicoesValidas.max}.` 
      };
    }
    
    // Validar altura
    if (altura < posicoesState.alturasValidas.min || altura > posicoesState.alturasValidas.max) {
      return { 
        valido: false, 
        mensagem: `Altura inválida: ${altura}. Deve estar entre ${posicoesState.alturasValidas.min} e ${posicoesState.alturasValidas.max}.` 
      };
    }
    
    return { valido: true, mensagem: '' };
  }
  
  /**
   * Aplica máscara de formatação para posição no formato A01-1
   * @param {HTMLInputElement} input - Elemento de input da posição
   * @param {Object} options - Opções de configuração
   */
  export function aplicarMascaraPosicao(input, options = {}) {
    const {
      showValidation = true,
      onValidationChange = null
    } = options;
    
    if (!input) {
      console.warn('⚠️ Input não fornecido para aplicarMascaraPosicao (posições)');
      return;
    }
    
    // Event listener para formatação
    input.addEventListener('input', function(e) {
      let valor = e.target.value.toUpperCase();
      
      // Remove caracteres inválidos
      valor = valor.replace(/[^A-Z0-9-]/g, '');
      
      // Aplica a formatação A01-1
      if (valor.length >= 1) {
        // Garante que o primeiro caractere seja letra válida
        let letra = valor[0];
        if (!posicoesState.baiasValidas.includes(letra)) {
          letra = 'A'; // Default para A se inválida
        }
        
        let resto = valor.substring(1).replace(/[^0-9-]/g, '');
        
        // Processa os números
        if (resto.length > 0) {
          // Insere o hífen após o segundo dígito se não houver
          if (resto.length >= 2 && !resto.includes('-')) {
            resto = resto.substring(0, 2) + '-' + resto.substring(2);
          }
          
          // Limita o tamanho total (A01-1 = 5 caracteres)
          if (resto.length > 4) {
            resto = resto.substring(0, 4);
          }
        }
        
        valor = letra + resto;
      }
      
      e.target.value = valor;
      
      // Aplicar validação visual se habilitada
      if (showValidation) {
        aplicarValidacaoVisual(e.target, valor, onValidationChange);
      }
    });
    
    // Event listener para validação no blur
    if (showValidation) {
      input.addEventListener('blur', function(e) {
        const posicao = e.target.value;
        if (posicao && posicao !== 'EM TRANSITO') {
          aplicarValidacaoVisual(e.target, posicao, onValidationChange);
        }
      });
    }
    
    console.log(`✅ Máscara de posição aplicada ao input ${input.id || 'sem-id'} (posições)`);
  }
  
  /**
   * Aplica validação visual ao input
   * @param {HTMLInputElement} input - Input element
   * @param {string} valor - Valor para validar
   * @param {Function} callback - Callback para mudanças de validação
   */
  function aplicarValidacaoVisual(input, valor, callback) {
    const resultado = validarFormatoPosicao(valor);
    
    // Remover classes existentes
    input.classList.remove('is-invalid', 'is-valid');
    
    // Aplicar classe baseada na validação
    if (valor.length === 0) {
      // Campo vazio - sem validação visual
      return;
    } else if (!resultado.valido) {
      input.classList.add('is-invalid');
      mostrarMensagemValidacao(input, resultado.mensagem, 'invalid');
    } else {
      input.classList.add('is-valid');
      mostrarMensagemValidacao(input, 'Formato válido', 'valid');
    }
    
    // Chamar callback se fornecido
    if (typeof callback === 'function') {
      callback(resultado, input);
    }
  }
  
  /**
   * Mostra mensagem de validação
   * @param {HTMLInputElement} input - Input element
   * @param {string} mensagem - Mensagem a exibir
   * @param {string} tipo - Tipo: 'valid' ou 'invalid'
   */
  function mostrarMensagemValidacao(input, mensagem, tipo) {
    const formGroup = input.closest('.form-group') || input.closest('.mb-3') || input.parentElement;
    if (!formGroup) return;
    
    // Remover mensagens existentes
    const existingFeedback = formGroup.querySelector('.invalid-feedback, .valid-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    // Criar nova mensagem
    const feedbackElement = document.createElement('div');
    feedbackElement.className = tipo === 'valid' ? 'valid-feedback' : 'invalid-feedback';
    feedbackElement.textContent = mensagem;
    
    formGroup.appendChild(feedbackElement);
  }
  
  /**
   * Verifica se uma posição está disponível
   * @param {string} posicao - Posição para verificar
   * @param {Object} filtros - Filtros adicionais
   * @returns {Promise<boolean>} Se a posição está disponível
   */
  export async function verificarPosicaoDisponivel(posicao, filtros = {}) {
    try {
      console.log(`🔍 Verificando disponibilidade da posição: ${posicao} (posições)`);
      
      // Validar formato primeiro
      const validacao = validarFormatoPosicao(posicao);
      if (!validacao.valido) {
        console.warn(`⚠️ Posição ${posicao} tem formato inválido (posições):`, validacao.mensagem);
        return false;
      }
      
      // Carregar posições disponíveis
      const posicoesDisponiveis = await carregarPosicoesDisponiveis(filtros);
      
      // Verificar se a posição está na lista
      const disponivel = posicoesDisponiveis.some(p => {
        const posicaoCompleta = typeof p === 'object' ? p.posicao_completa : p;
        return posicaoCompleta === posicao;
      });
      
      console.log(`${disponivel ? '✅' : '❌'} Posição ${posicao} ${disponivel ? 'disponível' : 'não disponível'} (posições)`);
      return disponivel;
      
    } catch (error) {
      console.error(`❌ Erro ao verificar disponibilidade da posição ${posicao} (posições):`, error);
      return false;
    }
  }
  
  /**
   * Limpa cache de posições
   * @param {string} tipo - Tipo: 'livres', 'disponiveis', 'all'
   */
  export function limparCachePosicoes(tipo = 'all') {
    console.log(`🧹 Limpando cache de posições - Tipo: ${tipo} (posições)`);
    
    switch (tipo) {
      case 'livres':
        posicoesState.posicoesLivresCache = [];
        posicoesState.posicoesLivresCacheTime = null;
        break;
      case 'disponiveis':
        posicoesState.posicoesDisponiveisCache.clear();
        posicoesState.posicoesDisponiveisCacheTime.clear();
        break;
      case 'all':
      default:
        posicoesState.posicoesLivresCache = [];
        posicoesState.posicoesLivresCacheTime = null;
        posicoesState.posicoesDisponiveisCache.clear();
        posicoesState.posicoesDisponiveisCacheTime.clear();
        break;
    }
    
    // Sincronizar com cache global para posições livres
    if (window.appState && tipo !== 'disponiveis') {
      window.appState.posicoesLivresCache = null;
      window.appState.posicoesLivresCacheTime = null;
    }
    
    console.log('✅ Cache de posições limpo (posições)');
  }
  
  /**
   * Cleanup de instâncias Choices.js
   */
  export function cleanup() {
    console.log('🧹 Limpando instâncias Choices.js (posições)...');
    
    posicoesState.choicesInstances.forEach((instance, key) => {
      try {
        instance.destroy();
        console.log(`✅ Instância Choices.js ${key} destruída (posições)`);
      } catch (error) {
        console.warn(`⚠️ Erro ao destruir instância Choices.js ${key} (posições):`, error);
      }
    });
    
    posicoesState.choicesInstances.clear();
    console.log('✅ Cleanup de posições concluído');
  }
  
  /**
   * Obtém estatísticas do módulo de posições
   * @returns {Object} Estatísticas detalhadas
   */
  export function obterEstatisticasPosicoes() {
    const agora = new Date();
    
    return {
      cache: {
        posicoesLivres: {
          count: posicoesState.posicoesLivresCache.length,
          lastUpdate: posicoesState.posicoesLivresCacheTime,
          isExpired: posicoesState.posicoesLivresCacheTime ? 
            (agora - posicoesState.posicoesLivresCacheTime > posicoesState.cacheTTL) : true
        },
        posicoesDisponiveis: {
          cacheKeys: Array.from(posicoesState.posicoesDisponiveisCache.keys()),
          totalCached: posicoesState.posicoesDisponiveisCache.size
        }
      },
      choices: {
        activeInstances: posicoesState.choicesInstances.size,
        instanceKeys: Array.from(posicoesState.choicesInstances.keys())
      },
      config: {
        cacheTTL: posicoesState.cacheTTL,
        formatoPosicao: posicoesState.formatoPosicao.source,
        baiasValidas: posicoesState.baiasValidas,
        posicoesValidas: posicoesState.posicoesValidas,
        alturasValidas: posicoesState.alturasValidas
      },
      estado: {
        initialized: posicoesState.initialized
      }
    };
  }
  
  // ========================================
  // COMPATIBILIDADE COM CÓDIGO EXISTENTE
  // ========================================
  
  // Expor funções globais para compatibilidade
  if (typeof window !== 'undefined') {
    window.carregarPosicoesLivres = carregarPosicoesLivres;
    window.carregarPosicoesDisponiveis = carregarPosicoesDisponiveis;
    window.criarDatalistPosicoesDescarga = criarDatalistPosicoesDescarga;
    window.configurarDropdownPosicoes = configurarDropdownPosicoes;
    window.validarFormatoPosicao = validarFormatoPosicao;
    window.aplicarMascaraPosicao = aplicarMascaraPosicao;
    window.verificarPosicaoDisponivel = verificarPosicaoDisponivel;
    window.limparCachePosicoes = limparCachePosicoes;
    window.obterEstatisticasPosicoes = obterEstatisticasPosicoes;
  }
  
  // Auto-inicialização quando carregado
  init();
  
  console.log('✅ Módulo posições carregado e pronto para uso');