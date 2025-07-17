/**
 * Funções Auxiliares do Sistema 3D - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: utils/helpers.js
 */

import { CONFIG, CORES, CORES_ARMADORES } from './constants.js';

export class HelperUtils {
  constructor() {
    this.debugConsole = null;
  }

  // ===== MÉTODOS DE NORMALIZAÇÃO DE DADOS =====
  normalizarDadosContainer(container) {
    try {
      const containerNormalizado = { ...container };

      let rowFinal, bayFinal, alturaFinal;

      bayFinal = parseInt(container.baia);
      rowFinal = String(container.linha).toUpperCase();
      alturaFinal = parseInt(container.altura);

      if (!CONFIG.ROWS.includes(rowFinal)) {
        console.error(`❌ Row inválida: ${rowFinal}`);
        return null;
      }

      if (isNaN(bayFinal) || bayFinal < 1 || bayFinal > CONFIG.BAIAS_MAX) {
        console.error(`❌ Bay inválida: ${bayFinal}`);
        return null;
      }

      if (
        isNaN(alturaFinal) ||
        alturaFinal < 1 ||
        alturaFinal > CONFIG.ALTURAS_MAX
      ) {
        console.error(`❌ Altura inválida: ${container.altura}`);
        return null;
      }

      containerNormalizado.row = rowFinal;
      containerNormalizado.bay = bayFinal;
      containerNormalizado.altura = alturaFinal;
      containerNormalizado.baia = bayFinal;
      containerNormalizado.linha = rowFinal;

      if (containerNormalizado.tamanho_teu) {
        containerNormalizado.tamanho_teu = parseInt(
          containerNormalizado.tamanho_teu
        );
      } else if (containerNormalizado.tamanho) {
        containerNormalizado.tamanho_teu = parseInt(
          containerNormalizado.tamanho
        );
      } else {
        containerNormalizado.tamanho_teu = 20;
      }

      return containerNormalizado;
    } catch (error) {
      console.error(`❌ Erro ao normalizar dados: ${error.message}`);
      return null;
    }
  }

  // ===== CÁLCULOS DE POSIÇÃO 3D =====
  calcularPosicao3D(row, bay, altura) {
    try {
      const rowIndex = CONFIG.ROWS.indexOf(String(row).toUpperCase());
      if (rowIndex === -1) return null;

      const bayNumber = parseInt(bay);
      if (
        isNaN(bayNumber) ||
        bayNumber < 1 ||
        bayNumber > CONFIG.BAIAS_MAX
      )
        return null;

      const alturaNumber = parseInt(altura);
      if (
        isNaN(alturaNumber) ||
        alturaNumber < 1 ||
        alturaNumber > CONFIG.ALTURAS_MAX
      )
        return null;

      const x = (bayNumber - 10.5) * CONFIG.ESPACAMENTO_BAIA;
      const z = (rowIndex - 2) * CONFIG.ESPACAMENTO_ROW;
      const y =
        (alturaNumber - 1) * CONFIG.ALTURA_CONTAINER +
        CONFIG.ALTURA_CONTAINER / 2;

      return new THREE.Vector3(x, y, z);
    } catch (error) {
      console.error(`Erro ao calcular posição 3D: ${error.message}`);
      return null;
    }
  }

  // ===== VALIDAÇÕES DE CONTAINERS =====
  isContainer40TEU(container) {
    try {
      const tamanhoTeu = container?.tamanho_teu || container?.tamanho;
      return tamanhoTeu && parseInt(tamanhoTeu) === 40;
    } catch (error) {
      return false;
    }
  }

  validarEmpilhamento40TEU(container) {
    return true; // Simplificado para o exemplo
  }

  validarAlturaMaximaPorRow(container) {
    try {
      const row = container.row || container.linha;
      const altura = container.altura;
      const alturaMaxima =
        CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
      return altura <= alturaMaxima;
    } catch (error) {
      return true;
    }
  }

  verificarSuporteAbaixo(container, containers) {
    try {
      const alturaAbaixo = container.altura - 1;

      if (alturaAbaixo < 1) return true; // Nível térreo sempre tem suporte

      // Procurar container na posição abaixo
      const suporte = containers.find((c) => {
        const normalized = this.normalizarDadosContainer(c);
        if (!normalized) return false;

        return (
          normalized.row === container.row &&
          normalized.bay === container.bay &&
          normalized.altura === alturaAbaixo
        );
      });

      return !!suporte;
    } catch (error) {
      return false;
    }
  }

  obterStatusContainer(container) {
    if (!this.validarAlturaMaximaPorRow(container)) {
      return "Altura inválida";
    }

    if (
      this.isContainer40TEU(container) &&
      !this.validarEmpilhamento40TEU(container)
    ) {
      return "Empilhamento inválido";
    }

    if (container.status) {
      return container.status;
    }

    return "Normal";
  }

  // ===== CORES E MATERIAIS =====
  obterCorArmador(armador) {
    const armadorUpper = armador?.toUpperCase() || '';
    return CORES_ARMADORES[armadorUpper] || CORES_ARMADORES.DEFAULT;
  }

  obterCorStatus(status) {
    switch (status?.toUpperCase()) {
      case 'VISTORIADO':
        return CORES.VISTORIADA;
      case 'FLUTUANTE':
        return CORES.FLUTUANTE;
      case 'URGENTE':
        return CORES.URGENTE;
      default:
        return CORES.OCUPADA;
    }
  }

