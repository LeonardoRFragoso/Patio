// ========================================
// CONSULTA DE CONTAINER - IMPLEMENTAÇÃO CORRIGIDA
// ========================================

/**
 * Função para formatar data para exibição
 * @param {string} dataString - String de data ISO
 * @returns {string} - Data formatada
 */
function formatarData(dataString) {
  if (!dataString) return 'Não informada';
  
  try {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
  } catch (error) {
    return dataString;
  }
}

/**
 * Função para formatar posição para exibição (A01-1)
 * @param {string} posicao - Posição a ser formatada
 * @returns {string} - Posição formatada
 */
function formatarPosicaoExibicao(posicao) {
  if (!posicao) return 'N/A';
  
  // Se já estiver no formato correto, retornar como está
  if (/^[A-E](0[1-9]|1[0-9]|20)-[1-5]$/.test(posicao)) {
    return posicao;
  }
  
  // Tentar converter outros formatos para A01-1
  const posicaoUpper = posicao.toUpperCase();
  
  // Formato A1-1 -> A01-1
  if (/^[A-E][1-9]-[1-5]$/.test(posicaoUpper)) {
    return posicaoUpper.charAt(0) + '0' + posicaoUpper.substring(1);
  }
  
  // Formato A01-3 -> A01-3
  if (/^[A-E][0-9]{3}$/.test(posicaoUpper)) {
    return posicaoUpper.substring(0, 3) + '-' + posicaoUpper.substring(3);
  }
  
  return posicao;
}

/**
 * Gera o HTML para exibir o histórico de operações
 * @param {Array} operacoes - Lista de operações do container
 * @returns {string} - HTML formatado
 */
