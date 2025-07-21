/*
 * Ponto de Entrada do Sistema 3D Modular
 * Versão corrigida para Suzano-SP
 * Caminho: static/js/patio3d/main.js
 */

import { validateDependencies } from './utils/dependencies-validator.js';
import { CONFIG, CORES } from './utils/constants.js';

// Core
import { APIManager } from './core/api-manager.js';
import { SceneManager } from './core/scene-manager.js';
import { AnimationSystem } from './core/animation-system.js';

// Components
import { ContainerRenderer } from './components/container-renderer.js';
import { Infrastructure } from './components/infrastructure.js';
import { EmptyPositions } from './components/empty-positions.js';
// Novos componentes de infraestrutura e posições vazias agora integrados

// UI
import { InterfaceController } from './ui/interface-controller.js';
import { CameraControls } from './ui/camera-controls.js';
import { ModalsDialogs } from './ui/modals-dialogs.js';
import { InteractionHandler } from './ui/interaction-handler.js';
import { StatusDisplay } from './ui/status-display.js';
import { FiltersSearch } from './ui/filters-search.js';

// ================ BOOTSTRAP PRINCIPAL ================

window.addEventListener('DOMContentLoaded', () => {
  iniciarPatio3D();
});

async function iniciarPatio3D() {
  // Referências ao overlay de carregamento
  const overlay = document.getElementById('loading-overlay');
  const loadingMsg = document.getElementById('loading-message');
  const progressBar = document.getElementById('progress-bar');

  const setMensagem = (texto) => {
    if (loadingMsg) loadingMsg.innerText = texto;
  };
  const setProgresso = (pct) => {
    if (progressBar) progressBar.style.width = `${pct}%`;
  };

  try {
    // 1) Validação de dependências THREE.js / OrbitControls
    setMensagem('Validando dependências...');
    if (!validateDependencies()) {
      throw new Error('Dependências do Three.js não carregadas');
    }
    setProgresso(10);

    // 2) Inicializar APIManager para carregar dados
    setMensagem('Inicializando API Manager...');
    const apiManager = new APIManager(CONFIG.API_ENDPOINTS);
    
    // Registrar APIManager globalmente primeiro para que esteja disponível para outros componentes
    console.log('📍 Registrando referência global APIManager');
    window.APIManager = apiManager;
    
    // 3) Carregar dados reais do backend
    setMensagem('Carregando dados do pátio...');
    
    // Atualizar status para sincronizando
    const statusElement = document.getElementById('dados-status');
    if (statusElement) {
      statusElement.className = 'status-badge loading';
      statusElement.textContent = '🔄 SINCRONIZANDO';
    }
    
    const dadosPatio = await apiManager.obterDadosPatio3DComRetry();
    
    // Atualizar status para sincronizado após carregamento bem-sucedido
    if (statusElement) {
      statusElement.className = 'status-badge success';
      statusElement.textContent = '✅ SINCRONIZADO';
    }
    
    // 4) Inicializar componentes da interface APÓS carregar os dados
    setMensagem('Inicializando componentes da interface...');
    const modalsDialogs = new ModalsDialogs();
    const statusDisplay = new StatusDisplay();
    
    // Registrar componentes globalmente após sua inicialização
    console.log('📍 Registrando referências globais');
    window.ModalsDialogs = modalsDialogs;
    window.StatusDisplay = statusDisplay;
    
    // Atualizar estatísticas com os dados carregados usando método direto
    console.log('📊 Estrutura dos dados recebidos:', dadosPatio);
    
    // Verificar múltiplas estruturas possíveis dos dados
    let containers = [];
    if (dadosPatio?.data?.containers) {
      containers = dadosPatio.data.containers;
    } else if (dadosPatio?.containers) {
      containers = dadosPatio.containers;
    } else if (Array.isArray(dadosPatio?.data)) {
      containers = dadosPatio.data;
    } else if (Array.isArray(dadosPatio)) {
      containers = dadosPatio;
    }
    
    console.log(`📦 Containers encontrados: ${containers.length}`);
    console.log('📦 Primeiro container (amostra):', containers[0]);
    
    // USAR MÉTODO DIRETO para garantir atualização
    if (containers.length > 0) {
      console.log('🚀 Usando método DIRETO para atualizar estatísticas com', containers.length, 'containers');
      statusDisplay.forcarAtualizacaoEstatisticas(containers);
      
      // Também tentar o método original como backup
      statusDisplay.atualizarEstatisticas(containers);
    } else {
      console.warn('⚠️ Nenhum container encontrado nos dados para atualizar estatísticas');
      // Forçar valores zerados se não há containers
      statusDisplay.forcarAtualizacaoEstatisticas([]);
    }
    console.log('Estrutura completa dos dados:', JSON.stringify(dadosPatio, null, 2));
    
    statusDisplay.atualizarUltimaAtualizacao();
    
    // Confirmar que os dados foram sincronizados com sucesso
    console.log('📊 Dados do pátio sincronizados com sucesso!');
    console.log(`📦 Total de containers carregados: ${dadosPatio.data?.containers?.length || 0}`);
    
    // Verificar se as referências foram registradas corretamente
    if (window.ModalsDialogs && window.APIManager && window.StatusDisplay) {
      console.log('✅ Referências globais registradas com sucesso!');
    } else {
      console.error('❌ Falha ao registrar referências globais!');
      if (!window.ModalsDialogs) console.error('❌ ModalsDialogs não está disponível globalmente');
      if (!window.APIManager) console.error('❌ APIManager não está disponível globalmente');
      if (!window.StatusDisplay) console.error('❌ StatusDisplay não está disponível globalmente');
    }
    setProgresso(35);

    // 3) Configurar cena, câmera e renderer
    setMensagem('Configurando cena 3D...');
    const sceneManager = new SceneManager();
    const { scene, camera, renderer } = await sceneManager.configurarCenaCompleta();
    setProgresso(55);

    // 4) Criar controles de câmera (OrbitControls) & wrapper CameraControls
    setMensagem('Configurando controles de câmera...');
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    const cameraControls = new CameraControls(camera, controls, scene, CONFIG);
    cameraControls.configurarControlesAvancados();
    setProgresso(65);

    // 4.5) Construir infraestrutura básica (base, muros, vias, etc.)
    setMensagem('Construindo infraestrutura...');
    const infrastructure = new Infrastructure();
    const infraestruturaGroup = await infrastructure.criarInfraestruturaRealistica();
    scene.add(infraestruturaGroup);
    setProgresso(70);

    // 5) Renderizar containers (e demais entidades) a partir dos dados
    setMensagem('Renderizando containers...');
    const containerGroup = new THREE.Group();
    scene.add(containerGroup);
    const labelGroup = new THREE.Group();
    scene.add(labelGroup);

    const containerRenderer = new ContainerRenderer();
    // dadosPatio.data deve conter objeto { containers: [...] }
    const qtdRenderizados = containerRenderer.criarVisualizacaoContainers(
      dadosPatio.data,
      containerGroup,
      labelGroup,
    );
    console.log(`🛠️ Containers renderizados: ${qtdRenderizados}`);
    setProgresso(80);

    // 5.5) Gerar posições vazias visíveis por padrão
    setMensagem('Gerando posições vazias...');
    const emptyPositions = new EmptyPositions();
    const posicoesVaziasGroup = emptyPositions.criarPosicoesVazias(dadosPatio.data?.containers || []);
    scene.add(posicoesVaziasGroup);
    setProgresso(85);

    // 6) Sistema de animação principal
    setMensagem('Iniciando animações...');
    const animationSystem = new AnimationSystem();
    animationSystem.iniciarSistemaAnimacao(
      scene,
      camera,
      renderer,
      controls,
      labelGroup,
    );
    setProgresso(90);

    // 7) Sistema de Interação (cliques, hover, etc.)
    setMensagem('Configurando sistema de interação...');
    const interactionHandler = new InteractionHandler(
      camera,
      renderer,
      containerGroup,
      CONFIG,
      CORES
    );
    
    // Registrar InteractionHandler globalmente
    window.interactionHandler = interactionHandler;
    setProgresso(95);

    // 8) Interface (botões, eventos, etc.)
    setMensagem('Configurando interface...');
    const interfaceController = new InterfaceController(
      scene,
      camera,
      renderer,
      controls,
      containerGroup,
      CONFIG,
    );
    interfaceController.init(labelGroup, infraestruturaGroup, posicoesVaziasGroup);
    
    // 9) Sistema de filtros
    const filtersSearch = new FiltersSearch(containerGroup, dadosPatio.data, CONFIG);
    window.FiltersSearch = filtersSearch;
    
    setProgresso(100);

    // Guardar referências globais úteis para debug no console
    window.patio3dManager = {
      apiManager,
      sceneManager,
      animationSystem,
      interfaceController,
      interactionHandler,
      cameraControls,
      containerRenderer,
      infrastructure,
      emptyPositions,
      statusDisplay,
      filtersSearch,
      modalsDialogs,
      // Métodos úteis para debug
      recarregarDados: async () => {
        console.log('🔄 Recarregando dados e forçando atualização das estatísticas...');
        const novosDados = await apiManager.obterDadosPatio3DComRetry();
        
        // Extrair containers com múltiplas tentativas
        let containers = [];
        if (novosDados?.data?.containers) {
          containers = novosDados.data.containers;
        } else if (novosDados?.containers) {
          containers = novosDados.containers;
        } else if (Array.isArray(novosDados?.data)) {
          containers = novosDados.data;
        }
        
        console.log(`📦 Containers encontrados no reload: ${containers.length}`);
        
        // Usar método direto
        statusDisplay.forcarAtualizacaoEstatisticas(containers);
        statusDisplay.atualizarEstatisticas(containers);
        statusDisplay.atualizarUltimaAtualizacao();
        console.log('✅ Dados recarregados e estatísticas atualizadas!');
      },
      
      // Método para forçar atualização manual das estatísticas
      forcarEstatisticas: async () => {
        console.log('🚀 Forçando atualização manual das estatísticas...');
        try {
          const dados = await apiManager.obterDadosPatio3DComRetry();
          let containers = dados?.data?.containers || dados?.containers || dados?.data || [];
          console.log(`📊 Forçando atualização com ${containers.length} containers`);
          statusDisplay.forcarAtualizacaoEstatisticas(containers);
          return containers.length;
        } catch (error) {
          console.error('❌ Erro ao forçar atualização:', error);
          return 0;
        }
      }
    };
    
    // Método global de emergência para atualização das estatísticas
    window.forcarAtualizacaoEstatisticas = async () => {
      return window.patio3dManager.forcarEstatisticas();
    };

    // Remover overlay de carregamento
    if (overlay) overlay.style.display = 'none';
    console.log('✅ Sistema 3D inicializado com sucesso!');
  } catch (erro) {
    console.error('Erro ao inicializar sistema 3D:', erro);
    setMensagem(`Erro: ${erro.message}`);
    if (overlay) overlay.classList.add('error');
  }
}
