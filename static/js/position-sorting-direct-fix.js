/**
 * ========================================
 * CORREÇÃO DIRETA DE ORDENAÇÃO DE POSIÇÕES
 * Fix definitivo para o problema A11-1 antes de A01-1
 * ========================================
 */

(function() {
  'use strict';
  
  // Função para ordenar posições corretamente
  function sortPositionsCorrectly(positions) {
    return positions.sort((a, b) => {
      // Extrair informações das posições
      const matchA = a.match(/^([A-E])(\d{2})-(\d+)$/);
      const matchB = b.match(/^([A-E])(\d{2})-(\d+)$/);
      
      if (!matchA || !matchB) return 0;
      
      const [, bayA, posA, altA] = matchA;
      const [, bayB, posB, altB] = matchB;
      
      // Primeiro por bay
      if (bayA !== bayB) {
        return bayA.localeCompare(bayB);
      }
      
      // Depois por posição numérica
      const posNumA = parseInt(posA);
      const posNumB = parseInt(posB);
      if (posNumA !== posNumB) {
        return posNumA - posNumB;
      }
      
      // Por último por altura
      return parseInt(altA) - parseInt(altB);
    });
  }
  
  // Interceptar e corrigir Choices.js setChoices
  function patchChoicesSetChoices() {
    if (typeof window.Choices !== 'undefined' && window.Choices.prototype.setChoices) {
      const originalSetChoices = window.Choices.prototype.setChoices;
      
      window.Choices.prototype.setChoices = function(choices, value, label, replaceChoices) {
        // Se choices é um array de objetos com propriedade value que parece ser posição
        if (Array.isArray(choices) && choices.length > 0) {
          const sortedChoices = choices.map(choice => {
            // Se é um objeto com value que parece ser posição
            if (choice && typeof choice === 'object' && choice.value && 
                typeof choice.value === 'string' && choice.value.match(/^[A-E]\d{2}-\d+$/)) {
              return choice;
            }
            return choice;
          }).sort((a, b) => {
            // Ordenar por value se ambos têm value que parece ser posição
            if (a.value && b.value && 
                a.value.match(/^[A-E]\d{2}-\d+$/) && b.value.match(/^[A-E]\d{2}-\d+$/)) {
              return sortPositionsCorrectly([a.value, b.value]).indexOf(a.value) - 
                     sortPositionsCorrectly([a.value, b.value]).indexOf(b.value);
            }
            return 0;
          });
          
          return originalSetChoices.call(this, sortedChoices, value, label, replaceChoices);
        }
        
        return originalSetChoices.call(this, choices, value, label, replaceChoices);
      };
      
      console.log('✅ Choices.js setChoices patcheado para ordenação correta');
    }
  }
  
  // Interceptar organizador de posições
  function patchPositionOrganizer() {
    // Aguardar carregamento do organizador
    const checkOrganizer = () => {
      if (typeof window.organizarComboboxPosicoes === 'function') {
        const original = window.organizarComboboxPosicoes;
        
        window.organizarComboboxPosicoes = function(selectElement, posicoes, options = {}) {
          // Ordenar posições antes de processar
          const posicoesOrdenadas = sortPositionsCorrectly([...posicoes]);
          
          console.log('🔧 Posições ordenadas:', posicoesOrdenadas.slice(0, 10));
          
          return original.call(this, selectElement, posicoesOrdenadas, options);
        };
        
        console.log('✅ organizarComboboxPosicoes patcheado');
      } else {
        setTimeout(checkOrganizer, 100);
      }
    };
    
    checkOrganizer();
  }
  
  // Interceptar carregamento de posições na descarga
  function patchDescargaPositions() {
    // Aguardar carregamento do módulo de descarga
    const checkDescarga = () => {
      // Procurar por elementos select de posições
      const positionSelects = document.querySelectorAll('select[id*="posicao"]');
      
      positionSelects.forEach(select => {
        // Observar mudanças no select
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              // Verificar se foram adicionadas options
              const options = Array.from(select.options);
              if (options.length > 1) { // Mais que apenas placeholder
                const positionOptions = options.filter(opt => 
                  opt.value && opt.value.match(/^[A-E]\d{2}-\d+$/)
                );
                
                if (positionOptions.length > 0) {
                  // Ordenar options
                  const sortedValues = positionOptions.map(opt => opt.value);
                  const sorted = sortPositionsCorrectly(sortedValues);
                  
                  // Reordenar options no DOM
                  const placeholder = options.find(opt => !opt.value || opt.disabled);
                  select.innerHTML = '';
                  
                  if (placeholder) {
                    select.appendChild(placeholder);
                  }
                  
                  sorted.forEach(value => {
                    const originalOption = positionOptions.find(opt => opt.value === value);
                    if (originalOption) {
                      select.appendChild(originalOption.cloneNode(true));
                    }
                  });
                  
                  console.log('🔧 Options reordenadas no select:', select.id);
                }
              }
            }
          });
        });
        
        observer.observe(select, { childList: true, subtree: true });
      });
      
      setTimeout(checkDescarga, 1000); // Verificar novamente
    };
    
    checkDescarga();
  }
  
  // Aplicar patches quando DOM estiver pronto
  function initPatches() {
    patchChoicesSetChoices();
    patchPositionOrganizer();
    patchDescargaPositions();
    
    console.log('✅ Patches de ordenação de posições aplicados');
  }
  
  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPatches);
  } else {
    initPatches();
  }
  
  // Expor função para uso manual
  window.sortPositionsCorrectly = sortPositionsCorrectly;
  
})();

console.log('✅ Correção direta de ordenação carregada');
