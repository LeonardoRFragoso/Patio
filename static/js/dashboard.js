// ========================================
// DASHBOARD SISTEMA DE PÁTIO - NÚCLEO MODULAR
// Versão modularizada - apenas orquestração e navegação
// Toda lógica específica foi movida para módulos dedicados
// ========================================

/**
 * Estado global simplificado da aplicação
 * Mantém apenas dados essenciais para sincronização entre módulos
 */
const appState = {
  // Operação e modo atuais
  currentOperation: null,
  currentMode: null,
  activeForm: null,
  
  // Cache global para sincronização entre módulos
  containersCache: [],
  containersCacheTime: null,
  containersVistoriadosCache: [],
  containersVistoriadosCacheTime: null,
  placasCache: [],
  placasCacheTime: null,
  posicoesLivresCache: null,
  posicoesLivresCacheTime: null,
  
  // Estado de inicialização
  initialized: false
};

// Compatibilidade: manter variável global para scripts antigos
window.appState = appState;

console.log("🚀 Iniciando Dashboard modular...");

// ========================================
// MAPEAMENTO DE MÓDULOS
// ========================================

/**
 * Mapeamento de operações para seus respectivos módulos
 */
const moduleMap = {
  'descarga': './modules/descarga.js',
  'carregamento': './modules/carregamento.js',
  'movimentacao': './modules/movimentacao.js',
  'consultar': './modules/consulta.js',
  'patio3d': './modules/patio3d.js',
  'correcao-descarga': './modules/correcao-descarga.js'
};

/**
 * Cache de módulos carregados para evitar reimportação
 */
const loadedModules = new Map();

// ========================================
// CARREGAR UTILIDADES GLOBAIS NECESSÁRIAS PARA OS MÓDULOS
// ========================================

// Expor scroll otimizado para outros módulos (descarga, movimentação, etc.)
import('./modules/ui-utils.js')
  .then(({ scrollToFormulario }) => {
    if (typeof scrollToFormulario === 'function') {
      window.scrollToFormulario = scrollToFormulario;
      console.log('🔗 Função scrollToFormulario exposta globalmente (dashboard)');
    }
  })
  .catch(err => console.error('❌ Falha ao importar ui-utils:', err));

// ========================================
// FUNÇÕES DE NAVEGAÇÃO PRINCIPAL
// ========================================

/**
 * Mostra uma operação específica importando seu módulo
 * @param {string} operation - Nome da operação
 */
