/**
 * Sistema de Visualização 3D do Pátio - VERSÃO MODULARIZADA PARA SUZANO-SP
 * Arquivo: static/js/PatioVisualizacao3D.js
 * 
 * VERSÃO COMPLETAMENTE MODULARIZADA
 * Arquitetura limpa e organizada
 * Separação de responsabilidades
 * Manutenibilidade aprimorada
 * Performance otimizada
 */

// ===== IMPORTAÇÕES DOS MÓDULOS =====

// Utils
import { 
  CONFIG, 
  CORES, 
  CORES_ARMADORES, 
  API_ENDPOINTS,
  validateDependencies,
  PerformanceMonitor,
  HelperUtils,
  validarPosicionamentoContainer,
  isContainer40TEU,
  podeColocar20ft,
  podeColocar40ft
} from './patio3d/utils/index.js';

// Core
import {
  APIManager,
  SceneManager,
  AnimationSystem,
  DataManager
} from './patio3d/core/index.js';

// Components
import {
  ContainerRenderer,
  LabelsManager,
  Infrastructure,
  GridSystem
} from './patio3d/components/index.js';

// DESABILITADO: Causava marcações duplicadas - criarGridFisicoCorreto já cria as posições corretas
// import { EmptyPositionsCorrected } from './patio3d/components/empty-positions-corrected.js';

// UI
import {
  ToastManager,
  StatusDisplay,
  CameraControls,
  InteractionHandler,
  FiltersSearch,
  InterfaceController,
  ModalsDialogs
} from './patio3d/ui/index.js';

console.log(" Carregando PatioVisualizacao3D VERSÃO MODULARIZADA PARA SUZANO-SP...");

// ===== CLASSE PRINCIPAL MODULARIZADA =====
export class PatioVisualizacao3DManager {
  constructor() {
    // ===== COMPONENTES CORE =====
    this.sceneManager = new SceneManager();
    this.animationSystem = new AnimationSystem();
    this.apiManager = new APIManager();
    this.dataManager = null; // Será inicializado após outros componentes
    
    // ===== COMPONENTES 3D =====
    this.containerRenderer = new ContainerRenderer();
    // DESABILITADO: EmptyPositionsCorrected causava marcações duplicadas
    // this.emptyPositionsCorrected = new EmptyPositionsCorrected();
    this.labelsManager = new LabelsManager();
    this.infrastructure = new Infrastructure();
    this.gridSystem = new GridSystem();
    
    // ===== COMPONENTES UI =====
    this.toastManager = new ToastManager();
    this.statusDisplay = new StatusDisplay();
    this.modalsDialogs = new ModalsDialogs();
    
    // ===== UTILS =====
    this.helperUtils = new HelperUtils();
    this.performanceMonitor = new PerformanceMonitor();
    
    // ===== COMPONENTES QUE DEPENDEM DE INICIALIZAÇÃO =====
    this.cameraControls = null;
    this.interactionHandler = null;
    this.filtersSearch = null;
    this.interfaceController = null;
    
    // ===== REFERÊNCIAS THREE.JS =====
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // ===== GRUPOS DE OBJETOS =====
    this.containerGroup = null;
    this.labelGroup = null;
    this.posicoesVaziasGroup = null;
    this.infraestruturaGroup = null;
    this.luzesGrupo = null;
    
    // ===== ESTADO DO SISTEMA =====
    this.patioData = null;
    this.selectedContainer = null;
    this.hoveredContainer = null;
    this.transicionandoCamera = false;
    
    // ===== CONFIGURAÇÕES =====
    this.CONFIG = CONFIG;
    this.CORES = CORES;
    this.CORES_ARMADORES = CORES_ARMADORES;
    
    // Inicializar automaticamente
    this.init();
  }

