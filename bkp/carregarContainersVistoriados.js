/**
 * Carrega containers que foram vistoriados e estão prontos para descarga
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Array} Lista de containers vistoriados
 */
async function carregarContainersVistoriados(forceRefresh = false) {
  try {
    console.log(`🔍 DEBUG - carregarContainersVistoriados chamada com forceRefresh: ${forceRefresh}`);
    
    // Verificar cache local (válido por 2 minutos)
    const agora = new Date();
    if (
      !forceRefresh &&
      appState.containersVistoriadosCacheTime &&
      agora - appState.containersVistoriadosCacheTime < 120000 &&
      appState.containersVistoriadosCache &&
      appState.containersVistoriadosCache.length > 0
    ) {
      console.log("📦 Usando containers vistoriados do cache local");
      console.log(`🔍 DEBUG - Cache contém ${appState.containersVistoriadosCache.length} containers:`, appState.containersVistoriadosCache);
      return appState.containersVistoriadosCache;
    }

    console.log("🔄 Carregando containers vistoriados do banco de dados...");
    console.log(`🔍 DEBUG - URL da requisição: /operacoes/containers/vistoriados${forceRefresh ? "?refresh=true" : ""}`);

    const response = await fetch(
      `/operacoes/containers/vistoriados${forceRefresh ? "?refresh=true" : ""}`
    );
    
    console.log(`🔍 DEBUG - Response status: ${response.status}`);
    console.log(`🔍 DEBUG - Response ok: ${response.ok}`);
    
    const result = await response.json();
    console.log(`🔍 DEBUG - Response JSON:`, result);

    if (result.success) {
      // Remover duplicatas mantendo apenas a vistoria mais recente de cada container
      const containersUnicos = [];
      const vistos = new Set();
      for (const cont of result.data) {
        if (!vistos.has(cont.numero)) {
          vistos.add(cont.numero);
          containersUnicos.push(cont);
        }
      }
      appState.containersVistoriadosCache = containersUnicos;
      appState.containersVistoriadosCacheTime = agora;
      console.log(`✅ ${result.data.length} containers vistoriados carregados`);
      console.log(`🔍 DEBUG - Containers carregados:`, result.data);
      return containersUnicos;
    } else {
      console.error("❌ Erro ao carregar containers vistoriados:", result.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Erro na requisição de containers vistoriados:", error);
    console.error(`🔍 DEBUG - Stack trace:`, error.stack);
    return [];
  }
}

/**
 * Atualiza a lista de containers vistoriados para descarga
 * Exibe feedback visual durante o processo
 */
async function atualizarContainersVistoriados() {
  // Obter todos os botões de atualização relacionados aos containers vistoriados
  const refreshButtons = document.querySelectorAll('.btn-refresh-vistoriados');
  
  // Adicionar classe de animação aos botões
  refreshButtons.forEach(btn => {
    btn.classList.add('rotating');
    btn.setAttribute('disabled', 'disabled');
  });
  
  try {
    // Forçar atualização dos containers vistoriados
    const containersAtualizados = await carregarContainersVistoriados(true);
    
    // Re-inicializar os comboboxes de containers vistoriados
    await inicializarComboboxesContainersVistoriados();
    
    // Mostrar mensagem de sucesso
    console.log("✅ Lista de containers vistoriados atualizada com sucesso");
    
    // Mostrar toast de sucesso com a quantidade de containers vistoriados
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    });
    
    Toast.fire({
      icon: "success",
      title: `${containersAtualizados.length} containers vistoriados disponíveis`
    });
    
  } catch (error) {
    console.error("❌ Erro ao atualizar containers vistoriados:", error);
    
    // Notificar erro ao usuário
    Swal.fire({
      icon: "error",
      title: "Erro ao atualizar containers vistoriados",
      text: "Não foi possível atualizar a lista de containers vistoriados.",
      confirmButtonColor: "#d33",
      allowOutsideClick: false
    });
  } finally {
    // Remover classe de animação e habilitar os botões
    refreshButtons.forEach(btn => {
      btn.classList.remove('rotating');
      btn.removeAttribute('disabled');
    });
  }
}

/**
 * Inicializa os comboboxes para containers vistoriados para descarga
 * @returns {Promise} Promise que resolve quando a inicialização for concluída
 */
