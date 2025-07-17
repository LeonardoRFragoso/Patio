/**
 * Sistema de Animação 3D - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: core/animation-system.js
 */

export class AnimationSystem {
    constructor() {
      this.clock = new THREE.Clock();
      this.mixer = null;
      this.animacoes = [];
      this.transicionandoCamera = false;
      this.isRunning = false;
      this.frameId = null;
      
      // Performance tracking
      this.frameCount = 0;
      this.lastFPSUpdate = 0;
      this.currentFPS = 0;
      
      // Components references
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.labelGroup = null;
      this.performanceMonitor = null;
    }
  
    // ===== INICIALIZAÇÃO DO SISTEMA =====
    iniciarSistemaAnimacao(scene, camera, renderer, controls, labelGroup = null) {
      console.log("🎬 Iniciando sistema de animação...");
      
      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.controls = controls;
      this.labelGroup = labelGroup;
      
      this.mixer = new THREE.AnimationMixer(scene);
      this.isRunning = true;
      
      // Iniciar loop de animação
      this.animar();
      
      console.log("✅ Sistema de animação iniciado");
    }
  
    // ===== LOOP PRINCIPAL DE ANIMAÇÃO =====
    animar() {
      if (!this.isRunning) return;
  
      this.frameId = requestAnimationFrame(() => this.animar());
  
      const delta = this.clock.getDelta();
  
      // Atualizar contadores de performance
      this.updatePerformanceCounters();
  
      // Auto-otimização baseada na performance
      if (this.performanceMonitor && this.currentFPS < 25) {
        this.performanceMonitor.checkAndOptimize(this.renderer, this.scene);
      }
  
      // Atualizar mixer de animações
      if (this.mixer) {
        this.mixer.update(delta);
      }
  
      // Atualizar controles de câmera
      if (this.controls) {
        this.controls.update();
      }
  
      // Labels sempre virados para a câmera
      this.updateLabelsLookAt();
  
      // Atualizar efeitos visuais dinâmicos
      this.atualizarEfeitosVisuais();
  
      // Renderizar cena
      this.renderFrame();
    }
  
    // ===== RENDERIZAÇÃO =====
    renderFrame() {
      if (this.scene && this.camera && this.renderer) {
        const startTime = performance.now();
        
        this.renderer.render(this.scene, this.camera);
        
        if (this.performanceMonitor) {
          const renderTime = performance.now() - startTime;
          this.performanceMonitor.performanceStats.renderTime = renderTime;
        }
      }
    }
  
    // ===== ATUALIZAÇÃO DE PERFORMANCE =====
    updatePerformanceCounters() {
      this.frameCount++;
      const now = performance.now();
      
      if (now - this.lastFPSUpdate >= 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.lastFPSUpdate = now;
        
        if (this.performanceMonitor) {
          this.performanceMonitor.performanceStats.fps = this.currentFPS;
        }
      }
    }
  
    // ===== ATUALIZAÇÃO DE LABELS =====
    updateLabelsLookAt() {
      if (this.labelGroup && this.camera && this.labelGroup.children.length > 0) {
        this.labelGroup.children.forEach((sprite) => {
          if (sprite.isSprite) {
            sprite.lookAt(this.camera.position);
          }
        });
      }
    }
  
    // ===== EFEITOS VISUAIS DINÂMICOS =====
    atualizarEfeitosVisuais() {
      try {
        if (!this.scene || !this.camera) return;
  
        // Atualizar névoa baseada na distância da câmera
        if (this.scene.fog) {
          const distanciaCamera = this.camera.position.length();
          this.scene.fog.density = Math.max(
            0.0005,
            Math.min(0.003, distanciaCamera * 0.00001)
          );
        }
  
        // Atualizar intensidade das luzes baseada na hora do dia simulada
        const luzesGrupo = this.scene.getObjectByName("Iluminacao");
        if (luzesGrupo) {
          const horaSimulada = (Date.now() * 0.0001) % 24;
          const intensidadeDia = Math.max(
            0.3,
            Math.sin((horaSimulada / 24) * Math.PI * 2)
          );
  
          luzesGrupo.children.forEach((luz) => {
            if (luz.isDirectionalLight) {
              luz.intensity = intensidadeDia * 3.0;
            }
          });
        }
      } catch (error) {
        // Erro silencioso para evitar spam no console
      }
    }
  