function gerarHtmlHistorico(operacoes) {
  if (!operacoes || operacoes.length === 0) {
    return '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Nenhuma operação registrada para este container.</div>';
  }
  
  // Ordenar operações por data (mais recente primeiro)
  const operacoesOrdenadas = [...operacoes].sort((a, b) => {
    return new Date(b.data_operacao || b.data) - new Date(a.data_operacao || a.data);
  });
  
  // Criar HTML da timeline
  let html = '<div class="timeline-container">';
  
  operacoesOrdenadas.forEach((op, index) => {
    const tipo = (op.tipo || 'OPERAÇÃO').toUpperCase();
    const data = formatarData(op.data_operacao || op.data);
    const posicao = formatarPosicaoExibicao(op.posicao);
    const usuario = op.usuario || op.operador || 'Sistema';
    const observacoes = op.observacoes || '';
    
    // Definir ícone e cor com base no tipo de operação
    let icone = 'fa-box';
    let cor = 'primary';
    let descricao = tipo;
    
    if (tipo.includes('DESCARGA') || tipo.includes('ENTRADA')) {
      icone = 'fa-truck-loading';
      cor = 'success';
      descricao = 'Descarga';
    } else if (tipo.includes('CARREGAMENTO') || tipo.includes('SAIDA')) {
      icone = 'fa-truck-moving';
      cor = 'warning';
      descricao = 'Carregamento';
    } else if (tipo.includes('MOVIMENTACAO') || tipo.includes('MOVIMENTAÇÃO')) {
      icone = 'fa-arrows-alt';
      cor = 'info';
      descricao = 'Movimentação';
    }
    
    // Adicionar informações de transporte se disponível
    let infoTransporte = '';
    if (op.placa) {
      infoTransporte = `<div class="operation-detail"><i class="fas fa-truck me-1"></i>Placa: ${op.placa}</div>`;
    } else if (op.vagao) {
      infoTransporte = `<div class="operation-detail"><i class="fas fa-train me-1"></i>Vagão: ${op.vagao}</div>`;
    }
    
    html += `
      <div class="timeline-item">
        <div class="timeline-badge bg-${cor}">
          <i class="fas ${icone}"></i>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h6 class="mb-1">${descricao}</h6>
            <small class="text-muted">${data}</small>
          </div>
          <div class="timeline-body">
            <div class="operation-detail"><i class="fas fa-map-marker-alt me-1"></i>Posição: ${posicao}</div>
            <div class="operation-detail"><i class="fas fa-user me-1"></i>Operador: ${usuario}</div>
            ${infoTransporte}
            ${observacoes ? `<div class="operation-detail"><i class="fas fa-comment me-1"></i>Obs: ${observacoes}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Função principal para buscar um container pelo número
 * @param {string} numeroContainer - Número do container a ser buscado
 * @param {boolean} mostrarHistorico - Se deve mostrar o histórico automaticamente
 */
async function buscarContainer(numeroContainer, mostrarHistorico = false) {
  console.log(`🔍 Iniciando busca do container: ${numeroContainer}`);
  
  // Verificar se o número do container foi fornecido
  if (!numeroContainer || numeroContainer.trim() === '') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Campo obrigatório',
        text: 'Por favor, informe o número do container.',
        confirmButtonColor: '#3085d6'
      });
    } else {
      alert('Por favor, informe o número do container.');
    }
    return;
  }
  
  // Normalizar o número do container
  numeroContainer = numeroContainer.trim().toUpperCase();
  
  // Obter o elemento onde os resultados serão exibidos
  const resultadoDiv = document.getElementById('resultado-consulta');
  const infoContainer = document.getElementById('info-container');
  
  if (!resultadoDiv || !infoContainer) {
    console.error('❌ Elementos de resultado não encontrados');
    return;
  }
  
  // Mostrar área de resultado
  resultadoDiv.style.display = 'block';
  
  // Mostrar indicador de carregamento
  infoContainer.innerHTML = `
    <div class="text-center p-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
      <p class="mt-2">Buscando informações do container ${numeroContainer}...</p>
    </div>
  `;
  
  try {
    // Fazer a requisição para a API
    console.log(`📡 Fazendo requisição para: /operacoes/buscar_container?numero=${numeroContainer}`);
    const response = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(numeroContainer)}`);
    const data = await response.json();
    
    console.log('📥 Resposta da API:', data);
    
    // Limpar área de resultado
    infoContainer.innerHTML = '';
    
    // Processar a resposta
    if (data.success && data.container) {
      // Container encontrado
      console.log('✅ Container encontrado:', data.container);
      exibirDadosContainer(data.container, data.operacoes || [], infoContainer, mostrarHistorico);
    } else {
      // Container não encontrado ou erro
      let mensagem = data.message || 'Container não encontrado no sistema.';
      if (data.wrong_unit) {
        mensagem = data.message;
      }
      
      infoContainer.innerHTML = `
        <div class="alert alert-warning" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          ${mensagem}
        </div>
      `;
      
      console.warn('⚠️ Container não encontrado:', mensagem);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar container:', error);
    infoContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-times-circle me-2"></i>
        Erro ao buscar informações do container. Tente novamente.
      </div>
    `;
  }
}

/**
 * Exibe os dados do container e seu histórico na interface
 * @param {Object} container - Dados do container
 * @param {Array} operacoes - Histórico de operações do container
 * @param {HTMLElement} containerElement - Elemento onde exibir os resultados
 * @param {boolean} mostrarHistorico - Se deve mostrar o histórico automaticamente
 */
