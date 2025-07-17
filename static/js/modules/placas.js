// ========================================
// MÓDULO DE GESTÃO DE PLACAS
// Centraliza todas as operações com placas de caminhões
// Integração com planilha SharePoint/OneDrive
// Usado por: carregamento rodoviário
// ========================================

/**
 * Estado interno do módulo de placas
 */
const placasState = {
  // Cache de placas
  placasCache: [],
  placasCacheTime: null,
  
  // TTL do cache (5 minutos - mais longo que containers)
  cacheTTL: 300000,
  
  // Estado de carregamento
  isLoading: false,
  lastError: null,
  
  // Estatísticas
  totalPlacas: 0,
  lastUpdateSource: null,
  
  // Estado de inicialização
  initialized: false
};

/**
 * Inicializa o módulo de placas
 */
export function init() {
  // SEMPRE reinicializar - remover verificação de inicialização
  if (placasState.initialized) {
    console.log('🔄 Reinicializando módulo de placas...');
  } else {
    console.log('🆕 Primeira inicialização do módulo de placas');
  }
  
  console.log('📋 Inicializando módulo de gestão de placas...');
  placasState.initialized = true;
  
  // Sincronizar com cache global se disponível
  sincronizarComCacheGlobal();
  
  console.log('✅ Módulo placas inicializado');
}

/**
 * Sincroniza com cache global do appState
 */
function sincronizarComCacheGlobal() {
  if (window.appState && window.appState.placasCache && window.appState.placasCache.length > 0) {
    placasState.placasCache = window.appState.placasCache;
    placasState.placasCacheTime = window.appState.placasCacheTime;
    placasState.totalPlacas = placasState.placasCache.length;
    console.log('🔄 Cache de placas sincronizado com appState global');
  }
}

/**
 * Carrega placas da planilha SharePoint/OneDrive com cache local
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Promise<Array>} Lista de placas
 */
export async function carregarPlacas(forceRefresh = false) {
  try {
    const agora = new Date();
    
    // Verificar cache local (válido por 5 minutos)
    if (!forceRefresh && 
        placasState.placasCacheTime && 
        agora - placasState.placasCacheTime < placasState.cacheTTL &&
        placasState.placasCache.length > 0) {
      console.log('📋 Usando placas do cache local (placas)');
      return placasState.placasCache;
    }
    
    console.log('🔄 Carregando placas da planilha SharePoint/OneDrive (placas)...');
    
    // Marcar como carregando
    placasState.isLoading = true;
    placasState.lastError = null;
    
    const response = await fetch(`/api/sharepoint/placas/lista${forceRefresh ? '?refresh=true' : ''}`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      // Atualizar cache local
      placasState.placasCache = result.data;
      placasState.placasCacheTime = agora;
      placasState.totalPlacas = result.data.length;
      placasState.lastUpdateSource = 'sharepoint';
      
      // Sincronizar com cache global
      if (window.appState) {
        window.appState.placasCache = result.data;
        window.appState.placasCacheTime = agora;
      }
      
      console.log(`✅ ${result.data.length} placas carregadas da planilha (placas)`);
      return result.data;
    } else {
      throw new Error(result.error || 'Formato de resposta inválido da API de placas');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar placas (placas):', error);
    placasState.lastError = error.message;
    
    // Se temos cache antigo, usar como fallback
    if (placasState.placasCache.length > 0) {
      console.warn('⚠️ Usando cache antigo de placas como fallback (placas)');
      return placasState.placasCache;
    }
    
    return [];
  } finally {
    placasState.isLoading = false;
  }
}

/**
 * Configura combobox para placas
 * @param {HTMLElement} inputElement - Campo de input
 * @param {Array} placas - Lista de placas (opcional, carrega automaticamente se não fornecida)
 * @param {Object} options - Opções de configuração
 */
export async function criarComboboxPlacas(inputElement, placas = null, options = {}) {
  if (!inputElement) {
    console.warn('⚠️ Elemento de input não fornecido para criarComboboxPlacas (placas)');
    return;
  }
  
  const {
    showRefreshButton = true,
    maxSuggestions = 15,
    onPlacaSelect = null,
    placeholder = 'Digite a placa do caminhão'
  } = options;
  
  // Carregar placas se não fornecidas
  if (!placas) {
    placas = await carregarPlacas();
  }
  
  // Criar wrapper para o combobox se não existir
  let wrapper = inputElement.closest('.combobox-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'combobox-wrapper';
    wrapper.style.position = 'relative';
    
    inputElement.parentNode.insertBefore(wrapper, inputElement);
    wrapper.appendChild(inputElement);
  }
  
  // Limpar event listeners existentes
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);
  
  // Configurar input
  newInput.setAttribute('autocomplete', 'off');
  newInput.setAttribute('placeholder', placeholder);
  
  // Event listeners para busca
  newInput.addEventListener('input', function() {
    mostrarSugestoesPlacas(this, placas, { maxSuggestions });
  });
  
  newInput.addEventListener('focus', function() {
    mostrarSugestoesPlacas(this, placas, { maxSuggestions });
  });
  
  // Callback personalizado quando placa é selecionada
  if (typeof onPlacaSelect === 'function') {
    newInput.addEventListener('placaSelected', function(event) {
      onPlacaSelect(event.detail.placa, event.detail.input);
    });
  }
  
  // Adicionar botão de refresh se solicitado
  if (showRefreshButton) {
    adicionarBotaoRefreshPlacas(wrapper, newInput, placas.length);
  }
  
  console.log(`✅ Combobox de placas configurado (placas) - ${placas.length} placas disponíveis`);
  
  // Dispatch evento customizado de seleção
  newInput.dispatchEvent(new CustomEvent('placaSelected', { detail: { placa: placas[0], input: newInput } }));
}

