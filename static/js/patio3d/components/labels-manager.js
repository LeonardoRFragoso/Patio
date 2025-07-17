/**
 * Gerenciador de Labels 3D - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: components/labels-manager.js
 */

import { CONFIG } from '../utils/constants.js';

export class LabelsManager {
  constructor() {
    this.labelGroup = null;
    this.labelsVisiveis = true;
    this.textureCache = new Map();
    this.isAnimating = false;
    this.totalLabels = 0;
  }

  // ===== CRIAR LABEL MELHORADO =====
  criarLabelMelhorado(container, posicao, eh40TEU = false) {
    try {
      if (!container || !posicao) return null;

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");

      // Fundo com gradiente premium
      const gradient = ctx.createLinearGradient(0, 0, 512, 128);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.9)");
      gradient.addColorStop(1, "rgba(30, 30, 50, 0.9)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 128);

      // Borda elegante
      ctx.strokeStyle = this.obterCorLabel(container);
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, 506, 122);

      // Texto principal (número do container)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(container.numero || "N/A", 256, 35);

      // Posição
      const row = container.row || container.linha;
      const bay = container.bay || container.baia;
      ctx.fillStyle = this.obterCorLabel(container);
      ctx.font = "bold 20px Arial";
      ctx.fillText(
        `${row}${String(bay).padStart(2, "0")}-${container.altura}`,
        256,
        65
      );

      // Informações adicionais
      const infoTexto = this.obterInfoAdicional(container, eh40TEU);
      if (infoTexto) {
        ctx.fillStyle = "#FFC107";
        ctx.font = "14px Arial";
        ctx.fillText(infoTexto, 256, 95);
      }

      // Status indicator
      this.adicionarIndicadorStatus(ctx, container);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
      });
      
      const sprite = new THREE.Sprite(spriteMaterial);

      // Posicionamento do label
      sprite.position.copy(posicao);
      sprite.position.y += eh40TEU ? 6 : 5;
      sprite.scale.set(12, 3, 1);

      // UserData
      sprite.userData = {
        container: container,
        tipo: "label_container",
        posicao: `${row}${String(bay).padStart(2, "0")}-${container.altura}`,
        eh40TEU: eh40TEU
      };

      return sprite;

    } catch (error) {
      console.error(`❌ Erro ao criar label: ${error.message}`);
      return null;
    }
  }

  // ===== OBTER COR DO LABEL =====
  obterCorLabel(container) {
    const status = container.status?.toUpperCase();
    
    switch (status) {
      case 'VISTORIADO':
        return "#4CAF50"; // Verde
      case 'URGENTE':
        return "#FF3300"; // Vermelho
      case 'ANTIGO':
        return "#FF9800"; // Laranja
      default:
        return "#4CAF50"; // Verde padrão
    }
  }

  // ===== OBTER INFORMAÇÃO ADICIONAL =====
  obterInfoAdicional(container, eh40TEU) {
    const infos = [];
    
    if (container.armador) {
      infos.push(container.armador);
    }
    
    if (eh40TEU) {
      infos.push("40'");
    } else {
      infos.push("20'");
    }

    if (container.status) {
      infos.push(container.status);
    }

    return infos.join(" • ");
  }

  // ===== ADICIONAR INDICADOR DE STATUS =====
  adicionarIndicadorStatus(ctx, container) {
    const status = container.status?.toUpperCase();
    let cor = "#4CAF50";

    switch (status) {
      case 'URGENTE':
        cor = "#FF3300";
        break;
      case 'VISTORIADO':
        cor = "#2196F3";
        break;
      case 'ANTIGO':
        cor = "#FF9800";
        break;
    }

    // Círculo de status no canto superior direito
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(480, 30, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Borda do círculo
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ===== CRIAR LABEL DE PORTÃO APRIMORADO =====
  async criarLabelPortaoAprimorado(texto, x, y, z, cor = 0xffffff) {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 512;
      canvas.height = 128;

      // Fundo com gradiente premium
      const gradient = context.createLinearGradient(0, 0, 512, 128);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.95)");
      gradient.addColorStop(1, "rgba(40, 40, 60, 0.95)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 128);

      // Borda dupla elegante
      context.strokeStyle = `#${cor.toString(16).padStart(6, "0")}`;
      context.lineWidth = 4;
      context.strokeRect(4, 4, 504, 120);
      
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.strokeRect(8, 8, 496, 112);

      // Texto principal
      context.fillStyle = `#${cor.toString(16).padStart(6, "0")}`;
      context.font = "bold 36px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(texto, 256, 50);

      // Subtexto
      context.fillStyle = "#CCCCCC";
      context.font = "16px Arial";
      context.fillText("PORTÃO DE ACESSO", 256, 85);

      // Ícone
      this.adicionarIconePortao(context, texto, cor);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(spriteMaterial);

      sprite.position.set(x, y, z);
      sprite.scale.set(18, 5, 1);
      sprite.userData = {
        tipo: "label_portao",
        texto: texto
      };

      return sprite;

    } catch (error) {
      console.error(`❌ Erro ao criar label de portão: ${error.message}`);
      return null;
    }
  }

  // ===== ADICIONAR ÍCONE DO PORTÃO =====
  adicionarIconePortao(context, texto, cor) {
    context.fillStyle = `#${cor.toString(16).padStart(6, "0")}`;
    
    if (texto === "ENTRADA") {
      // Seta para dentro
      context.beginPath();
      context.moveTo(50, 64);
      context.lineTo(70, 54);
      context.lineTo(70, 59);
      context.lineTo(90, 59);
      context.lineTo(90, 69);
      context.lineTo(70, 69);
      context.lineTo(70, 74);
      context.closePath();
      context.fill();
    } else if (texto === "SAÍDA") {
      // Seta para fora
      context.beginPath();
      context.moveTo(90, 64);
      context.lineTo(70, 54);
      context.lineTo(70, 59);
      context.lineTo(50, 59);
      context.lineTo(50, 69);
      context.lineTo(70, 69);
      context.lineTo(70, 74);
      context.closePath();
      context.fill();
    }
  }

  // ===== CRIAR LABELS PARA TODOS OS CONTAINERS =====
  criarLabelsContainers(containers, labelGroup) {
    if (!containers || !labelGroup) return 0;

    console.log("🏷️ Criando labels para containers...");

    this.labelGroup = labelGroup;
    let labelsCreated = 0;

    containers.forEach(container => {
      try {
        const row = container.row || container.linha;
        const bay = container.bay || container.baia;
        const altura = container.altura;

        const posicao = this.calcularPosicao3D(row, bay, altura);
        if (!posicao) return;

        const eh40TEU = this.isContainer40TEU(container);
        const label = this.criarLabelMelhorado(container, posicao, eh40TEU);
        
        if (label) {
          labelGroup.add(label);
          labelsCreated++;
        }
      } catch (error) {
        console.error(`❌ Erro ao criar label para container ${container.numero}:`, error);
      }
    });

    this.totalLabels = labelsCreated;
    console.log(`✅ ${labelsCreated} labels criados`);
    
    return labelsCreated;
  }

  // ===== TOGGLE LABELS COM ANIMAÇÃO =====
  toggleLabels(btn = null) {
    if (!this.labelGroup || this.isAnimating) return;

    this.labelsVisiveis = !this.labelsVisiveis;
    this.isAnimating = true;

    console.log(`🏷️ Alternando labels: ${this.labelsVisiveis ? 'VISÍVEL' : 'OCULTO'}`);

    if (this.labelsVisiveis) {
      this.fadeInLabels(() => {
        this.isAnimating = false;
      });
    } else {
      this.fadeOutLabels(() => {
        this.isAnimating = false;
      });
    }

    // Atualizar botão se fornecido
    if (btn) {
      btn.classList.toggle("active");
      btn.innerHTML = `<i class="fas fa-tags me-2"></i>${
        this.labelsVisiveis ? "Ocultar" : "Mostrar"
      } Labels`;
    }
  }

  // ===== FADE IN LABELS =====
  fadeInLabels(callback = null) {
    this.labelGroup.visible = true;
    
    let completedAnimations = 0;
    const totalAnimations = this.labelGroup.children.length;

    if (totalAnimations === 0) {
      if (callback) callback();
      return;
    }

    this.labelGroup.children.forEach((child, index) => {
      if (child.isSprite) {
        child.material.opacity = 0;
        
        setTimeout(() => {
          const fadeIn = () => {
            if (child.material.opacity < 1) {
              child.material.opacity += 0.05;
              requestAnimationFrame(fadeIn);
            } else {
              child.material.opacity = 1;
              completedAnimations++;
              
              if (completedAnimations === totalAnimations && callback) {
                callback();
              }
            }
          };
          fadeIn();
        }, index * 10); // Delay escalonado
      }
    });
  }

  // ===== FADE OUT LABELS =====
  fadeOutLabels(callback = null) {
    let completedAnimations = 0;
    const totalAnimations = this.labelGroup.children.length;

    if (totalAnimations === 0) {
      this.labelGroup.visible = false;
      if (callback) callback();
      return;
    }

    this.labelGroup.children.forEach((child, index) => {
      if (child.isSprite) {
        setTimeout(() => {
          const fadeOut = () => {
            if (child.material.opacity > 0) {
              child.material.opacity -= 0.05;
              requestAnimationFrame(fadeOut);
            } else {
              child.material.opacity = 0;
              completedAnimations++;
              
              if (completedAnimations === totalAnimations) {
                this.labelGroup.visible = false;
                if (callback) callback();
              }
            }
          };
          fadeOut();
        }, index * 5); // Delay escalonado menor
      }
    });
  }

  // ===== ATUALIZAR LABELS PARA CÂMERA =====
  atualizarLabelsParaCamera(camera) {
    if (!this.labelGroup || !camera || !this.labelsVisiveis) return;

    this.labelGroup.children.forEach((sprite) => {
      if (sprite.isSprite) {
        sprite.lookAt(camera.position);
      }
    });
  }

  // ===== FILTRAR LABELS =====
  filtrarLabelsPorStatus(status) {
    if (!this.labelGroup) return;

    this.labelGroup.children.forEach(child => {
      if (child.userData?.container) {
        const containerStatus = child.userData.container.status;
        
        if (!status || containerStatus === status) {
          child.visible = true;
          child.material.opacity = 1.0;
        } else {
          child.material.opacity = 0.3;
        }
      }
    });
  }

  filtrarLabelsPorArmador(armador) {
    if (!this.labelGroup) return;

    this.labelGroup.children.forEach(child => {
      if (child.userData?.container) {
        const containerArmador = child.userData.container.armador;
        
        if (!armador || containerArmador === armador) {
          child.visible = true;
          child.material.opacity = 1.0;
        } else {
          child.material.opacity = 0.3;
        }
      }
    });
  }

  // ===== DESTACAR LABEL ESPECÍFICO =====
  destacarLabel(numeroContainer) {
    if (!this.labelGroup) return null;

    let labelEncontrado = null;

    this.labelGroup.children.forEach(child => {
      if (child.userData?.container?.numero === numeroContainer) {
        // Destacar visualmente
        child.scale.set(15, 4, 1); // Aumentar tamanho
        child.material.opacity = 1.0;
        
        // Efeito pulsante
        this.adicionarEfeitoPulsante(child);
        
        labelEncontrado = child;
      } else {
        // Restaurar outros labels
        child.scale.set(12, 3, 1);
        child.material.opacity = this.labelsVisiveis ? 1.0 : 0.0;
      }
    });

    return labelEncontrado;
  }

  // ===== EFEITO PULSANTE =====
  adicionarEfeitoPulsante(sprite) {
    const pulsar = () => {
      if (sprite && sprite.material && this.labelsVisiveis) {
        const escala = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        const baseScale = sprite.userData.destacado ? 15 : 12;
        sprite.scale.set(baseScale * escala, (sprite.userData.destacado ? 4 : 3) * escala, 1);
        requestAnimationFrame(pulsar);
      }
    };
    pulsar();
  }

  // ===== CRIAR LABELS DE INFORMAÇÃO GERAL =====
  criarLabelsInformacao(scene) {
    const labelsInfo = [];

    // Label de título do pátio
    const labelTitulo = this.criarLabelTitulo();
    if (labelTitulo) {
      scene.add(labelTitulo);
      labelsInfo.push(labelTitulo);
    }

    // Labels de rows
    CONFIG.ROWS.forEach((row, index) => {
      const labelRow = this.criarLabelRow(row, index);
      if (labelRow) {
        scene.add(labelRow);
        labelsInfo.push(labelRow);
      }
    });

    // Labels de baias
    for (let bay = 1; bay <= CONFIG.BAIAS_MAX; bay += 5) {
      const labelBay = this.criarLabelBay(bay);
      if (labelBay) {
        scene.add(labelBay);
        labelsInfo.push(labelBay);
      }
    }

    console.log(`📋 ${labelsInfo.length} labels de informação criados`);
    return labelsInfo;
  }

  // ===== CRIAR LABEL DE TÍTULO =====
  criarLabelTitulo() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Fundo
    const gradient = ctx.createLinearGradient(0, 0, 1024, 256);
    gradient.addColorStop(0, "rgba(0, 50, 100, 0.9)");
    gradient.addColorStop(1, "rgba(0, 30, 60, 0.9)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 256);

    // Texto principal
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PÁTIO 3D - SUZANO-SP", 512, 128);

    // Subtítulo
    ctx.fillStyle = "#CCE7FF";
    ctx.font = "24px Arial";
    ctx.fillText("Sistema de Visualização Premium", 512, 180);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 50, -50);
    sprite.scale.set(40, 10, 1);
    sprite.userData = { tipo: "label_titulo" };

    return sprite;
  }

  // ===== CRIAR LABEL DE ROW =====
  criarLabelRow(row, index) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo circular
    ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, 2 * Math.PI);
    ctx.fill();

    // Borda
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Texto
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(row, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    
    const sprite = new THREE.Sprite(material);
    const z = (index - 2) * CONFIG.ESPACAMENTO_ROW;
    sprite.position.set(-80, 5, z);
    sprite.scale.set(8, 8, 1);
    sprite.userData = { tipo: "label_row", row: row };

    return sprite;
  }

  // ===== CRIAR LABEL DE BAY =====
  criarLabelBay(bay) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Fundo
    ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
    ctx.fillRect(0, 0, 128, 64);

    // Borda
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 124, 60);

    // Texto
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bay.toString(), 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    
    const sprite = new THREE.Sprite(material);
    const x = (bay - 10.5) * CONFIG.ESPACAMENTO_BAIA;
    sprite.position.set(x, 2, 20);
    sprite.scale.set(5, 2.5, 1);
    sprite.userData = { tipo: "label_bay", bay: bay };

    return sprite;
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

  // ===== INFORMAÇÕES =====
  getInfo() {
    return {
      totalLabels: this.totalLabels,
      visiveis: this.labelsVisiveis,
      animando: this.isAnimating,
      texturesCacheadas: this.textureCache.size
    };
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log("🧹 Limpando labels...");
    
    // Limpar cache de texturas
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();

    if (this.labelGroup) {
      while (this.labelGroup.children.length > 0) {
        const child = this.labelGroup.children[0];
        if (child.material?.map) {
          child.material.map.dispose();
        }
        if (child.material) {
          child.material.dispose();
        }
        this.labelGroup.remove(child);
      }
    }

    this.totalLabels = 0;
    this.isAnimating = false;
    
    console.log("✅ Labels limpos");
  }
}