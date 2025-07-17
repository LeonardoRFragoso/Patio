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
    const dadosPatio = await apiManager.obterDadosPatio3DComRetry();
    
    // 4) Inicializar componentes da interface APÓS carregar os dados
    setMensagem('Inicializando componentes da interface...');
    const modalsDialogs = new ModalsDialogs();
    
    // Registrar ModalsDialogs globalmente após sua inicialização
    console.log('📍 Registrando referência global ModalsDialogs');
    window.ModalsDialogs = modalsDialogs;
    
    // Inicializar interface UI após registrar todas as dependências globais
    // Nota: Usamos InterfaceController que já está importado, não InterfaceUI
    
    // Verificar se as referências foram registradas corretamente
    if (window.ModalsDialogs && window.APIManager) {
      console.log('✅ Referências globais registradas com sucesso!');
    } else {
      console.error('❌ Falha ao registrar referências globais!');
      if (!window.ModalsDialogs) console.error('❌ ModalsDialogs não está disponível globalmente');
      if (!window.APIManager) console.error('❌ APIManager não está disponível globalmente');
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
