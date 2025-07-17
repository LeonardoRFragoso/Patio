/**
 * Sistema de Manipulação de Interações
 * Gerencia cliques, hover, tooltips e seleções de containers
 */

export class InteractionHandler {
    constructor(camera, renderer, containerGroup, CONFIG, CORES) {
      this.camera = camera;
      this.renderer = renderer;
      this.containerGroup = containerGroup;
      this.CONFIG = CONFIG;
      this.CORES = CORES;
      
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.selectedContainer = null;
      this.hoveredContainer = null;
      
      this.debug = this.debug.bind(this);
      this.setupEventListeners();
    }
  
    // ===== CONFIGURAÇÃO DE EVENT LISTENERS =====
    setupEventListeners() {
      // Clique simples para seleção
      this.renderer.domElement.addEventListener("click", (event) => {
        this.aoClicarContainerSimples(event);
      });

      // Duplo clique para mostrar modal de detalhes
      this.renderer.domElement.addEventListener("dblclick", (event) => {
        this.aoClicarContainer(event);
      });

      this.renderer.domElement.addEventListener("mousemove", (event) => {
        this.aoHoverContainer(event);
      });

      this.renderer.domElement.addEventListener("mouseleave", () => {
        this.removerHover();
        this.esconderTooltip();
      });

      // Event listeners para teclado
      this.configurarAtalhosTeclado();
    }
  
