/**
 * fix-posicao-teu.js
 * Sistema de validação de posições por TEU (Twenty-foot Equivalent Unit)
 * - Containers de 20 pés só podem ocupar posições ímpares (A01, A03, etc.)
 * - Containers de 40 pés só podem ocupar posições pares (A02, A04, etc.)
 * Versão modular e compatível com dashboard.html
 */

// ========================================
// CONFIGURAÇÕES E CONSTANTES
// ========================================

// Proteção contra redeclaração
if (typeof window.TEU_CONFIG !== 'undefined') {
  console.warn('⚠️ TEU_CONFIG já foi declarado, pulando redeclaração');
  // Usar configuração existente
  var TEU_CONFIG = window.TEU_CONFIG;
} else {

const TEU_CONFIG = {
  // Tamanhos de container suportados
  CONTAINER_20_PES: 20,
  CONTAINER_40_PES: 40,
  
  // Padrão de posição (A01-1 format)
  POSICAO_PATTERN: /^[A-E](0[1-9]|1[0-9]|20)-[1-5]$/,
  
  // Campos de posição para monitorar
  CAMPOS_POSICAO: [
    'posicao_descarga',
    'posicao_nova',
    'posicao_movimentacao'
  ],
  
  // Configurações de UI
  SHOW_ALERTS: true,
  AUTO_VALIDATE: true,
  ENABLE_DEBUG: false
};

// Exportar configuração globalmente
window.TEU_CONFIG = TEU_CONFIG;
}

// ========================================
// CLASSE PRINCIPAL DE VALIDAÇÃO TEU
// ========================================

class ValidadorTEU {
  constructor(config = {}) {
    this.config = { ...TEU_CONFIG, ...config };
    this.camposMonitorados = new Set();
    this.isInitialized = false;
    
    // Bind methods
    this.validarCampo = this.validarCampo.bind(this);
    this.handleInput = this.handleInput.bind(this);
  }

  /**
   * Inicializa o validador
   */
  initialize() {
    if (this.isInitialized) {
      this.log('⚠️ ValidadorTEU já inicializado');
      return;
    }

    this.log('🚀 Inicializando ValidadorTEU...');

    try {
      // Configurar validação para todos os campos de posição
      this.setupValidationForAllFields();
      
      // Configurar observador para novos campos
      this.setupMutationObserver();
      
      this.isInitialized = true;
      this.log('✅ ValidadorTEU inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar ValidadorTEU:', error);
    }
  }

  /**
   * Configura validação para todos os campos de posição
   */
  setupValidationForAllFields() {
    this.config.CAMPOS_POSICAO.forEach(campoId => {
      const campo = document.getElementById(campoId);
      if (campo && !this.camposMonitorados.has(campo)) {
        this.setupFieldValidation(campo);
        this.camposMonitorados.add(campo);
        this.log(`✅ Validação TEU configurada para campo: ${campoId}`);
      }
    });
  }

  /**
   * Configura validação para um campo específico
   */
  setupFieldValidation(campo) {
    // Remover listeners existentes para evitar duplicação
    campo.removeEventListener('input', this.handleInput);
    campo.removeEventListener('blur', this.validarCampo);
    
    // Adicionar novos listeners
    campo.addEventListener('input', this.handleInput);
    campo.addEventListener('blur', this.validarCampo);
    
    // Marcar campo como monitorado
    campo.dataset.teuValidation = 'active';
  }

  /**
   * Handler para evento de input
   */
  handleInput(event) {
    const campo = event.target;
    const valor = campo.value.trim().toUpperCase();
    
    // Converter para maiúsculas automaticamente
    campo.value = valor;
    
    // Validar se há valor
    if (valor.length > 0) {
      this.validarPosicaoTEU(campo, valor);
    } else {
      this.limparValidacao(campo);
    }
  }

  /**
   * Valida posição TEU para um campo
   */
  validarPosicaoTEU(campo, posicao) {
    // Verificar formato básico
    if (!this.config.POSICAO_PATTERN.test(posicao)) {
      this.aplicarValidacao(campo, false, 'Formato inválido');
      return false;
    }

    // Obter tamanho do container
    const tamanhoContainer = this.obterTamanhoContainer();
    if (!tamanhoContainer) {
      this.log('⚠️ Tamanho do container não disponível');
      return true; // Não bloquear se não conseguir determinar o tamanho
    }

    // Validar regra TEU
    const resultado = this.validarRegraTEU(posicao, tamanhoContainer);
    this.aplicarValidacao(campo, resultado.valido, resultado.mensagem, tamanhoContainer);
    
    return resultado.valido;
  }

