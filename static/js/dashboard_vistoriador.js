/**
 * Dashboard Vistoriador - JavaScript Completo
 * Funcionalidades: Registro de vistoria, indicadores do pátio, consulta de containers
 */

// Variáveis globais
let avariasRegistradas = [];
let armadoresList = [];
let editModalInstance = null;
let estruturas = [];
let avarias = [];

// Variáveis para consulta de containers
let currentPage = 1;
let totalPages = 1;
let containers = [];
let filteredContainers = [];

// Inicialização quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 Inicializando Dashboard do Vistoriador...");

  // Carregar dados iniciais
  carregarEstruturasAvarias();
  carregarListaArmadores();
  carregarContainersVistoriados();

  // Configurar event listeners
  configurarEventListeners();

  console.log("✅ Dashboard do Vistoriador inicializado");
});

/**
 * Configurar todos os event listeners
 */
function configurarEventListeners() {
  // Formulário de vistoria
  const formVistoria = document.getElementById("formVistoria");
  if (formVistoria) {
    formVistoria.addEventListener("submit", function (e) {
      e.preventDefault();
      registrarVistoria();
    });
  }

  // Botão adicionar avaria
  const btnAdicionarAvaria = document.getElementById("btn-adicionar-avaria");
  if (btnAdicionarAvaria) {
    btnAdicionarAvaria.addEventListener("click", adicionarAvaria);
  }

  // Event listeners para as abas
  document
    .getElementById("indicadores-tab")
    ?.addEventListener("shown.bs.tab", function () {
      setTimeout(carregarIndicadoresPatio, 100);
    });

  document
    .getElementById("consulta-tab")
    ?.addEventListener("shown.bs.tab", function () {
      setTimeout(carregarConsultaContainers, 100);
    });

  // Filtros de busca
  document
    .getElementById("btn-aplicar-filtros")
    ?.addEventListener("click", aplicarFiltros);
  document
    .getElementById("btn-limpar-filtros")
    ?.addEventListener("click", limparFiltros);
  document
    .getElementById("btn-exportar")
    ?.addEventListener("click", exportarDados);

  // Auto-busca ao digitar no filtro de número
  const filterNumero = document.getElementById("filter-numero");
  if (filterNumero) {
    filterNumero.addEventListener("input", debounce(aplicarFiltros, 500));
  }

  // Auto-refresh dos indicadores a cada 5 minutos
  setInterval(function () {
    const activeTab = document.querySelector(".nav-link.active");
    if (activeTab && activeTab.id === "indicadores-tab") {
      carregarIndicadoresPatio();
    }
  }, 300000); // 5 minutos

  console.log("✅ Event listeners configurados");
}

/**
 * Carregar estruturas e avarias do banco de dados
 */
