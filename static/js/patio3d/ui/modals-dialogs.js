/**
 * Sistema de Modais e Diálogos
 * Gerencia janelas modais, diálogos e popups da interface
 */

export class ModalsDialogs {
    constructor() {
      this.modalAtivo = null;
      this.debug = this.debug.bind(this);
      this.setupEventListeners();
    }
  
    setupEventListeners() {
      // Event listener para mostrar modal de ajuda
      document.addEventListener('mostrarModalAjuda', () => {
        this.mostrarAjuda();
      });
  
      // Event listener para fechar modais com ESC
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.modalAtivo) {
          this.fecharModal(this.modalAtivo);
        }
      });
    }
  
    // ===== MODAL DE AJUDA =====
    mostrarAjuda() {
      const modal = this.criarModal('modal-ajuda', 'Ajuda - Sistema 3D');
      
      const conteudo = `
        <div style="display: grid; gap: 1.5rem; max-height: 60vh; overflow-y: auto;">
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">🎮 Controles</h5>
            <ul style="margin: 0; padding-left: 1rem;">
              <li>🖱️ <strong>Mouse:</strong> Arrastar para rotacionar, roda para zoom</li>
              <li>👆 <strong>Clique:</strong> Selecionar containers</li>
              <li>📱 <strong>Touch:</strong> Suporte completo para dispositivos móveis</li>
            </ul>
          </div>
          
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">⌨️ Atalhos de Teclado</h5>
            <ul style="margin: 0; padding-left: 1rem;">
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Ctrl+F</kbd> - Tela cheia</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Ctrl+S</kbd> - Exportar imagem</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Ctrl+R</kbd> - Reset completo</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Espaço</kbd> - Toggle posições vazias</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Esc</kbd> - Desselecionar</li>
            </ul>
          </div>
          
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">📊 Recursos</h5>
            <ul style="margin: 0; padding-left: 1rem;">
              <li>🔍 <strong>Busca:</strong> Digite o número do container</li>
              <li>🎯 <strong>Filtros:</strong> Por row, altura e status</li>
              <li>👁️ <strong>Toggle:</strong> Labels, infraestrutura, posições vazias</li>
              <li>⚠️ <strong>Alertas:</strong> Detecção automática de problemas</li>
              <li>📷 <strong>Vistas:</strong> Geral, aérea, lateral, foco containers</li>
            </ul>
          </div>
          
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">🎨 Cores dos Armadores</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.85rem;">
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #4CAF50; border-radius: 2px; margin-right: 0.5rem;"></span>EVERGREEN</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #2196F3; border-radius: 2px; margin-right: 0.5rem;"></span>MAERSK</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #FF9800; border-radius: 2px; margin-right: 0.5rem;"></span>MSC</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #F44336; border-radius: 2px; margin-right: 0.5rem;"></span>COSCO</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #9C27B0; border-radius: 2px; margin-right: 0.5rem;"></span>CMA CGM</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #FF5722; border-radius: 2px; margin-right: 0.5rem;"></span>HAPAG-LLOYD</div>
            </div>
          </div>
        </div>
      `;
  
      this.adicionarConteudoModal(modal, conteudo);
      this.adicionarBotaoFechar(modal, 'Entendi');
      this.mostrarModal(modal);
    }
  
    // ===== MODAL DE CONFIRMAÇÃO =====
    mostrarConfirmacao(titulo, mensagem, onConfirm, onCancel) {
      const modal = this.criarModal('modal-confirmacao', titulo);
      
      const conteudo = `
        <div style="text-align: center; padding: 1rem 0;">
          <p style="font-size: 1.1rem; margin-bottom: 2rem;">${mensagem}</p>
        </div>
      `;
  
      this.adicionarConteudoModal(modal, conteudo);
      
      // Botões personalizados
      const botoesContainer = document.createElement('div');
      botoesContainer.style.cssText = 'display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;';
      
      const btnCancelar = document.createElement('button');
      btnCancelar.innerHTML = '<i class="fas fa-times me-2"></i>Cancelar';
      btnCancelar.style.cssText = 'background: #6c757d; border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: bold;';
      btnCancelar.onclick = () => {
        this.fecharModal(modal);
        if (onCancel) onCancel();
      };
  
      const btnConfirmar = document.createElement('button');
      btnConfirmar.innerHTML = '<i class="fas fa-check me-2"></i>Confirmar';
      btnConfirmar.style.cssText = 'background: linear-gradient(45deg, #dc3545, #c82333); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: bold;';
      btnConfirmar.onclick = () => {
        this.fecharModal(modal);
        if (onConfirm) onConfirm();
      };
  
      botoesContainer.appendChild(btnCancelar);
      botoesContainer.appendChild(btnConfirmar);
      
      const modalBody = modal.querySelector('.modal-body');
      modalBody.appendChild(botoesContainer);
      
      this.mostrarModal(modal);
      
      return modal;
    }
  
    // ===== MODAL DE INFORMAÇÕES =====
    mostrarInformacoes(titulo, conteudo, icone = 'info-circle') {
      const modal = this.criarModal('modal-informacoes', titulo, icone);
      this.adicionarConteudoModal(modal, conteudo);
      this.adicionarBotaoFechar(modal, 'Fechar');
      this.mostrarModal(modal);
      return modal;
    }
  
    // ===== MODAL DE BUSCA AVANÇADA =====
    mostrarBuscaAvancada(onSearch) {
      const modal = this.criarModal('modal-busca-avancada', 'Busca Avançada', 'search');
      
      const conteudo = `
        <div style="display: grid; gap: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Número do Container:</label>
            <input type="text" id="busca-numero" class="form-control" placeholder="Digite o número...">
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Row:</label>
              <select id="busca-row" class="form-select">
                <option value="">Todos</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Altura:</label>
              <select id="busca-altura" class="form-select">
                <option value="">Todas</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Armador:</label>
              <select id="busca-armador" class="form-select">
                <option value="">Todos</option>
                <option value="EVERGREEN">EVERGREEN</option>
                <option value="MAERSK">MAERSK</option>
                <option value="MSC">MSC</option>
                <option value="COSCO">COSCO</option>
                <option value="CMA CGM">CMA CGM</option>
                <option value="HAPAG-LLOYD">HAPAG-LLOYD</option>
              </select>
            </div>
            
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Tamanho:</label>
              <select id="busca-tamanho" class="form-select">
                <option value="">Todos</option>
                <option value="20">20 TEU</option>
                <option value="40">40 TEU</option>
              </select>
            </div>
          </div>
        </div>
      `;
  
      this.adicionarConteudoModal(modal, conteudo);
      
      // Botões personalizados
      const botoesContainer = document.createElement('div');
      botoesContainer.style.cssText = 'display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;';
      
      const btnLimpar = document.createElement('button');
      btnLimpar.innerHTML = '<i class="fas fa-eraser me-2"></i>Limpar';
      btnLimpar.style.cssText = 'background: #6c757d; border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer;';
      btnLimpar.onclick = () => {
        modal.querySelectorAll('input, select').forEach(el => el.value = '');
      };
  
      const btnBuscar = document.createElement('button');
      btnBuscar.innerHTML = '<i class="fas fa-search me-2"></i>Buscar';
      btnBuscar.style.cssText = 'background: linear-gradient(45deg, #007bff, #0056b3); border: none; color: white; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: bold;';
      btnBuscar.onclick = () => {
        const criterios = {
          numero: document.getElementById('busca-numero').value,
          row: document.getElementById('busca-row').value,
          altura: document.getElementById('busca-altura').value,
          armador: document.getElementById('busca-armador').value,
          tamanho: document.getElementById('busca-tamanho').value
        };
        
        this.fecharModal(modal);
        if (onSearch) onSearch(criterios);
      };
  
      botoesContainer.appendChild(btnLimpar);
      botoesContainer.appendChild(btnBuscar);
      
      const modalBody = modal.querySelector('.modal-body');
      modalBody.appendChild(botoesContainer);
      
      this.mostrarModal(modal);
      
      // Focar no primeiro campo
      setTimeout(() => {
        const primeiroInput = modal.querySelector('#busca-numero');
        if (primeiroInput) primeiroInput.focus();
      }, 300);
      
      return modal;
    }
  
    // ===== MODAL DE DETALHES DE PROBLEMA =====
    mostrarDetalhesProblemas(problemas) {
      const modal = this.criarModal('modal-problemas', 'Problemas Detectados', 'exclamation-triangle');
      
      let conteudo = '<div style="max-height: 400px; overflow-y: auto;">';
      
      problemas.forEach((problema, index) => {
        const severidadeColor = problema.severidade === 'crítica' ? '#dc3545' : '#ffc107';
        const severidadeIcon = problema.severidade === 'crítica' ? 'exclamation-circle' : 'exclamation-triangle';
        
        conteudo += `
          <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid ${severidadeColor};">
            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
              <i class="fas fa-${severidadeIcon}" style="color: ${severidadeColor}; margin-right: 0.5rem;"></i>
              <strong style="color: ${severidadeColor};">${problema.severidade.toUpperCase()}</strong>
            </div>
            <div><strong>Container:</strong> ${problema.container.numero}</div>
            <div><strong>Posição:</strong> ${problema.container.row || problema.container.linha}${String(problema.container.bay || problema.container.baia).padStart(2, '0')}-${problema.container.altura}</div>
            <div><strong>Problema:</strong> ${problema.problema}</div>
          </div>
        `;
      });
      
      conteudo += '</div>';
      
      this.adicionarConteudoModal(modal, conteudo);
      this.adicionarBotaoFechar(modal, 'Entendi');
      this.mostrarModal(modal);
      
      return modal;
    }
  
    // ===== MODAL DE ESTATÍSTICAS =====
    mostrarEstatisticas(estatisticas) {
      const modal = this.criarModal('modal-estatisticas', 'Estatísticas do Pátio', 'chart-bar');
      
      const conteudo = `
        <div style="display: grid; gap: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="background: rgba(76, 175, 80, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #4CAF50;">${estatisticas.totalContainers || 0}</div>
              <div>Total de Containers</div>
            </div>
            
            <div style="background: rgba(33, 150, 243, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #2196F3;">${estatisticas.containers20 || 0}</div>
              <div>Containers 20 TEU</div>
            </div>
            
            <div style="background: rgba(156, 39, 176, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: #9C27B0;">${estatisticas.containers40 || 0}</div>
              <div>Containers 40 TEU</div>
            </div>
          </div>
          
          <div>
            <h6 style="color: #FFD700; margin-bottom: 1rem;">Distribuição por Row:</h6>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
              ${['A', 'B', 'C', 'D', 'E'].map(row => `
                <div style="background: rgba(255, 255, 255, 0.1); padding: 0.5rem; border-radius: 4px; text-align: center;">
                  <div style="font-weight: bold;">${row}</div>
                  <div>${estatisticas[`row${row}`] || 0}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      
      this.adicionarConteudoModal(modal, conteudo);
      this.adicionarBotaoFechar(modal, 'Fechar');
      this.mostrarModal(modal);
      
      return modal;
    }
  
    // ===== MODAL DE DETALHES DO CONTAINER =====
    mostrarDetalhesContainerModal(container) {
      try {
        console.log('🔍 [MODAL DEBUG] Dados recebidos:', container);
        
        if (!container) {
          console.error('Container não informado');
          return;
        }

        const modal = this.criarModal('modal-container-detalhes', `Container ${container.numero}`, 'shipping-fast');
        
        // Preparar dados para exibição (usando campos reais do banco)
        const tamanho = container.tamanho || '20';
        const status = container.status || 'Normal';
        const posicao = container.posicao_atual || container.posicao || 'Não informada';
        const armador = container.armador || 'Não informado';
        const capacidade = container.capacidade || 'Não informada';
        const tara = container.tara || 'Não informada';
        const booking = container.booking || 'Não informado';
        const dataEntrada = container.data_criacao || 'Não informada';
        const dataAtualizacao = container.ultima_atualizacao || 'Não informada';
        const unidade = container.unidade || 'Não informada';
        const tipo = container.tipo_container || 'Standard';
        
        // Dados de vistoria (da tabela vistorias) - pegar a mais recente
        const vistorias = container.vistorias || [];
        console.log('🔍 [MODAL DEBUG] Vistorias encontradas:', vistorias.length, vistorias);
        const vistoriaMaisRecente = vistorias.length > 0 ? vistorias[0] : null;
        const statusVistoria = vistoriaMaisRecente ? 'Realizada' : 'Pendente';
        const dataVistoria = vistoriaMaisRecente ? vistoriaMaisRecente.data_vistoria : 'Não realizada';
        const condicaoVistoria = vistoriaMaisRecente ? (vistoriaMaisRecente.condicao || 'Não informada') : 'Não informada';
        const lacre = vistoriaMaisRecente ? (vistoriaMaisRecente.lacre || 'Não informado') : 'Não informado';
        const observacoesVistoria = vistoriaMaisRecente ? (vistoriaMaisRecente.observacoes_gerais || vistoriaMaisRecente.observacoes || 'Nenhuma observação') : 'Nenhuma observação';
        const tipoOperacao = vistoriaMaisRecente ? (vistoriaMaisRecente.tipo_operacao || 'Não informada') : 'Não informada';
        
        // Dados de operações (da tabela operacoes) - pegar a mais recente
        const operacoes = container.operacoes || [];
        console.log('🔍 [MODAL DEBUG] Operações encontradas:', operacoes.length, operacoes);
        const ultimaOperacao = operacoes.length > 0 ? operacoes[0] : null;
        const tipoUltimaOperacao = ultimaOperacao ? (ultimaOperacao.tipo || 'Não informada') : 'Não informada';
        const modoOperacao = ultimaOperacao ? (ultimaOperacao.modo || 'Não informado') : 'Não informado';
        const placaVeiculo = ultimaOperacao ? (ultimaOperacao.placa || 'Não informada') : 'Não informada';
        const vagao = ultimaOperacao ? (ultimaOperacao.vagao || 'Não informado') : 'Não informado';
        const dataUltimaOperacao = ultimaOperacao ? (ultimaOperacao.data_operacao || 'Não informada') : 'Não informada';
        
        // Avarias
        const avarias = container.avarias || [];
        console.log('🔍 [MODAL DEBUG] Avarias encontradas:', avarias.length, avarias);
        const temAvarias = avarias.length > 0;
        const quantidadeAvarias = avarias.length;
        
        // Informações técnicas adicionais
        const flutuante = container.flutuante ? 'Sim' : 'Não';
        const bloqueado = container.bloqueado ? 'Sim' : 'Não';
        const temperaturaControlada = container.reefer ? 'Sim' : 'Não';
        
        const conteudo = `
          <div class="container-detalhes">
            <!-- Informações Básicas -->
            <div class="row mb-4">
              <div class="col-12">
                <h5 class="text-primary mb-3">
                  <i class="fas fa-info-circle me-2"></i>Informações Básicas
                </h5>
                <div class="row">
                  <div class="col-md-6">
                    <p><strong>Número:</strong> <span class="text-primary fw-bold">${container.numero}</span></p>
                    <p><strong>Status:</strong> <span class="badge bg-info">${status}</span></p>
                    <p><strong>Posição Atual:</strong> <span class="badge bg-secondary">${posicao}</span></p>
                    <p><strong>Tamanho:</strong> ${tamanho} TEU</p>
                    <p><strong>Tipo:</strong> ${tipo}</p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Armador:</strong> ${armador}</p>
                    <p><strong>Capacidade:</strong> ${capacidade}</p>
                    <p><strong>Tara:</strong> ${tara}</p>
                    <p><strong>Booking:</strong> ${booking}</p>
                    <p><strong>Unidade:</strong> ${unidade}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Informações Técnicas -->
            <div class="row mb-4">
              <div class="col-12">
                <h5 class="text-secondary mb-3">
                  <i class="fas fa-cogs me-2"></i>Informações Técnicas
                </h5>
                <div class="row">
                  <div class="col-md-6">
                    <p><strong>Data de Criação:</strong> ${this.formatarData(dataEntrada)}</p>
                    <p><strong>Última Atualização:</strong> ${this.formatarData(dataAtualizacao)}</p>
                    <p><strong>ID Sistema:</strong> ${container.id || 'N/A'}</p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Tipo de Operação:</strong> ${tipoOperacao}</p>
                    <p><strong>Última Operação:</strong> ${tipoUltimaOperacao}</p>
                    <p><strong>Data Última Operação:</strong> ${this.formatarData(dataUltimaOperacao)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Vistoria -->
            <div class="row mb-4">
              <div class="col-12">
                <h5 class="text-secondary mb-3">
                  <i class="fas fa-search me-2"></i>Vistoria
                </h5>
                <div class="row">
                  <div class="col-md-6">
                    <p><strong>Status:</strong> <span class="badge ${statusVistoria === 'Realizada' ? 'bg-success' : 'bg-warning'}">${statusVistoria}</span></p>
                    <p><strong>Data:</strong> ${this.formatarData(dataVistoria)}</p>
                    <p><strong>Condição:</strong> ${condicaoVistoria}</p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Lacre:</strong> ${lacre}</p>
                    <p><strong>Observações:</strong> ${observacoesVistoria}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Operações -->
            <div class="row mb-4">
              <div class="col-12">
                <h5 class="text-info mb-3">
                  <i class="fas fa-truck-loading me-2"></i>Operações
                </h5>
                <div class="row">
                  <div class="col-md-6">
                    <p><strong>Última Operação:</strong> ${tipoUltimaOperacao}</p>
                    <p><strong>Data:</strong> ${this.formatarData(dataUltimaOperacao)}</p>
                    <p><strong>Modo:</strong> ${modoOperacao}</p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Placa do Veículo:</strong> ${placaVeiculo}</p>
                    <p><strong>Vagão:</strong> ${vagao}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Avarias -->
            <div class="row mb-4">
              <div class="col-12">
                <h5 class="text-danger mb-3">
                  <i class="fas fa-exclamation-triangle me-2"></i>Avarias
                </h5>
                <div class="alert ${temAvarias ? 'alert-danger' : 'alert-success'}">
                  ${temAvarias ? 
                    `<p><strong>Quantidade:</strong> <span class="badge bg-danger">${quantidadeAvarias}</span> avaria(s) encontrada(s)</p>
                     <div class="avarias-lista mt-3">
                        ${container.avarias.map((avaria, index) => 
                          `<div class="avaria-item mb-3 p-3 border-start border-danger border-3 bg-light rounded">
                             <div class="d-flex justify-content-between align-items-start">
                               <div>
                                 <h6 class="text-danger mb-1">${avaria.estrutura_nome || `Estrutura ${avaria.estrutura_codigo || index + 1}`}</h6>
                                 <p class="mb-1"><strong>Avaria:</strong> ${avaria.avaria_nome || avaria.avaria_codigo || 'Não especificada'}</p>
                                 <p class="mb-1">${avaria.observacoes || 'Sem observações'}</p>
                                 ${avaria.data_registro ? `<small class="text-muted d-block mt-1">Data: ${this.formatarData(avaria.data_registro)}</small>` : ''}
                               </div>
                             </div>
                           </div>`
                        ).join('')}
                     </div>` : 
                    '<p class="text-success"><i class="fas fa-check-circle"></i> Nenhuma avaria registrada</p>'
                  }
                </div>
              </div>
            </div>
            
            <!-- Histórico de Operações -->
            ${container.operacoes && container.operacoes.length > 0 ? `
            <div class="row mb-4">
              <div class="col-12">
                <h5 class="text-warning mb-3">
                  <i class="fas fa-history me-2"></i>Histórico de Operações
                </h5>
                <div class="timeline">
                  ${container.operacoes.slice(0, 5).map(op => 
                    `<div class="timeline-item mb-2 p-2 border-start border-warning border-2">
                       <small class="text-muted">${this.formatarData(op.data_operacao)}</small>
                       <p class="mb-1"><strong>${op.tipo}</strong> ${op.modo ? `- ${op.modo}` : ''}</p>
                       <div class="small text-muted">
                         ${op.posicao ? `<div>Posição: ${op.posicao}</div>` : ''}
                         ${op.placa ? `<div>Placa: ${op.placa}</div>` : ''}
                         ${op.vagao ? `<div>Vagão: ${op.vagao}</div>` : ''}
                         ${op.observacoes ? `<div>Obs: ${op.observacoes}</div>` : ''}
                       </div>
                     </div>`
                  ).join('')}
                  ${container.operacoes.length > 5 ? '<small class="text-muted">... e mais operações</small>' : ''}
                </div>
              </div>
            </div>
            ` : ''}
            
            <!-- Ações Rápidas -->
            <div class="row">
              <div class="col-12">
                <h5 class="text-secondary mb-3">
                  <i class="fas fa-tools me-2"></i>Ações Rápidas
                </h5>
                <div class="d-flex gap-2 flex-wrap">
                  <button onclick="window.location.href='/operacoes/vistoria/${container.numero}'" 
                          class="btn btn-success btn-sm">
                    <i class="fas fa-search me-1"></i>Ir para Vistoria
                  </button>
                  <button onclick="window.location.href='/operacoes/descarga/${container.numero}'" 
                          class="btn btn-info btn-sm">
                    <i class="fas fa-truck-loading me-1"></i>Ir para Descarga
                  </button>
                  <button onclick="window.location.href='/operacoes/movimentacao?container=${container.numero}'" 
                          class="btn btn-warning btn-sm">
                    <i class="fas fa-arrows-alt me-1"></i>Movimentar
                  </button>
                  <button onclick="window.interactionHandler?.centralizarContainer('${container.numero}')" 
                          class="btn btn-secondary btn-sm">
                    <i class="fas fa-crosshairs me-1"></i>Centralizar
                  </button>
                  <button onclick="window.location.href='/operacoes/containers?busca=${container.numero}'" 
                          class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-list me-1"></i>Ver na Lista
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        this.adicionarConteudoModal(modal, conteudo);
        this.adicionarBotaoFechar(modal, 'Fechar');
        this.mostrarModal(modal);
        
      } catch (error) {
        console.error('Erro ao mostrar modal de detalhes do container:', error);
      }
    }
  
    // Método auxiliar para obter cor de acordo com o status
    getStatusColor(status) {
      const statusColors = {
        'Normal': '#4CAF50',
        'Vistoriado': '#2196F3',
        'Avariado': '#F44336',
        'Flutuante': '#FF9800',
        'Urgente': '#E91E63',
        'Atrasado': '#FF5722'
      };
      
      return statusColors[status] || '#757575';
    }
  
    // ===== MÉTODO PARA FORMATAR DATAS =====
    formatarData(data) {
      if (!data) return 'Não informada';
      
      try {
        // Se já é uma string formatada, retornar como está
        if (typeof data === 'string' && data.includes('/')) {
          return data;
        }
        
        // Tentar criar um objeto Date
        const dataObj = new Date(data);
        
        // Verificar se é uma data válida
        if (isNaN(dataObj.getTime())) {
          return data; // Retornar o valor original se não conseguir converter
        }
        
        // Formatar no padrão brasileiro
        return dataObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        console.warn('Erro ao formatar data:', data, error);
        return data || 'Não informada';
      }
    }
  
    // ===== MÉTODOS AUXILIARES =====
    criarModal(id, titulo, icone = 'info-circle') {
      // Remover modal existente se houver
      const modalExistente = document.getElementById(id);
      if (modalExistente) {
        modalExistente.remove();
      }
  
      const modal = document.createElement("div");
      modal.id = id;
      modal.className = "modal-personalizado";
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
  
      const modalDialog = document.createElement("div");
      modalDialog.style.cssText = `
        background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,60,0.9) 100%);
        color: white;
        padding: 2rem;
        border-radius: 20px;
        width: 90%;
        max-width: 600px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        max-height: 80vh;
        overflow-y: auto;
        transform: scale(0.8);
        transition: transform 0.3s ease;
      `;
  
      const modalHeader = document.createElement("div");
      modalHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;";
      modalHeader.innerHTML = `
        <h3 style="margin: 0; color: #4CAF50;">
          <i class="fas fa-${icone} me-2"></i>
          ${titulo}
        </h3>
        <button class="btn-fechar-modal" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      `;
  
      const modalBody = document.createElement("div");
      modalBody.className = "modal-body";
  
      modalDialog.appendChild(modalHeader);
      modalDialog.appendChild(modalBody);
      modal.appendChild(modalDialog);
  
      // Event listeners
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.fecharModal(modal);
        }
      });
  
      modalHeader.querySelector('.btn-fechar-modal').addEventListener('click', () => {
        this.fecharModal(modal);
      });
  
      return modal;
    }
  
    adicionarConteudoModal(modal, conteudo) {
      const modalBody = modal.querySelector('.modal-body');
      modalBody.innerHTML = conteudo;
    }
  
    adicionarBotaoFechar(modal, texto = 'Fechar') {
      const modalBody = modal.querySelector('.modal-body');
      
      const botaoContainer = document.createElement('div');
      botaoContainer.style.cssText = 'text-align: center; margin-top: 2rem;';
      
      const botao = document.createElement('button');
      botao.innerHTML = `<i class="fas fa-check me-2"></i>${texto}`;
      botao.style.cssText = 'background: linear-gradient(45deg, #4CAF50, #45a049); border: none; color: white; padding: 0.8rem 2rem; border-radius: 10px; cursor: pointer; font-weight: bold;';
      botao.onclick = () => this.fecharModal(modal);
      
      botaoContainer.appendChild(botao);
      modalBody.appendChild(botaoContainer);
    }
  
    mostrarModal(modal) {
      document.body.appendChild(modal);
      this.modalAtivo = modal;
      
      // Animar entrada
      setTimeout(() => {
        modal.style.opacity = '1';
        const dialog = modal.querySelector('div');
        if (dialog) {
          dialog.style.transform = 'scale(1)';
        }
      }, 10);
    }
  
    fecharModal(modal) {
      if (!modal) return;
      
      // Animar saída
      modal.style.opacity = '0';
      const dialog = modal.querySelector('div');
      if (dialog) {
        dialog.style.transform = 'scale(0.8)';
      }
      
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        if (this.modalAtivo === modal) {
          this.modalAtivo = null;
        }
      }, 300);
    }
  
    fecharTodosModais() {
      document.querySelectorAll('.modal-personalizado').forEach(modal => {
        this.fecharModal(modal);
      });
      this.modalAtivo = null;
    }
  
    debug(message, type = "info") {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
      const formattedMsg = `${timestamp} ${prefix} ${message}`;
      console.log(formattedMsg);
    }
  
    formatarData(data) {
      if (!data || data === 'Não informada' || data === 'Não realizada') {
        return data;
      }
      
      try {
        const dataObj = new Date(data);
        if (isNaN(dataObj.getTime())) {
          return data; // Retorna o valor original se não for uma data válida
        }
        return dataObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return data; // Retorna o valor original em caso de erro
      }
    }
  }