  /**
   * Valida regra TEU específica
   */
  validarRegraTEU(posicao, tamanhoTEU) {
    // Extrair número da baia
    const baia = parseInt(posicao.substring(1, 3), 10);
    const ehPar = baia % 2 === 0;
    
    // Aplicar regras TEU
    const posicaoValida = (tamanhoTEU === 20 && !ehPar) || (tamanhoTEU === 40 && ehPar);
    
    if (posicaoValida) {
      return {
        valido: true,
        mensagem: 'Posição compatível com o tamanho do container'
      };
    } else {
      return {
        valido: false,
        mensagem: `Container de ${tamanhoTEU} pés deve ocupar posição ${tamanhoTEU === 20 ? 'ímpar' : 'par'}`
      };
    }
  }

  /**
   * Obtém tamanho do container atual
   */
  obterTamanhoContainer() {
    // Verificar se há container selecionado globalmente
    if (window.containerSelecionado && window.containerSelecionado.tamanho) {
      return parseInt(window.containerSelecionado.tamanho, 10);
    }
    
    // Verificar elemento de informações do container
    const containerInfo = document.getElementById('container-info');
    if (containerInfo) {
      const textoInfo = containerInfo.textContent || '';
      
      // Procurar por indicações de tamanho
      if (textoInfo.includes('40') || textoInfo.includes('40\'')) {
        return 40;
      } else if (textoInfo.includes('20') || textoInfo.includes('20\'')) {
        return 20;
      }
    }
    
    // Verificar dados do container em outros elementos
    const containerNumero = document.querySelector('[data-container-size]');
    if (containerNumero) {
      return parseInt(containerNumero.dataset.containerSize, 10);
    }
    
    return null;
  }

  /**
   * Aplica validação visual ao campo
   */
  aplicarValidacao(campo, valido, mensagem, tamanhoContainer = null) {
    // Remover classes existentes
    campo.classList.remove('is-valid', 'is-invalid');
    
    // Aplicar nova classe
    campo.classList.add(valido ? 'is-valid' : 'is-invalid');
    
    // Atualizar mensagem de status se existir
    const statusElement = this.encontrarElementoStatus(campo);
    if (statusElement) {
      statusElement.textContent = valido ? `✓ ${mensagem}` : `✗ ${mensagem}`;
      statusElement.className = valido ? 'text-success' : 'text-danger';
    }
    
    // Mostrar alerta se configurado e posição inválida
    if (!valido && this.config.SHOW_ALERTS && tamanhoContainer) {
      this.mostrarAlertaTEU(campo.value, tamanhoContainer, mensagem);
    }
  }

  /**
   * Encontra elemento de status relacionado ao campo
   */
  encontrarElementoStatus(campo) {
    // Procurar por ID específico
    const statusId = `status-${campo.id}`;
    let statusElement = document.getElementById(statusId);
    
    if (!statusElement) {
      // Procurar elemento próximo
      statusElement = campo.parentNode.querySelector('.status-posicao, .field-status');
    }
    
    return statusElement;
  }

  /**
   * Mostra alerta de erro TEU
   */
  mostrarAlertaTEU(posicao, tamanhoContainer, mensagem) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Posição incompatível com TEU',
        html: `
          <p>A posição <strong>${posicao}</strong> não é compatível com o tamanho do container.</p>
          <div class="alert alert-info mt-3">
            <h6><i class="fas fa-info-circle"></i> Regras de Posicionamento TEU:</h6>
            <ul class="text-start mb-0">
              <li>Containers de <strong>20 pés</strong> → Posições <strong>ímpares</strong> (A01, A03, A05...)</li>
              <li>Containers de <strong>40 pés</strong> → Posições <strong>pares</strong> (A02, A04, A06...)</li>
            </ul>
          </div>
          <p class="mt-3">Este container tem <strong>${tamanhoContainer} pés</strong> e deve ocupar uma posição <strong>${tamanhoContainer === 20 ? 'ímpar' : 'par'}</strong>.</p>
        `,
        confirmButtonText: 'Entendi',
        confirmButtonColor: '#0066b3'
      });
    } else {
      alert(`${mensagem}\n\nPosição: ${posicao}\nContainer: ${tamanhoContainer} pés`);
    }
  }

  /**
   * Limpa validação do campo
   */
  limparValidacao(campo) {
    campo.classList.remove('is-valid', 'is-invalid');
    
    const statusElement = this.encontrarElementoStatus(campo);
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = '';
    }
  }

  /**
   * Configura observador de mutações
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNewNode(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Processa novo nó adicionado
   */
  processNewNode(node) {
    // Verificar se é um campo de posição
    if (node.id && this.config.CAMPOS_POSICAO.includes(node.id)) {
      if (!this.camposMonitorados.has(node)) {
        this.setupFieldValidation(node);
        this.camposMonitorados.add(node);
        this.log(`✅ Novo campo TEU detectado: ${node.id}`);
      }
    }
    
    // Verificar campos filhos
    this.config.CAMPOS_POSICAO.forEach(campoId => {
      const campo = node.querySelector ? node.querySelector(`#${campoId}`) : null;
      if (campo && !this.camposMonitorados.has(campo)) {
        this.setupFieldValidation(campo);
        this.camposMonitorados.add(campo);
        this.log(`✅ Campo TEU filho detectado: ${campoId}`);
      }
    });
  }

  /**
   * Valida campo específico (usado no blur)
   */
  validarCampo(event) {
    const campo = event.target;
    const valor = campo.value.trim();
    
    if (valor.length > 0) {
      this.validarPosicaoTEU(campo, valor.toUpperCase());
    }
  }

  /**
   * Função de logging condicional
   */
  log(message, ...args) {
    if (this.config.ENABLE_DEBUG) {
      console.log(`[ValidadorTEU] ${message}`, ...args);
    }
  }

  /**
   * Destrói o validador
   */
  destroy() {
    this.camposMonitorados.forEach(campo => {
      campo.removeEventListener('input', this.handleInput);
      campo.removeEventListener('blur', this.validarCampo);
      delete campo.dataset.teuValidation;
    });
    
    this.camposMonitorados.clear();
    this.isInitialized = false;
    this.log('🗑️ ValidadorTEU destruído');
  }
}

