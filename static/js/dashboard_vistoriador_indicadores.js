// Dashboard Vistoriador - Indicadores e Consulta
// Funcionalidades para indicadores do pátio e consulta de containers

// Variáveis globais
let indicadoresData = null;
let filtrosOptions = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Carregar indicadores na inicialização
    carregarIndicadores();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Mostrar seção de indicadores por padrão
    mostrarSecao('indicadores');
});

// Configurar event listeners
function configurarEventListeners() {
    // Formulário de consulta
    const formConsulta = document.getElementById('form-consulta');
    if (formConsulta) {
        formConsulta.addEventListener('submit', function(e) {
            e.preventDefault();
            realizarConsulta();
        });
    }
}

// Navegação entre seções
function mostrarSecao(secao) {
    // Ocultar todas as seções
    const secoes = document.querySelectorAll('.secao-content');
    secoes.forEach(s => s.style.display = 'none');
    
    // Remover classe active de todos os nav-links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Mostrar seção selecionada
    const secaoElement = document.getElementById(`secao-${secao}`);
    if (secaoElement) {
        secaoElement.style.display = 'block';
    }
    
    // Adicionar classe active ao nav-link correspondente
    const activeLink = document.querySelector(`[onclick="mostrarSecao('${secao}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Carregar indicadores do pátio
async function carregarIndicadores() {
    try {
        const response = await fetch('/vistoriador/indicadores-patio', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        indicadoresData = await response.json();
        
        if (indicadoresData.success) {
            atualizarIndicadoresUI(indicadoresData.indicadores);
        } else {
            console.error('Erro ao carregar indicadores:', indicadoresData.message);
            mostrarErro('Erro ao carregar indicadores: ' + indicadoresData.message);
        }
    } catch (error) {
        console.error('Erro ao carregar indicadores:', error);
        mostrarErro('Erro ao carregar indicadores. Tente novamente.');
    }
}

// Atualizar interface com dados dos indicadores
function atualizarIndicadoresUI(data) {
    // Indicadores principais
    document.getElementById('total-containers').textContent = data.total_containers || 0;
    document.getElementById('containers-patio').textContent = data.containers_patio || 0;
    document.getElementById('containers-vistoriados-count').textContent = data.containers_vistoriados || 0;
    
    // Taxa de ocupação
    const taxaOcupacao = data.taxa_ocupacao || 0;
    document.getElementById('taxa-ocupacao').textContent = `${taxaOcupacao}%`;
    const progressBar = document.getElementById('progress-ocupacao');
    if (progressBar) {
        progressBar.style.width = `${taxaOcupacao}%`;
    }
    
    // Containers com avarias
    const avariasElement = document.getElementById('containers-com-avarias');
    if (avariasElement) {
        avariasElement.textContent = data.containers_com_avarias || 0;
    }
    document.getElementById('vistorias-recentes').textContent = data.vistorias_recentes || 0;
    
    // Gráficos
    if (data.containers_por_status) {
        criarGraficoStatus(data.containers_por_status);
    }
    
    if (data.containers_por_tamanho) {
        criarGraficoTamanho(data.containers_por_tamanho);
    }
    
    if (data.ocupacao_por_baia) {
        criarGraficoBaias(data.ocupacao_por_baia);
    }
    
    // Operações recentes
    if (data.operacoes_recentes) {
        atualizarOperacoesRecentes(data.operacoes_recentes);
    }
}

// Criar gráfico de containers por status
function criarGraficoStatus(dados) {
    const container = document.getElementById('chart-status');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!dados || dados.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nenhum dado disponível</p>';
        return;
    }
    
    // Criar gráfico simples com barras
    let html = '<div class="chart-bars">';
    const maxValue = Math.max(...dados.map(d => d.count));
    
    dados.forEach(item => {
        const percentage = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
        html += `
            <div class="chart-bar-item mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted">${item.status}</small>
                    <small class="font-weight-bold">${item.count}</small>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-primary" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Criar gráfico de containers por tamanho
function criarGraficoTamanho(dados) {
    const container = document.getElementById('chart-tamanho');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!dados || dados.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nenhum dado disponível</p>';
        return;
    }
    
    // Criar gráfico simples com barras
    let html = '<div class="chart-bars">';
    const maxValue = Math.max(...dados.map(d => d.count));
    
    dados.forEach(item => {
        const percentage = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
        html += `
            <div class="chart-bar-item mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted">${item.tamanho} TEU</small>
                    <small class="font-weight-bold">${item.count}</small>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-success" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Criar gráfico de ocupação por baia
function criarGraficoBaias(dados) {
    const container = document.getElementById('chart-baias');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!dados || dados.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nenhum dado disponível</p>';
        return;
    }
    
    // Criar gráfico simples com barras
    let html = '<div class="chart-bars">';
    const maxValue = Math.max(...dados.map(d => d.count));
    
    dados.forEach(item => {
        const percentage = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
        html += `
            <div class="chart-bar-item mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted">Baia ${item.baia}</small>
                    <small class="font-weight-bold">${item.count}</small>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-info" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Atualizar operações recentes
function atualizarOperacoesRecentes(dados) {
    const container = document.getElementById('operacoes-recentes');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!dados || dados.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nenhuma operação recente</p>';
        return;
    }
    
    let html = '<div class="list-group list-group-flush">';
    
    dados.forEach(operacao => {
        const dataFormatada = new Date(operacao.data_criacao).toLocaleDateString('pt-BR');
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${operacao.container_numero}</h6>
                    <p class="mb-1 text-muted small">${operacao.tipo_operacao}</p>
                    <small class="text-muted">${dataFormatada}</small>
                </div>
                <span class="badge bg-primary rounded-pill">${operacao.posicao || 'N/A'}</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}



// Realizar consulta de containers
async function realizarConsulta() {
    const loadingElement = document.getElementById('loading-consulta');
    const resultadosElement = document.getElementById('resultados-consulta');
    const totalResultadosElement = document.getElementById('total-resultados');
    
    // Mostrar loading
    loadingElement.style.display = 'block';
    resultadosElement.innerHTML = '';
    
    // Coletar dados do formulário
    const filtros = {
        numero_container: document.getElementById('filtro-numero').value.trim(),
        status: document.getElementById('filtro-status').value,
        posicao: document.getElementById('filtro-posicao').value.trim(),
        armador: document.getElementById('filtro-armador').value,
        tamanho: document.getElementById('filtro-tamanho').value,
        tipo_container: document.getElementById('filtro-tipo').value,
        data_inicio: document.getElementById('filtro-data-inicio').value,
        data_fim: document.getElementById('filtro-data-fim').value
    };
    
    try {
        // Construir URL com parâmetro de busca (apenas número do container por enquanto)
        let url = '/vistoriador/containers-patio';
        const numeroBusca = filtros.numero_container;
        if (numeroBusca) {
            url += `?q=${encodeURIComponent(numeroBusca)}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Ocultar loading
        loadingElement.style.display = 'none';
        
        if (result.success) {
            exibirResultadosConsulta(result.data);
            totalResultadosElement.textContent = `${result.data.length} containers encontrados`;
        } else {
            mostrarErro('Erro na consulta: ' + result.message);
            totalResultadosElement.textContent = '0 containers encontrados';
        }
    } catch (error) {
        console.error('Erro na consulta:', error);
        loadingElement.style.display = 'none';
        mostrarErro('Erro ao realizar consulta. Tente novamente.');
        totalResultadosElement.textContent = '0 containers encontrados';
    }
}

// Exibir resultados da consulta
function exibirResultadosConsulta(containers) {
    const resultadosElement = document.getElementById('resultados-consulta');
    
    if (!containers || containers.length === 0) {
        resultadosElement.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-search fa-3x mb-3"></i>
                <p>Nenhum container encontrado com os filtros aplicados</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += `
        <thead class="table-dark">
            <tr>
                <th>Número</th>
                <th>Status</th>
                <th>Posição</th>
                <th>Armador</th>
                <th>Tamanho</th>
                <th>Tipo</th>
                <th>Data Criação</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    containers.forEach(container => {
        const dataCriacao = container.data_criacao ? 
            new Date(container.data_criacao).toLocaleDateString('pt-BR') : 'N/A';
        
        html += `
            <tr>
                <td><strong>${container.numero}</strong></td>
                <td><span class="badge bg-info">${container.status || 'N/A'}</span></td>
                <td>${container.posicao_atual || 'N/A'}</td>
                <td>${container.armador || 'N/A'}</td>
                <td>${container.tamanho_teu || container.tamanho || 'N/A'} TEU</td>
                <td>${container.iso_container || container.tipo_container || 'N/A'}</td>
                <td>${dataCriacao}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verDetalhesContainer('${container.numero}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    resultadosElement.innerHTML = html;
}

// Ver detalhes do container
function verDetalhesContainer(numeroContainer) {
    // Encontrar o container nos resultados
    const container = document.querySelector(`tr td strong:contains('${numeroContainer}')`);
    
    // Por enquanto, mostrar um alert simples
    // Futuramente pode abrir um modal com detalhes completos
    alert(`Detalhes do container ${numeroContainer}\n\nEsta funcionalidade será implementada em breve.`);
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('form-consulta').reset();
    
    // Limpar resultados
    document.getElementById('resultados-consulta').innerHTML = `
        <div class="text-center py-4 text-muted">
            <i class="fas fa-search fa-3x mb-3"></i>
            <p>Use os filtros acima para buscar containers</p>
        </div>
    `;
    
    document.getElementById('total-resultados').textContent = '0 containers encontrados';
}

// Mostrar erro
function mostrarErro(mensagem) {
    // Usar SweetAlert2 se disponível, senão alert simples
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: mensagem,
            confirmButtonColor: '#dc3545'
        });
    } else {
        alert('Erro: ' + mensagem);
    }
}

// Mostrar sucesso
function mostrarSucesso(mensagem) {
    // Usar SweetAlert2 se disponível, senão alert simples
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: mensagem,
            confirmButtonColor: '#28a745'
        });
    } else {
        alert('Sucesso: ' + mensagem);
    }
}
