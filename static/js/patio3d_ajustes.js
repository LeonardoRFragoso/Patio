/**
 * Ajustes para a Visualização 3D do Pátio
 * Este script aplica correções específicas para o sistema de visualização 3D:
 * 1. Posiciona os containers horizontalmente (rotação de 90 graus no eixo Y)
 * 2. Garante que as posições vazias estejam sempre visíveis
 * 3. Elimina mensagens duplicadas no console
 */

class Patio3DAjustes {
  constructor() {
    this.aplicado = false;
    this.intervalId = null;
    this.tentativas = 0;
    this.maxTentativas = 20;
  }

  /**
   * Inicia o processo de aplicação dos ajustes
   */
  iniciar() {
    console.log("🔧 Iniciando ajustes para visualização 3D do pátio...");
    
    // Limpar qualquer intervalo anterior
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Tentar aplicar os ajustes a cada 500ms
    this.intervalId = setInterval(() => {
      this.tentarAplicarAjustes();
    }, 500);
  }

  /**
   * Tenta aplicar os ajustes ao sistema 3D
   */
  tentarAplicarAjustes() {
    this.tentativas++;
    
    // Verificar se o sistema 3D está disponível
    const mgr = window.patio3dManager;
    if (!mgr) {
      if (this.tentativas >= this.maxTentativas) {
        console.warn("⚠️ Sistema 3D não disponível após várias tentativas. Ajustes não aplicados.");
        clearInterval(this.intervalId);
      }
      return;
    }
    
    // Aplicar os ajustes
    this.aplicarAjustes(mgr);
    
    // Se já aplicou com sucesso, parar o intervalo
    if (this.aplicado) {
      console.log("✅ Ajustes aplicados com sucesso ao sistema 3D!");
      clearInterval(this.intervalId);
    }
    
    // Parar após número máximo de tentativas
    if (this.tentativas >= this.maxTentativas) {
      console.warn(`⚠️ Número máximo de tentativas (${this.maxTentativas}) atingido.`);
      clearInterval(this.intervalId);
    }
  }

  /**
   * Aplica os ajustes ao gerenciador 3D
   * @param {Object} mgr - Instância do PatioVisualizacao3DManager
   */
  aplicarAjustes(mgr) {
    try {
      // 1. Rotacionar todos os containers para orientação horizontal
      this.rotacionarContainersHorizontalmente(mgr);
      
      // 2. Garantir que posições vazias estejam sempre visíveis
      this.garantirPosicoesVaziasVisiveis(mgr);
      
      // 3. Substituir funções que geram mensagens duplicadas
      this.reduzirMensagensDuplicadas(mgr);
      
      // Marcar como aplicado
      this.aplicado = true;
      
      // Adicionar observador para continuar aplicando em novos containers
      this.observarNovosDados(mgr);
      
    } catch (error) {
      console.error("❌ Erro ao aplicar ajustes:", error);
    }
  }

  /**
   * Verifica se containers estão com orientação horizontal correta
   * @param {Object} mgr - Instância do PatioVisualizacao3DManager
   */
  rotacionarContainersHorizontalmente(mgr) {
    if (!mgr.containerGroup) return;
    
    let contadorVerificados = 0;
    
    mgr.containerGroup.children.forEach((mesh) => {
      // Verificar se é um container (tem userData com container)
      if (mesh && mesh.userData && mesh.userData.container) {
        // ORIENTAÇÃO JÁ APLICADA NO CÓDIGO PRINCIPAL (rotation.z = Math.PI / 2)
        // Não aplicar rotação adicional para evitar conflitos
        contadorVerificados++;
      }
    });
    
    console.log(`✅ ${contadorVerificados} containers verificados (orientação horizontal já aplicada no código principal)`);
  }

  /**
   * Garante que as posições vazias estejam sempre visíveis
   * @param {Object} mgr - Instância do PatioVisualizacao3DManager
   */
  garantirPosicoesVaziasVisiveis(mgr) {
    if (!mgr.posicoesVaziasGroup) return;
    
    // Tornar posições vazias visíveis
    mgr.posicoesVaziasGroup.visible = true;
    mgr.posicoesVaziasVisiveis = true;
    
    // Substituir a função toggle para sempre manter visível
    const toggleOriginal = mgr.togglePosicoesVazias;
    mgr.togglePosicoesVazias = function(btn) {
      // Sempre garantir que fique visível
      this.posicoesVaziasVisiveis = true;
      this.posicoesVaziasGroup.visible = true;
      
      // Atualizar o botão se existir
      if (btn) {
        btn.classList.add("active");
        btn.innerHTML = `<i class="fas fa-eye me-2"></i>Ocultar Posições Vazias`;
      }
      
      console.log("👁️ Posições vazias mantidas visíveis (configuração padrão)");
    };
    
    // Atualizar o botão na interface
    const btnToggle = document.getElementById("btn-toggle-posicoes-vazias");
    if (btnToggle) {
      btnToggle.classList.add("active");
      btnToggle.innerHTML = `<i class="fas fa-eye me-2"></i>Ocultar Posições Vazias`;
    }
    
    console.log("👁️ Posições vazias configuradas para sempre visíveis");
  }

  /**
   * Reduz mensagens duplicadas substituindo funções de log
   * @param {Object} mgr - Instância do PatioVisualizacao3DManager
   */
  reduzirMensagensDuplicadas(mgr) {
    // Conjunto para rastrear mensagens já exibidas
    const mensagensExibidas = new Set();
    
    // Substituir função de debug para evitar duplicatas
    const debugOriginal = mgr.debug;
    mgr.debug = function(message, type = "info") {
      // Criar uma chave única para a mensagem
      const chave = `${message}-${type}`;
      
      // Verificar se já foi exibida recentemente
      if (!mensagensExibidas.has(chave)) {
        mensagensExibidas.add(chave);
        debugOriginal.call(this, message, type);
        
        // Limpar após um tempo para permitir que a mensagem seja exibida novamente no futuro
        setTimeout(() => {
          mensagensExibidas.delete(chave);
        }, 5000);
      }
    };
    
    console.log("🔇 Sistema de logs otimizado para evitar duplicatas");
  }

  /**
   * Observa novos dados para aplicar ajustes em containers adicionados posteriormente
   * @param {Object} mgr - Instância do PatioVisualizacao3DManager
   */
  observarNovosDados(mgr) {
    // Armazenar referência para uso no callback
    const self = this;
    
    // Substituir a função de criação de container
    const criarContainerOriginal = mgr.criarContainerMelhorado;
    mgr.criarContainerMelhorado = function(container) {
      // Chamar a função original
      const mesh = criarContainerOriginal.call(this, container);
      
      // ORIENTAÇÃO JÁ APLICADA NA FUNÇÃO ORIGINAL (rotation.z = Math.PI / 2)
      // Não aplicar rotação adicional para evitar conflitos
      
      return mesh;
    };
    
    console.log("👀 Observador configurado para novos containers");
  }
}

// Iniciar os ajustes quando o documento estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  const ajustes = new Patio3DAjustes();
  ajustes.iniciar();
  
  // Disponibilizar globalmente para debug
  window.patio3dAjustes = ajustes;
});