  // ===== INICIALIZAÇÃO PRINCIPAL =====
  async init() {
    console.log(" Inicializando Sistema 3D MODULARIZADO PARA SUZANO-SP...");

    try {
      // 1. Validar dependências
      this.statusDisplay.atualizarStatusSistema("threejs", "loading", "Carregando THREE.js");
      
      if (!validateDependencies()) {
        throw new Error("Dependências THREE.js não encontradas");
      }
      
      // Atualizar status THREE.js com função direta
      this.atualizarStatusDireto("threejs", "success", "THREE.js " + THREE.REVISION);
      this.statusDisplay.atualizarStatusSistema("threejs", "success", "THREE.js " + THREE.REVISION);
      this.statusDisplay.atualizarProgresso(10, "Dependências validadas...");

      // 2. Configurar cena 3D
      this.statusDisplay.atualizarProgresso(20, "Criando cena 3D...");
      const sceneComponents = await this.sceneManager.configurarCenaCompleta();
      
      this.scene = sceneComponents.scene;
      this.camera = sceneComponents.camera;
      this.renderer = sceneComponents.renderer;
      this.luzesGrupo = sceneComponents.luzesGrupo;

      // 3. Criar grupos de objetos
      this.statusDisplay.atualizarProgresso(30, "Organizando grupos...");
      this.criarGruposObjetos();

      // 4. Configurar grid e infraestrutura
      this.statusDisplay.atualizarProgresso(40, "Criando grid e infraestrutura...");
      await this.configurarElementosEstaticos();

      // 5. Configurar controles e interações
      this.statusDisplay.atualizarProgresso(50, "Configurando controles...");
      this.configurarControlesInteracoes();

      // 6. Inicializar gerenciamento de dados
      this.statusDisplay.atualizarProgresso(60, "Configurando dados...");
      this.dataManager = new DataManager(this.apiManager, this.helperUtils, this.toastManager);

      // 7. Configurar sistemas de UI
      this.statusDisplay.atualizarProgresso(70, "Configurando interface...");
      this.configurarSistemasUI();

      // 8. Carregar dados reais
      this.statusDisplay.atualizarProgresso(80, "Carregando dados...");
      this.statusDisplay.atualizarStatusSistema("api", "loading", "Conectando");
      
      await this.carregarDadosIniciais();

      // 9. Configurar sistemas de monitoramento
      this.statusDisplay.atualizarProgresso(90, "Finalizando...");
      this.configurarMonitoramento();

      // 10. Iniciar animação
      this.iniciarSistemaAnimacao();

      // 11. Configuração final específica para Suzano-SP
      this.configuracaoFinalSuzano();

      // 12. Finalizar
      this.statusDisplay.atualizarProgresso(100, "Sistema carregado!");
      this.statusDisplay.ocultarLoadingComFade();
      
      // Aguardar um pouco para garantir que o DOM esteja pronto
      setTimeout(() => {
        // Usar função direta para render status
        this.atualizarStatusDireto("render", "success", "Renderizando");
        
        // Tentar também método original
        this.statusDisplay.atualizarStatusSistema("render", "success", "Renderizando");
        this.statusDisplay.atualizarIndicadorSistema("online", "Sistema Online");
        
        console.log(" Status final atualizado com delay (DIRETO + ORIGINAL)");
      }, 500);

      console.log(" Sistema MODULARIZADO inicializado com sucesso!");
      this.toastManager.show("Sistema 3D Premium carregado com sucesso!", "success");

      return true;

    } catch (error) {
      console.error(` Erro na inicialização: ${error.message}`);
      this.statusDisplay.atualizarStatusSistema("api", "error", "Erro: " + error.message);
      this.statusDisplay.atualizarIndicadorSistema("error", "Erro no Sistema");
      this.statusDisplay.mostrarErroCarregamento(`Erro ao inicializar: ${error.message}`);
      return false;
    }
  }

  // ===== CRIAR GRUPOS DE OBJETOS =====
  criarGruposObjetos() {
    this.containerGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.posicoesVaziasGroup = new THREE.Group();

    this.containerGroup.name = "Containers";
    this.labelGroup.name = "Labels";

    this.scene.add(this.containerGroup);
    this.scene.add(this.labelGroup);

    console.log(" Grupos de objetos criados");
  }

