/**
 * Script para corrigir o problema de exibição de erro após movimentação bem-sucedida
 * Este script também gerencia o combobox dinâmico de "Nova Posição" usando Choices.js
 */

// -------------------- COMBOBOX "NOVA POSIÇÃO" DINÂMICO --------------------
let posicaoChoices = null;

// Carregar posições via backend e popular o select com organização hierárquica
async function carregarPosicoesMovimentacao(forceRefresh = false) {
  const select = document.getElementById('posicao_nova');
  const containerInput = document.getElementById('container_movimentacao');
  const btnRefresh = document.querySelector('.btn-refresh[onclick*="carregarPosicoesMovimentacao"]');

  if (!select || !containerInput) return;

  const numeroContainer = containerInput.value.trim();
  if (!numeroContainer) {
    Swal.fire({
      icon: 'info',
      title: 'Informe o Container',
      text: 'Digite primeiro o número do container para carregar as posições válidas.'
    });
    return;
  }

  // Evitar recarregar se já está carregado para este container
  if (!forceRefresh && select.dataset.loadedFor === numeroContainer) return;

  btnRefresh?.classList.add('rotating');
  select.disabled = true;

  try {
    const resp = await fetch(`/operacoes/posicoes/movimentacao/${numeroContainer}`);
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Erro ao buscar posições.');
    }

    // Extrair lista de posições do backend
    const posicoes = data.posicoes.map(pos => pos.codigo || pos);
    
    console.log(`📊 Carregando ${posicoes.length} posições organizadas para container ${numeroContainer}`);

    // Usar o organizador de posições para estruturar hierarquicamente
    if (typeof window.organizarComboboxPosicoes === 'function') {
      // Usar organizador moderno com opção de grid
      const resultado = window.organizarComboboxPosicoes(select, posicoes, {
        showStats: true,
        showViewToggle: false,
        showGridView: false, // Começar com lista, usuário pode alternar
        searchPlaceholderValue: 'Digite bay (A-E), posição (01-20) ou altura (1-5)...',
        onPositionSelect: (posicao, posicaoInfo) => {
          console.log(`🎯 Posição selecionada para movimentação: ${posicao}`);
          
          // Disparar evento para outros listeners
          select.dispatchEvent(new CustomEvent('positionSelected', {
            detail: { posicao, posicaoInfo }
          }));
        }
      });
      
      posicaoChoices = resultado.choices;
      
      console.log(`✅ Posições organizadas para movimentação: ${resultado.stats.totalPosicoes} posições em ${Object.keys(resultado.stats.porBay).length} bays`);
    } else {
      // Fallback para método tradicional
      console.warn('⚠️ Organizador de posições não disponível, usando método tradicional');
      
      select.innerHTML = '<option value="">Selecione a posição</option>';
      
      posicoes.forEach((pos) => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = pos;
        select.appendChild(option);
      });
      
      // Inicializar Choices básico
      if (!posicaoChoices) {
        posicaoChoices = new Choices(select, {
          searchEnabled: true,
          shouldSort: false,
          placeholderValue: 'Selecione a posição',
          itemSelectText: '',
          noResultsText: 'Nenhuma posição encontrada',
          loadingText: 'Carregando posições...'
        });
      } else {
        posicaoChoices.setChoices(Array.from(select.options).map(o => ({ value: o.value, label: o.textContent, selected: o.selected, disabled: o.disabled })), 'value', 'label', true);
      }
    }

    select.disabled = false;
    select.dataset.loadedFor = numeroContainer;

  } catch (err) {
    console.error('❌ Erro ao carregar posições:', err);
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
  } finally {
    btnRefresh?.classList.remove('rotating');
  }
}

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
