// ========================================
// PROCESSADOR DE CONSULTA DE CONTAINER VIA URL
// ========================================

/**
 * Processa parâmetros de URL para consulta de container
 * Evita o erro "Assignment to constant variable"
 */
document.addEventListener("DOMContentLoaded", function() {
  try {
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const numeroContainer = urlParams.get('numero_container');
    
    // Se houver um número de container na URL, redirecionar para a rota correta
    if (numeroContainer) {
      console.log(`🔍 Detectado número de container na URL: ${numeroContainer}`);
      
      // Redirecionar para a rota de busca de container
      window.location.href = `/buscar_container?numero=${encodeURIComponent(numeroContainer)}`;
    }
  } catch (error) {
    console.error("❌ Erro ao processar parâmetros de URL:", error);
    
    // Mostrar modal de erro amigável
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: "error",
        title: "Erro ao processar consulta",
        text: "Não foi possível processar a consulta do container. Tente novamente.",
        confirmButtonText: "OK",
        confirmButtonColor: "#ef4444"
      });
    } else {
      alert("Erro ao processar consulta do container. Tente novamente.");
    }
  }
});
