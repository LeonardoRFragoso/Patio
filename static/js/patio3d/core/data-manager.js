/**
 * Gerenciador de Dados do Pátio - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: core/data-manager.js
 */

import { CONFIG } from '../utils/constants.js';

export class DataManager {
  constructor(apiManager, helperUtils = null, toastManager = null) {
    this.apiManager = apiManager;
    this.helperUtils = helperUtils;
    this.toastManager = toastManager;
    this.patioData = null;
    this.lastUpdateTime = null;
    this.updateInterval = null;
    this.autoUpdateEnabled = false;
  }

  // ===== CARREGAMENTO DE DADOS REAIS =====
  async carregarDadosReais() {
    console.log("📡 Carregando dados reais do pátio...");

    try {
      const result = await this.apiManager.obterDadosPatio3D();

      if (!result.success || !result.data?.containers) {
        throw new Error(result.message || "Dados inválidos");
      }

      this.patioData = result.data;
      this.lastUpdateTime = new Date();

      // Log estatísticas básicas
      const containers = this.patioData.containers || [];
      console.log(`✅ ${containers.length} containers carregados`);

      if (containers.length === 0) {
        console.warn("⚠️ Nenhum container encontrado no pátio");
        return {
          success: true,
          data: this.patioData,
          message: "Pátio vazio - nenhum container encontrado"
        };
      }

      // Processar e validar dados
      this.processarDados();

      return {
        success: true,
        data: this.patioData,
        message: `${containers.length} containers carregados com sucesso`
      };

    } catch (error) {
      console.error(`❌ Erro ao carregar dados: ${error.message}`);
      
      if (this.toastManager) {
        this.toastManager.show(`Erro ao carregar dados: ${error.message}`, "error");
      }

      return {
        success: false,
        data: null,
        message: error.message
      };
    }
  }

  // ===== PROCESSAMENTO E VALIDAÇÃO DOS DADOS =====
  processarDados() {
    if (!this.patioData || !this.patioData.containers) return;

    console.log("🔄 Processando dados dos containers...");

    const containers = this.patioData.containers;
    let validContainers = 0;
    let invalidContainers = 0;

    // Processar cada container
    containers.forEach((container, index) => {
      try {
        // Normalizar dados se helper disponível
        if (this.helperUtils) {
          const normalized = this.helperUtils.normalizarDadosContainer(container);
          if (normalized) {
            containers[index] = normalized;
            validContainers++;
          } else {
            console.warn(`⚠️ Container inválido no índice ${index}:`, container);
            invalidContainers++;
          }
        } else {
          validContainers++;
        }

        // Adicionar metadados
        container._processedAt = new Date().toISOString();
        container._index = index;

      } catch (error) {
        console.error(`❌ Erro ao processar container ${index}:`, error);
        invalidContainers++;
      }
    });

    // Filtrar containers válidos
    this.patioData.containers = containers.filter(c => c !== null && c !== undefined);

    console.log(`✅ Processamento concluído: ${validContainers} válidos, ${invalidContainers} inválidos`);

    // Adicionar metadados do processamento
    this.patioData._metadata = {
      processedAt: new Date().toISOString(),
      totalContainers: containers.length,
      validContainers: validContainers,
      invalidContainers: invalidContainers,
      processingErrors: invalidContainers
    };
  }