  // ===== CONFIGURAR ELEMENTOS ESTÁTICOS =====
  async configurarElementosEstaticos() {
    // Grid system básico
    const gridGroup = this.gridSystem.criarGridAprimorado();
    this.scene.add(gridGroup);

    // ✅ CORREÇÃO CRÍTICA: Criar grid físico com apenas 10 posições ímpares
    // Isso substitui/complementa o grid básico com as marcações corretas
    this.containerRenderer.criarGridFisicoCorreto(this.scene);

    // Infraestrutura
    this.infraestruturaGroup = await this.infrastructure.criarInfraestruturaRealistica();
    if (this.infraestruturaGroup) {
      this.scene.add(this.infraestruturaGroup);
    }

    console.log("✅ Elementos estáticos configurados com grid físico correto (10 posições ímpares)");
  }

  // ===== CONFIGURAR CONTROLES E INTERAÇÕES =====
  configurarControlesInteracoes() {
    // Criar controles da câmera
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    
    // Inicializar camera controls
    this.cameraControls = new CameraControls(
      this.camera,
      this.controls,
      this.scene,
      this.CONFIG
    );
    this.cameraControls.configurarControlesAvancados();

    // Configurar interaction handler
    this.interactionHandler = new InteractionHandler(
      this.camera,
      this.renderer,
      this.containerGroup,
      this.CONFIG,
      this.CORES
    );

    console.log(" Controles e interações configurados");
  }

  // ===== CONFIGURAR SISTEMAS DE UI =====
  configurarSistemasUI() {
    // Filters & Search
    this.filtersSearch = new FiltersSearch(
      this.containerGroup,
      this.patioData,
      this.CONFIG
    );

    // Interface Controller
    this.interfaceController = new InterfaceController(
      this.scene,
      this.camera,
      this.renderer,
      this.controls,
      this.containerGroup,
      this.CONFIG
    );

    // Inicializar interface após todos os grupos estarem prontos
    this.interfaceController.init(
      this.labelGroup,
      this.infraestruturaGroup,
      this.posicoesVaziasGroup
    );

    console.log(" Sistemas de UI configurados");
  }

  // ===== ATUALIZAÇÃO DIRETA DE STATUS (BACKUP) =====
  atualizarStatusDireto(tipo, status, texto) {
    console.log(` Atualizando status: ${tipo} -> ${status} (${texto})`);
    const elemento = document.getElementById(`${tipo}-status`);
    if (elemento) {
      elemento.className = `status-badge ${status}`;
      elemento.textContent = texto;
      console.log(` Status ${tipo} atualizado com sucesso`);
    } else {
      console.error(` Elemento ${tipo}-status não encontrado`);
    }
  }

  // ===== CARREGAR DADOS INICIAIS =====
  async carregarDadosIniciais() {
    const result = await this.dataManager.carregarDadosReais();
    
    if (result.success) {
      this.patioData = result.data;
      
      // Atualizar status com delay para garantir DOM ready
      setTimeout(() => {
        // Usar função direta como backup
        this.atualizarStatusDireto("api", "success", "Conectado");
        this.atualizarStatusDireto("data", "success", `${this.patioData.containers?.length || 0} containers`);
        
        // Tentar também o método original
        this.statusDisplay.atualizarStatusSistema("api", "success", "Conectado");
        this.statusDisplay.atualizarStatusSistema("data", "success", `${this.patioData.containers?.length || 0} containers`);
        
        console.log(" Status API e dados atualizados com delay (DIRETO + ORIGINAL)");
      }, 300);

      // Criar visualização
      await this.criarVisualizacaoCompleta();
      
      // Atualizar estatísticas
      this.dataManager.atualizarEstatisticas();
      this.statusDisplay.atualizarUltimaAtualizacao();

    } else {
      this.statusDisplay.atualizarStatusSistema("api", "error", "Erro na conexão");
      this.statusDisplay.atualizarStatusSistema("data", "error", "Sem dados");
      
      if (result.data?.containers?.length === 0) {
        this.statusDisplay.mostrarMensagemSemDados();
      }
    }
  }

