/**
 * Sistema de Visualização 3D do Pátio - Versão COMPLETA Corrigida
 * Utiliza Three.js para renderizar containers e posições em 3D
 * Otimizado para tablets com interface touch-friendly
 * SEM referências circulares - Compatível com carregamento dinâmico
 * 
 * INTERPRETAÇÃO SEMÂNTICA ATUALIZADA:
 * - Letra (A-E) representa ROW (linha do pátio)
 * - Número (01-20) representa BAIA (coluna do pátio)
 * - Formato mantido: "A01-1" (Row A, Baia 01, Altura 1)
 */

console.log('✅ Inicializando módulo PatioVisualizacao...');

// Garantir que temos THREE disponível como uma referência global
if (window.GLOBAL_THREE && !window.THREE) {
    window.THREE = window.GLOBAL_THREE;
    console.log('THREE.js definido globalmente a partir de GLOBAL_THREE');
}

window.PatioVisualizacao = (function() {
    'use strict';
    
    // ===== VARIÁVEIS GLOBAIS =====
    let scene, camera, renderer, controls;
    let containerGroup, labelGroup;
    let patioData = null;
    let selectedContainer = null;
    let isLoading = false;
    
    // Referência global ao THREE para garantir uso consistente
    let THREE_REF = window.THREE || {};

    // Constantes de layout
    const PATIO_CONFIG = {
        ROWS: ['A', 'B', 'C', 'D', 'E'],  // A-E agora são rows
        BAIAS_POR_ROW: 20,  // 01-20 agora são baias
        ALTURAS_MAXIMAS: 5,
        ESPACAMENTO_ROW: 30,  // Espaçamento entre rows
        ESPACAMENTO_BAIA: 3,  // Espaçamento entre baias
        ALTURA_CONTAINER: 2.5,
        TAMANHO_CONTAINER: 2
    };

    // Cores do sistema
    const CORES = {
        OCUPADA: 0xff4444,      // Vermelho
        VAZIA: 0x44ff44,        // Verde
        SELECIONADA: 0xffaa00,  // Laranja
        VISTORIADA: 0x00aaff,   // Azul
        GRID: 0x888888,         // Cinza
        LABELS: 0x333333        // Cinza escuro
    };

    // ===== LOGGING CUSTOMIZADO =====
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    function debugLog(message, type = 'info') {
        const timestamp = new Date().toISOString().substr(11, 8);
        const prefix = type === 'error' ? '❌ ' : (type === 'warn' ? '⚠️ ' : '✅ ');
        const formattedMsg = `${timestamp} ${prefix}${message}`;
        
        if (type === 'error') {
            originalError.call(console, formattedMsg);
        } else if (type === 'warn') {
            originalWarn.call(console, formattedMsg);
        } else {
            originalLog.call(console, formattedMsg);
        }
        
        // Adicionar ao console de debug visível se existir
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            const logEntry = document.createElement('div');
            logEntry.style.color = type === 'error' ? '#ff4444' : (type === 'warn' ? '#ffaa33' : '#44ff44');
            logEntry.textContent = formattedMsg;
            consoleOutput.appendChild(logEntry);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    }

    // ===== VERIFICAÇÃO DINÂMICA DO THREE.JS =====
    function verificarThreeJSDisponivel() {
        // Garantir que THREE_REF tenha uma referência válida
        if (THREE_REF && THREE_REF.REVISION) {
            debugLog('THREE.js já disponível em THREE_REF: v' + THREE_REF.REVISION);
            return true;
        }
        
        // Verificar window.THREE primeiro (mais comum)
        if (typeof window.THREE !== 'undefined' && window.THREE.REVISION) {
            THREE_REF = window.THREE;
            window.GLOBAL_THREE = window.THREE; // Para compatibilidade
            debugLog('THREE.js encontrado em window.THREE: v' + THREE_REF.REVISION);
            return true;
        }
        
        // Verificar THREE global
        if (typeof THREE !== 'undefined' && THREE.REVISION) {
            THREE_REF = THREE;
            window.THREE = THREE; // Garantir disponibilidade global
            window.GLOBAL_THREE = THREE;
            debugLog('THREE.js encontrado globalmente: v' + THREE_REF.REVISION);
            return true;
        }
        
        // Verificar window.GLOBAL_THREE (nosso fallback)
        if (typeof window.GLOBAL_THREE !== 'undefined' && window.GLOBAL_THREE.REVISION) {
            THREE_REF = window.GLOBAL_THREE;
            window.THREE = window.GLOBAL_THREE; // Garantir disponibilidade global
            debugLog('THREE.js encontrado em window.GLOBAL_THREE: v' + THREE_REF.REVISION);
            return true;
        }
        
        debugLog('THREE.js não disponível em nenhum namespace', 'warn');
        return false;
    }

    // ===== FUNÇÕES UTILITÁRIAS =====
    function atualizarStatusUI(mensagem) {
        try {
            const statusEl = document.getElementById('three-status');
            if (statusEl) {
                statusEl.textContent = mensagem;
                debugLog('Status UI atualizado: ' + mensagem);
            }
        } catch (err) {
            console.error('Erro ao atualizar status UI:', err);
        }
    }

    function mostrarNotificacao(mensagem, tipo = 'info') {
        debugLog(`${tipo.toUpperCase()}: ${mensagem}`);
        
        const toast = document.getElementById('notification-toast');
        const toastBody = toast?.querySelector('.toast-body');
        
        if (toastBody && typeof bootstrap !== 'undefined') {
            toastBody.textContent = mensagem;
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }

    function mostrarLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.style.display = 'block';
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('fade-out');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            }
        }
    }

    function animarRefresh(animar) {
        const btn = document.getElementById('btn-refresh');
        if (btn) {
            btn.classList.toggle('loading', animar);
        }
    }

    // ===== ESTATÍSTICAS =====
    function atualizarEstatisticas() {
        if (!patioData) {
            debugLog('Erro ao atualizar estatísticas: patioData não está definido', 'error');
            return;
        }

        try {
            // Verificar se as propriedades necessárias existem
            const posicoes = Array.isArray(patioData.posicoes_disponiveis) ? patioData.posicoes_disponiveis : [];
            const ocupados = Array.isArray(patioData.containers_ocupados) ? patioData.containers_ocupados : [];
            
            const totalPosicoes = posicoes.length;
            const totalOcupadas = ocupados.length;
            const ocupacaoPercent = totalPosicoes > 0 ? Math.round((totalOcupadas / totalPosicoes) * 100) : 0;

            // Atualizar elementos DOM com verificações de null
            const updateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            };

            updateElement('stat-total-posicoes', totalPosicoes);
            updateElement('stat-posicoes-ocupadas', totalOcupadas);
            updateElement('stat-posicoes-livres', totalPosicoes - totalOcupadas);
            updateElement('stat-ocupacao-percent', `${ocupacaoPercent}%`);

            // Atualizar gráfico de ocupação
            const ocupacaoEl = document.querySelector('.ocupacao-bar-fill');
            if (ocupacaoEl) {
                ocupacaoEl.style.width = `${ocupacaoPercent}%`;
                
                // Mudar cor baseado na ocupação
                ocupacaoEl.classList.remove('bg-success', 'bg-warning', 'bg-danger');
                
                if (ocupacaoPercent < 50) {
                    ocupacaoEl.classList.add('bg-success');
                } else if (ocupacaoPercent < 80) {
                    ocupacaoEl.classList.add('bg-warning');
                } else {
                    ocupacaoEl.classList.add('bg-danger');
                }
            }

            debugLog('Estatísticas atualizadas');
        } catch (error) {
            debugLog('Erro ao atualizar estatísticas: ' + error.message, 'error');
        }
    }

    // ===== ESTILOS PARA TABLET =====
    function adicionarEstilosTablet() {
        debugLog('Aplicando estilos otimizados para tablet...');
        
        const style = document.createElement('style');
        style.textContent = `
            /* Otimizações para interface touch conforme especificações */
            #three-container {
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            
            /* Tamanho dos botões de controle para fácil toque */
            .control-button {
                min-height: 60px;
                min-width: 60px;
                margin: 8px;
                padding: 18px 40px;
                border-radius: 8px;
                font-size: 1.3rem;
                transition: all 0.2s ease;
            }
            
            /* Botões de controle de câmera */
            .camera-controls button {
                width: 70px;
                height: 70px;
                margin: 10px;
            }
            
            /* Filtros mais fáceis de tocar */
            #filtros-container select,
            #filtros-container input[type="checkbox"] + label {
                min-height: 60px;
                min-width: 48px;
                padding: 12px;
                font-size: 1.3rem;
            }
            
            /* Checkbox maiores */
            #filtros-container input[type="checkbox"] {
                width: 24px;
                height: 24px;
            }
            
            /* Inputs de busca maiores */
            #busca-container input {
                font-size: 1.2rem;
                padding: 18px;
                height: 60px;
                border-radius: 8px;
            }
            
            /* Scrollbar personalizada mais larga para tablets */
            ::-webkit-scrollbar {
                width: 12px;
            }
            
            ::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.3);
                border-radius: 6px;
            }
            
            /* Classes específicas para touch */
            .touch-device .control-label {
                font-size: 1.3rem;
                margin-bottom: 12px;
            }
            
            /* Ajustes para modal em tablets */
            .modal-content {
                padding: 20px;
            }
            
            .modal-body {
                padding: 18px;
                font-size: 1.3rem;
            }
            
            /* Ajuste para compatibilidade com a análise por toque */
            canvas {
                touch-action: none;
            }
            
            /* Ajustes de responsividade específicos */
            @media (max-width: 768px) {
                .control-button {
                    min-height: 70px;
                    font-size: 1.2rem;
                }
            }
            
            @media (min-width: 769px) and (max-width: 1024px) {
                .control-button {
                    min-height: 60px;
                    font-size: 1.3rem;
                }
            }
        `;
        
        document.head.appendChild(style);
        debugLog('Estilos para tablet aplicados');
    }