function exibirDadosContainer(container, operacoes, containerElement, mostrarHistorico = false) {
  console.log('📊 Exibindo dados do container:', container);
  console.log('📋 Histórico de operações:', operacoes);
  
  // Criar card com informações do container
  const cardEl = document.createElement('div');
  cardEl.className = 'card mb-4';
  
  // Criar um ID único para o botão baseado no número do container
  const btnId = `btn-historico-${container.numero.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  // Determinar cor do badge baseado no status
  let badgeClass = 'bg-secondary';
  let statusText = container.status || 'Desconhecido';
  
  if (container.status === 'no patio') {
    badgeClass = 'bg-success';
    statusText = 'No Pátio';
  } else if (container.status === 'carregado') {
    badgeClass = 'bg-warning';
    statusText = 'Carregado';
  } else if (container.status === 'em transito') {
    badgeClass = 'bg-info';
    statusText = 'Em Trânsito';
  }
  
  cardEl.innerHTML = `
    <div class="card-header bg-success text-white">
      <h5 class="mb-0"><i class="fas fa-box me-2"></i>Container ${container.numero}</h5>
    </div>
    <div class="card-body">
      <div class="row mb-3">
        <div class="col-md-6">
          <div class="info-item">
            <strong>Status:</strong> 
            <span class="badge ${badgeClass} ms-1">${statusText}</span>
          </div>
          <div class="info-item">
            <strong>Posição Atual:</strong> ${formatarPosicaoExibicao(container.posicao_atual)}
          </div>
          <div class="info-item">
            <strong>Tipo:</strong> ${container.tipo || 'Não informado'}
          </div>
        </div>
        <div class="col-md-6">
          <div class="info-item">
            <strong>Tamanho:</strong> ${container.tamanho || 'Não informado'}
          </div>
          <div class="info-item">
            <strong>Unidade:</strong> ${container.unidade || 'N/A'}
          </div>
          <div class="info-item">
            <strong>Última Atualização:</strong> ${formatarData(container.ultima_atualizacao || container.data_atualizacao)}
          </div>
        </div>
      </div>
      
      <div class="mt-3">
        <button class="btn btn-primary" id="${btnId}" data-container="${container.numero}">
          <i class="fas fa-history me-2"></i>Ver Histórico Detalhado
        </button>
      </div>
      
      <div class="mt-4">
        <h6><i class="fas fa-clipboard-check me-2"></i>Última Vistoria</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="info-item"><strong>Status Vistoria:</strong> ${container.status_vistoria || 'Não informado'}</div>
            <div class="info-item"><strong>ISO:</strong> ${container.iso_container || 'Não informado'}</div>
            <div class="info-item"><strong>Lacre:</strong> ${container.lacre || 'Não informado'}</div>
          </div>
          <div class="col-md-6">
            <div class="info-item"><strong>Vagão:</strong> ${container.vagao || 'Não informado'}</div>
            <div class="info-item"><strong>Placa:</strong> ${container.placa || 'Não informado'}</div>
            <div class="info-item"><strong>Data Vistoria:</strong> ${formatarData(container.data_vistoria)}</div>
          </div>
          ${container.observacoes ? `<div class="col-12 info-item"><strong>Observações:</strong> ${container.observacoes}</div>` : ''}
        </div>
      </div>

      <div class="mt-4">
        <h6><i class="fas fa-history me-2"></i>Últimas Operações</h6>
        <div class="historico-preview">
          ${gerarHtmlHistorico(operacoes.slice(0, 3))}
          ${operacoes.length > 3 ? '<div class="text-muted text-center mt-2"><small>Clique em "Ver Histórico Detalhado" para ver todas as operações</small></div>' : ''}
        </div>
      </div>
    </div>
  `;
  
  // Adicionar estilos para a timeline
  adicionarEstilosTimeline();
  
  // Adicionar o card ao DOM
  containerElement.appendChild(cardEl);
  
  // Configurar botão de histórico
  const btnHistorico = document.getElementById(btnId);
  if (btnHistorico) {
    console.log(`⚙️ Configurando botão de histórico: ${btnId}`);
    
    btnHistorico.onclick = function(event) {
      event.preventDefault();
      console.log(`🖱️ Clique no botão de histórico para: ${container.numero}`);
      mostrarHistoricoModal(container.numero, operacoes);
    };
    
    console.log('✅ Botão de histórico configurado com sucesso');
  } else {
    console.error(`❌ Botão de histórico ${btnId} não encontrado`);
  }
  
  // Rolar para o resultado
  containerElement.scrollIntoView({ behavior: 'smooth' });
  
  // Mostrar histórico automaticamente se solicitado
  if (mostrarHistorico) {
    console.log('📖 Mostrando histórico automaticamente');
    setTimeout(() => {
      mostrarHistoricoModal(container.numero, operacoes);
    }, 500);
  }
  
  console.log('✅ Dados do container exibidos com sucesso');
}

/**
 * Adiciona estilos CSS para a timeline se ainda não existirem
 */
function adicionarEstilosTimeline() {
  const styleId = 'timeline-styles';
  if (document.getElementById(styleId)) {
    return; // Estilos já adicionados
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    .info-item {
      margin-bottom: 0.5rem;
      padding: 0.25rem 0;
    }
    
    .timeline-container {
      position: relative;
      padding-left: 30px;
    }
    
    .timeline-item {
      position: relative;
      margin-bottom: 20px;
    }
    
    .timeline-item:before {
      content: '';
      position: absolute;
      left: -30px;
      top: 0;
      bottom: -20px;
      width: 2px;
      background-color: #e9ecef;
    }
    
    .timeline-item:last-child:before {
      display: none;
    }
    
    .timeline-badge {
      position: absolute;
      left: -38px;
      top: 0;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: white;
    }
    
    .timeline-content {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin-left: 10px;
    }
    
    .timeline-header h6 {
      color: #495057;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .timeline-body {
      font-size: 0.9rem;
    }
    
    .operation-detail {
      margin-bottom: 5px;
      color: #6c757d;
    }
    
    .operation-detail i {
      width: 16px;
      color: #007bff;
    }
    
    .historico-preview .timeline-container {
      max-height: 300px;
      overflow-y: auto;
    }
  `;
  
  document.head.appendChild(styleElement);
  console.log('📊 Estilos da timeline adicionados');
}

