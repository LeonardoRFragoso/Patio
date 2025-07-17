// ========================================
// DASHBOARD SISTEMA DE PÁTIO - JAVASCRIPT
// Versão modular com busca automática - OTIMIZADA
// ✅ Sistema de containers com busca automática
// ✅ Auto-preenchimento da posição atual
// ✅ Gestão de placas integrada
// ✅ Removidas duplicações e redundâncias
// ✅ Validação de formato de posição (A01-1)
// ========================================

/**
 * Estado global da aplicação
 */
import { appState } from './modules/state.js';
import { fetchContainers, fetchContainersAvailable, fetchInspectedContainers, fetchFreePositions } from './modules/api.js';

// Compatibilidade: manter variável global para scripts antigos
window.appState = appState;

// As funções que ainda permanecem neste arquivo podem usar fetchContainers* dos módulos

// ======== ANTIGO OBJETO appState removido ========
/* let appState = {
  currentOperation: null,
  currentMode: null,
  activeForm: null,
  placasCache: [], // Cache das placas (sistema existente)
  placasCacheTime: null,
  containersCache: [], // Cache dos containers
  containersCacheTime: null,
  containersVistoriadosCache: [], // Cache dos containers vistoriados prontos para descarga
  containersVistoriadosCacheTime: null,
  posicoesLivresCache: null,
  posicoesLivresCacheTime: null,
*/

console.log("🚀 Iniciando Dashboard com busca automática (módulos ativos)...");

// ================== POSIÇÕES LIVRES PARA DESCARGA ==================
/**
 * Carrega posições livres do backend com cache de 2 minutos.
 * @param {boolean} forceRefresh - Forçar atualização, ignorando cache
 * @returns {Promise<Array<string>>} Lista de posições livres
 */
async function carregarPosicoesLivres(forceRefresh = false) {
  try {
    const agora = new Date();
    if (!forceRefresh && appState.posicoesLivresCache && appState.posicoesLivresCacheTime && (agora - appState.posicoesLivresCacheTime < 120000)) {
      return appState.posicoesLivresCache;
    }

    const resp = await fetch(`/operacoes/posicoes/livres${forceRefresh ? '?refresh=true' : ''}`);
    const data = await resp.json();
    if (data.success && Array.isArray(data.data)) {
      appState.posicoesLivresCache = data.data;
      appState.posicoesLivresCacheTime = agora;
      return data.data;
    } else {
      console.error('Erro ao obter posições livres:', data.error);
    }
  } catch (e) {
    console.error('Erro na requisição de posições livres:', e);
  }
  return [];
}

/**
 * Cria um elemento datalist com as posições livres e associa ao input.
 * @param {HTMLInputElement} inputEl - Input que usará o datalist
 * @param {Array<string>} posicoes - Lista de posições livres
 */
function criarDatalistPosicoesDescarga(inputEl, posicoes) {
  if (!inputEl) return;

  // Se Choices.js estiver disponível, usar dropdown aprimorado
  if (window.Choices) {
    try {
      // Converter lista simples em objetos value/label
      const choicesData = posicoes.map(p => ({ value: p, label: p }));

      // Se já existe instância, destruí-la para recriar com novas opções
      if (window.posicaoDescargaChoices) {
        window.posicaoDescargaChoices.destroy();
        window.posicaoDescargaChoices = null;
      }

      window.posicaoDescargaChoices = new Choices(inputEl, {
        searchEnabled: true,
        shouldSort: false,
        itemSelectText: '',
        classNames: { containerInner: 'choices__inner' },
        choices: choicesData.length > 0 ? choicesData : [{ value: '', label: 'Nenhuma posição disponível', disabled: true }]
      });

      // Adicionar classe extra para aumentar a área de clique e manter o estilo
      const inner = inputEl.closest('.choices')?.querySelector('.choices__inner');
      inner?.classList.add('big-input');
      return; // Não continuar para datalist
    } catch (err) {
      console.warn('⚠️ Falha ao inicializar Choices.js, usando datalist tradicional', err);
    }
  }

  // ----------- Fallback datalist nativo -----------
  // Remover datalist antigo, se existir
  const antigo = document.getElementById('datalist-posicoes-descarga');
  if (antigo) antigo.remove();
  const dl = document.createElement('datalist');
  dl.id = 'datalist-posicoes-descarga';
  posicoes.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    dl.appendChild(opt);
  });
  document.body.appendChild(dl);
  inputEl.setAttribute('list', 'datalist-posicoes-descarga');
}
// ================== FIM POSIÇÕES LIVRES ==================

// ========================================
// GESTÃO DE CONTAINERS
// ========================================

/**
 * Carrega containers disponíveis para carregamento (os que estão no pátio ou carregados)
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Array} Lista de containers disponíveis para carregamento
 */
async function carregarContainersDisponiveis(forceRefresh = false) {
  try {
    // Verificar cache local (válido por 2 minutos)
    const agora = new Date();
    if (
      !forceRefresh &&
      appState.containersCacheTime &&
      agora - appState.containersCacheTime < 120000 &&
      appState.containersCache.length > 0
    ) {
      console.log("📦 Usando containers do cache local");
      // Filtrar containers no pátio ou carregados
      const containersDisponiveis = appState.containersCache.filter(
        (container) => container.status === "no patio" || container.status === "carregado"
      );
      console.log(`📦 ${containersDisponiveis.length} containers disponíveis para carregamento (no pátio ou carregados)`);
      return containersDisponiveis;
    }

    console.log("🔄 Carregando containers do banco de dados...");

    const response = await fetch(
      `/operacoes/containers/lista${forceRefresh ? "?refresh=true" : ""}`
    );
    const result = await response.json();

    if (result.success) {
      appState.containersCache = result.data;
      appState.containersCacheTime = agora;
      // Filtrar containers no pátio ou carregados
      const containersDisponiveis = result.data.filter(
        (container) => container.status === "no patio" || container.status === "carregado"
      );
      console.log(`✅ ${containersDisponiveis.length} containers disponíveis para carregamento (no pátio ou carregados)`);
      return containersDisponiveis;
    } else {
      console.error("❌ Erro ao carregar containers:", result.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Erro na requisição de containers:", error);
    return [];
  }
}

/**
 * Carrega containers do banco de dados com cache local
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Array} Lista de containers
 */
async function carregarContainers(forceRefresh = false) {
  try {
    // Verificar cache local (válido por 2 minutos)
    const agora = new Date();
    if (
      !forceRefresh &&
      appState.containersCacheTime &&
      agora - appState.containersCacheTime < 120000 &&
      appState.containersCache.length > 0
    ) {
      console.log("📦 Usando containers do cache local");
      return appState.containersCache;
    }

    console.log("🔄 Carregando containers do banco de dados...");

    const response = await fetch(
      `/operacoes/containers/lista${forceRefresh ? "?refresh=true" : ""}`
    );
    const result = await response.json();

    if (result.success) {
      appState.containersCache = result.data;
      appState.containersCacheTime = agora;
      console.log(`✅ ${result.data.length} containers carregados`);
      return result.data;
    } else {
      console.error("❌ Erro ao carregar containers:", result.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Erro na requisição de containers:", error);
    return [];
  }
}

/**
 * Carrega a lista de containers vistoriados do servidor
 * @param {boolean} forceRefresh - Forçar atualização do cache
 * @returns {Promise<Array>} - Promise com a lista de containers
 */
async function carregarContainersVistoriados(forceRefresh = false) {
  try {
    // Verificar cache local (válido por 1 minuto - tempo mais curto pois é crítico)
    const agora = new Date();
    if (
      !forceRefresh &&
      appState.containersVistoriadosCacheTime &&
      agora - appState.containersVistoriadosCacheTime < 60000 &&
      appState.containersVistoriadosCache &&
      appState.containersVistoriadosCache.length > 0
    ) {
      console.log("📦 Usando containers vistoriados do cache local");
      return appState.containersVistoriadosCache;
    }

    console.log("🔄 Buscando containers vistoriados do backend...");
    const response = await fetch(`/operacoes/containers/vistoriados?refresh=${forceRefresh}`);
    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      console.log(`✅ ${result.data.length} containers vistoriados carregados`);
      
      // Processar os containers para garantir que o modo de transporte seja definido
      const containersProcessados = result.data.map(container => {
        // Determinar o modo de transporte
        let modoTransporte = 'indefinido';
        if (container.vagao && container.vagao.trim()) {
          modoTransporte = 'ferroviaria';
          console.log(`🔍 Container ${container.numero} - Modo ferroviário detectado - vagão: '${container.vagao}'`);
        } else if (container.placa && container.placa.trim()) {
          modoTransporte = 'rodoviaria';
          console.log(`🔍 Container ${container.numero} - Modo rodoviário detectado - placa: '${container.placa}'`);
        } else {
          console.log(`⚠️ Container ${container.numero} - Modo indefinido - vagão: '${container.vagao || "vazio"}', placa: '${container.placa || "vazio"}'`);
        }
        
        // Log especial para o container TESTE123456
        if (container.numero === 'TESTE123456') {
          console.log(`🔍 DEBUG ESPECIAL - Container TESTE123456 detectado em carregarContainersVistoriados!`);
          console.log(`🔍 Vagão: '${container.vagao || "vazio"}', Placa: '${container.placa || "vazio"}'`);
          console.log(`🔍 Modo de transporte determinado: ${modoTransporte}`);
        }
        
        // Atualizar o objeto global de containers vistoriados
        if (window.containersVistoriados && typeof window.containersVistoriados === 'object') {
          window.containersVistoriados[container.numero] = {
            ...container,
            modoTransporte: modoTransporte
          };
        }
        
        return {
          ...container,
          modoTransporte: modoTransporte
        };
      });
      
      // Armazenar em cache
      appState.containersVistoriadosCache = containersProcessados;
      appState.containersVistoriadosCacheTime = agora;
      return containersProcessados;
    } else {
      console.error("❌ Erro ao carregar containers vistoriados:", result.error || "Formato de resposta inválido");
      throw new Error(result.error || "Erro desconhecido ao carregar containers vistoriados");
    }
  } catch (error) {
    console.error("❌ Erro na requisição de containers vistoriados:", error);
    throw error; // Propagar o erro para ser tratado por quem chamou a função
  }
}

/**
 * Busca a posição atual de um container específico
 * @param {string} containerNumero - Número do container
 * @returns {Object} Resultado da busca
 */
async function buscarPosicaoContainer(containerNumero) {
  try {
    console.log(`🔍 Buscando posição do container: ${containerNumero}`);

    const response = await fetch(
      `/operacoes/buscar_container?numero=${encodeURIComponent(
        containerNumero
      )}`
    );
    const result = await response.json();

    if (result.success && result.container) {
      return {
        success: true,
        posicao: result.container.posicao_atual,
        status: result.container.status,
      };
    } else {
      return {
        success: false,
        error: result.message || "Container não encontrado",
      };
    }
  } catch (error) {
    console.error("❌ Erro ao buscar posição do container:", error);
    return {
      success: false,
      error: "Erro de conexão",
    };
  }
}

/**
 * Configura combobox para containers
 * @param {HTMLElement} inputElement - Campo de input
 * @param {Array} containers - Lista de containers
 */
function criarComboboxContainers(inputElement, containers) {
  const wrapper = inputElement.closest(".combobox-wrapper");

  // Configurar funcionalidade de busca
  inputElement.setAttribute("autocomplete", "off");
  inputElement.addEventListener("input", function () {
    mostrarSugestoesContainers(this, containers);
  });

  inputElement.addEventListener("focus", function () {
    mostrarSugestoesContainers(this, containers);
  });

  // Event listener para buscar posição quando container for selecionado
  inputElement.addEventListener("change", async function () {
    const containerNumero = this.value.trim();
    if (containerNumero && containerNumero.length >= 4) {
      await atualizarPosicaoAtual(containerNumero);
    }
  });
}

/**
 * Mostra sugestões de containers baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 */
function mostrarSugestoesContainers(input, containers) {
  // Se o input tem o atributo data-selection-active, significa que acabamos de selecionar um item
  // Nesse caso, não mostramos as sugestões novamente e removemos o atributo
  if (input.getAttribute('data-selection-active') === 'true') {
    input.removeAttribute('data-selection-active');
    return;
  }

  // Remover lista existente
  const existingList = document.querySelector(".combobox-suggestions");
  if (existingList) existingList.remove();

  const termo = input.value.toUpperCase();

  // Filtrar containers disponíveis para movimentação (containers no pátio ou carregados)
  const containersFiltrados = containers
    .filter(
      (container) =>
        container.numero.toUpperCase().includes(termo) &&
        (container.status === "no patio" || container.status === "carregado") && // Containers no pátio ou carregados podem ser movimentados
        container.posicao_atual // E que tenham uma posição definida
    )
    .slice(0, 10); // Máximo 10 sugestões

  if (containersFiltrados.length === 0) return;

  // Criar lista de sugestões
  const suggestionsList = document.createElement("div");
  suggestionsList.className = "combobox-suggestions";

  containersFiltrados.forEach((container) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";

    item.innerHTML = `
      <div>
        <strong>${container.numero}</strong>
        <div class="suggestion-meta">Posição: ${container.posicao_atual}</div>
      </div>
      <div class="suggestion-meta">${container.status}</div>
    `;

    item.addEventListener("mouseenter", function () {
      this.style.backgroundColor = "var(--bg-glass)";
    });

    item.addEventListener("mouseleave", function () {
      this.style.backgroundColor = "white";
    });

    item.addEventListener("click", async function () {
      input.value = container.numero;
      input.classList.add("is-valid");
      
      // Definir flag que previne a reabertura imediata do dropdown
      input.setAttribute('data-selection-active', 'true');
      
      // Remover lista de sugestões
      suggestionsList.remove();

      // Buscar e preencher posição automaticamente
      await atualizarPosicaoAtual(container.numero);
      
      // Disparar evento de change para que outros listeners possam reagir
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Manter o foco no input, mas sem reabrir o dropdown
      input.focus();
    });

    suggestionsList.appendChild(item);
  });

  // Adicionar à página
  input.closest(".combobox-wrapper").appendChild(suggestionsList);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener("click", function closeSuggestions(e) {
      if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.remove();
        document.removeEventListener("click", closeSuggestions);
      }
    });
  }, 100);
}

/**
 * Mostra sugestões de containers vistoriados baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers vistoriados
 */