/**
 * Adiciona botão de refresh para placas
 * @param {HTMLElement} wrapper - Container do combobox
 * @param {HTMLElement} input - Campo de input
 * @param {number} totalPlacas - Total de placas atual
 */
function adicionarBotaoRefreshPlacas(wrapper, input, totalPlacas) {
  // Remover botão existente se houver
  const existingBtn = wrapper.querySelector('.btn-refresh-placas');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn-refresh-placas';
  refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  refreshBtn.title = `Atualizar placas da planilha (${totalPlacas} placas disponíveis)`;
  refreshBtn.style.cssText = `
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
  `;
  
  // Estados visuais do botão
  refreshBtn.addEventListener('mouseenter', function() {
    if (!this.disabled) {
      this.style.backgroundColor = '#e9ecef';
      this.style.borderColor = '#adb5bd';
    }
  });
  
  refreshBtn.addEventListener('mouseleave', function() {
    if (!this.disabled) {
      this.style.backgroundColor = '#f8f9fa';
      this.style.borderColor = '#dee2e6';
    }
  });
  
  // Evento de refresh
  refreshBtn.addEventListener('click', async function() {
    await atualizarPlacasComFeedback(this, input);
  });
  
  wrapper.appendChild(refreshBtn);
}

/**
 * Atualiza placas com feedback visual
 * @param {HTMLElement} button - Botão de refresh
 * @param {HTMLElement} input - Campo de input associado
 */