  // ===== CRIAR VISUALIZAÇÃO COMPLETA =====
  async criarVisualizacaoCompleta() {
    console.log(" Criando visualização completa...");

    // 1. Renderizar containers
    const containersRenderizados = this.containerRenderer.criarVisualizacaoContainers(
      this.patioData,
      this.containerGroup,
      this.labelGroup
    );

    // 2. Criar posições vazias
    this.posicoesVaziasGroup = this.emptyPositions.criarPosicoesVazias(
      this.patioData.containers
    );
    if (this.posicoesVaziasGroup) {
      this.containerGroup.add(this.posicoesVaziasGroup);
    }

    // 3. Criar labels
    const labelsCreados = this.labelsManager.criarLabelsContainers(
      this.patioData.containers,
      this.labelGroup
    );

    // 4. Atualizar filters & search com novos dados
    this.filtersSearch = new FiltersSearch(
      this.containerGroup,
      this.patioData,
      this.CONFIG
    );

    console.log(` Visualização criada: ${containersRenderizados} containers, ${labelsCreados} labels`);
  }

  // ===== CONFIGURAR MONITORAMENTO =====
  configurarMonitoramento() {
    // Iniciar monitor de performance
    this.performanceMonitor.start();
    this.animationSystem.setPerformanceMonitor(this.performanceMonitor);

    // Configurar eventos customizados
    this.configurarEventosCustomizados();

    console.log(" Sistemas de monitoramento configurados");
  }

  // ===== CONFIGURAR EVENTOS CUSTOMIZADOS =====
  configurarEventosCustomizados() {
    // Eventos de câmera
    document.addEventListener('posicionarCameraCompleta', () => {
      this.cameraControls.posicionarCameraCompletaAnimada();
    });

    document.addEventListener('posicionarCameraTopo', () => {
      this.cameraControls.posicionarCameraTopo();
    });

    document.addEventListener('posicionarCameraLateral', () => {
      this.cameraControls.posicionarCameraLateral();
    });

    // Eventos de dados
    document.addEventListener('recarregarDados', async () => {
      await this.recarregarDados();
    });

    // Eventos de containers
    document.addEventListener('centralizarContainer', (event) => {
      const { numeroContainer } = event.detail;
      this.cameraControls.centralizarContainer(
        numeroContainer,
        this.patioData,
        this.helperUtils.normalizarDadosContainer.bind(this.helperUtils),
        this.helperUtils.calcularPosicao3D.bind(this.helperUtils)
      );
    });

    // Eventos de detecção de problemas
    document.addEventListener('detectarContainersProblematicos', () => {
      this.dataManager.detectarContainersProblematicos();
    });

    // Eventos de partículas
    document.addEventListener('adicionarParticulas', (event) => {
      const { particulas } = event.detail;
      this.scene.add(particulas);
    });

    document.addEventListener('removerParticulas', (event) => {
      const { particulas } = event.detail;
      this.scene.remove(particulas);
    });

    console.log(" Eventos customizados configurados");
  }

  // ===== INICIAR SISTEMA DE ANIMAÇÃO =====
  iniciarSistemaAnimacao() {
    this.animationSystem.iniciarSistemaAnimacao(
      this.scene,
      this.camera,
      this.renderer,
      this.controls,
      this.labelGroup
    );

    console.log(" Sistema de animação iniciado");
  }

  // ===== CONFIGURAÇÃO FINAL ESPECÍFICA PARA SUZANO-SP =====
  configuracaoFinalSuzano() {
    // Vista lateral padrão para Suzano-SP
    setTimeout(() => {
      this.cameraControls.posicionarCameraLateralSuzano();
      this.interfaceController.definirVistaPadraoLateral();
    }, 1000);

    // Sistemas específicos de detecção
    setTimeout(() => {
      this.dataManager.detectarContainersProblematicos();
    }, 2000);

    console.log(" Configurações específicas para Suzano-SP aplicadas");
  }