    // ===== ANIMAÇÕES DE CÂMERA =====
    animarCameraPara(novaPos, novoTarget, duracao = 2000, callback = null) {
      if (this.transicionandoCamera || !this.camera || !this.controls) return;
  
      console.log("📷 Iniciando animação de câmera...");
      this.transicionandoCamera = true;
  
      const posInicial = this.camera.position.clone();
      const targetInicial = this.controls.target.clone();
  
      const startTime = Date.now();
  
      const animar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duracao, 1);
  
        // Easing suave (cubic out)
        const eased = 1 - Math.pow(1 - progress, 3);
  
        this.camera.position.lerpVectors(posInicial, novaPos, eased);
        this.controls.target.lerpVectors(targetInicial, novoTarget, eased);
        this.controls.update();
  
        if (progress < 1) {
          requestAnimationFrame(animar);
        } else {
          this.transicionandoCamera = false;
          console.log("✅ Animação de câmera concluída");
          
          if (callback) {
            callback();
          }
        }
      };
  
      animar();
    }
  
    // ===== ANIMAÇÕES DE OBJETO =====
    animarObjeto(objeto, propriedade, valorFinal, duracao = 1000, callback = null) {
      if (!objeto || !objeto[propriedade]) {
        console.warn("⚠️ Objeto ou propriedade inválida para animação");
        return;
      }
  
      const valorInicial = objeto[propriedade].clone ? objeto[propriedade].clone() : objeto[propriedade];
      const startTime = Date.now();
  
      const animar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duracao, 1);
  
        // Easing suave
        const eased = 1 - Math.pow(1 - progress, 3);
  
        if (valorInicial.lerp) {
          // Para Vector3, Color, etc.
          objeto[propriedade].lerpVectors(valorInicial, valorFinal, eased);
        } else {
          // Para valores numéricos
          objeto[propriedade] = valorInicial + (valorFinal - valorInicial) * eased;
        }
  
        if (progress < 1) {
          requestAnimationFrame(animar);
        } else {
          objeto[propriedade] = valorFinal;
          console.log(`✅ Animação de ${propriedade} concluída`);
          
          if (callback) {
            callback();
          }
        }
      };
  
      animar();
    }
  
    // ===== ANIMAÇÃO DE FADE =====
    fadeIn(objeto, duracao = 1000, callback = null) {
      if (!objeto.material) {
        console.warn("⚠️ Objeto sem material para fade");
        return;
      }
  
      objeto.material.transparent = true;
      objeto.material.opacity = 0;
      objeto.visible = true;
  
      this.animarObjeto(objeto.material, 'opacity', 1, duracao, () => {
        objeto.material.transparent = false;
        if (callback) callback();
      });
    }
  
    fadeOut(objeto, duracao = 1000, callback = null) {
      if (!objeto.material) {
        console.warn("⚠️ Objeto sem material para fade");
        return;
      }
  
      objeto.material.transparent = true;
  
      this.animarObjeto(objeto.material, 'opacity', 0, duracao, () => {
        objeto.visible = false;
        if (callback) callback();
      });
    }
  
    // ===== ANIMAÇÕES DE GRUPO =====
    fadeInGroup(grupo, duracao = 1000, delay = 50, callback = null) {
      if (!grupo || !grupo.children) return;
  
      let completedAnimations = 0;
      const totalAnimations = grupo.children.length;
  
      grupo.children.forEach((child, index) => {
        setTimeout(() => {
          this.fadeIn(child, duracao, () => {
            completedAnimations++;
            if (completedAnimations === totalAnimations && callback) {
              callback();
            }
          });
        }, index * delay);
      });
    }
  
    fadeOutGroup(grupo, duracao = 1000, delay = 50, callback = null) {
      if (!grupo || !grupo.children) return;
  
      let completedAnimations = 0;
      const totalAnimations = grupo.children.length;
  
      grupo.children.forEach((child, index) => {
        setTimeout(() => {
          this.fadeOut(child, duracao, () => {
            completedAnimations++;
            if (completedAnimations === totalAnimations && callback) {
              callback();
            }
          });
        }, index * delay);
      });
    }
  
    // ===== ANIMAÇÕES DE CONTAINER =====
    destacarContainer(containerMesh, callback = null) {
      if (!containerMesh) return;
  
      // Salvar posição original
      const posicaoOriginal = containerMesh.position.clone();
      const materialOriginal = containerMesh.material.emissive.clone();
  
      // Animar para cima
      const novaPos = posicaoOriginal.clone();
      novaPos.y += 2;
  
      this.animarObjeto(containerMesh, 'position', novaPos, 500, () => {
        // Efeito de brilho
        containerMesh.material.emissive.setHex(0xFFD700);
        
        // Voltar à posição original após destaque
        setTimeout(() => {
          this.animarObjeto(containerMesh, 'position', posicaoOriginal, 500);
          this.animarObjeto(containerMesh.material, 'emissive', materialOriginal, 500, callback);
        }, 1500);
      });
    }
  
    // ===== EFEITO PULSANTE =====
    adicionarEfeitoPulsante(objeto, intensidadeMin = 0.1, intensidadeMax = 0.5, velocidade = 0.01) {
      if (!objeto.material) return;
  
      const pulsar = () => {
        if (objeto && objeto.material) {
          const intensidade = intensidadeMin + 
            (intensidadeMax - intensidadeMin) * 
            (Math.sin(Date.now() * velocidade) + 1) / 2;
          
          objeto.material.emissiveIntensity = intensidade;
          requestAnimationFrame(pulsar);
        }
      };
      
      pulsar();
    }
  
    // ===== PARTÍCULAS ANIMADAS =====
    criarParticulasAnimadas(posicao, cor = 0xFFD700, quantidade = 50, duracao = 3000) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.PointsMaterial({
        color: cor,
        size: 0.3,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
  
      const positions = new Float32Array(quantidade * 3);
      const velocities = new Float32Array(quantidade * 3);
  
      for (let i = 0; i < quantidade; i++) {
        // Posições iniciais ao redor do ponto
        positions[i * 3] = posicao.x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = posicao.y + Math.random() * 2;
        positions[i * 3 + 2] = posicao.z + (Math.random() - 0.5) * 2;
  
        // Velocidades aleatórias
        velocities[i * 3] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] = Math.random() * 0.2 + 0.1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      }
  
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(geometry, material);
  
      // Adicionar à cena
      this.scene.add(particles);
  
      // Animar partículas
      const startTime = Date.now();
      const animateParticles = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duracao;
  
        if (progress < 1) {
          const positions = particles.geometry.attributes.position.array;
  
          for (let i = 0; i < quantidade; i++) {
            positions[i * 3] += velocities[i * 3];
            positions[i * 3 + 1] += velocities[i * 3 + 1];
            positions[i * 3 + 2] += velocities[i * 3 + 2];
          }
  
          particles.geometry.attributes.position.needsUpdate = true;
          particles.material.opacity = 1 - progress;
  
          requestAnimationFrame(animateParticles);
        } else {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
        }
      };
  
      animateParticles();
      return particles;
    }
  
    // ===== CONTROLE DO SISTEMA =====
    pause() {
      this.isRunning = false;
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      console.log("⏸️ Sistema de animação pausado");
    }
  
    resume() {
      if (!this.isRunning) {
        this.isRunning = true;
        this.animar();
        console.log("▶️ Sistema de animação retomado");
      }
    }
  
    stop() {
      this.pause();
      
      // Parar todas as animações ativas
      if (this.mixer) {
        this.mixer.stopAllAction();
      }
      
      this.transicionandoCamera = false;
      console.log("⏹️ Sistema de animação parado");
    }
  
    // ===== CONFIGURAÇÕES =====
    setPerformanceMonitor(performanceMonitor) {
      this.performanceMonitor = performanceMonitor;
    }
  
    setQualityLevel(level) {
      switch (level) {
        case 'low':
          this.clock.autoStart = false; // Reduzir precision do clock
          break;
        case 'medium':
          this.clock.autoStart = true;
          break;
        case 'high':
          this.clock.autoStart = true;
          break;
      }
      console.log(`🎨 Qualidade de animação ajustada: ${level}`);
    }
  
    // ===== INFORMAÇÕES DE DEBUG =====
    getAnimationInfo() {
      return {
        isRunning: this.isRunning,
        transicionandoCamera: this.transicionandoCamera,
        currentFPS: this.currentFPS,
        frameCount: this.frameCount,
        activeAnimations: this.mixer ? this.mixer._actions.length : 0,
        clockTime: this.clock.getElapsedTime()
      };
    }
  
    // ===== LIMPEZA =====
    dispose() {
      console.log("🧹 Limpando sistema de animação...");
      
      this.stop();
      
      if (this.mixer) {
        this.mixer.uncacheRoot(this.scene);
        this.mixer = null;
      }
      
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.labelGroup = null;
      this.performanceMonitor = null;
      
      console.log("✅ Sistema de animação limpo");
    }
  }