  // ===== UTILITÁRIOS DE INTERFACE =====
  limparGrupo(grupo) {
    try {
      if (grupo && Array.isArray(grupo.children)) {
        while (grupo.children.length > 0) {
          grupo.remove(grupo.children[0]);
        }
      }
    } catch (error) {
      console.error(`Erro ao limpar grupo: ${error.message}`);
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

  // ===== EXPORTAÇÃO DE IMAGEM =====
  exportarImagem(renderer, formato = "png", qualidade = 1.0) {
    try {
      const canvas = renderer.domElement;
      const dataURL = canvas.toDataURL(`image/${formato}`, qualidade);

      // Criar link de download
      const link = document.createElement("a");
      link.download = `patio-3d-${new Date()
        .toISOString()
        .slice(0, 10)}.${formato}`;
      link.href = dataURL;
      link.click();

      console.log(`✅ Imagem exportada: ${formato.toUpperCase()}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao exportar imagem: ${error.message}`);
      return false;
    }
  }

  // ===== TELA CHEIA =====
  toggleTelaCheia() {
    try {
      const container = document.getElementById("three-container");

      if (!document.fullscreenElement) {
        container.requestFullscreen().then(() => {
          // Disparar evento de redimensionamento
          window.dispatchEvent(new Event('resize'));
          console.log("🖥️ Modo tela cheia ativado");
          return true;
        });
      } else {
        document.exitFullscreen().then(() => {
          window.dispatchEvent(new Event('resize'));
          console.log("🖥️ Modo tela cheia desativado");
          return false;
        });
      }
    } catch (error) {
      console.error(`❌ Erro no modo tela cheia: ${error.message}`);
      return false;
    }
  }

  // ===== ANIMAÇÃO DE NÚMEROS =====
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

  // ===== PARTÍCULAS DE DESTAQUE =====
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

  // ===== DEBUGGING =====
  debug(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
    const formattedMsg = `${timestamp} ${prefix} ${message}`;

    console.log(formattedMsg);

    try {
      if (!this.debugConsole) {
        this.debugConsole = document.getElementById("console-output");
      }

      if (this.debugConsole) {
        const logEntry = document.createElement("div");
        logEntry.style.color =
          type === "error"
            ? "#ff4444"
            : type === "warn"
            ? "#ffaa33"
            : "#44ff44";
        logEntry.textContent = formattedMsg;
        this.debugConsole.appendChild(logEntry);
        this.debugConsole.scrollTop = this.debugConsole.scrollHeight;
      }
    } catch (error) {
      console.warn("Erro ao atualizar debug console:", error);
    }
  }

  debugCena(scene, containerGroup, performanceStats) {
    console.log("🔍 Debug da cena executado");
    console.log("Objetos na cena:", scene.children.length);
    console.log("Containers renderizados:", containerGroup.children.length);
    console.log("Performance atual:", performanceStats);
    
    // Listar objetos na cena
    scene.children.forEach((child, index) => {
      console.log(`  ${index}: ${child.name || child.type} - ${child.children.length} filhos`);
    });
  }

  // ===== FORMATAÇÃO DE DADOS =====
  formatarNumero(numero, decimais = 0) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimais,
      maximumFractionDigits: decimais
    }).format(numero);
  }

  formatarData(data) {
    if (!data) return 'N/A';
    
    try {
      const dataObj = new Date(data);
      return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
      return data;
    }
  }

  formatarTempo(timestamp) {
    const agora = new Date();
    const dataEvento = new Date(timestamp);
    const diferenca = agora - dataEvento;
    
    const minutos = Math.floor(diferenca / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (dias > 0) return `${dias} dia(s) atrás`;
    if (horas > 0) return `${horas} hora(s) atrás`;
    if (minutos > 0) return `${minutos} minuto(s) atrás`;
    return 'Agora';
  }

  // ===== UTILITÁRIOS DE POSIÇÃO =====
  calcularDistancia3D(pos1, pos2) {
    return pos1.distanceTo(pos2);
  }

  posicaoParaString(row, bay, altura) {
    return `${row}${String(bay).padStart(2, "0")}-${altura}`;
  }

  stringParaPosicao(posStr) {
    const match = posStr.match(/([A-E])(\d{2})-(\d+)/);
    if (match) {
      return {
        row: match[1],
        bay: parseInt(match[2]),
        altura: parseInt(match[3])
      };
    }
    return null;
  }

  // ===== RESET COMPLETO =====
  resetCompleto(manager) {
    try {
      console.log("🔄 Executando reset completo do sistema...");

      // Limpar seleções
      if (manager.desselecionarContainer) {
        manager.desselecionarContainer();
      }

      // Resetar filtros
      document.querySelectorAll("select, input").forEach((element) => {
        if (element.type !== "button") {
          element.value = "";
        }
      });

      // Resetar visibilidade dos grupos
      if (manager.infraestruturaGroup) manager.infraestruturaGroup.visible = true;
      if (manager.labelGroup) manager.labelGroup.visible = true;
      if (manager.posicoesVaziasGroup) manager.posicoesVaziasGroup.visible = true;

      console.log("✅ Reset completo executado");
      return true;
    } catch (error) {
      console.error(`❌ Erro no reset: ${error.message}`);
      return false;
    }
  }
}