async function mostrarOperacao(operation) {
  try {
    console.log(`📱 Mostrando operação: ${operation} (reinicialização completa)`);

    // Limpar estado anterior
    hideAllOperations();
    hideAllForms();
    esconderSelecaoInicial();
    clearPreviousState();

    // Atualizar estado global
    appState.currentOperation = operation;
    appState.currentMode = null;
    appState.activeForm = null;

    // Ativar botão de operação
    activateOperationButton(operation);

    // Importar e inicializar módulo específico
    if (moduleMap[operation]) {
      await importarEInicializarModulo(operation);
    } else {
      console.warn(`⚠️ Módulo não encontrado para operação: ${operation}`);
    }

    // Mostrar seção da operação
    setTimeout(() => {
      showOperationSection(operation);
    }, 50);

    console.log(`✅ Operação ${operation} inicializada`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao mostrar operação ${operation}:`, error);
    mostrarErroOperacao(operation, error);
    return false;
  }
}

/**
 * Importa e inicializa um módulo específico
 * @param {string} operation - Nome da operação
 */
async function importarEInicializarModulo(operation) {
  try {
    let modulo;
    
    // Verificar se módulo já foi carregado
    if (loadedModules.has(operation)) {
      modulo = loadedModules.get(operation);
      console.log(`🔄 Reutilizando módulo carregado: ${operation}`);
    } else {
      // Importar módulo dinamicamente
      console.log(`🔌 Importando módulo: ${moduleMap[operation]}`);
      modulo = await import(moduleMap[operation]);
      
      // Cachear módulo
      loadedModules.set(operation, modulo);
    }
    
    if (modulo && typeof modulo.init === 'function') {
      // SEMPRE reinicializar o módulo a cada clique
      console.log(`🔄 Reinicializando módulo de ${operation}...`);
      modulo.init({ appState });
      
      console.log(`✅ Módulo de ${operation} reinicializado com sucesso`);
    } else {
      throw new Error(`Módulo ${operation} não expõe função 'init'`);
    }
  } catch (error) {
    console.error(`❌ Erro ao importar/inicializar módulo ${operation}:`, error);
    throw error;
  }
}

/**
 * Mostra erro ao carregar operação
 * @param {string} operation - Nome da operação
 * @param {Error} error - Erro ocorrido
 */
function mostrarErroOperacao(operation, error) {
  if (typeof window.mostrarAlerta === 'function') {
    window.mostrarAlerta(
      'Erro ao carregar operação',
      `Não foi possível carregar a operação ${operation}. Tente novamente.`,
      'error'
    );
  } else {
    alert(`Erro ao carregar operação ${operation}. Tente novamente.`);
  }
}

/**
 * Esconde todas as operações
 */
function hideAllOperations() {
  const operationIds = [
    'operacao-descarga',
    'operacao-carregamento',
    'operacao-movimentacao',
    'operacao-consultar',
    'operacao-patio3d'
  ];
  
  operationIds.forEach(id => {
    const operacao = document.getElementById(id);
    if (operacao) {
      operacao.style.display = 'none';
    }
  });
  
  // Esconder elementos com classe genérica
  document.querySelectorAll('.operacao-content').forEach(op => {
    op.style.display = 'none';
    op.classList.remove('show');
  });
}

/**
 * Mostra uma seção de operação específica
 * @param {string} operation - Nome da operação
 */
function showOperationSection(operation) {
  console.log(`🔍 Tentando mostrar seção da operação: ${operation}`);
  
  const operationElement = document.getElementById(`operacao-${operation}`);
  if (operationElement) {
    operationElement.style.display = 'block';
    operationElement.classList.add('show');
    console.log(`✅ Seção da operação ${operation} exibida com classe 'show'`);

    // Garantir que o usuário veja a seção recém-aberta
    if (typeof window.scrollToFormulario === 'function') {
      console.log(`📜 Preparando scroll para operação ${operation}...`);
      // Pequeno atraso para garantir que o layout foi aplicado
      setTimeout(() => {
        console.log(`📜 Executando scroll para operação ${operation} com alwaysScroll: true`);
        window.scrollToFormulario(operationElement, { 
          offset: 120, 
          alwaysScroll: true // força scroll mesmo se elemento parecer visível
        });
      }, 100);
    } else {
      console.warn(`⚠️ Função scrollToFormulario não disponível para ${operation}`);
    }
  } else {
    console.error(`❌ Elemento 'operacao-${operation}' não encontrado no DOM`);
  }
}

/**
 * Esconde todos os formulários
 */
function hideAllForms() {
  const formIds = [
    'form-carregamento-rodoviario',
    'form-carregamento-ferroviario',
    'form-descarga-rodoviaria',
    'form-descarga-ferroviaria',
    'form-movimentacao',
    'form-consulta'
  ];
  
  formIds.forEach(id => {
    const form = document.getElementById(id);
    if (form) {
      form.style.display = 'none';
      form.classList.remove('show');
    }
  });
  
  document.querySelectorAll('.operacao-form').forEach(form => {
    form.style.display = 'none';
    form.classList.remove('show');
  });
}

/**
 * Esconde a seleção inicial de operações
 */
function esconderSelecaoInicial() {
  const selecioneOperacao = document.getElementById('selecione-operacao');
  if (selecioneOperacao) {
    selecioneOperacao.style.display = 'none';
  }
}

/**
 * Ativa o botão de operação correspondente
 * @param {string} operation - Nome da operação
 */
function activateOperationButton(operation) {
  // Remover classe ativa de todos os botões
  document.querySelectorAll('.operacao-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Adicionar classe ativa ao botão selecionado
  const activeButton = document.querySelector(`.operacao-btn[data-operacao="${operation}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
    console.log(`✅ Botão da operação ${operation} ativado`);
  } else {
    console.warn(`⚠️ Botão da operação ${operation} não encontrado`);
  }
}

/**
 * Limpa estado anterior
 */
function clearPreviousState() {
  // Remover classes ativas
  document.querySelectorAll('.operacao-btn, .sub-opcao-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

/**
 * Exibe a seleção inicial de operações
 */
function showInitialSelection() {
  const indicador = document.getElementById('selecione-operacao');
  if (indicador) {
    indicador.style.display = 'block';
  }

  const gridOperacoes = document.querySelector('.operacoes-grid');
  if (gridOperacoes) {
    gridOperacoes.style.display = 'flex';
  }

  console.log('✅ Seleção de operações exibida');
}

/**
 * Volta para o início (estado inicial)
 */
function voltarInicio() {
  console.log("🏠 Voltando ao início");

  // Limpar estado
  hideAllOperations();
  hideAllForms();
  clearPreviousState();

  // Resetar appState mantendo cache
  const cacheBackup = {
    containersCache: appState.containersCache,
    containersCacheTime: appState.containersCacheTime,
    containersVistoriadosCache: appState.containersVistoriadosCache,
    containersVistoriadosCacheTime: appState.containersVistoriadosCacheTime,
    placasCache: appState.placasCache,
    placasCacheTime: appState.placasCacheTime,
    posicoesLivresCache: appState.posicoesLivresCache,
    posicoesLivresCacheTime: appState.posicoesLivresCacheTime
  };

  Object.assign(appState, {
    currentOperation: null,
    currentMode: null,
    activeForm: null,
    ...cacheBackup
  });

  // Limpar formulários via módulo UI se disponível
  if (typeof window.clearAllForms === 'function') {
    window.clearAllForms();
  }

  // Mostrar seleção inicial
  setTimeout(() => {
    showInitialSelection();
    console.log("✅ Retornado ao estado inicial");
  }, 50);
}

// ========================================
// SISTEMA DE INICIALIZAÇÃO MODULAR
// ========================================

/**
 * Inicializa módulos essenciais
 */
async function inicializarModulosEssenciais() {
  console.log('🔧 Inicializando módulos essenciais...');
  
  try {
    // Importar e inicializar módulos utilitários
    const modulosEssenciais = [
      './modules/ui-utils.js',
      './modules/containers-utils.js',
      './modules/placas.js',
      './modules/posicoes.js'
    ];

    for (const modulePath of modulosEssenciais) {
      try {
        const modulo = await import(modulePath);
        if (modulo && typeof modulo.init === 'function') {
          modulo.init({ appState });
          console.log(`✅ Módulo essencial carregado: ${modulePath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao carregar módulo essencial ${modulePath}:`, error);
        // Continuar mesmo com erro
      }
    }

    console.log('✅ Módulos essenciais inicializados');
    return true;
  } catch (error) {
    console.error('❌ Erro crítico na inicialização de módulos:', error);
    return false;
  }
}

/**
 * Inicialização principal da aplicação
 */
async function inicializarDashboard() {
  console.log('🚀 Iniciando inicialização do dashboard...');

  try {
    // Marcar como inicializado
    appState.initialized = true;

    // Inicializar módulos essenciais
    await inicializarModulosEssenciais();

    // Configurar estado inicial
    resetToInitialState();

    // Log de conclusão
    console.log('✅ Dashboard inicializado com sucesso');
    console.log('📊 Estado inicial:', {
      operation: appState.currentOperation,
      mode: appState.currentMode,
      initialized: appState.initialized
    });

    return true;
  } catch (error) {
    console.error('❌ Erro crítico na inicialização do dashboard:', error);
    
    // Mostrar erro ao usuário
    if (typeof window.mostrarAlerta === 'function') {
      window.mostrarAlerta(
        'Erro de Inicialização',
        'Ocorreu um erro ao inicializar o sistema. Recarregue a página.',
        'error'
      );
    }
    
    return false;
  }
}

/**
 * Reseta para o estado inicial
 */
function resetToInitialState() {
  hideAllOperations();
  hideAllForms();
  esconderSelecaoInicial();
  clearPreviousState();

  // Limpar formulários
  if (typeof window.clearAllForms === 'function') {
    window.clearAllForms();
  }

  setTimeout(() => {
    showInitialSelection();
  }, 50);
}

// ========================================
// FUNÇÕES DE LOGOUT
// ========================================

/**
 * Confirma e processa o logout do usuário
 */
function confirmarLogout() {
  console.log("🔒 Iniciando processo de logout...");
  
  const confirmar = () => {
    if (typeof window.mostrarConfirmacao === 'function') {
      return window.mostrarConfirmacao(
        'Confirmar Saída',
        'Deseja realmente sair do sistema?'
      );
    } else {
      return Promise.resolve({ 
        isConfirmed: confirm('Deseja realmente sair do sistema?') 
      });
    }
  };

  confirmar().then((result) => {
    if (result.isConfirmed) {
      console.log("✅ Logout confirmado, redirecionando...");
      
      if (typeof window.mostrarAlerta === 'function') {
        window.mostrarAlerta(
          'Saindo...',
          'Você será redirecionado em instantes',
          'info'
        ).then(() => {
          window.location.href = "/auth/logout";
        });
      } else {
        window.location.href = "/auth/logout";
      }
    } else {
      console.log("❌ Logout cancelado");
    }
  });
}

// ========================================
// MONITORAMENTO E DEBUG
// ========================================

/**
 * Monitor de estado para debug (executa a cada 10 segundos)
 */
function iniciarMonitorDebug() {
  setInterval(() => {
    const debugInfo = {
      operation: appState.currentOperation,
      mode: appState.currentMode,
      form: appState.activeForm,
      containersCache: appState.containersCache.length,
      placasCache: appState.placasCache.length,
      modulesLoaded: loadedModules.size,
      timestamp: new Date().toLocaleTimeString()
    };

    if (window.lastDebugInfo !== JSON.stringify(debugInfo)) {
      console.log("📊 Estado do dashboard:", debugInfo);
      window.lastDebugInfo = JSON.stringify(debugInfo);
    }
  }, 10000);
}

// ========================================
// INICIALIZAÇÃO AUTOMÁTICA
// ========================================

/**
 * Inicialização quando DOM estiver carregado
 */
document.addEventListener("DOMContentLoaded", async function() {
  console.log("🎯 DOM carregado, iniciando dashboard...");

  try {
    // Aguardar inicialização completa
    const sucesso = await inicializarDashboard();

    if (sucesso) {
      // Iniciar monitoramento de debug
      iniciarMonitorDebug();
      
      // Garantir que a seleção inicial seja exibida
      setTimeout(() => {
        if (!appState.currentOperation) {
          showInitialSelection();
        }
      }, 500);
      
      console.log("🎉 Dashboard totalmente funcional!");
    } else {
      console.error("💥 Falha na inicialização do dashboard");
    }
  } catch (error) {
    console.error("💥 Erro crítico durante inicialização:", error);
  }
});

// ========================================
// EXPOSIÇÃO DE FUNÇÕES GLOBAIS
// ========================================

// Funções principais de navegação
window.mostrarOperacao = mostrarOperacao;
window.voltarInicio = voltarInicio;
window.resetToInitialState = resetToInitialState;
window.confirmarLogout = confirmarLogout;

// Estado global
window.appState = appState;

// Funções de debug
window.getAppState = () => appState;
window.getLoadedModules = () => loadedModules;
window.clearModuleCache = () => loadedModules.clear();

// Wrapper para compatibilidade com templates antigos
// Permite chamar mostrarSubOpcao("carregamento", "rodoviaria") diretamente do HTML
window.mostrarSubOpcao = function(operacao, modo) {
  try {
    if (operacao === 'carregamento' && typeof window.mostrarSubOpcaoCarregamento === 'function') {
      window.mostrarSubOpcaoCarregamento(modo);
      return;
    }
    if (operacao === 'descarga' && typeof window.mostrarSubOpcaoDescarga === 'function') {
      window.mostrarSubOpcaoDescarga(modo);
      return;
    }
    console.warn('⚠️ mostrarSubOpcao: operação ou função correspondente não encontrada', operacao, modo);
  } catch (err) {
    console.error('❌ Erro em mostrarSubOpcao wrapper:', err);
  }
};

console.log("✅ Dashboard modular carregado e pronto para uso");