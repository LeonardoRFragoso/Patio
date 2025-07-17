// ========================================
// MÓDULO: CORREÇÃO DE DESCARGA
// ========================================
// Este módulo gerencia a listagem de descargas corrigíveis e
// a aplicação da correção de posição para o perfil operador.
// Ele segue o padrão de outros módulos: expor função init({ appState })
// e encapsular todo o comportamento interno.
// ========================================

import { mostrarAlerta, mostrarConfirmacao } from './ui-utils.js';
import { scrollToFormulario } from './ui-utils.js';


const CorrecaoDescargaModule = (() => {
  // Elementos de UI
  let containerElement;

  // Estado interno
  let state = {
    descargas: [],
    carregando: false,
  };

  /**
   * Renderiza a lista de descargas corrigíveis
   */
  function renderLista() {
    if (!containerElement) return;

    containerElement.innerHTML = '';

    if (!state.descargas || state.descargas.length === 0) {
      containerElement.innerHTML = `
        <div class="alert alert-warning text-center" role="alert">
          Nenhuma descarga para corrigir encontrada.
        </div>`;
      return;
    }

    if (state.carregando) {
      containerElement.innerHTML = `
        <div class="text-center p-4">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Carregando descargas corrigíveis...</p>
        </div>`;
      return;
    }

    // Filtrar operações inválidas (sem ID ou container)
    const descargasValidas = state.descargas.filter(descarga => 
      descarga && descarga.operacao_id && descarga.container_numero
    );
    
    // Construir tabela
    const tabela = document.createElement('table');
    tabela.className = 'table table-striped table-hover table-bordered';
    tabela.innerHTML = `
      <thead class="table-light">
        <tr>
          <th>OPERAÇÃO</th>
          <th>CONTAINER</th>
          <th>POSIÇÃO ATUAL</th>
          <th>STATUS</th>
          <th>DATA/HORA</th>
          <th>AÇÃO</th>
        </tr>
      </thead>
      <tbody>
        ${descargasValidas.length > 0 ? descargasValidas.map(descarga => {
          const dataStr = descarga.data_operacao || descarga.data_descarga || descarga.data_hora || '-';
          const dataFormatada = dataStr !== '-' ? new Date(dataStr).toLocaleString('pt-BR') : '-';
          const statusClass = descarga.status === 'no patio' ? 'success' : 
                            descarga.status === 'vistoriado' ? 'info' : 
                            descarga.status === 'fora do patio' ? 'warning' : 'secondary';
          
          return `
          <tr>
            <td>${descarga.operacao_id}</td>
            <td>${descarga.container_numero || '-'}</td>
            <td>${descarga.posicao_atual || '-'}</td>
            <td><span class="badge bg-${statusClass}">${descarga.status || 'N/A'}</span></td>
            <td>${dataFormatada}</td>
            <td>
              <button class="btn btn-sm btn-primary corrigir-btn" data-operacao-id="${descarga.operacao_id}">
                Corrigir
              </button>
            </td>
          </tr>`;
        }).join('') : `
          <tr>
            <td colspan="6" class="text-center">Nenhuma descarga disponível para correção</td>
          </tr>
        `}
      </tbody>
    `;

    containerElement.appendChild(tabela);

    // Adicionar listeners
    tabela.querySelectorAll('.corrigir-btn').forEach(btn => {
      btn.addEventListener('click', () => abrirDialogoCorrecao(btn.dataset.operacaoId));
    });
  }

  /**
   * Verifica se a operação existe antes de tentar abrir o diálogo
   * @param {number} operacaoId 
   */
  async function verificarOperacaoExiste(operacaoId) {
  // Garantir que operacaoId seja número para comparação correta
  operacaoId = Number(operacaoId);
    try {
      // Verificar se a operação existe na lista atual
      const operacaoExiste = state.descargas.some(descarga => descarga.operacao_id === operacaoId);
      
      if (!operacaoExiste) {
        console.warn(`Operação ID ${operacaoId} não encontrada na lista atual. Recarregando lista...`);
        // Recarregar lista para garantir dados atualizados
        await carregarDescargas();
        
        // Verificar novamente após recarregar
        const operacaoExisteAtualizada = state.descargas.some(descarga => descarga.operacao_id === operacaoId);
        if (!operacaoExisteAtualizada) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar operação:', error);
      return false;
    }
  }

  /**
   * Carrega os detalhes do container e vistoria e abre o formulário de correção
   * @param {number} operacaoId
   */
  async function abrirDialogoCorrecao(operacaoId) {
  operacaoId = Number(operacaoId);
    try {
      // Verificar se a operação existe antes de continuar
      const operacaoExiste = await verificarOperacaoExiste(operacaoId);
      if (!operacaoExiste) {
        mostrarAlerta('Erro', 'Operação não encontrada. A lista de descargas foi atualizada.', 'error');
        return;
      }
      
      // Mostrar loading
      mostrarAlerta('Carregando', 'Obtendo detalhes do container...', 'info');
      
      // Buscar detalhes do container e vistoria
      const response = await fetch(`/operacoes/descargas/${operacaoId}/detalhes`);
      
      if (!response.ok) {
        if (response.status === 404) {
          mostrarAlerta('Erro', 'Operação não encontrada no banco de dados.', 'error');
          // Recarregar lista para remover itens inválidos
          await carregarDescargas();
          return;
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Falha ao obter detalhes do container');
      }
      
      // Construir formulário com todos os campos editáveis
      const container = data.container;
      const vistoria = data.vistoria || {};
      
      // Adicionar estilos para o modal
      const modalStyles = `
        <style>
          .modal-form-container {
            max-height: 70vh;
            overflow-y: auto;
            padding-right: 5px;
          }
          .modal-form-container::-webkit-scrollbar {
            width: 6px;
          }
          .modal-form-container::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.2);
            border-radius: 3px;
          }
          .form-section-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e0e0e0;
            color: #333;
          }
          .form-control:read-only {
            background-color: #f8f9fa;
          }
        </style>
      `;
      
      // Criar HTML do formulário com todos os campos
      const formHtml = `
        ${modalStyles}
        <div class="modal-form-container">
          <form id="form-correcao-descarga" class="needs-validation" novalidate>
          <div class="row mb-3">
            <div class="col-md-6">
              <h5 class="form-section-title">Dados do Container</h5>
              <input type="hidden" name="operacao_id" value="${container.operacao_id}">
              <input type="hidden" name="container_id" value="${container.container_id}">
              ${vistoria.vistoria_id ? `<input type="hidden" name="vistoria_id" value="${vistoria.vistoria_id}">` : ''}
              
              <div class="mb-3">
                <label class="form-label">Número do Container</label>
                <input type="text" class="form-control" value="${container.numero || ''}" readonly>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Posição Atual</label>
                <input type="text" class="form-control" value="${container.posicao_atual || ''}" readonly>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Nova Posição *</label>
                <input type="text" class="form-control" name="nova_posicao" placeholder="Ex: A01-1" required>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Status</label>
                <select class="form-select" name="status">
                  <option value="no patio" ${container.status === 'no patio' ? 'selected' : ''}>No Pátio</option>
                  <option value="fora do patio" ${container.status === 'fora do patio' ? 'selected' : ''}>Fora do Pátio</option>
                  <option value="vistoriado" ${container.status === 'vistoriado' ? 'selected' : ''}>Vistoriado</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Tipo de Container</label>
                <input type="text" class="form-control" name="tipo_container" value="${container.tipo_container || ''}">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Tamanho</label>
                <select class="form-select" name="tamanho">
                  <option value="" ${!container.tamanho ? 'selected' : ''}>Selecione...</option>
                  <option value="20" ${container.tamanho === '20' ? 'selected' : ''}>20'</option>
                  <option value="40" ${container.tamanho === '40' ? 'selected' : ''}>40'</option>
                  <option value="40HC" ${container.tamanho === '40HC' ? 'selected' : ''}>40'HC</option>
                </select>
              </div>
            </div>
            
            <div class="col-md-6">
              <h5 class="form-section-title">Dados Adicionais</h5>
              
              <div class="mb-3">
                <label class="form-label">Capacidade</label>
                <input type="text" class="form-control" name="capacidade" value="${container.capacidade || vistoria.capacidade || ''}">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Tara</label>
                <input type="text" class="form-control" name="tara" value="${container.tara || vistoria.tara || ''}">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Armador</label>
                <input type="text" class="form-control" name="armador" value="${container.armador || vistoria.armador || ''}">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Booking</label>
                <input type="text" class="form-control" name="booking" value="${container.booking || ''}">
              </div>
              
              ${vistoria.vistoria_id ? `
              <div class="mb-3">
                <label class="form-label">Lacre</label>
                <input type="text" class="form-control" name="lacre" value="${vistoria.lacre || ''}">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Placa do Veículo</label>
                <input type="text" class="form-control" name="placa" value="${vistoria.placa || ''}">
              </div>
              
              <div class="mb-3">
                <label class="form-label">Vagão</label>
                <input type="text" class="form-control" name="vagao" value="${vistoria.vagao || ''}">
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Observações</label>
            <textarea class="form-control" name="observacoes" rows="3">${vistoria.observacoes_gerais || ''}</textarea>
          </div>
          
          ${vistoria.avarias && vistoria.avarias.length > 0 ? `
          <div class="mb-4">
            <h5 class="form-section-title">Avarias Registradas</h5>
            <div class="table-responsive">
              <table class="table table-sm table-striped table-bordered">
                <thead class="table-light">
                  <tr>
                    <th>Estrutura</th>
                    <th>Avaria</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  ${vistoria.avarias.map(avaria => `
                  <tr>
                    <td>${avaria.estrutura_nome}</td>
                    <td>${avaria.avaria_nome}</td>
                    <td>${avaria.observacoes || '-'}</td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}
          </form>
        </div>
      `;
      
      // Mostrar formulário em um modal
      return mostrarConfirmacao(
        'Corrigir Descarga',
        formHtml,
        {
          width: 800,
          hideIcon: true,
          showCancelButton: true,
          confirmButtonText: 'Salvar Alterações',
          cancelButtonText: 'Cancelar',
          preConfirm: () => {
            // Validar formulário
            const form = document.getElementById('form-correcao-descarga');
            if (!form.checkValidity()) {
              form.classList.add('was-validated');
              return false;
            }
            
            // Coletar dados do formulário
            const formData = new FormData(form);
            const dados = {};
            for (const [key, value] of formData.entries()) {
              dados[key] = value;
            }
            
            return dados;
          }
        }
      ).then(result => {
        if (result.isConfirmed && result.value) {
          aplicarCorrecao(operacaoId, result.value);
        }
      });
      
    } catch (error) {
      console.error('Erro ao abrir diálogo de correção:', error);
      mostrarAlerta('Erro', error.message, 'error');
    }
  }

  /**
   * Envia PUT de correção com todos os campos do formulário
   * @param {number} operacaoId - ID da operação
   * @param {Object} dadosFormulario - Dados completos do formulário
   */
  async function aplicarCorrecao(operacaoId, dadosFormulario) {
    try {
      mostrarAlerta('Aguarde', 'Aplicando correção...', 'info');
      
      // Validar que a nova posição foi informada
      if (!dadosFormulario.nova_posicao || dadosFormulario.nova_posicao.trim() === '') {
        throw new Error('Nova posição é obrigatória');
      }
      
      // Formatar dados para envio
      const dadosEnvio = {
        ...dadosFormulario,
        nova_posicao: dadosFormulario.nova_posicao.trim().toUpperCase()
      };
      
      console.log('Enviando dados para correção:', dadosEnvio);

      const resposta = await fetch(`/operacoes/descargas/${operacaoId}/corrigir`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosEnvio)
      });

      const data = await resposta.json();

      if (!resposta.ok || !data.success) {
        throw new Error(data.error || 'Falha ao corrigir descarga');
      }

      mostrarAlerta('Sucesso', 'Container corrigido com sucesso', 'success');
      // Atualizar lista
      await carregarDescargas();
    } catch (error) {
      console.error('Erro na correção:', error);
      mostrarAlerta('Erro', error.message, 'error');
    }
  }

  /**
   * Carrega descargas corrigíveis via API
   */
  async function carregarDescargas() {
    state.carregando = true;
    renderLista();

    try {
      const data = await (await fetch('/operacoes/descargas/corrigir')).json();
      state.descargas = data.data || data.descargas || [];
    } catch (error) {
      console.error('Erro ao carregar descargas:', error);
      mostrarAlerta('Erro', 'Não foi possível carregar descargas', 'error');
      state.descargas = [];
    } finally {
      state.carregando = false;
      renderLista();
    }
  }

  /**
   * Inicializa módulo
   */
  function init() {
    // Elemento raiz onde a lista/tabela será desenhada
    containerElement = document.getElementById('correcao-descarga-container');

    if (!containerElement) {
      console.error('Elemento #correcao-descarga-container não encontrado');
      return;
    }

    // Carregar dados
    carregarDescargas();
    scrollToFormulario(containerElement);
  }

  return { init };
})();

export function init({ appState }) {
  CorrecaoDescargaModule.init(appState);
}