    configurarAtalhosTeclado() {
      document.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case "f":
              event.preventDefault();
              this.toggleTelaCheia();
              break;
            case "s":
              event.preventDefault();
              this.exportarImagem();
              break;
            case "r":
              event.preventDefault();
              this.resetCompleto();
              break;
            case "h":
              event.preventDefault();
              this.mostrarAjuda();
              break;
          }
        }
  
        switch (event.key) {
          case "Escape":
            this.desselecionarContainer();
            break;
          case " ":
            event.preventDefault();
            // Emitir evento para toggle posições vazias
            document.dispatchEvent(new CustomEvent('togglePosicoesVazias'));
            break;
        }
      });
    }
  
    // ===== INTERAÇÕES COM CONTAINERS =====
    aoClicarContainer(event) {
      try {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
          this.containerGroup.children,
          true
        );

        if (intersects.length > 0) {
          const containerMesh = intersects[0].object;
          if (containerMesh.userData?.container) {
            this.selecionarContainerComModal(containerMesh);
          }
        } else {
          this.desselecionarContainer();
        }
      } catch (error) {
        this.debug(`Erro ao clicar container: ${error.message}`, "error");
      }
    }

    aoClicarContainerSimples(event) {
      try {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
          this.containerGroup.children,
          true
        );

        if (intersects.length > 0) {
          const containerMesh = intersects[0].object;
          if (containerMesh.userData?.container) {
            this.selecionarContainer(containerMesh);
          }
        } else {
          this.desselecionarContainer();
        }
      } catch (error) {
        this.debug(`Erro ao clicar container simples: ${error.message}`, "error");
      }
    }
  
    aoHoverContainer(event) {
      try {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
          this.containerGroup.children,
          true
        );
  
        if (intersects.length > 0) {
          const containerMesh = intersects[0].object;
          if (containerMesh.userData?.container) {
            this.aplicarHover(containerMesh);
            this.mostrarTooltip(containerMesh, event);
          }
        } else {
          this.removerHover();
          this.esconderTooltip();
        }
      } catch (error) {
        // Erro silencioso para hover
      }
    }
  
    // ===== SELEÇÃO DE CONTAINERS =====
    selecionarContainer(containerMesh) {
      try {
        if (this.selectedContainer === containerMesh) {
          this.desselecionarContainer();
          return;
        }

        // Desselecionar container anterior
        this.desselecionarContainer();

        // Selecionar novo container
        this.selectedContainer = containerMesh;
        
        // Guardar material original
        containerMesh.userData.materialOriginal = containerMesh.material;
        
        // Aplicar material de seleção
        const materialSelecionado = containerMesh.material.clone();
        materialSelecionado.color = this.CORES.SELECIONADA;
        materialSelecionado.emissive = new THREE.Color(0.3, 0.3, 0.0);
        materialSelecionado.emissiveIntensity = 0.5;
        containerMesh.material = materialSelecionado;
        
        // Emitir evento de seleção
        document.dispatchEvent(new CustomEvent('containerSelecionado', {
          detail: { container: containerMesh.userData.container }
        }));
      } catch (error) {
        this.debug(`Erro ao selecionar container: ${error.message}`, "error");
      }
    }

    selecionarContainerComModal(containerMesh) {
      try {
        // Primeiro seleciona o container
        this.selecionarContainer(containerMesh);
        
        // Depois mostra o modal de detalhes
        this.mostrarDetalhesContainerModal(containerMesh.userData.container);
      } catch (error) {
        this.debug(`Erro ao selecionar container com modal: ${error.message}`, "error");
      }
    }
  
    desselecionarContainer() {
      if (this.selectedContainer) {
        try {
          // Restaurar material original
          this.selectedContainer.material.emissive = new THREE.Color(0, 0, 0);
          this.selectedContainer.material.emissiveIntensity = 0;
  
          // Restaurar posição original
          this.selectedContainer.position.copy(
            this.selectedContainer.userData.posicaoOriginal
          );
  
          this.selectedContainer = null;
  
          // Remover painel de detalhes
          const painel = document.getElementById("painel-detalhes-container");
          if (painel) {
            painel.remove();
          }
  
          this.debug("Container desselecionado");
        } catch (error) {
          this.debug(
            `Erro ao desselecionar container: ${error.message}`,
            "error"
          );
        }
      }
    }
  
    // ===== EFEITOS DE HOVER =====
    aplicarHover(containerMesh) {
      if (this.hoveredContainer !== containerMesh) {
        this.removerHover();
  
        this.hoveredContainer = containerMesh;
  
        // Efeito visual sutil
        containerMesh.material.emissive = this.CORES.HOVER;
        containerMesh.material.emissiveIntensity = 0.1;
  
        // Cursor pointer
        this.renderer.domElement.style.cursor = "pointer";
      }
    }
  
    removerHover() {
      if (
        this.hoveredContainer &&
        this.hoveredContainer !== this.selectedContainer
      ) {
        this.hoveredContainer.material.emissive = new THREE.Color(0, 0, 0);
        this.hoveredContainer.material.emissiveIntensity = 0;
        this.hoveredContainer = null;
      }
  
      this.renderer.domElement.style.cursor = "default";
    }
  
    // ===== TOOLTIP =====
    mostrarTooltip(containerMesh, event) {
      try {
        let tooltip = document.getElementById("container-tooltip");
        if (!tooltip) {
          tooltip = document.createElement("div");
          tooltip.id = "container-tooltip";
          tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            pointer-events: none;
            z-index: 9999;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 250px;
          `;
          document.body.appendChild(tooltip);
        }
  
        const container = containerMesh.userData.container;
        const row = container.row || container.linha;
        const bay = container.bay || container.baia;
  
        tooltip.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 0.25rem;">${
            container.numero || "N/A"
          }</div>
          <div style="font-size: 0.75rem; opacity: 0.8;">
            ${row}${String(bay).padStart(2, "0")}-${container.altura} | ${
          container.armador || "N/A"
        }
          </div>
        `;
  
        tooltip.style.display = "block";
        tooltip.style.left = event.clientX + 10 + "px";
        tooltip.style.top = event.clientY - 10 + "px";
      } catch (error) {
        // Erro silencioso
      }
    }
  
    esconderTooltip() {
      const tooltip = document.getElementById("container-tooltip");
      if (tooltip) {
        tooltip.style.display = "none";
      }
    }
  
    // ===== MOSTRAR DETALHES DO CONTAINER NO MODAL =====
    mostrarDetalhesContainerModal(container) {
      try {
        console.log("🔍 Tentando mostrar modal de detalhes para container:", container);
        
        // Verificar se as referências globais estão disponíveis
        if (!window.ModalsDialogs) {
          console.error("❌ ModalsDialogs não está disponível no objeto window!");
          return;
        }
        
        if (!window.APIManager) {
          console.error("❌ APIManager não está disponível no objeto window!");
          return;
        }
        
        // Verifica se o container tem dados completos
        if (container && container.numero) {
          console.log("✅ Container válido encontrado: " + container.numero);
          
          // Sempre buscar dados completos do backend para garantir informações atualizadas
          console.log("🔄 Buscando dados completos do backend...");
          window.APIManager.buscarContainerCached(container.numero)
            .then(containerCompleto => {
              console.log("✅ Dados completos do container recebidos:", containerCompleto);
              
              // Verificar se recebemos dados válidos
              if (containerCompleto && containerCompleto.numero) {
                // Exibir modal com dados completos
                window.ModalsDialogs.mostrarDetalhesContainerModal(containerCompleto);
              } else {
                console.warn("⚠️ Dados do backend incompletos, usando dados locais");
                window.ModalsDialogs.mostrarDetalhesContainerModal(container);
              }
            })
            .catch(error => {
              console.error("❌ Erro ao buscar dados completos do container:", error);
              // Se falhar, exibir com os dados disponíveis
              console.log("⚠️ Exibindo modal com dados parciais disponíveis");
              window.ModalsDialogs.mostrarDetalhesContainerModal(container);
            });
        } else {
          console.error("❌ Container inválido ou sem número");
        }
      } catch (error) {
        console.error("❌ Erro ao mostrar detalhes do container no modal:", error);
      }
    }
    
  // ===== MOSTRAR DETALHES DO CONTAINER NO PAINEL LATERAL =====
    mostrarDetalhesContainer(container) {
      try {
        let painelDetalhes = document.getElementById("painel-detalhes-container");
  
        if (!painelDetalhes) {
          painelDetalhes = document.createElement("div");
          painelDetalhes.id = "painel-detalhes-container";
          painelDetalhes.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,60,0.9) 100%);
            color: white;
            padding: 2rem;
            border-radius: 15px;
            width: 350px;
            z-index: 9999;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
          `;
          document.body.appendChild(painelDetalhes);
        }
  
        const eh40TEU = this.isContainer40TEU(container);
        const status = this.obterStatusContainer(container);
        const statusColor = status === "Normal" ? "#4CAF50" : "#FF6B6B";
  
        painelDetalhes.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h4 style="margin: 0; color: #4CAF50;">
              <i class="fas fa-cube me-2"></i>
              Detalhes do Container
            </h4>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">${
              container.numero || "N/A"
            }</h5>
            <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
              <span style="background: rgba(74,144,226,0.3); padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.8rem;">
                ${container.row || container.linha}${String(
          container.bay || container.baia
        ).padStart(2, "0")}-${container.altura}
              </span>
              <span style="background: rgba(156,39,176,0.3); padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.8rem;">
                ${eh40TEU ? "40" : "20"} TEU
              </span>
            </div>
          </div>
          
          <div style="display: grid; gap: 0.8rem;">
            <div>
              <strong><i class="fas fa-shipping-fast me-2"></i>Armador:</strong>
              <span style="float: right;">${container.armador || "N/A"}</span>
            </div>
            <div>
              <strong><i class="fas fa-info-circle me-2"></i>Status:</strong>
              <span style="float: right; color: ${statusColor};">${status}</span>
            </div>
            <div>
              <strong><i class="fas fa-calendar me-2"></i>Data Entrada:</strong>
              <span style="float: right;">${
                container.data_entrada || "N/A"
              }</span>
            </div>
            <div>
              <strong><i class="fas fa-weight-hanging me-2"></i>Peso:</strong>
              <span style="float: right;">${container.peso || "N/A"} kg</span>
            </div>
            <div>
              <strong><i class="fas fa-thermometer-half me-2"></i>Temperatura:</strong>
              <span style="float: right;">${
                container.temperatura || "Ambiente"
              }</span>
            </div>
          </div>
          
          <div style="margin-top: 1.5rem; display: grid; gap: 0.5rem;">
            <button onclick="window.interactionHandler?.centralizarContainer('${
              container.numero
            }')" 
                    style="background: linear-gradient(45deg, #4CAF50, #45a049); border: none; color: white; padding: 0.5rem; border-radius: 8px; cursor: pointer;">
              <i class="fas fa-crosshairs me-2"></i>Centralizar Vista
            </button>
            <button onclick="window.interactionHandler?.destacarContainer('${
              container.numero
            }')" 
                    style="background: linear-gradient(45deg, #2196F3, #1976D2); border: none; color: white; padding: 0.5rem; border-radius: 8px; cursor: pointer;">
              <i class="fas fa-star me-2"></i>Destacar
            </button>
          </div>
        `;
  
        // Animar entrada
        painelDetalhes.style.transform = "translateY(-50%) translateX(100%)";
        setTimeout(() => {
          painelDetalhes.style.transform = "translateY(-50%) translateX(0)";
        }, 100);
      } catch (error) {
        this.debug(`Erro ao mostrar detalhes: ${error.message}`, "error");
      }
    }
  
    // ===== DESTACAR CONTAINER =====
    destacarContainer(numeroContainer) {
      try {
        // Encontrar mesh do container
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container?.numero === numeroContainer) {
            this.selecionarContainer(child);
  
            // Efeito especial de destaque
            const particulas = this.criarParticulasDestaque(child.position);
            
            // Emitir evento para adicionar partículas à cena
            document.dispatchEvent(new CustomEvent('adicionarParticulas', {
              detail: { particulas }
            }));
  
            setTimeout(() => {
              document.dispatchEvent(new CustomEvent('removerParticulas', {
                detail: { particulas }
              }));
            }, 3000);
          }
        });
      } catch (error) {
        this.debug(`Erro ao destacar container: ${error.message}`, "error");
      }
    }
  
    criarParticulasDestaque(posicao) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.PointsMaterial({
        color: 0xffd700,
        size: 0.3,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
  
      const particleCount = 50;
      const positions = new Float32Array(particleCount * 3);
  
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = posicao.x + (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = posicao.y + Math.random() * 8;
        positions[i * 3 + 2] = posicao.z + (Math.random() - 0.5) * 5;
      }
  
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  
      const particles = new THREE.Points(geometry, material);
  
      // Animar partículas
      let animationId;
      const animate = () => {
        const positions = particles.geometry.attributes.position.array;
  
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.05;
        }
  
        particles.geometry.attributes.position.needsUpdate = true;
        particles.material.opacity *= 0.995;
  
        if (particles.material.opacity > 0.01) {
          animationId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animationId);
        }
      };
  
      animate();
  
      return particles;
    }
  
    // ===== MÉTODOS AUXILIARES =====
    isContainer40TEU(container) {
      try {
        const tamanhoTeu = container?.tamanho_teu || container?.tamanho;
        return tamanhoTeu && parseInt(tamanhoTeu) === 40;
      } catch (error) {
        return false;
      }
    }
  
    obterStatusContainer(container) {
      // Implementação simplificada
      if (container.status) {
        return container.status;
      }
      return "Normal";
    }
  
    debug(message, type = "info") {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
      const formattedMsg = `${timestamp} ${prefix} ${message}`;
      console.log(formattedMsg);
    }
  
    // ===== CENTRALIZAR CONTAINER =====
    centralizarContainer(numeroContainer) {
      try {
        // Encontrar mesh do container
        let containerMesh = null;
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container?.numero === numeroContainer) {
            containerMesh = child;
          }
        });
  
        if (!containerMesh) {
          this.debug(`Container ${numeroContainer} não encontrado`, "warn");
          return;
        }
  
        // Obter posição do container
        const posicao = containerMesh.position;
        
        // Calcular nova posição da câmera (um pouco afastada do container)
        const distancia = 50;
        const novaPosicao = {
          x: posicao.x + distancia,
          y: posicao.y + 30,
          z: posicao.z + distancia
        };
  
        // Animar câmera para a nova posição
        this.animarCamera(novaPosicao, posicao);
        
        // Selecionar o container
        this.selecionarContainer(containerMesh);
        
        this.debug(`Câmera centralizada no container ${numeroContainer}`, "info");
      } catch (error) {
        this.debug(`Erro ao centralizar container: ${error.message}`, "error");
      }
    }
  
    // ===== ANIMAR CÂMERA =====
    animarCamera(novaPosicao, alvo) {
      try {
        const posicaoInicial = {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z
        };
  
        const duracao = 1000; // 1 segundo
        const inicio = Date.now();
  
        const animar = () => {
          const agora = Date.now();
          const progresso = Math.min((agora - inicio) / duracao, 1);
          
          // Função de easing (suave)
          const ease = 1 - Math.pow(1 - progresso, 3);
  
          // Interpolar posição
          this.camera.position.x = posicaoInicial.x + (novaPosicao.x - posicaoInicial.x) * ease;
          this.camera.position.y = posicaoInicial.y + (novaPosicao.y - posicaoInicial.y) * ease;
          this.camera.position.z = posicaoInicial.z + (novaPosicao.z - posicaoInicial.z) * ease;
  
          // Fazer câmera olhar para o alvo
          if (alvo) {
            this.camera.lookAt(alvo.x, alvo.y, alvo.z);
          }
  
          if (progresso < 1) {
            requestAnimationFrame(animar);
          }
        };
  
        animar();
      } catch (error) {
        this.debug(`Erro ao animar câmera: ${error.message}`, "error");
      }
    }
  }