async function carregarEstruturasAvarias() {
  try {
    console.log("📋 Carregando estruturas e avarias...");

    // Carregar estruturas
    const responseEstruturas = await fetch("/vistoriador/listar-estruturas");
    if (responseEstruturas.ok) {
      estruturas = await responseEstruturas.json();
      popularSelectEstruturas();
      console.log(`✅ ${estruturas.length} estruturas carregadas`);
    }

    // Carregar avarias
    const responseAvarias = await fetch("/vistoriador/listar-avarias");
    if (responseAvarias.ok) {
      avarias = await responseAvarias.json();
      popularSelectAvarias();
      console.log(`✅ ${avarias.length} avarias carregadas`);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar estruturas/avarias:", error);
    mostrarAlerta("Erro ao carregar dados de estruturas e avarias", "error");
  }
}

/**
 * Popular select de estruturas
 */
function popularSelectEstruturas() {
  const selectEstrutura = document.getElementById("estrutura");
  const selectEditEstrutura = document.getElementById("edit_estrutura");

  if (selectEstrutura) {
    selectEstrutura.innerHTML =
      '<option value="">Selecione a estrutura...</option>';
    estruturas.forEach((estrutura) => {
      selectEstrutura.innerHTML += `<option value="${estrutura.codigo}">${estrutura.nome}</option>`;
    });
  }

  if (selectEditEstrutura) {
    selectEditEstrutura.innerHTML =
      '<option value="">Selecione a estrutura...</option>';
    estruturas.forEach((estrutura) => {
      selectEditEstrutura.innerHTML += `<option value="${estrutura.codigo}">${estrutura.nome}</option>`;
    });
  }
}

/**
 * Popular select de avarias
 */
function popularSelectAvarias() {
  const selectAvaria = document.getElementById("avaria");
  const selectEditAvaria = document.getElementById("edit_avaria");

  if (selectAvaria) {
    selectAvaria.innerHTML = '<option value="">Selecione a avaria...</option>';
    avarias.forEach((avaria) => {
      selectAvaria.innerHTML += `<option value="${avaria.codigo}">${avaria.nome}</option>`;
    });
  }

  if (selectEditAvaria) {
    selectEditAvaria.innerHTML =
      '<option value="">Selecione a avaria...</option>';
    avarias.forEach((avaria) => {
      selectEditAvaria.innerHTML += `<option value="${avaria.codigo}">${avaria.nome}</option>`;
    });
  }
}

/**
 * Carregar lista de armadores
 */
async function carregarListaArmadores() {
  try {
    console.log("🚢 Carregando armadores...");

    const response = await fetch("/vistoriador/listar-armadores");
    const data = await response.json();

    if (data.success) {
      armadoresList = data.armadores;
      popularSelectArmadores();
      console.log(`✅ ${armadoresList.length} armadores carregados`);
    } else {
      console.warn("⚠️ Falha ao carregar armadores:", data.message);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar armadores:", error);
  }
}

/**
 * Popular select de armadores
 */
function popularSelectArmadores() {
  const selectArmador = document.getElementById("armador");
  const selectFilterArmador = document.getElementById("filter-armador");

  if (selectArmador) {
    selectArmador.innerHTML =
      '<option value="">Selecione o armador...</option>';
    armadoresList.forEach((armador) => {
      selectArmador.innerHTML += `<option value="${armador}">${armador}</option>`;
    });
  }

  if (selectFilterArmador) {
    selectFilterArmador.innerHTML =
      '<option value="">Todos os armadores</option>';
    armadoresList.forEach((armador) => {
      selectFilterArmador.innerHTML += `<option value="${armador}">${armador}</option>`;
    });
  }
}

/**
 * Adicionar avaria à lista
 */
function adicionarAvaria() {
  const estruturaCodigo = document.getElementById("estrutura").value;
  const avariaCodigo = document.getElementById("avaria").value;
  const observacoes = document
    .getElementById("observacoes_avaria")
    .value.trim();

  if (!estruturaCodigo || !avariaCodigo) {
    mostrarAlerta("Selecione a estrutura e o tipo de avaria", "warning");
    return;
  }

  // Buscar nomes das estruturas e avarias
  const estruturaNome =
    estruturas.find((e) => e.codigo === estruturaCodigo)?.nome ||
    estruturaCodigo;
  const avariaNome =
    avarias.find((a) => a.codigo === avariaCodigo)?.nome || avariaCodigo;

  // Verificar se a combinação já existe
  const jaExiste = avariasRegistradas.some(
    (a) => a.estrutura === estruturaCodigo && a.avaria === avariaCodigo
  );

  if (jaExiste) {
    mostrarAlerta(
      "Esta combinação de estrutura e avaria já foi registrada",
      "warning"
    );
    return;
  }

  // Adicionar à lista
  const novaAvaria = {
    estrutura: estruturaCodigo,
    estruturaNome: estruturaNome,
    avaria: avariaCodigo,
    avariaNome: avariaNome,
    observacoes: observacoes,
  };

  avariasRegistradas.push(novaAvaria);

  // Atualizar interface
  atualizarListaAvarias();
  limparCamposAvaria();

  // Feedback positivo
  mostrarToast("Avaria adicionada com sucesso!", "success");

  console.log("✅ Avaria adicionada:", novaAvaria);
}

/**
 * Atualizar lista visual de avarias
 */
function atualizarListaAvarias() {
  const container = document.getElementById("lista-avarias-adicionadas");
  const section = document.getElementById("avarias-adicionadas-section");
  const contador = document.getElementById("contador-avarias-adicionadas");

  if (!container) return;

  if (avariasRegistradas.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  container.innerHTML = avariasRegistradas
    .map(
      (avaria, index) => `
        <div class="avaria-item" data-index="${index}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="avaria-info">
                    <strong>${avaria.estruturaNome}</strong>
                    <br>
                    <span class="text-muted">${avaria.avariaNome}</span>
                    ${
                      avaria.observacoes
                        ? `<br><small class="text-info">Obs: ${avaria.observacoes}</small>`
                        : ""
                    }
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerAvaria(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");

  contador.textContent = avariasRegistradas.length;
}

/**
 * Remover avaria da lista
 */
function removerAvaria(index) {
  if (index >= 0 && index < avariasRegistradas.length) {
    avariasRegistradas.splice(index, 1);
    atualizarListaAvarias();
    mostrarToast("Avaria removida", "info");
    console.log("🗑️ Avaria removida do índice:", index);
  }
}

/**
 * Limpar todas as avarias
 */
function limparTodasAvarias() {
  if (avariasRegistradas.length === 0) {
    mostrarAlerta("Não há avarias para remover", "info");
    return;
  }

  Swal.fire({
    title: "Confirmar remoção",
    text: `Deseja remover todas as ${avariasRegistradas.length} avaria(s)?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, remover todas",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      avariasRegistradas = [];
      atualizarListaAvarias();
      mostrarToast("Todas as avarias foram removidas", "success");
      console.log("🧹 Todas as avarias removidas");
    }
  });
}

/**
 * Limpar campos de avaria
 */
function limparCamposAvaria() {
  document.getElementById("estrutura").value = "";
  document.getElementById("avaria").value = "";
  document.getElementById("observacoes_avaria").value = "";
}

/**
 * Registrar vistoria
 */
async function registrarVistoria() {
  try {
    console.log("📝 Iniciando registro de vistoria...");

    // Preparar dados do formulário
    const formData = new FormData(document.getElementById("formVistoria"));

    // Adicionar avarias como JSON
    formData.append(
      "avarias_registradas",
      JSON.stringify(
        avariasRegistradas.map((a) => ({
          estrutura: a.estrutura,
          avaria: a.avaria,
          observacoes: a.observacoes || "",
        }))
      )
    );

    // Mostrar loading
    const btnRegistrar = document.getElementById("btn-registrar");
    const textoOriginal = btnRegistrar.innerHTML;
    btnRegistrar.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Registrando...';
    btnRegistrar.disabled = true;

    const response = await fetch("/vistoriador/registrar", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      mostrarAlerta("Vistoria registrada com sucesso!", "success");
      limparFormularioCompleto();
      carregarContainersVistoriados(); // Recarregar lista

      // Se estiver na aba de indicadores, atualizar
      const activeTab = document.querySelector(".nav-link.active");
      if (activeTab && activeTab.id === "indicadores-tab") {
        setTimeout(carregarIndicadoresPatio, 1000);
      }
    } else {
      mostrarAlerta(data.message || "Erro ao registrar vistoria", "error");
    }
  } catch (error) {
    console.error("❌ Erro ao registrar vistoria:", error);
    mostrarAlerta("Erro ao comunicar com o servidor", "error");
  } finally {
    // Restaurar botão
    const btnRegistrar = document.getElementById("btn-registrar");
    btnRegistrar.innerHTML =
      '<i class="fas fa-save me-2"></i> Registrar Vistoria';
    btnRegistrar.disabled = false;
  }
}

/**
 * Limpar formulário completo
 */
function limparFormularioCompleto() {
  document.getElementById("formVistoria").reset();
  avariasRegistradas = [];
  atualizarListaAvarias();
  console.log("🧹 Formulário limpo");
}

/**
 * Carregar containers vistoriados recentes
 */
async function carregarContainersVistoriados() {
  try {
    console.log("📦 Carregando containers vistoriados...");

    const response = await fetch("/vistoriador/listar-vistorias");
    const data = await response.json();

    if (data.success) {
      renderizarContainersVistoriados(data.vistorias);
      console.log(`✅ ${data.vistorias.length} vistorias carregadas`);
    } else {
      console.warn("⚠️ Falha ao carregar vistorias:", data.message);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar containers vistoriados:", error);
  }
}

/**
 * Renderizar lista de containers vistoriados
 */
function renderizarContainersVistoriados(vistorias) {
  const container = document.getElementById("containers-vistoriados");

  if (!container) return;

  if (vistorias.length === 0) {
    container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-inbox text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3">Nenhuma vistoria registrada ainda</p>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Container</th>
                        <th>Status</th>
                        <th>ISO</th>
                        <th>Armador</th>
                        <th>Vistoriador</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${vistorias
                      .map(
                        (vistoria) => `
                        <tr>
                            <td><strong>${
                              vistoria.container_numero
                            }</strong></td>
                            <td><span class="badge bg-success">${
                              vistoria.status || "Vistoriado"
                            }</span></td>
                            <td>${vistoria.iso_container}</td>
                            <td>${vistoria.armador}</td>
                            <td>${vistoria.vistoriador}</td>
                            <td>${formatarDataHora(vistoria.data_vistoria)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="verDetalhesVistoria(${
                                  vistoria.id
                                })">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Ver detalhes de uma vistoria
 */
async function verDetalhesVistoria(vistoriaId) {
  try {
    const response = await fetch(`/vistoriador/obter-vistoria/${vistoriaId}`);
    const data = await response.json();

    if (data.success) {
      mostrarDetalhesVistoria(data.vistoria);
    } else {
      mostrarAlerta("Erro ao carregar detalhes da vistoria", "error");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar detalhes:", error);
    mostrarAlerta("Erro ao comunicar com o servidor", "error");
  }
}

/**
 * Mostrar detalhes da vistoria em modal
 */
function mostrarDetalhesVistoria(vistoria) {
  Swal.fire({
    title: `Container ${vistoria.container_numero}`,
    html: `
            <div class="text-start">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Status:</strong> ${vistoria.status}</p>
                        <p><strong>ISO:</strong> ${vistoria.iso_container}</p>
                        <p><strong>Capacidade:</strong> ${
                          vistoria.capacidade
                        } kg</p>
                        <p><strong>Tara:</strong> ${vistoria.tara} kg</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Armador:</strong> ${vistoria.armador}</p>
                        <p><strong>Lacre:</strong> ${
                          vistoria.lacre || "N/A"
                        }</p>
                        <p><strong>Vistoriador:</strong> ${
                          vistoria.vistoriador
                        }</p>
                        <p><strong>Data:</strong> ${formatarDataHora(
                          vistoria.data_vistoria
                        )}</p>
                    </div>
                </div>
                ${
                  vistoria.observacoes
                    ? `<p><strong>Observações:</strong> ${vistoria.observacoes}</p>`
                    : ""
                }
            </div>
        `,
    width: "600px",
    confirmButtonText: "Fechar",
  });
}

/**
 * Carregar indicadores do pátio
 */
async function carregarIndicadoresPatio() {
  try {
    console.log("📊 Carregando indicadores do pátio...");

    const response = await fetch("/vistoriador/indicadores-patio");
    const data = await response.json();

    if (data.success) {
      renderizarIndicadores(data.indicadores);
      renderizarGraficos(data.indicadores);
      console.log("✅ Indicadores carregados");
    } else {
      console.warn("⚠️ Falha ao carregar indicadores:", data.message);
      mostrarErroIndicadores();
    }
  } catch (error) {
    console.error("❌ Erro ao carregar indicadores:", error);
    mostrarErroIndicadores();
  }
}

/**
 * Renderizar indicadores na interface
 */
function renderizarIndicadores(indicadores) {
  const container = document.getElementById("indicators-container");

  if (!container) return;

  container.innerHTML = `
        <div class="col-md-3 col-sm-6 mb-4 fade-in">
            <div class="indicator-card clickable" data-filter="todos">
                <div class="indicator-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-cube"></i>
                </div>
                <div class="indicator-value">${
                  indicadores.total_containers
                }</div>
                <div class="indicator-label">Total de Containers</div>
                <div class="indicator-change change-positive">
                    <i class="fas fa-arrow-up"></i> +${
                      indicadores.novos_hoje || 0
                    } hoje
                </div>
            </div>
        </div>
        
        <div class="col-md-3 col-sm-6 mb-4 fade-in">
            <div class="indicator-card clickable" data-filter="vistoriado">
                <div class="indicator-icon" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="indicator-value">${
                  indicadores.containers_vistoriados
                }</div>
                <div class="indicator-label">Vistoriados</div>
                <div class="indicator-change change-positive">
                    <i class="fas fa-arrow-up"></i> ${
                      indicadores.vistoriados_hoje || 0
                    } hoje
                </div>
            </div>
        </div>
        
        <div class="col-md-3 col-sm-6 mb-4 fade-in">
            <div class="indicator-card clickable" data-filter="no patio">
                <div class="indicator-icon" style="background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);">
                    <i class="fas fa-warehouse"></i>
                </div>
                <div class="indicator-value">${
                  indicadores.containers_no_patio
                }</div>
                <div class="indicator-label">No Pátio</div>
                <div class="indicator-change">
                    Taxa de ocupação: ${indicadores.taxa_ocupacao || 0}%
                </div>
            </div>
        </div>
        
        <div class="col-md-3 col-sm-6 mb-4 fade-in">
            <div class="indicator-card clickable" data-filter="carregado">
                <div class="indicator-icon" style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="indicator-value">${
                  indicadores.containers_carregados
                }</div>
                <div class="indicator-label">Carregados</div>
                <div class="indicator-change change-positive">
                    <i class="fas fa-arrow-up"></i> ${
                      indicadores.carregados_hoje || 0
                    } hoje
                </div>
            </div>
        </div>
    `;
    
    // Adicionar event listeners e tooltips para os cards clicáveis
    const indicatorCards = document.querySelectorAll('.indicator-card.clickable');
    indicatorCards.forEach(card => {
      // Adicionar tooltip para indicar que o card é clicável
      card.setAttribute('title', 'Clique para ver detalhes dos containers');
      card.setAttribute('data-bs-toggle', 'tooltip');
      card.setAttribute('data-bs-placement', 'top');
      
      // Inicializar tooltips do Bootstrap
      new bootstrap.Tooltip(card);
      
      card.addEventListener('click', function() {
        const filterValue = this.getAttribute('data-filter');
        const cardLabel = this.querySelector('.indicator-label').textContent;
        
        // Adicionar classe para efeito visual de clique
        this.classList.add('clicked');
        
        // Remover classe após a animação terminar
        setTimeout(() => {
          this.classList.remove('clicked');
        }, 300);
        
        // Mostrar toast informativo
        mostrarToast(`Consultando detalhes: ${cardLabel}`, 'info');
        
        // Buscar containers com o filtro selecionado e mostrar no modal
        fetch(`/vistoriador/listar-containers-completo?status=${filterValue}`)
          .then(response => response.json())
          .then(data => {
            if (data.success && data.containers && data.containers.length > 0) {
              // Preparar conteúdo do modal
              const modalTitle = document.getElementById('modal-container-number');
              const modalContent = document.getElementById('container-details-content');
              
              modalTitle.textContent = cardLabel;
              
              // Criar tabela com os containers
              let tableHtml = `
                <div class="table-responsive">
                  <table class="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Status</th>
                        <th>Posição</th>
                        <th>Armador</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
              `;
              
              // Limitar a 10 containers para não sobrecarregar o modal
              const containersToShow = data.containers.slice(0, 10);
              
              containersToShow.forEach(container => {
                tableHtml += `
                  <tr>
                    <td>${container.numero}</td>
                    <td><span class="badge bg-${getStatusColor(container.status)}">${container.status}</span></td>
                    <td>${container.posicao_atual || 'N/A'}</td>
                    <td>${container.armador || 'N/A'}</td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="verDetalhesContainer('${container.numero}')">
                        <i class="fas fa-search"></i> Detalhes
                      </button>
                    </td>
                  </tr>
                `;
              });
              
              tableHtml += `
                    </tbody>
                  </table>
                </div>
                <div class="text-center mt-3">
                  <p>Mostrando ${containersToShow.length} de ${data.containers.length} containers</p>
                  <button class="btn btn-primary" onclick="verTodosContainers('${filterValue}')">
                    Ver todos os containers
                  </button>
                </div>
              `;
              
              modalContent.innerHTML = tableHtml;
              
              // Abrir o modal
              const modal = new bootstrap.Modal(document.getElementById('containerDetailsModal'));
              modal.show();
            } else {
              mostrarToast('Nenhum container encontrado com este filtro', 'warning');
            }
          })
          .catch(error => {
            console.error('Erro ao buscar containers:', error);
            mostrarToast('Erro ao buscar dados dos containers', 'error');
          });
      });
      
      // Função auxiliar para determinar a cor do badge de status
      function getStatusColor(status) {
        switch(status) {
          case 'vistoriado': return 'success';
          case 'no patio': return 'info';
          case 'carregado': return 'warning';
          default: return 'secondary';
        }
      }
      
      // Função para ver todos os containers
      window.verTodosContainers = function(filterValue) {
        // Fechar o modal
        const modalElement = document.getElementById('containerDetailsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Mudar para a aba de consulta
        const consultaTab = document.getElementById('consulta-tab');
        if (consultaTab) {
          const tabInstance = new bootstrap.Tab(consultaTab);
          tabInstance.show();
          
          // Pequeno delay para garantir que a aba seja carregada
          setTimeout(() => {
            // Definir o filtro apropriado
            if (filterValue === 'todos') {
              // Limpar filtros e mostrar todos
              limparFiltros();
            } else {
              // Definir o filtro de status e aplicar
              const filterStatus = document.getElementById('filter-status');
              if (filterStatus) {
                filterStatus.value = filterValue;
                aplicarFiltros();
              }
            }
          }, 300);
        }
      };
    });
  }


/**
 * Renderizar gráficos
 */
function renderizarGraficos(indicadores) {
  // Destruir gráficos antigos, se existirem
  if (window._statusChartInstance) {
    window._statusChartInstance.destroy();
  }
  if (window._armadorChartInstance) {
    window._armadorChartInstance.destroy();
  }
  // Gráfico de Status
  const ctxStatus = document.getElementById("statusChart");
  if (ctxStatus) {
    window._statusChartInstance = new Chart(ctxStatus.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Vistoriado", "No Pátio", "Carregado", "Fora do Pátio"],
        datasets: [
          {
            data: [
              indicadores.containers_vistoriados,
              indicadores.containers_no_patio,
              indicadores.containers_carregados,
              indicadores.containers_fora_patio || 0,
            ],
            backgroundColor: ["#28a745", "#17a2b8", "#ffc107", "#dc3545"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  // Gráfico de Containers por Armador
  const ctxArmador = document.getElementById("alturaChart"); // Mantendo o mesmo ID para não precisar alterar o HTML
  if (ctxArmador && indicadores.containers_por_armador) {
    // Extrair dados de armadores
    const armadores = Object.keys(indicadores.containers_por_armador);
    const valores = Object.values(indicadores.containers_por_armador);
    
    // Gerar cores dinâmicas para cada armador
    const cores = armadores.map((_, index) => {
      // Gera cores diferentes para cada fatia do gráfico
      const hue = (index * 137) % 360; // Espaçamento de cores para evitar cores similares
      return `hsl(${hue}, 70%, 60%)`;
    });
    
    window._armadorChartInstance = new Chart(ctxArmador.getContext("2d"), {
      type: "pie",
      data: {
        labels: armadores,
        datasets: [
          {
            data: valores,
            backgroundColor: cores,
            borderWidth: 1,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: "right",
            labels: {
              boxWidth: 15,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
      },
    });
  }
}

/**
 * Mostrar erro nos indicadores
 */
function mostrarErroIndicadores() {
  const container = document.getElementById("indicators-container");
  if (container) {
    container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erro ao carregar indicadores do pátio. Tente novamente mais tarde.
                </div>
            </div>
        `;
  }
}

/**
 * Carregar dados para consulta de containers
 */
async function carregarConsultaContainers() {
  try {
    // Carregar armadores para o filtro
    if (armadoresList.length === 0) {
      await carregarListaArmadores();
    }

    // Carregar containers
    await carregarContainers();
  } catch (error) {
    console.error("❌ Erro ao carregar consulta de containers:", error);
  }
}

/**
 * Carregar containers para consulta
 */
async function carregarContainers() {
  try {
    const response = await fetch("/vistoriador/listar-containers-completo");
    const data = await response.json();

    if (data.success) {
      containers = data.containers;
      filteredContainers = containers;
      renderizarTabela();
      atualizarPaginacao();
      console.log(
        `✅ ${containers.length} containers carregados para consulta`
      );
    } else {
      console.warn("⚠️ Falha ao carregar containers:", data.message);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar containers:", error);
  }
}

/**
 * Aplicar filtros de busca
 */
function aplicarFiltros() {
  const numero =
    document.getElementById("filter-numero")?.value.toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "";
  const posicao =
    document.getElementById("filter-posicao")?.value.toLowerCase() || "";
  const armador = document.getElementById("filter-armador")?.value || "";
  const dataInicio = document.getElementById("filter-data-inicio")?.value || "";
  const dataFim = document.getElementById("filter-data-fim")?.value || "";

  filteredContainers = containers.filter((container) => {
    let match = true;

    if (numero && !container.numero.toLowerCase().includes(numero))
      match = false;
    if (status && container.status !== status) match = false;
    if (posicao && !container.posicao_atual?.toLowerCase().includes(posicao))
      match = false;
    if (armador && container.armador !== armador) match = false;

    if (dataInicio) {
      const containerDate = new Date(container.ultima_atualizacao);
      const startDate = new Date(dataInicio);
      if (containerDate < startDate) match = false;
    }

    if (dataFim) {
      const containerDate = new Date(container.ultima_atualizacao);
      const endDate = new Date(dataFim);
      if (containerDate > endDate) match = false;
    }

    return match;
  });

  currentPage = 1;
  renderizarTabela();
  atualizarPaginacao();
}

/**
 * Limpar filtros
 */
function limparFiltros() {
  document.getElementById("filter-numero").value = "";
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-posicao").value = "";
  document.getElementById("filter-armador").value = "";
  document.getElementById("filter-data-inicio").value = "";
  document.getElementById("filter-data-fim").value = "";

  filteredContainers = containers;
  currentPage = 1;
  renderizarTabela();
  atualizarPaginacao();
}

/**
 * Renderizar tabela de containers
 */
function renderizarTabela() {
  const tbody = document.getElementById("containers-table-body");
  if (!tbody) return;

  const itemsPerPage = 10;
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageContainers = filteredContainers.slice(start, end);

  if (pageContainers.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-search text-muted"></i>
                    <p class="text-muted mb-0">Nenhum container encontrado</p>
                </td>
            </tr>
        `;
  } else {
    tbody.innerHTML = pageContainers
      .map(
        (container) => `
            <tr>
                <td><strong>${container.numero}</strong></td>
                <td><span class="status-badge status-${container.status.replace(
                  " ",
                  "-"
                )}">${container.status}</span></td>
                <td>${container.posicao_atual || "-"}</td>
                <td>${container.armador || "-"}</td>
                <td>${container.tamanho || "20"} TEU</td>
                <td>${formatarDataHora(container.ultima_atualizacao)}</td>
                <td>
                    <button class="btn btn-view-details" onclick="verDetalhesContainer('${
                      container.numero
                    }')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  // Atualizar contador
  document.getElementById("total-containers").textContent = `${
    filteredContainers.length
  } container${filteredContainers.length !== 1 ? "s" : ""}`;
  document.getElementById("showing-from").textContent = Math.min(
    start + 1,
    filteredContainers.length
  );
  document.getElementById("showing-to").textContent = Math.min(
    end,
    filteredContainers.length
  );
  document.getElementById("total-records").textContent =
    filteredContainers.length;
}

/**
 * Atualizar paginação
 */
function atualizarPaginacao() {
  const itemsPerPage = 10;
  totalPages = Math.ceil(filteredContainers.length / itemsPerPage);
  const pagination = document.getElementById("pagination-container");

  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.innerHTML = "";
    return;
  }

  let paginationHtml = "";

  // Botão anterior
  paginationHtml += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="mudarPagina(${
              currentPage - 1
            })">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

  // Páginas
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      paginationHtml += `
                <li class="page-item ${i === currentPage ? "active" : ""}">
                    <a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a>
                </li>
            `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHtml +=
        '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  // Botão próximo
  paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="mudarPagina(${
              currentPage + 1
            })">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

  pagination.innerHTML = paginationHtml;
}

