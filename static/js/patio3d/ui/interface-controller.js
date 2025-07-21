/**
 * Controlador Principal da Interface
 * Coordena todos os componentes da interface de usuário
 */

export class InterfaceController {
    constructor(scene, camera, renderer, controls, containerGroup, CONFIG) {
      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.controls = controls;
      this.containerGroup = containerGroup;
      this.CONFIG = CONFIG;
      
      // Estados da interface
      this.labelsVisiveis = true;
      this.infraestruturaVisivel = true;
      this.posicoesVaziasVisiveis = true;
      
      // Grupos de objetos
      this.labelGroup = null;
      this.infraestruturaGroup = null;
      this.posicoesVaziasGroup = null;
      
      this.debug = this.debug.bind(this);
    }
  
    // ===== INICIALIZAÇÃO =====
    init(labelGroup, infraestruturaGroup, posicoesVaziasGroup) {
      this.labelGroup = labelGroup;
      this.infraestruturaGroup = infraestruturaGroup;
      this.posicoesVaziasGroup = posicoesVaziasGroup;
      
      this.configurarInterface();
      this.setupEventListeners();
    }
  
    // ===== CONFIGURAÇÃO DA INTERFACE =====
    configurarInterface() {
      this.debug("🎛️ Configurando interface integrada...");
  
      // Botões de vista - CORRIGIDO
      this.configurarBotaoVista("btn-vista-geral", () => {
        this.posicionarCameraCompleta();
        this.atualizarStatusSistema('camera', 'success', '📹 Vista Geral');
      });
      this.configurarBotaoVista("btn-vista-topo", () => {
        this.posicionarCameraTopo();
        this.atualizarStatusSistema('camera', 'success', '📹 Vista Topo');
      });
      this.configurarBotaoVista("btn-vista-lateral", () => {
        this.posicionarCameraLateral();
        this.atualizarStatusSistema('camera', 'success', '📹 Vista Lateral');
      });
      this.configurarBotaoVista("btn-vista-containers", () => {
        this.focarContainers();
        this.atualizarStatusSistema('camera', 'success', '📹 Foco Containers');
      });
  
      // Botões de ação - CORRIGIDO
      this.configurarBotao("btn-refresh", () => this.atualizarDados());
      this.configurarBotao("btn-refresh-data", () => this.atualizarDados());
      this.configurarBotao("btn-debug", () => this.toggleDebugPanel());
      this.configurarBotao("btn-fullscreen", () => this.toggleTelaCheia());
      this.configurarBotao("btn-help", () => this.mostrarAjuda());
  
      // Botões de infraestrutura
      this.configurarBotao("btn-toggle-infraestrutura", () =>
        this.toggleInfraestrutura()
      );
      this.configurarBotao("btn-highlight-flutuantes", () =>
        this.emitirEvento('detectarContainersProblematicos')
      );
  
      // Botões de labels e posições vazias
      this.configurarBotao("btn-toggle-labels", (btn) => this.toggleLabels(btn));
      this.configurarBotao("btn-toggle-posicoes-vazias", (btn) =>
        this.togglePosicoesVazias(btn)
      );
  
      // Botões de exportação
      this.configurarBotao("btn-exportar-png", () => this.exportarImagem("png"));
      this.configurarBotao("btn-exportar-jpg", () => this.exportarImagem("jpeg"));
  
      // 🔧 CORREÇÃO: Configurar filtros avançados
      this.configurarFiltros();
  
      // 🔧 CORREÇÃO: Definir vista lateral como ativa na interface
      this.definirVistaPadraoLateral();

      // 🔧 NOVO: Inicializar status do sistema
      this.inicializarStatusSistema();
  
      this.debug("✅ Interface configurada com sucesso!");
    }
  
    // 🔧 CORREÇÃO: Definir vista lateral como ativa na interface
    definirVistaPadraoLateral() {
      // Remover active de todos os botões de vista
      document.querySelectorAll("[id^='btn-vista-']").forEach((btn) => {
        btn.classList.remove("active");
      });
  
      // Marcar vista lateral como ativa
      const btnLateral = document.getElementById("btn-vista-lateral");
      if (btnLateral) {
        btnLateral.classList.add("active");
      }
  
      this.debug("🎯 Vista lateral definida como padrão na interface");
    }
  
