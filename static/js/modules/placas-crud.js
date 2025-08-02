/**
 * Interface CRUD para gerenciamento de placas de caminhão
 * Permite adicionar, editar e excluir placas diretamente no banco de dados
 */

class PlacasCRUD {
    constructor() {
        this.modal = null;
        this.currentPlacaId = null;
        this.isEditing = false;
        this.init();
    }

    init() {
        console.log('🔧 Inicializando interface CRUD de placas...');
        this.createModal();
        // Aguardar um pouco para garantir que o modal foi criado
        setTimeout(() => {
            this.attachEventListeners();
        }, 100);
    }

    createModal() {
        // Criar modal HTML dinamicamente
        const modalHTML = `
            <div class="modal fade" id="placasCrudModal" tabindex="-1" aria-labelledby="placasCrudModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="placasCrudModalLabel">
                                <i class="fas fa-truck"></i> <span id="modalTitle">Adicionar Placa</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="placaCrudForm">
                                <div class="mb-3">
                                    <label for="placaInput" class="form-label">Placa do Caminhão *</label>
                                    <input type="text" class="form-control" id="placaInput" name="placa" 
                                           placeholder="Ex: ABC1234" maxlength="10" required>
                                    <div class="form-text">Digite a placa no formato padrão (letras e números)</div>
                                </div>
                                <div class="mb-3">
                                    <label for="observacoesInput" class="form-label">Observações</label>
                                    <textarea class="form-control" id="observacoesInput" name="observacoes" 
                                              rows="3" placeholder="Observações sobre a placa (opcional)"></textarea>
                                </div>
                                <div class="mb-3" id="ativaContainer" style="display: none;">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="ativaCheck" name="ativa" checked>
                                        <label class="form-check-label" for="ativaCheck">
                                            Placa ativa
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="button" class="btn btn-primary" id="salvarPlacaBtn">
                                <i class="fas fa-save"></i> <span id="salvarBtnText">Adicionar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adicionar modal ao DOM se não existir
        if (!document.getElementById('placasCrudModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.modal = new bootstrap.Modal(document.getElementById('placasCrudModal'));
    }

    attachEventListeners() {
        // Botão salvar
        const salvarBtn = document.getElementById('salvarPlacaBtn');
        if (salvarBtn) {
            salvarBtn.addEventListener('click', () => {
                this.salvarPlaca();
            });
        }

        // Formatação automática da placa
        const placaInput = document.getElementById('placaInput');
        if (placaInput) {
            placaInput.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 7) {
                    value = value.substring(0, 7);
                }
                e.target.value = value;
            });
        }

        // Reset do modal quando fechado
        const modal = document.getElementById('placasCrudModal');
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                this.resetModal();
            });
        }
    }

    // Adicionar nova placa
    adicionarPlaca() {
        this.isEditing = false;
        this.currentPlacaId = null;
        
        // Verificar se os elementos existem antes de modificá-los
        const modalTitle = document.getElementById('modalTitle');
        const salvarBtnText = document.getElementById('salvarBtnText');
        const ativaContainer = document.getElementById('ativaContainer');
        
        if (modalTitle) modalTitle.textContent = 'Adicionar Placa';
        if (salvarBtnText) salvarBtnText.textContent = 'Adicionar';
        if (ativaContainer) ativaContainer.style.display = 'none';
        
        this.resetForm();
        if (this.modal) {
            this.modal.show();
        } else {
            console.error('Modal não foi inicializado corretamente');
        }
    }

    // Editar placa existente
    editarPlaca(placaId, placaData) {
        this.isEditing = true;
        this.currentPlacaId = placaId;
        
        // Verificar se os elementos existem antes de modificá-los
        const modalTitle = document.getElementById('modalTitle');
        const salvarBtnText = document.getElementById('salvarBtnText');
        const ativaContainer = document.getElementById('ativaContainer');
        const placaInput = document.getElementById('placaInput');
        const observacoesInput = document.getElementById('observacoesInput');
        const ativaCheck = document.getElementById('ativaCheck');
        
        if (modalTitle) modalTitle.textContent = 'Editar Placa';
        if (salvarBtnText) salvarBtnText.textContent = 'Salvar';
        if (ativaContainer) ativaContainer.style.display = 'block';
        
        // Preencher formulário com dados existentes
        if (placaInput) placaInput.value = placaData.placa || '';
        if (observacoesInput) observacoesInput.value = placaData.observacoes || '';
        if (ativaCheck) ativaCheck.checked = placaData.ativa !== false;
        
        if (this.modal) {
            this.modal.show();
        } else {
            console.error('Modal não foi inicializado corretamente');
        }
    }

    // Salvar placa (adicionar ou editar)
    async salvarPlaca() {
        const form = document.getElementById('placaCrudForm');
        const formData = new FormData(form);
        
        const placa = formData.get('placa').trim();
        const observacoes = formData.get('observacoes').trim();
        const ativa = document.getElementById('ativaCheck').checked;

        // Validação básica
        if (!placa) {
            this.showError('Placa é obrigatória');
            return;
        }

        if (placa.length < 7) {
            this.showError('Placa deve ter pelo menos 7 caracteres');
            return;
        }

        try {
            this.showLoading(true);

            let data = { placa, observacoes };
            const csrfToken = getCSRFToken();

            let response;
            if (this.isEditing) {
                // Editar placa existente
                data.ativa = ativa;
                response = await fetch(`/api/placas/editar/${this.currentPlacaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Adicionar nova placa
                response = await fetch('/api/placas/adicionar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify(data)
                });
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess(result.message);
                this.modal.hide();
                
                // Atualizar lista de placas
                await this.atualizarListaPlacas();
                
                // Disparar evento customizado
                document.dispatchEvent(new CustomEvent('placasCrudUpdate', {
                    detail: { action: this.isEditing ? 'edit' : 'add', placa: result }
                }));
                
            } else {
                this.showError(result.error || 'Erro ao salvar placa');
            }

        } catch (error) {
            console.error('Erro ao salvar placa:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    // Excluir placa
    async excluirPlaca(placaId, placaNome) {
        const confirmResult = await Swal.fire({
            title: 'Confirmar exclusão',
            text: `Deseja realmente excluir a placa ${placaNome}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmResult.isConfirmed) return;

        try {
            const response = await fetch(`/api/placas/excluir/${placaId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('input[name="csrf_token"]')?.value || ''
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(result.message);
                
                // Atualizar lista de placas
                await this.atualizarListaPlacas();
                
                // Disparar evento customizado
                document.dispatchEvent(new CustomEvent('placasCrudUpdate', {
                    detail: { action: 'delete', placa: result }
                }));
                
            } else {
                this.showError(result.error || 'Erro ao excluir placa');
            }

        } catch (error) {
            console.error('Erro ao excluir placa:', error);
            this.showError('Erro de conexão. Tente novamente.');
        }
    }

    // Atualizar lista de placas em todos os comboboxes
    async atualizarListaPlacas() {
        try {
            // Importar e usar função do módulo de placas
            if (window.placasModule && typeof window.placasModule.atualizarPlacas === 'function') {
                await window.placasModule.atualizarPlacas();
            } else if (typeof atualizarPlacas === 'function') {
                await atualizarPlacas();
            }
        } catch (error) {
            console.error('Erro ao atualizar lista de placas:', error);
        }
    }

    // Resetar formulário
    resetForm() {
        const form = document.getElementById('placaCrudForm');
        const ativaCheck = document.getElementById('ativaCheck');
        
        if (form) form.reset();
        if (ativaCheck) ativaCheck.checked = true;
    }

    // Resetar modal
    resetModal() {
        this.resetForm();
        this.isEditing = false;
        this.currentPlacaId = null;
        this.showLoading(false);
    }

    // Mostrar loading
    showLoading(show) {
        const btn = document.getElementById('salvarPlacaBtn');
        if (show) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        } else {
            btn.disabled = false;
            const text = this.isEditing ? 'Salvar' : 'Adicionar';
            btn.innerHTML = `<i class="fas fa-save"></i> ${text}`;
        }
    }

    // Mostrar mensagem de sucesso
    showSuccess(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }

    // Mostrar mensagem de erro
    showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: message,
                confirmButtonText: 'OK'
            });
        } else {
            alert(`Erro: ${message}`);
        }
    }

    // Mostrar lista de placas (delegando para função global)
    mostrarListaPlacas() {
        return mostrarListaPlacas();
    }
}