/**
 * Mudar página
 */
function mudarPagina(page) {
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderizarTabela();
    atualizarPaginacao();
  }
}

/**
 * Ver detalhes do container
 */
async function verDetalhesContainer(numero) {
  try {
    const response = await fetch(`/vistoriador/detalhes-container/${numero}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("modal-container-number").textContent = numero;
      document.getElementById("container-details-content").innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Informações Básicas</h6>
                        <p><strong>Status:</strong> ${data.container.status}</p>
                        <p><strong>Posição:</strong> ${
                          data.container.posicao_atual || "-"
                        }</p>
                        <p><strong>Armador:</strong> ${
                          data.container.armador || "-"
                        }</p>
                        <p><strong>Tamanho:</strong> ${
                          data.container.tamanho || "20"
                        } TEU</p>
                        <p><strong>ISO:</strong> ${
                          data.container.iso_container || "-"
                        }</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Dados Técnicos</h6>
                        <p><strong>Capacidade:</strong> ${
                          data.container.capacidade || "-"
                        } kg</p>
                        <p><strong>Tara:</strong> ${
                          data.container.tara || "-"
                        } kg</p>
                        <p><strong>Tipo:</strong> ${
                          data.container.tipo_container || "-"
                        }</p>
                        <p><strong>Criado em:</strong> ${formatarDataHora(
                          data.container.data_criacao
                        )}</p>
                        <p><strong>Atualizado em:</strong> ${formatarDataHora(
                          data.container.ultima_atualizacao
                        )}</p>
                    </div>
                </div>
                ${
                  data.container.observacoes
                    ? `
                    <div class="mt-3">
                        <h6>Observações</h6>
                        <p>${data.container.observacoes}</p>
                    </div>
                `
                    : ""
                }
            `;
      new bootstrap.Modal(
        document.getElementById("containerDetailsModal")
      ).show();
    } else {
      mostrarAlerta("Erro ao carregar detalhes do container", "error");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar detalhes:", error);
    mostrarAlerta("Erro ao comunicar com o servidor", "error");
  }
}

/**
 * Exportar dados para CSV
 */
function exportarDados() {
  if (filteredContainers.length === 0) {
    mostrarAlerta("Não há dados para exportar", "warning");
    return;
  }

  const csv = ["Número,Status,Posição,Armador,Tamanho,Última Atualização"];
  filteredContainers.forEach((container) => {
    csv.push(
      [
        container.numero,
        container.status,
        container.posicao_atual || "",
        container.armador || "",
        container.tamanho || "20",
        container.ultima_atualizacao,
      ].join(",")
    );
  });

  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `containers_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);

  mostrarToast("Dados exportados com sucesso!", "success");
}

/**
 * Formatação de data e hora
 */
function formatarDataHora(dataStr) {
  if (!dataStr) return "-";
  const date = new Date(dataStr);
  return (
    date.toLocaleDateString("pt-BR") +
    " " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

/**
 * Debounce para otimizar busca em tempo real
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Mostrar alerta usando SweetAlert2
 */
function mostrarAlerta(mensagem, tipo = "info") {
  const icone =
    {
      success: "success",
      error: "error",
      warning: "warning",
      info: "info",
    }[tipo] || "info";

  Swal.fire({
    icon: icone,
    title: mensagem,
    showConfirmButton: true,
    confirmButtonColor: "#007bff",
  });
}

/**
 * Mostrar toast (notificação rápida)
 */
function mostrarToast(mensagem, tipo = "info") {
  const icone =
    {
      success: "success",
      error: "error",
      warning: "warning",
      info: "info",
    }[tipo] || "info";

  Swal.fire({
    icon: icone,
    title: mensagem,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
}

/**
 * Confirmar logout
 */
function confirmarLogout() {
  Swal.fire({
    title: "Confirmar Logout",
    text: "Deseja realmente sair do sistema?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sim, sair",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "/auth/logout";
    }
  });
}

// Exposição global das funções que precisam ser chamadas pelo HTML
window.adicionarAvaria = adicionarAvaria;
window.removerAvaria = removerAvaria;
window.limparTodasAvarias = limparTodasAvarias;
window.verDetalhesVistoria = verDetalhesVistoria;
window.verDetalhesContainer = verDetalhesContainer;
window.mudarPagina = mudarPagina;
window.confirmarLogout = confirmarLogout;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.exportarDados = exportarDados;
window.limparFormularioCompleto = limparFormularioCompleto;

console.log("📋 Dashboard Vistoriador JavaScript carregado completamente");