function inicializarComboboxesContainersVistoriados() {
  console.log("🔄 Inicializando comboboxes de containers vistoriados...");
  
  // Retornar uma promise explicitamente para garantir compatibilidade com .then() no dashboard.js
  return new Promise(async (resolve, reject) => {
    try {
      // Carregar containers vistoriados
      const containersVistoriados = await carregarContainersVistoriados();
      
      if (containersVistoriados.length === 0) {
        console.warn("⚠️ Nenhum container vistoriado disponível para descarga");
      }
      
      // Obter todos os elementos de input para containers vistoriados
      const inputsDescargas = [
        document.getElementById('container_descarga_rod'),
        document.getElementById('container_descarga_fer')
      ];
      
      // Criar comboboxes para cada input de container vistoriado
      inputsDescargas.forEach(input => {
        if (input) {
          criarComboboxContainersVistoriados(input, containersVistoriados);
        }
      });
      
      console.log("✅ Comboboxes de containers vistoriados inicializados");
      resolve(containersVistoriados); // Resolve a promise com os containers carregados
      
    } catch (error) {
      console.error("❌ Erro ao inicializar comboboxes de containers vistoriados:", error);
      // Resolver mesmo com erro para não bloquear o fluxo de inicialização
      resolve([]); // Resolve a promise com array vazio em caso de erro
    }
  });
}

/**
 * Configura combobox para containers vistoriados
 * @param {HTMLElement} inputElement - Campo de input
 * @param {Array} containers - Lista de containers vistoriados
 */
function criarComboboxContainersVistoriados(inputElement, containers) {
  if (!inputElement) return;
  
  // Criar e adicionar wrapper para combobox se ainda não existir
  let comboboxWrapper = inputElement.parentElement.querySelector('.combobox-wrapper');
  
  if (!comboboxWrapper) {
    // Criar novo wrapper
    comboboxWrapper = document.createElement('div');
    comboboxWrapper.className = 'combobox-wrapper';
    
    // Mover o input para dentro do wrapper
    inputElement.parentNode.insertBefore(comboboxWrapper, inputElement);
    comboboxWrapper.appendChild(inputElement);
    
    // Adicionar botão de atualização
    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'btn-refresh btn-refresh-vistoriados';
    refreshButton.title = 'Atualizar lista de containers vistoriados';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshButton.onclick = atualizarContainersVistoriados;
    comboboxWrapper.appendChild(refreshButton);
  }
  
  // Configurar o input
  inputElement.setAttribute('autocomplete', 'off');
  inputElement.setAttribute('list', 'datalist-' + inputElement.id);
  
  // Criar ou atualizar o datalist
  let dataList = document.getElementById('datalist-' + inputElement.id);
  if (!dataList) {
    dataList = document.createElement('datalist');
    dataList.id = 'datalist-' + inputElement.id;
    comboboxWrapper.appendChild(dataList);
  } else {
    dataList.innerHTML = ''; // Limpar opções existentes
  }
  
  // Adicionar opções ao datalist
  containers.forEach(container => {
    const option = document.createElement('option');
    option.value = container.numero;
    option.textContent = `${container.numero} (${container.iso_container || 'N/A'})`;
    dataList.appendChild(option);
  });
  
  // Configurar event listeners para mostrar sugestões
  inputElement.addEventListener('input', function() {
    mostrarSugestoesContainersVistoriados(this, containers);
  });
  
  inputElement.addEventListener('focus', function() {
    mostrarSugestoesContainersVistoriados(this, containers);
  });
}

/**
 * Função principal para autocompletar containers vistoriados
 * @param {HTMLElement} input - O campo de input sendo preenchido
 * @returns {boolean} - Verdadeiro se o container foi encontrado na lista
 */
function autocompletarContainer(input) {
  if (!input || !input.value) return false;
  
  const containerNumero = input.value.trim().toUpperCase();
  if (containerNumero.length < 3) return false;
  
  // Verificar se temos containers vistoriados no cache
  if (!appState.containersVistoriadosCache || appState.containersVistoriadosCache.length === 0) {
    console.warn("⚠️ Cache de containers vistoriados vazio");
    return false;
  }
  
  // Verificar se o container está na lista de vistoriados
  const containerEncontrado = appState.containersVistoriadosCache.find(
    container => container.numero.toUpperCase() === containerNumero
  );
  
  if (containerEncontrado) {
    // Container encontrado exatamente como digitado
    console.log(`✅ Container ${containerNumero} encontrado na lista de vistoriados`); 
    input.classList.add('is-valid');
    input.classList.remove('is-invalid', 'container-validation-error');
    
    // Limpar mensagens de erro
    const errorContainer = input.parentElement.querySelector('.container-error-message');
    if (errorContainer) {
      errorContainer.remove();
    }
    
    return true;
  } else {
    // Container não encontrado exatamente, mostrar sugestões
    mostrarSugestoesContainersVistoriados(input, appState.containersVistoriadosCache);
    
    // Se o campo tem conteúdo, mas não é um container válido
    if (containerNumero.length >= 4) {
      // Verificar se já existe algum container que começa com o que foi digitado
      const possiveisMatches = appState.containersVistoriadosCache.filter(
        container => container.numero.toUpperCase().startsWith(containerNumero)
      );
      
      if (possiveisMatches.length === 0) {
        // Não há containers que comecem com o que foi digitado
        input.classList.add('is-invalid');
        return false;
      }
    }
    
    return false;
  }
}

// Função mostrarSugestoesContainersVistoriados removida para evitar conflitos
// A implementação está no dashboard.js
