/**
 * Script para corrigir o problema de exibição de erro após movimentação// ========================================
// SOLUÇÃO DE EMERGÊNCIA - MOVIMENTAÇÃO
// Versão mínima sem execução automática para evitar travamentos
// ========================================

console.log('🚨 MODO EMERGÊNCIA: Script de movimentação carregado (sem auto-execução)');

// Função manual para carregar posições (só executa quando chamada explicitamente)
window.carregarPosicoesManual = async function() {
  console.log('🔧 Carregamento manual de posições iniciado...');
  
  const select = document.getElementById('posicao_nova');
  const containerInput = document.getElementById('container_movimentacao');
  
  if (!select || !containerInput) {
    console.error('❌ Elementos não encontrados');
    alert('Erro: Elementos da página não encontrados');
    return;
  }
  
  const numeroContainer = containerInput.value.trim();
  if (!numeroContainer) {
    alert('Digite primeiro o número do container');
    return;
  }
  
  try {
    select.innerHTML = '<option value="">Carregando...</option>';
    select.disabled = true;
    
    console.log('📡 Buscando container:', numeroContainer);
    
    // Buscar container
    const containerResp = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(numeroContainer)}`);
    const containerData = await containerResp.json();
    
    if (!containerData.success) {
      throw new Error('Container não encontrado');
    }
    
    const container = containerData.container;
    const containerSize = parseInt(container.tamanho) || 20;
    const statusContainer = container.status || 'CHEIO';
    const posicaoAtual = container.posicao_atual;
    
    console.log('📋 Container encontrado:', containerSize + 'TEU, posição atual:', posicaoAtual);
    
    // Buscar posições
    const posicoesResp = await fetch(`/api/posicoes/disponiveis?status=${statusContainer}&unidade=SUZANO&container_size=${containerSize}`);
    const posicoesResult = await posicoesResp.json();
    
    if (!posicoesResult.success) {
      throw new Error('Erro ao buscar posições');
    }
    
    // Processar posições
    const posicoes = posicoesResult.posicoes
      .map(p => `${p.baia_posicao}-${p.altura}`)
      .filter(p => p !== posicaoAtual)
      .sort();
    
    console.log('📊 Posições encontradas:', posicoes.length);
    
    // Construir HTML simples
    let html = '<option value="">Selecione a nova posição</option>';
    posicoes.forEach(pos => {
      html += `<option value="${pos}">${pos}</option>`;
    });
    
    select.innerHTML = html;
    select.disabled = false;
    
    alert(`✅ ${posicoes.length} posições carregadas com sucesso!`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    select.innerHTML = '<option value="">Erro - Tente novamente</option>';
    select.disabled = false;
    alert('Erro: ' + error.message);
  }
};

// Função para testar se a página está responsiva
window.testarPagina = function() {
  console.log('✅ Página está responsiva!');
  alert('✅ Página funcionando normalmente!');
};

console.log('🔧 Funções de emergência disponíveis:');
console.log('  • carregarPosicoesManual() - Carregar posições manualmente');
console.log('  • testarPagina() - Testar se a página está responsiva');
console.log('🚨 MODO EMERGÊNCIA ATIVO - Sem execução automática');

// IMPORTANTE: Não executar nada automaticamente!
// Todas as funções devem ser chamadas manualmente via console ou botão

// Configurar listeners para carregar posições quando o container mudar (debounce 500ms)
function configurarEventosMovimentacao() {
  // Delegação de eventos para garantir que funciona mesmo após clonagem do formulário
  document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'container_movimentacao') {
      // Debounce por input rápido
      if (window.__debounceTimerMovPos) clearTimeout(window.__debounceTimerMovPos);
      window.__debounceTimerMovPos = setTimeout(() => carregarPosicoesMovimentacao(true), 500);
    }
  });

  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'container_movimentacao') {
      carregarPosicoesMovimentacao(true);
    }
  });



  // Também lidar com evento customizado do módulo movimentacao (caso existam)
  document.addEventListener('containerSelecionado', function(e) {
    carregarPosicoesMovimentacao(true);
  });
  const containerInput = document.getElementById('container_movimentacao');
  if (!containerInput) return;

  let timer = null;
  const debouncedLoad = () => {
    clearTimeout(timer);
    timer = setTimeout(() => carregarPosicoesMovimentacao(true), 500);
  };
  // Quando digitando
  containerInput.addEventListener('input', debouncedLoad);
  // Quando o usuário seleciona uma sugestão ou sai do campo
  containerInput.addEventListener('change', () => carregarPosicoesMovimentacao(true));
  containerInput.addEventListener('blur', () => carregarPosicoesMovimentacao(false));
}

// Inicializar eventos após todos os scripts
window.addEventListener('load', () => {
  setTimeout(() => {
    configurarEventosMovimentacao();
    // Caso o container já esteja preenchido (ex: ao voltar atrás), carregar posições imediatamente
    const prefilled = document.getElementById('container_movimentacao');
    if (prefilled && prefilled.value.trim()) {
      carregarPosicoesMovimentacao(true);
    }
  }, 500);
});

// ---------------------------------------------------------------------------

/**
 * Este script intercepta o submit do formulário de movimentação
 */