  // ===== MÉTODOS PÚBLICOS PRINCIPAIS =====

  async recarregarDados() {
    console.log(" Recarregando dados...");
    this.statusDisplay.atualizarStatusSistema("data", "loading", "Recarregando");

    try {
      // Limpar visualização atual
      this.helperUtils.limparGrupo(this.containerGroup);
      this.helperUtils.limparGrupo(this.labelGroup);

      // Recarregar dados
      const result = await this.dataManager.carregarDadosReais();
      
      if (result.success) {
        this.patioData = result.data;
        
        // Recriar visualização
        await this.criarVisualizacaoCompleta();
        
        // Atualizar estatísticas
        this.dataManager.atualizarEstatisticas();
        this.statusDisplay.atualizarUltimaAtualizacao();

        this.toastManager.show("Dados atualizados com sucesso!", "success");
      } else {
        this.toastManager.show("Erro ao atualizar dados", "error");
      }
    } catch (error) {
      console.error(" Erro ao recarregar dados:", error);
      this.toastManager.show("Erro ao recarregar dados", "error");
    }
  }

  buscarContainer(numero) {
    return this.filtersSearch.buscarContainer(numero);
  }

  exportarImagem(formato = "png") {
    return this.interfaceController.exportarImagem(formato);
  }

  toggleTelaCheia() {
    return this.interfaceController.toggleTelaCheia();
  }

  resetCompleto() {
    this.interfaceController.resetCompleto();
  }

  // ===== MÉTODOS ADICIONAIS DA VERSÃO BACKUP =====

  // Método para aplicar filtros avançados
  aplicarFiltros(filtros = {}) {
    console.log(" Aplicando filtros:", filtros);
    
    if (filtros.armador) {
      this.containerRenderer.filtrarContainersPorArmador(this.containerGroup, filtros.armador);
    }
    
    if (filtros.status) {
      this.containerRenderer.filtrarContainersPorStatus(this.containerGroup, filtros.status);
    }
    
    if (filtros.teu) {
      this.containerRenderer.filtrarContainersPorTEU(this.containerGroup, filtros.teu);
    }
    
    // Atualizar labels baseado nos filtros
    this.labelsManager.atualizarVisibilidadeLabels(this.labelGroup, filtros);
    
    this.toastManager.show("Filtros aplicados", "info");
  }

