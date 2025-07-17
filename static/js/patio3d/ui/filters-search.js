/**
 * Sistema de Filtros e Busca
 * Gerencia filtros de visualização e busca de containers
 */

export class FiltersSearch {
    constructor(containerGroup, patioData, CONFIG) {
      this.containerGroup = containerGroup;
      this.patioData = patioData;
      this.CONFIG = CONFIG;
      this.debug = this.debug.bind(this);
      this.setupEventListeners();
    }
  
    // ===== CONFIGURAÇÃO DE EVENT LISTENERS =====
    setupEventListeners() {
      // Filtros
      this.configurarFiltro("filtro-row", (value) => this.filtrarPorRow(value));
      this.configurarFiltro("filtro-altura", (value) =>
        this.filtrarPorAltura(value)
      );
  
      // Busca de container
      this.configurarBusca();
    }
  
    configurarFiltro(id, acao) {
      const filtro = document.getElementById(id);
      if (filtro) {
        filtro.addEventListener("change", (e) => {
          acao(e.target.value);
          this.aplicarFiltros();
        });
      }
    }
  
    configurarBusca() {
      const input = document.getElementById("busca-container-input");
      if (input) {
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            const termo = e.target.value.trim();
            if (termo) {
              this.buscarContainer(termo);
            }
          }
        });
  
        // Adicionar botão de busca se existir
        const btnBusca = document.getElementById("btn-buscar-container");
        if (btnBusca) {
          btnBusca.addEventListener("click", () => {
            const termo = input.value.trim();
            if (termo) {
              this.buscarContainer(termo);
            }
          });
        }
      }
    }
  
    // ===== FILTROS =====
    filtrarPorRow(row) {
      try {
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container) {
            const containerRow =
              child.userData.container.row || child.userData.container.linha;
  
            if (!row || containerRow === row) {
              child.visible = true;
              child.material.transparent = false;
              child.material.opacity = 1.0;
            } else {
              child.material.transparent = true;
              child.material.opacity = 0.2;
            }
          }
        });
  
        this.debug(`Filtro Row aplicado: ${row || "Todos"}`);
      } catch (error) {
        this.debug(`Erro ao filtrar por row: ${error.message}`, "error");
      }
    }
  
    filtrarPorAltura(altura) {
      try {
        const alturaNum = altura ? parseInt(altura) : null;
  
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container) {
            const containerAltura = parseInt(child.userData.container.altura);
  
            if (!alturaNum || containerAltura === alturaNum) {
              child.visible = true;
              child.material.transparent = false;
              child.material.opacity = 1.0;
            } else {
              child.material.transparent = true;
              child.material.opacity = 0.2;
            }
          }
        });
  
        this.debug(`Filtro Altura aplicado: ${altura || "Todas"}`);
      } catch (error) {
        this.debug(`Erro ao filtrar por altura: ${error.message}`, "error");
      }
    }
  
    filtrarPorArmador(armador) {
      try {
        this.containerGroup.children.forEach((child) => {
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
  
        this.debug(`Filtro Armador aplicado: ${armador || "Todos"}`);
      } catch (error) {
        this.debug(`Erro ao filtrar por armador: ${error.message}`, "error");
      }
    }
  
    filtrarPorStatus(status) {
      try {
        this.containerGroup.children.forEach((child) => {
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
  
        this.debug(`Filtro Status aplicado: ${status || "Todos"}`);
      } catch (error) {
        this.debug(`Erro ao filtrar por status: ${error.message}`, "error");
      }
    }
  
    filtrarPorTamanho(tamanho) {
      try {
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container) {
            const eh40TEU = this.isContainer40TEU(child.userData.container);
            const containerTamanho = eh40TEU ? "40" : "20";
  
            if (!tamanho || containerTamanho === tamanho) {
              child.visible = true;
              child.material.transparent = false;
              child.material.opacity = 1.0;
            } else {
              child.material.transparent = true;
              child.material.opacity = 0.2;
            }
          }
        });
  
        this.debug(`Filtro Tamanho aplicado: ${tamanho || "Todos"} TEU`);
      } catch (error) {
        this.debug(`Erro ao filtrar por tamanho: ${error.message}`, "error");
      }
    }
  
    aplicarFiltros() {
      try {
        // Resetar opacidade de todos os containers
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container) {
            child.visible = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }
        });
  
        // Aplicar filtros ativos
        const filtroRow = document.getElementById("filtro-row")?.value;
        const filtroAltura = document.getElementById("filtro-altura")?.value;
        const filtroArmador = document.getElementById("filtro-armador")?.value;
        const filtroStatus = document.getElementById("filtro-status")?.value;
        const filtroTamanho = document.getElementById("filtro-tamanho")?.value;
  
        if (filtroRow) this.filtrarPorRow(filtroRow);
        if (filtroAltura) this.filtrarPorAltura(filtroAltura);
        if (filtroArmador) this.filtrarPorArmador(filtroArmador);
        if (filtroStatus) this.filtrarPorStatus(filtroStatus);
        if (filtroTamanho) this.filtrarPorTamanho(filtroTamanho);
  
        this.debug("Filtros aplicados");
      } catch (error) {
        this.debug(`Erro ao aplicar filtros: ${error.message}`, "error");
      }
    }
  
    limparFiltros() {
      try {
        // Limpar valores dos filtros
        document.querySelectorAll("[id^='filtro-']").forEach((filtro) => {
          filtro.value = "";
        });
  
        // Resetar visualização
        this.aplicarFiltros();
  
        this.debug("Filtros limpos");
        
        // Emitir evento para toast
        document.dispatchEvent(new CustomEvent('showToast', {
          detail: { 
            message: "Filtros limpos",
            type: "info"
          }
        }));
      } catch (error) {
        this.debug(`Erro ao limpar filtros: ${error.message}`, "error");
      }
    }
  
    // ===== BUSCAR CONTAINER =====
    buscarContainer(termo) {
      try {
        if (!termo || !this.patioData) {
          this.debug("Termo de busca inválido", "warn");
          return;
        }
  
        const containers = this.patioData.containers || [];
        const containerEncontrado = containers.find(
          (container) =>
            container.numero &&
            container.numero.toLowerCase().includes(termo.toLowerCase())
        );
  
        if (containerEncontrado) {
          // Emitir eventos para centralizar e destacar
          document.dispatchEvent(new CustomEvent('centralizarContainer', {
            detail: { numeroContainer: containerEncontrado.numero }
          }));
          
          document.dispatchEvent(new CustomEvent('destacarContainer', {
            detail: { numeroContainer: containerEncontrado.numero }
          }));
  
          this.debug(
            `Container encontrado: ${containerEncontrado.numero}`,
            "success"
          );
          
          document.dispatchEvent(new CustomEvent('showToast', {
            detail: { 
              message: `Container ${containerEncontrado.numero} encontrado`,
              type: "success"
            }
          }));
        } else {
          this.debug(`Container não encontrado: ${termo}`, "warn");
          
          document.dispatchEvent(new CustomEvent('showToast', {
            detail: { 
              message: `Container "${termo}" não encontrado`,
              type: "warning"
            }
          }));
        }
      } catch (error) {
        this.debug(`Erro na busca: ${error.message}`, "error");
      }
    }
  
    buscarPorCriterios(criterios) {
      try {
        const resultados = [];
  
        if (!this.patioData || !this.patioData.containers) {
          return resultados;
        }
  
        this.patioData.containers.forEach((container) => {
          let atendeCriterios = true;
  
          // Verificar cada critério
          if (criterios.numero && !container.numero?.toLowerCase().includes(criterios.numero.toLowerCase())) {
            atendeCriterios = false;
          }
  
          if (criterios.armador && container.armador !== criterios.armador) {
            atendeCriterios = false;
          }
  
          if (criterios.row && (container.row || container.linha) !== criterios.row) {
            atendeCriterios = false;
          }
  
          if (criterios.altura && parseInt(container.altura) !== parseInt(criterios.altura)) {
            atendeCriterios = false;
          }
  
          if (criterios.status && container.status !== criterios.status) {
            atendeCriterios = false;
          }
  
          if (criterios.tamanho) {
            const eh40TEU = this.isContainer40TEU(container);
            const tamanhoContainer = eh40TEU ? "40" : "20";
            if (tamanhoContainer !== criterios.tamanho) {
              atendeCriterios = false;
            }
          }
  
          if (atendeCriterios) {
            resultados.push(container);
          }
        });
  
        this.debug(`Busca por critérios retornou ${resultados.length} resultados`);
        return resultados;
      } catch (error) {
        this.debug(`Erro na busca por critérios: ${error.message}`, "error");
        return [];
      }
    }
  
    // ===== BUSCA AVANÇADA =====
    buscarAvancada(termo, filtros = {}) {
      try {
        const resultados = this.buscarPorCriterios({
          numero: termo,
          ...filtros
        });
  
        if (resultados.length > 0) {
          this.destacarResultados(resultados);
          
          document.dispatchEvent(new CustomEvent('showToast', {
            detail: { 
              message: `${resultados.length} container(s) encontrado(s)`,
              type: "success"
            }
          }));
        } else {
          document.dispatchEvent(new CustomEvent('showToast', {
            detail: { 
              message: "Nenhum container encontrado com os critérios especificados",
              type: "warning"
            }
          }));
        }
  
        return resultados;
      } catch (error) {
        this.debug(`Erro na busca avançada: ${error.message}`, "error");
        return [];
      }
    }
  
    destacarResultados(containers) {
      try {
        // Resetar destaque anterior
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }
        });
  
        // Destacar containers encontrados
        const numerosEncontrados = containers.map(c => c.numero);
        
        this.containerGroup.children.forEach((child) => {
          if (child.userData?.container) {
            if (numerosEncontrados.includes(child.userData.container.numero)) {
              // Destacar com efeito especial
              child.material.emissive = new THREE.Color(0.2, 0.8, 0.2);
              child.material.emissiveIntensity = 0.3;
            } else {
              // Diminuir opacidade dos outros
              child.material.transparent = true;
              child.material.opacity = 0.3;
            }
          }
        });
  
        this.debug(`${containers.length} containers destacados`);
      } catch (error) {
        this.debug(`Erro ao destacar resultados: ${error.message}`, "error");
      }
    }
  
    // ===== EXPORTAR RESULTADOS =====
    exportarResultados(containers, formato = "json") {
      try {
        let dados, filename, mimeType;
  
        switch (formato.toLowerCase()) {
          case "csv":
            dados = this.converterParaCSV(containers);
            filename = "containers_busca.csv";
            mimeType = "text/csv";
            break;
          case "json":
          default:
            dados = JSON.stringify(containers, null, 2);
            filename = "containers_busca.json";
            mimeType = "application/json";
            break;
        }
  
        const blob = new Blob([dados], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
  
        this.debug(`Resultados exportados: ${filename}`, "success");
        
        document.dispatchEvent(new CustomEvent('showToast', {
          detail: { 
            message: `Resultados exportados: ${filename}`,
            type: "success"
          }
        }));
      } catch (error) {
        this.debug(`Erro ao exportar resultados: ${error.message}`, "error");
      }
    }
  
    converterParaCSV(containers) {
      if (!containers.length) return "";
  
      const headers = ["numero", "armador", "row", "bay", "altura", "status", "tamanho_teu"];
      const csvContent = [
        headers.join(","),
        ...containers.map(container => 
          headers.map(header => 
            container[header] || (header === "row" ? container.linha : "")
          ).join(",")
        )
      ].join("\n");
  
      return csvContent;
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
    }
  }