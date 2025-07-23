// ========================================
// CARREGADOR DO ORGANIZADOR DE POSIÇÕES
// Carrega e expõe o organizador de posições globalmente
// ========================================

/**
 * Carrega o módulo organizador de posições e expõe globalmente
 */
async function carregarOrganizadorPosicoes() {
  try {
    console.log('🔄 Carregando organizador de posições...');
    
    // Importar módulo organizador
    const organizadorModule = await import('./modules/position-organizer.js');
    
    // Expor funções globalmente para uso em outros scripts
    window.organizarPosicoesPorHierarquia = organizadorModule.organizarPosicoesPorHierarquia;
    window.criarOpcoesOrganizadas = organizadorModule.criarOpcoesOrganizadas;
    window.aplicarOrganizacaoAoSelect = organizadorModule.aplicarOrganizacaoAoSelect;
    window.obterEstatisticasPosicoes = organizadorModule.obterEstatisticasPosicoes;
    window.criarTooltipEstatisticas = organizadorModule.criarTooltipEstatisticas;
    window.organizarComboboxPosicoes = organizadorModule.organizarComboboxPosicoes;
    
    console.log('✅ Organizador de posições carregado e exposto globalmente');
    
    // Disparar evento personalizado para notificar outros módulos
    window.dispatchEvent(new CustomEvent('positionOrganizerLoaded', {
      detail: { module: organizadorModule }
    }));
    
    return organizadorModule;
    
  } catch (error) {
    console.error('❌ Erro ao carregar organizador de posições:', error);
    
    // Criar fallbacks básicos para evitar erros
    window.organizarComboboxPosicoes = function(select, posicoes, options = {}) {
      console.warn('⚠️ Usando fallback básico para organização de posições');
      
      // Limpar select
      select.innerHTML = '<option value="">Selecione a posição</option>';
      
      // Adicionar posições sem organização
      posicoes.forEach(posicao => {
        const option = document.createElement('option');
        option.value = posicao;
        option.textContent = posicao;
        select.appendChild(option);
      });
      
      // Retornar objeto básico
      return {
        choices: null,
        stats: { totalPosicoes: posicoes.length, porBay: {}, porAltura: {} },
        estruturaOrganizada: {}
      };
    };
    
    return null;
  }
}

/**
 * Aguarda o carregamento do Choices.js antes de carregar o organizador
 */
function aguardarChoicesJS() {
  return new Promise((resolve) => {
    if (typeof Choices !== 'undefined') {
      resolve();
      return;
    }
    
    // Verificar a cada 100ms se Choices.js foi carregado
    const interval = setInterval(() => {
      if (typeof Choices !== 'undefined') {
        clearInterval(interval);
        resolve();
      }
    }, 100);
    
    // Timeout após 5 segundos
    setTimeout(() => {
      clearInterval(interval);
      console.warn('⚠️ Timeout aguardando Choices.js, prosseguindo sem ele');
      resolve();
    }, 5000);
  });
}

/**
 * Inicialização automática quando DOM estiver carregado
 */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎯 DOM carregado, preparando organizador de posições...');
  
  // Aguardar Choices.js estar disponível
  await aguardarChoicesJS();
  
  // Carregar organizador
  await carregarOrganizadorPosicoes();
});

// Expor função de carregamento para uso manual se necessário
window.carregarOrganizadorPosicoes = carregarOrganizadorPosicoes;

console.log('📦 Carregador do organizador de posições inicializado');