function mostrarSugestoesContainersVistoriados(input, containers) {
  // Se o input tem o atributo data-selection-active, significa que acabamos de selecionar um item
  // Nesse caso, não mostramos as sugestões novamente e removemos o atributo
  if (input.getAttribute('data-selection-active') === 'true') {
    input.removeAttribute('data-selection-active');
    return;
  }
  
  // Remover lista existente
  const existingList = document.querySelector(".combobox-suggestions");
  if (existingList) existingList.remove();

  const termo = input.value.trim().toUpperCase();
  // Mostrar todas as sugestões ao receber foco, ou filtrar se tiver digitado algo
  const mostrarTodas = termo.length === 0 && document.activeElement === input;

  // Filtrar containers vistoriados que correspondem ao termo ou mostrar todos
  const containersFiltrados = mostrarTodas ? containers : containers.filter(container => 
    container.numero.toUpperCase().includes(termo) || 
    (container.iso_container && container.iso_container.toUpperCase().includes(termo))
  );

  // Se não há resultados, não mostrar sugestões
  if (containersFiltrados.length === 0) return;
  
  // Log para depuração
  console.log(`🔍 Mostrando ${containersFiltrados.length} sugestões de containers vistoriados`);

  // Criar lista de sugestões
  const suggestionsList = document.createElement("div");
  suggestionsList.className = "combobox-suggestions";
  suggestionsList.style.cssText = `
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background-color: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    z-index: 1050;
  `;

  // Adicionar cada sugestão à lista (limitando a 8 sugestões)
  const maxSuggestions = Math.min(8, containersFiltrados.length);
  
  for (let i = 0; i < maxSuggestions; i++) {
    const container = containersFiltrados[i];
    
    // Determinar o modo de transporte para exibição
    let modoTransporte = "indefinido";
    let modoDisplay = "<span class='badge bg-warning'>Indefinido</span>";
    let icon = "<i class='fas fa-question-circle text-warning me-1'></i>";
    
    if (container.vagao && container.vagao.trim()) {
      modoTransporte = "ferroviaria";
      modoDisplay = "<span class='badge bg-primary'>Ferroviário</span>";
      icon = "<i class='fas fa-train text-primary me-1'></i>";
    } else if (container.placa && container.placa.trim()) {
      modoTransporte = "rodoviaria";
      modoDisplay = "<span class='badge bg-success'>Rodoviário</span>";
      icon = "<i class='fas fa-truck text-success me-1'></i>";
    }
    
    // Criar item de sugestão com informações relevantes
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;
    `;
    
    // Adicionar informações do container (número, ISO, capacidade, modo)
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <strong>${container.numero}</strong>
        <div>${icon} ${modoDisplay}</div>
      </div>
      <div class="text-muted small">
        ISO: ${container.iso_container || "-"} | 
        Capacidade: ${container.capacidade || "-"} | 
        Tara: ${container.tara || "-"} kg
      </div>
    `;

    // Adicionar evento de clique para selecionar o container
    item.addEventListener("click", () => {
      // Preencher o input com o número do container
      input.value = container.numero;
      
      // Definir flag que previne a reabertura imediata do dropdown
      input.setAttribute('data-selection-active', 'true');
      
      // Eliminar a lista de sugestões
      suggestionsList.remove();
      
      // Iniciar automaticamente a descarga para o container selecionado
      console.log(`🚛 Container selecionado: ${container.numero} - Iniciando descarga automaticamente`);
      console.log(`🔍 DEBUG - Dados do container selecionado:`, container);
      
      // Verificar se o objeto global window.containersVistoriados existe
      if (!window.containersVistoriados) {
        console.log(`⚠️ window.containersVistoriados não existe, inicializando...`);
        window.containersVistoriados = {};
      }
      
      // Determinar o modo de transporte
      let modoTransporte = 'indefinido';
      if (container.vagao && container.vagao.trim()) {
        modoTransporte = 'ferroviaria';
        console.log(`🔍 DEBUG - Container ${container.numero} - Modo ferroviário detectado - vagão: '${container.vagao}'`);
      } else if (container.placa && container.placa.trim()) {
        modoTransporte = 'rodoviaria';
        console.log(`🔍 DEBUG - Container ${container.numero} - Modo rodoviário detectado - placa: '${container.placa}'`);
      } else {
        console.log(`⚠️ ALERTA - Container ${container.numero} - Modo indefinido - vagão: '${container.vagao || "vazio"}', placa: '${container.placa || "vazio"}'`);
      }
      
      // Log especial para o container TESTE123456
      if (container.numero === 'TESTE123456') {
        console.log(`🔍 DEBUG ESPECIAL - Container TESTE123456 detectado em mostrarSugestoesContainersVistoriados!`);
        console.log(`🔍 Vagão: '${container.vagao || "vazio"}', Placa: '${container.placa || "vazio"}'`);
        console.log(`🔍 Modo de transporte determinado: ${modoTransporte}`);
      }
      
      // Armazenar dados do container para uso posterior
      if (!window.containersVistoriados) {
        window.containersVistoriados = {};
        console.log(`🔍 DEBUG - Criando objeto containersVistoriados`);
      }
      
      // Garantir que todos os campos necessários estejam presentes
      // IMPORTANTE: Verificar se já temos dados para este container
      if (window.containersVistoriados[container.numero]) {
        console.log(`🔍 DEBUG - Container ${container.numero} já existe em containersVistoriados, usando dados existentes`);
        console.log(`🔍 DEBUG - Dados existentes:`, window.containersVistoriados[container.numero]);
        
        // Atualizar apenas o modo de transporte se necessário
        if (window.containersVistoriados[container.numero].modoTransporte === 'indefinido' && modoTransporte !== 'indefinido') {
          console.log(`🔄 Atualizando modo de transporte de 'indefinido' para '${modoTransporte}'`);
          window.containersVistoriados[container.numero].modoTransporte = modoTransporte;
        }
      } else {
        // Criar novo registro para o container
        const containerData = {
          ...container,
          modoTransporte: modoTransporte,
          // Garantir que estes campos existam para evitar erros
          numero: container.numero,
          iso_container: container.iso_container || container.iso_code || '',
          capacidade: container.capacidade || '',
          tara: container.tara || '',
          data_vistoria: container.data_vistoria || '',
          vagao: container.vagao || '',
          placa: container.placa || ''
        };
        
        window.containersVistoriados[container.numero] = containerData;
        console.log(`✅ Novos dados do container armazenados:`, containerData);
      }
      
      // Log especial para o container TESTE123456
      if (container.numero === 'TESTE123456') {
        console.log(`🔍 DEBUG ESPECIAL - Container TESTE123456 detectado!`);
        console.log(`🔍 Vagão: '${container.vagao || "vazio"}', Placa: '${container.placa || "vazio"}'`);
        console.log(`🔍 Modo de transporte determinado: ${modoTransporte}`);
        console.log(`🔍 Dados completos:`, window.containersVistoriados[container.numero]);
      }
      
      // Iniciar descarga automaticamente
      setTimeout(() => {
        iniciarDescargaContainer(container.numero, modoTransporte);
      }, 100);
    });

    suggestionsList.appendChild(item);
  }

  // Adicionar contador se houver mais resultados
  if (containersFiltrados.length > maxSuggestions) {
    const moreItem = document.createElement("div");
    moreItem.style.cssText = `
      padding: 8px;
      text-align: center;
      font-size: 0.85rem;
      background-color: #f1f5f9;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    `;
    moreItem.textContent = `+${containersFiltrados.length - maxSuggestions} mais resultados. Continue digitando para refinar.`;
    suggestionsList.appendChild(moreItem);
  }

  // Adicionar à página
  input.closest(".combobox-wrapper").appendChild(suggestionsList);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener("click", function closeSuggestions(e) {
      if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.remove();
        document.removeEventListener("click", closeSuggestions);
      }
    });
  }, 100);
}

/**
 * Atualiza a posição atual do container automaticamente
 * @param {string} containerNumero - Número do container
 */
async function atualizarPosicaoAtual(containerNumero) {
  const posicaoField = document.getElementById("posicao_original");
  const statusIndicator = document.getElementById("posicao_status");

  if (!posicaoField || !containerNumero) return;

  // Mostrar indicador de carregamento
  posicaoField.value = "";
  posicaoField.placeholder = "Buscando posição...";
  statusIndicator.style.display = "block";
  statusIndicator.className = "status-indicator status-loading";
  statusIndicator.textContent = "Buscando...";

  try {
    const resultado = await buscarPosicaoContainer(containerNumero);

    if (resultado.success) {
      posicaoField.value = resultado.posicao || "Sem posição definida";
      posicaoField.placeholder = "Posição atual do container";

      statusIndicator.className = "status-indicator status-found";
      statusIndicator.textContent = "Encontrado";

      // Marcar como válido
      posicaoField.classList.remove("is-invalid");
      posicaoField.classList.add("is-valid");

      console.log(`✅ Posição encontrada: ${resultado.posicao}`);
    } else {
      posicaoField.value = "";
      posicaoField.placeholder = "Container não encontrado ou fora do pátio";

      statusIndicator.className = "status-indicator status-not-found";
      statusIndicator.textContent = "Não encontrado";

      // Marcar como inválido
      posicaoField.classList.remove("is-valid");
      posicaoField.classList.add("is-invalid");

      console.warn(`⚠️ ${resultado.error}`);
    }

    // Esconder indicador após 3 segundos
    setTimeout(() => {
      statusIndicator.style.display = "none";
    }, 3000);
  } catch (error) {
    console.error("❌ Erro ao buscar posição:", error);

    posicaoField.value = "";
    posicaoField.placeholder = "Erro ao buscar posição";

    statusIndicator.className = "status-indicator status-not-found";
    statusIndicator.textContent = "Erro";

    setTimeout(() => {
      statusIndicator.style.display = "none";
    }, 3000);
  }
}

/**
 * Atualiza lista de containers - função unificada
 * @param {string} tipo - Tipo de atualização: 'geral', 'consulta', 'carregamento'
 */
