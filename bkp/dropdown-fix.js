/**
 * dropdown-fix.js
 * Script para corrigir o comportamento dos dropdowns na interface
 * - Fecha o dropdown automaticamente após seleção
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ Dropdown Fix inicializado");
    
    // Função para fechar as listas de sugestões após seleção
    function fecharDropdownAposSeleção() {
        // Observador de mutações para detectar quando listas de sugestões são adicionadas ao DOM
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(function(node) {
                        // Verificar se o nó adicionado é uma lista de sugestões
                        if (node.classList && 
                            (node.classList.contains('suggestions-list') || 
                             node.classList.contains('dropdown-menu') ||
                             node.classList.contains('suggestion-items'))) {
                            
                            console.log("🔍 Lista de sugestões detectada, adicionando comportamento de fechamento");
                            
                            // Adicionar tratamento de clique para cada item na lista
                            const items = node.querySelectorAll('.suggestion-item, .dropdown-item');
                            items.forEach(function(item) {
                                item.addEventListener('click', function() {
                                    console.log("✅ Item selecionado, fechando dropdown");
                                    // Remover a lista de sugestões do DOM após um pequeno delay
                                    setTimeout(() => {
                                        if (node.parentNode) {
                                            node.parentNode.removeChild(node);
                                        }
                                    }, 50);
                                });
                            });
                        }
                    });
                }
            });
        });
        
        // Iniciar a observação do documento inteiro
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }
    
    // Inicializar a correção
    fecharDropdownAposSeleção();
});
