// Função renderizarPatio corrigida para evitar o erro "Cannot read properties of undefined (reading 'length')"
function renderizarPatio() {
    if (!patioData || !THREE_REF) {
        debugLog('Erro: patioData ou THREE_REF não definidos', 'error');
        return;
    }

    // Verificar se os grupos estão inicializados corretamente
    if (!containerGroup || !containerGroup.children) {
        debugLog('Erro ao inicializar: containerGroup não está definido corretamente', 'error');
        return;
    }
    
    if (!labelGroup || !labelGroup.children) {
        debugLog('Erro ao inicializar: labelGroup não está definido corretamente', 'error');
        return;
    }

    // Limpar containers existentes
    while (containerGroup.children.length > 0) {
        containerGroup.remove(containerGroup.children[0]);
    }
    while (labelGroup.children.length > 0) {
        labelGroup.remove(labelGroup.children[0]);
    }

    debugLog('Renderizando pátio 3D...');

    // Verificar se posicoes_disponiveis existe e é um array
    if (!patioData.posicoes_disponiveis || !Array.isArray(patioData.posicoes_disponiveis)) {
        debugLog('Erro ao inicializar: posicoes_disponiveis não é um array válido', 'error');
        patioData.posicoes_disponiveis = [];
    }
    
    patioData.posicoes_disponiveis.forEach(posicao => {
        criarPosicao3D(posicao);
    });

    debugLog(`Renderizados ${patioData.posicoes_disponiveis.length} posições`);
}
