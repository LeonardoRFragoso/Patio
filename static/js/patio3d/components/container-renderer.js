/**
 * Renderizador de Containers 3D - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: components/container-renderer.js
 */

import { CONFIG, CORES, CORES_ARMADORES } from '../utils/constants.js';

export class ContainerRenderer {
  constructor(helperUtils = null) {
    this.helperUtils = helperUtils;
    this.textureLoader = new THREE.TextureLoader();
    this.materiaisCache = new Map();
    this.containersRenderizados = 0;
  }

  // ===== CRIAR VISUALIZAÇÃO DOS CONTAINERS =====
  criarVisualizacaoContainers(patioData, containerGroup, labelGroup) {
    try {
      if (!patioData) return 0;

      console.log("🎨 Criando visualização melhorada dos containers...");

      const containers = patioData.containers || [];
      let containersValidos = 0;

      containers.forEach((container, index) => {
        try {
          let containerNormalizado = container;
          
          // Normalizar dados se helper disponível
          if (this.helperUtils) {
            containerNormalizado = this.helperUtils.normalizarDadosContainer(container);
          }

          if (containerNormalizado) {
            const mesh = this.criarContainerMelhorado(containerNormalizado);
            if (mesh) {
              containerGroup.add(mesh);
              containersValidos++;
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao processar container ${container.numero}:`, error.message);
        }
      });

      this.containersRenderizados = containersValidos;
      console.log(`✨ ${containersValidos}/${containers.length} containers renderizados com qualidade premium`);
      
      return containersValidos;
    } catch (error) {
      console.error(`❌ Erro ao criar visualização: ${error.message}`);
      return 0;
    }
  }

  // ===== CRIAR CONTAINER MELHORADO =====
  criarContainerMelhorado(container) {
    try {
      const row = container.row || container.linha;
      const bay = container.bay || container.baia;
      const altura = container.altura;

      // Calcular posição 3D
      const posicao = this.calcularPosicao3D(row, bay, altura);
      if (!posicao) return null;

      const eh40TEU = this.isContainer40TEU(container);

      // Geometria com bordas chanfradas
      const geometry = eh40TEU
        ? new THREE.BoxGeometry(
            CONFIG.CONTAINER_40_COMPRIMENTO,
            CONFIG.ALTURA_CONTAINER,
            CONFIG.CONTAINER_40_LARGURA
          )
        : new THREE.BoxGeometry(
            CONFIG.CONTAINER_20_COMPRIMENTO,
            CONFIG.ALTURA_CONTAINER,
            CONFIG.CONTAINER_20_LARGURA
          );

      // Material metálico avançado
      const corArmador = this.obterCorArmador(container.armador);

      const material = new THREE.MeshStandardMaterial({
        color: corArmador,
        metalness: 0.6,
        roughness: 0.4,
        envMapIntensity: 1.0,
      });

      // Verificar problemas de segurança
      if (eh40TEU && !this.validarEmpilhamento40TEU(container)) {
        material.color = CORES.FLUTUANTE;
        material.emissive = new THREE.Color(0.2, 0.0, 0.0);
      }

      if (!this.validarAlturaMaximaPorRow(container)) {
        material.color = CORES.FLUTUANTE;
        material.emissive = new THREE.Color(0.2, 0.0, 0.0);
      }

      // Criar container 3D
      const containerMesh = new THREE.Mesh(geometry, material);
      containerMesh.position.copy(posicao);
      
      // 🔧 ORIENTAÇÃO HORIZONTAL: Rotacionar container 90 graus no eixo X para ficar deitado
      containerMesh.rotation.x = Math.PI / 2;

      if (eh40TEU) {
        containerMesh.position.z += CONFIG.ESPACAMENTO_ROW / 2;
      }

      // Sombras
      containerMesh.castShadow = true;
      containerMesh.receiveShadow = true;

      // Detalhes do container
      this.adicionarDetalhesContainer(containerMesh, container, eh40TEU);

      // UserData
      containerMesh.userData = {
        container: container,
        row: row,
        bay: bay,
        altura: altura,
        eh40TEU: eh40TEU,
        posicao: `${row}${String(bay).padStart(2, "0")}-${altura}`,
        posicaoOriginal: posicao.clone(),
        materialOriginal: material.clone(),
      };

      return containerMesh;
    } catch (error) {
      console.error(`❌ Erro ao criar container melhorado: ${error.message}`);
      return null;
    }
  }

  // ===== ADICIONAR DETALHES AOS CONTAINERS =====
  adicionarDetalhesContainer(containerMesh, container, eh40TEU) {
    const grupo = new THREE.Group();

    // Portas do container
    const portaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.3, 0.3, 0.3),
      metalness: 0.8,
      roughness: 0.3,
    });

    const largura = eh40TEU
      ? CONFIG.CONTAINER_40_COMPRIMENTO
      : CONFIG.CONTAINER_20_COMPRIMENTO;

    // Duas portas
    for (let i = 0; i < 2; i++) {
      const porta = new THREE.Mesh(
        new THREE.BoxGeometry(
          largura / 2 - 0.1,
          CONFIG.ALTURA_CONTAINER - 0.2,
          0.05
        ),
        portaMaterial.clone()
      );
      porta.position.set(
        ((i - 0.5) * largura) / 2,
        0,
        CONFIG.CONTAINER_20_LARGURA / 2 + 0.03
      );
      grupo.add(porta);

      // Maçanetas
      const macaneta = new THREE.Mesh(
        new THREE.SphereGeometry(0.05),
        new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.9,
          roughness: 0.1,
        })
      );
      macaneta.position.set(
        ((i - 0.5) * largura) / 2 +
          (i === 0 ? largura / 4 - 0.2 : -largura / 4 + 0.2),
        0,
        CONFIG.CONTAINER_20_LARGURA / 2 + 0.08
      );
      grupo.add(macaneta);
    }

    // Logo do armador na lateral
    if (container.armador) {
      this.criarLogoArmador(grupo, container.armador, largura);
    }

    // Número do container no topo
    this.criarNumeroContainer(grupo, container.numero, largura);

    // Indicadores de status
    this.criarIndicadoresStatus(grupo, container, largura);

    // Adicionar grupo de detalhes ao container
    containerMesh.add(grupo);
  }

  // ===== CRIAR LOGO DO ARMADOR =====
  criarLogoArmador(grupo, armador, largura) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, 256, 128);

    // Borda
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 122);

    // Texto do armador
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(armador, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(largura * 0.6, 1.0),
      logoMaterial
    );
    logo.position.set(0, 0.5, -CONFIG.CONTAINER_20_LARGURA / 2 - 0.01);
    grupo.add(logo);
  }

  // ===== CRIAR NÚMERO DO CONTAINER =====
  criarNumeroContainer(grupo, numero, largura) {
    if (!numero) return;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo preto
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, 512, 128);

    // Texto do número
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(numero, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const numeroMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const numeroPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(largura * 0.8, 0.8),
      numeroMaterial
    );
    numeroPlane.position.set(0, CONFIG.ALTURA_CONTAINER / 2 + 0.01, 0);
    numeroPlane.rotation.x = -Math.PI / 2;
    grupo.add(numeroPlane);
  }

  // ===== CRIAR INDICADORES DE STATUS =====
  criarIndicadoresStatus(grupo, container, largura) {
    const status = container.status;
    if (!status) return;

    // Cor baseada no status
    let corStatus = 0x00FF00; // Verde padrão
    switch (status.toUpperCase()) {
      case 'VISTORIADO':
        corStatus = 0x0099FF;
        break;
      case 'URGENTE':
        corStatus = 0xFF3300;
        break;
      case 'ANTIGO':
        corStatus = 0xFF9900;
        break;
    }

    // Indicador luminoso
    const indicadorGeometry = new THREE.SphereGeometry(0.1);
    const indicadorMaterial = new THREE.MeshStandardMaterial({
      color: corStatus,
      emissive: new THREE.Color(corStatus),
      emissiveIntensity: 0.3,
    });

    const indicador = new THREE.Mesh(indicadorGeometry, indicadorMaterial);
    indicador.position.set(
      largura / 2 - 0.3,
      CONFIG.ALTURA_CONTAINER / 2 - 0.3,
      CONFIG.CONTAINER_20_LARGURA / 2 + 0.05
    );
    grupo.add(indicador);

    // Efeito pulsante para status urgente
    if (status.toUpperCase() === 'URGENTE') {
      this.adicionarEfeitoPulsante(indicador);
    }
  }

  // ===== EFEITO PULSANTE =====
  adicionarEfeitoPulsante(objeto) {
    const pulsar = () => {
      if (objeto && objeto.material) {
        const intensidade = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        objeto.material.emissiveIntensity = intensidade;
        requestAnimationFrame(pulsar);
      }
    };
    pulsar();
  }

  // ===== FUNÇÕES AUXILIARES =====
  calcularPosicao3D(row, bay, altura) {
    try {
      const rowIndex = CONFIG.ROWS.indexOf(String(row).toUpperCase());
      if (rowIndex === -1) return null;

      const bayNumber = parseInt(bay);
      if (isNaN(bayNumber) || bayNumber < 1 || bayNumber > CONFIG.BAIAS_MAX)
        return null;

      const alturaNumber = parseInt(altura);
      if (isNaN(alturaNumber) || alturaNumber < 1 || alturaNumber > CONFIG.ALTURAS_MAX)
        return null;

      const x = (bayNumber - 10.5) * CONFIG.ESPACAMENTO_BAIA;
      const z = (rowIndex - 2) * CONFIG.ESPACAMENTO_ROW;
      const y = (alturaNumber - 1) * CONFIG.ALTURA_CONTAINER + CONFIG.ALTURA_CONTAINER / 2;

      return new THREE.Vector3(x, y, z);
    } catch (error) {
      console.error(`Erro ao calcular posição 3D: ${error.message}`);
      return null;
    }
  }

  isContainer40TEU(container) {
    try {
      const tamanhoTeu = container?.tamanho_teu || container?.tamanho;
      return tamanhoTeu && parseInt(tamanhoTeu) === 40;
    } catch (error) {
      return false;
    }
  }

  obterCorArmador(armador) {
    if (!armador) return CORES_ARMADORES.DEFAULT;
    
    const armadorUpper = armador.toUpperCase();
    return CORES_ARMADORES[armadorUpper] || CORES_ARMADORES.DEFAULT;
  }

  validarEmpilhamento40TEU(container) {
    return true; // Simplificado para o exemplo
  }

  validarAlturaMaximaPorRow(container) {
    try {
      const row = container.row || container.linha;
      const altura = container.altura;
      const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
      return altura <= alturaMaxima;
    } catch (error) {
      return true;
    }
  }

  // ===== ANIMAÇÕES DE CONTAINER =====
  animarEntradaContainer(containerMesh, delay = 0) {
    if (!containerMesh) return;

    // Iniciar invisível
    containerMesh.scale.set(0, 0, 0);
    containerMesh.material.transparent = true;
    containerMesh.material.opacity = 0;

    setTimeout(() => {
      // Animar escala
      const animarEscala = () => {
        if (containerMesh.scale.x < 1) {
          containerMesh.scale.addScalar(0.05);
          containerMesh.material.opacity += 0.05;
          requestAnimationFrame(animarEscala);
        } else {
          containerMesh.scale.set(1, 1, 1);
          containerMesh.material.opacity = 1;
          containerMesh.material.transparent = false;
        }
      };
      animarEscala();
    }, delay);
  }

  // ===== FILTROS DE CONTAINER =====
  filtrarContainersPorArmador(containerGroup, armador) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const containerArmador = child.userData.container.armador;
        
        if (!armador || containerArmador === armador) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.2;
        }
      }
    });
  }

  filtrarContainersPorStatus(containerGroup, status) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const containerStatus = child.userData.container.status;
        
        if (!status || containerStatus === status) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.2;
        }
      }
    });
  }

  filtrarContainersPorTEU(containerGroup, teu) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const eh40TEU = this.isContainer40TEU(child.userData.container);
        const containerTEU = eh40TEU ? 40 : 20;
        
        if (!teu || containerTEU === parseInt(teu)) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.2;
        }
      }
    });
  }

  // ===== DESTACAR CONTAINERS =====
  destacarContainerPorNumero(containerGroup, numeroContainer) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container?.numero === numeroContainer) {
        // Destacar visualmente
        child.material.emissive = CORES.SELECIONADA;
        child.material.emissiveIntensity = 0.3;
        
        // Animar para cima
        const posOriginal = child.userData.posicaoOriginal.clone();
        child.position.y = posOriginal.y + CONFIG.HOVER_ALTURA;
        
        return child;
      }
    });
  }

  removerDestaquesContainers(containerGroup) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        // Restaurar material original
        child.material.emissive = new THREE.Color(0, 0, 0);
        child.material.emissiveIntensity = 0;
        
        // Restaurar posição original
        if (child.userData.posicaoOriginal) {
          child.position.copy(child.userData.posicaoOriginal);
        }
      }
    });
  }

  // ===== INFORMAÇÕES DE DEBUG =====
  getContainerInfo() {
    return {
      containersRenderizados: this.containersRenderizados,
      materiaisCacheados: this.materiaisCache.size,
      memoriaUsada: this.materiaisCache.size * 1024 // Estimativa em bytes
    };
  }

  // ===== OTIMIZAÇÃO DE PERFORMANCE =====
  otimizarContainers(containerGroup, cameraPosicao, distanciaMaxima = 200) {
    let visiveisCount = 0;
    let ocultosCount = 0;

    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const distancia = child.position.distanceTo(cameraPosicao);
        
        if (distancia > distanciaMaxima) {
          child.visible = false;
          ocultosCount++;
        } else {
          child.visible = true;
          visiveisCount++;
        }
      }
    });

    console.log(`🎯 Otimização: ${visiveisCount} visíveis, ${ocultosCount} ocultos`);
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log("🧹 Limpando renderer de containers...");
    
    // Limpar cache de materiais
    this.materiaisCache.forEach(material => {
      material.dispose();
    });
    this.materiaisCache.clear();
    
    this.containersRenderizados = 0;
    
    console.log("✅ Renderer de containers limpo");
  }
}