/**
 * container-history.js
 * Script para humanizar o histórico de containers
 */

// Função para humanizar o histórico do container
function humanizeContainerHistory(operacoes) {
  console.log('Humanizando histórico:', operacoes);
  
  // Verificar se operacoes é um array válido e não está vazio
  if (!operacoes || !Array.isArray(operacoes) || operacoes.length === 0) {
    console.log('Nenhum histórico disponível');
    return '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Nenhum histórico disponível para este container.</div>';
  }
  
  try {
    // Criar um elemento para conter o histórico
    let html = '<div class="container-history">';
    html += '<h5 class="mb-3"><i class="fas fa-history me-2"></i>Histórico do Container</h5>';
    html += '<div class="timeline">';
    
    // Processar cada operação
    operacoes.forEach((op, index) => {
      // Verificar se a operação é válida
      if (!op) {
        console.warn('Operação inválida encontrada no índice', index);
        return; // Pular esta iteração
      }
      
      // Determinar o tipo de operação para ícone e cor
      let iconClass = 'fa-box';
      let badgeClass = 'bg-secondary';
      let title = 'Operação';
      
      if (op.tipo === 'vistoria') {
        iconClass = 'fa-clipboard-check';
        badgeClass = 'bg-info';
        title = 'Vistoria';
      } else if (op.tipo === 'descarga') {
        iconClass = 'fa-arrow-down';
        badgeClass = 'bg-primary';
        title = 'Descarga';
      } else if (op.tipo === 'carregamento') {
        iconClass = 'fa-arrow-up';
        badgeClass = 'bg-success';
        title = 'Carregamento';
      } else if (op.tipo === 'movimentacao') {
        iconClass = 'fa-exchange-alt';
        badgeClass = 'bg-warning';
        title = 'Movimentação';
      }
      
      try {
        // Formatar a data para exibição amigável
        let dataFormatada = '';
        let horaFormatada = '';
        
        if (op.data_operacao) {
          const dataOp = new Date(op.data_operacao);
          if (!isNaN(dataOp.getTime())) {
            dataFormatada = dataOp.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            horaFormatada = dataOp.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            });
          } else {
            console.warn('Data inválida:', op.data_operacao);
            dataFormatada = 'Data inválida';
            horaFormatada = '';
          }
        } else {
          dataFormatada = 'N/A';
          horaFormatada = '';
        }
        
        // Criar o item da timeline
        html += `<div class="timeline-item ${index === 0 ? 'timeline-item-first' : ''}">`;  
        html += `<div class="timeline-badge ${badgeClass}"><i class="fas ${iconClass}"></i></div>`;
        html += '<div class="timeline-content">';
        html += `<h6 class="mb-1">${title} <span class="badge ${badgeClass} ms-2">${op.modo || ''}</span></h6>`;
        html += `<p class="mb-1 text-muted"><i class="far fa-calendar-alt me-1"></i>${dataFormatada} ${horaFormatada ? 'às ' + horaFormatada : ''}</p>`;
        
        // Adicionar informações específicas com base no modo de transporte
        if (op.modo === 'rodoviaria' && op.placa) {
          html += `<p class="mb-1"><i class="fas fa-truck me-1"></i>Placa: <strong>${op.placa}</strong></p>`;
        } else if (op.modo === 'ferrovia' && op.vagao) {
          html += `<p class="mb-1"><i class="fas fa-train me-1"></i>Vagão: <strong>${op.vagao}</strong></p>`;
        }
        
        // Adicionar informação de posição
        if (op.posicao) {
          html += `<p class="mb-1"><i class="fas fa-map-marker-alt me-1"></i>Posição: <strong>${op.posicao}</strong></p>`;
        }
        
        // Adicionar observações se existirem
        if (op.observacoes) {
          html += `<p class="mb-0"><i class="fas fa-comment-alt me-1"></i>${op.observacoes}</p>`;
        }
        
        html += '</div></div>';
      } catch (error) {
        console.error('Erro ao processar operação:', error, op);
        html += `<div class="timeline-item">`;
        html += `<div class="timeline-badge bg-danger"><i class="fas fa-exclamation-triangle"></i></div>`;
        html += '<div class="timeline-content">';
        html += `<h6 class="mb-1">Erro ao processar operação</h6>`;
        html += `<p class="mb-1 text-muted">Não foi possível exibir os detalhes desta operação.</p>`;
        html += '</div></div>';
      }
    });
    
    html += '</div></div>';
    return html;
  } catch (error) {
    console.error('Erro ao gerar HTML do histórico:', error);
    return '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Erro ao processar o histórico do container.</div>';
  }
}