/**
 * Formata data para exibição
 * @param {string} data - Data no formato ISO ou string
 * @returns {string} Data formatada
 */
function formatarData(data) {
  if (!data) {
    return 'Não informado';
  }
  
  try {
    const dataObj = new Date(data);
    
    // Verificar se a data é válida
    if (isNaN(dataObj.getTime())) {
      return data; // Retornar a string original se não conseguir converter
    }
    
    // Formatar para o padrão brasileiro
    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.warn('Erro ao formatar data:', error);
    return data; // Retornar a string original em caso de erro
  }
}

/**
 * Formata a posição para exibição
 * @param {string} posicao - Posição do container
 * @returns {string} Posição formatada
 */
function formatarPosicaoExibicao(posicao) {
  if (!posicao) {
    return 'Não informado';
  }
  
  // Se já está no formato correto, retornar como está
  if (posicao.includes('-') || posicao.includes('→') || posicao.includes('DE:')) {
    return posicao;
  }
  
  // Se é uma posição simples no formato A01-1, manter como A01-1
  if (posicao.length === 4 && posicao[0].match(/[A-Z]/) && posicao.slice(1).match(/^\d{3}$/)) {
    return `${posicao[0]}${posicao.slice(1, 3)}-${posicao[3]}`;
  }
  
  return posicao;
}

/**
 * Gera o HTML para exibir o histórico de operações
 * @param {Array} operacoes - Lista de operações
 * @returns {string} HTML formatado
 */