async function atualizarContainers(tipo = 'geral') {
  try {
    // Selecionar botões de refresh apropriados
    let refreshButtons = [];
    
    if (tipo === 'consulta') {
      refreshButtons = document.querySelectorAll("#form-consulta .btn-refresh");
    } else if (tipo === 'carregamento') {
      refreshButtons = document.querySelectorAll("#form-carregamento-rodoviario .btn-refresh, #form-carregamento-ferroviario .btn-refresh");
    } else {
      refreshButtons = document.querySelectorAll(".btn-refresh");
    }
    
    // Adicionar classe de animação a todos os botões de refresh
    refreshButtons.forEach(btn => {
      btn.classList.add("refreshing");
      btn.disabled = true;
    });

    console.log(`🔄 Atualizando lista de containers - Tipo: ${tipo}`);
    
    // Carregar containers apropriados
    let containers;
    if (tipo === 'carregamento') {
      containers = await carregarContainersDisponiveis(true);
    } else {
      containers = await carregarContainers(true);
    }

    // Atualizar comboboxes específicos
    if (tipo === 'geral' || tipo === 'consulta') {
      const inputConsulta = document.getElementById("container_consulta");
      if (inputConsulta) {
        criarComboboxContainers(inputConsulta, containers);
        console.log("✅ Combobox de consulta atualizado");
      }
      
      const inputMovimentacao = document.getElementById("container_movimentacao");
      if (inputMovimentacao) {

        statusIndicator.className = "status-indicator status-not-found";
        statusIndicator.textContent = "Erro";

        setTimeout(() => {
          statusIndicator.style.display = "none";
        }, 3000);
      }
    }

    /**
     * Atualiza lista de containers - função unificada
     * @param {string} tipo - Tipo de atualização: 'geral', 'consulta', 'carregamento'
     */
    async function atualizarContainers(tipo = 'geral') {
      try {
        // Selecionar botões de refresh apropriados
        let refreshButtons = [];
        
        if (tipo === 'consulta') {
          refreshButtons = document.querySelectorAll("#form-consulta .btn-refresh");
        } else {
          refreshButtons = document.querySelectorAll(".btn-refresh");
        }
        
        // Adicionar classe de animação a todos os botões de refresh
        refreshButtons.forEach(btn => {
          btn.classList.add("refreshing");
          btn.disabled = true;
    return false;
  }
}

// ========================================
// GESTÃO DE PLACAS
// ========================================

/**
 * Carrega placas da planilha OneDrive com cache local
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Array} Lista de placas
 */
async function carregarPlacas(forceRefresh = false) {
  try {
    // Verificar cache local (válido por 5 minutos)
    const agora = new Date();
    if (
      !forceRefresh &&
      appState.placasCacheTime &&
      agora - appState.placasCacheTime < 300000 &&
      appState.placasCache.length > 0
    ) {
      console.log("📋 Usando placas do cache local");
      return appState.placasCache;
    }

    console.log("🔄 Carregando placas da planilha OneDrive...");

    const response = await fetch(
      `/api/sharepoint/placas/lista${forceRefresh ? "?refresh=true" : ""}`
    );
    const result = await response.json();

    if (result.success) {
      appState.placasCache = result.data;
      appState.placasCacheTime = agora;
      console.log(`✅ ${result.data.length} placas carregadas`);
      return result.data;
    } else {
      console.error("❌ Erro ao carregar placas:", result.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Erro na requisição de placas:", error);
    return [];
  }
}

/**
 * Configura combobox para placas
 * @param {HTMLElement} inputElement - Campo de input
 * @param {Array} placas - Lista de placas
 */
function criarComboboxPlacas(inputElement, placas) {
  const container = inputElement.parentElement;

  // Criar wrapper para o combobox
  const wrapper = document.createElement("div");
  wrapper.className = "combobox-wrapper";
  wrapper.style.position = "relative";

  // Substituir input por combobox
  inputElement.parentNode.insertBefore(wrapper, inputElement);
  wrapper.appendChild(inputElement);

  // Adicionar funcionalidade de busca
  inputElement.setAttribute("autocomplete", "off");
  inputElement.addEventListener("input", function () {
    mostrarSugestoesPlacas(this, placas);
  });

  inputElement.addEventListener("focus", function () {
    mostrarSugestoesPlacas(this, placas);
  });

  // Adicionar ícone de refresh
  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.className = "btn-refresh-placas";
  refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  refreshBtn.title = `Atualizar placas da planilha (${placas.length} placas disponíveis)`;

  refreshBtn.addEventListener("click", async function () {
    // Desabilitar botão e adicionar animação
    this.disabled = true;
    this.classList.add("refreshing");
    
    console.log("🔄 Atualizando lista de placas da planilha...");
    
    try {
      const novasPlacas = await carregarPlacas(true);
      await atualizarTodosComboboxes();
      
      console.log(`✅ ${novasPlacas.length} placas atualizadas com sucesso`);
      
      // Remover classe de animação, reativar botão e adicionar feedback de sucesso
      this.classList.remove("refreshing");
      this.disabled = false;
      this.classList.add("refresh-success");
      this.title = `Atualizar placas da planilha (${novasPlacas.length} placas disponíveis)`;
      
      setTimeout(() => {
        this.classList.remove("refresh-success");
      }, 1000);
      
      // Mostrar notificação de sucesso apenas se houver placas
      if (novasPlacas.length > 0) {
        Swal.fire({
          icon: "success",
          title: "Placas atualizadas!",
          text: `${novasPlacas.length} placas carregadas da planilha`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "warning",
          title: "Nenhuma placa encontrada",
          text: "Verifique se a planilha de placas está corretamente configurada.",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar placas:", error);
      this.classList.remove("refreshing");
      this.disabled = false;
      
      Swal.fire({
        icon: "error",
        title: "Erro ao atualizar placas",
        text: "Ocorreu um erro ao tentar atualizar as placas. Tente novamente.",
        confirmButtonColor: "#d33",
      });
    }
  });

  wrapper.appendChild(refreshBtn);
}

/**
 * Mostra sugestões de placas baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} placas - Lista de placas
 */
function mostrarSugestoesPlacas(input, placas) {
  // Remover lista existente
  const existingList = document.querySelector(".placas-suggestions");
  if (existingList) existingList.remove();

  const termo = input.value.toUpperCase();

  // Filtrar todas as placas que correspondem ao termo
  const todasPlacasFiltradas = placas.filter((placa) => 
    placa.toUpperCase().includes(termo)
  );
  
  // Limitar a exibição para 15 sugestões (aumentado de 8)
  const placasFiltradas = todasPlacasFiltradas.slice(0, 15);

  if (placasFiltradas.length === 0) return;

  // Criar lista de sugestões
  const suggestionsList = document.createElement("div");
  suggestionsList.className = "placas-suggestions";
  suggestionsList.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 2px;
  `;

  placasFiltradas.forEach((placa) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = placa;
    item.style.cssText = `
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s;
    `;

    item.addEventListener("mouseenter", function () {
      this.style.backgroundColor = "#f8fafc";
    });

    item.addEventListener("mouseleave", function () {
      this.style.backgroundColor = "white";
    });

    item.addEventListener("click", function () {
      input.value = placa;
      input.classList.add("is-valid");
      suggestionsList.remove();
      input.focus();
    });

    suggestionsList.appendChild(item);
  });

  // Adicionar indicador de total se houver mais resultados
  if (todasPlacasFiltradas.length > placasFiltradas.length) {
    const infoItem = document.createElement("div");
    infoItem.className = "suggestion-info";
    infoItem.textContent = `Mostrando ${placasFiltradas.length} de ${todasPlacasFiltradas.length} placas. Digite mais letras para filtrar.`;
    infoItem.style.cssText = `
      padding: 8px 15px;
      font-size: 0.85rem;
      text-align: center;
      background-color: #f1f5f9;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    `;
    suggestionsList.appendChild(infoItem);
  }
  
  // Adicionar à página
  input.parentElement.appendChild(suggestionsList);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener("click", function closeSuggestions(e) {
      if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.remove();
        document.removeEventListener("click", closeSuggestions);
      }
    });
  }, 100);
}

/**
 * Atualiza todos os comboboxes de placas
 */
async function atualizarTodosComboboxes() {
  const placas = await carregarPlacas();

  // Atualizar todos os campos de placa existentes
  const camposPlaca = document.querySelectorAll('input[name="placa"]');
  camposPlaca.forEach((campo) => {
    // Limpar sugestões existentes
    const suggestions = campo.parentElement.querySelector(
      ".placas-suggestions"
    );
    if (suggestions) suggestions.remove();
  });
}

/**
 * Inicializa comboboxes de placas
 */
async function inicializarComboboxesPlacas() {
  console.log("🔧 Inicializando comboboxes de placas...");

  const placas = await carregarPlacas();

  if (placas.length === 0) {
    console.warn("⚠️ Nenhuma placa carregada - usando campos de texto normais");
    return;
  }

  // Configurar todos os campos de placa
  const camposPlaca = document.querySelectorAll('input[name="placa"]');
  camposPlaca.forEach((campo) => {
    criarComboboxPlacas(campo, placas);
  });

  console.log(`✅ ${camposPlaca.length} comboboxes de placas configurados`);
}

/**
 * Inicializa comboboxes de containers vistoriados
 * @returns {Promise<Object>} Promise com resultado da inicialização
 */
async function inicializarComboboxesContainersVistoriados() {
  try {
    console.log("Inicializando comboboxes de containers vistoriados...");
    
    // Carregar containers vistoriados
    const containersVistoriados = await carregarContainersVistoriados(true);
    
    if (!containersVistoriados || !Array.isArray(containersVistoriados)) {
      console.warn("Não foi possível carregar containers vistoriados ou lista vazia");
      return { success: false, error: "Lista de containers vazia ou inválida" };
    }
    
    console.log(`✅ ${containersVistoriados.length} containers vistoriados carregados para comboboxes`);
    
    // Configurar comboboxes para campos de containers vistoriados
    const camposContainersVistoriados = document.querySelectorAll('.container-vistoriado-input');
    
    if (camposContainersVistoriados.length > 0) {
      camposContainersVistoriados.forEach(campo => {
        criarComboboxContainers(campo, containersVistoriados);
      });
      console.log(`✅ ${camposContainersVistoriados.length} comboboxes de containers vistoriados configurados`);
    } else {
      console.log("Nenhum campo de container vistoriado encontrado para configurar combobox");
    }
    
    return { success: true, containers: containersVistoriados };
  } catch (error) {
    console.error("Erro ao inicializar comboboxes de containers vistoriados:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// FUNÇÕES DE NAVEGAÇÃO PRINCIPAIS
// ========================================

/**
 * Faz scroll otimizado para mostrar todo o formulário ou elemento
 * @param {HTMLElement} elemento - Elemento para fazer scroll
 */
function scrollToFormulario(elemento) {
  if (!elemento) return;
  
  console.log("📜 Iniciando scroll otimizado para formulário...");
  
  // Verificar se o elemento está visível
  const rect = elemento.getBoundingClientRect();
  const elementoVisivel = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
  
  // Se o elemento não estiver completamente visível, fazer scroll
  if (!elementoVisivel) {
    // Primeiro, scroll para o elemento com offset para garantir visibilidade
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - 100), // 100px de margem no topo
      behavior: 'smooth'
    });
    
    console.log("📜 Aplicando scroll principal para o elemento");
  }
  
  // Depois de um pequeno delay, adicionar scroll extra para garantir visibilidade completa
  setTimeout(() => {
    // Calcular a altura do viewport
    const viewportHeight = window.innerHeight;
    const elementoAltura = elemento.offsetHeight;
    
    // Se o elemento for maior que 70% da altura da tela, garantir que pelo menos o topo seja visível
    if (elementoAltura > viewportHeight * 0.7) {
      const novoRect = elemento.getBoundingClientRect();
      if (novoRect.top > 100) { // Se o topo estiver muito abaixo
        window.scrollTo({
          top: Math.max(0, window.scrollY + novoRect.top - 100),
          behavior: 'smooth'
        });
      }
    } else {
      // Para elementos menores, tentar centralizar
      const novoRect = elemento.getBoundingClientRect();
      const centroElemento = novoRect.top + (elementoAltura / 2);
      const centroViewport = viewportHeight / 2;
      
      if (Math.abs(centroElemento - centroViewport) > 100) { // Se estiver longe do centro
        window.scrollTo({
          top: window.scrollY + (centroElemento - centroViewport),
          behavior: 'smooth'
        });
      }
    }
    
    console.log("✅ Scroll otimizado concluído");
  }, 400); // Delay otimizado para garantir que o primeiro scroll termine
}

/**
 * Esconde todas as operações
 */
function hideAllOperations() {
  console.log("Escondendo todas as operações...");
  
  // Lista de todas as possíveis operações
  const operationIds = [
    'operacao-descarga',
    'operacao-carregamento',
    'operacao-movimentacao',
    'operacao-consultar',
    'operacao-patio3d'
  ];
  
  // Esconder cada operação
  operationIds.forEach(id => {
    const operacao = document.getElementById(id);
    if (operacao) {
      operacao.style.display = 'none';
    }
  });
  
  // Também esconder qualquer elemento com classe 'operacao-content'
  const allOperations = document.querySelectorAll('.operacao-content');
  allOperations.forEach(op => {
    op.style.display = 'none';
  });
}

/**
 * Mostra uma seção de operação específica
 * @param {string} operation - Nome da operação
 */
function showOperationSection(operation) {
  const operationElement = document.getElementById(`operacao-${operation}`);
  if (operationElement) {
    operationElement.style.display = 'block';
    console.log(`Operação ${operation} exibida`);
  } else {
    console.error(`Elemento 'operacao-${operation}' não encontrado no DOM`);
  }
}

/**
 * Esconde a seleção inicial de operações
 */
function esconderSelecaoInicial() {
  const selecioneOperacao = document.getElementById('selecione-operacao');
  if (selecioneOperacao) {
    selecioneOperacao.style.display = 'none';
  }
}

/**
 * Ativa o botão de operação correspondente
 * @param {string} operation - Nome da operação
 */
function activateOperationButton(operation) {
  // Remover classe ativa de todos os botões de operação
  const allOperationButtons = document.querySelectorAll('.operacao-btn');
  allOperationButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Adicionar classe ativa ao botão selecionado
  const selector = `.operacao-btn[data-operacao="${operation}"]`;
  const activeButton = document.querySelector(selector);
  
  if (activeButton) {
    activeButton.classList.add('active');
    console.log(`Botão de operação ativado: ${operation}`);
  } else {
    console.warn(`Botão de operação não encontrado: ${operation}`);
  }
}



/**
 * Mostra uma operação específica
 * @param {string} operation - Nome da operação
 */
function mostrarOperacao(operation) {
  try {
    console.log(`📱 Mostrando operação: ${operation}`);

    hideAllOperations();
    hideAllForms();
    esconderSelecaoInicial();
    clearPreviousState();

    appState.currentOperation = operation;
    appState.currentMode = null;

    // ================================
    // IMPORTAÇÃO DINÂMICA DO MÓDULO DA OPERAÇÃO
    // Caso exista um módulo dedicado, delegamos a lógica principal para ele.
    // ================================
    const moduleMap = {
      'descarga': './dashboard-descarga.js',            // já existia
      'carregamento': './modules/carregamento.js',      // novo módulo
      'movimentacao': './modules/movimentacao.js',      // novo módulo
      'consultar': './modules/consulta.js'              // novo módulo
    };

    if (moduleMap[operation]) {
      import(moduleMap[operation])
        .then(mod => {
          if (mod && typeof mod.init === 'function') {
            console.log(`🔌 Módulo de operação '${operation}' importado com sucesso.`);
            mod.init({ appState });
          } else {
            console.warn(`⚠️ Módulo de operação '${operation}' não expôs função 'init'.`);
          }
        })
        .catch(err => {
          console.error(`❌ Erro ao carregar módulo '${operation}':`, err);
        });
    }
    appState.activeForm = null;

    activateOperationButton(operation);
    
    // Mostrar a seção de operação com um pequeno delay para garantir que o DOM foi atualizado
    setTimeout(() => {
      showOperationSection(operation);
      
      // Scroll para a operação em si, independente de qual seja
      const operacaoElement = document.getElementById(`operacao-${operation}`);
      if (operacaoElement) {
        operacaoElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`📜 Scroll aplicado para operacao-${operation}`); 
      }
      
      if (operation === 'carregamento') {
        // ===== TRATAMENTO ESPECIAL PARA CARREGAMENTO =====
        console.log(`💡 Iniciando sequência de rolagem para Carregamento`);
        
        // Scroll adicional para garantir que as sub-opções sejam visíveis
        setTimeout(() => {
          const subOpcoes = document.querySelector(`#operacao-${operation} .sub-opcoes`);
          if (subOpcoes) {
            scrollToFormulario(subOpcoes);
            console.log(`✅ Scroll adicional aplicado para sub-opções de carregamento`); 
          }
        }, 300);
      } else if (operation === 'movimentacao') {
        // ===== TRATAMENTO ESPECIAL PARA MOVIMENTAÇÃO =====
        console.log(`💡 Iniciando sequência especial de rolagem para Movimentação`);
        
        // Fase 1: Mostrar a seção de operação
        const operacaoElement = document.getElementById(`operacao-${operation}`);
        if (operacaoElement) {
          // Primeiro scrol para a operação em si
          operacaoElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Fase 2: Ativar e mostrar o formulário de movimentação (250ms depois)
        setTimeout(() => {
          // Mostrar o formulário diretamente (sem delay interno)
          const formMovimentacao = document.getElementById('form-movimentacao');
          if (formMovimentacao) {
            console.log(`📱 Mostrando formulário de movimentação`); 
            formMovimentacao.classList.add('show');
            formMovimentacao.style.display = 'block';
            appState.activeForm = 'form-movimentacao';
            
            // Scroll otimizado para o formulário de movimentação
            setTimeout(() => {
              scrollToFormulario(formMovimentacao);
            }, 150);
          }
          
          // Atualizar o container_movimentacao para ter as opções atualizadas
          try {
            carregarContainers(true).then(containers => {
              if (containers && containers.length > 0) {
                // Configurar o combobox com containers atualizados
                const containerInput = document.getElementById('container_movimentacao');
                if (containerInput) {
                  criarComboboxContainers(containerInput, containers);
                }
              }
            });
          } catch (e) {
            console.error("Erro ao carregar containers para movimentação:", e);
          }
        }, 250);
      } else if (operation === 'consultar') {
        // ===== TRATAMENTO PARA CONSULTA DE CONTAINER =====
        console.log(`💡 Iniciando operação de consulta de container`);
        
        // Garantir que o formulário de consulta esteja visível
        const consultaContainer = document.getElementById('operacao-consultar');
        if (consultaContainer) {
          consultaContainer.style.display = 'block';
          
          // Focar no campo de consulta após um pequeno delay
          setTimeout(() => {
            const containerInput = document.getElementById('container_consulta');
            if (containerInput) {
              containerInput.focus();
              console.log('✅ Campo de consulta de container em foco');
              
              // Tentar inicializar o combobox usando a função do módulo search-container.js
              if (typeof window.inicializarComboboxConsulta === 'function') {
                console.log('🔧 Chamando inicializarComboboxConsulta do módulo search-container.js');
                window.inicializarComboboxConsulta();
              } else {
                // Fallback: Carregar containers e configurar combobox diretamente
                console.log('⚠️ Função inicializarComboboxConsulta não disponível, usando método alternativo');
                carregarContainers(true).then(containers => {
                  if (containers && containers.length > 0) {
                    // Configurar o combobox com containers atualizados
                    if (typeof window.criarComboboxContainers === 'function') {
                      window.criarComboboxContainers(containerInput, containers);
                      console.log('✅ Combobox de sugestões de containers configurado via fallback');
                    } else {
                      console.error('❌ Função criarComboboxContainers não disponível');
                    }
                  }
                }).catch(error => {
                  console.error('❌ Erro ao carregar containers para consulta:', error);
                });
              }
            }
          }, 300);
          
          // Scroll para o formulário de consulta
          scrollToFormulario(consultaContainer);
          console.log('✅ Operação de consulta de container inicializada');
        } else {
          console.error('❌ Elemento operacao-consultar não encontrado no DOM');
        }
      } else if (operation === 'descarga') {
        // ===== NOVA LÓGICA SIMPLIFICADA PARA DESCARGA =====
        console.log(`💡 Iniciando descarga com detecção automática de modo de transporte`);
        
        // Mostrar área de loading enquanto carregamos os containers vistoriados
        const descargaContainer = document.getElementById('descarga-formulario-container');
        console.log(`🔍 Elemento descarga-formulario-container encontrado:`, descargaContainer);
        
        if (descargaContainer) {
          descargaContainer.innerHTML = `
            <div class="text-center p-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
              </div>
              <p class="mt-2">Carregando containers vistoriados...</p>
            </div>
          `;
          descargaContainer.style.display = 'block';
          console.log(`✅ Loading exibido no container de descarga`);
        } else {
          console.error(`❌ Elemento 'descarga-formulario-container' não encontrado no DOM`);
        }
        
        // Carregar containers vistoriados e configurar formulário único
        console.log(`🔄 Iniciando carregamento de containers vistoriados...`);
        carregarContainersVistoriados(true)
          .then(containers => {
            console.log(`📦 Containers vistoriados carregados:`, containers.length, containers);
            
            if (containers.length === 0) {
              // Se não houver containers vistoriados
              console.log(`⚠️ Nenhum container vistoriado encontrado`);
              if (descargaContainer) {
                descargaContainer.innerHTML = `
                  <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Não há containers vistoriados disponíveis para descarga.
                  </div>
                `;
              }
              
              // Scroll para mostrar a mensagem de aviso
              setTimeout(() => {
                scrollToFormulario(descargaContainer);
              }, 200);
              
              return;
            }
            
            // Configurar formulário único de descarga
            console.log(`🔧 Chamando configurarFormularioDescargaUnico com ${containers.length} containers`);
            configurarFormularioDescargaUnico(containers);
            
            // Scroll otimizado para mostrar todo o formulário após carregamento
            setTimeout(() => {
              scrollToFormulario(descargaContainer);
            }, 400);
          })
          .catch(error => {
            console.error("❌ Erro ao carregar containers vistoriados:", error);
            if (descargaContainer) {
              descargaContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                  <i class="fas fa-exclamation-circle me-2"></i>
                  Erro ao carregar containers vistoriados. Tente novamente.
                </div>
              `;
              
              // Scroll para mostrar a mensagem de erro
              setTimeout(() => {
                scrollToFormulario(descargaContainer);
              }, 200);
            }
          });
      } else if (operation === 'consultar') {
        console.log(`💡 Iniciando sequência especial para Consulta`);
        
        // Mostrar o formulário de consulta após um breve delay
        setTimeout(() => {
          const formConsulta = document.getElementById('form-consulta');
          if (formConsulta) {
            console.log(`📱 Mostrando formulário de consulta`); 
            formConsulta.classList.add('show');
            formConsulta.style.display = 'block';
            appState.activeForm = 'form-consulta';
            
            // Scroll otimizado para o formulário de consulta
            setTimeout(() => {
              scrollToFormulario(formConsulta);
            }, 150);
          }
        }, 200);
      } else if (operation === 'patio3d') {
        // Redirecionar para a página de visualização 3D
        console.log(`💡 Redirecionando para Visualização 3D`);
        window.location.href = '/visualizacao_patio';
      }
    }, 50);

    // Log de fluxo de navegação
    console.log(`📍 Mostrada operação: ${operation}`);
    return true;
  } catch (error) {
    console.error("Erro ao mostrar operação:", error);
    return false;
  }
}

/**
 * Obtém o ID do formulário com base na operação e modo
 * @param {string} operation - Nome da operação
 * @param {string} mode - Modo (rodoviaria/ferroviaria)
 * @returns {string} ID do formulário
 */
function getFormId(operation, mode) {
  // Mapear operação e modo para o ID do formulário correspondente
  if (operation === 'carregamento') {
    if (mode === 'rodoviaria') {
      return 'form-carregamento-rodoviario';
    } else if (mode === 'ferroviaria') {
      return 'form-carregamento-ferroviario';
    }
  }
  
  // Caso padrão: formatar ID com base na operação e modo
  return `form-${operation}-${mode}`;
}

/**
 * Esconde todos os formulários
 */
function hideAllForms() {
  console.log("Escondendo todos os formulários...");
  
  // Lista de todos os possíveis IDs de formulários
  const formIds = [
    'form-carregamento-rodoviario',
    'form-carregamento-ferroviario',
    'form-descarga-rodoviaria',
    'form-descarga-ferroviaria',
    'form-movimentacao',
    'form-consulta'
  ];
  
  // Esconder cada formulário
  formIds.forEach(id => {
    const form = document.getElementById(id);
    if (form) {
      form.style.display = 'none';
      form.classList.remove('show');
    }
  });
  
  // Também esconder qualquer elemento com classe 'operacao-form'
  const allForms = document.querySelectorAll('.operacao-form');
  allForms.forEach(form => {
    form.style.display = 'none';
    form.classList.remove('show');
  });
}

/**
 * Limpa todos os formulários, removendo valores e estados de validação.
 */
function clearAllForms() {
  console.log("🧹 Limpando todos os formulários...");

  // IDs explícitos dos formulários conhecidos
  const formIds = [
    'form-carregamento-rodoviario',
    'form-carregamento-ferroviario',
    'form-descarga-rodoviaria',
    'form-descarga-ferroviaria',
    'form-movimentacao',
    'form-consulta'
  ];

  // Limpar formulários pelos IDs
  formIds.forEach(id => {
    const form = document.getElementById(id);
    if (form) {
      resetFormElement(form);
    }
  });

  // Como fallback, limpar também qualquer elemento com a classe .operacao-form
  document.querySelectorAll('.operacao-form').forEach(form => {
    if (form && !formIds.includes(form.id)) {
      resetFormElement(form);
    }
  });

  console.log("✅ Todos os formulários foram limpos");

  // Função auxiliar para resetar um form e remover estados de validação
  function resetFormElement(form) {
    // Resetar campos nativos
    if (typeof form.reset === 'function') {
      form.reset();
    }

    // Remover estados de validação Bootstrap
    form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
    });

    // Limpar mensagens de feedback que não são estáticas
    form.querySelectorAll('.invalid-feedback, .valid-feedback').forEach(fb => {
      fb.innerHTML = '';
    });
  }
}

/**
 * Ativa o botão de sub-opção correspondente
 * @param {string} operation - Nome da operação
 * @param {string} mode - Modo (rodoviaria/ferroviaria)
 */
function activateSubOptionButton(operation, mode) {
  // Remover classe ativa de todos os botões de sub-opção
  const allSubOptions = document.querySelectorAll('.sub-opcao-btn');
  allSubOptions.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Adicionar classe ativa ao botão selecionado
  const selector = `.sub-opcao-btn[onclick*="mostrarSubOpcao('${operation}', '${mode}')"]`;
  const activeButton = document.querySelector(selector);
  
  if (activeButton) {
    activeButton.classList.add('active');
    console.log(`Botão de sub-opção ativado: ${operation} - ${mode}`);
  } else {
    console.warn(`Botão de sub-opção não encontrado: ${operation} - ${mode}`);
  }
}

/**
 * Mostra um formulário específico
 * @param {string} formId - ID do formulário a ser mostrado
 */
function showForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.style.display = 'block';
    form.classList.add('show');
    
    // Garantir que o formulário seja visível
    setTimeout(() => {
      // Verificar se o formulário está realmente visível
      const computedStyle = window.getComputedStyle(form);
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        console.warn(`Formulário ${formId} não está visível mesmo após tentativa de exibição`);
        // Forçar exibição
        form.style.display = 'block !important';
        form.style.visibility = 'visible !important';
        form.style.opacity = '1 !important';
      } else {
        console.log(`Formulário ${formId} está visível corretamente`);
      }
    }, 100);
  } else {
    console.error(`Formulário com ID '${formId}' não encontrado no DOM`);
  }
}

/**
 * Mostra uma sub-opção específica
 * @param {string} operation - Nome da operação
 * @param {string} mode - Modo (rodoviaria/ferroviaria)
 */
function mostrarSubOpcao(operation, mode) {
  console.log(`📱 Sub-opção: ${operation} - ${mode}`);

  hideAllForms();
  activateSubOptionButton(operation, mode);

  const formId = getFormId(operation, mode);

  appState.currentMode = mode;
  appState.activeForm = formId;

  console.log(
    `📊 Estado atualizado - Modo: ${appState.currentMode}, Form: ${appState.activeForm}`
  );

  setTimeout(() => {
    showForm(formId);
    console.log(`✅ Formulário ${formId} exibido`);
    
    // Scroll otimizado para o formulário exibido
    setTimeout(() => {
      const formElement = document.getElementById(formId);
      if (formElement) {
        scrollToFormulario(formElement);
        console.log(`✅ Scroll otimizado aplicado ao formulário: ${formId}`);
      }
    }, 200); // Delay otimizado para garantir que o conteúdo foi renderizado
  }, 50);
}

/**
 * Volta para o início
 */
function voltarInicio() {
  console.log("🏠 Voltando ao início");

  hideAllOperations();
  hideAllForms();
  clearPreviousState();

  appState = {
    currentOperation: null,
    currentMode: null,
    activeForm: null,
    placasCache: appState.placasCache, // Manter cache
    placasCacheTime: appState.placasCacheTime,
    containersCache: appState.containersCache, // Manter cache
    containersCacheTime: appState.containersCacheTime,
    containersVistoriadosCache: appState.containersVistoriadosCache, // Manter cache
    containersVistoriadosCacheTime: appState.containersVistoriadosCacheTime,
  };

  setTimeout(() => {
    showInitialSelection();
    console.log("✅ Voltou ao estado inicial");
  }, 50);

  clearAllForms();
}
/**
 * Configura o formulário de descarga único
 * @param {Array} containers - Lista de containers vistoriados
 */
async function configurarFormularioDescargaUnico(containers) {
  try {
    console.log("🔧 Configurando formulário de descarga único...");
    console.log(`🔍 DEBUG - configurarFormularioDescargaUnico chamada com ${containers ? containers.length : 0} containers:`, containers);
    
    // Obter o container para descarga
    const descargaContainer = document.getElementById("descarga-formulario-container");
    if (!descargaContainer) {
      console.error("❌ Elemento 'descarga-formulario-container' não encontrado");
      return;
    }
    
    console.log(`🔍 DEBUG - Elemento descarga-formulario-container encontrado:`, descargaContainer);
    
    // Armazenar os dados dos containers para uso posterior
    window.containersVistoriados = {};
    containers.forEach(container => {
      // Determinar o modo de transporte com base na presença de vagão ou placa
      let modoTransporte = 'indefinido';
      if (container.vagao && container.vagao.trim()) {
        modoTransporte = 'ferroviaria';
        console.log(`🔍 DEBUG - Container ${container.numero} - Modo ferroviário detectado - vagão: '${container.vagao}'`);
      } else if (container.placa && container.placa.trim()) {
        modoTransporte = 'rodoviaria';
        console.log(`🔍 DEBUG - Container ${container.numero} - Modo rodoviário detectado - placa: '${container.placa}'`);
      }
      
      // Log especial para o container TESTE123456
      if (container.numero === 'TESTE123456') {
        console.log(`🔍 DEBUG ESPECIAL - Container TESTE123456 detectado em configurarFormularioDescargaUnico!`);
        console.log(`🔍 Vagão: '${container.vagao || "vazio"}', Placa: '${container.placa || "vazio"}'`);
        console.log(`🔍 Modo de transporte determinado: ${modoTransporte}`);
      }
      
      window.containersVistoriados[container.numero] = {
        ...container,
        modoTransporte: modoTransporte
      };
    });
    
    console.log("📋 Containers processados:", window.containersVistoriados);
    
    // Criar elementos da interface com combobox simplificado
    descargaContainer.innerHTML = `
      <div class="container-fluid p-0">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="card-title mb-0">
              <i class="fas fa-box-open me-2"></i> Selecione um Container para Descarga
            </h5>
          </div>
          <div class="card-body">
            <p class="card-text mb-4">
              <i class="fas fa-info-circle me-2 text-primary"></i>
              Digite ou selecione um container vistoriado na lista para iniciar a operação de descarga.
            </p>
            
            <div class="row mb-4">
              <div class="col-md-8 col-lg-6 mx-auto">
                <div class="combobox-wrapper position-relative">
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="fas fa-search text-muted"></i>
                    </span>
                    <input 
                      type="text" 
                      id="container_descarga" 
                      class="form-control form-control-lg" 
                      placeholder="Buscar e selecionar container vistoriado (ex: TEST123456)" 
                      autocomplete="off"
                    >
                  </div>
                  <small class="form-text text-muted mt-2">
                    <i class="fas fa-lightbulb me-1"></i>
                    Clique em um container da lista para iniciar a descarga automaticamente
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Configurar combobox de containers vistoriados
    const containerInput = document.getElementById("container_descarga");
    
    if (!containerInput) {
      console.error("❌ Campo de busca de container não encontrado");
      return;
    }
    
    console.log("✅ Campo de busca configurado - seleção automática ativada");
    
    // Configurar evento de input e focus para mostrar sugestões
    containerInput.addEventListener("input", function() {
      mostrarSugestoesContainersVistoriados(this, containers);
    });
    
    containerInput.addEventListener("focus", function() {
      mostrarSugestoesContainersVistoriados(this, containers);
    });
    
    console.log("✅ Formulário de descarga único configurado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao configurar formulário de descarga único:", error);
    
    // Exibir mensagem de erro para o usuário
    const descargaContainer = document.getElementById("descarga-formulario-container");
    if (descargaContainer) {
      descargaContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <i class="fas fa-exclamation-circle me-2"></i>
          Erro ao configurar formulário de descarga. Tente novamente.
        </div>
      `;
    }
  }
}

/**
 * Inicia o processo de descarga para um container específico
 * @param {string} containerNumero - Número do container
 * @param {string} modoTransporte - Modo de transporte (ferroviaria/rodoviaria)
 */
function iniciarDescargaContainer(containerNumero, modoTransporte) {
  try {
    console.log(`🚛 Iniciando descarga do container ${containerNumero} - Modo: ${modoTransporte}`);
    console.log(`🔍 DEBUG - Dados completos do container:`, JSON.stringify(window.containersVistoriados || {}));
    
    const descargaContainer = document.getElementById("descarga-formulario-container");
    if (!descargaContainer) {
      console.error("❌ Container de descarga não encontrado");
      return;
    }
    
    // Obter dados do container selecionado
    console.log(`🔍 DEBUG - Buscando dados para o container: ${containerNumero}`);
    console.log(`🔍 DEBUG - containersVistoriados disponível:`, window.containersVistoriados ? 'Sim' : 'Não');
    
    // CORREÇÃO: Verificar se os dados do container existem, caso contrário, recarregar
    if (!window.containersVistoriados || !window.containersVistoriados[containerNumero]) {
      console.log(`⚠️ ALERTA - Dados do container ${containerNumero} não encontrados, tentando recarregar...`);
      
      // Tentar recarregar os dados dos containers
      return carregarContainersVistoriados(true)
        .then(containers => {
          // Processar os containers para garantir que o modo de transporte seja definido
          containers.forEach(container => {
            if (container.numero === containerNumero) {
              console.log(`🔄 Recarregando dados para ${containerNumero}:`, container);
              
              // Determinar o modo de transporte
              let modoTransporte = 'indefinido';
              if (container.vagao && container.vagao.trim()) {
                modoTransporte = 'ferroviaria';
                console.log(`🔄 Modo de transporte corrigido para ferroviaria - vagão: '${container.vagao}'`);
              } else if (container.placa && container.placa.trim()) {
                modoTransporte = 'rodoviaria';
                console.log(`🔄 Modo de transporte corrigido para rodoviaria - placa: '${container.placa}'`);
              }
              
              // Atualizar o objeto containersVistoriados
              window.containersVistoriados[containerNumero] = {
                ...container,
                modoTransporte: modoTransporte
              };
              
              // Chamar novamente esta função com os dados atualizados
              setTimeout(() => {
                iniciarDescargaContainer(containerNumero, modoTransporte);
              }, 100);
            }
          });
        })
        .catch(error => {
          console.error(`❌ Erro ao recarregar dados do container:`, error);
          Swal.fire({
            icon: "error",
            title: "Erro ao iniciar descarga",
            text: `Não foi possível carregar os dados do container ${containerNumero}. Tente novamente.`,
            confirmButtonText: "OK",
            confirmButtonColor: "#d33"
          });
        });
    }
    
    const containerData = window.containersVistoriados[containerNumero];
    console.log(`🔍 Dados encontrados para ${containerNumero}:`, containerData);
    
    // Log especial para o container TESTE123456
    if (containerNumero === 'TESTE123456') {
      console.log(`🔍 DEBUG ESPECIAL - Container TESTE123456 detectado em iniciarDescargaContainer!`);
      console.log(`🔍 Vagão: '${containerData.vagao || "vazio"}', Placa: '${containerData.placa || "vazio"}'`);
      console.log(`🔍 Modo de transporte determinado: ${modoTransporte}`);
      console.log(`🔍 Dados completos:`, window.containersVistoriados[containerNumero]);
      if (containerData) {
        console.log(`🔍 Vagão: '${containerData.vagao || "vazio"}', Placa: '${containerData.placa || "vazio"}'`);
        console.log(`🔍 Modo de transporte: ${containerData.modoTransporte}`);
      } else {
        console.log(`❌ ERRO - Dados do container TESTE123456 não encontrados em window.containersVistoriados`);
        console.log(`🔍 Conteúdo completo de window.containersVistoriados:`, window.containersVistoriados);
      }
    }
    
    if (!containerData) {
      console.error("❌ Dados do container não encontrados");
      // Mostrar erro ao usuário
      Swal.fire({
        icon: "error",
        title: "Erro ao iniciar descarga",
        text: `Ocorreu um erro ao preparar o formulário de descarga. Tente novamente.`,
        confirmButtonText: "OK",
        confirmButtonColor: "#d33"
      });
      return;
    }
    
    // CORREÇÃO: Garantir que o modo de transporte seja definido corretamente
    // Se o modo de transporte não foi definido corretamente, tentar detectar novamente
    if (modoTransporte === 'indefinido' && containerData) {
      console.log(`⚠️ Modo de transporte indefinido para ${containerNumero}, tentando detectar novamente...`);
      
      // Tentar detectar o modo de transporte novamente
      if (containerData.vagao && containerData.vagao.trim()) {
        modoTransporte = 'ferroviaria';
        console.log(`🔄 Modo de transporte corrigido para ferroviaria - vagão: '${containerData.vagao}'`);
      } else if (containerData.placa && containerData.placa.trim()) {
        modoTransporte = 'rodoviaria';
        console.log(`🔄 Modo de transporte corrigido para rodoviaria - placa: '${containerData.placa}'`);
      }
      
      // Atualizar o objeto containerData
      containerData.modoTransporte = modoTransporte;
      window.containersVistoriados[containerNumero] = containerData;
    }
    
    // Determinar o formulário a ser exibido baseado no modo de transporte
    let formularioHTML = "";
    let tituloFormulario = "";
    let iconeFormulario = "";
    let campoEspecifico = "";
    
    // CORREÇÃO: Usar o modo de transporte do containerData se disponível
    const modoTransporteEfetivo = containerData.modoTransporte || modoTransporte;
    console.log(`🔍 Modo de transporte efetivo para ${containerNumero}: ${modoTransporteEfetivo}`);
    
    if (modoTransporteEfetivo === 'ferroviaria') {
      tituloFormulario = "Descarga Ferroviária";
      iconeFormulario = "fas fa-train";
      campoEspecifico = `
        <div class="form-group">
          <label class="form-label" for="vagao_descarga">Número do Vagão:</label>
          <input
            type="text"
            class="form-control"
            id="vagao_descarga"
            name="vagao"
            value="${containerData.vagao || ''}"
            readonly
            placeholder="Número do vagão"
          />
          <small class="form-text text-info">
            <i class="fas fa-info-circle me-1"></i>Informação obtida da vistoria
          </small>
        </div>
      `;
    } else if (modoTransporteEfetivo === 'rodoviaria') {
      tituloFormulario = "Descarga Rodoviária";
      iconeFormulario = "fas fa-truck";
      campoEspecifico = `
        <div class="form-group">
          <label class="form-label" for="placa_descarga">Placa do Caminhão:</label>
          <input
            type="text"
            class="form-control"
            id="placa_descarga"
            name="placa"
            value="${containerData.placa || ''}"
            readonly
            placeholder="Placa do caminhão"
          />
          <small class="form-text text-info">
            <i class="fas fa-info-circle me-1"></i>Informação obtida da vistoria
          </small>
        </div>
      `;
    } else {
      // Modo indefinido - tentar uma última verificação direta nos dados
      console.log(`⚠️ Última tentativa de detectar modo de transporte para ${containerNumero}`);
      
      // Verificar diretamente os campos vagao e placa nos dados do container
      if (containerData.vagao && containerData.vagao.trim()) {
        console.log(`🔄 Última chance: Modo ferroviário detectado - vagão: '${containerData.vagao}'`);
        tituloFormulario = "Descarga Ferroviária";
        iconeFormulario = "fas fa-train";
        campoEspecifico = `
          <div class="form-group">
            <label class="form-label" for="vagao_descarga">Número do Vagão:</label>
            <input
              type="text"
              class="form-control"
              id="vagao_descarga"
              name="vagao"
              value="${containerData.vagao || ''}"
              readonly
              placeholder="Número do vagão"
            />
            <small class="form-text text-info">
              <i class="fas fa-info-circle me-1"></i>Informação obtida da vistoria
            </small>
          </div>
        `;
        
        // Atualizar o modo de transporte no objeto
        containerData.modoTransporte = 'ferroviaria';
        window.containersVistoriados[containerNumero] = containerData;
      } else if (containerData.placa && containerData.placa.trim()) {
        console.log(`🔄 Última chance: Modo rodoviário detectado - placa: '${containerData.placa}'`);
        tituloFormulario = "Descarga Rodoviária";
        iconeFormulario = "fas fa-truck";
        campoEspecifico = `
          <div class="form-group">
            <label class="form-label" for="placa_descarga">Placa do Caminhão:</label>
            <input
              type="text"
              class="form-control"
              id="placa_descarga"
              name="placa"
              value="${containerData.placa || ''}"
              readonly
              placeholder="Placa do caminhão"
            />
            <small class="form-text text-info">
              <i class="fas fa-info-circle me-1"></i>Informação obtida da vistoria
            </small>
          </div>
        `;
        
        // Atualizar o modo de transporte no objeto
        containerData.modoTransporte = 'rodoviaria';
        window.containersVistoriados[containerNumero] = containerData;
      } else {
        // Se realmente não há informações de transporte, mostrar erro
        console.error(`❌ Modo de transporte indefinido para ${containerNumero} após todas as tentativas`);
        Swal.fire({
          icon: "error",
          title: "Modo de transporte indefinido",
          text: `O container ${containerNumero} não possui informações de vagão ou placa na vistoria. Contate o vistoriador responsável.`,
          confirmButtonText: "OK",
          confirmButtonColor: "#d33"
        });
        return;
      }
    }
    
    // Criar o formulário completo com detalhes mais visíveis
    formularioHTML = `
      <div class="container-fluid p-0">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="${iconeFormulario} me-2"></i> ${tituloFormulario}
              </h5>
              <button type="button" class="btn btn-light btn-sm" onclick="voltarSelecaoContainer()">
                <i class="fas fa-arrow-left me-1"></i> Voltar
              </button>
            </div>
          </div>
          
          <!-- Seção de detalhes do container vistoriado - DESTACADA -->
          <div class="card-body bg-light border-bottom">
            <h6 class="text-primary mb-3">
              <i class="fas fa-info-circle me-2"></i>Informações da Vistoria
            </h6>
            <div class="row">
              <div class="col-md-6">
                <div class="info-item">
                  <strong>Container:</strong> ${containerData.numero}
                </div>
                <div class="info-item">
                  <strong>ISO:</strong> ${containerData.iso_container || '-'}
                </div>
                <div class="info-item">
                  <strong>Tipo:</strong> ${containerData.tipo || '-'}
                </div>
              </div>
              <div class="col-md-6">
                <div class="info-item">
                  <strong>Capacidade:</strong> ${containerData.capacidade || '-'}
                </div>
                <div class="info-item">
                  <strong>Tara:</strong> ${containerData.tara || '-'} kg
                </div>
                <div class="info-item">
                  <strong>Data Vistoria:</strong> ${containerData.data_vistoria ? new Date(containerData.data_vistoria).toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
            </div>
            <div class="row mt-2">
              <div class="col-12">
                <div class="info-item">
                  <strong>Modo de Transporte:</strong> 
                  <span class="ms-2">
                    ${modoTransporteEfetivo === 'ferroviaria' 
                      ? '<i class="fas fa-train text-primary me-1"></i> <span class="badge bg-primary">Ferroviário</span>' 
                      : '<i class="fas fa-truck text-success me-1"></i> <span class="badge bg-success">Rodoviário</span>'}
                  </span>
                </div>
                ${containerData.placa ? `<div class="info-item"><strong>Placa:</strong> ${containerData.placa}</div>` : ''}
                ${containerData.vagao ? `<div class="info-item"><strong>Vagão:</strong> ${containerData.vagao}</div>` : ''}
              </div>
            </div>
          </div>
          
          <div class="card-body">
            <h6 class="text-secondary mb-3">
              <i class="fas fa-edit me-2"></i>Dados da Descarga
            </h6>
            <form id="formDescarga" data-modo="${modoTransporteEfetivo}">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-label" for="container_numero">Número do Container:</label>
                    <input
                      type="text"
                      class="form-control"
                      id="container_numero"
                      name="container_id"
                      value="${containerNumero}"
                      readonly
                      required
                    />
                    <small class="form-text text-success">
                      <i class="fas fa-check-circle me-1"></i>Container vistoriado selecionado
                    </small>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-label" for="posicao_descarga">Posição no Pátio:</label>
                    <input
                      type="text"
                      class="form-control"
                      id="posicao_descarga"
                      name="posicao"
                      required
                      placeholder="Ex: A01-3"
                      pattern="^[A-E](0[1-9]|1[0-9]|20)-[1-5]$"
                      title="Formato: A01-3 (baia, linha com 2 dígitos, altura)"
                      oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 5)"
                    />
                    <small class="form-text text-info">
                      <i class="fas fa-info-circle me-1"></i>Formato: A01-3 (baia, linha com 2 dígitos, altura)
                    </small>
                  </div>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  ${campoEspecifico}
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label class="form-label" for="observacoes_descarga">Observações:</label>
                    <textarea
                      class="form-control"
                      id="observacoes_descarga"
                      name="observacoes"
                      rows="3"
                      placeholder="Observações opcionais sobre a operação..."
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div class="action-buttons mt-4">
                <button type="submit" class="btn-action btn-primary-action">
                  <i class="fas fa-save me-1"></i> Confirmar Descarga
                </button>
                <button type="button" class="btn-action btn-secondary-action" onclick="voltarSelecaoContainer()">
                  <i class="fas fa-times me-1"></i> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <style>
        .info-item {
          margin-bottom: 0.5rem;
          padding: 0.25rem 0;
        }
        .info-item strong {
          color: #495057;
          display: inline-block;
          min-width: 100px;
        }
        .bg-light {
          background-color: #f8f9fa !important;
        }
      </style>
    `;
    
    // Exibir o formulário
    descargaContainer.innerHTML = formularioHTML;
    
    // Configurar o evento de submit do formulário
    const formDescarga = document.getElementById("formDescarga");
    if (formDescarga) {
      console.log(`✅ Formulário encontrado, configurando evento de submit`);
      
      // Remover event listeners anteriores (se houver)
      const newForm = formDescarga.cloneNode(true);
      formDescarga.parentNode.replaceChild(newForm, formDescarga);
      
      // Configurar formatação automática do campo de posição
      const posicaoInput = newForm.querySelector('#posicao_descarga');
          // Carregar datalist inicialmente
          if (posicaoInput) {
            carregarPosicoesLivres().then(p => criarDatalistPosicoesDescarga(posicaoInput, p));
          }
      if (posicaoInput) {
        posicaoInput.addEventListener('input', function(e) {
          // Converter para maiúsculas e manter apenas caracteres válidos
          let valor = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
          
          // Limitar a 5 caracteres (formato A01-1)
          if (valor.length > 5) valor = valor.substring(0, 5);
          // Se datalist ainda não criado, criar dinamicamente (fallback)
          if (!this.getAttribute('list')) {
            carregarPosicoesLivres().then(p => criarDatalistPosicoesDescarga(this, p));
          }
          
          // Garantir que comece com uma letra
          if (valor.length > 0 && !/[A-E]/.test(valor[0])) {
            valor = 'A' + valor.substring(1);
          }
          
          // Formatar automaticamente para A01-1
          if (valor.length >= 4 && valor.indexOf('-') === -1) {
            // Se tem 4 ou mais caracteres e não tem hífen, inserir hífen
            valor = valor.substring(0, 3) + '-' + valor.substring(3);
          }
          
          // Atualizar o valor do campo
          this.value = valor;
          
          // Verificar se o formato está correto e dar feedback visual
          const posicaoPattern = /^[A-E](0[1-9]|1[0-9]|20)-[1-5]$/;
          if (posicaoPattern.test(valor)) {
            this.classList.add('is-valid');
            this.classList.remove('is-invalid');
          } else if (valor.length === 5) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
          } else {
            this.classList.remove('is-valid');
            this.classList.remove('is-invalid');
          }
        });
        
        console.log(`✅ Formatação automática configurada para o campo de posição`);
      }
      
      // Adicionar novo event listener
      newForm.addEventListener("submit", function(e) {
        e.preventDefault();
        console.log(`📝 Formulário submetido com modo: ${modoTransporteEfetivo}`);
        processarDescarga(this, modoTransporteEfetivo);
      });
      
      console.log(`✅ Event listener de submit registrado para o formulário de descarga`);
    } else {
      console.error(`❌ Formulário de descarga não encontrado para registrar evento`);
    }
    
    // Scroll otimizado para o formulário
    setTimeout(() => {
      console.log(`🔄 Fazendo scroll para o formulário de descarga...`);
      scrollToFormulario(descargaContainer);
      
      // Verificar se o formulário foi carregado corretamente
      const formDescargaCheck = document.getElementById("formDescarga");
      if (formDescargaCheck) {
        console.log(`✅ Formulário de descarga carregado com sucesso. Modo: ${modoTransporteEfetivo}`);
        
        // Verificar campos específicos do modo de transporte
        if (modoTransporteEfetivo === 'ferroviaria') {
          const vagaoInput = document.getElementById("vagao_descarga");
          if (vagaoInput) {
            console.log(`✅ Campo vagão encontrado com valor: '${vagaoInput.value}'`);
          } else {
            console.error(`❌ Campo vagão não encontrado no formulário`);  
          }
        } else if (modoTransporteEfetivo === 'rodoviaria') {
          const placaInput = document.getElementById("placa_descarga");
          if (placaInput) {
            console.log(`✅ Campo placa encontrado com valor: '${placaInput.value}'`);
          } else {
            console.error(`❌ Campo placa não encontrado no formulário`);  
          }
        }
      } else {
        console.error(`❌ Formulário de descarga não encontrado após carregamento`);
      }
    }, 300);
    
    console.log(`✅ Formulário de descarga ${modoTransporte} exibido com sucesso`);
    
  } catch (error) {
    console.error("❌ Erro ao iniciar descarga do container:", error);
    
    Swal.fire({
      icon: "error",
      title: "Erro ao iniciar descarga",
      text: "Ocorreu um erro ao preparar o formulário de descarga. Tente novamente.",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33"
    });
  }
}

/**
 * Volta para a seleção de container
 */
function voltarSelecaoContainer() {
  console.log("🔄 Voltando para seleção de container...");
  
  // Recarregar containers vistoriados e mostrar seleção novamente
  carregarContainersVistoriados(true)
    .then(containers => {
      configurarFormularioDescargaUnico(containers);
    })
    .catch(error => {
      console.error("❌ Erro ao voltar para seleção:", error);
      voltarInicio();
    });
}

/**
 * Processa o formulário de descarga
 * @param {HTMLFormElement} form - Formulário de descarga
 * @param {string} modoTransporte - Modo de transporte
 */
async function processarDescarga(form, modoTransporte) {
  try {
    console.log(`📝 Processando descarga - Modo: ${modoTransporte}`);
    console.log(`🔍 DEBUG - Formulário:`, form);
    console.log(`🔍 DEBUG - Modo de transporte: ${modoTransporte}`);
    
    // Obter dados do formulário
    const formData = new FormData(form);
    const dadosDescarga = {
      container_id: formData.get('container_id'),
      posicao: formData.get('posicao'),
      observacoes: formData.get('observacoes') || '',
      modo: modoTransporte === 'ferroviaria' ? 'ferrovia' : 'rodoviaria'
    };
    
    console.log(`🔍 DEBUG - Dados da descarga:`, dadosDescarga);
    
    // Adicionar campo específico baseado no modo
    if (modoTransporte === 'ferroviaria') {
      dadosDescarga.vagao = formData.get('vagao');
    } else if (modoTransporte === 'rodoviaria') {
      dadosDescarga.placa = formData.get('placa');
    }
    
    // Validar dados obrigatórios
    if (!dadosDescarga.container_id || !dadosDescarga.posicao) {
      Swal.fire({
        icon: "warning",
        title: "Dados incompletos",
        text: "Por favor, preencha todos os campos obrigatórios.",
        confirmButtonText: "OK",
        confirmButtonColor: "#f39c12"
      });
      return;
    }
    
    // Validar formato da posição (A01-3 - baia, linha com 2 dígitos, altura)
    const posicaoPattern = /^[A-E](0[1-9]|1[0-9]|20)-[1-5]$/;
    if (!posicaoPattern.test(dadosDescarga.posicao)) {
      console.log(`❌ Formato de posição inválido: ${dadosDescarga.posicao}`);
      Swal.fire({
        icon: "warning",
        title: "Formato de posição inválido",
        text: "A posição deve estar no formato A01-3 (baia, linha com 2 dígitos, altura).",
        confirmButtonText: "OK",
        confirmButtonColor: "#f39c12"
      });
      return;
    }
    
    // Validar se a posição é compatível com o tamanho do container (TEU)
    let containerTamanho = '20'; // Default para caso não consigamos buscar
    try {
      // Primeiro, buscar os detalhes do container para saber se é 20 ou 40 TEUs
      const containerResponse = await fetch(`/operacoes/buscar_container?numero=${dadosDescarga.container_id}`);
      const containerResult = await containerResponse.json();
      
      if (!containerResult.success) {
        console.error(`❌ Erro ao buscar informações do container: ${dadosDescarga.container_id}`);
        Swal.fire({
          icon: "error",
          title: "Erro ao validar posição",
          text: "Não foi possível obter informações do container para validar a posição.",
          confirmButtonText: "OK",
          confirmButtonColor: "#dc3545"
        });
        return;
      }
      
      const container = containerResult.data;
      containerTamanho = container.tamanho || '20'; // Armazena para usar abaixo ao enviar os dados
      const bayNumber = parseInt(dadosDescarga.posicao.substring(1, 3));
      
      // Regra de validação: 20-foot containers só podem ocupar posições ímpares,
      // 40-foot containers só podem ocupar posições pares
      if (containerTamanho === '20') {
        if (bayNumber % 2 === 0) { // Se o número da bay é par
          console.error(`❌ Posição inválida: Containers de 20 pés só podem ocupar posições ímpares. Posição: ${dadosDescarga.posicao}`);
          Swal.fire({
            icon: "warning",
            title: "Posição inválida",
            text: "Containers de 20 pés só podem ocupar posições ímpares.",
            confirmButtonText: "OK",
            confirmButtonColor: "#f39c12"
          });
          return;
        }
      } else if (containerTamanho === '40') {
        if (bayNumber % 2 !== 0) { // Se o número da bay é ímpar
          console.error(`❌ Posição inválida: Containers de 40 pés só podem ocupar posições pares. Posição: ${dadosDescarga.posicao}`);
          Swal.fire({
            icon: "warning",
            title: "Posição inválida",
            text: "Containers de 40 pés só podem ocupar posições pares.",
            confirmButtonText: "OK",
            confirmButtonColor: "#f39c12"
          });
          return;
        }
      }
      
      // Verificar se a posição aceita o status do container (CHEIO/VAZIO)
      // Isso seria ideal, mas precisaria de uma API para verificar as posições permitidas
      // Por enquanto, apenas logamos que a validação detalhada seria feita no backend
      console.log(`ℹ️ Validação detalhada da posição (CHEIO/VAZIO) será realizada pelo backend`);
      
    } catch (error) {
      console.error('❌ Erro ao validar posição com base no tamanho do container:', error);
      // Continue mesmo com erro na validação avançada, o backend fará a validação final
    }
    
    console.log(`✅ Posição validada: ${dadosDescarga.posicao}`);
    
    // Desabilitar botão de submit durante o processamento
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Processando...';
    }
    
    // Obter token CSRF
    let csrfToken = '';
    try {
      const csrfResponse = await fetch("/api/csrf-token");
      const csrfData = await csrfResponse.json();
      csrfToken = csrfData.csrf_token;
    } catch (e) {
      console.warn("Aviso: Não foi possível obter token CSRF");
    }
    
    // Preparar o objeto de dados para enviar como JSON usando os nomes exatos que o backend espera
    const dadosParaEnviar = {
      numero_container: dadosDescarga.container_id,
      tipo_operacao: 'descarga',
      posicao: dadosDescarga.posicao,
      observacoes: dadosDescarga.observacoes || '',
      modo: dadosDescarga.modo,
      tamanho_teu: containerTamanho === '40' ? 40 : 20 // Converte tamanho do container para valor numérico
    };
    
    // Adicionar campos específicos baseado no modo
    if (dadosDescarga.vagao) {
      dadosParaEnviar.vagao = dadosDescarga.vagao;
    }
    if (dadosDescarga.placa) {
      dadosParaEnviar.placa = dadosDescarga.placa;
    }
    
    // Configurar os headers corretos para JSON
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    // Registrar no console os dados que estamos enviando
    console.log('🔍 Enviando dados para registrar_operacao:', dadosParaEnviar);
    
    // Enviar dados como JSON para o endpoint correto
    const response = await fetch('/operacoes/registrar_operacao', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(dadosParaEnviar)
    });
    
    // Log do status da resposta para debug
    console.log(`📡 Status da resposta: ${response.status} ${response.statusText}`);
    
    // Capturar texto da resposta para debug em caso de erro
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro detalhado do servidor:', errorText);
      console.error('❌ Status HTTP:', response.status);
      console.error('❌ Headers:', Object.fromEntries([...response.headers.entries()]));
      console.error('❌ Dados enviados:', JSON.stringify(dadosParaEnviar, null, 2));
      
      // Exibir a mensagem de erro para o usário para ajudar no debug
      let errorMessage = 'Erro no servidor';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || 'Erro desconhecido';
        console.error('📈 Dados enviados para o servidor:', dadosParaEnviar);
        
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar operação',
          text: `Erro: ${errorMessage}`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545',
          footer: `Status: ${response.status} ${response.statusText}`
        });
        
        return errorJson;
      } catch (e) {
        console.error('❌ Erro ao parsear resposta:', e);
        
        Swal.fire({
          icon: 'error',
          title: 'Erro ao registrar operação',
          text: `Resposta inválida do servidor: ${errorText.substring(0, 100)}...`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545',
          footer: `Status: ${response.status} ${response.statusText}`
        });
        
        return { success: false, error: 'Erro ao processar resposta do servidor' };
      }
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Sucesso - mostrar mensagem e voltar ao início
      Swal.fire({
        icon: "success",
        title: "Descarga registrada com sucesso!",
        text: `Container ${dadosDescarga.container_id} foi descarregado na posição ${dadosDescarga.posicao}.`,
        confirmButtonText: "OK",
        confirmButtonColor: "#28a745"
      }).then(() => {
        voltarInicio();
      });
      
      console.log(`✅ Descarga registrada com sucesso: ${dadosDescarga.container_id}`);
      
    } else {
      // Erro do servidor
      Swal.fire({
        icon: "error",
        title: "Erro ao registrar descarga",
        text: result.error || "Ocorreu um erro inesperado. Tente novamente.",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33"
      });
      
      console.error("❌ Erro do servidor:", result.error);
    }
    
  } catch (error) {
    console.error("❌ Erro ao processar descarga:", error);
    
    Swal.fire({
      icon: "error",
      title: "Erro de conexão",
      text: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33"
    });
    
  } finally {
    // Re-habilitar botão de submit
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Confirmar Descarga';
    }
  }
}

// ========================================
// FUNÇÕES AUXILIARES DE CONTROLE
// ========================================

/**
 * Exibe a indicação inicial para o usuário selecionar uma operação.
 * Também garante que o grid de botões principais esteja visível.
 */
function showInitialSelection() {
  const indicador = document.getElementById('selecione-operacao');
  if (indicador) {
    indicador.style.display = 'block';
  }

  const gridOperacoes = document.querySelector('.operacoes-grid');
  if (gridOperacoes) {
    gridOperacoes.style.display = 'flex';
  }

  console.log('✅ Selecione uma operação mostrado');
}



function clearPreviousState() {
  document.querySelectorAll(".operacao-btn, .sub-opcao-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  hideAllOperations();
  hideAllForms();
}

function resetToInitialState() {
  hideAllOperations();
  hideAllForms();
  esconderSelecaoInicial();
  clearAllForms();

  document.querySelectorAll(".operacao-btn, .sub-opcao-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  setTimeout(() => {
    showInitialSelection();
  }, 50);
}








// ========================================
// FUNÇÕES DE OCULTAÇÃO
// ========================================






// ========================================
// FUNÇÕES DE FORMULÁRIO
// ========================================

/**
 * Valida se um container está vistoriado e pode ser usado para descarga
 * @param {HTMLInputElement} input - Input do container a ser validado
 * @returns {boolean} - True se o container está vistoriado e pode ser usado
 */
async function validarContainerVistoriado(input) {
  if (!input || !input.value) return false;
  
  const containerNumero = input.value.trim();
  if (containerNumero.length === 0) return false;
  
  console.log(`🔍 Validando se o container ${containerNumero} está vistoriado...`);
  
  // Remover mensagens de erro anteriores
  const errorContainer = input.parentElement.querySelector('.container-error-message');
  if (errorContainer) {
    errorContainer.remove();
  }
  
  // Resetar classes de validação
  input.classList.remove('is-invalid', 'is-valid', 'container-validation-error');
  
  try {
    // Verificar no cache local primeiro
    if (appState.containersVistoriadosCache && appState.containersVistoriadosCache.length > 0) {
      const containerEncontrado = appState.containersVistoriadosCache.find(
        container => container.numero.toUpperCase() === containerNumero.toUpperCase()
      );
      
      if (containerEncontrado) {
        console.log(`✅ Container ${containerNumero} validado no cache - está vistoriado`);
        input.classList.add('is-valid');
        return true;
      }
    }
    
    // Se não encontrar no cache, buscar no servidor
    console.log(`🌐 Container não encontrado no cache, verificando no servidor...`);
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(containerNumero)}`);
    
    if (!response.ok) {
      console.warn(`❌ API retornou erro ao buscar container ${containerNumero}`);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.container) {
      console.warn(`⚠️ Container ${containerNumero} não encontrado`);
      return false;
    }
    
    const disponivel = data.container.status === "no patio" && data.container.posicao_atual;
    
    if (disponivel) {
      console.log(`✅ Container ${containerNumero} está disponível para carregamento`);
    } else {
      console.warn(`⚠️ Container ${containerNumero} não está disponível para carregamento. Status: ${data.container.status}`);
    }
    
    return disponivel;
  } catch (error) {
    console.error(`❌ Erro ao validar container ${containerNumero}:`, error);
    input.classList.add('is-invalid');
    
    // Adicionar mensagem de erro genérica
    const errorDiv = document.createElement('div');
    errorDiv.className = 'container-error-message';
    errorDiv.textContent = 'Erro ao validar container. Tente novamente.';
    input.parentElement.appendChild(errorDiv);
    
    return false;
  }
}

/**
 * Valida um formulário
 * @param {HTMLFormElement} form - Formulário a ser validado
 * @returns {boolean} True se válido
 */
function validateForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll("[required]");

  requiredFields.forEach((field) => {
    field.classList.remove("is-invalid", "is-valid");

    if (!field.value.trim()) {
      field.classList.add("is-invalid");
      isValid = false;
    } else {
      field.classList.add("is-valid");
    }
  });

  return isValid;
}

/**
 * Mostra indicador de carregamento no botão
 * @param {HTMLButtonElement} button - Botão
 */
function showLoading(button) {
  if (!button) return;
  
  const originalText = button.innerHTML;
  button.setAttribute("data-original-text", originalText);
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processando...';
  button.disabled = true;
  button.classList.add("processing");
}

/**
 * Esconde indicador de carregamento do botão
 * @param {HTMLButtonElement} button - Botão
 */
function hideLoading(button) {
  if (!button) return;
  
  const originalText = button.getAttribute("data-original-text");
  if (originalText) {
    button.innerHTML = originalText;
  }
  button.disabled = false;
  button.classList.remove("processing");
}

/**
 * Processa um formulário
 * @param {FormData} formData - Dados do formulário
 * @param {HTMLButtonElement} submitButton - Botão de submit
 * @param {string} operationType - Tipo da operação
 */
async function processForm(formData, submitButton, operationType) {
  showLoading(submitButton);

  try {
    formData.append("tipo", operationType);

    if (appState.currentMode) {
      formData.append("modo", appState.currentMode);
    }

    console.log("📦 Dados sendo enviados:");
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const csrfResponse = await fetch("/api/csrf-token");
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrf_token;

    console.log("🔐 Token CSRF obtido:", csrfToken.substring(0, 20) + "...");

    const response = await fetch("/operacoes/registrar_operacao", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("📥 Resposta do servidor:", result);

    hideLoading(submitButton);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text:
          result.message ||
          `${
            operationType.charAt(0).toUpperCase() + operationType.slice(1)
          } registrada com sucesso!`,
        confirmButtonText: "OK",
        confirmButtonColor: "#667eea",
      }).then(() => {
        voltarInicio();
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: result.error || "Erro ao processar operação",
        confirmButtonText: "OK",
        confirmButtonColor: "#ef4444",
      });
    }
  } catch (error) {
    hideLoading(submitButton);
    console.error("Erro ao enviar formulário:", error);

    Swal.fire({
      icon: "error",
      title: "Erro!",
      text: "Erro de conexão. Verifique sua internet e tente novamente.",
      confirmButtonText: "OK",
      confirmButtonColor: "#ef4444",
    });
  }
}

/**
 * Busca status de um container
 * @param {string} containerNumber - Número do container
 * @param {HTMLButtonElement} searchButton - Botão de busca
 */
async function searchContainerStatus(containerNumber, searchButton) {
  showLoading(searchButton);

  try {
    const response = await fetch(
      `/operacoes/buscar_container?numero=${encodeURIComponent(
        containerNumber
      )}`
    );
    const result = await response.json();

    hideLoading(searchButton);

    if (result.success) {
      displayContainerStatus(result.container, result.operacoes);
    } else {
      Swal.fire({
        icon: "info",
        title: "Container não encontrado",
        text: result.message || "Container não foi encontrado no sistema",
        confirmButtonText: "OK",
        confirmButtonColor: "#667eea",
      });
    }
  } catch (error) {
    hideLoading(searchButton);
    console.error("Erro ao buscar container:", error);

    Swal.fire({
      icon: "error",
      title: "Erro!",
      text: "Erro de conexão. Verifique sua internet e tente novamente.",
      confirmButtonText: "OK",
      confirmButtonColor: "#ef4444",
    });
  }
}

/**
 * Exibe o status de um container
 * @param {Object} container - Dados do container
 * @param {Array} operacoes - Lista de operações
 */
function displayContainerStatus(container, operacoes = []) {
  const resultContainer = document.getElementById("resultado-consulta");
  if (resultContainer) {
    resultContainer.innerHTML = generateStatusHTML(container, operacoes);
    resultContainer.style.display = "block";
    setTimeout(() => {
      resultContainer.classList.add("show");
    }, 100);
  }
}

/**
 * Gera HTML para exibir status do container
 * @param {Object} container - Dados do container
 * @param {Array} operacoes - Lista de operações
 * @returns {string} HTML gerado
 */
function generateStatusHTML(container, operacoes = []) {
  let html = `
    <div class="status-card">
      <h6><i class="fas fa-cube text-primary"></i> Informações do Container</h6>
      <div class="status-info">
        <div class="status-item">
          <strong>Número:</strong> ${container.numero}
        </div>
        <div class="status-item">
          <strong>Status:</strong> <span class="badge bg-info">${
            container.status
          }</span>
        </div>
        <div class="status-item">
          <strong>Posição Atual:</strong> ${
            container.posicao_atual || "Não informada"
          }
        </div>
        <div class="status-item">
          <strong>Última Atualização:</strong> ${new Date(
            container.ultima_atualizacao
          ).toLocaleString("pt-BR")}
        </div>
      </div>
    </div>
  `;

  if (operacoes && operacoes.length > 0) {
    html += `
      <div class="status-card">
        <h6><i class="fas fa-history text-secondary"></i> Histórico de Operações</h6>
        <div class="status-info">
    `;

    operacoes.forEach((operacao) => {
      const badge = getBadgeClass(operacao.tipo);
      html += `
        <div class="status-item">
          <div>
            <div><strong>${new Date(operacao.data_operacao).toLocaleString(
              "pt-BR"
            )}</strong></div>
            <div><span class="badge bg-${badge}">${operacao.tipo.toUpperCase()}</span>
            ${operacao.modo ? ` - ${operacao.modo}` : ""}
            ${operacao.posicao ? ` - ${operacao.posicao}` : ""}
            ${operacao.placa ? ` - Placa: ${operacao.placa}` : ""}
            ${operacao.vagao ? ` - Vagão: ${operacao.vagao}` : ""}
            </div>
            ${
              operacao.observacoes
                ? `<div class="text-muted" style="font-size: 0.9rem; font-style: italic;">${operacao.observacoes}</div>`
                : ""
            }
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  return html;
}

/**
 * Retorna classe CSS para badge baseado no tipo de operação
 * @param {string} tipo - Tipo da operação
 * @returns {string} Classe CSS
 */
function getBadgeClass(tipo) {
  switch (tipo) {
    case "descarga":
      return "success";
    case "carregamento":
      return "warning";
    case "movimentacao":
      return "info";
    default:
      return "secondary";
  }
}

/**
 * Verifica se um container está disponível para carregamento
 * @param {string} numeroContainer - Número do container a ser verificado
 * @returns {Promise<boolean>} - True se o container estiver disponível, False caso contrário
 */
async function verificarContainerDisponivel(numeroContainer) {
  if (!numeroContainer) {
    console.warn("⚠️ Número de container não fornecido para verificação");
    return false;
  }
  
  console.log(`🔍 Verificando disponibilidade do container: ${numeroContainer}`);
  
  try {
    // Primeiro verifica no cache local
    console.log("📦 Buscando container no cache local...");
    const containersDisponiveis = await carregarContainersDisponiveis();
    console.log(`📊 Total de containers disponíveis no cache: ${containersDisponiveis.length}`);
    
    const containerCached = containersDisponiveis.find(
      c => c.numero.toUpperCase() === numeroContainer.toUpperCase()
    );
    
    if (containerCached) {
      console.log(`✅ Container ${numeroContainer} encontrado no cache e está disponível`);
      return true;
    }
    
    // Se não encontrar no cache, consulta a API
    console.log(`🌐 Container não encontrado no cache, consultando API...`);
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(numeroContainer)}`);
    
    if (!response.ok) {
      console.warn(`❌ API retornou erro ao buscar container ${numeroContainer}`);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.container) {
      console.warn(`⚠️ Container ${numeroContainer} não encontrado`);
      return false;
    }
    
    const disponivel = data.container.status === "no patio" && data.container.posicao_atual;
    
    if (disponivel) {
      console.log(`✅ Container ${numeroContainer} está disponível para carregamento`);
    } else {
      console.warn(`⚠️ Container ${numeroContainer} não está disponível para carregamento. Status: ${data.container.status}`);
    }
    
    return disponivel;
  } catch (error) {
    console.error(`❌ Erro ao verificar disponibilidade do container ${numeroContainer}:`, error);
    return false;
  }
}

/**
 * Obtém token CSRF para requisições
 * @returns {string} Token CSRF
 */
function getCsrfToken() {
  // Tentar obter de meta tag primeiro
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    return metaToken.getAttribute('content');
  }
  
  // Fallback: fazer requisição para obter token
  // Usar apenas em caso de necessidade extrema para evitar requisições desnecessárias
  return '';
}

// ========================================
// TRATAMENTO DE FORMULÁRIOS DE CARREGAMENTO
// ========================================

/**
 * Inicializa os formulários de carregamento e movimentação
 */
function initForms() {
  console.log("Inicializando formulários de carregamento e movimentação...");
  
  // Configurar formulário de carregamento rodoviário
  const formRodoviario = document.getElementById('formCarregamentoRodoviario');
  if (false && formRodoviario) { // handled in modules/carregamento.js
    formRodoviario.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Validar formato da posição antes de enviar
      const posicaoInput = formRodoviario.querySelector('input[name="posicao"]');
      if (posicaoInput && posicaoInput.value !== 'EM TRANSITO') {
        const resultado = validarFormatoPosicao(posicaoInput.value);
        if (!resultado.valido) {
          mostrarAlerta('Erro de Formato', resultado.mensagem, 'error');
          return;
        }
      }
      
      enviarFormularioCarregamento('rodoviaria');
    });
    console.log("Formulário de carregamento rodoviário configurado");
  }
  
  // Configurar formulário de carregamento ferroviário
  const formFerroviario = document.getElementById('formCarregamentoFerroviario');
  if (false && formFerroviario) { // handled in modules/carregamento.js
    formFerroviario.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Validar formato da posição antes de enviar
      const posicaoInput = formFerroviario.querySelector('input[name="posicao"]');
      if (posicaoInput && posicaoInput.value !== 'EM TRANSITO') {
        const resultado = validarFormatoPosicao(posicaoInput.value);
        if (!resultado.valido) {
          mostrarAlerta('Erro de Formato', resultado.mensagem, 'error');
          return;
        }
      }
      
      enviarFormularioCarregamento('ferroviaria');
    });
    console.log("Formulário de carregamento ferroviário configurado");
  }
  
  // Configurar formulário de movimentação
  const formMovimentacao = document.getElementById('formMovimentacao');
  if (formMovimentacao) {
    formMovimentacao.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Validar formato da posição original antes de enviar
      const posicaoOriginalInput = formMovimentacao.querySelector('input[name="posicao_original"]');
      if (posicaoOriginalInput) {
        const resultadoOriginal = validarFormatoPosicao(posicaoOriginalInput.value);
        if (!resultadoOriginal.valido) {
          mostrarAlerta('Erro de Formato', `Posição original: ${resultadoOriginal.mensagem}`, 'error');
          return;
        }
      }
      
      // Validar formato da nova posição antes de enviar
      const posicaoNovaInput = formMovimentacao.querySelector('input[name="posicao"]');
      if (posicaoNovaInput) {
        const resultadoNova = validarFormatoPosicao(posicaoNovaInput.value);
        if (!resultadoNova.valido) {
          mostrarAlerta('Erro de Formato', `Nova posição: ${resultadoNova.mensagem}`, 'error');
          return;
        }
      }
      
      confirmarMovimentacao();
    });
    console.log("Formulário de movimentação configurado");
  }
  
  // Configurar formulário de descarga
  const formDescarga = document.getElementById('formDescarga');
  if (formDescarga) {
    formDescarga.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Validar formato da posição antes de enviar
      const posicaoInput = formDescarga.querySelector('input[name="posicao"]');
      if (posicaoInput) {
        const resultado = validarFormatoPosicao(posicaoInput.value);
        if (!resultado.valido) {
          mostrarAlerta('Erro de Formato', resultado.mensagem, 'error');
          return;
        }
      }
      
      // Continuar com o processamento normal do formulário
      const submitButton = formDescarga.querySelector('button[type="submit"]');
      if (submitButton && typeof processarDescarga === 'function') {
        processarDescarga(formDescarga, formDescarga.dataset.modo || 'rodoviaria');
      }
    });
    console.log("Formulário de descarga configurado");
  }
  
  // Aplicar máscara de formatação A01-1 em todos os inputs de posição
  const posicaoInputs = document.querySelectorAll('input[name="posicao"], input[name="posicao_original"]');
  posicaoInputs.forEach(input => {
    console.log("Aplicando máscara de posição para", input.name);
    aplicarMascaraPosicao(input);
    
    // Adicionar dica de formato
    input.setAttribute('placeholder', 'A01-1');
    if (input.parentElement) {
      const helpText = document.createElement('small');
      helpText.className = 'form-text text-muted';
      helpText.innerText = 'Formato: A01-1 (letra + 2 dígitos + hífen + 1 dígito)';
      input.parentElement.appendChild(helpText);
    }
  });
  
  console.log("Inputs de posição configurados com validação de formato A01-1");
}

