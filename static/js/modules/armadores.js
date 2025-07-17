// armadores.js - Carrega e gerencia o combobox de armadores
document.addEventListener('DOMContentLoaded', function() {
  // Carrega os dados de armadores do servidor
  carregarArmadores();
});

// Função para carregar a lista de armadores
function carregarArmadores() {
  const selectArmador = document.getElementById('armador');
  
  // Verifica se o elemento existe na página
  if (!selectArmador) return;
  
  // Mostrar indicador de carregamento (opcional)
  selectArmador.innerHTML = '<option value="">Carregando armadores...</option>';
  
  // Fazer requisição para o novo endpoint que retornará a lista de armadores
  fetch('/vistoriador/api/armadores')
      .then(response => response.json())
      .then(data => {
          // Limpar o select antes de adicionar as opções
          selectArmador.innerHTML = '<option value="">Selecione um armador</option>';
          
          // Adicionar cada armador como uma opção
          data.armadores.forEach(armador => {
              if (armador.trim() !== '') {
                  const option = document.createElement('option');
                  option.value = armador;
                  option.textContent = armador;
                  selectArmador.appendChild(option);
              }
          });
      })
      .catch(error => {
          console.error('Erro ao carregar armadores:', error);
          selectArmador.innerHTML = '<option value="">Erro ao carregar armadores</option>';
      });
}