function gerarHtmlHistorico(operacoes) {
  if (!operacoes || operacoes.length === 0) {
    return '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Nenhuma operação registrada.</div>';
  }

  let html = '<div class="timeline-container">';
  
  operacoes.forEach((operacao, index) => {
    // Determinar ícone e cor baseado no tipo de operação
    let icone = 'fas fa-circle';
    let cor = '#6c757d';
    
    switch (operacao.tipo?.toLowerCase()) {
      case 'descarga':
      case 'descarregamento':
        icone = 'fas fa-download';
        cor = '#28a745';
        break;
      case 'carregamento':
      case 'carga':
        icone = 'fas fa-upload';
        cor = '#007bff';
        break;
      case 'movimentacao':
      case 'movimentação':
        icone = 'fas fa-arrows-alt';
        cor = '#ffc107';
        break;
      case 'vistoria':
        icone = 'fas fa-search';
        cor = '#17a2b8';
        break;
      default:
        icone = 'fas fa-circle';
        cor = '#6c757d';
    }
    
    html += `
      <div class="timeline-item">
        <div class="timeline-badge" style="background-color: ${cor}">
          <i class="${icone}"></i>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h6>${operacao.tipo || 'Operação'}</h6>
            <small class="text-muted">${formatarData(operacao.data_operacao)}</small>
          </div>
          <div class="timeline-body">
            ${operacao.posicao ? `<p><strong>Posição:</strong> ${formatarPosicaoExibicao(operacao.posicao)}</p>` : ''}
            ${operacao.modo ? `<p><strong>Modo:</strong> ${operacao.modo}</p>` : ''}
            ${operacao.placa ? `<p><strong>Placa:</strong> ${operacao.placa}</p>` : ''}
            ${operacao.vagao ? `<p><strong>Vagão:</strong> ${operacao.vagao}</p>` : ''}
            ${operacao.usuario ? `<p><strong>Usuário:</strong> ${operacao.usuario}</p>` : ''}
            ${operacao.observacoes ? `<p><strong>Observações:</strong> ${operacao.observacoes}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Exibe o histórico do container em um modal
 * @param {string} numeroContainer - Número do container
 * @param {Array} operacoes - Lista de operações do container
 */
async function mostrarHistoricoModal(numeroContainer, operacoes) {
  console.log(`📋 Mostrando histórico modal para: ${numeroContainer}`);
  console.log(`📊 Operações disponíveis: ${operacoes ? operacoes.length : 0}`);
  
  // Verificar se SweetAlert2 está disponível
  if (typeof Swal === 'undefined') {
    console.error('❌ SweetAlert2 não está disponível');
    
    // Fallback para alert simples
    const resumo = operacoes && operacoes.length > 0 
      ? `${operacoes.length} operações registradas` 
      : 'Nenhuma operação registrada';
    
    alert(`Histórico do Container ${numeroContainer}\n\n${resumo}`);
    return;
  }
  
  try {
    // Verificar se operações é um array válido
    if (!Array.isArray(operacoes)) {
      console.warn('⚠️ Operações não é um array válido, usando array vazio');
      operacoes = [];
    }
    
    if (operacoes.length === 0) {
      console.warn('⚠️ Nenhuma operação disponível para mostrar');
      Swal.fire({
        title: `Histórico do Container ${numeroContainer}`,
        text: 'Nenhuma operação registrada para este container.',
        icon: 'info',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Gerar o HTML do histórico
    const historicoHtml = gerarHtmlHistorico(operacoes);
    
    // Adicionar estilos se necessário
    adicionarEstilosTimeline();
    
    // Criar o HTML completo do modal
    const modalHtml = `
      <div class="container-info mb-3">
        <div class="alert alert-info">
          <i class="fas fa-box me-2"></i>
          <strong>Container:</strong> ${numeroContainer} | 
          <strong>Total de operações:</strong> ${operacoes.length}
        </div>
      </div>
      <div class="container-history-wrapper" style="max-height: 60vh; overflow-y: auto;">
        ${historicoHtml}
      </div>
    `;
    
    console.log('📋 Preparando modal do SweetAlert2...');
    
    // Exibir o modal
    Swal.fire({
      title: `Histórico Completo`,
      html: modalHtml,
      width: '800px',
      showCloseButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#3085d6',
      allowOutsideClick: true,
      customClass: {
        popup: 'historico-modal',
        htmlContainer: 'historico-content'
      },
      didOpen: () => {
        console.log('✅ Modal de histórico aberto com sucesso');
      }
    }).then((result) => {
      console.log('📋 Modal de histórico fechado');
    }).catch(error => {
      console.error('❌ Erro ao exibir modal:', error);
    });
    
  } catch (error) {
    console.error('❌ Erro ao preparar modal de histórico:', error);
    
    // Fallback em caso de erro
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Erro',
        text: `Não foi possível exibir o histórico do container ${numeroContainer}.`,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      });
    } else {
      alert(`Erro ao exibir histórico do container ${numeroContainer}.`);
    }
  }
}

/**
 * Carrega a lista de containers do servidor
 * @returns {Promise<Array>} Lista de containers
 */
async function carregarContainersConsulta() {
  try {
    console.log('📦 Carregando containers para consulta...');
    const response = await fetch('/operacoes/containers/lista');
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.data.length} containers carregados para consulta`);
      return data.data || [];
    } else {
      console.error('❌ Erro ao carregar containers:', data.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Erro na requisição de containers:', error);
    return [];
  }
}

/**
 * Inicializa o combobox para o campo de consulta de container
 */
async function inicializarComboboxConsulta() {
  try {
    console.log('🔧 Inicializando combobox de consulta...');
    
    // Obter o campo de input
    const containerInput = document.querySelector('#container_consulta');
    
    if (!containerInput) {
      console.error('❌ Campo de consulta de container não encontrado');
      console.log('⏳ Aguardando DOM para tentar novamente em 500ms...');
      // Tentar novamente após um delay
      setTimeout(inicializarComboboxConsulta, 500);
      return;
    }
    
    // Verificar se o input já tem um combobox configurado
    if (containerInput.hasAttribute('data-combobox-initialized')) {
      console.log('ℹ️ Combobox já inicializado para este campo');
      return;
    }
    
    // Carregar lista de containers
    const containers = await carregarContainersConsulta();
    
    // Configurar o combobox usando a função global se disponível
    if (typeof window.criarComboboxContainers === 'function') {
      window.criarComboboxContainers(containerInput, containers);
      console.log('✅ Combobox de consulta configurado com função global');
    } else {
      // Implementação local simplificada
      console.log('🔧 Usando implementação local do combobox');
      configurarComboboxLocal(containerInput, containers);
    }
    
    // Marcar como inicializado
    containerInput.setAttribute('data-combobox-initialized', 'true');
    
    console.log('✅ Combobox de consulta inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar combobox de consulta:', error);
  }
}

/**
 * Configuração local do combobox quando a função global não está disponível
 * @param {HTMLElement} input - Campo de input
 * @param {Array} containers - Lista de containers
 */
function configurarComboboxLocal(input, containers) {
  let timeoutId = null;
  
  // Criar wrapper para o combobox se não existir
  let wrapper = input.closest('.combobox-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'combobox-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    
    // Substituir input pelo wrapper + input
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    
    console.log('✅ Wrapper de combobox criado para o campo de consulta');
  }
  
  // Configurar input
  input.setAttribute('autocomplete', 'off');
  input.classList.add('combobox-input');
  
  // Evento de input para busca
  input.addEventListener('input', function() {
    const valor = this.value.trim().toUpperCase();
    
    // Cancelar timeout anterior
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Debounce para evitar muitas requisições
    timeoutId = setTimeout(() => {
      if (valor.length >= 1) { // Reduzido para 1 caractere para facilitar a busca
        const sugestoes = containers.filter(c => 
          c.numero.toUpperCase().includes(valor)
        ).slice(0, 10);
        
        mostrarSugestoesLocal(input, sugestoes);
      } else if (document.activeElement === input) {
        // Se o campo está em foco mas vazio, mostrar todas as opções (limitadas)
        mostrarSugestoesLocal(input, containers.slice(0, 10));
      } else {
        esconderSugestoesLocal();
      }
    }, 200); // Reduzido para 200ms para resposta mais rápida
  });
  
  // Mostrar sugestões ao clicar no campo
  input.addEventListener('focus', function() {
    // Se o campo está vazio, mostrar todas as opções (limitadas)
    if (!this.value.trim()) {
      mostrarSugestoesLocal(input, containers.slice(0, 10));
    } else {
      // Simular evento de input para mostrar sugestões filtradas
      this.dispatchEvent(new Event('input'));
    }
  });
  
  // Fechar sugestões ao clicar fora
  document.addEventListener('click', function(e) {
    if (e.target !== input && !e.target.closest('.combobox-suggestions')) {
      esconderSugestoesLocal();
    }
  });
  
  console.log('✅ Combobox local configurado com sucesso');
}

/**
 * Mostra sugestões locais do combobox
 * @param {HTMLElement} input - Campo de input
 * @param {Array} sugestoes - Lista de sugestões
 */
function mostrarSugestoesLocal(input, sugestoes) {
  // Remover lista existente
  esconderSugestoesLocal();
  
  if (sugestoes.length === 0) {
    console.log('ℹ️ Nenhuma sugestão disponível para mostrar');
    return;
  }
  
  console.log(`🔍 Mostrando ${sugestoes.length} sugestões de containers`);
  
  // Criar lista de sugestões
  const suggestionsList = document.createElement('div');
  suggestionsList.id = 'container-sugestoes-local';
  suggestionsList.className = 'combobox-suggestions';
  suggestionsList.style.cssText = `
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background-color: white;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    max-height: 250px;
    overflow-y: auto;
    z-index: 1050;
    box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    margin-top: 2px;
  `;
  
  // Adicionar título à lista de sugestões
  const header = document.createElement('div');
  header.className = 'suggestion-header';
  header.style.cssText = `
    padding: 8px 12px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-weight: bold;
    color: #495057;
    font-size: 0.9rem;
  `;
  header.textContent = `Containers (${sugestoes.length})`;
  suggestionsList.appendChild(header);
  
  // Adicionar cada container à lista de sugestões
  sugestoes.forEach(container => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = `
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    // Criar estrutura com número do container e status
    const containerInfo = document.createElement('div');
    containerInfo.style.cssText = `
      display: flex;
      flex-direction: column;
    `;
    
    // Número do container em negrito
    const numeroContainer = document.createElement('strong');
    numeroContainer.textContent = container.numero;
    containerInfo.appendChild(numeroContainer);
    
    // Adicionar informações adicionais se disponíveis
    if (container.posicao_atual || container.status) {
      const infoAdicional = document.createElement('small');
      infoAdicional.style.cssText = `
        color: #6c757d;
        font-size: 0.85rem;
        margin-top: 2px;
      `;
      
      // Mostrar posição e status se disponíveis
      const infos = [];
      if (container.posicao_atual) infos.push(`Posição: ${container.posicao_atual}`);
      if (container.status) infos.push(container.status);
      
      infoAdicional.textContent = infos.join(' | ');
      containerInfo.appendChild(infoAdicional);
    }
    
    item.appendChild(containerInfo);
    
    // Adicionar badge de status se disponível
    if (container.status) {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge';
      
      // Definir cor baseada no status
      let badgeClass = 'bg-secondary';
      if (container.status.includes('patio')) badgeClass = 'bg-success';
      if (container.status.includes('carregado')) badgeClass = 'bg-primary';
      if (container.status.includes('vistoria')) badgeClass = 'bg-warning';
      
      statusBadge.style.cssText = `
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        color: white;
        background-color: var(--bs-${badgeClass.split('-')[1]});
      `;
      
      statusBadge.textContent = container.status;
      item.appendChild(statusBadge);
    }
    
    // Adicionar evento de hover
    item.addEventListener('mouseenter', function() {
      this.style.backgroundColor = '#f8f9fa';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.backgroundColor = 'white';
    });
    
    // Adicionar evento de clique
    item.addEventListener('click', function() {
      input.value = container.numero;
      input.classList.add('is-valid');
      esconderSugestoesLocal();
      
      // Disparar evento de change para acionar outros listeners
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focar no input após selecionar
      input.focus();
      
      console.log(`✅ Container selecionado: ${container.numero}`);
    });
    
    suggestionsList.appendChild(item);
  });
  
  // Adicionar à página - usar o wrapper do combobox se existir
  const wrapper = input.closest('.combobox-wrapper') || input.parentElement;
  wrapper.appendChild(suggestionsList);
  
  // Garantir que a lista de sugestões seja visível
  const rect = suggestionsList.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  
  // Se a lista estiver saindo da tela, ajustar posição
  if (rect.bottom > viewportHeight) {
    suggestionsList.style.maxHeight = `${Math.max(100, viewportHeight - rect.top - 20)}px`;
  }
}
function esconderSugestoesLocal() {
  const listaSugestoes = document.getElementById('container-sugestoes-local');
  if (listaSugestoes) {
    listaSugestoes.remove();
  }
}

// ========================================
// EXPORTAÇÃO DE FUNÇÕES PARA USO GLOBAL
// ========================================

// Disponibilizar funções para uso global
window.inicializarComboboxConsulta = inicializarComboboxConsulta;
window.carregarContainersConsulta = carregarContainersConsulta;
window.buscarContainer = buscarContainer;

// ========================================
// INICIALIZAÇÃO DO MÓDULO
// ========================================

// Função de inicialização principal do módulo
function inicializarModuloConsulta() {
  console.log('🚀 Inicializando módulo de consulta de containers...');
  
  // Configurar o formulário de consulta
  const formConsulta = document.getElementById('formConsulta');
  if (formConsulta) {
    console.log('📋 Configurando formulário de consulta...');
    
    // Remover listeners antigos para evitar duplicação
    const novoForm = formConsulta.cloneNode(true);
    formConsulta.parentNode.replaceChild(novoForm, formConsulta);
    
    // Configurar o novo formulário
    novoForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const numeroContainer = document.getElementById('container_consulta').value.trim();
      
      if (numeroContainer) {
        console.log(`🔍 Submetendo consulta para: ${numeroContainer}`);
        buscarContainer(numeroContainer);
      } else {
        console.warn('⚠️ Campo de container vazio');
        
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Campo obrigatório',
            text: 'Digite o número do container para consultar.',
            confirmButtonColor: '#3085d6'
          });
        } else {
          alert('Digite o número do container para consultar.');
        }
      }
    });
    
    console.log('✅ Formulário de consulta configurado');
  } else {
    console.warn('⚠️ Formulário de consulta não encontrado');
  }
  
  // Inicializar combobox para o campo de consulta
  setTimeout(() => {
    if (document.getElementById('container_consulta')) {
      inicializarComboboxConsulta();
    } else {
      console.warn('⚠️ Campo de consulta não encontrado para inicializar combobox');
    }
  }, 500);
  
  console.log('✅ Módulo de consulta de containers inicializado');
}

