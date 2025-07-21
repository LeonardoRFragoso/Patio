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
      console.log(`🔄 Atualizando status: ${tipo} -> ${status} (${texto})`);
      const elemento = document.getElementById(`${tipo}-status`);
      if (elemento) {
        // Remover classes anteriores e adicionar nova
        elemento.className = `status-badge ${status}`;
        elemento.textContent = texto;
        console.log(`✅ Status ${tipo} atualizado com sucesso`);
      } else {
        console.error(`❌ Elemento ${tipo}-status não encontrado no DOM`);
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
  
    // ===== MÉTODO DIRETO PARA FORÇAR ATUALIZAÇÃO =====
    forcarAtualizacaoEstatisticas(containers) {
      console.log('🚀 [StatusDisplay] FORÇANDO atualização direta das estatísticas');
      
      if (!containers || !Array.isArray(containers)) {
        console.error('❌ [StatusDisplay] Dados inválidos para forçar atualização:', containers);
        return;
      }
      
      // Calcular estatísticas diretamente
      const total = containers.length;
      let vistoriados = 0;
      let containers20ft = 0;
      let containers40ft = 0;
      let flutuantes = 0;
      
      // Contadores por row e altura
      const rowCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      const alturaCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      // Contadores por armador
      const armadorCounts = {
        'EVERGREEN': 0,
        'MAERSK': 0,
        'MSC': 0,
        'COSCO': 0,
        'CMA CGM': 0,
        'HAPAG-LLOYD': 0,
        'ONE': 0,
        'YANG MING': 0,
        'HMM': 0,
        'PIL': 0,
        'ZIM': 0,
        'OUTROS': 0
      };
      
      // Mapeamento para variações de nomes de armadores
      const armadorMapping = {
        'EVERGREEN': ['EVERGREEN', 'EVERGREEN MARINE', 'EMC'],
        'MAERSK': ['MAERSK', 'MAERSK LINE', 'MSK'],
        'MSC': ['MSC', 'MEDITERRANEAN SHIPPING COMPANY'],
        'COSCO': ['COSCO', 'COSCO SHIPPING', 'CHINA COSCO'],
        'CMA CGM': ['CMA CGM', 'CMA', 'CGM'],
        'HAPAG-LLOYD': ['HAPAG-LLOYD', 'HAPAG LLOYD', 'HAPAG'],
        'ONE': ['ONE', 'OCEAN NETWORK EXPRESS'],
        'YANG MING': ['YANG MING', 'YML'],
        'HMM': ['HMM', 'HYUNDAI MERCHANT MARINE'],
        'PIL': ['PIL', 'PACIFIC INTERNATIONAL LINES'],
        'ZIM': ['ZIM', 'ZIM LINES']
      };
      
      // Função para mapear armador
      const mapearArmador = (armadorOriginal) => {
        if (!armadorOriginal || armadorOriginal === 'N/A') return null;
        
        const armadorUpper = armadorOriginal.toUpperCase().trim();
        
        // Verificar mapeamento direto
        for (const [armadorPadrao, variacoes] of Object.entries(armadorMapping)) {
          if (variacoes.some(variacao => armadorUpper.includes(variacao))) {
            return armadorPadrao;
          }
        }
        
        return 'OUTROS';
      };
      
      containers.forEach(container => {
        // Status vistoriado
        if (container.status && container.status.toLowerCase() === 'vistoriado') {
          vistoriados++;
        }
        
        // Tamanho dos containers
        const tamanho = container.tamanho_teu || container.tamanho || 0;
        if (tamanho == 20) {
          containers20ft++;
        } else if (tamanho == 40) {
          containers40ft++;
        }
        
        // Containers flutuantes
        if (container.flutuante || container.status === 'flutuante') {
          flutuantes++;
        }
        
        // Contagem por row
        const row = container.row || container.linha;
        if (row && rowCounts.hasOwnProperty(row)) {
          rowCounts[row]++;
        }
        
        // Contagem por altura
        const altura = parseInt(container.altura) || 1;
        if (altura >= 1 && altura <= 5) {
          alturaCounts[altura]++;
        }
        
        // Contagem por armador
        const armadorOriginal = container.armador;
        const armadorMapeado = mapearArmador(armadorOriginal);
        
        if (armadorMapeado && armadorCounts.hasOwnProperty(armadorMapeado)) {
          armadorCounts[armadorMapeado]++;
        } else if (armadorMapeado === 'OUTROS') {
          armadorCounts['OUTROS']++;
        }
      });
      
      console.log('📊 [StatusDisplay] Estatísticas calculadas:', {
        total, vistoriados, containers20ft, containers40ft, flutuantes, rowCounts, alturaCounts, armadorCounts
      });
      
      // Atualizar elementos HTML DIRETAMENTE
      this.atualizarElementoDireto('total-containers', total);
      this.atualizarElementoDireto('containers-vistoriados', vistoriados);
      this.atualizarElementoDireto('containers-20ft', containers20ft);
      this.atualizarElementoDireto('containers-40ft', containers40ft);
      this.atualizarElementoDireto('containers-flutuantes', flutuantes);
      
      // Atualizar contadores por ROW
      Object.keys(rowCounts).forEach(row => {
        this.atualizarElementoDireto(`row-${row}`, rowCounts[row]);
      });
      
      // Atualizar contadores por ALTURA
      Object.keys(alturaCounts).forEach(altura => {
        this.atualizarElementoDireto(`altura-${altura}`, alturaCounts[altura]);
      });
      
      // Atualizar contadores por ARMADOR
      Object.keys(armadorCounts).forEach(armador => {
        const armadorId = this.converterArmadorParaId(armador);
        this.atualizarElementoDireto(`count-${armadorId}`, armadorCounts[armador]);
      });
      
      console.log('✅ [StatusDisplay] Atualização direta concluída com ROW, ALTURA e ARMADORES!');
    }
  
    // Método auxiliar para atualização direta sem animação
    atualizarElementoDireto(elementId, valor) {
      const elemento = document.getElementById(elementId);
      if (elemento) {
        elemento.textContent = valor;
        console.log(`✅ [StatusDisplay] ${elementId} atualizado diretamente para: ${valor}`);
      } else {
        console.error(`❌ [StatusDisplay] Elemento ${elementId} não encontrado`);
      }
    }
  
    // ===== ATUALIZAR ESTATÍSTICAS =====
    atualizarEstatisticas(containers) {
      try {
        console.log('📊 [StatusDisplay] atualizarEstatisticas chamado com:', containers);
        console.log('📊 [StatusDisplay] Tipo dos dados:', typeof containers, 'Array:', Array.isArray(containers));
        
        if (!containers || !Array.isArray(containers)) {
          console.error('❌ [StatusDisplay] Dados de containers inválidos para estatísticas:', containers);
          this.debug('Dados de containers inválidos para estatísticas', 'error');
          return;
        }
        
        console.log('📊 [StatusDisplay] Processando', containers.length, 'containers para estatísticas');

        // Contadores
        let total = containers.length;
        let vistoriados = 0;
        let containers20ft = 0;
        let containers40ft = 0;
        let flutuantes = 0;
        
        // Contadores por row e altura
        const rowCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        const alturaCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        // Contadores por armador - com mapeamento flexível
        const armadorCounts = {
          'EVERGREEN': 0,
          'MAERSK': 0,
          'MSC': 0,
          'COSCO': 0,
          'CMA CGM': 0,
          'HAPAG-LLOYD': 0,
          'ONE': 0,
          'YANG MING': 0,
          'HMM': 0,
          'PIL': 0,
          'ZIM': 0,
          'OUTROS': 0
        };
        
        // Mapeamento para variações de nomes de armadores
        const armadorMapping = {
          'EVERGREEN': ['EVERGREEN', 'EVERGREEN MARINE', 'EMC'],
          'MAERSK': ['MAERSK', 'MAERSK LINE', 'MSK'],
          'MSC': ['MSC', 'MEDITERRANEAN SHIPPING COMPANY'],
          'COSCO': ['COSCO', 'COSCO SHIPPING', 'CHINA COSCO'],
          'CMA CGM': ['CMA CGM', 'CMA', 'CGM'],
          'HAPAG-LLOYD': ['HAPAG-LLOYD', 'HAPAG LLOYD', 'HAPAG'],
          'ONE': ['ONE', 'OCEAN NETWORK EXPRESS'],
          'YANG MING': ['YANG MING', 'YML'],
          'HMM': ['HMM', 'HYUNDAI MERCHANT MARINE'],
          'PIL': ['PIL', 'PACIFIC INTERNATIONAL LINES'],
          'ZIM': ['ZIM', 'ZIM LINES']
        };
        
        // Função para mapear armador
        const mapearArmador = (armadorOriginal) => {
          if (!armadorOriginal || armadorOriginal === 'N/A') return null;
          
          const armadorUpper = armadorOriginal.toUpperCase().trim();
          
          // Verificar mapeamento direto
          for (const [armadorPadrao, variacoes] of Object.entries(armadorMapping)) {
            if (variacoes.some(variacao => armadorUpper.includes(variacao))) {
              return armadorPadrao;
            }
          }
          
          return 'OUTROS';
        };

        containers.forEach((container, index) => {
          console.log(`📦 [StatusDisplay] Container ${index + 1}:`, {
            numero: container.numero,
            status: container.status,
            tamanho: container.tamanho_teu || container.tamanho,
            row: container.row || container.linha,
            altura: container.altura,
            armador: container.armador
          });
          
          // Status vistoriado
          if (container.status && container.status.toLowerCase() === 'vistoriado') {
            vistoriados++;
          }
          
          // Tamanho dos containers
          const tamanho = container.tamanho_teu || container.tamanho || 0;
          if (tamanho == 20) {
            containers20ft++;
          } else if (tamanho == 40) {
            containers40ft++;
          }
          
          // Containers flutuantes
          if (container.flutuante || container.status === 'flutuante') {
            flutuantes++;
          }
          
          // Contagem por row
          const row = container.row || container.linha;
          console.log(`📍 [StatusDisplay] Container ${index + 1} - Row debug:`, {
            'container.row': container.row,
            'container.linha': container.linha,
            'row final': row,
            'rowCounts tem a chave': rowCounts.hasOwnProperty(row)
          });
          if (row && rowCounts.hasOwnProperty(row)) {
            rowCounts[row]++;
            console.log(`✅ [StatusDisplay] Row ${row} incrementado para ${rowCounts[row]}`);
          } else {
            console.warn(`⚠️ [StatusDisplay] Row não encontrado ou inválido: '${row}'`);
          }
          
          // Contagem por altura
          const altura = parseInt(container.altura) || 1;
          console.log(`📍 [StatusDisplay] Container ${index + 1} - Altura debug:`, {
            'container.altura': container.altura,
            'altura parsed': altura,
            'altura válida (1-5)': altura >= 1 && altura <= 5
          });
          if (altura >= 1 && altura <= 5) {
            alturaCounts[altura]++;
            console.log(`✅ [StatusDisplay] Altura ${altura} incrementada para ${alturaCounts[altura]}`);
          } else {
            console.warn(`⚠️ [StatusDisplay] Altura inválida: ${altura}`);
          }
          
          // Contagem por armador com mapeamento inteligente
          const armadorOriginal = container.armador;
          const armadorMapeado = mapearArmador(armadorOriginal);
          
          console.log(`🆕 [StatusDisplay] Container ${index + 1} - Armador debug:`, {
            'container.armador original': armadorOriginal,
            'armador mapeado': armadorMapeado,
            'armadorCounts tem a chave': armadorMapeado ? armadorCounts.hasOwnProperty(armadorMapeado) : false
          });
          
          if (armadorMapeado && armadorCounts.hasOwnProperty(armadorMapeado)) {
            armadorCounts[armadorMapeado]++;
            console.log(`✅ [StatusDisplay] Armador ${armadorMapeado} incrementado para ${armadorCounts[armadorMapeado]}`);
          } else if (armadorMapeado === 'OUTROS') {
            armadorCounts['OUTROS']++;
            console.log(`✅ [StatusDisplay] Armador ${armadorOriginal} adicionado em OUTROS: ${armadorCounts['OUTROS']}`);
          } else {
            console.warn(`⚠️ [StatusDisplay] Armador ignorado: '${armadorOriginal}' -> '${armadorMapeado}'`);
          }
        });
        
        console.log('📊 [StatusDisplay] Contadores calculados:', {
          total,
          vistoriados,
          containers20ft,
          containers40ft,
          flutuantes,
          rowCounts,
          alturaCounts,
          armadorCounts
        });

        // Atualizar elementos HTML
        console.log('📊 [StatusDisplay] Atualizando elementos HTML...');
        this.atualizarEstatistica('total-containers', total);
        this.atualizarEstatistica('containers-vistoriados', vistoriados);
        this.atualizarEstatistica('containers-20ft', containers20ft);  // 🔴 CORRIGIDO: ID correto
        this.atualizarEstatistica('containers-40ft', containers40ft);  // 🔴 CORRIGIDO: ID correto
        this.atualizarEstatistica('containers-flutuantes', flutuantes);
        console.log('📊 [StatusDisplay] Elementos principais atualizados');
        
        // Atualizar contadores por row
        console.log('📊 [StatusDisplay] Atualizando contadores por row...');
        Object.keys(rowCounts).forEach(row => {
          this.animarContador(`row-${row}`, rowCounts[row]);
        });
        
        // Atualizar contadores por altura
        console.log('📊 [StatusDisplay] Atualizando contadores por altura...');
        Object.keys(alturaCounts).forEach(altura => {
          this.animarContador(`altura-${altura}`, alturaCounts[altura]);
        });
        
        this.debug(`📊 Contadores atualizados - Rows: ${JSON.stringify(rowCounts)}, Alturas: ${JSON.stringify(alturaCounts)}`);
        
        // Atualizar contadores por armador
        console.log('📊 [StatusDisplay] Atualizando contadores por armador...');
        this.atualizarContadoresArmador(armadorCounts);
        
        console.log('✅ [StatusDisplay] Todas as estatísticas foram processadas e atualizadas!');

        this.debug(`📊 Estatísticas atualizadas: ${total} containers, ${vistoriados} vistoriados`);
        
      } catch (error) {
        this.debug(`Erro ao atualizar estatísticas: ${error.message}`, 'error');
      }
    }
  
    // 🆕 Atualizar contadores de armadores
    atualizarContadoresArmador(armadorCounts) {
      try {
        Object.keys(armadorCounts).forEach(armador => {
          // Converter nome do armador para ID válido
          const armadorId = this.converterArmadorParaId(armador);
          const elementId = `count-${armadorId}`;
          
          this.debug(`🆕 Tentando atualizar contador: ${elementId} = ${armadorCounts[armador]}`);
          
          // Animar contador com classe especial
          this.animarContadorArmador(elementId, armadorCounts[armador]);
        });
        
        this.debug(`🆕 Contadores de armadores processados: ${JSON.stringify(armadorCounts)}`);
      } catch (error) {
        this.debug(`Erro ao atualizar contadores de armadores: ${error.message}`, 'error');
      }
    }
    
    // Converter nome do armador para ID válido
    converterArmadorParaId(armador) {
      return armador.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    }
    
    // Animar contador de armador com efeito especial
    // Método melhorado para animar contadores
    animarContador(elementId, novoValor) {
      try {
        const elemento = document.getElementById(elementId);
        if (!elemento) {
          this.debug(`❌ Elemento ${elementId} não encontrado`, 'warn');
          return;
        }
        
        this.debug(`✅ Atualizando ${elementId}: ${novoValor}`);
        
        // Adicionar classe de animação
        elemento.classList.add('updating');
        
        // Atualizar valor
        elemento.textContent = novoValor;
        
        // Remover classe após animação
        setTimeout(() => {
          elemento.classList.remove('updating');
        }, 600);
        
      } catch (error) {
        this.debug(`Erro ao animar contador ${elementId}: ${error.message}`, 'error');
      }
    }
    
    // Animar contador de armador com efeito especial
    animarContadorArmador(elementId, novoValor) {
      try {
        const elemento = document.getElementById(elementId);
        if (!elemento) {
          this.debug(`❌ Elemento armador ${elementId} não encontrado`, 'warn');
          return;
        }
        
        this.debug(`🆕 Atualizando armador ${elementId}: ${novoValor}`);
        
        // Adicionar classe de animação
        elemento.classList.add('updating');
        
        // Atualizar valor
        elemento.textContent = novoValor;
        
        // Remover classe após animação
        setTimeout(() => {
          elemento.classList.remove('updating');
        }, 600);
        
      } catch (error) {
        this.debug(`Erro ao animar contador de armador ${elementId}: ${error.message}`, 'error');
      }
    }
  
    atualizarEstatistica(elementId, valor) {
      try {
        console.log(`🔍 [StatusDisplay] Tentando atualizar elemento '${elementId}' com valor ${valor}`);
        const elemento = document.getElementById(elementId);
        
        if (elemento) {
          console.log(`✅ [StatusDisplay] Elemento '${elementId}' encontrado no DOM`);
          
          // Animação no número
          const valorAtual = parseInt(elemento.textContent) || 0;
          console.log(`🔄 [StatusDisplay] Valor atual: ${valorAtual}, Novo valor: ${valor}`);
          
          if (valorAtual !== valor) {
            console.log(`🎯 [StatusDisplay] Iniciando animação de ${valorAtual} para ${valor}`);
            this.animarContador(elemento, valorAtual, valor);
          } else {
            console.log(`⏭️ [StatusDisplay] Valor inalterado, pulando animação`);
          }
        } else {
          console.error(`❌ [StatusDisplay] ELEMENTO NÃO ENCONTRADO: '${elementId}' - Verifique se o ID existe no HTML`);
          console.error(`❌ [StatusDisplay] Elementos disponíveis no DOM:`, 
            Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id.includes('container')));
        }
      } catch (error) {
        console.error(`💥 [StatusDisplay] Erro ao atualizar estatística '${elementId}':`, error);
        this.debug(`Erro ao atualizar estatística ${elementId}: ${error.message}`, 'error');
      }
    }
  
    animarContador(elemento, inicio, fim, duracao = 1000) {
      console.log(`🎬 [StatusDisplay] Iniciando animação: ${inicio} → ${fim} (duração: ${duracao}ms)`);
      const startTime = Date.now();
  
      const animar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duracao, 1);
  
        const valorAtual = Math.round(inicio + (fim - inicio) * progress);
        elemento.textContent = valorAtual;
  
        if (progress < 1) {
          requestAnimationFrame(animar);
        } else {
          console.log(`✅ [StatusDisplay] Animação concluída: valor final ${valorAtual}`);
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