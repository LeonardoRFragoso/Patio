// ========================================
// MOVIMENTAÇÃO SEGURA - Versão sem travamentos
// Implementação minimalista e estável
// VERSÃO 2.0 - Sem conflitos de modal
// ========================================

console.log('🔒 Script de movimentação seguro carregado v2.0');

// Função ULTRA ROBUSTA para carregar posições (sem interferências externas)
window.carregarPosicoesSeguro = async function() {
  console.log('🚀 [v2.0] Iniciando carregamento ULTRA seguro de posições...');
  
  const select = document.getElementById('posicao_nova');
  const containerInput = document.getElementById('container_movimentacao');
  
  if (!select || !containerInput) {
    console.error('❌ Elementos não encontrados');
    return false;
  }
  
  const numeroContainer = containerInput.value.trim();
  if (!numeroContainer) {
    select.innerHTML = '<option value="">Digite o container primeiro</option>';
    select.disabled = true;
    return false;
  }
  
  // ISOLAMENTO TOTAL: Bloquear TODOS os possíveis interferentes
  const originalSwal = window.Swal;
  const originalToast = window.Toast;
  const originalConsoleLog = console.log;
  
  // Modo silencioso TOTAL
  window.Swal = {
    fire: () => Promise.resolve({ isConfirmed: true }),
    mixin: () => ({ fire: () => Promise.resolve({ isConfirmed: true }) })
  };
  
  if (window.Toast) {
    window.Toast = {
      fire: () => Promise.resolve(),
      mixin: () => ({ fire: () => Promise.resolve() })
    };
  }
  
  // Suprimir logs de outros módulos durante carregamento
  const logBuffer = [];
  console.log = function(...args) {
    if (args[0] && args[0].includes && (args[0].includes('containers atualizados') || args[0].includes('🔄'))) {
      logBuffer.push(args); // Capturar mas não exibir
      return;
    }
    originalConsoleLog.apply(console, args);
  };
  
  try {
    // Mostrar loading
    select.innerHTML = '<option value="">🔄 Carregando posições...</option>';
    select.disabled = true;
    
    console.log('📡 [SEGURO] Buscando container:', numeroContainer);
    
    // 1. Buscar dados do container
    const containerResp = await fetch(`/operacoes/buscar_container?numero=${encodeURIComponent(numeroContainer)}`);
    const containerData = await containerResp.json();
    
    if (!containerData.success) {
      throw new Error(containerData.message || 'Container não encontrado');
    }
    
    const container = containerData.container;
    const containerSize = parseInt(container.tamanho) || 20;
    const statusContainer = container.status || 'CHEIO';
    const posicaoAtual = container.posicao_atual;
    
    console.log(`📋 [SEGURO] Container: ${containerSize}TEU, status: ${statusContainer}, posição atual: ${posicaoAtual}`);
    
    // 2. Buscar posições disponíveis
    const posicoesResp = await fetch(`/api/posicoes/disponiveis?status=${statusContainer}&unidade=SUZANO&container_size=${containerSize}`);
    const posicoesResult = await posicoesResp.json();
    
    if (!posicoesResult.success) {
      throw new Error('Erro ao buscar posições disponíveis');
    }
    
    // 3. Processar posições (excluir posição atual)
    const posicoes = posicoesResult.posicoes
      .map(p => `${p.baia_posicao}-${p.altura}`)
      .filter(p => p !== posicaoAtual)
      .sort();
    
    console.log(`📊 [SEGURO] Encontradas ${posicoes.length} posições disponíveis (excluindo ${posicaoAtual})`);
    
    if (posicoes.length === 0) {
      select.innerHTML = '<option value="">⚠️ Nenhuma posição disponível</option>';
      select.disabled = true;
      console.warn('⚠️ Nenhuma posição disponível para movimentação');
      return false;
    }
    
    // 4. Construir HTML com organizador hierárquico
    let html = '<option value="">Selecione a nova posição</option>';
    
    // Usar organizador hierárquico se disponível
    if (window.organizarComboboxPosicoes && posicoes.length <= 50) {
      console.log('🎯 Usando organizador hierárquico');
      const posicoesObj = posicoes.map(pos => {
        const [baia, altura] = pos.split('-');
        return { baia_posicao: baia, altura: parseInt(altura) };
      });
      
      try {
        const htmlOrganizado = window.organizarComboboxPosicoes(posicoesObj, 'movimentacao');
        if (htmlOrganizado && htmlOrganizado.trim()) {
          html = '<option value="">Selecione a nova posição</option>' + htmlOrganizado;
        } else {
          throw new Error('Organizador retornou HTML vazio');
        }
      } catch (orgError) {
        console.warn('⚠️ Erro no organizador, usando fallback simples:', orgError);
        // Fallback para organização simples
        html = criarHTMLSimples(posicoes);
      }
    } else {
      console.log('📝 Usando organização simples (fallback)');
      html = criarHTMLSimples(posicoes);
    }
    
    // 5. Atualizar select de forma segura
    select.innerHTML = html;
    select.disabled = false;
    
    // Disparar evento personalizado para notificar sucesso (sem interferir com outros sistemas)
    const evento = new CustomEvent('posicoesCarregadasSeguro', {
      detail: { 
        container: numeroContainer, 
        posicoes: posicoes.length,
        posicaoAtual: posicaoAtual
      }
    });
    document.dispatchEvent(evento);
    
    console.log(`✅ [SEGURO] ${posicoes.length} posições carregadas com sucesso`);
    
    return true;
    
  } catch (error) {
    console.error('❌ [SEGURO] Erro ao carregar posições:', error);
    
    select.innerHTML = '<option value="">❌ Erro - Tente novamente</option>';
    select.disabled = false;
    
    return false;
  } finally {
    // RESTAURAR TUDO: Garantir que não quebramos nada
    if (originalSwal) {
      window.Swal = originalSwal;
    }
    if (originalToast) {
      window.Toast = originalToast;
    }
    console.log = originalConsoleLog;
    
    // Exibir logs capturados se necessário (para debug)
    if (logBuffer.length > 0) {
      console.log('📋 [DEBUG] Logs capturados durante carregamento:', logBuffer.length);
    }
    
    console.log('🏁 [SEGURO] Carregamento de posições finalizado');
  }
};

