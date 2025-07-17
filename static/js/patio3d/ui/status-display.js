/**
 * Sistema de Exibição de Status
 * Gerencia indicadores de status e progresso na interface
 */

export class StatusDisplay {
    constructor() {
      this.debug = this.debug.bind(this);
    }
  
    // ===== ATUALIZAÇÃO DE STATUS =====
    atualizarStatusSistema(tipo, status, texto) {
      const elemento = document.getElementById(`${tipo}-status`);
      if (elemento) {
        elemento.className = `status-badge ${status}`;
        elemento.textContent = texto;
      }
    }
  
    atualizarIndicadorSistema(status, texto) {
      const indicador = document.getElementById("system-status-indicator");
      if (indicador) {
        indicador.className = `status-indicator ${status}`;
        indicador.innerHTML = `<span class="status-dot"></span>${texto}`;
      }
    }
  
    atualizarProgresso(porcentagem, mensagem) {
      const progressBar = document.getElementById("progress-bar");
      const loadingMessage = document.getElementById("loading-message");
  
      if (progressBar) {
        progressBar.style.width = `${porcentagem}%`;
      }
  
      if (loadingMessage) {
        loadingMessage.textContent = mensagem;
      }
    }
  
    // ===== ATUALIZAR ESTATÍSTICAS =====
    atualizarEstatisticas(patioData) {
      try {
        if (!patioData) return;
  
        const containers = patioData.containers || [];
        this.atualizarEstatistica("total-containers", containers.length);
  
        const containers20 = containers.filter(
          (c) => !this.isContainer40TEU(c)
        ).length;
        const containers40 = containers.filter((c) =>
          this.isContainer40TEU(c)
        ).length;
  
        this.atualizarEstatistica("containers-20teu", containers20);
        this.atualizarEstatistica("containers-40teu", containers40);
  
        const vistoriados = containers.filter(
          (c) => c.status === "VISTORIADO"
        ).length;
        this.atualizarEstatistica("containers-vistoriados", vistoriados);
  
        // Estatísticas por row (assumindo CONFIG.ROWS disponível)
        const ROWS = ["A", "B", "C", "D", "E"];
        ROWS.forEach((row) => {
          const count = containers.filter(
            (c) => (c.row || c.linha) === row
          ).length;
          this.atualizarEstatistica(`row-${row}`, count);
        });
  
        // Estatísticas por altura
        for (let altura = 1; altura <= 5; altura++) {
          const count = containers.filter(
            (c) => parseInt(c.altura) === altura
          ).length;
          this.atualizarEstatistica(`altura-${altura}`, count);
        }
      } catch (error) {
        this.debug(`Erro ao atualizar estatísticas: ${error.message}`, "error");
      }
    }
  
    atualizarEstatistica(elementId, valor) {
      try {
        const elemento = document.getElementById(elementId);
        if (elemento) {
          // Animação no número
          const valorAtual = parseInt(elemento.textContent) || 0;
          if (valorAtual !== valor) {
            this.animarContador(elemento, valorAtual, valor);
          }
        }
      } catch (error) {
        // Erro silencioso
      }
    }
  
    animarContador(elemento, inicio, fim, duracao = 1000) {
      const startTime = Date.now();
  
      const animar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duracao, 1);
  
        const valorAtual = Math.round(inicio + (fim - inicio) * progress);
        elemento.textContent = valorAtual;
  
        if (progress < 1) {
          requestAnimationFrame(animar);
        }
      };
  
      animar();
    }
  
    atualizarUltimaAtualizacao() {
      try {
        const elemento = document.getElementById("ultima-atualizacao");
        if (elemento) {
          elemento.textContent = new Date().toLocaleTimeString("pt-BR");
        }
      } catch (error) {
        // Erro silencioso
      }
    }
  
    // ===== ALERTAS E NOTIFICAÇÕES =====
    mostrarAlertaProblemas(problemas) {
      const alerta = document.getElementById("alerta-flutuantes");
      if (alerta) {
        alerta.classList.remove("d-none");
  
        const criticos = problemas.filter(
          (p) => p.severidade === "crítica"
        ).length;
        const altos = problemas.filter((p) => p.severidade === "alta").length;
  
        const conteudo = alerta.querySelector("p");
        if (conteudo) {
          conteudo.innerHTML = `Foram encontrados <strong>${problemas.length}</strong> problema(s): <strong>${criticos}</strong> crítico(s), <strong>${altos}</strong> de alta severidade. <strong>Verificação urgente necessária.</strong>`;
        }
  
        const count = document.getElementById("count-flutuantes");
        if (count) {
          count.textContent = problemas.length;
        }
      }
    }
  
    mostrarMensagemSemDados() {
      const container = document.getElementById("three-container");
      if (container) {
        container.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 20px;">
            <div>
              <i class="fas fa-database" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.7;"></i>
              <h3>Nenhum Container no Pátio</h3>
              <p>Não há containers registrados na base de dados.</p>
              <button class="btn btn-light" onclick="location.reload()">
                <i class="fas fa-sync-alt me-2"></i>Atualizar
              </button>
            </div>
          </div>
        `;
      }
    }
  
    mostrarErroCarregamento(mensagem) {
      const container = document.getElementById("three-container");
      if (container) {
        container.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: #f8d7da; color: #721c24; text-align: center; padding: 20px;">
            <div>
              <h3><i class="fas fa-exclamation-triangle"></i> Erro ao Carregar</h3>
              <p>${mensagem}</p>
              <button class="btn btn-danger" onclick="location.reload()">
                <i class="fas fa-sync-alt me-2"></i>Tentar Novamente
              </button>
            </div>
          </div>
        `;
      }
    }
  
    ocultarLoadingComFade() {
      const overlay = document.getElementById("loading-overlay");
      if (overlay) {
        overlay.style.transition = "opacity 1s ease-out";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.classList.add("hidden");
        }, 1000);
      }
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
  
    debug(message, type = "info") {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
      const formattedMsg = `${timestamp} ${prefix} ${message}`;
  
      console.log(formattedMsg);
  
      try {
        const debugConsole = document.getElementById("console-output");
        if (debugConsole) {
          const logEntry = document.createElement("div");
          logEntry.style.color =
            type === "error"
              ? "#ff4444"
              : type === "warn"
              ? "#ffaa33"
              : "#44ff44";
          logEntry.textContent = formattedMsg;
          debugConsole.appendChild(logEntry);
          debugConsole.scrollTop = debugConsole.scrollHeight;
        }
      } catch (error) {
        console.warn("Erro ao atualizar debug console:", error);
      }
    }
  }