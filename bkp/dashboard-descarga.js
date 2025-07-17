// ========================================
// FUNÇÕES COMPLEMENTARES PARA DESCARGA
// Arquivo separado para as funções que estavam faltando
// ========================================

/**
 * Carrega containers vistoriados do banco de dados com cache local
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Array} Lista de containers vistoriados
 */
async function carregarContainersVistoriados(forceRefresh = false) {
  try {
    // Verificar cache local (válido por 2 minutos)
    const agora = new Date();
    if (
      !forceRefresh &&
      appState.containersVistoriadosCacheTime &&
      agora - appState.containersVistoriadosCacheTime < 120000 &&
      appState.containersVistoriadosCache.length > 0
    ) {
      console.log("📦 Usando containers vistoriados do cache local");
      return appState.containersVistoriadosCache;
    }

    console.log("🔄 Carregando containers vistoriados do banco de dados...");

    const response = await fetch(
      `/operacoes/containers/vistoriados${forceRefresh ? "?refresh=true" : ""}`
    );
    const result = await response.json();

    if (result.success) {
      appState.containersVistoriadosCache = result.data;
      appState.containersVistoriadosCacheTime = agora;
      console.log(`✅ ${result.data.length} containers vistoriados carregados`);
      return result.data;
    } else {
      console.error("❌ Erro ao carregar containers vistoriados:", result.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Erro na requisição de containers vistoriados:", error);
    return [];
  }
}

/**
 * Mostra sugestões de containers vistoriados baseado na busca
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers vistoriados
 */
function mostrarSugestoesContainersVistoriados(input, containers) {
  // Remover lista existente
  const existingList = document.querySelector(".container-suggestions");
  if (existingList) existingList.remove();

  const termo = input.value.toUpperCase();

  // Filtrar containers vistoriados
  const containersFiltrados = containers
    .filter((container) =>
      container.numero.toUpperCase().includes(termo)
    )
    .slice(0, 10); // Máximo 10 sugestões

  if (containersFiltrados.length === 0) return;

  // Criar lista de sugestões
  const suggestionsList = document.createElement("div");
  suggestionsList.className = "container-suggestions";
  suggestionsList.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 2px;
  `;

  containersFiltrados.forEach((container) => {
    // Determinar o modo de transporte
    let modoTransporte = 'indefinido';
    let modoDisplay = "Indefinido";
    let iconClass = "fa-question-circle text-warning";
    
    if (container.vagao && container.vagao.trim()) {
      modoTransporte = 'ferroviaria';
      modoDisplay = "Ferroviário";
      iconClass = "fa-train text-primary";
    } else if (container.placa && container.placa.trim()) {
      modoTransporte = 'rodoviaria';
      modoDisplay = "Rodoviário";
      iconClass = "fa-truck text-success";
    }

    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.style.cssText = `
      padding: 12px 15px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    item.innerHTML = `
      <div>
        <strong>${container.numero}</strong>
        <div style="font-size: 0.85rem; color: #64748b;">
          ISO: ${container.iso_container || "-"} | 
          Capacidade: ${container.capacidade || "-"}
        </div>
      </div>
      <div style="text-align: right;">
        <i class="fas ${iconClass}" style="margin-right: 5px;"></i>
        <span style="font-size: 0.85rem;">${modoDisplay}</span>
      </div>
    `;

    item.addEventListener("mouseenter", function () {
      this.style.backgroundColor = "#f8fafc";
    });

    item.addEventListener("mouseleave", function () {
      this.style.backgroundColor = "white";
    });

    item.addEventListener("click", function () {
      input.value = container.numero;
      input.classList.add("is-valid");
      suggestionsList.remove();
      
      // Disparar evento de input para atualizar a validação
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
      
      // Iniciar descarga diretamente ao selecionar o container
      const containerNumero = container.numero;
      const containerSelecionado = window.containersVistoriados[containerNumero];
      
      if (containerSelecionado) {
        console.log(`🚛 Iniciando descarga para container ${containerNumero} - Modo: ${containerSelecionado.modoTransporte}`);
        // Chamar a função de iniciar descarga diretamente
        iniciarDescargaContainer(containerNumero, containerSelecionado.modoTransporte);
      }
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
 * Inicia a descarga de um container específico
 * @param {string} containerNumero - Número do container
 * @param {string} modoTransporte - Modo de transporte (ferroviaria/rodoviaria)
 */
async function iniciarDescargaContainer(containerNumero, modoTransporte) {
  try {
    console.log(`🚛 Iniciando descarga: ${containerNumero} - Modo: ${modoTransporte}`);
    
    const descargaContainer = document.getElementById("descarga-formulario-container");
    if (!descargaContainer) {
      console.error("❌ Container de descarga não encontrado");
      return;
    }
    
    // Mostrar loading enquanto buscamos detalhes adicionais
    descargaContainer.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2">Carregando detalhes completos do container...</p>
      </div>
    `;
    
    // Obter dados do container selecionado
    const containerSelecionado = window.containersVistoriados[containerNumero];
    if (!containerSelecionado) {
      console.error("❌ Dados do container não encontrados");
      return;
    }
    
    // Debugar valores originais do banco de dados
    console.log("🔍 Dados originais do container vistoriado:", {
      numero: containerSelecionado.numero,
      tipo_container: containerSelecionado.tipo_container,
      armador: containerSelecionado.armador,
      iso_container: containerSelecionado.iso_container
    });
    
    // IMPORTANTE: Se temos valores no banco, devemos usar EXATAMENTE os valores do banco
    // sem tentar detectar automaticamente ou substituir esses valores
    const tipoContainerDoBanco = containerSelecionado.tipo_container;
    const armadorDoBanco = containerSelecionado.armador;
    
    // Log adicional para confirmar valores
    console.log(" VALORES DO BANCO QUE SERÃO UTILIZADOS:")
    console.log(`Tipo: "${tipoContainerDoBanco}" - Armador: "${armadorDoBanco}"`);
    
    // Verificar se os valores do banco estão vazios ou são nulos
    // Consideramos o hífen '-' como valor vazio que deve acionar a detecção automática
    const tipoVazio = !tipoContainerDoBanco || tipoContainerDoBanco === '-' || tipoContainerDoBanco === '';
    const armadorVazio = !armadorDoBanco || armadorDoBanco === '-' || armadorDoBanco === '';
    
    console.log(`Tipo vazio: ${tipoVazio}, Armador vazio: ${armadorVazio}`);
    
    // Buscar detalhes adicionais do container no banco de dados
    // Nota: Estamos evitando usar a rota de detalhes que está retornando 404
    // Uma alternativa é extrair o máximo possível dos dados que já temos do container
    
    // Extrair tamanho do container do código ISO
    let containerSize = 20; // Valor padrão: 20 pés
    let tipoContainer = "";  // Tipo do container
    let armadorContainer = ""; // Armador do container
    
    if (containerSelecionado.iso_container) {
      // Verificar se o código ISO contém indicação de 40 pés
      // Códigos típicos: 22G1 (20 pés), 42G1 (40 pés) - primeiro dígito geralmente indica o comprimento
      const isoCode = containerSelecionado.iso_container;
      const firstDigit = parseInt(isoCode.charAt(0), 10);
      
      // Determinar tamanho baseado no primeiro dígito do código ISO
      if (firstDigit === 4 || firstDigit === 9 || // 40 e 45 pés
          isoCode.includes('40') || 
          isoCode.includes('45')) {
        containerSize = 40;
        console.log(`📏 Container de 40 pés detectado pelo código ISO ${isoCode}`);
      } else {
        console.log(`📏 Container de 20 pés detectado pelo código ISO ${isoCode}`);
      }
      
      // Extrair o tipo de container do código ISO
      // Segundo caractere geralmente indica o tipo de container
      if (isoCode.length >= 2) {
        const secondChar = isoCode.charAt(1);
        switch (secondChar) {
          case '0':
            tipoContainer = "GENERAL PURPOSE";
            break;
          case '1':
            tipoContainer = "VENTILADO";
            break;
          case '2':
            tipoContainer = "REFRIGERADO";
            break;
          case '3':
            tipoContainer = "OPEN TOP";
            break;
          case '4':
            tipoContainer = "FLAT RACK";
            break;
          case '5':
            tipoContainer = "TANQUE";
            break;
          case '6':
            tipoContainer = "GRANELEIRO";
            break;
          default:
            tipoContainer = "STANDARD";
        }
        console.log(`📊 Tipo de container identificado: ${tipoContainer}`);
      }
      
      // Verificar se temos informação sobre o armador
      // Verificar armador com base no código do container
      const prefixoContainer = containerSelecionado.numero.substring(0, 3);
      switch (prefixoContainer) {
        case "TES": // Adicionando prefixo TES para PIL
          armadorContainer = "PIL";
          break;
        case "MSC":
          armadorContainer = "MSC";
          break;
        case "MAE":
        case "MED":
          armadorContainer = "MAERSK";
          break;
        case "EMC":
        case "EVR":
          armadorContainer = "EVERGREEN";
          break;
        case "COS":
          armadorContainer = "COSCO";
          break;
        case "HAP":
        case "HLC":
          armadorContainer = "HAPAG LLOYD";
          break;
        case "ONE":
          armadorContainer = "ONE";
          break;
        case "CMA":
          armadorContainer = "CMA CGM";
          break;
        default:
          armadorContainer = ""; // Deixar em branco se não identificado
      }
      
      if (armadorContainer) {
        console.log(`🚞 Armador identificado: ${armadorContainer}`);
      }
    } else {
      console.log(`⚠️ Não foi possível determinar o tamanho do container. Usando padrão de 20 pés.`);
    }
    
    // Armazenar as informações extraidas para uso posterior
    containerSelecionado.containerSize = containerSize;
    
    // Verificar se temos valores válidos do banco de dados e respectá-los
    // Apenas use valores detectados automaticamente quando o banco estiver vazio ou com '-'
    
    // IMPORTANTE: Usar APENAS os valores do banco de dados - esses valores têm prioridade absoluta
    // Ignorar completamente a detecção automática se temos valores do banco
    
    // Verificar se temos o tipo de container no banco
    if (containerSelecionado.tipo_container && containerSelecionado.tipo_container !== '-') {
      // Usar o tipo exato do banco, mesmo que seja diferente do detectado automaticamente
      console.log(`💾 Usando tipo de container do banco de dados: ${containerSelecionado.tipo_container}`);
    } else {
      // Se for vazio ou hífen, usar o valor detectado
      containerSelecionado.tipo_container = tipoContainer || 'STANDARD';
      console.log(`📃 Usando tipo de container extraído: ${containerSelecionado.tipo_container}`);
    }
    
    // Para o armador - mesma lógica
    if (containerSelecionado.armador && containerSelecionado.armador !== '-') {
      // Usar o armador exato do banco, mesmo que seja diferente do detectado automaticamente
      console.log(`💾 Usando armador do banco de dados: ${containerSelecionado.armador}`);
    } else {
      // Se for vazio ou hífen, usar o valor detectado
      containerSelecionado.armador = armadorContainer || 'NÃO IDENTIFICADO';
      console.log(`🚞 Usando armador extraído: ${containerSelecionado.armador}`);
    }
    
    // Log the final values we'll display
    console.log(`📝 Valores finais: Tipo=${containerSelecionado.tipo_container}, Armador=${containerSelecionado.armador}`);
    
    // Determinar campos específicos baseado no modo de transporte
    let camposEspecificos = '';
    let valorPreenchido = '';
    
    if (modoTransporte === 'ferroviaria') {
      camposEspecificos = `
        <div class="mb-3">
          <label for="vagao_descarga" class="form-label">
            <i class="fas fa-train me-2"></i>Número do Vagão
          </label>
          <input type="text" class="form-control" id="vagao_descarga" name="vagao" 
                 value="${containerSelecionado.vagao || ''}" readonly>
        </div>
      `;
      valorPreenchido = containerSelecionado.vagao || '';
    } else if (modoTransporte === 'rodoviaria') {
      camposEspecificos = `
        <div class="mb-3">
          <label for="placa_descarga" class="form-label">
            <i class="fas fa-truck me-2"></i>Placa do Caminhão
          </label>
          <input type="text" class="form-control" id="placa_descarga" name="placa" 
                 value="${containerSelecionado.placa || ''}" readonly>
        </div>
      `;
      valorPreenchido = containerSelecionado.placa || '';
    }
    
    // Criar formulário de descarga
    descargaContainer.innerHTML = `
      <div class="container-fluid p-0">
        <div class="card">
          <div class="card-header bg-success text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="fas fa-box-open me-2"></i>Descarga ${modoTransporte === 'ferroviaria' ? 'Ferroviária' : 'Rodoviária'}
              </h5>
              <button type="button" class="btn btn-light btn-sm" onclick="voltarSelecaoContainer()">
                <i class="fas fa-arrow-left me-1"></i>Voltar
              </button>
            </div>
          </div>
          <div class="card-body">
            <!-- Informações do Container -->
            <div class="alert alert-info mb-4">
              <div class="row">
                <div class="col-md-6">
                  <strong>Container:</strong> ${containerSelecionado.numero}<br>
                  <strong>ISO:</strong> ${containerSelecionado.iso_container || "-"}<br>
                  <strong>Tipo:</strong> ${tipoVazio ? (tipoContainer || "STANDARD") : tipoContainerDoBanco}<br>
                  <strong>Tamanho:</strong> ${containerSelecionado.containerSize || 20} pés
                </div>
                <div class="col-md-6">
                  <strong>Capacidade:</strong> ${containerSelecionado.capacidade || "-"}<br>
                  <strong>Tara:</strong> ${containerSelecionado.tara ? `${containerSelecionado.tara} kg` : "-"}<br>
                  <strong>Armador:</strong> ${armadorVazio ? (armadorContainer || "NÃO IDENTIFICADO") : armadorDoBanco}<br>
                  <strong>Status:</strong> ${containerSelecionado.status || "VISTORIADO"}
                </div>
              </div>
              <div class="row mt-2">
                <div class="col-12">
                  <strong>Data Vistoria:</strong> ${containerSelecionado.data_vistoria ? new Date(containerSelecionado.data_vistoria).toLocaleString() : "-"}
                </div>
              </div>
            </div>
            
            <!-- Formulário de Descarga -->
            <form id="form-descarga-${modoTransporte}" onsubmit="processarDescarga(this, '${modoTransporte}'); return false;">
              <input type="hidden" name="container_numero" value="${containerNumero}">
              <input type="hidden" name="modo_transporte" value="${modoTransporte}">
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="container_descarga_readonly" class="form-label">
                      <i class="fas fa-cube me-2"></i>Container
                    </label>
                    <input type="text" class="form-control" id="container_descarga_readonly" 
                           value="${containerNumero}" readonly>
                  </div>
                </div>
                <div class="col-md-6">
                  ${camposEspecificos}
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="posicao_patio_descarga" class="form-label">
                      <i class="fas fa-map-marker-alt me-2"></i>Posição no Pátio
                    </label>
                    <select class="form-select" id="posicao_patio_descarga" name="posicao_patio" required>
                      <option value="" selected disabled>Carregando posições disponíveis...</option>
                    </select>
                    <div class="form-text text-muted">
                      <small><i class="fas fa-info-circle"></i> Posições ordenadas por altura (começando pela altura 1)</small>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="observacoes_descarga" class="form-label">
                      <i class="fas fa-comment me-2"></i>Observações
                    </label>
                    <textarea class="form-control" id="observacoes_descarga" name="observacoes" 
                              rows="3" placeholder="Observações adicionais (opcional)"></textarea>
                  </div>
                </div>
              </div>
              
              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" onclick="voltarSelecaoContainer()">
                  <i class="fas fa-times me-1"></i>Cancelar
                </button>
                <button type="submit" class="btn btn-success">
                  <i class="fas fa-check me-1"></i>Confirmar Descarga
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Carregar posições disponíveis baseado no tamanho do container (20 ou 40 pés)
    carregarPosicoesDisponiveis('CHEIO', containerSelecionado.containerSize || 20);
    
    // Focar no campo de posição
    setTimeout(() => {
      const posicaoField = document.getElementById("posicao_patio_descarga");
      if (posicaoField) {
        posicaoField.focus();
      }
    }, 100);
    
    console.log("✅ Formulário de descarga configurado");
  } catch (error) {
    console.error("❌ Erro ao iniciar descarga:", error);
    
    Swal.fire({
      icon: "error",
      title: "Erro ao iniciar descarga",
      text: "Ocorreu um erro ao configurar o formulário de descarga.",
      confirmButtonColor: "#d33"
    });
  }
}

/**
 * Volta para a seleção de container
 */
function voltarSelecaoContainer() {
  console.log("🔙 Voltando para seleção de container");
  
  // Recarregar containers vistoriados e mostrar combobox novamente
  carregarContainersVistoriados()
    .then(containers => {
      configurarFormularioDescargaUnico(containers);
    })
    .catch(error => {
      console.error("❌ Erro ao voltar para seleção:", error);
    });
}

/**
 * Carrega as posições disponíveis para o dropdown
 * @param {string} statusContainer - Status do container (CHEIO/VAZIO)
 * @param {number} containerSize - Tamanho do container em TEUs (20 ou 40)
 */
async function carregarPosicoesDisponiveis(statusContainer = 'CHEIO', containerSize = 20) {
  try {
    const dropdown = document.getElementById('posicao_patio_descarga');
    if (!dropdown) {
      console.error('❌ Dropdown de posições não encontrado');
      return;
    }
    
    // Mostrar opção de carregamento
    dropdown.innerHTML = '<option value="" selected disabled>Carregando posições disponíveis...</option>';
    
    // Buscar posições disponíveis da API - agora incluindo a unidade (Suzano) como parâmetro obrigatório
    const response = await fetch(`/api/posicoes/disponiveis?status=${statusContainer}&unidade=SUZANO`);
    
    // Se a resposta não for ok, tentar recuperar o erro
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar posições (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.posicoes)) {
      // --- Integração Choices.js para combobox avançado ---
      // Preparar lista filtrada por tamanho/TEU
      const posicoesFiltradasPorTamanho = result.posicoes.filter(posicao => {
        const posNumero = parseInt(posicao.baia_posicao.substring(1), 10);
        if (containerSize === 20) {
          return posNumero % 2 !== 0; // Ímpares
        } else if (containerSize === 40) {
          return posNumero % 2 === 0; // Pares
        }
        return true;
      });

      // Ordenar baia, posição, altura
      posicoesFiltradasPorTamanho.sort((a, b) => {
        if (a.baia_posicao[0] !== b.baia_posicao[0]) {
          return a.baia_posicao[0].localeCompare(b.baia_posicao[0]);
        }
        const posA = parseInt(a.baia_posicao.substring(1), 10);
        const posB = parseInt(b.baia_posicao.substring(1), 10);
        if (posA !== posB) return posA - posB;
        return a.altura - b.altura;
      });

      // Preparar dados para Choices (value/label)
      const choicesData = posicoesFiltradasPorTamanho.map(p => ({
        value: p.posicao_completa,
        label: `✓ ${p.baia_posicao}-${p.altura} (Pos ${p.baia_posicao.substring(1).padStart(2,'0')}, Altura ${p.altura}, ${p.altura === 1 ? '20' : (p.baia_posicao.includes('-') ? '20' : '40')} TEU)`
      }));

      // Inicializar ou atualizar Choices
      if (!window.posicaoDescargaChoices) {
        // Limpar opções nativas
        dropdown.innerHTML = '';
        window.posicaoDescargaChoices = new Choices(dropdown, {
          searchEnabled: true,
          shouldSort: false,
          itemSelectText: '',
          classNames: { containerInner: 'choices__inner' }
        });
      }

      // Atualizar opções
      window.posicaoDescargaChoices.clearChoices();
      if (choicesData.length > 0) {
        window.posicaoDescargaChoices.setChoices(choicesData, 'value', 'label', true);
        console.log(`✅ Choices carregado com ${choicesData.length} posições`);
      } else {
        // Se nenhuma posição disponível, mostrar placeholder
        window.posicaoDescargaChoices.setChoices([{ value: '', label: 'Nenhuma posição disponível', disabled: true }], 'value', 'label', true);
        console.warn('⚠️ Nenhuma posição disponível após filtragem');
      }
    } else {
      // Exibir mensagem de erro no dropdown
      dropdown.innerHTML = '<option value="" selected disabled>Erro ao carregar posições</option>';
      console.error('❌ Erro ao carregar posições:', result.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar posições:', error);
    const dropdown = document.getElementById('posicao_patio_descarga');
    if (dropdown) {
      dropdown.innerHTML = '<option value="" selected disabled>Erro ao carregar posições: ' + error.message + '</option>';
    }
  }
}

/**
 * Processa o formulário de descarga
 * @param {HTMLFormElement} form - Formulário de descarga
 * @param {string} modoTransporte - Modo de transporte
 */
async function processarDescarga(form, modoTransporte) {
  try {
    // Desabilitar botão para evitar múltiplos envios
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...';
    }
    
    // Obter dados do formulário com verificação de elementos nulos
    // Primeiro verificamos o input hidden para o container_numero
    const containerNumeroInput = form.querySelector('input[name="container_numero"]');
    // Para a posição, usamos o ID correto do select
    const posicaoElement = form.querySelector('#posicao_patio_descarga');
    // Para observações, usamos o ID correto
    const observacoesElement = form.querySelector('#observacoes_descarga');
    // Para vagão e placa, usamos os IDs corretos
    const vagaoElement = form.querySelector('#vagao_descarga');
    const placaElement = form.querySelector('#placa_descarga');
    
    // Verificar elementos obrigatórios
    if (!containerNumeroInput) {
      throw new Error('Input de número do container não encontrado');
    }
    
    if (!posicaoElement) {
      throw new Error('Select de posição no pátio não encontrado');
    }
    
    // Obter os valores dos campos
    const dados = {
      container_numero: containerNumeroInput.value,
      posicao_patio: posicaoElement.value,
      observacoes: observacoesElement ? observacoesElement.value : '',
      vagao: vagaoElement ? vagaoElement.value : '',
      placa: placaElement ? placaElement.value : ''
    };
    
    // Verificar se a posição foi selecionada
    if (!dados.posicao_patio || dados.posicao_patio === '') {
      throw new Error('Selecione uma posição no pátio para continuar');
    }
    
    console.log("📋 Dados da descarga:", dados);
    
    // Obter token CSRF
    const csrfToken = getCsrfToken();
    console.log(`🔑 Token CSRF obtido: ${csrfToken ? 'Sim' : 'Não'}`);  
    
    // Verificar se temos um token CSRF válido
    if (!csrfToken) {
      throw new Error('Token CSRF não encontrado. Você pode precisar fazer login novamente.');
    }
    
    // Verificar se o formulário já tem o token CSRF
    let csrfInput = form.querySelector('input[name="csrf_token"]');
    if (!csrfInput) {
      // Adicionar token CSRF ao formulário se não existir
      csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrf_token';
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);
      console.log('🔒 Token CSRF adicionado ao formulário');
    }
    
    // Preparar dados para envio
    const dadosOperacao = {
      tipo: 'descarga',
      container_id: dados.container_numero,
      posicao: dados.posicao_patio,
      modo: modoTransporte,
      observacoes: dados.observacoes || ''
    };
    
    // Log para debug
    console.log(`📝 Enviando container_id: ${dadosOperacao.container_id}`);
    console.log(`📍 Enviando posicao: ${dadosOperacao.posicao}`);
    
    // Adicionar campos específicos baseado no modo de transporte
    if (modoTransporte === 'ferroviaria') {
      dadosOperacao.vagao = dados.vagao || '';
      console.log(`🚇 Enviando vagao: ${dadosOperacao.vagao}`);
    } else if (modoTransporte === 'rodoviaria') {
      dadosOperacao.placa = dados.placa || '';
      console.log(`🚚 Enviando placa: ${dadosOperacao.placa}`);
    }
    
    console.log('📤 Enviando dados de descarga:', dadosOperacao);
    
    // Enviar via fetch/JSON
    const response = await fetch('/operacoes/registrar_operacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'CSRF-Token': csrfToken  // Adicionar token em outro formato para garantir
      },
      credentials: 'same-origin',  // Incluir cookies na requisição
      body: JSON.stringify({
        ...dadosOperacao,
        csrf_token: csrfToken  // Incluir token no corpo da requisição também
      })
    });
    
    console.log(`📥 Resposta recebida: Status ${response.status}`);
    
    // Verificar status HTTP específicos primeiro
    if (response.status === 400) {
      // Erro de requisição inválida (Bad Request) - provavelmente CSRF
      console.error('❌ Erro 400: Requisição inválida');
      
      try {
        const errorData = await response.json();
        console.log('📄 Detalhes do erro 400:', errorData);
        
        await Swal.fire({
          icon: "error",
          title: "Erro de Validação",
          text: "Ocorreu um erro de validação (possivelmente token CSRF inválido). Sua sessão pode ter expirado.",
          confirmButtonColor: "#d33",
          footer: '<a href="/auth/login">Fazer login novamente</a>'
        });
      } catch (jsonError) {
        await Swal.fire({
          icon: "error",
          title: "Erro de Validação",
          text: "Ocorreu um erro de validação. Sua sessão pode ter expirado.",
          confirmButtonColor: "#d33",
          footer: '<a href="/auth/login">Fazer login novamente</a>'
        });
      }
      return false;
    } else if (response.status === 403) {
      // Erro de permissão (Forbidden)
      console.error('❌ Erro 403: Acesso negado');
      
      // Tentar obter detalhes do erro em formato JSON
      try {
        const errorData = await response.json();
        console.log('📄 Detalhes do erro 403:', errorData);
        
        await Swal.fire({
          icon: "error",
          title: "Acesso Negado",
          text: errorData.error || "Você não tem permissão para realizar esta operação. Verifique se você está logado como usuário da unidade Suzano e tem nível de operador.",
          confirmButtonColor: "#d33",
          footer: '<a href="/auth/login">Fazer login novamente</a>'
        });
      } catch (jsonError) {
        // Se não conseguir obter JSON, mostrar mensagem genérica
        await Swal.fire({
          icon: "error",
          title: "Acesso Negado",
          text: "Você não tem permissão para realizar esta operação. Verifique se você está logado como usuário da unidade Suzano e tem nível de operador.",
          confirmButtonColor: "#d33",
          footer: '<a href="/auth/login">Fazer login novamente</a>'
        });
      }
      return;
    } else if (response.status === 401) {
      // Erro de autenticação (Unauthorized)
      console.error('❌ Erro 401: Não autenticado');
      await Swal.fire({
        icon: "warning",
        title: "Sessão Expirada",
        text: "Sua sessão expirou ou você não está logado. Por favor, faça login novamente.",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Fazer Login"
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = '/auth/login';
        }
      });
      return;
    }
    
    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('📄 Resposta JSON:', result);
      
      if (result.success) {
        // Sucesso - mostrar modal e limpar cache
        await Swal.fire({
          icon: "success",
          title: "Descarga realizada com sucesso!",
          text: result.message || "Container descarregado com sucesso.",
          confirmButtonColor: "#28a745"
        });
        
        // Limpar cache e recarregar dados
        appState.containersVistoriadosCache = [];
        appState.containersVistoriadosCacheTime = null;
        appState.containersCache = [];
        appState.containersCacheTime = null;
        
        // Voltar ao início
        voltarInicio();
      } else {
        // Erro retornado pelo servidor
        await Swal.fire({
          icon: "error",
          title: "Erro na operação",
          text: result.error || "Ocorreu um erro ao processar a operação.",
          confirmButtonColor: "#d33"
        });
      }
    } else if (response.redirected) {
      // Se foi redirecionado, considerar como sucesso e seguir o redirecionamento
      await Swal.fire({
        icon: "success",
        title: "Operação realizada com sucesso!",
        text: "A operação foi concluída e você será redirecionado.",
        confirmButtonColor: "#28a745"
      });
      window.location.href = response.url;
    } else if (response.status === 403) {
      // Erro de permissão
      await Swal.fire({
        icon: "error",
        title: "Acesso negado",
        text: "Você não tem permissão para realizar esta operação.",
        confirmButtonColor: "#d33"
      });
    } else {
      // Outros erros
      throw new Error(`Resposta inesperada do servidor: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Erro ao processar descarga:", error);
    
    await Swal.fire({
      icon: "error",
      title: "Erro de conexão",
      text: `Não foi possível conectar com o servidor: ${error.message}. Tente novamente.`,
      confirmButtonColor: "#d33"
    });
  } finally {
    // Reabilitar botão
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-check me-1"></i>Confirmar Descarga';
    }
  }
}

/**
 * Obtém o token CSRF para requisições POST
 * @returns {string} Token CSRF
 */
function getCsrfToken() {
  console.log("🔍 Buscando token CSRF...");
  
  // Primeira tentativa: input específico com ID
  const csrfInput = document.getElementById('csrf-token-input');
  if (csrfInput) {
    const token = csrfInput.value;
    if (token && token.trim()) {
      console.log("✅ CSRF token obtido do input com ID específico");
      return token;
    }
  }
  
  // Segunda tentativa: meta tag
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    const token = metaToken.getAttribute('content');
    if (token && token.trim()) {
      console.log("✅ CSRF token obtido da meta tag");
      return token;
    } else {
      console.warn("⚠️ Meta tag CSRF encontrada, mas conteúdo vazio");
    }
  } else {
    console.warn("⚠️ Meta tag CSRF não encontrada");
  }
  
  // Terceira tentativa: qualquer input hidden com nome csrf_token
  const hiddenInputs = document.querySelectorAll('input[name="csrf_token"]');
  console.log(`🔍 Encontrados ${hiddenInputs.length} inputs CSRF no documento`);
  
  for (const input of hiddenInputs) {
    const token = input.value;
    if (token && token.trim()) {
      console.log("✅ CSRF token obtido de input hidden");
      return token;
    }
  }
  
  // Quarta tentativa: formulário de login (se existir)
  const loginForm = document.querySelector('form#login-form');
  if (loginForm) {
    const loginCsrfInput = loginForm.querySelector('input[name="csrf_token"]');
    if (loginCsrfInput && loginCsrfInput.value && loginCsrfInput.value.trim()) {
      console.log("✅ CSRF token obtido do formulário de login");
      return loginCsrfInput.value;
    }
  }
  
  // Quinta tentativa: qualquer formulário na página
  const allForms = document.querySelectorAll('form');
  for (const form of allForms) {
    const formCsrfInput = form.querySelector('input[name="csrf_token"]');
    if (formCsrfInput && formCsrfInput.value && formCsrfInput.value.trim()) {
      console.log("✅ CSRF token obtido de um formulário na página");
      return formCsrfInput.value;
    }
  }
  
  // Sexta tentativa: variável global (se definida)
  if (typeof window.csrfToken !== 'undefined' && window.csrfToken) {
    console.log("✅ CSRF token obtido de variável global");
    return window.csrfToken;
  }
  
  // Não criar tokens temporários - isso não funciona com o backend Flask
  console.error("❌ CSRF token não encontrado em nenhuma fonte!");
  console.error("❌ A requisição provavelmente falhará com erro 400 Bad Request");
  console.error("❌ Tente fazer login novamente ou recarregar a página");
  
  // Retornar null para indicar que não foi possível obter o token
  return null;
}

// ----------------- Inicialização de Choices no dropdown de posição -----------------
window.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('posicao_patio_descarga');
  if (dropdown && !window.posicaoDescargaChoices) {
    window.posicaoDescargaChoices = new Choices(dropdown, {
      searchEnabled: true,
      shouldSort: false,
      placeholderValue: 'Selecione a posição',
      itemSelectText: '',
      classNames: { containerInner: 'choices__inner' }
    });
  }
});

console.log("✅ Funções complementares de descarga carregadas");