  // Método para limpar todos os filtros
  limparFiltros() {
    console.log(" Limpando filtros...");
    
    // Tornar todos os containers visíveis
    this.containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        child.visible = true;
        child.material.transparent = false;
        child.material.opacity = 1.0;
      }
    });
    
    // Tornar todos os labels visíveis
    this.labelGroup.children.forEach(child => {
      child.visible = true;
    });
    
    this.toastManager.show("Filtros removidos", "info");
  }

  // Método para posicionar câmera em vista específica
  posicionarCameraCompleta() {
    this.cameraControls.posicionarCameraCompletaAnimada();
  }

  posicionarCameraTopo() {
    this.cameraControls.posicionarCameraTopo();
  }

  posicionarCameraLateral() {
    this.cameraControls.posicionarCameraLateral();
  }

  // Método para resetar câmera
  resetarCamera() {
    this.cameraControls.resetarCamera();
  }

  // Método para alternar visibilidade de elementos
  toggleInfraestrutura() {
    if (this.infraestruturaGroup) {
      this.infraestruturaGroup.visible = !this.infraestruturaGroup.visible;
      this.toastManager.show(
        `Infraestrutura ${this.infraestruturaGroup.visible ? 'visível' : 'oculta'}`,
        "info"
      );
    }
  }

  toggleLabels() {
    if (this.labelGroup) {
      this.labelGroup.visible = !this.labelGroup.visible;
      this.toastManager.show(
        `Labels ${this.labelGroup.visible ? 'visíveis' : 'ocultos'}`,
        "info"
      );
    }
  }

  togglePosicoesVazias() {
    if (this.posicoesVaziasGroup) {
      this.posicoesVaziasGroup.visible = !this.posicoesVaziasGroup.visible;
      this.toastManager.show(
        `Posições vazias ${this.posicoesVaziasGroup.visible ? 'visíveis' : 'ocultas'}`,
        "info"
      );
    }
  }

  // Método para debug completo
  debug(mensagem, tipo = "info") {
    console.log(`[DEBUG] ${mensagem}`);
    if (tipo === "error") {
      console.error(`[ERROR] ${mensagem}`);
    }
    this.toastManager.show(mensagem, tipo);
  }

  // Método para obter estatísticas do sistema
  obterEstatisticas() {
    const stats = {
      containers: {
        total: this.patioData?.containers?.length || 0,
        renderizados: this.containerRenderer.getContainerInfo().containersRenderizados,
        problematicos: this.dataManager.detectarContainersProblematicos().length
      },
      performance: this.performanceMonitor.getCurrentStats(),
      memoria: {
        texturas: this.sceneManager.getInfo().cache.texturas,
        materiais: this.sceneManager.getInfo().cache.materiais,
        objetos: this.scene ? this.scene.children.length : 0
      },
      sistema: {
        threejs: THREE.REVISION,
        webgl: this.renderer?.capabilities?.isWebGL2 ? "WebGL2" : "WebGL1",
        dispositivo: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop"
      }
    };
    
    console.log(" Estatísticas do sistema:", stats);
    return stats;
  }

  // Método para validar integridade do sistema
  validarIntegridade() {
    const problemas = [];
    
    if (!this.scene) problemas.push("Cena não inicializada");
    if (!this.camera) problemas.push("Câmera não inicializada");
    if (!this.renderer) problemas.push("Renderer não inicializado");
    if (!this.patioData) problemas.push("Dados do pátio não carregados");
    
    if (problemas.length > 0) {
      console.error(" Problemas de integridade:", problemas);
      this.toastManager.show(`${problemas.length} problemas detectados`, "error");
      return false;
    }
    
    console.log(" Sistema íntegro");
    this.toastManager.show("Sistema funcionando corretamente", "success");
    return true;
  }

  // ===== MÉTODOS PARA COMPATIBILIDADE =====

  detectarContainersProblematicos() {
    return this.dataManager.detectarContainersProblematicos();
  }

  centralizarContainer(numeroContainer) {
    this.cameraControls.centralizarContainer(
      numeroContainer,
      this.patioData,
      this.helperUtils.normalizarDadosContainer.bind(this.helperUtils),
      this.helperUtils.calcularPosicao3D.bind(this.helperUtils)
    );
  }

  destacarContainer(numeroContainer) {
    this.interactionHandler.destacarContainer(numeroContainer);
  }

  // ===== MÉTODOS DE DEBUG =====

  debugCena() {
    this.helperUtils.debugCena(this.scene, this.containerGroup, this.performanceMonitor.getCurrentStats());
  }

  debugAPIs() {
    console.log(" Testando APIs...");
    this.apiManager.obterDadosPatio3D()
      .then((result) => {
        console.log(`API funcionando: ${result.data?.containers?.length || 0} containers`);
      })
      .catch((error) => {
        console.error(`Erro na API: ${error.message}`);
      });
  }

  getSystemInfo() {
    return {
      scene: this.sceneManager.getInfo(),
      performance: this.performanceMonitor.getCurrentStats(),
      animation: this.animationSystem.getAnimationInfo(),
      data: this.dataManager.getDataInfo(),
      containers: this.containerRenderer.getContainerInfo(),
      emptyPositions: this.emptyPositions.getInfo(),
      labels: this.labelsManager.getInfo(),
      infrastructure: this.infrastructure.getInfo(),
      grid: this.gridSystem.getInfo(),
      interface: this.interfaceController.getEstadoInterface()
    };
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log(" Limpando sistema completo...");

    // Parar animação
    this.animationSystem.dispose();

    // Limpar componentes
    this.containerRenderer.dispose();
    this.emptyPositions.dispose();
    this.labelsManager.dispose();
    this.infrastructure.dispose();
    this.gridSystem.dispose();

    // Limpar sistemas
    this.performanceMonitor.dispose();
    this.dataManager.dispose();
    this.sceneManager.dispose();

    console.log(" Sistema limpo completamente");
  }
}

