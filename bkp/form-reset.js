/**
 * form-reset.js
 * Script para garantir que os formulários sejam limpos após operações bem-sucedidas
 * Versão aprimorada: foco especial no formulário de movimentação
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Form Reset Manager inicializado");
    
    // Registrar função de limpeza específica para o botão de movimentação
    const btnMovimentacao = document.querySelector('.card[data-operation="movimentacao"]');
    if (btnMovimentacao) {
        btnMovimentacao.addEventListener('click', function() {
            console.log("🧹 Preparando formulário de movimentação limpo");
            // Dar tempo para o DOM atualizar antes de limpar o formulário
            setTimeout(() => {
                limparFormularioMovimentacao(true);
            }, 300);
        });
    }
    
    // Função específica para limpar o formulário de movimentação
    function limparFormularioMovimentacao(forceClean = false) {
        console.log("🧹 Limpeza específica do formulário de movimentação");
        const formMovimentacao = document.getElementById('form-movimentacao');
        if (formMovimentacao) {
            // Resetar o formulário
            formMovimentacao.reset();
            
            // Limpar explicitamente todos os campos do formulário
            const camposMovimentacao = [
                'container_movimentacao',  // Número do container
                'posicao_atual',          // Posição atual (mostrada automaticamente)
                'posicao_original',       // Campo alternativo para posição atual 
                'posicao_destino_mov',    // Nova posição
                'observacoes_mov'         // Observações
            ];
            
            camposMovimentacao.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.value = '';
                    // Remover classes de validação
                    campo.classList.remove('is-valid', 'is-invalid');
                    console.log(`Campo ${id} limpo`);
                }
            });
            
            // Limpar também qualquer elemento de status associado
            document.querySelectorAll('#form-movimentacao .status-indicator').forEach(el => {
                el.style.display = 'none';
            });
            
            // Remover quaisquer sugestões de dropdown que possam estar abertas
            document.querySelectorAll('.suggestions-list').forEach(list => {
                if (list.parentNode) list.parentNode.removeChild(list);
            });
            
            console.log('✅ Formulário de movimentação completamente limpo');
            return true;
        }
        return false;
    }
    
    // Função para limpar formulários após operações bem-sucedidas
    function limparFormularioAposOperacao() {
        console.log("🧹 Limpando campos do formulário após operação");
        
        // Identificar qual formulário está ativo baseado na operação atual
        const operacaoAtual = window.appState ? window.appState.currentOperation : null;
        const modoAtual = window.appState ? window.appState.currentMode : null;
        
        console.log(`ℹ️ Limpando formulário: operação=${operacaoAtual}, modo=${modoAtual}`);
        
        if (operacaoAtual === 'descarga') {
            // Limpar formulário de descarga
            const formId = "form-descarga";
            const formElement = document.getElementById(formId);
            if (formElement) {
                formElement.reset();
                console.log(`✅ Formulário ${formId} limpo com sucesso`);
                
                // Limpar campos específicos que podem não ser cobertos pelo reset padrão
                const camposEspeciais = ['container_vistoriado', 'posicao_destino'];
                camposEspeciais.forEach(id => {
                    const campo = document.getElementById(id);
                    if (campo) campo.value = '';
                });
            }
        } else if (operacaoAtual === 'carregamento') {
            // Limpar formulário de carregamento (rodoviário ou ferroviário)
            const formId = modoAtual === 'rodoviaria' ? 'form-carregamento-rodoviario' : 'form-carregamento-ferroviario';
            const formElement = document.getElementById(formId);
            if (formElement) {
                formElement.reset();
                console.log(`✅ Formulário ${formId} limpo com sucesso`);
                
                // Limpar campos específicos
                const prefixo = modoAtual === 'rodoviaria' ? 'rod' : 'fer';
                const camposEspeciais = [`container_carregamento_${prefixo}`, `placa_carregamento_${prefixo}`, `vagao_carregamento_${prefixo}`];
                camposEspeciais.forEach(id => {
                    const campo = document.getElementById(id);
                    if (campo) campo.value = '';
                });
            }
        } else if (operacaoAtual === 'movimentacao') {
            // Usar a função específica para movimentação
            limparFormularioMovimentacao();
        } else if (operacaoAtual === 'consulta') {
            // Limpar formulário de consulta
            const formElement = document.getElementById('form-consulta');
            if (formElement) {
                formElement.reset();
                console.log('✅ Formulário de consulta limpo com sucesso');
                
                // Limpar campo de consulta
                const campoConsulta = document.getElementById('container_consulta');
                if (campoConsulta) campoConsulta.value = '';
                
                // Limpar a área de resultados
                const resultadoConsulta = document.getElementById('resultado-consulta');
                if (resultadoConsulta) {
                    resultadoConsulta.style.display = 'none';
                    const infoContainer = document.getElementById('info-container');
                    if (infoContainer) infoContainer.innerHTML = '';
                }
            }
        }
        
        // Limpar qualquer feedback visual
        document.querySelectorAll('.is-valid, .is-invalid').forEach(element => {
            element.classList.remove('is-valid', 'is-invalid');
        });
        
        // Remover valores das comboboxes
        document.querySelectorAll('.combobox-input').forEach(input => {
            input.value = '';
        });
        
        // Esconder elementos de feedback
        document.querySelectorAll('.status-indicator').forEach(indicator => {
            indicator.style.display = 'none';
        });
    }
    
    // Observar respostas de sucesso da API
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        return originalFetch(url, options).then(response => {
            // Clone a resposta para não consumir o body
            const clonedResponse = response.clone();
            
            // Verificar se é uma operação de containers
            if (url.includes('/operacoes/')) {
                clonedResponse.json().then(data => {
                    if (data && data.success === true) {
                        // Operação bem-sucedida, limpar formulário após um tempo para confirmar visualização
                        console.log("🎉 Operação concluída com sucesso");
                        
                        // Não limpar formulário se for uma consulta de container
                        if (url.includes('/buscar_container')) {
                            console.log("✅ Consulta de container bem-sucedida, mantendo formulário para permitir interação");
                        } else {
                            console.log("🧹 Preparando para limpar formulário em 2.5 segundos");
                            setTimeout(limparFormularioAposOperacao, 2500);
                        }
                    }
                }).catch(err => {
                    console.warn("⚠️ Não foi possível analisar resposta como JSON:", err);
                });
            }
            
            return response;
        });
    };
    
    // Adicionar handlers para botões de limpar/cancelar existentes
    document.querySelectorAll('.btn-secondary, .btn-outline-secondary, [data-action="cancelar"]').forEach(button => {
        button.addEventListener('click', function() {
            const formParent = this.closest('form');
            if (formParent) {
                formParent.reset();
                console.log('🔄 Formulário cancelado pelo usuário');
                
                // Limpar feedbacks visuais
                formParent.querySelectorAll('.is-valid, .is-invalid').forEach(element => {
                    element.classList.remove('is-valid', 'is-invalid');
                });
            }
        });
    });
});