/**
 * Exibe modal de confirmação para movimentação de container
 */
async function confirmarMovimentacao() {
  try {
    console.log('🔧 DEBUG - Função confirmarMovimentacao chamada!');
    
    // Obter dados do formulário
    const container = document.getElementById('container_movimentacao').value;
    const posicaoOriginal = document.getElementById('posicao_original').value;
    const posicaoNova = document.getElementById('posicao_nova').value;
    const observacoes = document.getElementById('observacoes_movimentacao').value;
    
    console.log('🔧 DEBUG - Dados do formulário:', {
      container,
      posicaoOriginal,
      posicaoNova,
      observacoes
    });
    
    // Validar dados
    if (!container || !posicaoNova) {
      Swal.fire({
        icon: 'error',
        title: 'Dados incompletos',
        text: 'Por favor, preencha o número do container e a nova posição.',
        confirmButtonColor: '#dc3545'
      });
      return;
    }
    
    // Exibir modal de confirmação
    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirmar Movimentação',
      html: `
        <div class="text-left">
          <p><strong>Container:</strong> ${container}</p>
          <p><strong>Posição Atual:</strong> ${posicaoOriginal}</p>
          <p><strong>Nova Posição:</strong> ${posicaoNova}</p>
          ${observacoes ? `<p><strong>Observações:</strong> ${observacoes}</p>` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      reverseButtons: true
    });
    
    // Se confirmado, enviar dados via AJAX
    if (result.isConfirmed) {
      // Mostrar loading
      Swal.fire({
        title: 'Processando...',
        text: 'Registrando movimentação, aguarde...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Obter token CSRF
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrf_token;
      
      // Enviar dados via AJAX para o endpoint de registrar operação
      const response = await fetch('/operacoes/registrar_operacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          numero_container: container,
          tipo_operacao: 'movimentacao',
          posicao: posicaoNova,
          posicao_anterior: posicaoOriginal, // Adicionando a posição original
          modo: 'manual', // Adicionando o modo da operação
          observacoes: observacoes || ''
        })
      });
      
      const data = await response.json();
      
      console.log('🔧 DEBUG - Resposta do servidor:', data);
      console.log('🔧 DEBUG - Status da resposta:', response.status);
      console.log('🔧 DEBUG - data.success:', data.success);
      
      if (data.success) {
        console.log('🎉 DEBUG - Sucesso detectado! Exibindo modal de sucesso...');
        console.log('🎉 DEBUG - Mensagem do servidor:', data.message);
        
        // Atualizar o campo de posição original com a nova posição
        document.getElementById('posicao_original').value = posicaoNova;
        
        // Limpar os campos do formulário
        document.getElementById('posicao_nova').value = '';
        document.getElementById('observacoes_movimentacao').value = '';
        
        // Mostrar mensagem de sucesso
        console.log('🎉 DEBUG - Chamando Swal.fire para modal de sucesso...');
        const modalResult = Swal.fire({
          icon: 'success',
          title: 'Sucesso!',
          text: data.message,
          confirmButtonColor: '#28a745'
        });
        console.log('🎉 DEBUG - Modal de sucesso criado:', modalResult);
        
        // Atualizar a cache local de containers
        await atualizarCacheContainers();
      } else {
        // Mostrar mensagem de erro
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: data.message || 'Ocorreu um erro ao processar a movimentação.',
          confirmButtonColor: '#dc3545'
        });
      }
    }
  } catch (error) {
    console.error('Erro ao confirmar movimentação:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Ocorreu um erro ao processar a movimentação. Tente novamente.',
      confirmButtonColor: '#dc3545'
    });
  }
}

/**
 * Envia o formulário de carregamento via AJAX
 * @param {string} modo - Modo de transporte (rodoviaria/ferroviaria)
 */
async function enviarFormularioCarregamento(modo) {
  console.warn('Deprecated: enviarFormularioCarregamento in dashboard.js is no longer used; logic moved to modules/carregamento.js');
  return; // prevent duplicate execution

  try {
    console.log(`Enviando formulário de carregamento ${modo}...`);
    
    // Obter os dados do formulário correto
    let container, observacoes, placa, vagao;
    
    if (modo === 'rodoviaria') {
      container = document.getElementById('container_carregamento_rod').value;
      placa = document.getElementById('placa_carregamento_rod').value;
      observacoes = document.getElementById('observacoes_carregamento_rod').value;
      
      if (!container || !placa) {
        mostrarAlerta('Erro', 'Por favor, preencha o número do container e a placa do caminhão.', 'error');
        return;
      }
    } else if (modo === 'ferroviaria') {
      container = document.getElementById('container_carregamento_fer').value;
      vagao = document.getElementById('vagao_carregamento_fer').value;
      observacoes = document.getElementById('observacoes_carregamento_fer').value;
      
      if (!container || !vagao) {
        mostrarAlerta('Erro', 'Por favor, preencha o número do container e o número do vagão.', 'error');
        return;
      }
    }
    
    // Mostrar loading
    Swal.fire({
      title: 'Processando...',
      text: 'Registrando carregamento, aguarde...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Preparar dados para envio
    const dados = {
      container_id: container,
      observacoes: observacoes || '',
      modo: modo
    };
    
    if (modo === 'rodoviaria') {
      dados.placa = placa;
    } else if (modo === 'ferroviaria') {
      dados.vagao = vagao;
    }
    
    // Obter token CSRF
    const csrfToken = getCsrfToken();
    
    // Enviar dados via fetch
    const response = await fetch('/operacoes/registrar_carregamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify(dados)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Mostrar mensagem de sucesso
      mostrarAlerta('Sucesso!', 'Carregamento registrado com sucesso!', 'success');
      
      // Limpar formulário
      if (modo === 'rodoviaria') {
        document.getElementById('container_carregamento_rod').value = '';
        document.getElementById('placa_carregamento_rod').value = '';
        document.getElementById('observacoes_carregamento_rod').value = '';
      } else if (modo === 'ferroviaria') {
        document.getElementById('container_carregamento_fer').value = '';
        document.getElementById('vagao_carregamento_fer').value = '';
        document.getElementById('observacoes_carregamento_fer').value = '';
      }
      
      // Voltar para a tela inicial após um breve delay
      setTimeout(() => {
        voltarInicio();
      }, 1500);
    } else {
      // Mostrar mensagem de erro
      mostrarAlerta('Erro', result.message || 'Ocorreu um erro ao registrar o carregamento.', 'error');
    }
  } catch (error) {
    console.error('Erro ao enviar formulário de carregamento:', error);
    mostrarAlerta('Erro', 'Ocorreu um erro ao processar sua solicitação.', 'error');
  }
}

/**
 * Mostra um alerta usando SweetAlert2
 * @param {string} titulo - Título do alerta
 * @param {string} mensagem - Mensagem do alerta
 * @param {string} tipo - Tipo do alerta (success, error, warning, info)
 */
function mostrarAlerta(titulo, mensagem, tipo) {
  Swal.fire({
    title: titulo,
    text: mensagem,
    icon: tipo,
    confirmButtonText: 'OK',
    confirmButtonColor: '#0066b3'
  });
}

/**
 * Obtém o token CSRF do meta tag no HTML
 * @returns {string} Token CSRF
 */


// ========================================
// INICIALIZAÇÃO
// ========================================

/**
 * Inicializa a aplicação quando DOM estiver carregado
 * com proteção contra erros em cada etapa
 */
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Iniciando carregamento do Dashboard...");

  // Array para acompanhar quais componentes foram inicializados
  const initStatus = {
    forms: false,
    eventListeners: false,
    state: false,
    placas: false,
    containers: false,
    containersVistoriados: false
  };

  // Configuração inicial dos formulários com proteção contra erros
  try {
    initForms();
    initStatus.forms = true;
    console.log("✅ Formulários inicializados");
  } catch (error) {
    console.error("❌ Erro ao inicializar formulários:", error);
    // Continuar mesmo com erro
  }
  
  // Configurar event listeners com proteção contra erros
  try {
    // setupFormListeners(); // Função removida - não existe mais
    initStatus.eventListeners = true;
    console.log("✅ Event listeners configurados");
  } catch (error) {
    console.error("❌ Erro ao configurar event listeners:", error);
    // Continuar mesmo com erro
  }

  // Garantir estado inicial limpo
  try {
    resetToInitialState();
    initStatus.state = true;
    console.log("✅ Estado inicial configurado");
  } catch (error) {
    console.error("❌ Erro ao resetar estado inicial:", error);
    // Continuar mesmo com erro
  }

  // Carregar dados necessários de forma independente
  // Cada carregamento é isolado para não bloquear os outros

  // 1. Carregar placas
  setTimeout(() => {
    try {
      carregarPlacas().then(() => {
        try {
          inicializarComboboxesPlacas();
          initStatus.placas = true;
          console.log("✅ Placas carregadas e comboboxes inicializados");
        } catch (e) {
          console.error("❌ Erro ao inicializar comboboxes de placas:", e);
        }
      }).catch(err => {
        console.error("❌ Erro ao carregar placas:", err);
      });
    } catch (error) {
      console.error("❌ Erro crítico no fluxo de carregamento de placas:", error);
    }
  }, 100);

  // 2. Carregar containers
  setTimeout(() => {
    try {
      carregarContainers().then(() => {
        try {
          inicializarComboboxesContainers();
          initStatus.containers = true;
          console.log("✅ Containers carregados e comboboxes inicializados");
        } catch (e) {
          console.error("❌ Erro ao inicializar comboboxes de containers:", e);
        }
      }).catch(err => {
        console.error("❌ Erro ao carregar containers:", err);
      });
    } catch (error) {
      console.error("❌ Erro crítico no fluxo de carregamento de containers:", error);
    }
  }, 200);

  // 3. Inicializar comboboxes de containers vistoriados
  setTimeout(() => {
    try {
      // A chamada foi desativada para evitar duplicação de opções no combobox de descarga
      if (typeof inicializarComboboxesContainersVistoriados === 'function') {
        console.log('Chamando inicializarComboboxesContainersVistoriados...');
        inicializarComboboxesContainersVistoriados()
          .then(data => {
            if (data && data.success && Array.isArray(data.containers)) {
              console.log(`✅ ${data.containers.length} containers vistoriados carregados`);
              
              // Armazenar em cache global se necessário
              if (!window.containersVistoriadosCache) {
                window.containersVistoriadosCache = data.containers;
              }
            } else {
              console.warn("⚠️ Nenhum container vistoriado carregado ou formato inválido");
            }
          })
          .catch(err => {
            console.error("❌ Erro na promise de inicialização de containers vistoriados:", err);
          });
      } else {
        console.warn('⚠️ Função inicializarComboboxesContainersVistoriados não disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar comboboxes de containers vistoriados:', error);
      // Continuar com a inicialização mesmo com erro
    }
  }, 300);

  // Verificar status de inicialização após todos os processos
  setTimeout(() => {
    console.log("📊 Status de inicialização:", initStatus);
    console.log("✅ Dashboard inicializado - Interface pronta para uso");
  }, 1000);
});

// ========================================
// DEBUG E MONITORAMENTO
// ========================================

/**
 * Monitor de estado para debug (executa a cada 10 segundos)
 */
setInterval(() => {
  const debugInfo = {
    operation: appState.currentOperation,
    mode: appState.currentMode,
    form: appState.activeForm,
    containersCache: appState.containersCache.length,
    placasCache: appState.placasCache.length,
    timestamp: new Date().toLocaleTimeString(),
  };

  if (window.lastDebugInfo !== JSON.stringify(debugInfo)) {
    console.log("📊 Estado atual:", debugInfo);
    window.lastDebugInfo = JSON.stringify(debugInfo);
  }
}, 10000); // A cada 10 segundos

console.log(
  "✅ Dashboard JavaScript carregado e funcional com busca automática"
);

// ==============================
// EXPOR FUNÇÕES GLOBAIS PARA HTML
// ==============================
window.mostrarOperacao = mostrarOperacao;
window.mostrarSubOpcao = mostrarSubOpcao;
window.voltarInicio = voltarInicio;
window.resetToInitialState = resetToInitialState;
// Utilidades reutilizadas pelos módulos
window.mostrarAlerta = mostrarAlerta;
window.getCsrfToken = getCsrfToken;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.validateForm = validateForm;

// ========================================
// INICIALIZAÇÃO DO DASHBOARD - AUTO-SHOW
// ========================================

// Garantir que a seleção inicial de operações seja exibida
document.addEventListener("DOMContentLoaded", function() {
  setTimeout(() => {
    // Se não estiver mostrando nenhuma operação específica, mostrar a seleção inicial
    if (!appState.currentOperation) {
      console.log("📱 Exibindo painel de operações principais...");
      
      // Garantir que a área de operações está visível
      const operacoesContainer = document.querySelector(".operacoes-container");
      if (operacoesContainer) {
        operacoesContainer.style.display = "block";
        
        // Mostrar os botões de operação principal (necessário para interface tablet)
        const operacoesGrid = document.querySelector(".operacoes-grid");
        if (operacoesGrid) {
          operacoesGrid.style.display = "grid";
        }
        
        // Garantir que o indicador de seleção esteja visível
        const selecioneOperacao = document.getElementById("selecione-operacao");
        if (selecioneOperacao) {
          selecioneOperacao.style.display = "block";
        }
        
        console.log("✅ Painel de operações exibido com sucesso");
      } else {
        console.error("❌ Elemento 'operacoes-container' não encontrado");
      }
    }
  }, 500);
});

// ========================================
// VALIDAÇÃO DE POSIÇÃO NO FORMATO A01-1
// ========================================

/**
 * Valida se uma posição está no formato A01-1
 * @param {string} posicao - A posição a ser validada
 * @returns {Object} Resultado da validação { valido: boolean, mensagem: string }
 */
function validarFormatoPosicao(posicao) {
  // Caso especial para carregamento
  if (posicao === 'EM TRANSITO') {
    return { valido: true, mensagem: '' };
  }

  // Verificar se está vazio
  if (!posicao || posicao.trim() === '') {
    return { 
      valido: false, 
      mensagem: 'A posição não pode estar vazia' 
    };
  }

  // Formato requerido: A01-1 (letra + 2 dígitos + hífen + 1 dígito)
  const padrao = /^[A-Z][0-9]{2}-[0-9]$/;
  if (!padrao.test(posicao)) {
    return { 
      valido: false, 
      mensagem: `Formato de posição inválido: ${posicao}. Use o formato A01-1 (letra + 2 dígitos + hífen + 1 dígito).` 
    };
  }

  // Validar componentes
  const baia = posicao[0];
  const posicaoNumero = parseInt(posicao.substring(1, 3));
  const altura = parseInt(posicao[4]);

  // Baias válidas (A-E)
  if (!['A', 'B', 'C', 'D', 'E'].includes(baia)) {
    return { 
      valido: false, 
      mensagem: `Baia inválida: ${baia}. Baias válidas são A, B, C, D e E.` 
    };
  }

  // Posição válida (01-20)
  if (posicaoNumero < 1 || posicaoNumero > 20) {
    return { 
      valido: false, 
      mensagem: `Número de posição inválido: ${posicaoNumero}. Deve estar entre 01 e 20.` 
    };
  }

  // Altura válida (1-5)
  if (altura < 1 || altura > 5) {
    return { 
      valido: false, 
      mensagem: `Altura inválida: ${altura}. Deve estar entre 1 e 5.` 
    };
  }

  return { valido: true, mensagem: '' };
}

/**
 * Aplica máscara de formatação para posição no formato A01-1
 * @param {HTMLInputElement} input - Elemento de input da posição
 */
function aplicarMascaraPosicao(input) {
  input.addEventListener('input', function(e) {
    let valor = e.target.value.toUpperCase();
    
    // Remove caracteres inválidos
    valor = valor.replace(/[^A-Z0-9-]/g, '');
    
    // Aplica a formatação A01-1
    if (valor.length >= 1) {
      // Garante que o primeiro caractere seja letra
      const letra = valor[0];
      let resto = valor.substring(1).replace(/[^0-9-]/g, '');
      
      // Processa os números
      if (resto.length > 0) {
        // Insere o hífen após o segundo dígito se não houver
        if (resto.length >= 2 && !resto.includes('-')) {
          resto = resto.substring(0, 2) + '-' + resto.substring(2);
        }
        
        // Limita o tamanho total (A01-1 = 5 caracteres)
        if (resto.length > 4) {
          resto = resto.substring(0, 4);
        }
      }
      
      valor = letra + resto;
    }
    
    e.target.value = valor;
  });
  
  // Adicionar validação no evento blur
  input.addEventListener('blur', function(e) {
    const posicao = e.target.value;
    if (posicao && posicao !== 'EM TRANSITO') {
      const resultado = validarFormatoPosicao(posicao);
      
      // Adicionar estilo de validação
      if (!resultado.valido) {
        e.target.classList.add('is-invalid');
        
        // Mostrar tooltip ou mensagem de erro
        const formGroup = e.target.closest('.form-group');
        let feedbackElement = formGroup.querySelector('.invalid-feedback');
        
        if (!feedbackElement) {
          feedbackElement = document.createElement('div');
          feedbackElement.className = 'invalid-feedback';
          formGroup.appendChild(feedbackElement);
        }
        
        feedbackElement.textContent = resultado.mensagem;
      } else {
        e.target.classList.remove('is-invalid');
        e.target.classList.add('is-valid');
      }
    }
  });
}

// ========================================
// PREVENÇÃO DE REQUISIÇÕES 404
// ========================================

// Interceptar cliques em links/botões que podem causar 404
document.addEventListener('click', function(e) {
  const target = e.target;
  
  // Prevenir cliques em elementos que podem causar requisições desnecessárias
  if (target.href && target.href.includes('/operacoes/container/') && target.href.includes('/detalhes')) {
    e.preventDefault();
    console.log('🚫 Requisição desnecessária prevenida:', target.href);
    return false;
  }
});

// Interceptar tentativas de fetch para URLs problemáticas
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  
  // Removido bloqueio para permitir requisições de detalhes de container
  // Agora todas as requisições passam normalmente
  
  return originalFetch.apply(this, args);
};

/**
 * Função para confirmar e processar o logout do usuário
 */
function confirmarLogout() {
  console.log("🔒 Iniciando processo de logout...");
  
  Swal.fire({
    title: 'Confirmar Saída',
    text: 'Deseja realmente sair do sistema?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sim, sair',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      console.log("✅ Logout confirmado pelo usuário, redirecionando...");
      
      // Mostrar indicador de carregamento
      Swal.fire({
        title: 'Saindo...',
        text: 'Você será redirecionado em instantes',
        icon: 'info',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        }
      }).then(() => {
        // Redirecionar para a rota de logout
        window.location.href = "/auth/logout";
      });
    } else {
      console.log("❌ Logout cancelado pelo usuário");
    }
  });
}

console.log(
  "✅ Dashboard JavaScript carregado e funcional com busca automática"
);