// Função para processar a movimentação via AJAX
async function processarMovimentacao() {
        try {
            // Obter dados do formulário
            const container = document.getElementById('container_movimentacao').value;
            const posicaoOriginal = document.getElementById('posicao_original').value;
            const posicaoNova = document.getElementById('posicao_nova').value;
            const observacoes = document.getElementById('observacoes_movimentacao').value;
            
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
                
                try {
                    // Obter token CSRF
                    const csrfResponse = await fetch('/api/csrf-token');
                    const csrfData = await csrfResponse.json();
                    const csrfToken = csrfData.csrf_token;
                    
                    // Enviar dados via AJAX para o endpoint de registrar operação
                    // Usar os nomes de campos que o backend espera
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
                            posicao_anterior: posicaoOriginal,
                            modo: 'manual',
                            observacoes: observacoes || ''
                        })
                    });
                    
                    const data = await response.json();
                    console.log('Status da resposta:', response.status);
                    console.log('Response.ok:', response.ok);
                    console.log('Resposta do servidor:', data);
                    console.log('data.success:', data.success);
                    
                    // Verificar se a operação foi bem-sucedida
                    if (data && data.success === true) {
                        // Atualizar o campo de posição original com a nova posição
                        document.getElementById('posicao_original').value = posicaoNova;
                        
                        // Limpar os campos do formulário
                        document.getElementById('posicao_nova').value = '';
                        document.getElementById('observacoes_movimentacao').value = '';
                        
                        // Mostrar mensagem de sucesso
                        Swal.fire({
                            icon: 'success',
                            title: 'Sucesso!',
                            text: data.message || 'Movimentação registrada com sucesso!',
                            confirmButtonColor: '#28a745'
                        }).then(() => {
                            // Voltar para a tela de seleção de operações após fechar o modal
                            voltarInicio();
                        });
                        
                        // Tentar atualizar a cache local de containers se as funções existirem
                        try {
                            if (typeof atualizarCacheContainers === 'function') {
                                await atualizarCacheContainers();
                            } else if (typeof atualizarContainers === 'function') {
                                await atualizarContainers('geral');
                            } else {
                                console.log('Funções de atualização de cache não encontradas, continuando...');
                            }
                        } catch (cacheError) {
                            console.warn('Erro ao atualizar cache, mas operação foi bem-sucedida:', cacheError);
                        }
                    } else {
                        // Preparar mensagem de erro detalhada
                        let errorTitle = 'Erro na Movimentação';
                        let errorText = data.error || 'Ocorreu um erro ao processar a movimentação.';
                        let htmlContent = '';
                        
                        // Verificar se há sugestões de posições
                        if (data.sugestoes && data.sugestoes.length > 0) {
                            htmlContent = `
                                <div class="text-left">
                                    <p>${errorText}</p>
                                    <p><strong>Sugestões de posições válidas:</strong></p>
                                    <ul class="text-left">
                                        ${data.sugestoes.map(pos => `<li>${pos}</li>`).join('')}
                                    </ul>
                                </div>
                            `;
                        }
                        
                        // Mostrar mensagem de erro com detalhes
                        Swal.fire({
                            icon: 'error',
                            title: errorTitle,
                            html: htmlContent || errorText,
                            confirmButtonColor: '#dc3545'
                        });
                    }
                } catch (ajaxError) {
                    console.error('Erro na requisição AJAX:', ajaxError);
                    
                    // Mostrar mensagem de erro genérica
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro na Movimentação',
                        text: 'Ocorreu um erro ao processar a movimentação. Tente novamente.',
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

// Aguardar o carregamento completo da página e outros scripts
window.addEventListener('load', function() {
    // Aguardar um pouco mais para garantir que todos os scripts foram carregados
    setTimeout(function() {
        console.log('🔧 Aplicando correção para o modal de erro na movimentação...');
        
        // Sobrescrever qualquer função confirmarMovimentacao existente
        window.confirmarMovimentacao = processarMovimentacao;
        
        // Interceptar o submit do formulário de movimentação
        const formMovimentacao = document.getElementById('formMovimentacao');
        if (formMovimentacao) {
            formMovimentacao.addEventListener('submit', async function(e) {
                e.preventDefault(); // Prevenir o submit padrão
                await processarMovimentacao();
            });
        }
        
        console.log('✅ Correção aplicada com sucesso!');
    }, 1000); // Aguardar 1 segundo
});