  // ===== ATUALIZAÇÃO DE ESTATÍSTICAS =====
  atualizarEstatisticas() {
    try {
      if (!this.patioData || !this.patioData.containers) {
        console.warn("⚠️ Não há dados para calcular estatísticas");
        return null;
      }

      const containers = this.patioData.containers;
      console.log("📊 Atualizando estatísticas...");

      // Estatísticas básicas
      const stats = {
        total: containers.length,
        por20TEU: 0,
        por40TEU: 0,
        porStatus: {},
        porRow: {},
        porAltura: {},
        porArmador: {},
        problemas: {
          flutuantes: 0,
          alturaInvalida: 0,
          empilhamentoInvalido: 0
        },
        updatedAt: new Date().toISOString()
      };

      // Processar cada container
      containers.forEach(container => {
        try {
          // Contagem por TEU
          if (this.helperUtils) {
            if (this.helperUtils.isContainer40TEU(container)) {
              stats.por40TEU++;
            } else {
              stats.por20TEU++;
            }
          }

          // Contagem por status
          const status = container.status || 'SEM_STATUS';
          stats.porStatus[status] = (stats.porStatus[status] || 0) + 1;

          // Contagem por row
          const row = container.row || container.linha || 'SEM_ROW';
          stats.porRow[row] = (stats.porRow[row] || 0) + 1;

          // Contagem por altura
          const altura = container.altura || 0;
          stats.porAltura[altura] = (stats.porAltura[altura] || 0) + 1;

          // Contagem por armador
          const armador = container.armador || 'SEM_ARMADOR';
          stats.porArmador[armador] = (stats.porArmador[armador] || 0) + 1;

          // Detecção de problemas
          if (this.helperUtils) {
            if (!this.helperUtils.validarAlturaMaximaPorRow(container)) {
              stats.problemas.alturaInvalida++;
            }

            if (container.altura > 1) {
              const temSuporte = this.helperUtils.verificarSuporteAbaixo(container, containers);
              if (!temSuporte) {
                stats.problemas.flutuantes++;
              }
            }

            if (this.helperUtils.isContainer40TEU(container) && 
                !this.helperUtils.validarEmpilhamento40TEU(container)) {
              stats.problemas.empilhamentoInvalido++;
            }
          }

        } catch (error) {
          console.error("❌ Erro ao processar container para estatísticas:", error);
        }
      });

      // Atualizar interface se elementos existirem
      this.atualizarInterfaceEstatisticas(stats);

      // Salvar estatísticas nos dados do pátio
      this.patioData._statistics = stats;

      console.log("✅ Estatísticas atualizadas:", stats);
      return stats;

    } catch (error) {
      console.error(`❌ Erro ao atualizar estatísticas: ${error.message}`);
      return null;
    }
  }

  // ===== ATUALIZAÇÃO DA INTERFACE COM ESTATÍSTICAS =====
  atualizarInterfaceEstatisticas(stats) {
    try {
      // Atualizar elementos básicos
      this.atualizarElemento("total-containers", stats.total);
      this.atualizarElemento("containers-20teu", stats.por20TEU);
      this.atualizarElemento("containers-40teu", stats.por40TEU);

      // Atualizar status
      Object.entries(stats.porStatus).forEach(([status, count]) => {
        this.atualizarElemento(`status-${status.toLowerCase()}`, count);
      });

      // Atualizar por row
      CONFIG.ROWS.forEach(row => {
        const count = stats.porRow[row] || 0;
        this.atualizarElemento(`row-${row}`, count);
      });

      // Atualizar por altura
      for (let altura = 1; altura <= CONFIG.ALTURAS_MAX; altura++) {
        const count = stats.porAltura[altura] || 0;
        this.atualizarElemento(`altura-${altura}`, count);
      }

      // Atualizar problemas
      this.atualizarElemento("containers-flutuantes", stats.problemas.flutuantes);
      this.atualizarElemento("containers-altura-invalida", stats.problemas.alturaInvalida);
      this.atualizarElemento("containers-empilhamento-invalido", stats.problemas.empilhamentoInvalido);

      // Atualizar timestamp
      this.atualizarElemento("ultima-atualizacao", new Date().toLocaleTimeString("pt-BR"));

    } catch (error) {
      console.error("❌ Erro ao atualizar interface:", error);
    }
  }