// Inicializar o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  inicializarModuloConsulta();
});

// ========================================
// FUNÇÃO DE TESTE PARA DEBUG
// ========================================

/**
 * Função de teste para verificar o modal de histórico
 * Uso: testarModalHistorico() no console
 */
function testarModalHistorico() {
  console.log('🧪 Iniciando teste do modal de histórico...');
  
  const numeroContainer = 'TESTE123456';
  const operacoesTeste = [
    {
      data_operacao: new Date().toISOString(),
      tipo: 'DESCARGA',
      posicao: 'A01-1',
      usuario: 'Operador Teste',
      placa: 'ABC-1234',
      observacoes: 'Operação de teste'
    },
    {
      data_operacao: new Date(Date.now() - 86400000).toISOString(),
      tipo: 'MOVIMENTACAO',
      posicao: 'B05-2',
      usuario: 'Operador Teste',
      observacoes: 'Movimentação interna'
    },
    {
      data_operacao: new Date(Date.now() - 172800000).toISOString(),
      tipo: 'CARREGAMENTO',
      posicao: 'EM TRANSITO',
      usuario: 'Operador Teste',
      vagao: 'V123456'
    }
  ];
  
  console.log('🧪 Testando com dados:', { numeroContainer, operacoesTeste });
  mostrarHistoricoModal(numeroContainer, operacoesTeste);
}

// Exportar funções para uso global
window.testarModalHistorico = testarModalHistorico;
window.mostrarHistoricoModal = mostrarHistoricoModal;

console.log('✅ Módulo search-container.js carregado com sucesso');