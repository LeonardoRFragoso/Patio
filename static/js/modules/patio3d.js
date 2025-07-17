// ========================================
// MÓDULO DE VISUALIZAÇÃO 3D DO PÁTIO
// Gerencia toda a lógica relacionada à visualização 3D do pátio de containers
// ========================================

/**
 * Estado interno do módulo de visualização 3D
 */
const patio3dState = {
    redirecionandoParaVisualizacao: false,
    parametrosVisualizacao: {},
    initialized: false
  };
  
  /**
   * Inicializa o módulo de visualização 3D
   * @param {Object} options - Opções de inicialização
   * @param {Object} options.appState - Estado global da aplicação
   */
  export function init(options = {}) {
    console.log('🗿 Inicializando módulo de visualização 3D...');
    
    const { appState } = options;
    
    if (patio3dState.initialized) {
      console.log('⚠️ Módulo de visualização 3D já inicializado');
      return;
    }
    
    // Configurar estado inicial
    patio3dState.initialized = true;
    
    // Validações antes do redirecionamento
    if (!validarAcessoVisualizacao3D()) {
      return;
    }
    
    // Preparar parâmetros da visualização
    prepararParametrosVisualizacao();
    
    // Executar redirecionamento com feedback visual
    executarRedirecionamento();
    
    console.log('✅ Módulo de visualização 3D inicializado com sucesso');
  }
  
  /**
   * Valida se o usuário pode acessar a visualização 3D
   * @returns {boolean} Se o acesso é permitido
   */
  function validarAcessoVisualizacao3D() {
    console.log('🔍 Validando acesso à visualização 3D...');
    
    // Verificar se o navegador suporta as tecnologias necessárias
    if (!verificarSuporteNavegador()) {
      mostrarErroCompatibilidade();
      return false;
    }
    
    // Verificar conectividade básica
    if (!navigator.onLine) {
      mostrarErroConexao();
      return false;
    }
    
    console.log('✅ Acesso à visualização 3D validado');
    return true;
  }
  
  /**
   * Verifica se o navegador suporta as tecnologias necessárias para 3D
   * @returns {boolean} Se o navegador é compatível
   */
  function verificarSuporteNavegador() {
    // Verificar suporte básico para WebGL (necessário para Three.js)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      console.warn('⚠️ WebGL não suportado pelo navegador');
      return false;
    }
    
    // Verificar suporte para ES6 (necessário para módulos modernos)
    try {
      new Function('(a = 0) => a');
    } catch (e) {
      console.warn('⚠️ ES6 não suportado pelo navegador');
      return false;
    }
    
    console.log('✅ Navegador compatível com visualização 3D');
    return true;
  }
  
  /**
   * Prepara parâmetros para a visualização 3D
   */
  function prepararParametrosVisualizacao() {
    console.log('🔧 Preparando parâmetros para visualização 3D...');
    
    // Obter configurações do usuário/sessão se disponíveis
    const configuracoes = obterConfiguracoesSessao();
    
    // Preparar parâmetros base
    patio3dState.parametrosVisualizacao = {
      fonte: 'dashboard',
      timestamp: new Date().toISOString(),
      usuario: configuracoes.usuario || 'desconhecido',
      unidade: configuracoes.unidade || 'SUZANO',
      // Parâmetros específicos podem ser adicionados aqui
      // view: 'geral', // vista padrão
      // filtros: {}, // filtros aplicados
      // destacar: null // container específico para destacar
    };
    
    console.log('✅ Parâmetros de visualização preparados:', patio3dState.parametrosVisualizacao);
  }
  
  /**
   * Obtém configurações da sessão atual
   * @returns {Object} Configurações disponíveis
   */
  function obterConfiguracoesSessao() {
    const configuracoes = {};
    
    // Tentar obter informações do usuário de várias fontes
    try {
      // Verificar meta tags
      const metaUsuario = document.querySelector('meta[name="user-info"]');
      if (metaUsuario) {
        const userInfo = JSON.parse(metaUsuario.getAttribute('content') || '{}');
        configuracoes.usuario = userInfo.username;
        configuracoes.unidade = userInfo.unidade;
      }
      
      // Verificar variáveis globais
      if (window.currentUser) {
        configuracoes.usuario = window.currentUser.username;
        configuracoes.unidade = window.currentUser.unidade;
      }
      
      // Verificar localStorage (se permitido)
      if (typeof Storage !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const sessionData = JSON.parse(userSession);
          configuracoes.usuario = configuracoes.usuario || sessionData.username;
          configuracoes.unidade = configuracoes.unidade || sessionData.unidade;
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao obter configurações da sessão:', error);
    }
    
    return configuracoes;
  }
  
  /**
   * Executa o redirecionamento para a visualização 3D
   */
  function executarRedirecionamento() {
    console.log('🚀 Executando redirecionamento para visualização 3D...');
    
    // Marcar que estamos redirecionando
    patio3dState.redirecionandoParaVisualizacao = true;
    
    // Mostrar feedback visual opcional
    mostrarFeedbackRedirecionamento();
    
    // Registrar analytics se disponível
    registrarAcessoVisualizacao3D();
    
    // Construir URL com parâmetros se necessário
    const urlVisualizacao = construirUrlVisualizacao();
    
    // Pequeno delay para permitir feedback visual
    setTimeout(() => {
      console.log(`🗿 Redirecionando para: ${urlVisualizacao}`);
      
      try {
        window.location.href = urlVisualizacao;
      } catch (error) {
        console.error('❌ Erro ao redirecionar para visualização 3D:', error);
        mostrarErroRedirecionamento();
        patio3dState.redirecionandoParaVisualizacao = false;
      }
    }, 500);
  }
  
  /**
   * Constrói a URL da visualização 3D com parâmetros
   * @returns {string} URL completa para redirecionamento
   */
  function construirUrlVisualizacao() {
    let url = '/visualizacao_patio';
    
    // Adicionar parâmetros como query string se necessário
    const params = new URLSearchParams();
    
    // Parâmetros básicos
    params.set('fonte', patio3dState.parametrosVisualizacao.fonte);
    
    // Parâmetros opcionais baseados no contexto
    if (patio3dState.parametrosVisualizacao.unidade) {
      params.set('unidade', patio3dState.parametrosVisualizacao.unidade);
    }
    
    // Se houver parâmetros, adicionar à URL
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  }
  
  /**
   * Mostra feedback visual durante o redirecionamento
   */
  function mostrarFeedbackRedirecionamento() {
    // Criar overlay de loading simples
    const overlay = document.createElement('div');
    overlay.id = 'patio3d-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🗿</div>
        <h3 style="margin: 0 0 1rem 0;">Carregando Visualização 3D</h3>
        <p style="margin: 0; opacity: 0.8;">Redirecionando para o pátio virtual...</p>
        <div style="margin-top: 2rem;">
          <div style="width: 40px; height: 40px; border: 4px solid #ffffff30; border-top: 4px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(overlay);
    
    // Remover overlay após timeout de segurança (caso o redirecionamento falhe)
    setTimeout(() => {
      const existingOverlay = document.getElementById('patio3d-loading-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
    }, 5000);
  }
  
  /**
   * Registra o acesso à visualização 3D para analytics
   */
  function registrarAcessoVisualizacao3D() {
    try {
      // Registrar evento no console para debugging
      console.log('📊 Acesso à visualização 3D registrado:', {
        timestamp: new Date().toISOString(),
        usuario: patio3dState.parametrosVisualizacao.usuario,
        unidade: patio3dState.parametrosVisualizacao.unidade,
        fonte: 'dashboard'
      });
      
      // Integração futura com analytics (Google Analytics, etc.)
      if (typeof gtag === 'function') {
        gtag('event', 'visualizacao_3d_acesso', {
          'event_category': 'navegacao',
          'event_label': 'dashboard_to_3d',
          'custom_map.unidade': patio3dState.parametrosVisualizacao.unidade
        });
      }
      
      // Integração futura com analytics interno
      if (typeof window.analytics === 'object' && window.analytics.track) {
        window.analytics.track('Visualização 3D Acessada', {
          fonte: 'dashboard',
          unidade: patio3dState.parametrosVisualizacao.unidade,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao registrar analytics:', error);
    }
  }
  
  /**
   * Mostra erro de compatibilidade do navegador
   */
  function mostrarErroCompatibilidade() {
    Swal.fire({
      icon: 'warning',
      title: 'Navegador Incompatível',
      html: `
        <p>Seu navegador não suporta as tecnologias necessárias para a visualização 3D.</p>
        <p><strong>Requisitos:</strong></p>
        <ul style="text-align: left; display: inline-block;">
          <li>WebGL habilitado</li>
          <li>JavaScript ES6+ suportado</li>
          <li>Navegador moderno (Chrome 60+, Firefox 60+, Safari 12+)</li>
        </ul>
        <p>Por favor, atualize seu navegador ou use um navegador compatível.</p>
      `,
      confirmButtonText: 'Entendi',
      confirmButtonColor: '#3085d6',
      footer: '<a href="https://get.webgl.org/" target="_blank">Testar suporte WebGL</a>'
    });
  }
  
  /**
   * Mostra erro de conexão
   */
  function mostrarErroConexao() {
    Swal.fire({
      icon: 'error',
      title: 'Sem Conexão',
      text: 'A visualização 3D requer conexão com a internet. Verifique sua conexão e tente novamente.',
      confirmButtonText: 'Tentar Novamente',
      confirmButtonColor: '#3085d6',
      showCancelButton: true,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Tentar novamente
        init();
      }
    });
  }
  
  /**
   * Mostra erro de redirecionamento
   */
  function mostrarErroRedirecionamento() {
    Swal.fire({
      icon: 'error',
      title: 'Erro ao Carregar Visualização 3D',
      html: `
        <p>Não foi possível carregar a visualização 3D do pátio.</p>
        <p>Possíveis causas:</p>
        <ul style="text-align: left; display: inline-block;">
          <li>Problema de conectividade</li>
          <li>Serviço temporariamente indisponível</li>
          <li>Configuração do navegador</li>
        </ul>
      `,
      confirmButtonText: 'Tentar Novamente',
      confirmButtonColor: '#3085d6',
      showCancelButton: true,
      cancelButtonText: 'Voltar ao Dashboard'
    }).then((result) => {
      if (result.isConfirmed) {
        // Tentar carregar novamente
        executarRedirecionamento();
      } else {
        // Voltar ao dashboard
        voltarAoDashboard();
      }
    });
  }
  
  /**
   * Volta ao dashboard principal
   */
  function voltarAoDashboard() {
    if (typeof window.voltarInicio === 'function') {
      window.voltarInicio();
    } else {
      // Remover overlay se existir
      const overlay = document.getElementById('patio3d-loading-overlay');
      if (overlay) {
        overlay.remove();
      }
      
      // Resetar estado
      patio3dState.redirecionandoParaVisualizacao = false;
      
      console.log('🏠 Retornando ao dashboard principal');
    }
  }
  
  /**
   * Função de cleanup para o módulo
   */
  export function cleanup() {
    console.log('🧹 Limpando módulo de visualização 3D...');
    
    // Remover overlay se existir
    const overlay = document.getElementById('patio3d-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Resetar estado
    patio3dState.redirecionandoParaVisualizacao = false;
    patio3dState.parametrosVisualizacao = {};
    patio3dState.initialized = false;
    
    console.log('✅ Módulo de visualização 3D limpo');
  }
  
  // ========================================
  // FUNÇÕES PÚBLICAS PARA USO GLOBAL
  // ========================================
  
  /**
   * Função global para redirecionamento direto (compatibilidade)
   */
  function redirecionarParaVisualizacao3D() {
    console.log('🗿 Redirecionamento direto para visualização 3D solicitado');
    init();
  }
  
  // Expor funções necessárias globalmente para compatibilidade
  window.redirecionarParaVisualizacao3D = redirecionarParaVisualizacao3D;
  
  console.log('✅ Módulo de visualização 3D carregado');