// Criar botões CRUD para interface de placas
function criarBotoesCRUDPlacas(containerElement) {
    if (!containerElement) {
        console.warn('Container não fornecido para botões CRUD de placas');
        return;
    }

    const buttonsHTML = `
        <div class="placas-crud-buttons mt-2">
            <div class="btn-group" role="group" aria-label="Gerenciar placas">
                <button type="button" class="btn btn-success btn-sm" id="adicionarPlacaBtn">
                    <i class="fas fa-plus"></i> Adicionar
                </button>
                <button type="button" class="btn btn-info btn-sm" id="listarPlacasBtn">
                    <i class="fas fa-list"></i> Listar
                </button>
                <button type="button" class="btn btn-warning btn-sm" id="refreshPlacasBtn">
                    <i class="fas fa-sync"></i> Atualizar
                </button>
            </div>
        </div>
    `;

    // Adicionar botões se não existirem
    if (!containerElement.querySelector('.placas-crud-buttons')) {
        containerElement.insertAdjacentHTML('afterend', buttonsHTML);
        
        // Anexar event listeners
        document.getElementById('adicionarPlacaBtn').addEventListener('click', () => {
            window.placasCrud.adicionarPlaca();
        });

        document.getElementById('refreshPlacasBtn').addEventListener('click', async () => {
            if (typeof atualizarPlacas === 'function') {
                await atualizarPlacas();
            }
        });

        document.getElementById('listarPlacasBtn').addEventListener('click', () => {
            mostrarListaPlacas();
        });
    }
}

