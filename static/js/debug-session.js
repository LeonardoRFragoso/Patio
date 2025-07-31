// Script para debugar sessão do usuário em tempo real
console.log('🔍 DEBUGANDO SESSÃO DO USUÁRIO');

// Função para verificar sessão
async function verificarSessao() {
  try {
    console.log('=== VERIFICANDO SESSÃO ===');
    
    const response = await fetch('/auth/check-session');
    const data = await response.json();
    
    console.log('Status da resposta:', response.status);
    console.log('Dados da sessão:', data);
    
    if (data.valid) {
      console.log('✅ Sessão válida:');
      console.log('  Username:', data.username);
      console.log('  Role:', data.role);
      console.log('  Unidade:', data.unidade);
    } else {
      console.log('❌ Sessão inválida');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    return null;
  }
}

// Função para testar token CSRF
function verificarTokenCSRF() {
  console.log('\n=== VERIFICANDO TOKEN CSRF ===');
  
  const sources = [
    { name: 'meta[name="csrf-token"]', value: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') },
    { name: 'input[name="csrf_token"]', value: document.querySelector('input[name="csrf_token"]')?.value },
    { name: 'csrf-token-input', value: document.getElementById('csrf-token-input')?.value },
    { name: 'window.csrfToken', value: window.csrfToken }
  ];
  
  sources.forEach(source => {
    if (source.value) {
      console.log(`✅ ${source.name}: ${source.value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${source.name}: não encontrado`);
    }
  });
  
  return sources.find(s => s.value)?.value || null;
}

// Função para testar requisição de correção
async function testarRequisicaoCorrecao() {
  console.log('\n=== TESTANDO REQUISIÇÃO DE CORREÇÃO ===');
  
  const csrfToken = verificarTokenCSRF();
  if (!csrfToken) {
    console.error('❌ Token CSRF não encontrado - não é possível testar');
    return;
  }
  
  // Dados de teste
  const dadosTest = {
    nova_posicao: 'A01-1',
    observacoes: 'Teste de debug',
    csrf_token: csrfToken
  };
  
  try {
    console.log('Enviando requisição de teste para operação 75...');
    
    const response = await fetch('/operacoes/descargas/75/corrigir', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify(dadosTest)
    });
    
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', [...response.headers.entries()]);
    
    const responseText = await response.text();
    console.log('Corpo da resposta:', responseText);
    
    if (response.status === 403) {
      console.error('❌ ERRO 403: Acesso negado');
      console.log('Possíveis causas:');
      console.log('  1. Sessão expirada');
      console.log('  2. Permissões insuficientes');
      console.log('  3. Token CSRF inválido');
      console.log('  4. Validação adicional falhando');
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

// Executar verificações
async function executarDebug() {
  console.log('🚀 Iniciando debug da sessão...\n');
  
  // 1. Verificar sessão
  const sessao = await verificarSessao();
  
  // 2. Verificar token CSRF
  const token = verificarTokenCSRF();
  
  // 3. Testar requisição (apenas se sessão válida)
  if (sessao && sessao.valid) {
    await testarRequisicaoCorrecao();
  } else {
    console.log('❌ Não é possível testar requisição - sessão inválida');
  }
  
  console.log('\n🏁 Debug concluído');
}

// Executar automaticamente
executarDebug();
