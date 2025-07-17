// modules/api.js
// Centraliza todas as chamadas fetch ao backend
// Cada função retorna dados já prontos para consumo dos módulos de UI

import { appState } from './state.js';

// ========== Containers ==========
export async function fetchContainers(forceRefresh = false) {
  const agora = new Date();
  if (!forceRefresh && appState.containersCacheTime && agora - appState.containersCacheTime < 120000 && appState.containersCache.length > 0) {
    console.log('📦 Usando containers do cache');
    return appState.containersCache;
  }

  console.log('🔄 Buscando containers do backend...');
  const resp = await fetch(`/operacoes/containers/lista${forceRefresh ? '?refresh=true' : ''}`);
  const data = await resp.json();
  if (data.success) {
    appState.containersCache = data.data;
    appState.containersCacheTime = agora;
    return data.data;
  }
  console.error('❌ Erro ao carregar containers:', data.error);
  return [];
}

export async function fetchContainersAvailable(forceRefresh = false) {
  const containers = await fetchContainers(forceRefresh);
  return containers.filter(c => c.status === 'no patio' || c.status === 'carregado');
}

// ========== Containers Vistoriados ==========
export async function fetchInspectedContainers(forceRefresh = false) {
  const agora = new Date();
  if (!forceRefresh && appState.containersVistoriadosCacheTime && agora - appState.containersVistoriadosCacheTime < 60000 && appState.containersVistoriadosCache.length > 0) {
    console.log('📦 Usando vistoriados do cache');
    return appState.containersVistoriadosCache;
  }

  const resp = await fetch(`/operacoes/containers/vistoriados?refresh=${forceRefresh}`);
  const data = await resp.json();
  if (data.success && Array.isArray(data.data)) {
    appState.containersVistoriadosCache = data.data;
    appState.containersVistoriadosCacheTime = agora;
    return data.data;
  }
  console.error('❌ Erro ao carregar containers vistoriados:', data.error);
  return [];
}

// ========== Posições Livres ==========
export async function fetchFreePositions(forceRefresh = false) {
  const agora = new Date();
  if (!forceRefresh && appState.posicoesLivresCache && appState.posicoesLivresCacheTime && (agora - appState.posicoesLivresCacheTime < 120000)) {
    return appState.posicoesLivresCache;
  }

  const resp = await fetch(`/operacoes/posicoes/livres${forceRefresh ? '?refresh=true' : ''}`);
  const data = await resp.json();
  if (data.success && Array.isArray(data.data)) {
    appState.posicoesLivresCache = data.data;
    appState.posicoesLivresCacheTime = agora;
    return data.data;
  }
  console.error('❌ Erro ao obter posições livres:', data.error);
  return [];
}
