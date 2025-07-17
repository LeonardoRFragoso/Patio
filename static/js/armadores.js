// armadores.js - Carrega e gerencia o combobox de armadores

document.addEventListener('DOMContentLoaded', function() {
    carregarArmadores();
});

// Função para carregar a lista de armadores
function carregarArmadores() {
    const selectArmador = document.getElementById('armador');
    if (!selectArmador) return;

    // Indicador de carregamento
    selectArmador.innerHTML = '<option value="">Carregando armadores...</option>';

    fetch('/vistoriador/api/armadores')
        .then(response => response.json())
        .then(data => {
            selectArmador.innerHTML = '<option value="">Selecione um armador</option>';
            (data.armadores || []).forEach(armador => {
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

// Expor função globalmente para compatibilidade com módulos ES e scripts inline
if (typeof window !== 'undefined') {
    window.carregarArmadores = window.carregarArmadores || carregarArmadores;
}