    configurarBotaoVista(id, acao) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => {
          // Remover active de todos os botões de vista
          document
            .querySelectorAll("[id^='btn-vista-']")
            .forEach((b) => b.classList.remove("active"));
          // Adicionar active ao botão clicado
          btn.classList.add("active");
          // Executar ação
          acao();
          this.debug(`Vista alterada: ${id}`);
        });
      }
    }

    // 🔧 CORREÇÃO: Configurar filtros avançados
    configurarFiltros() {
      const filtroRow = document.getElementById('filtro-row');
      const filtroAltura = document.getElementById('filtro-altura');
      const buscaContainer = document.getElementById('busca-container-input');
      const btnBuscar = document.getElementById('btn-buscar-container');
      
      this.debug("🔍 Configurando filtros avançados...");
      
      // Configurar filtro por Row (usar HTML existente)
      if (filtroRow) {
        filtroRow.addEventListener('change', (e) => {
          this.aplicarFiltroRow(e.target.value);
          this.atualizarStatusSistema('filtros', 'success', `🔍 Filtro: Row ${e.target.value || 'Todos'}`);
          this.debug(`Filtro Row aplicado: ${e.target.value || 'Todos'}`);
        });
        this.debug("✅ Filtro Row configurado");
      } else {
        this.debug("❌ Elemento filtro-row não encontrado", "error");
      }
      
      // Configurar filtro por Altura (usar HTML existente)
      if (filtroAltura) {
        filtroAltura.addEventListener('change', (e) => {
          this.aplicarFiltroAltura(e.target.value);
          this.atualizarStatusSistema('filtros', 'success', `🔍 Filtro: Altura ${e.target.value || 'Todas'}`);
          this.debug(`Filtro Altura aplicado: ${e.target.value || 'Todas'}`);
        });
        this.debug("✅ Filtro Altura configurado");
      } else {
        this.debug("❌ Elemento filtro-altura não encontrado", "error");
      }

      // Configurar busca de container
      if (buscaContainer) {
        // Enter key
        buscaContainer.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const termo = e.target.value.trim();
            if (termo) {
              this.buscarContainer(termo);
            } else {
              this.limparFiltros();
            }
          }
        });
        
        // Input em tempo real (opcional)
        buscaContainer.addEventListener('input', (e) => {
          const termo = e.target.value.trim();
          if (termo.length === 0) {
            this.limparFiltros();
          }
        });
        
        this.debug("✅ Busca de container configurada");
      } else {
        this.debug("❌ Elemento busca-container-input não encontrado", "error");
      }

      // Botão de busca (se existir)
      if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
          const termo = buscaContainer?.value.trim();
          if (termo) {
            this.buscarContainer(termo);
          }
        });
        this.debug("✅ Botão de busca configurado");
      }
      
      // Configurar botões de toggle
      this.configurarBotoesToggle();
      
      this.debug("✅ Filtros avançados configurados com sucesso!");
    }

    // Aplicar filtro por Row
    aplicarFiltroRow(row) {
      if (this.containerGroup) {
        this.containerGroup.children.forEach(container => {
          if (container.userData && container.userData.posicao) {
            const containerRow = container.userData.posicao.charAt(0); // Primeira letra da posição
            container.visible = !row || containerRow === row;
          }
        });
        
        this.debug(`Filtro Row aplicado: ${row || 'Todos'}`);
        this.emitirEvento('showToast', {
          message: `Filtro Row: ${row || 'Todos os Rows'}`,
          type: "info"
        });
      }
    }

    // Aplicar filtro por Altura
    aplicarFiltroAltura(altura) {
      if (this.containerGroup) {
        this.containerGroup.children.forEach(container => {
          if (container.userData && container.userData.tipo) {
            const isHighCube = container.userData.tipo.includes('HC');
            let mostrar = true;
            
            if (altura === 'standard') {
              mostrar = !isHighCube;
            } else if (altura === 'high-cube') {
              mostrar = isHighCube;
            }
            
            container.visible = mostrar;
          }
        });
        
        this.debug(`Filtro Altura aplicado: ${altura || 'Todos'}`);
        this.emitirEvento('showToast', {
          message: `Filtro Altura: ${altura || 'Todas as Alturas'}`,
          type: "info"
        });
      }
    }

    // Aplicar filtro por Status
    aplicarFiltroStatus(status) {
      if (this.containerGroup) {
        this.containerGroup.children.forEach(container => {
          if (container.userData && container.userData.status) {
            container.visible = !status || container.userData.status === status;
          }
        });
        
        this.debug(`Filtro Status aplicado: ${status || 'Todos'}`);
        this.emitirEvento('showToast', {
          message: `Filtro Status: ${status || 'Todos os Status'}`,
          type: "info"
        });
      }
    }

    configurarBotao(id, acao) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => {
          acao(btn);
        });
      }
    }
  
    // ===== EVENT LISTENERS =====
    setupEventListeners() {
      // Event listeners personalizados
      document.addEventListener('togglePosicoesVazias', () => {
        this.togglePosicoesVazias();
      });
  
      document.addEventListener('showToast', (event) => {
        // Delegar para o toast manager
        this.emitirEvento('showToast', event.detail);
      });
  
      // Redimensionamento
      window.addEventListener("resize", () => this.aoRedimensionar());
    }
  
    // ===== AÇÕES DA INTERFACE =====
    toggleDebugPanel() {
      const panel = document.getElementById("debug-panel");
      if (panel) {
        panel.classList.toggle("d-none");
        this.debug("Debug panel toggled");
      }
    }
  
    toggleTelaCheia() {
    try {
      const container = document.getElementById("three-container");
  
      if (!document.fullscreenElement) {
        // Entrar em tela cheia
        const fullscreenPromise = container.requestFullscreen() || 
                                 container.webkitRequestFullscreen() || 
                                 container.mozRequestFullScreen() || 
                                 container.msRequestFullscreen();
        
        if (fullscreenPromise) {
          fullscreenPromise.then(() => {
            // Aguardar um pouco para garantir que o fullscreen foi aplicado
            setTimeout(() => {
              this.aoRedimensionar();
              // Ajustar controles para tela cheia - velocidade mais lenta
              if (this.controls) {
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.1;
                this.controls.rotateSpeed = 0.3;
                this.controls.panSpeed = 0.5;
                this.controls.zoomSpeed = 0.5;
              }
              this.debug("Modo tela cheia ativado");
              this.emitirEvento('showToast', {
                message: "Modo tela cheia ativado - Controles ajustados",
                type: "success"
              });
            }, 100);
          }).catch(error => {
            this.debug(`Erro ao ativar tela cheia: ${error.message}`, "error");
          });
        }
      } else {
        // Sair da tela cheia
        const exitPromise = document.exitFullscreen() || 
                           document.webkitExitFullscreen() || 
                           document.mozCancelFullScreen() || 
                           document.msExitFullscreen();
        
        if (exitPromise) {
          exitPromise.then(() => {
            setTimeout(() => {
              this.aoRedimensionar();
              // Restaurar controles normais
              if (this.controls) {
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.rotateSpeed = 0.5;
                this.controls.panSpeed = 0.8;
                this.controls.zoomSpeed = 0.8;
              }
              this.debug("Modo tela cheia desativado");
              this.emitirEvento('showToast', {
                message: "Modo normal restaurado",
                type: "info"
              });
            }, 100);
          }).catch(error => {
            this.debug(`Erro ao sair da tela cheia: ${error.message}`, "error");
          });
        }
      }
    } catch (error) {
      this.debug(`Erro no modo tela cheia: ${error.message}`, "error");
    }
  }
  
    toggleInfraestrutura() {
      if (this.infraestruturaGroup) {
        this.infraestruturaVisivel = !this.infraestruturaVisivel;
        this.infraestruturaGroup.visible = this.infraestruturaVisivel;
  
        const btn = document.getElementById("btn-toggle-infraestrutura");
        if (btn) {
          btn.classList.toggle("active");
          btn.innerHTML = `<i class="fas fa-building me-2"></i>${
            this.infraestruturaVisivel ? "Ocultar" : "Mostrar"
          } Infraestrutura`;
        }
  
        this.debug(
          `Infraestrutura ${this.infraestruturaVisivel ? "visível" : "oculta"}`
        );
        
        this.emitirEvento('showToast', {
          message: `Infraestrutura ${this.infraestruturaVisivel ? "visível" : "oculta"}`,
          type: "info"
        });
      }
    }
  
    toggleLabels(btn) {
      if (this.labelGroup) {
        this.labelsVisiveis = !this.labelsVisiveis;
        this.labelGroup.visible = this.labelsVisiveis;
  
        if (btn) {
          btn.classList.toggle("active");
          btn.innerHTML = `<i class="fas fa-tags me-2"></i>${
            this.labelsVisiveis ? "Ocultar" : "Mostrar"
          } Labels`;
        }
  
        this.debug(`Labels ${this.labelsVisiveis ? "visíveis" : "ocultas"}`);
      }
    }
  
    togglePosicoesVazias(btn) {
      if (this.posicoesVaziasGroup) {
        this.posicoesVaziasVisiveis = !this.posicoesVaziasVisiveis;
  
        if (this.posicoesVaziasVisiveis) {
          // Mostrar com fade in
          this.posicoesVaziasGroup.visible = true;
          this.posicoesVaziasGroup.children.forEach((child, index) => {
            child.material.opacity = 0;
            setTimeout(() => {
              const fadeIn = () => {
                child.material.opacity += 0.02;
                if (child.material.opacity < 0.3) {
                  requestAnimationFrame(fadeIn);
                }
              };
              fadeIn();
            }, index * 10);
          });
        } else {
          // Esconder com fade out
          this.posicoesVaziasGroup.children.forEach((child, index) => {
            setTimeout(() => {
              const fadeOut = () => {
                child.material.opacity -= 0.02;
                if (child.material.opacity > 0) {
                  requestAnimationFrame(fadeOut);
                } else {
                  this.posicoesVaziasGroup.visible = false;
                }
              };
              fadeOut();
            }, index * 5);
          });
        }
  
        if (btn) {
          btn.classList.toggle("active");
          btn.innerHTML = `<i class="fas fa-eye me-2"></i>${
            this.posicoesVaziasVisiveis ? "Ocultar" : "Mostrar"
          } Posições Vazias`;
        }
  
        this.debug(
          `Posições vazias ${
            this.posicoesVaziasVisiveis ? "visíveis" : "ocultas"
          }`
        );
      }
    }
  
    // ===== EXPORTAR IMAGEM =====
    exportarImagem(formato = "png", qualidade = 1.0) {
      try {
        const canvas = this.renderer.domElement;
        const dataURL = canvas.toDataURL(`image/${formato}`, qualidade);
  
        // Criar link de download
        const link = document.createElement("a");
        link.download = `patio-3d-${new Date()
          .toISOString()
          .slice(0, 10)}.${formato}`;
        link.href = dataURL;
        link.click();
  
        this.debug(`Imagem exportada: ${formato.toUpperCase()}`, "success");
        
        this.emitirEvento('showToast', {
          message: "Imagem exportada com sucesso!",
          type: "success"
        });
      } catch (error) {
        this.debug(`Erro ao exportar imagem: ${error.message}`, "error");
        
        this.emitirEvento('showToast', {
          message: "Erro ao exportar imagem",
          type: "error"
        });
      }
    }
  
    // ===== REDIMENSIONAMENTO =====
    aoRedimensionar() {
      try {
        const container = document.getElementById("three-container");
        if (!container || !this.camera || !this.renderer) return;
  
        const width = container.clientWidth;
        const height = container.clientHeight;
  
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      } catch (error) {
        this.debug(`Erro durante redimensionamento: ${error.message}`, "error");
      }
    }
  
    // ===== RESET COMPLETO =====
    resetCompleto() {
      try {
        this.debug("Executando reset completo do sistema...");
  
        // Emitir evento para desselecionar container
        this.emitirEvento('desselecionarContainer');
  
        // Resetar filtros
        document.querySelectorAll("select, input").forEach((element) => {
          if (element.type !== "button" && element.id !== "busca-container-input") {
            element.value = "";
          }
        });
  
        // Limpar campo de busca
        const buscaInput = document.getElementById("busca-container-input");
        if (buscaInput) {
          buscaInput.value = "";
        }
  
        // Emitir evento para aplicar filtros vazios
        this.emitirEvento('aplicarFiltros');
  
        // Resetar visibilidade dos grupos
        if (this.infraestruturaGroup) {
          this.infraestruturaGroup.visible = true;
          this.infraestruturaVisivel = true;
        }
        if (this.labelGroup) {
          this.labelGroup.visible = true;
          this.labelsVisiveis = true;
        }
        if (this.posicoesVaziasGroup) {
          this.posicoesVaziasGroup.visible = true;
          this.posicoesVaziasVisiveis = true;
        }
  
        // Atualizar botões
        this.atualizarBotoesInterface();
  
        // Resetar câmera
        this.emitirEvento('resetarCamera');
  
        this.debug("Reset completo executado");
        
        this.emitirEvento('showToast', {
          message: "Sistema resetado",
          type: "success"
        });
      } catch (error) {
        this.debug(`Erro no reset: ${error.message}`, "error");
      }
    }
  
    atualizarBotoesInterface() {
      // Atualizar botão de infraestrutura
      const btnInfra = document.getElementById("btn-toggle-infraestrutura");
      if (btnInfra) {
        btnInfra.classList.toggle("active", this.infraestruturaVisivel);
        btnInfra.innerHTML = `<i class="fas fa-building me-2"></i>${
          this.infraestruturaVisivel ? "Ocultar" : "Mostrar"
        } Infraestrutura`;
      }
  
      // Atualizar botão de labels
      const btnLabels = document.getElementById("btn-toggle-labels");
      if (btnLabels) {
        btnLabels.classList.toggle("active", this.labelsVisiveis);
        btnLabels.innerHTML = `<i class="fas fa-tags me-2"></i>${
          this.labelsVisiveis ? "Ocultar" : "Mostrar"
        } Labels`;
      }
  
      // Atualizar botão de posições vazias
      const btnPosicoes = document.getElementById("btn-toggle-posicoes-vazias");
      if (btnPosicoes) {
        btnPosicoes.classList.toggle("active", this.posicoesVaziasVisiveis);
        btnPosicoes.innerHTML = `<i class="fas fa-eye me-2"></i>${
          this.posicoesVaziasVisiveis ? "Ocultar" : "Mostrar"
        } Posições Vazias`;
      }
    }
  
    // ===== NOVOS MÉTODOS PARA FUNCIONALIDADE COMPLETA =====
    
    // Inicializar status do sistema
    inicializarStatusSistema() {
      this.atualizarStatusSistema('api', 'success', '🌐 API Conectada');
      this.atualizarStatusSistema('threejs', 'success', '🎮 THREE.js Ativo');
      this.atualizarStatusSistema('camera', 'success', '📹 Câmera Pronta');
      this.atualizarStatusSistema('render', 'success', '⚡ Renderizando');
      this.atualizarStatusSistema('filtros', 'success', '🔍 Filtros Ativos');
      
      // Atualizar indicador principal do sistema
      const indicador = document.getElementById('system-status-indicator');
      if (indicador) {
        indicador.className = 'status-indicator success';
        indicador.innerHTML = '<span class="status-dot"></span>Sistema Operacional';
      }
      
      this.debug('✅ Status do sistema inicializado');
    }
    
    // Atualizar status individual
    atualizarStatusSistema(tipo, status, texto) {
      const elemento = document.getElementById(`${tipo}-status`);
      if (elemento) {
        elemento.className = `status-badge ${status}`;
        elemento.textContent = texto;
        this.debug(`Status ${tipo} atualizado: ${texto}`);
      }
    }
    
    // Atualizar dados do pátio
    async atualizarDados() {
      try {
        // Atualizar status para carregando
        this.atualizarStatusSistema('api', 'loading', '🔄 Atualizando API...');
        this.atualizarStatusSistema('dados', 'loading', '🔄 SINCRONIZANDO');
        
        this.debug('🔄 Iniciando atualização de dados');
        
        // Usar o APIManager global para recarregar dados reais
        if (window.APIManager) {
          const novosDados = await window.APIManager.obterDadosPatio3DComRetry();
          
          // Atualizar estatísticas se StatusDisplay estiver disponível
          if (window.StatusDisplay) {
            window.StatusDisplay.atualizarEstatisticas(novosDados.data);
            window.StatusDisplay.atualizarUltimaAtualizacao();
          }
          
          // Atualizar status para sucesso
          this.atualizarStatusSistema('api', 'success', '🌐 API Conectada');
          this.atualizarStatusSistema('dados', 'success', '✅ SINCRONIZADO');
          
          // Mostrar toast de sucesso
          this.emitirEvento('showToast', {
            message: `Dados atualizados! ${novosDados.data?.containers?.length || 0} containers carregados.`,
            type: 'success'
          });
          
          this.debug(`✅ Dados atualizados com sucesso: ${novosDados.data?.containers?.length || 0} containers`);
        } else {
          throw new Error('APIManager não está disponível');
        }
      } catch (error) {
        this.atualizarStatusSistema('api', 'error', '❌ Erro na API');
        this.atualizarStatusSistema('dados', 'error', '❌ Erro nos Dados');
        
        this.emitirEvento('showToast', {
          message: `Erro ao atualizar dados: ${error.message}`,
          type: 'error'
        });
        
        this.debug(`Erro ao atualizar dados: ${error.message}`, 'error');
      }
    }
    
    // Posicionamento de câmera
    posicionarCameraCompleta() {
      if (this.camera && this.controls) {
        this.camera.position.set(50, 30, 50);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.debug('📹 Câmera posicionada: Vista Geral');
      }
    }
    
    posicionarCameraTopo() {
      if (this.camera && this.controls) {
        this.camera.position.set(0, 80, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.debug('📹 Câmera posicionada: Vista Topo');
      }
    }
    
    posicionarCameraLateral() {
      if (this.camera && this.controls) {
        this.camera.position.set(80, 20, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.debug('📹 Câmera posicionada: Vista Lateral');
      }
    }
    
    focarContainers() {
      if (this.camera && this.controls && this.containerGroup) {
        // Calcular centro dos containers
        const box = new THREE.Box3().setFromObject(this.containerGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Posicionar câmera para focar nos containers
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;
        
        this.camera.position.set(
          center.x + distance,
          center.y + distance * 0.5,
          center.z + distance
        );
        this.controls.target.copy(center);
        this.controls.update();
        
        this.debug('📹 Câmera focada nos containers');
      }
    }
    
    // Configurar botões de toggle
    configurarBotoesToggle() {
      const btnToggleLabels = document.getElementById('btn-toggle-labels');
      const btnTogglePosicoesVazias = document.getElementById('btn-toggle-posicoes-vazias');
      
      // Toggle Labels
      if (btnToggleLabels) {
        btnToggleLabels.addEventListener('click', () => {
          const isActive = btnToggleLabels.classList.contains('active');
          
          if (isActive) {
            btnToggleLabels.classList.remove('active');
            btnToggleLabels.innerHTML = '<i class="fas fa-tags me-1"></i><span>Labels</span>';
            this.toggleLabels(false);
            this.atualizarStatusSistema('filtros', 'info', '🏷️ Labels Ocultos');
          } else {
            btnToggleLabels.classList.add('active');
            btnToggleLabels.innerHTML = '<i class="fas fa-tags me-1"></i><span>Labels</span>';
            this.toggleLabels(true);
            this.atualizarStatusSistema('filtros', 'success', '🏷️ Labels Visíveis');
          }
          
          this.debug(`Labels ${isActive ? 'ocultados' : 'exibidos'}`);
        });
        
        this.debug("✅ Botão Toggle Labels configurado");
      } else {
        this.debug("❌ Elemento btn-toggle-labels não encontrado", "error");
      }
      
      // Toggle Posições Vazias
      if (btnTogglePosicoesVazias) {
        btnTogglePosicoesVazias.addEventListener('click', () => {
          const isActive = btnTogglePosicoesVazias.classList.contains('active');
          
          if (isActive) {
            btnTogglePosicoesVazias.classList.remove('active');
            btnTogglePosicoesVazias.innerHTML = '<i class="fas fa-eye-slash me-1"></i><span>Posições Vazias</span>';
            this.togglePosicoesVazias(false);
            this.atualizarStatusSistema('filtros', 'info', '👁️ Posições Ocultas');
          } else {
            btnTogglePosicoesVazias.classList.add('active');
            btnTogglePosicoesVazias.innerHTML = '<i class="fas fa-eye me-1"></i><span>Posições Vazias</span>';
            this.togglePosicoesVazias(true);
            this.atualizarStatusSistema('filtros', 'success', '👁️ Posições Visíveis');
          }
          
          this.debug(`Posições vazias ${isActive ? 'ocultadas' : 'exibidas'}`);
        });
        
        this.debug("✅ Botão Toggle Posições Vazias configurado");
      } else {
        this.debug("❌ Elemento btn-toggle-posicoes-vazias não encontrado", "error");
      }
    }
    
    // Toggle Labels
    toggleLabels(mostrar) {
      try {
        // Emitir evento para controlar labels
        this.emitirEvento('toggleLabels', { mostrar });
        this.debug(`Labels ${mostrar ? 'exibidos' : 'ocultados'}`);
      } catch (error) {
        this.debug(`Erro ao toggle labels: ${error.message}`, 'error');
      }
    }
    
    // Toggle Posições Vazias
    togglePosicoesVazias(mostrar) {
      try {
        // Emitir evento para controlar posições vazias
        this.emitirEvento('togglePosicoesVazias', { mostrar });
        this.debug(`Posições vazias ${mostrar ? 'exibidas' : 'ocultadas'}`);
      } catch (error) {
        this.debug(`Erro ao toggle posições vazias: ${error.message}`, 'error');
      }
    }
    
    // Aplicar filtro por Row
    aplicarFiltroRow(row) {
      try {
        if (this.containerGroup) {
          this.containerGroup.children.forEach((child) => {
            if (child.userData?.container) {
              const containerRow = child.userData.container.row || child.userData.container.linha;
              
              if (!row || containerRow === row) {
                child.visible = true;
                if (child.material) {
                  child.material.transparent = false;
                  child.material.opacity = 1.0;
                }
              } else {
                if (child.material) {
                  child.material.transparent = true;
                  child.material.opacity = 0.3;
                }
              }
            }
          });
          
          this.debug(`Filtro Row aplicado: ${row || 'Todos'}`);
        }
      } catch (error) {
        this.debug(`Erro ao aplicar filtro Row: ${error.message}`, 'error');
      }
    }
    
    // Aplicar filtro por Altura
    aplicarFiltroAltura(altura) {
      try {
        if (this.containerGroup) {
          const alturaNum = altura ? parseInt(altura) : null;
          
          this.containerGroup.children.forEach((child) => {
            if (child.userData?.container) {
              const containerAltura = parseInt(child.userData.container.altura);
              
              if (!alturaNum || containerAltura === alturaNum) {
                child.visible = true;
                if (child.material) {
                  child.material.transparent = false;
                  child.material.opacity = 1.0;
                }
              } else {
                if (child.material) {
                  child.material.transparent = true;
                  child.material.opacity = 0.3;
                }
              }
            }
          });
          
          this.debug(`Filtro Altura aplicado: ${altura || 'Todas'}`);
        }
      } catch (error) {
        this.debug(`Erro ao aplicar filtro Altura: ${error.message}`, 'error');
      }
    }
    
    // Limpar todos os filtros
    limparFiltros() {
      try {
        if (this.containerGroup) {
          this.containerGroup.children.forEach((child) => {
            if (child.userData?.container) {
              child.visible = true;
              if (child.material) {
                child.material.transparent = false;
                child.material.opacity = 1.0;
                // Remover destaque de busca se existir
                if (child.material.emissive) {
                  child.material.emissive.setHex(0x000000);
                  child.material.emissiveIntensity = 0;
                }
              }
            }
          });
          
          // Resetar dropdowns
          const filtroRow = document.getElementById('filtro-row');
          const filtroAltura = document.getElementById('filtro-altura');
          const buscaContainer = document.getElementById('busca-container-input');
          
          if (filtroRow) filtroRow.value = '';
          if (filtroAltura) filtroAltura.value = '';
          if (buscaContainer) buscaContainer.value = '';
          
          this.atualizarStatusSistema('filtros', 'success', '🔍 Filtros Limpos');
          this.debug('Filtros limpos com sucesso');
        }
      } catch (error) {
        this.debug(`Erro ao limpar filtros: ${error.message}`, 'error');
      }
    }
    
    // Buscar container
    buscarContainer(termo) {
      try {
        this.atualizarStatusSistema('filtros', 'loading', '🔍 Buscando...');
        
        if (this.containerGroup && termo) {
          let encontrados = 0;
          
          // Primeiro, resetar todos os containers
          this.containerGroup.children.forEach((child) => {
            if (child.userData?.container) {
              child.visible = true;
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0.2;
                // Remover destaque anterior
                if (child.material.emissive) {
                  child.material.emissive.setHex(0x000000);
                  child.material.emissiveIntensity = 0;
                }
              }
            }
          });
          
          // Buscar e destacar containers que correspondem ao termo
          this.containerGroup.children.forEach((child) => {
            if (child.userData?.container) {
              const container = child.userData.container;
              const numero = container.numero || container.container_numero || '';
              const armador = container.armador || '';
              
              if (numero.toLowerCase().includes(termo.toLowerCase()) ||
                  armador.toLowerCase().includes(termo.toLowerCase())) {
                // Destacar container encontrado
                if (child.material) {
                  child.material.transparent = false;
                  child.material.opacity = 1.0;
                  child.material.emissive.setHex(0x00ff00);
                  child.material.emissiveIntensity = 0.3;
                }
                encontrados++;
              }
            }
          });
          
          // Mostrar resultado
          if (encontrados > 0) {
            this.atualizarStatusSistema('filtros', 'success', `🔍 Encontrados: ${encontrados}`);
            this.emitirEvento('showToast', {
              message: `${encontrados} container(s) encontrado(s) para "${termo}"`,
              type: 'success'
            });
          } else {
            this.atualizarStatusSistema('filtros', 'warning', '🔍 Nenhum resultado');
            this.emitirEvento('showToast', {
              message: `Nenhum container encontrado para "${termo}"`,
              type: 'warning'
            });
          }
          
          this.debug(`🔍 Busca por "${termo}": ${encontrados} resultados`);
        }
      } catch (error) {
        this.atualizarStatusSistema('filtros', 'error', '❌ Erro na busca');
        this.debug(`Erro na busca: ${error.message}`, 'error');
      }
    }
  
    // ===== MOSTRAR AJUDA =====
    mostrarAjuda() {
      // Emitir evento para mostrar modal de ajuda
      this.emitirEvento('mostrarModalAjuda');
    }
  
    // ===== MÉTODOS DE UTILIDADE =====
    emitirEvento(tipo, dados = null) {
      document.dispatchEvent(new CustomEvent(tipo, {
        detail: dados
      }));
    }
  
    // ===== GETTERS E SETTERS =====
    getEstadoInterface() {
      return {
        labelsVisiveis: this.labelsVisiveis,
        infraestruturaVisivel: this.infraestruturaVisivel,
        posicoesVaziasVisiveis: this.posicoesVaziasVisiveis
      };
    }
  
    setEstadoInterface(estado) {
      if (estado.labelsVisiveis !== undefined) {
        this.labelsVisiveis = estado.labelsVisiveis;
        if (this.labelGroup) {
          this.labelGroup.visible = this.labelsVisiveis;
        }
      }
  
      if (estado.infraestruturaVisivel !== undefined) {
        this.infraestruturaVisivel = estado.infraestruturaVisivel;
        if (this.infraestruturaGroup) {
          this.infraestruturaGroup.visible = this.infraestruturaVisivel;
        }
      }
  
      if (estado.posicoesVaziasVisiveis !== undefined) {
        this.posicoesVaziasVisiveis = estado.posicoesVaziasVisiveis;
        if (this.posicoesVaziasGroup) {
          this.posicoesVaziasGroup.visible = this.posicoesVaziasVisiveis;
        }
      }
  
      this.atualizarBotoesInterface();
    }
  
    // ===== MÉTODOS PÚBLICOS PARA DEBUG =====
    debugCena() {
      this.debug("🔍 Debug da cena executado");
      console.log("Objetos na cena:", this.scene.children.length);
      console.log(
        "Containers renderizados:",
        this.containerGroup.children.length
      );
      console.log("Estado da interface:", this.getEstadoInterface());
    }
  
    debug(message, type = "info") {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
      const formattedMsg = `${timestamp} ${prefix} ${message}`;
      console.log(formattedMsg);
    }
  }