async function atualizarPlacasComFeedback(button, input) {
  try {
    // Desabilitar botão e adicionar animação
    button.disabled = true;
    button.classList.add('refreshing');
    button.style.backgroundColor = '#6c757d';
    button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
    
    console.log('🔄 Atualizando lista de placas da planilha (placas)...');
    
    // Carregar placas
    const novasPlacas = await carregarPlacas(true);
    
    // Reconfigurar combobox com novas placas
    await criarComboboxPlacas(input, novasPlacas);
    
    console.log(`✅ ${novasPlacas.length} placas atualizadas com sucesso (placas)`);
    
    // Feedback de sucesso
    button.classList.remove('refreshing');
    button.classList.add('refresh-success');
    button.style.backgroundColor = '#28a745';
    button.innerHTML = '<i class="fas fa-check"></i>';
    button.title = `Placas atualizadas! (${novasPlacas.length} placas disponíveis)`;
    
    // Voltar ao estado normal após 2 segundos
    setTimeout(() => {
      button.classList.remove('refresh-success');
      button.style.backgroundColor = '#f8f9fa';
      button.innerHTML = '<i class="fas fa-sync-alt"></i>';
      button.title = `Atualizar placas da planilha (${novasPlacas.length} placas disponíveis)`;
      button.disabled = false;
    }, 2000);
    
    // Mostrar notificação de sucesso
    if (novasPlacas.length > 0) {
      mostrarNotificacaoPlacas('success', `${novasPlacas.length} placas atualizadas!`, 
        'Dados carregados da planilha SharePoint');
    } else {
      mostrarNotificacaoPlacas('warning', 'Nenhuma placa encontrada', 
        'Verifique se a planilha de placas está corretamente configurada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar placas (placas):', error);
    
    // Feedback de erro
    button.classList.remove('refreshing');
    button.style.backgroundColor = '#dc3545';
    button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    button.title = 'Erro ao atualizar placas - clique para tentar novamente';
    
    // Voltar ao estado normal após 3 segundos
    setTimeout(() => {
      button.style.backgroundColor = '#f8f9fa';
      button.innerHTML = '<i class="fas fa-sync-alt"></i>';
      button.title = 'Atualizar placas da planilha';
      button.disabled = false;
    }, 3000);
    
    // Mostrar notificação de erro
    mostrarNotificacaoPlacas('error', 'Erro ao atualizar placas', 
      'Ocorreu um erro ao tentar atualizar as placas. Tente novamente.');
  }
}

/**
 * Mostra sugestões de placas baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} placas - Lista de placas
 * @param {Object} options - Opções de exibição
 */
export function mostrarSugestoesPlacas(input, placas, options = {}) {
  const { maxSuggestions = 15 } = options;
  
  // Remover lista existente
  const existingList = document.querySelector('.placas-suggestions');
  if (existingList) existingList.remove();
  
  const termo = input.value.toUpperCase();
  
  // Filtrar todas as placas que correspondem ao termo
  const todasPlacasFiltradas = placas.filter(placa => 
    placa.toUpperCase().includes(termo)
  );
  
  // Limitar a exibição
  const placasFiltradas = todasPlacasFiltradas.slice(0, maxSuggestions);
  
  if (placasFiltradas.length === 0) return;
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.className = 'placas-suggestions';
  suggestionsList.style.cssText = `
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    max-height: 250px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 2px;
  `;
  
  placasFiltradas.forEach((placa, index) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: ${index < placasFiltradas.length - 1 ? '1px solid #f1f5f9' : 'none'};
      transition: background-color 0.2s;
      font-family: 'Courier New', monospace;
      font-weight: 500;
    `;
    
    // Destacar termo de busca
    let placaFormatada = placa;
    if (termo && termo.length > 0) {
      const regex = new RegExp(`(${termo})`, 'gi');
      placaFormatada = placa.replace(regex, '<mark>$1</mark>');
    }
    
    item.innerHTML = `
      <div style="display: flex; align-items: center;">
        <i class="fas fa-truck text-muted me-2"></i>
        <span>${placaFormatada}</span>
      </div>
    `;
    
    // Event listeners para hover
    item.addEventListener('mouseenter', function() {
      this.style.backgroundColor = '#f8fafc';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'white';
    });
    
    // Event listener para seleção
    item.addEventListener('click', function() {
      input.value = placa;
      input.classList.add('is-valid');
      suggestionsList.remove();
      
      // Disparar evento personalizado
      const event = new CustomEvent('placaSelected', {
        detail: { placa, input }
      });
      input.dispatchEvent(event);
      
      // Focar novamente no input
      input.focus();
      
      console.log(`✅ Placa selecionada: ${placa} (placas)`);
    });
    
    suggestionsList.appendChild(item);
  });
  
  // Adicionar indicador de total se houver mais resultados
  if (todasPlacasFiltradas.length > placasFiltradas.length) {
    const infoItem = document.createElement('div');
    infoItem.className = 'suggestion-info';
    infoItem.style.cssText = `
      padding: 8px 15px;
      font-size: 0.85rem;
      text-align: center;
      background-color: #f1f5f9;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    `;
    infoItem.innerHTML = `
      <i class="fas fa-info-circle me-1"></i>
      Mostrando ${placasFiltradas.length} de ${todasPlacasFiltradas.length} placas. 
      Digite mais letras para filtrar.
    `;
    suggestionsList.appendChild(infoItem);
  }
  
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
 * Atualiza todos os comboboxes de placas na página
 * @param {Array} novasPlacas - Lista de placas atualizada (opcional)
 */
export async function atualizarTodosComboboxes(novasPlacas = null) {
  try {
    console.log('🔄 Atualizando todos os comboboxes de placas (placas)...');
    
    // Carregar placas se não fornecidas
    if (!novasPlacas) {
      novasPlacas = await carregarPlacas();
    }
    
    // Encontrar todos os campos de placa existentes
    const camposPlaca = document.querySelectorAll('input[name="placa"], .placa-input, [data-type="placa"]');
    
    let atualizados = 0;
    
    // Atualizar cada campo
    camposPlaca.forEach(async (campo) => {
      // Limpar sugestões existentes
      const suggestions = campo.parentElement.querySelector('.placas-suggestions');
      if (suggestions) suggestions.remove();
      
      // Reconfigurar combobox
      await criarComboboxPlacas(campo, novasPlacas);
      atualizados++;
    });
    
    console.log(`✅ ${atualizados} comboboxes de placas atualizados (placas)`);
    return atualizados;
    
  } catch (error) {
    console.error('❌ Erro ao atualizar comboboxes de placas (placas):', error);
    return 0;
  }
}

/**
 * Inicializa comboboxes de placas em elementos específicos
 * @param {Array} elementos - Lista de elementos ou seletores (opcional)
 * @param {Object} options - Opções globais de configuração
 */
export async function inicializarComboboxesPlacas(elementos = [], options = {}) {
  try {
    console.log('🔧 Inicializando comboboxes de placas (placas)...');
    
    // Carregar placas
    const placas = await carregarPlacas();
    
    if (placas.length === 0) {
      console.warn('⚠️ Nenhuma placa carregada - usando campos de texto normais (placas)');
      return false;
    }
    
    // Se nenhum elemento especificado, usar seletores padrão
    if (elementos.length === 0) {
      elementos = [
        'input[name="placa"]',
        '.placa-input',
        '#placa_carregamento_rod',
        '[data-type="placa"]'
      ];
    }
    
    let configurados = 0;
    
    // Configurar cada elemento
    for (const elemento of elementos) {
      let inputElements;
      
      if (typeof elemento === 'string') {
        inputElements = document.querySelectorAll(elemento);
      } else {
        inputElements = [elemento];
      }
      
      for (const inputElement of inputElements) {
        if (inputElement) {
          await criarComboboxPlacas(inputElement, placas, options);
          configurados++;
          console.log(`✅ Combobox de placas configurado para ${inputElement.id || inputElement.name || 'elemento'} (placas)`);
        }
      }
    }
    
    console.log(`✅ ${configurados} comboboxes de placas inicializados (placas)`);
    return configurados > 0;
    
  } catch (error) {
    console.error('❌ Erro ao inicializar comboboxes de placas (placas):', error);
    return false;
  }
}

/**
 * Valida formato de placa brasileira
 * @param {string} placa - Placa a ser validada
 * @returns {Object} Resultado da validação
 */
export function validarPlaca(placa) {
  if (!placa || typeof placa !== 'string') {
    return {
      valida: false,
      erro: 'Placa não fornecida',
      formato: null
    };
  }
  
  const placaLimpa = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
  
  // Formato antigo: ABC1234
  const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  
  // Formato Mercosul: ABC1D23
  const formatoMercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  
  if (formatoAntigo.test(placaLimpa)) {
    return {
      valida: true,
      erro: null,
      formato: 'antigo',
      placaFormatada: `${placaLimpa.substr(0,3)}-${placaLimpa.substr(3,4)}`
    };
  }
  
  if (formatoMercosul.test(placaLimpa)) {
    return {
      valida: true,
      erro: null,
      formato: 'mercosul',
      placaFormatada: `${placaLimpa.substr(0,3)}${placaLimpa.substr(3,1)}${placaLimpa.substr(4,1)}${placaLimpa.substr(5,2)}`
    };
  }
  
  return {
    valida: false,
    erro: 'Formato de placa inválido. Use ABC1234 ou ABC1D23',
    formato: null
  };
}

/**
 * Busca placas por padrão
 * @param {string} padrao - Padrão de busca
 * @param {Array} placas - Lista de placas (opcional, usa cache se não fornecida)
 * @returns {Array} Placas que correspondem ao padrão
 */
export async function buscarPlacas(padrao, placas = null) {
  if (!placas) {
    placas = await carregarPlacas();
  }
  
  if (!padrao || padrao.length === 0) {
    return placas;
  }
  
  const termo = padrao.toUpperCase();
  return placas.filter(placa => placa.toUpperCase().includes(termo));
}

/**
 * Limpa cache de placas
 */
export function limparCachePlacas() {
  console.log('🧹 Limpando cache de placas (placas)');
  
  placasState.placasCache = [];
  placasState.placasCacheTime = null;
  placasState.totalPlacas = 0;
  placasState.lastError = null;
  placasState.lastUpdateSource = null;
  
  // Sincronizar com cache global
  if (window.appState) {
    window.appState.placasCache = [];
    window.appState.placasCacheTime = null;
  }
  
  console.log('✅ Cache de placas limpo (placas)');
}

/**
 * Obtém estatísticas do módulo de placas
 * @returns {Object} Estatísticas detalhadas
 */
export function obterEstatisticasPlacas() {
  const agora = new Date();
  
  return {
    cache: {
      count: placasState.placasCache.length,
      lastUpdate: placasState.placasCacheTime,
      isExpired: placasState.placasCacheTime ? 
        (agora - placasState.placasCacheTime > placasState.cacheTTL) : true,
      ttl: placasState.cacheTTL,
      source: placasState.lastUpdateSource
    },
    estado: {
      initialized: placasState.initialized,
      isLoading: placasState.isLoading,
      lastError: placasState.lastError,
      totalPlacas: placasState.totalPlacas
    },
    performance: {
      cacheAge: placasState.placasCacheTime ? agora - placasState.placasCacheTime : null,
      cacheValidUntil: placasState.placasCacheTime ? 
        new Date(placasState.placasCacheTime.getTime() + placasState.cacheTTL) : null
    }
  };
}

/**
 * Mostra notificação relacionada a placas
 * @param {string} tipo - Tipo: 'success', 'error', 'warning', 'info'
 * @param {string} titulo - Título da notificação
 * @param {string} mensagem - Mensagem detalhada
 */
function mostrarNotificacaoPlacas(tipo, titulo, mensagem) {
  // Usar SweetAlert2 se disponível
  if (typeof Swal !== 'undefined') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    
    Toast.fire({
      icon: tipo,
      title: titulo,
      text: mensagem
    });
  } else {
    // Fallback para console
    console.log(`📋 ${tipo.toUpperCase()}: ${titulo} - ${mensagem}`);
  }
}

// ========================================
// COMPATIBILIDADE COM CÓDIGO EXISTENTE
// ========================================

// Expor funções globais para compatibilidade
if (typeof window !== 'undefined') {
  window.carregarPlacas = carregarPlacas;
  window.criarComboboxPlacas = criarComboboxPlacas;
  window.mostrarSugestoesPlacas = mostrarSugestoesPlacas;
  window.atualizarTodosComboboxes = atualizarTodosComboboxes;
  window.inicializarComboboxesPlacas = inicializarComboboxesPlacas;
  window.validarPlaca = validarPlaca;
  window.buscarPlacas = buscarPlacas;
  window.limparCachePlacas = limparCachePlacas;
  window.obterEstatisticasPlacas = obterEstatisticasPlacas;
}

// Auto-inicialização quando carregado
init();

console.log('✅ Módulo placas carregado e pronto para uso');