// ===== INICIALIZAÇÃO PRINCIPAL =====
function init() {
    debugLog('Inicializando sistema de visualização 3D do pátio...');
    
    // Verificar e sincronizar referências globais do THREE.js
    try {
        if (window.THREE && !THREE_REF.REVISION) {
            THREE_REF = window.THREE;
            debugLog('THREE.js sincronizado de window.THREE para THREE_REF');
        } else if (typeof THREE !== 'undefined' && !THREE_REF.REVISION) {
            THREE_REF = THREE;
            window.THREE = THREE;
            debugLog('THREE.js sincronizado da referência global para THREE_REF');
        }
        
        // Verificar se THREE_REF foi inicializado corretamente
        if (!THREE_REF || !THREE_REF.REVISION) {
            debugLog('Erro: THREE.js não disponível após tentativa de sincronização', 'error');
            mostrarNotificacao('Erro: Three.js não disponível. Verifique se a biblioteca foi carregada.', 'error');
            return false;
        }
    } catch (error) {
        debugLog('Erro ao sincronizar THREE.js: ' + error.message, 'error');
        mostrarNotificacao('Erro ao inicializar Three.js', 'error');
        return false;
    }
    
    // Verificar se THREE.js está disponível dinamicamente
    if (!verificarThreeJSDisponivel()) {
        debugLog('THREE.js não disponível, tentando novamente em 1 segundo...', 'warn');
        
        // Verificar se THREE.js está em algum namespace no template HTML
        if (window.GLOBAL_THREE && window.GLOBAL_THREE.REVISION) {
            THREE_REF = window.GLOBAL_THREE;
            window.THREE = window.GLOBAL_THREE;
            debugLog('THREE.js encontrado em window.GLOBAL_THREE, usando como fallback');
        } else {
            setTimeout(function() {
                if (verificarThreeJSDisponivel()) {
                    debugLog('THREE.js detectado após delay, continuando...');
                    init();
                } else {
                    debugLog('THREE.js continua indisponível após retry', 'error');
                    atualizarStatusUI('Erro: THREE.js não disponível');
                    mostrarNotificacao('Erro: THREE.js não disponível', 'error');
                }
            }, 1000);
            return false;
        }
        return false;
    }
    
    // Definir referência global ao THREE
    THREE_REF = THREE;
    debugLog('Three.js detectado: ' + THREE.REVISION);
    
    // Inicializar patioData com objeto vazio para evitar erros de undefined
    patioData = {
        posicoes_disponiveis: [],
        containers_ocupados: [],
        estatisticas: {
            total_posicoes: 0,
            posicoes_ocupadas: 0,
            posicoes_livres: 0,
            taxa_ocupacao: 0,
            por_baia: {},
            por_altura: {}
        }
    };
    
    // Inicializar ambiente 3D
    if (!inicializarThreeJS()) {
        debugLog('Falha ao inicializar Three.js', 'error');
        mostrarNotificacao('Erro ao inicializar ambiente 3D', 'error');
        return false;
    }
    
    // Verificar se os grupos foram inicializados corretamente
    if (!containerGroup || !containerGroup.children || !labelGroup || !labelGroup.children) {
        debugLog('Erro: grupos de renderização não foram inicializados corretamente', 'error');
        mostrarNotificacao('Erro ao inicializar: grupos de renderização não inicializados', 'error');
        return false;
    }
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Iniciar loop de renderização
    animate();
    
    // Esconder overlay de carregamento após inicialização bem-sucedida
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        setTimeout(() => {
            loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }, 1000);
    }
    
    // Carregar dados do pátio após inicialização bem-sucedida
    carregarDadosPatio();
    
    debugLog('Visualização 3D inicializada com sucesso!');
    return true;
}