// ========================================
// FUNÇÕES UTILITÁRIAS E COMPATIBILIDADE
// ========================================

/**
 * Função para validar posição por TEU (compatibilidade)
 * @param {string} posicao - Posição no formato A01-1
 * @param {number} tamanhoTEU - Tamanho do container (20 ou 40)
 * @returns {object} - Resultado da validação
 */
function validarPosicaoPorTEU(posicao, tamanhoTEU) {
  if (window.validadorTEU) {
    return window.validadorTEU.validarRegraTEU(posicao, tamanhoTEU);
  }
  
  // Fallback se validador não estiver disponível
  const formatoValido = /^[A-E](0[1-9]|1[0-9]|20)-[1-5]$/.test(posicao);
  
  if (!formatoValido) {
    return {
      valido: false,
      mensagem: 'Formato de posição inválido. Use o formato A01-1.'
    };
  }
  
  const baia = parseInt(posicao.substring(1, 3), 10);
  const ehPar = baia % 2 === 0;
  const posicaoValida = (tamanhoTEU === 20 && !ehPar) || (tamanhoTEU === 40 && ehPar);
  
  return {
    valido: posicaoValida,
    mensagem: posicaoValida 
      ? 'Posição válida' 
      : `Container de ${tamanhoTEU} pés deve ocupar posição ${tamanhoTEU === 20 ? 'ímpar' : 'par'}`
  };
}

/**
 * Valida posição para campo específico
 * @param {string} campoId - ID do campo
 * @param {string} posicao - Posição a validar
 * @returns {boolean} - True se válida
 */
function validarPosicaoTEUPorCampo(campoId, posicao) {
  const campo = document.getElementById(campoId);
  if (campo && window.validadorTEU) {
    return window.validadorTEU.validarPosicaoTEU(campo, posicao);
  }
  return true;
}

/**
 * Configura validação TEU para campo específico
 * @param {string} campoId - ID do campo
 */
function configurarValidacaoTEU(campoId) {
  const campo = document.getElementById(campoId);
  if (campo && window.validadorTEU) {
    window.validadorTEU.setupFieldValidation(campo);
    window.validadorTEU.camposMonitorados.add(campo);
  }
}

// ========================================
// INICIALIZAÇÃO E EXPORTAÇÕES
// ========================================

// Instância global
let validadorTEU = null;

/**
 * Inicializa o validador TEU
 */
function initValidadorTEU(customConfig = {}) {
  if (validadorTEU) {
    console.log('ℹ️ ValidadorTEU já existe, reconfigurando...');
    validadorTEU.destroy();
  }

  validadorTEU = new ValidadorTEU(customConfig);
  validadorTEU.initialize();

  return validadorTEU;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Carregando fix-posicao-teu.js...');
  
  // Inicializar após pequeno delay
  setTimeout(() => {
    initValidadorTEU({
      ENABLE_DEBUG: window.location.search.includes('debug=teu')
    });
  }, 500);
});

// Limpeza ao descarregar página
window.addEventListener('beforeunload', function() {
  if (validadorTEU) {
    validadorTEU.destroy();
  }
});

// ========================================
// EXPORTAÇÕES GLOBAIS
// ========================================

// Exportar para uso global
window.validadorTEU = validadorTEU;
window.initValidadorTEU = initValidadorTEU;
window.validarPosicaoPorTEU = validarPosicaoPorTEU;
window.validarPosicaoTEUPorCampo = validarPosicaoTEUPorCampo;
window.configurarValidacaoTEU = configurarValidacaoTEU;
window.ValidadorTEU = ValidadorTEU;

// Funções de compatibilidade
window.configurarValidacaoPosicao = () => {
  console.log('🔄 Usando método legado, sistema moderno já ativo');
  if (window.validadorTEU && !window.validadorTEU.isInitialized) {
    window.validadorTEU.initialize();
  }
};

console.log('✅ fix-posicao-teu.js: sistema de validação TEU disponível globalmente');
console.log('🔧 Uso: validarPosicaoPorTEU("A01-1", 20), configurarValidacaoTEU("campo_id")');