// ===== DISPONIBILIZAR GLOBALMENTE =====
window.PatioVisualizacao3DManager = PatioVisualizacao3DManager;

// ===== INSTÂNCIA GLOBAL =====
let patio3dManagerInstance = null;

// ===== INICIALIZAÇÃO AUTOMÁTICA =====
document.addEventListener("DOMContentLoaded", async function () {
  try {
    console.log(" Inicializando Sistema 3D MODULARIZADO...");

    // Aguardar carregamento do THREE.js
    const aguardarTHREE = () => {
      return new Promise((resolve) => {
        const verificar = () => {
          if (typeof THREE !== "undefined") {
            resolve();
          } else {
            setTimeout(verificar, 100);
          }
        };
        verificar();
      });
    };

    await aguardarTHREE();

    patio3dManagerInstance = new PatioVisualizacao3DManager();

    // Disponibilizar globalmente
    window.patio3dManager = patio3dManagerInstance;
    window.patio3d = patio3dManagerInstance; // Alias

    // Funções de utilidade global
    window.testarZoom = () => {
      console.log(" Teste de zoom executado");
      patio3dManagerInstance.cameraControls.posicionarCameraTopo();
    };

    window.debugCena = () => patio3dManagerInstance.debugCena();
    window.resetarCamera = () => patio3dManagerInstance.cameraControls.resetarCamera();
    window.exportarImagem = (formato = "png") => patio3dManagerInstance.exportarImagem(formato);
    window.toggleTelaCheia = () => patio3dManagerInstance.toggleTelaCheia();
    window.resetCompleto = () => patio3dManagerInstance.resetCompleto();
    window.detectarProblemas = () => patio3dManagerInstance.detectarContainersProblematicos();
    window.getSystemInfo = () => patio3dManagerInstance.getSystemInfo();

    console.log(" Sistema MODULARIZADO inicializado com sucesso!");
    console.log(" Funções disponíveis:");
    console.log("  - testarZoom() - Testa vista de topo");
    console.log("  - debugCena() - Mostra informações da cena");
    console.log("  - resetarCamera() - Reseta a câmera");
    console.log("  - exportarImagem() - Exporta vista atual");
    console.log("  - toggleTelaCheia() - Alterna tela cheia");
    console.log("  - resetCompleto() - Reset completo do sistema");
    console.log("  - detectarProblemas() - Detecta containers problemáticos");
    console.log("  - getSystemInfo() - Informações completas do sistema");

  } catch (error) {
    console.error(" Erro crítico:", error);

    // Mostrar erro na interface
    const container = document.getElementById("three-container");
    if (container) {
      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: #f8d7da; color: #721c24; text-align: center; padding: 20px;">
          <div>
            <h3><i class="fas fa-exclamation-triangle"></i> Erro Crítico</h3>
            <p>${error.message}</p>
            <button class="btn btn-danger" onclick="location.reload()">
              <i class="fas fa-sync-alt me-2"></i>Recarregar Página
            </button>
          </div>
        </div>
      `;
    }
  }
});

// ===== LIMPEZA NA SAÍDA =====
window.addEventListener("beforeunload", () => {
  if (patio3dManagerInstance) {
    patio3dManagerInstance.dispose();
    console.log(" Recursos do sistema 3D limpos na saída");
  }
});

console.log(" PatioVisualizacao3D MODULARIZADO carregado!");