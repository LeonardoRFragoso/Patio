// modules/state.js
// Estado global compartilhado entre os módulos do dashboard
// Mantém caches e dados de UI. 100 % compatível com a antiga variável appState

export const appState = {
  currentOperation: null,
  currentMode: null,
  activeForm: null,

  // Caches de dados
  placasCache: [],
  placasCacheTime: null,

  containersCache: [],
  containersCacheTime: null,

  containersVistoriadosCache: [],
  containersVistoriadosCacheTime: null,

  posicoesLivresCache: null,
  posicoesLivresCacheTime: null,
};