  atualizarElemento(elementId, valor) {
    try {
      const elemento = document.getElementById(elementId);
      if (elemento) {
        // Animar mudança se for número
        const valorAtual = parseInt(elemento.textContent) || 0;
        if (typeof valor === 'number' && valorAtual !== valor) {
          this.animarContador(elemento, valorAtual, valor);
        } else {
          elemento.textContent = valor;
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

  // ===== DETECÇÃO DE CONTAINERS PROBLEMÁTICOS =====
  detectarContainersProblematicos() {
    try {
      if (!this.patioData || !this.patioData.containers) {
        console.warn("⚠️ Não há dados para detectar problemas");
        return [];
      }

      console.log("🔍 Detectando containers problemáticos...");

      const problemasDetectados = [];
      const containers = this.patioData.containers;

      containers.forEach((container) => {
        if (!this.helperUtils) return;

        try {
          // Verificar altura máxima por row
          if (!this.helperUtils.validarAlturaMaximaPorRow(container)) {
            problemasDetectados.push({
              container: container,
              problema: "Altura inválida para o row",
              severidade: "alta",
              detalhes: `Row ${container.row} permite máximo ${CONFIG.ALTURAS_MAX_POR_ROW[container.row]} alturas, mas container está na altura ${container.altura}`
            });
          }

          // Verificar empilhamento 40 TEU
          if (this.helperUtils.isContainer40TEU(container) &&
              !this.helperUtils.validarEmpilhamento40TEU(container)) {
            problemasDetectados.push({
              container: container,
              problema: "Empilhamento 40 TEU inválido",
              severidade: "crítica",
              detalhes: "Container 40 TEU não atende às regras de empilhamento"
            });
          }

          // Verificar se há suporte na altura
          if (container.altura > 1) {
            const temSuporte = this.helperUtils.verificarSuporteAbaixo(container, containers);
            if (!temSuporte) {
              problemasDetectados.push({
                container: container,
                problema: "Container flutuante (sem suporte)",
                severidade: "crítica",
                detalhes: `Container na altura ${container.altura} sem suporte na altura ${container.altura - 1}`
              });
            }
          }

          // Verificar containers antigos (mais de 30 dias)
          if (container.data_entrada) {
            const dataEntrada = new Date(container.data_entrada);
            const agora = new Date();
            const diasNoPatio = (agora - dataEntrada) / (1000 * 60 * 60 * 24);
            
            if (diasNoPatio > 30) {
              problemasDetectados.push({
                container: container,
                problema: "Container antigo no pátio",
                severidade: "baixa",
                detalhes: `Container há ${Math.round(diasNoPatio)} dias no pátio`
              });
            }
          }

        } catch (error) {
          console.error(`❌ Erro ao verificar container ${container.numero}:`, error);
        }
      });

      // Ordenar por severidade
      problemasDetectados.sort((a, b) => {
        const severidadeOrder = { crítica: 3, alta: 2, baixa: 1 };
        return severidadeOrder[b.severidade] - severidadeOrder[a.severidade];
      });

      console.log(`⚠️ ${problemasDetectados.length} problema(s) detectado(s)`);

      if (problemasDetectados.length > 0) {
        this.mostrarAlertaProblemas(problemasDetectados);
      } else if (this.toastManager) {
        this.toastManager.show("Nenhum problema detectado no pátio", "success");
      }

      // Salvar nos dados do pátio
      this.patioData._problems = {
        detectedAt: new Date().toISOString(),
        problems: problemasDetectados,
        summary: {
          critical: problemasDetectados.filter(p => p.severidade === "crítica").length,
          high: problemasDetectados.filter(p => p.severidade === "alta").length,
          low: problemasDetectados.filter(p => p.severidade === "baixa").length
        }
      };

      return problemasDetectados;

    } catch (error) {
      console.error(`❌ Erro ao detectar problemas: ${error.message}`);
      return [];
    }
  }

  // ===== MOSTRAR ALERTA DE PROBLEMAS =====
  mostrarAlertaProblemas(problemas) {
    try {
      const alerta = document.getElementById("alerta-flutuantes");
      if (alerta) {
        alerta.classList.remove("d-none");

        const criticos = problemas.filter(p => p.severidade === "crítica").length;
        const altos = problemas.filter(p => p.severidade === "alta").length;
        const baixos = problemas.filter(p => p.severidade === "baixa").length;

        const conteudo = alerta.querySelector("p");
        if (conteudo) {
          conteudo.innerHTML = `
            Foram encontrados <strong>${problemas.length}</strong> problema(s): 
            <strong>${criticos}</strong> crítico(s), 
            <strong>${altos}</strong> de alta severidade, 
            <strong>${baixos}</strong> de baixa severidade. 
            <strong>Verificação ${criticos > 0 ? 'urgente' : 'recomendada'}.</strong>
          `;
        }

        const count = document.getElementById("count-flutuantes");
        if (count) {
          count.textContent = problemas.length;
        }

        // Auto-ocultar alertas de baixa severidade após 10 segundos
        if (criticos === 0 && altos === 0) {
          setTimeout(() => {
            alerta.classList.add("d-none");
          }, 10000);
        }
      }

      // Mostrar toast se disponível
      if (this.toastManager) {
        const criticos = problemas.filter(p => p.severidade === "crítica").length;
        if (criticos > 0) {
          this.toastManager.show(`${criticos} problema(s) crítico(s) detectado(s)!`, "error");
        } else {
          this.toastManager.show(`${problemas.length} problema(s) detectado(s)`, "warning");
        }
      }

    } catch (error) {
      console.error("❌ Erro ao mostrar alerta de problemas:", error);
    }
  }

  // ===== BUSCAR CONTAINER =====
  async buscarContainer(numero) {
    try {
      console.log(`🔍 Buscando container: ${numero}`);

      // Buscar primeiro nos dados locais
      if (this.patioData && this.patioData.containers) {
        const containerLocal = this.patioData.containers.find(
          c => c.numero && c.numero.toLowerCase().includes(numero.toLowerCase())
        );

        if (containerLocal) {
          console.log(`✅ Container encontrado localmente: ${containerLocal.numero}`);
          return {
            success: true,
            data: containerLocal,
            source: "local"
          };
        }
      }

      // Se não encontrou localmente, buscar na API
      const result = await this.apiManager.buscarContainer(numero);

      if (result.success) {
        console.log(`✅ Container encontrado na API: ${numero}`);
      } else {
        console.log(`❌ Container não encontrado: ${numero}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Erro ao buscar container: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ===== AUTO-ATUALIZAÇÃO =====
  enableAutoUpdate(intervalMinutes = 5) {
    this.disableAutoUpdate(); // Limpar interval anterior se existir

    this.autoUpdateEnabled = true;
    this.updateInterval = setInterval(async () => {
      console.log("🔄 Auto-atualização executando...");
      
      try {
        await this.carregarDadosReais();
        this.atualizarEstatisticas();
        
        if (this.toastManager) {
          this.toastManager.show("Dados atualizados automaticamente", "info");
        }
      } catch (error) {
        console.error("❌ Erro na auto-atualização:", error);
        
        if (this.toastManager) {
          this.toastManager.show("Erro na auto-atualização", "error");
        }
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Auto-atualização habilitada (${intervalMinutes} minutos)`);
  }

  disableAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.autoUpdateEnabled = false;
      console.log("⏹️ Auto-atualização desabilitada");
    }
  }

  // ===== EXPORT DE DADOS =====
  exportarDados(formato = "json") {
    try {
      if (!this.patioData) {
        throw new Error("Nenhum dado disponível para exportar");
      }

      let dadosExport = {
        exportedAt: new Date().toISOString(),
        ...this.patioData
      };

      let content, filename, mimeType;

      switch (formato.toLowerCase()) {
        case "json":
          content = JSON.stringify(dadosExport, null, 2);
          filename = `patio-dados-${new Date().toISOString().slice(0, 10)}.json`;
          mimeType = "application/json";
          break;

        case "csv":
          content = this.convertToCSV(dadosExport.containers);
          filename = `patio-containers-${new Date().toISOString().slice(0, 10)}.csv`;
          mimeType = "text/csv";
          break;

        default:
          throw new Error(`Formato não suportado: ${formato}`);
      }

      // Criar e baixar arquivo
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      console.log(`✅ Dados exportados: ${filename}`);
      
      if (this.toastManager) {
        this.toastManager.show(`Dados exportados: ${filename}`, "success");
      }

      return true;

    } catch (error) {
      console.error(`❌ Erro ao exportar dados: ${error.message}`);
      
      if (this.toastManager) {
        this.toastManager.show(`Erro ao exportar: ${error.message}`, "error");
      }
      
      return false;
    }
  }

  convertToCSV(containers) {
    if (!containers || containers.length === 0) {
      return "Nenhum container disponível";
    }

    // Cabeçalhos
    const headers = ["numero", "row", "bay", "altura", "armador", "status", "tamanho_teu", "data_entrada"];
    let csv = headers.join(",") + "\n";

    // Dados
    containers.forEach(container => {
      const row = headers.map(header => {
        const value = container[header] || "";
        return typeof value === "string" && value.includes(",") ? `"${value}"` : value;
      });
      csv += row.join(",") + "\n";
    });

    return csv;
  }

  // ===== INFORMAÇÕES DE DEBUG =====
  getDataInfo() {
    return {
      hasData: !!this.patioData,
      containerCount: this.patioData?.containers?.length || 0,
      lastUpdate: this.lastUpdateTime?.toISOString(),
      autoUpdateEnabled: this.autoUpdateEnabled,
      hasStatistics: !!this.patioData?._statistics,
      hasProblems: !!this.patioData?._problems,
      metadata: this.patioData?._metadata
    };
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log("🧹 Limpando gerenciador de dados...");
    
    this.disableAutoUpdate();
    this.patioData = null;
    this.lastUpdateTime = null;
    
    console.log("✅ Gerenciador de dados limpo");
  }
}