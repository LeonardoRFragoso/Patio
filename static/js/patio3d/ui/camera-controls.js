/**
 * Sistema de Controles de Câmera
 * Gerencia posicionamento e animações da câmera 3D
 */

export class CameraControls {
    constructor(camera, controls, scene, CONFIG) {
      this.camera = camera;
      this.controls = controls;
      this.scene = scene;
      this.CONFIG = CONFIG;
      this.transicionandoCamera = false;
      this.debug = this.debug.bind(this);
    }
  
    // ===== MÉTODOS DE ANIMAÇÃO DE CÂMERA =====
    animarCameraPara(novaPos, novoTarget, duracao = 2000) {
      if (this.transicionandoCamera) return;
  
      this.transicionandoCamera = true;
  
      const posInicial = this.camera.position.clone();
      const targetInicial = this.controls.target.clone();
  
      const startTime = Date.now();
  
      const animar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duracao, 1);
  
        // Easing suave
        const eased = 1 - Math.pow(1 - progress, 3);
  
        this.camera.position.lerpVectors(posInicial, novaPos, eased);
        this.controls.target.lerpVectors(targetInicial, novoTarget, eased);
        this.controls.update();
  
        if (progress < 1) {
          requestAnimationFrame(animar);
        } else {
          this.transicionandoCamera = false;
          this.debug("📷 Animação de câmera concluída");
        }
      };
  
      animar();
    }
  
    // ===== POSICIONAMENTOS DE CÂMERA =====
    posicionarCameraCompletaAnimada() {
      const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
      const patioDepth = this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW;
      const totalWidth = patioWidth + 80;
      const totalDepth = patioDepth + 60;
  
      const distancia = Math.max(totalWidth, totalDepth) * 0.6;
      const novaPos = new THREE.Vector3(
        distancia * 0.8,
        distancia * 0.5,
        distancia * 0.8
      );
      const novoTarget = new THREE.Vector3(0, 5, 0);
  
      this.animarCameraPara(novaPos, novoTarget, 3000);
      this.debug("📷 Animando para vista completa");
    }
  
    posicionarCameraTopo() {
      const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
      const altura = Math.max(patioWidth, 200);
  
      const novaPos = new THREE.Vector3(0, altura, 0);
      const novoTarget = new THREE.Vector3(0, 0, 0);
  
      this.animarCameraPara(novaPos, novoTarget);
      this.debug("📷 Vista aérea ativada");
    }
  
    posicionarCameraLateral() {
      const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
      const distancia = patioWidth * 0.8;
  
      const novaPos = new THREE.Vector3(-distancia, 80, 0);
      const novoTarget = new THREE.Vector3(0, 5, 0);
  
      this.animarCameraPara(novaPos, novoTarget);
      this.debug("📷 Vista lateral ativada");
    }
  
    // 🔧 CORREÇÃO: Nova função para vista lateral específica para Suzano-SP
    posicionarCameraLateralSuzano() {
      const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
      const patioDepth = this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW;
  
      // Vista lateral otimizada para operações portuárias de Suzano-SP
      const distancia = Math.max(patioWidth * 0.9, 120);
      const altura = 60; // Altura ideal para visualizar empilhamento
  
      const novaPos = new THREE.Vector3(-distancia, altura, patioDepth * 0.1);
      const novoTarget = new THREE.Vector3(0, 8, 0); // Foco ligeiramente elevado
  
      this.animarCameraPara(novaPos, novoTarget, 2000);
      this.debug("📷 Vista lateral padrão para Suzano-SP ativada");
    }
  
    focarContainers(patioData, calcularPosicao3D, normalizarDadosContainer) {
      try {
        if (
          !patioData ||
          !patioData.containers ||
          patioData.containers.length === 0
        ) {
          this.debug("Nenhum container para focar", "warn");
          return;
        }
  
        // Calcular centro dos containers
        const containers = patioData.containers;
        let centroX = 0,
          centroZ = 0,
          count = 0;
  
        containers.forEach((container) => {
          const normalized = normalizarDadosContainer(container);
          if (normalized) {
            const pos = calcularPosicao3D(
              normalized.row,
              normalized.bay,
              normalized.altura
            );
            if (pos) {
              centroX += pos.x;
              centroZ += pos.z;
              count++;
            }
          }
        });
  
        if (count > 0) {
          centroX /= count;
          centroZ /= count;
  
          const distancia = 80;
          const novaPos = new THREE.Vector3(
            centroX + distancia * 0.7,
            60,
            centroZ + distancia * 0.7
          );
          const novoTarget = new THREE.Vector3(centroX, 10, centroZ);
  
          this.animarCameraPara(novaPos, novoTarget, 2000);
          this.debug("📷 Vista focada nos containers ativada");
        }
      } catch (error) {
        this.debug(`Erro ao focar containers: ${error.message}`, "error");
      }
    }
  
    focarContainerSelecionado(containerMesh) {
      const pos = containerMesh.position;
      const offset = new THREE.Vector3(15, 10, 15);
      const novaPos = pos.clone().add(offset);
      const novoTarget = pos.clone().add(new THREE.Vector3(0, 2, 0));
  
      this.animarCameraPara(novaPos, novoTarget, 1500);
    }
  
    centralizarContainer(numeroContainer, patioData, normalizarDadosContainer, calcularPosicao3D) {
      try {
        const containers = patioData?.containers || [];
        const container = containers.find((c) => c.numero === numeroContainer);
  
        if (container) {
          const normalized = normalizarDadosContainer(container);
          if (normalized) {
            const pos = calcularPosicao3D(
              normalized.row,
              normalized.bay,
              normalized.altura
            );
            if (pos) {
              const offset = new THREE.Vector3(20, 15, 20);
              const novaPos = pos.clone().add(offset);
              const novoTarget = pos.clone().add(new THREE.Vector3(0, 2, 0));
  
              this.animarCameraPara(novaPos, novoTarget, 1500);
              this.debug(`Vista centralizada no container ${numeroContainer}`);
            }
          }
        }
      } catch (error) {
        this.debug(`Erro ao centralizar container: ${error.message}`, "error");
      }
    }
  
    resetarCamera() {
      this.posicionarCameraCompletaAnimada();
    }
  
    // ===== CONFIGURAÇÃO DE CONTROLES =====
    configurarControlesAvancados() {
      if (!THREE.OrbitControls) {
        throw new Error("OrbitControls não disponível");
      }
  
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
      this.controls.minDistance = 15;
      this.controls.maxDistance = 500;
      this.controls.panSpeed = 1.0;
      this.controls.rotateSpeed = 0.8;
      this.controls.zoomSpeed = 1.2;
  
      // 🔧 CORREÇÃO: Melhor foco no centro do pátio
      const patioCenterX = (this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA) / 2;
      const patioCenterZ = (this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW) / 2;
      this.controls.target.set(patioCenterX * 0.3, 5, patioCenterZ * 0.3);
  
      this.debug("🎮 Controles avançados configurados");
    }

    // ===== REDIMENSIONAMENTO =====
    aoRedimensionar(renderer) {
      try {
        const container = document.getElementById("three-container");
        if (!container || !this.camera || !renderer) return;
  
        const width = container.clientWidth;
        const height = container.clientHeight;
  
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      } catch (error) {
        this.debug(`Erro durante redimensionamento: ${error.message}`, "error");
      }
    }
  
    // ===== MÉTODO DE DEBUG =====
    debug(message, type = "info") {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
      const formattedMsg = `${timestamp} ${prefix} ${message}`;
      console.log(formattedMsg);
    }
  }