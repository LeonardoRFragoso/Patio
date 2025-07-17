/**
 * Debug script para identificar problemas na movimentação de containers
 * Este script deve ser incluído após fix_movimentacao.js
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Adicionando debug para movimentação de containers...');
    
    // Sobrescreve a função fetch para endpoints específicos
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // Se for um request para o endpoint de registrar operação
        if (url.includes('/operacoes/registrar_operacao')) {
            console.log('🔄 Interceptando chamada para registrar_operacao');
            
            // Log do corpo da requisição
            if (options && options.body) {
                try {
                    const body = JSON.parse(options.body);
                    console.log('📦 Dados enviados:', body);
                    
                    // Verificar campos obrigatórios para movimentação
                    if (body.tipo === 'movimentacao') {
                        console.log('🔎 Verificando campos para movimentação:');
                        console.log('  • container_id:', body.container_id ? '✅' : '❌');
                        console.log('  • posicao:', body.posicao ? '✅' : '❌');
                        console.log('  • posicao_original:', body.posicao_original ? '✅' : '❌');
                        console.log('  • tipo:', body.tipo === 'movimentacao' ? '✅' : '❌');
                    }
                } catch (e) {
                    console.error('❌ Erro ao analisar corpo da requisição:', e);
                }
            }
            
            // Adicionar um interceptor para a resposta
            return originalFetch(url, options).then(response => {
                // Clonar a resposta para poder lê-la
                const responseClone = response.clone();
                
                // Log do status da resposta
                console.log(`📡 Resposta ${response.status} ${response.statusText}`);
                
                // Tentar ler o corpo da resposta se for um erro
                if (!response.ok) {
                    responseClone.json().then(data => {
                        console.error('❌ Erro retornado:', data);
                    }).catch(e => {
                        console.error('❌ Não foi possível ler o corpo da resposta:', e);
                    });
                }
                
                return response;
            });
        }
        
        // Para outras URLs, mantém o comportamento original
        return originalFetch(url, options);
    };
    
    console.log('✅ Debug para movimentação instalado com sucesso!');
});
