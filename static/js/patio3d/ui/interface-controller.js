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
  
      // Botões de vista
      this.configurarBotaoVista("btn-vista-geral", () =>
        this.emitirEvento('posicionarCameraCompleta')
      );
      this.configurarBotaoVista("btn-vista-topo", () =>
        this.emitirEvento('posicionarCameraTopo')
      );
      this.configurarBotaoVista("btn-vista-lateral", () =>
        this.emitirEvento('posicionarCameraLateral')
      );
      this.configurarBotaoVista("btn-vista-containers", () =>
        this.emitirEvento('focarContainers')
      );
  
      // Botões de ação
      this.configurarBotao("btn-refresh", () => this.emitirEvento('recarregarDados'));
      this.configurarBotao("btn-refresh-data", () => this.emitirEvento('recarregarDados'));
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
  
      // 🔧 CORREÇÃO: Definir vista lateral como ativa na interface
      this.definirVistaPadraoLateral();
  
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
          container.requestFullscreen().then(() => {
            this.aoRedimensionar();
            this.debug("Modo tela cheia ativado");
            this.emitirEvento('showToast', {
              message: "Modo tela cheia ativado",
              type: "info"
            });
          });
        } else {
          document.exitFullscreen().then(() => {
            this.aoRedimensionar();
            this.debug("Modo tela cheia desativado");
          });
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