// Função para obter os estilos CSS da timeline
function getContainerHistoryStyles() {
  return `
.timeline {
  position: relative;
  padding: 20px 0;
  list-style: none;
  max-width: 1200px;
}
.timeline:before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #e9ecef;
  left: 20px;
  margin-left: -1.5px;
}
.timeline-item {
  position: relative;
  margin-bottom: 25px;
  padding-left: 50px;
}
.timeline-badge {
  position: absolute;
  left: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  text-align: center;
  color: white;
  line-height: 40px;
  z-index: 1;
}
.timeline-content {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.timeline-item-first .timeline-content {
  border-left: 4px solid #28a745;
}
.container-history h5 {
  color: #495057;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 10px;
}
`;
}

// Função para exibir o histórico humanizado do container
function exibirHistoricoHumanizado(container) {
  // Verificar se o container tem operações
  if (container && container.operacoes) {
    // Encontrar o elemento onde o histórico será exibido ou criar um novo
    let containerInfoEl = document.getElementById('container-info');
    
    if (!containerInfoEl) {
      // Se não existir, criar um novo elemento para exibir as informações
      containerInfoEl = document.createElement('div');
      containerInfoEl.id = 'container-info';
      containerInfoEl.className = 'mt-4 container-info';
      
      // Encontrar onde inserir o elemento
      const consultaContainer = document.getElementById('consulta-container');
      if (consultaContainer) {
        consultaContainer.appendChild(containerInfoEl);
      } else {
        // Fallback: adicionar ao final da seção de operador
        const operadorSection = document.querySelector('.operador-section');
        if (operadorSection) {
          operadorSection.appendChild(containerInfoEl);
        }
      }
    }
    
    // Limpar conteúdo anterior
    containerInfoEl.innerHTML = '';
    
    // Adicionar informações básicas do container
    const infoBasica = document.createElement('div');
    infoBasica.className = 'card mb-4';
    infoBasica.innerHTML = `
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0"><i class="fas fa-box me-2"></i>Container ${container.numero}</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <p><strong>Status:</strong> 
              <span class="badge ${container.status === 'no patio' ? 'bg-success' : 'bg-secondary'}">
                ${container.status === 'no patio' ? 'No Pátio' : container.status}
              </span>
            </p>
            <p><strong>Posição Atual:</strong> ${container.posicao_atual || 'N/A'}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Unidade:</strong> ${container.unidade || 'N/A'}</p>
            <p><strong>Última Atualização:</strong> ${new Date(container.ultima_atualizacao).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>
    `;
    
    containerInfoEl.appendChild(infoBasica);
    
    // Criar a seção de histórico
    const historicoEl = document.createElement('div');
    historicoEl.className = 'card';
    historicoEl.innerHTML = `
      <div class="card-header bg-light">
        <h5 class="mb-0"><i class="fas fa-history me-2"></i>Histórico de Operações</h5>
      </div>
      <div class="card-body">
        ${humanizeContainerHistory(container.operacoes)}
      </div>
    `;
    
    containerInfoEl.appendChild(historicoEl);
    
    // Adicionar CSS para a timeline se ainda não existir
    if (!document.getElementById('container-history-styles')) {
      const style = document.createElement('style');
      style.id = 'container-history-styles';
      style.textContent = getContainerHistoryStyles();
      document.head.appendChild(style);
    }
    
    // Rolar para o elemento
    containerInfoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Exportar funções para uso global
window.humanizeContainerHistory = humanizeContainerHistory;
window.exibirHistoricoHumanizado = exibirHistoricoHumanizado;
window.getContainerHistoryStyles = getContainerHistoryStyles;
