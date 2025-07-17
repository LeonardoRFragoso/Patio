/**
 * Gerenciador de Cena 3D - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: core/scene-manager.js
 */

import { CONFIG } from '../utils/constants.js';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.luzesGrupo = null;
    this.textureLoader = new THREE.TextureLoader();
    this.materiaisCache = new Map();
    this.texturasCache = new Map();
  }

  // ===== CRIAÇÃO DA CENA HDR =====
  async criarCenaHDR() {
    console.log("🌅 Criando cena HDR...");
    
    this.scene = new THREE.Scene();

    // Fundo gradient realista (céu do dia)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(0.7, "#98D8E8");
    gradient.addColorStop(1, "#F0F8FF");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    // Removido efeito de névoa para melhorar visualização em zoom reduzido
    // this.scene.fog = new THREE.FogExp2(0xe6f3ff, 0.0015);

    console.log("✅ Cena HDR criada com céu realista");
    return this.scene;
  }

  // ===== CÂMERA CINEMATOGRÁFICA =====
  criarCameraAvancada() {
    console.log("📷 Criando câmera cinematográfica...");
    
    const container = document.getElementById("three-container");
    if (!container) {
      throw new Error("Container three-container não encontrado");
    }

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);

    // Posição inicial cinematográfica
    const patioWidth = 20 * CONFIG.ESPACAMENTO_BAIA;
    const patioDepth = 5 * CONFIG.ESPACAMENTO_ROW;

    this.camera.position.set(patioWidth * 0.6, 120, patioDepth * 2);
    this.camera.lookAt(0, 10, 0);

    // Configurar para HDR
    this.camera.filmGauge = 35;
    this.camera.filmOffset = 0;

    console.log("✅ Câmera cinematográfica posicionada");
    return this.camera;
  }

  // ===== RENDERER PREMIUM =====
  criarRendererPremium() {
    console.log("🎨 Criando renderer premium...");
    
    const container = document.getElementById("three-container");
    if (!container) {
      throw new Error("Container three-container não encontrado");
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      logarithmicDepthBuffer: true,
    });

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Configurações avançadas de qualidade
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Configurações de rendering avançadas
    this.renderer.gammaFactor = 2.2;
    this.renderer.gammaOutput = true;

    // Limpar container e adicionar canvas
    const overlay = document.getElementById("loading-overlay");
    container.innerHTML = "";
    container.appendChild(this.renderer.domElement);
    if (overlay) container.appendChild(overlay);

    console.log("✅ Renderer premium configurado com HDR e tone mapping");
    return this.renderer;
  }

  // ===== SISTEMA DE ILUMINAÇÃO HDR =====
  async configurarIluminacaoHDR() {
    console.log("☀️ Configurando iluminação HDR...");
    
    this.luzesGrupo = new THREE.Group();
    this.luzesGrupo.name = "Iluminacao";

    // Sol principal (luz direcional forte)
    const luzSol = new THREE.DirectionalLight(0xfff8dc, 3.0);
    luzSol.position.set(200, 300, 100);
    luzSol.castShadow = true;

    // Configurações de sombra ultra qualidade
    luzSol.shadow.mapSize.width = CONFIG.QUALIDADE_SOMBRAS;
    luzSol.shadow.mapSize.height = CONFIG.QUALIDADE_SOMBRAS;
    luzSol.shadow.camera.near = 0.1;
    luzSol.shadow.camera.far = 1000;
    luzSol.shadow.camera.left = -300;
    luzSol.shadow.camera.right = 300;
    luzSol.shadow.camera.top = 300;
    luzSol.shadow.camera.bottom = -300;
    luzSol.shadow.bias = -0.0001;
    luzSol.shadow.normalBias = 0.02;
    luzSol.shadow.radius = 4;

    this.luzesGrupo.add(luzSol);

    // Luz ambiente suave para realismo
    const luzAmbiente = new THREE.AmbientLight(0x87ceeb, 0.4);
    this.luzesGrupo.add(luzAmbiente);

    // Luz hemisférica para simular reflexão do céu
    const luzHemisferica = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
    luzHemisferica.position.set(0, 200, 0);
    this.luzesGrupo.add(luzHemisferica);

    // Luzes pontuais para destaque dos portões
    const luzPortaoEntrada = new THREE.PointLight(0x4169e1, 2.0, 50);
    luzPortaoEntrada.position.set(-100, 15, 0);
    luzPortaoEntrada.castShadow = true;
    luzPortaoEntrada.shadow.mapSize.width = 512;
    luzPortaoEntrada.shadow.mapSize.height = 512;
    this.luzesGrupo.add(luzPortaoEntrada);

    const luzPortaoSaida = new THREE.PointLight(0xff6347, 2.0, 50);
    luzPortaoSaida.position.set(100, 15, 0);
    luzPortaoSaida.castShadow = true;
    luzPortaoSaida.shadow.mapSize.width = 512;
    luzPortaoSaida.shadow.mapSize.height = 512;
    this.luzesGrupo.add(luzPortaoSaida);

    // Luzes da ferrovia
    for (let i = 0; i < 3; i++) {
      const luzFerrovia = new THREE.SpotLight(
        0xffffe0,
        1.5,
        100,
        Math.PI / 8,
        0.3
      );
      luzFerrovia.position.set(120, 25, -30 + i * 30);
      luzFerrovia.target.position.set(100, 0, -30 + i * 30);
      luzFerrovia.castShadow = true;
      luzFerrovia.shadow.mapSize.width = 512;
      luzFerrovia.shadow.mapSize.height = 512;
      this.luzesGrupo.add(luzFerrovia);
      this.luzesGrupo.add(luzFerrovia.target);
    }

    this.scene.add(this.luzesGrupo);

    console.log("✅ Sistema de iluminação HDR configurado com 8 fontes de luz");
    return this.luzesGrupo;
  }

  // ===== CONFIGURAÇÃO COMPLETA =====
  async configurarCenaCompleta() {
    console.log("🎬 Configurando cena completa...");
    
    try {
      // Criar todos os componentes
      await this.criarCenaHDR();
      this.criarCameraAvancada();
      this.criarRendererPremium();
      await this.configurarIluminacaoHDR();

      // Configurar eventos de redimensionamento
      this.configurarEventoRedimensionamento();

      console.log("✅ Cena completa configurada com sucesso");
      
      return {
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer,
        luzesGrupo: this.luzesGrupo
      };
      
    } catch (error) {
      console.error("❌ Erro ao configurar cena:", error);
      throw error;
    }
  }

  // ===== EVENTOS DE REDIMENSIONAMENTO =====
  configurarEventoRedimensionamento() {
    const aoRedimensionar = () => {
      try {
        const container = document.getElementById("three-container");
        if (!container || !this.camera || !this.renderer) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        
        console.log(`🔄 Cena redimensionada: ${width}x${height}`);
      } catch (error) {
        console.error("❌ Erro durante redimensionamento:", error);
      }
    };

    window.addEventListener("resize", aoRedimensionar);
    
    // Redimensionamento inicial
    setTimeout(aoRedimensionar, 100);
  }

  // ===== AJUSTES DE QUALIDADE =====
  ajustarQualidade(nivel = "alta") {
    if (!this.renderer) return;

    console.log(`🎨 Ajustando qualidade para: ${nivel}`);

    switch (nivel) {
      case "baixa":
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.shadowMap.enabled = false;
        break;

      case "media":
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.enabled = true;
        break;

      case "alta":
      default:
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.enabled = true;
        break;
    }

    // Ajustar qualidade das sombras
    if (this.luzesGrupo) {
      this.luzesGrupo.children.forEach(luz => {
        if (luz.shadow) {
          switch (nivel) {
            case "baixa":
              luz.shadow.mapSize.width = 256;
              luz.shadow.mapSize.height = 256;
              break;
            case "media":
              luz.shadow.mapSize.width = 512;
              luz.shadow.mapSize.height = 512;
              break;
            case "alta":
            default:
              luz.shadow.mapSize.width = CONFIG.QUALIDADE_SOMBRAS;
              luz.shadow.mapSize.height = CONFIG.QUALIDADE_SOMBRAS;
              break;
          }
        }
      });
    }

    console.log(`✅ Qualidade ajustada para: ${nivel}`);
  }

  // ===== EFEITOS VISUAIS DINÂMICOS =====
  atualizarEfeitosVisuais() {
    try {
      // Atualizar névoa baseada na distância da câmera
      if (this.scene.fog && this.camera) {
        const distanciaCamera = this.camera.position.length();
        this.scene.fog.density = Math.max(
          0.0005,
          Math.min(0.003, distanciaCamera * 0.00001)
        );
      }

      // Atualizar intensidade das luzes baseada na hora do dia simulada
      if (this.luzesGrupo) {
        const horaSimulada = (Date.now() * 0.0001) % 24;
        const intensidadeDia = Math.max(
          0.3,
          Math.sin((horaSimulada / 24) * Math.PI * 2)
        );

        this.luzesGrupo.children.forEach((luz) => {
          if (luz.isDirectionalLight) {
            luz.intensity = intensidadeDia * 3.0;
          }
        });
      }
    } catch (error) {
      // Erro silencioso para evitar spam
    }
  }

  // ===== SCREENSHOT E EXPORT =====
  capturarScreenshot(largura = null, altura = null, formato = "png") {
    if (!this.renderer) {
      console.error("❌ Renderer não disponível para screenshot");
      return null;
    }

    try {
      // Salvar dimensões originais
      const size = this.renderer.getSize(new THREE.Vector2());
      const originalWidth = size.x;
      const originalHeight = size.y;

      // Ajustar dimensões se especificadas
      if (largura && altura) {
        this.renderer.setSize(largura, altura);
        this.camera.aspect = largura / altura;
        this.camera.updateProjectionMatrix();
      }

      // Renderizar frame
      this.renderer.render(this.scene, this.camera);

      // Capturar dados da imagem
      const canvas = this.renderer.domElement;
      const dataURL = canvas.toDataURL(`image/${formato}`, 1.0);

      // Restaurar dimensões originais
      if (largura && altura) {
        this.renderer.setSize(originalWidth, originalHeight);
        this.camera.aspect = originalWidth / originalHeight;
        this.camera.updateProjectionMatrix();
      }

      console.log(`📸 Screenshot capturado: ${formato.toUpperCase()}`);
      return dataURL;

    } catch (error) {
      console.error("❌ Erro ao capturar screenshot:", error);
      return null;
    }
  }

  // ===== GESTÃO DE TEXTURAS =====
  async carregarTextura(url, cache = true) {
    if (cache && this.texturasCache.has(url)) {
      console.log(`📦 Textura em cache: ${url}`);
      return this.texturasCache.get(url);
    }

    try {
      const texture = await new Promise((resolve, reject) => {
        this.textureLoader.load(
          url,
          (texture) => resolve(texture),
          undefined,
          (error) => reject(error)
        );
      });

      if (cache) {
        this.texturasCache.set(url, texture);
      }

      console.log(`✅ Textura carregada: ${url}`);
      return texture;

    } catch (error) {
      console.error(`❌ Erro ao carregar textura ${url}:`, error);
      return null;
    }
  }

  criarTexturaProcedural(tipo, largura = 512, altura = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");

    switch (tipo) {
      case "tijolo":
        // Fundo de argamassa
        ctx.fillStyle = "#8B7355";
        ctx.fillRect(0, 0, largura, altura);

        // Desenhar tijolos
        const brickW = 64;
        const brickH = 32;
        ctx.fillStyle = "#A0522D";

        for (let y = 0; y < altura; y += brickH) {
          for (let x = 0; x < largura; x += brickW) {
            const offsetX = (Math.floor(y / brickH) % 2) * (brickW / 2);
            ctx.fillRect((x + offsetX) % largura, y, brickW - 4, brickH - 4);
          }
        }
        break;

      case "concreto":
        ctx.fillStyle = "#CCCCCC";
        ctx.fillRect(0, 0, largura, altura);
        
        // Adicionar ruído
        for (let i = 0; i < 1000; i++) {
          ctx.fillStyle = `rgba(${Math.random() * 50 + 100}, ${Math.random() * 50 + 100}, ${Math.random() * 50 + 100}, 0.3)`;
          ctx.fillRect(Math.random() * largura, Math.random() * altura, 2, 2);
        }
        break;

      case "metal":
        const gradientMetal = ctx.createLinearGradient(0, 0, largura, altura);
        gradientMetal.addColorStop(0, "#E8E8E8");
        gradientMetal.addColorStop(0.5, "#C0C0C0");
        gradientMetal.addColorStop(1, "#A8A8A8");
        ctx.fillStyle = gradientMetal;
        ctx.fillRect(0, 0, largura, altura);
        break;

      default:
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, largura, altura);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    console.log(`🎨 Textura procedural criada: ${tipo}`);
    return texture;
  }

  // ===== GESTÃO DE MATERIAIS =====
  criarMaterial(tipo, opcoes = {}) {
    const materialKey = `${tipo}-${JSON.stringify(opcoes)}`;
    
    if (this.materiaisCache.has(materialKey)) {
      return this.materiaisCache.get(materialKey).clone();
    }

    let material;

    switch (tipo) {
      case "container":
        material = new THREE.MeshStandardMaterial({
          color: opcoes.cor || 0x888888,
          metalness: opcoes.metalness || 0.6,
          roughness: opcoes.roughness || 0.4,
          envMapIntensity: 1.0,
          ...opcoes
        });
        break;

      case "metal":
        material = new THREE.MeshStandardMaterial({
          color: opcoes.cor || 0x888888,
          metalness: 0.8,
          roughness: 0.2,
          envMapIntensity: 1.0,
          ...opcoes
        });
        break;

      case "concreto":
        material = new THREE.MeshStandardMaterial({
          color: opcoes.cor || 0xCCCCCC,
          metalness: 0.0,
          roughness: 0.8,
          ...opcoes
        });
        break;

      case "vidro":
        material = new THREE.MeshPhysicalMaterial({
          color: opcoes.cor || 0xFFFFFF,
          metalness: 0.0,
          roughness: 0.0,
          transmission: opcoes.transmission || 0.9,
          transparent: true,
          opacity: opcoes.opacity || 0.1,
          ...opcoes
        });
        break;

      default:
        material = new THREE.MeshStandardMaterial({
          color: opcoes.cor || 0x888888,
          ...opcoes
        });
    }

    this.materiaisCache.set(materialKey, material);
    console.log(`🎨 Material criado e cached: ${tipo}`);
    
    return material.clone();
  }

  // ===== LIMPEZA E DISPOSE =====
  dispose() {
    console.log("🧹 Limpando recursos da cena...");

    // Limpar texturas
    this.texturasCache.forEach(texture => {
      texture.dispose();
    });
    this.texturasCache.clear();

    // Limpar materiais
    this.materiaisCache.forEach(material => {
      material.dispose();
    });
    this.materiaisCache.clear();

    // Limpar renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Limpar cena
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }

    this.camera = null;
    this.luzesGrupo = null;

    console.log("✅ Recursos da cena limpos");
  }

  // ===== INFORMAÇÕES DE DEBUG =====
  getInfo() {
    return {
      scene: {
        objects: this.scene ? this.scene.children.length : 0,
        hasFog: !!this.scene?.fog
      },
      camera: {
        type: this.camera?.type || "none",
        position: this.camera ? {
          x: this.camera.position.x.toFixed(2),
          y: this.camera.position.y.toFixed(2),
          z: this.camera.position.z.toFixed(2)
        } : null,
        fov: this.camera?.fov
      },
      renderer: {
        type: this.renderer?.constructor.name || "none",
        size: this.renderer ? this.renderer.getSize(new THREE.Vector2()) : null,
        pixelRatio: this.renderer?.getPixelRatio(),
        shadowMap: this.renderer?.shadowMap.enabled
      },
      lighting: {
        lights: this.luzesGrupo ? this.luzesGrupo.children.length : 0
      },
      cache: {
        texturas: this.texturasCache.size,
        materiais: this.materiaisCache.size
      }
    };
  }
}