// ===== CARREGAMENTO DE DADOS =====
async function carregarDadosPatio() {
    if (!THREE_REF) {
        debugLog('Erro: THREE_REF não está definido. Three.js não foi carregado corretamente.', 'error');
        mostrarNotificacao('Erro ao inicializar: Three.js não carregado', 'error');
        return;
    }
    
    if (!containerGroup || !labelGroup) {
        debugLog('Erro: grupos de renderização não estão inicializados', 'error');
        mostrarNotificacao('Erro ao inicializar: grupos de renderização não inicializados', 'error');
        return;
    }
    
    if (isLoading) {
        debugLog('Carregamento já em progresso...');
        return;
    }
    
    isLoading = true;
    debugLog('Carregando dados do pátio...');
    mostrarNotificacao('Carregando dados do pátio...', 'info');
    mostrarLoading(true);
    animarRefresh(true);

    try {
        const response = await fetch('/api/patio/status');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Verificar se os dados recebidos têm a estrutura esperada
        if (!data || !data.posicoes_disponiveis || !Array.isArray(data.posicoes_disponiveis)) {
            throw new Error('Dados recebidos não contêm posições disponíveis válidas');
        }
        
        patioData = data;
        
        renderizarPatio();
        atualizarEstatisticas();
        atualizarUltimaAtualizacao();

        mostrarNotificacao('Dados do pátio atualizados com sucesso!', 'success');
    } catch (error) {
        debugLog('Erro ao carregar dados: ' + error.message, 'error');
        mostrarNotificacao('Erro ao carregar dados do pátio', 'error');
        
        // Carregar dados de teste em caso de erro
        if (USAR_DADOS_TESTE) {
            debugLog('Usando dados de teste como fallback');
            carregarDadosTeste();
        }
    } finally {
        isLoading = false;
        mostrarLoading(false);
        animarRefresh(false);
        debugLog('Carregamento finalizado');
    }

    // ===== DADOS DE TESTE =====
    function carregarDadosTeste() {
        debugLog('Carregando dados de teste...');
        
        patioData = {
            posicoes_disponiveis: [
                { posicao: 'A01-1', baia: 'A', posicao_numero: 1, altura: 1, ocupada: true },
                { posicao: 'A02-1', baia: 'A', posicao_numero: 2, altura: 1, ocupada: true },
                { posicao: 'A03-1', baia: 'A', posicao_numero: 3, altura: 1, ocupada: true },
                { posicao: 'A04-1', baia: 'A', posicao_numero: 4, altura: 1, ocupada: false },
                { posicao: 'A05-1', baia: 'A', posicao_numero: 5, altura: 1, ocupada: false },
                { posicao: 'B01-1', baia: 'B', posicao_numero: 1, altura: 1, ocupada: false },
                { posicao: 'B02-1', baia: 'B', posicao_numero: 2, altura: 1, ocupada: true },
                { posicao: 'B03-1', baia: 'B', posicao_numero: 3, altura: 1, ocupada: false },
                { posicao: 'C01-1', baia: 'C', posicao_numero: 1, altura: 1, ocupada: true },
                { posicao: 'C02-1', baia: 'C', posicao_numero: 2, altura: 1, ocupada: false },
                { posicao: 'D01-1', baia: 'D', posicao_numero: 1, altura: 1, ocupada: false },
                { posicao: 'D02-1', baia: 'D', posicao_numero: 2, altura: 1, ocupada: true },
                { posicao: 'E01-1', baia: 'E', posicao_numero: 1, altura: 1, ocupada: false },
                { posicao: 'E02-1', baia: 'E', posicao_numero: 2, altura: 1, ocupada: false }
            ],
            containers_ocupados: [
                { numero: 'TEST001', posicao: 'A01-1', status: 'no patio' },
                { numero: 'TEST002', posicao: 'A02-1', status: 'no patio' },
                { numero: 'TEST003', posicao: 'A03-1', status: 'vistoriado' },
                { numero: 'TEST004', posicao: 'B02-1', status: 'no patio' },
                { numero: 'TEST005', posicao: 'C01-1', status: 'vistoriado' },
                { numero: 'TEST006', posicao: 'D02-1', status: 'no patio' }
            ],
            estatisticas: {
                total_posicoes: 14,
                posicoes_ocupadas: 6,
                posicoes_livres: 8,
                taxa_ocupacao: 43,
                por_baia: {
                    'A': { total: 5, ocupadas: 3, taxa_ocupacao: 60 },
                    'B': { total: 3, ocupadas: 1, taxa_ocupacao: 33 },
                    'C': { total: 2, ocupadas: 1, taxa_ocupacao: 50 },
                    'D': { total: 2, ocupadas: 1, taxa_ocupacao: 50 },
                    'E': { total: 2, ocupadas: 0, taxa_ocupacao: 0 }
                },
                por_altura: {
                    '1': { total: 14, ocupadas: 6, taxa_ocupacao: 43 }
                }
            }
        };
        
        renderizarPatio();
        atualizarEstatisticas();
        atualizarUltimaAtualizacao();

        mostrarNotificacao('Dados do pátio atualizados com sucesso!', 'success');
    }
    
    // ===== RENDERIZAÇÃO =====
    function renderizarPatio() {
        // Verificar se patioData e THREE_REF estão definidos
        if (!patioData || !THREE_REF) {
            debugLog('Erro: patioData ou THREE_REF não definidos', 'error');
            return;
        }
    
        // Verificar se os grupos estão inicializados corretamente
        if (!containerGroup) {
            debugLog('Erro ao inicializar: containerGroup não está definido', 'error');
            return;
        }
        
        if (!labelGroup) {
            debugLog('Erro ao inicializar: labelGroup não está definido', 'error');
            return;
        }
        
        // Verificar se os grupos têm a propriedade children
        if (!containerGroup.children) {
            debugLog('Erro ao inicializar: containerGroup.children não está definido', 'error');
            return;
        }
        
        if (!labelGroup.children) {
            debugLog('Erro ao inicializar: labelGroup.children não está definido', 'error');
            return;
        }
    
        // Limpar containers existentes com verificação de segurança
        try {
            while (containerGroup.children && containerGroup.children.length > 0) {
                containerGroup.remove(containerGroup.children[0]);
            }
            
            while (labelGroup.children && labelGroup.children.length > 0) {
                labelGroup.remove(labelGroup.children[0]);
            }
        } catch (error) {
            debugLog('Erro ao limpar grupos: ' + error.message, 'error');
        }
    
        debugLog('Renderizando pátio 3D...');
    
        // Verificar se posicoes_disponiveis existe e é um array
        if (!patioData.posicoes_disponiveis || !Array.isArray(patioData.posicoes_disponiveis)) {
            debugLog('Erro ao inicializar: posicoes_disponiveis não é um array válido', 'error');
            patioData.posicoes_disponiveis = [];
            return;
        }
        
        // Renderizar posições com tratamento de erro
        try {
            patioData.posicoes_disponiveis.forEach(posicao => {
                if (posicao) {
                    criarPosicao3D(posicao);
                }
            });
            
            debugLog(`Renderizados ${patioData.posicoes_disponiveis.length} posições`);
        } catch (error) {
            debugLog('Erro ao renderizar posições: ' + error.message, 'error');
        }
    }
    
    function criarPosicao3D(posicaoData) {
        if (!posicaoData) {
            debugLog('Dados de posição indefinidos', 'error');
            return;
        }
        
        try {
            const { posicao, baia, posicao_numero, altura, ocupada } = posicaoData;
            
            if (!baia || !posicao_numero || !altura) {
                debugLog('Dados incompletos para posição: ' + JSON.stringify(posicaoData), 'error');
                return;
            }
    
            // Nova interpretação semântica: baia é row (letra), posicao_numero é baia (número)
            const coords = calcularCoordenadas3D(baia, posicao_numero, altura);
            if (!coords) {
                debugLog('Não foi possível calcular coordenadas para: ' + JSON.stringify(posicaoData), 'error');
                return;
            }
            
            const geometry = new THREE_REF.BoxGeometry(
                PATIO_CONFIG.TAMANHO_CONTAINER,
                PATIO_CONFIG.ALTURA_CONTAINER,
                PATIO_CONFIG.TAMANHO_CONTAINER
            );

            let material;
            let containerObj = null;
            
            if (ocupada && patioData && patioData.containers_ocupados) {
                containerObj = patioData.containers_ocupados.find(c => 
                    c.numero.toLowerCase().includes(posicao.toLowerCase())
                );

                const cor = containerObj && containerObj.status === 'vistoriado' ? CORES.VISTORIADA : CORES.OCUPADA;
                
                material = new THREE_REF.MeshLambertMaterial({ 
                    color: cor,
                    transparent: false
                });
            } else {
                material = new THREE_REF.MeshLambertMaterial({ 
                    color: CORES.VAZIA,
                    transparent: true,
                    opacity: 0.3,
                    wireframe: true
                });
            }

            const mesh = new THREE_REF.Mesh(geometry, material);
            mesh.position.set(coords.x, coords.y, coords.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (ocupada) {
                mesh.userData = { 
                    posicao,
                    baia,
                    posicao_numero: parseInt(posicao_numero),
                    altura: parseInt(altura),
                    ocupada,
                    container: containerObj
                };
            } else {
                mesh.userData = { 
                    posicao,
                    baia,
                    posicao_numero: parseInt(posicao_numero),
                    altura: parseInt(altura),
                    ocupada
                };
            }

            containerGroup.add(mesh);
            
            if (ocupada && containerObj) {
                criarLabelContainer(containerObj, coords);
            }
            
            debugLog(`Posição ${posicao} renderizada na coordenada: (${coords.x}, ${coords.y}, ${coords.z})`);
        } catch (error) {
            debugLog('Erro ao criar posição 3D: ' + error.message, 'error');
        }
    }

    function criarLabelContainer(container, coords) {
        try {
            if (!container || !container.numero || !THREE_REF) {
                debugLog('Dados insuficientes para criar etiqueta de container', 'error');
                return;
            }
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = 256;
            canvas.height = 128;
            
            context.fillStyle = 'rgba(0,0,0,0.7)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.strokeStyle = '#FFFFFF';
            context.lineWidth = 2;
            context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            context.font = 'bold 24px Arial';
            context.fillStyle = '#FFFFFF';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            context.fillText(container.numero, canvas.width / 2, 32);
            
            if (container.status) {
                context.font = '20px Arial';
                context.fillText(container.status.toUpperCase(), canvas.width / 2, 70);
            }
            
            if (container.peso) {
                context.font = '18px Arial';
                context.fillText(`${container.peso} kg`, canvas.width / 2, 100);
            }
            
            const texture = new THREE_REF.CanvasTexture(canvas);
            const spriteMaterial = new THREE_REF.SpriteMaterial({ 
                map: texture,
                transparent: true
            });
            
            const sprite = new THREE_REF.Sprite(spriteMaterial);
            sprite.position.set(coords.x, coords.y + 2.5, coords.z);
            sprite.scale.set(5, 2.5, 1);
            
            labelGroup.add(sprite);
            
            debugLog(`Label criado para container ${container.numero}`);
        } catch (error) {
            debugLog('Erro ao criar label do container: ' + error.message, 'error');
        }
    }

    // ===== FUNÇÕES UTILITÁRIAS =====
    function calcularCoordenadas3D(row, baia, altura) {
        // Nova interpretação semântica: row = letra (A-E), baia = número (01-20)
        const rowIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(row);
        if (rowIndex === -1) {
            debugLog('Row inválida: ' + row, 'error');
            return { x: 0, y: 0, z: 0 };
        }
        
        // Inverter eixos: Row (letra) agora no eixo Z, Baia (número) no eixo X
        const x = (parseInt(baia) - 10) * PATIO_CONFIG.ESPACAMENTO_BAIA;  // Baia (número) no eixo X
        const z = (rowIndex - 2) * PATIO_CONFIG.ESPACAMENTO_ROW;          // Row (letra) no eixo Z
        const y = (parseInt(altura) - 1) * PATIO_CONFIG.ALTURA_CONTAINER + PATIO_CONFIG.ALTURA_CONTAINER / 2;
        
        debugLog(`Coordenadas calculadas para ${row}${String(baia).padStart(2, '0')}-${altura}: (${x}, ${y}, ${z})`);
        return { x, y, z };
    }

    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            return new Date(dataString).toLocaleString('pt-BR');
        } catch {
            return dataString;
        }
    }

    // ===== CONTROLES E FILTROS =====
    function aplicarFiltros() {
        const filtroRow = document.getElementById('filtro-baia')?.value;  // Agora filtra por Row (letra)
        const filtroAltura = document.getElementById('filtro-altura')?.value;
        const mostrarOcupadas = document.getElementById('mostrar-ocupadas')?.checked ?? true;
        const mostrarVazias = document.getElementById('mostrar-vazias')?.checked ?? true;
        const mostrarLabels = document.getElementById('mostrar-labels')?.checked ?? true;

        // Verificar se containerGroup existe e tem children
        if (!containerGroup) {
            debugLog('Erro ao aplicar filtros: containerGroup não está definido', 'error');
            return;
        }

        if (!containerGroup.children) {
            debugLog('Erro ao aplicar filtros: containerGroup.children não está definido', 'error');
            return;
        }

        try {
            containerGroup.children.forEach(mesh => {
                if (!mesh || !mesh.userData) return;
                
                const data = mesh.userData;
                let visivel = true;

                // Nova interpretação semântica: data.baia agora representa Row (letra A-E)
                if (filtroRow && data.baia !== filtroRow) visivel = false;
                if (filtroAltura && data.altura !== parseInt(filtroAltura)) visivel = false;
                if (data.ocupada && !mostrarOcupadas) visivel = false;
                if (!data.ocupada && !mostrarVazias) visivel = false;

                mesh.visible = visivel;
            });
        } catch (error) {
            debugLog('Erro ao aplicar filtros aos containers: ' + error.message, 'error');
        }

        // Verificar se labelGroup existe antes de acessá-lo
        if (labelGroup) {
            labelGroup.visible = mostrarLabels;
        } else {
            debugLog('Erro ao aplicar filtros: labelGroup não está definido', 'error');
        }
        
        debugLog('Filtros aplicados');
    }

    function buscarContainer() {
        const numero = document.getElementById('busca-container')?.value?.trim();
        
        if (!numero) {
            mostrarNotificacao('Digite o número do container', 'warning');
            return;
        }

        if (!patioData) {
            mostrarNotificacao('Dados não carregados', 'error');
            return;
        }
        
        // Verificar se containers_ocupados existe e é um array
        if (!patioData.containers_ocupados || !Array.isArray(patioData.containers_ocupados)) {
            mostrarNotificacao('Lista de containers não disponível', 'error');
            debugLog('Erro: patioData.containers_ocupados não é um array válido', 'error');
            return;
        }

        try {
            const container = patioData.containers_ocupados.find(c => 
                c && c.numero && c.numero.toLowerCase().includes(numero.toLowerCase())
            );

            if (container) {
                // Verificar se containerGroup existe e tem children
                if (!containerGroup || !containerGroup.children) {
                    mostrarNotificacao('Erro ao localizar container na visualização', 'error');
                    return;
                }
                
                const mesh = containerGroup.children.find(m => 
                    m && m.userData && m.userData.container && m.userData.container.numero === container.numero
                );

                if (mesh) {
                    const pos = mesh.position;
                    if (camera) {
                        camera.position.set(pos.x + 10, pos.y + 10, pos.z + 10);
                        camera.lookAt(pos);
                        if (controls) controls.update();
                    }

                    selecionarContainer(mesh.userData);
                    mostrarNotificacao(`Container ${container.numero} encontrado!`, 'success');
                } else {
                    mostrarNotificacao(`Container ${container.numero} encontrado nos dados, mas não na visualização`, 'warning');
                }
            } else {
                mostrarNotificacao('Container não encontrado', 'warning');
            }
        } catch (error) {
            debugLog('Erro ao buscar container: ' + error.message, 'error');
            mostrarNotificacao('Erro ao buscar container', 'error');
        }
    }

    function selecionarContainer(containerData) {
        if (!containerData) {
            debugLog('Dados do container indefinidos na seleção', 'error');
            return;
        }
        
        try {
            // Deselecionar anterior
            if (selectedContainer) {
                // Verificar se containerGroup existe e tem children
                if (containerGroup && containerGroup.children && Array.isArray(containerGroup.children)) {
                    const meshAnterior = containerGroup.children.find(m => 
                        m && m.userData && m.userData.container && 
                        m.userData.container.numero === selectedContainer.container?.numero
                    );
                    
                    if (meshAnterior && meshAnterior.userData && meshAnterior.userData.ocupada && meshAnterior.material) {
                        const cor = meshAnterior.userData.container?.status === 'vistoriado' ? CORES.VISTORIADA : CORES.OCUPADA;
                        meshAnterior.material.color.setHex(cor);
                    }
                }
            }

            // Selecionar novo
            selectedContainer = containerData;
            
            if (containerData.container && containerData.container.numero) {
                // Verificar se containerGroup existe e tem children antes de buscar
                if (containerGroup && containerGroup.children && Array.isArray(containerGroup.children)) {
                    // Destacar visualmente
                    const mesh = containerGroup.children.find(m => 
                        m && m.userData && m.userData.container && 
                        m.userData.container.numero === containerData.container.numero
                    );
                    
                    if (mesh && mesh.material && mesh.material.color) {
                        mesh.material.color.setHex(CORES.SELECIONADA);
                    }
                } else {
                    debugLog('containerGroup não está disponível para seleção', 'error');
                }

                // Mostrar detalhes
                mostrarDetalhesContainer(containerData.container.numero);
            } else {
                debugLog('Container sem número na seleção', 'warn');
            }

            debugLog('Container selecionado: ' + JSON.stringify(containerData));
        } catch (error) {
            debugLog('Erro ao selecionar container: ' + error.message, 'error');
        }
    }

    // ===== DETALHES DO CONTAINER =====
    async function mostrarDetalhesContainer(numero) {
        try {
            const response = await fetch(`/api/container/${numero}/detalhes`);
            if (!response.ok) throw new Error('Container não encontrado');

            const detalhes = await response.json();
            renderizarDetalhesModal(detalhes);

            if (typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(document.getElementById('containerModal'));
                modal.show();
            }

        } catch (error) {
            debugLog('Erro ao carregar detalhes: ' + error.message, 'error');
            mostrarNotificacao('Erro ao carregar detalhes do container', 'error');
        }
    }

    function renderizarDetalhesModal(detalhes) {
        const container = detalhes.container;
        const historico = detalhes.historico_operacoes;

        const html = `
            <div class="container-info">
                <h6>Informações do Container</h6>
                <div class="info-row">
                    <span class="info-label">Número:</span>
                    <span class="info-value">${container.numero}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${container.status}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Posição Atual:</span>
                    <span class="info-value">${container.posicao_atual || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ISO Container:</span>
                    <span class="info-value">${container.iso_container || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Capacidade:</span>
                    <span class="info-value">${container.capacidade || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tara:</span>
                    <span class="info-value">${container.tara || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Armador:</span>
                    <span class="info-value">${container.armador || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Última Atualização:</span>
                    <span class="info-value">${formatarData(container.ultima_atualizacao)}</span>
                </div>
            </div>

            <div class="container-info">
                <h6>Histórico de Operações</h6>
                ${historico && Array.isArray(historico) && historico.length > 0 ? historico.map(op => `
                    <div class="historico-operacao">
                        <div class="operacao-header">
                            <span class="operacao-tipo">${op.tipo}</span>
                            <span class="operacao-data">${formatarData(op.data_operacao)}</span>
                        </div>
                        <div class="operacao-detalhes">
                            <strong>Posição:</strong> ${op.posicao}<br>
                            ${op.modo ? `<strong>Modo:</strong> ${op.modo}<br>` : ''}
                            ${op.placa ? `<strong>Placa:</strong> ${op.placa}<br>` : ''}
                            ${op.vagao ? `<strong>Vagão:</strong> ${op.vagao}<br>` : ''}
                            <strong>Operador:</strong> ${op.operador_nome}
                            ${op.observacoes ? `<br><strong>Observações:</strong> ${op.observacoes}` : ''}
                        </div>
                    </div>
                `).join('') : '<p class="text-muted">Nenhuma operação registrada.</p>'}
            </div>
        `;

        const containerDetails = document.getElementById('container-details');
        if (containerDetails) {
            containerDetails.innerHTML = html;
        }
    }

    // ===== CONTROLES DE CÂMERA =====
    function resetarCamera() {
        if (!camera || !controls) return;
        camera.position.set(50, 50, 50);
        camera.lookAt(0, 0, 0);
        controls.reset();
        debugLog('Câmera resetada');
    }

    function vistaTopo() {
        if (!camera || !controls) return;
        camera.position.set(0, 100, 0);
        camera.lookAt(0, 0, 0);
        controls.update();
        debugLog('Vista de topo');
    }

    function vistaLateral() {
        if (!camera || !controls) return;
        camera.position.set(100, 25, 0);
        camera.lookAt(0, 0, 0);
        controls.update();
        debugLog('Vista lateral');
    }

    // ===== EVENTOS =====
    function onWindowResize() {
        if (!camera || !renderer) {
            debugLog('Camera ou renderer não disponíveis para redimensionar', 'error');
            return;
        }
        
        debugLog('Adaptando visualização para nova dimensão/orientação...');
        
        const container = document.getElementById('three-container');
        if (!container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const isPortrait = window.innerHeight > window.innerWidth;
        debugLog(`Orientação detectada: ${isPortrait ? 'Retrato' : 'Paisagem'}`);
        
        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();
        
        renderer.setSize(containerWidth, containerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        if (isPortrait) {
            if (!camera.position.isPortraitMode) {
                camera.position.z *= 1.4;
                camera.position.isPortraitMode = true;
                camera.position.isLandscapeMode = false;
            }
        } else {
            if (!camera.position.isLandscapeMode) {
                camera.position.z /= 1.4;
                camera.position.isPortraitMode = false;
                camera.position.isLandscapeMode = true;
            }
        }
        
        if (scene) renderer.render(scene, camera);
        
        debugLog(`Visualização redimensionada para ${containerWidth}x${containerHeight}px`);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        try {
            // Verificações robustas para componentes Three.js
            if (!camera || !scene || !renderer) {
                debugLog('Componentes de Three.js não inicializados na animação', 'error');
                return;
            }
            
            // Verificar controls antes de usar
            if (controls && typeof controls.update === 'function') {
                controls.update();
            }
            
            // Verificações robustas para labelGroup e seus filhos
            if (labelGroup && labelGroup.children && Array.isArray(labelGroup.children) && labelGroup.children.length > 0) {
                try {
                    labelGroup.children.forEach(sprite => {
                        if (sprite && sprite.isSprite && typeof sprite.lookAt === 'function' && camera && camera.position) {
                            sprite.lookAt(camera.position);
                        }
                    });
                } catch (spriteError) {
                    debugLog('Erro ao atualizar sprites: ' + spriteError.message, 'error');
                }
            }
            
            // Verificar se renderer.render é uma função antes de chamar
            if (typeof renderer.render === 'function') {
                renderer.render(scene, camera);
            } else {
                debugLog('renderer.render não é uma função', 'error');
            }
        } catch (error) {
            debugLog('Erro na animação: ' + error.message, 'error');
        }
    }

    // ===== ESTATÍSTICAS =====
    function atualizarEstatisticas() {
        if (!patioData) {
            debugLog('Erro ao atualizar estatísticas: patioData não definido', 'error');
            return;
        }

        // Verificar se estatisticas existe
        if (!patioData.estatisticas) {
            debugLog('Erro ao atualizar estatísticas: patioData.estatisticas não definido', 'error');
            return;
        }

        const stats = patioData.estatisticas;

        const elementos = {
            'total-posicoes': stats.total_posicoes || 0,
            'posicoes-ocupadas': stats.posicoes_ocupadas || 0,
            'posicoes-livres': stats.posicoes_livres || 0,
            'taxa-ocupacao': `${stats.taxa_ocupacao || 0}%`
        };

        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        });

        // Estatísticas detalhadas
        const detalhesContainer = document.getElementById('estatisticas-detalhadas');
        
        if (detalhesContainer && stats && stats.por_baia && stats.por_altura) {
            // Nova interpretação semântica: "baia" agora representa Row (A-E)
            let htmlDetalhes = '<h6 class="mb-3">Por Row</h6>';
            Object.entries(stats.por_baia).forEach(([row, dados]) => {
                htmlDetalhes += `
                    <div class="stat-item">
                        <div class="stat-value" style="font-size: 1.2rem;">${dados.ocupadas}/${dados.total}</div>
                        <div class="stat-label">Row ${row} (${dados.taxa_ocupacao.toFixed(1)}%)</div>
                    </div>
                `;
            });

            htmlDetalhes += '<h6 class="mb-3 mt-4">Por Altura</h6>';
            Object.entries(stats.por_altura).forEach(([altura, dados]) => {
                htmlDetalhes += `
                    <div class="stat-item">
                        <div class="stat-value" style="font-size: 1.2rem;">${dados.ocupadas}/${dados.total}</div>
                        <div class="stat-label">Nível ${altura} (${dados.taxa_ocupacao.toFixed(1)}%)</div>
                    </div>
                `;
            });

            detalhesContainer.innerHTML = htmlDetalhes;
        }
    }

    function atualizarUltimaAtualizacao() {
        const elemento = document.getElementById('ultima-atualizacao');
        if (elemento) {
            elemento.textContent = `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
        }
    }

    // ===== FUNÇÕES DE TESTE =====
    function testeBasicoThreeJS() {
        debugLog('TESTE BÁSICO THREE.JS');
        
        try {
            if (!THREE_REF) {
                debugLog('THREE.js não está disponível globalmente!', 'error');
                atualizarStatusUI('Erro: THREE.js não carregado');
                return false;
            }
            
            debugLog('THREE.js disponível globalmente, versão: ' + THREE_REF.REVISION);
            
            const container = document.getElementById('three-container');
            if (!container) {
                debugLog('Container three-container não encontrado!', 'error');
                atualizarStatusUI('Erro: Container não encontrado');
                return false;
            }
            
            debugLog('Container encontrado: ' + container.offsetWidth + 'x' + container.offsetHeight);
            atualizarStatusUI('Verificando suporte a WebGL...');
            
            // Verificar suporte a WebGL
            let webglAvailable = false;
            
            if (window.WEBGL && typeof window.WEBGL.isWebGLAvailable === 'function') {
                debugLog('Usando detector WebGL do namespace window');
                webglAvailable = window.WEBGL.isWebGLAvailable();
            } else if (THREE_REF.WEBGL && typeof THREE_REF.WEBGL.isWebGLAvailable === 'function') {
                debugLog('Usando detector WebGL do namespace THREE');
                webglAvailable = THREE_REF.WEBGL.isWebGLAvailable();
            } else {
                debugLog('Nenhum detector WebGL encontrado, usando detector básico');
                try {
                    const canvas = document.createElement('canvas');
                    webglAvailable = !!(window.WebGLRenderingContext && 
                        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                } catch (e) {
                    webglAvailable = false;
                }
            }
            
            if (!webglAvailable) {
                debugLog('WebGL não suportado neste navegador!', 'error');
                atualizarStatusUI('Erro: WebGL não suportado');
                
                const errorMessage = document.createElement('div');
                errorMessage.innerHTML = 'Seu navegador não suporta WebGL, necessário para a visualização 3D.';
                errorMessage.style.color = 'red';
                errorMessage.style.textAlign = 'center';
                errorMessage.style.padding = '20px';
                
                container.innerHTML = '';
                container.appendChild(errorMessage);
                return false;
            }
            
            debugLog('WebGL suportado');
            atualizarStatusUI('Iniciando teste de renderização...');
            
            // Criar um cubo simples para teste
            const testScene = new THREE_REF.Scene();
            const testCamera = new THREE_REF.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
            
            const testRenderer = new THREE_REF.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            
            atualizarStatusUI('Teste básico bem-sucedido!');
            
            function animateTest() {
                requestAnimationFrame(animateTest);
                cube.rotation.x += 0.01;
                cube.rotation.y += 0.01;
                testRenderer.render(testScene, testCamera);
            }
            
            animateTest();
            return true;
            
        } catch (error) {
            debugLog('Erro no teste básico: ' + error.message, 'error');
            atualizarStatusUI('Erro: ' + error.message);
            return false;
        }
    }

    async function testarAPI() {
        debugLog('TESTE RÁPIDO DA API');
        try {
            const response = await fetch('/api/patio/status');
            const data = await response.json();
            debugLog('Teste API - Response: ' + JSON.stringify(data));
            debugLog('Containers: ' + (data.containers_ocupados?.length || 0));
            debugLog('Posições: ' + (data.posicoes_disponiveis?.length || 0));
            return data;
        } catch (error) {
            debugLog('Erro no teste: ' + error.message, 'error');
            return null;
        }
    }

    // ===== API PÚBLICA =====
    return {
        init: init,
        carregarDadosPatio: carregarDadosPatio,
        selecionarContainer: selecionarContainer,
        resetarCamera: resetarCamera,
        vistaTopo: vistaTopo,
        vistaLateral: vistaLateral,
        onWindowResize: onWindowResize,
        testeBasicoThreeJS: testeBasicoThreeJS,
        testarAPI: testarAPI,
        
        // Para debug
        getScene: () => scene,
        getCamera: () => camera,
        getRenderer: () => renderer,
        getPatioData: () => patioData,
        debugLog: debugLog,
        verificarThreeJS: verificarThreeJSDisponivel
    };

})();

// ===== FUNÇÕES GLOBAIS DE COMPATIBILIDADE =====
window.debugPatio = function() {
    console.log('🔍 Debug Pátio:', {
        patioData: window.PatioVisualizacao.getPatioData(),
        camera: window.PatioVisualizacao.getCamera()?.position,
        scene: window.PatioVisualizacao.getScene(),
        threeJS: window.PatioVisualizacao.verificarThreeJS()
    });
};

window.testarVisualizacao = window.PatioVisualizacao.testarAPI;
window.testeBasicoThreeJS = window.PatioVisualizacao.testeBasicoThreeJS;
window.inicializarVisualizacao = window.PatioVisualizacao.init;
console.log('✅ Módulo PatioVisualizacao carregado e pronto para uso');