// Função para obter token CSRF
function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : null;
}

// Mostrar lista de placas em modal
async function mostrarListaPlacas() {
    try {
        const csrfToken = getCSRFToken();
        const response = await fetch('/api/placas/listar?apenas_ativas=true', {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Erro ao carregar placas');
        }

        const placas = result.placas || [];
        
        let tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Placa</th>
                            <th>Status</th>
                            <th>Data Criação</th>
                            <th>Observações</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (placas.length === 0) {
            tableHTML += `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="fas fa-inbox"></i> Nenhuma placa encontrada
                    </td>
                </tr>
            `;
        } else {
            // Debug: log da estrutura das placas
            console.log('Debug - Estrutura das placas:', placas[0]);
            
            placas.forEach(placa => {
                // Debug: log de cada placa individualmente
                console.log('Debug - Placa individual:', placa);
                
                // Garantir que temos os valores corretos
                const placaTexto = placa.placa || 'undefined';
                const placaId = placa.id || 0;
                const ativa = placa.ativa !== undefined ? placa.ativa : true;
                
                const dataFormatada = placa.data_criacao ? 
                    new Date(placa.data_criacao).toLocaleDateString('pt-BR') : 'N/A';
                const statusBadge = ativa ? 
                    '<span class="badge bg-success">ATIVA</span>' : 
                    '<span class="badge bg-secondary">INATIVA</span>';
                const observacoes = placa.observacoes || 'Sem observações';

                tableHTML += `
                    <tr>
                        <td><strong>${placaTexto}</strong></td>
                        <td>${statusBadge}</td>
                        <td>${dataFormatada}</td>
                        <td>${observacoes}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="editarPlacaFromList(${placaId}, '${placaTexto}', '${observacoes.replace(/'/g, '\\\'')}', ${ativa})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="excluirPlacaFromList(${placaId}, '${placaTexto}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: `<i class="fas fa-truck"></i> Lista de Placas (${placas.length})`,
            html: tableHTML,
            width: '80%',
            showConfirmButton: false,
            showCloseButton: true,
            customClass: {
                popup: 'swal-wide'
            }
        });

    } catch (error) {
        console.error('Erro ao mostrar lista de placas:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível carregar a lista de placas'
        });
    }
}

// Funções globais para ações da lista
window.editarPlacaFromList = function(id, placa, observacoes, ativa) {
    window.placasCrud.editarPlaca(id, { placa, observacoes, ativa });
    Swal.close();
};

window.excluirPlacaFromList = async function(id, placa) {
    Swal.close();
    
    // Executar exclusão
    const confirmResult = await Swal.fire({
        title: 'Confirmar exclusão',
        text: `Deseja realmente excluir a placa ${placa}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmResult.isConfirmed) {
        // Se cancelou, reabrir a lista
        setTimeout(() => mostrarListaPlacas(), 100);
        return;
    }

    try {
        const response = await fetch(`/api/placas/excluir/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });

        const result = await response.json();

        if (result.success) {
            // Mostrar sucesso
            await Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: result.message || 'Placa excluída com sucesso',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Reabrir lista atualizada
            setTimeout(() => mostrarListaPlacas(), 100);
            
            // Atualizar comboboxes globalmente
            if (typeof window.atualizarComboboxesPlacas === 'function') {
                window.atualizarComboboxesPlacas();
            }
            
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: result.error || 'Erro ao excluir placa'
            });
            // Reabrir lista mesmo com erro
            setTimeout(() => mostrarListaPlacas(), 100);
        }

    } catch (error) {
        console.error('Erro ao excluir placa:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro de conexão. Tente novamente.'
        });
        // Reabrir lista mesmo com erro
        setTimeout(() => mostrarListaPlacas(), 100);
    }
};

// Inicializar CRUD quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Criar instância global do CRUD
    window.placasCrud = new PlacasCRUD();
    
    console.log('✅ Interface CRUD de placas inicializada');
});

// Exportar para uso em módulos
// export { PlacasCRUD, criarBotoesCRUDPlacas, mostrarListaPlacas }; // Comentado para compatibilidade