// Função auxiliar para criar HTML simples
function criarHTMLSimples(posicoes) {
  let html = '';
  
  // Agrupar por bay para melhor UX
  const porBay = {};
  posicoes.forEach(pos => {
    const bay = pos[0];
    if (!porBay[bay]) porBay[bay] = [];
    porBay[bay].push(pos);
  });
  
  // Construir optgroups
  Object.keys(porBay).sort().forEach(bay => {
    html += `<optgroup label="Bay ${bay} (${porBay[bay].length} posições)">`;
    porBay[bay].forEach(pos => {
      html += `<option value="${pos}">${pos}</option>`;
    });
    html += '</optgroup>';
  });
  
  return html;
}

// Função para configurar o botão de refresh de forma segura
function configurarBotaoRefresh() {
  const btnRefresh = document.querySelector('.btn-refresh');
  if (!btnRefresh) return;
  
  // Remover event listeners existentes
  btnRefresh.replaceWith(btnRefresh.cloneNode(true));
  
  // Adicionar novo event listener seguro
  const newBtn = document.querySelector('.btn-refresh');
  if (newBtn) {
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔄 Botão refresh clicado');
      carregarPosicoesSeguro();
    });
    console.log('🔧 Botão refresh configurado');
  }
}

// Função para configurar carregamento automático seguro (sem loops)
function configurarCarregamentoAutomatico() {
  const containerInput = document.getElementById('container_movimentacao');
  if (!containerInput) return;
  
  let timeoutId = null;
  
  // Remover listeners existentes
  containerInput.replaceWith(containerInput.cloneNode(true));
  
  // Adicionar novo listener com debounce
  const newInput = document.getElementById('container_movimentacao');
  if (newInput) {
    newInput.addEventListener('input', function(e) {
      // Cancelar timeout anterior
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Aguardar 1 segundo após parar de digitar
      timeoutId = setTimeout(() => {
        const valor = e.target.value.trim();
        if (valor && valor.length >= 8) { // Container tem pelo menos 8 caracteres
          console.log('🔍 Carregamento automático disparado para:', valor);
          carregarPosicoesSeguro();
        }
      }, 1000);
    });
    console.log('⚡ Carregamento automático configurado (debounce 1s)');
  }
}

// Inicialização segura (só executa após DOM estar pronto)
function inicializarMovimentacaoSegura() {
  console.log('🔧 Inicializando movimentação segura...');
  
  // Configurar botão refresh
  configurarBotaoRefresh();
  
  // Configurar carregamento automático
  configurarCarregamentoAutomatico();
  
  console.log('✅ Movimentação segura inicializada');
}

// Aguardar DOM estar pronto de forma segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarMovimentacaoSegura);
} else {
  // DOM já está pronto
  inicializarMovimentacaoSegura();
}

// Exportar funções para uso manual se necessário
window.inicializarMovimentacaoSegura = inicializarMovimentacaoSegura;
window.configurarBotaoRefresh = configurarBotaoRefresh;

// COMPATIBILIDADE ROBUSTA: Múltiplos aliases para evitar erros
window.carregarPosicoesMovimentacao = carregarPosicoesSeguro;
window.carregarPosicoes = carregarPosicoesSeguro;
window.atualizarPosicoes = carregarPosicoesSeguro;

// Garantir que a função esteja sempre disponível globalmente
if (typeof window.carregarPosicoesMovimentacao !== 'function') {
  window.carregarPosicoesMovimentacao = carregarPosicoesSeguro;
}

// Interceptar possíveis erros de função não definida
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('carregarPosicoesMovimentacao is not defined')) {
    console.warn('⚠️ Interceptando erro de função não definida, executando função segura...');
    e.preventDefault();
    carregarPosicoesSeguro();
  }
});

// Verificar e corrigir botões com onclick quebrado
function corrigirBotoesQuebrados() {
  const botoes = document.querySelectorAll('[onclick*="carregarPosicoesMovimentacao"]');
  botoes.forEach(botao => {
    console.log('🔧 Corrigindo botão com onclick quebrado:', botao);
    botao.removeAttribute('onclick');
    botao.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      carregarPosicoesSeguro();
    });
  });
  
  if (botoes.length > 0) {
    console.log(`✅ ${botoes.length} botão(ões) corrigido(s)`);
  }
}

// Executar correção após DOM estar pronto
setTimeout(corrigirBotoesQuebrados, 1000);

console.log('🔒 Script de movimentação seguro pronto v2.0');
console.log('🔄 Aliases criados: carregarPosicoesMovimentacao, carregarPosicoes, atualizarPosicoes');
console.log('🛡️ Interceptador de erros ativo');
console.log('🔧 Correção automática de botões ativa');
console.log('🚫 Bloqueio de modais interferentes ativo');
