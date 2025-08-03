import requests
import sqlite3
from werkzeug.security import check_password_hash

def test_login_comprehensive():
    print('=== TESTE ABRANGENTE DE LOGIN ===\n')
    
    # Verificar se o servidor está rodando
    server_url = "http://127.0.0.1:8505"
    
    try:
        response = requests.get(f"{server_url}/auth/login", timeout=5)
        print(f'✅ Servidor está rodando (status: {response.status_code})')
    except requests.exceptions.RequestException as e:
        print(f'❌ Servidor não está acessível: {e}')
        return
    
    # Dados para o teste
    login_data = {
        'username': 'LeoFragoso',
        'password': 'Leo@2025',
        'role': 'user'
    }
    
    print(f'\n📋 DADOS DO TESTE:')
    for key, value in login_data.items():
        if key == 'password':
            print(f'   {key}: {value}')
        else:
            print(f'   {key}: {value}')
    
    # Primeiro, obter o token CSRF
    print(f'\n🔍 PASSO 1: OBTER TOKEN CSRF')
    session = requests.Session()
    
    try:
        login_page = session.get(f"{server_url}/auth/login")
        print(f'   Página de login carregada: {login_page.status_code}')
        
        # Extrair token CSRF (simplificado)
        if 'csrf_token' in login_page.text:
            print(f'   Token CSRF encontrado na página ✅')
        else:
            print(f'   Token CSRF não encontrado ⚠️')
    
    except Exception as e:
        print(f'   Erro ao carregar página: {e}')
        return
    
    # Tentar fazer login
    print(f'\n🔍 PASSO 2: ENVIAR DADOS DE LOGIN')
    
    try:
        login_response = session.post(
            f"{server_url}/auth/login",
            data=login_data,
            allow_redirects=False  # Não seguir redirecionamentos automaticamente
        )
        
        print(f'   Status da resposta: {login_response.status_code}')
        print(f'   Headers de resposta:')
        for header, value in login_response.headers.items():
            if header.lower() in ['location', 'set-cookie', 'content-type']:
                print(f'     {header}: {value}')
        
        # Verificar se houve redirecionamento
        if login_response.status_code in [302, 301]:
            redirect_location = login_response.headers.get('Location', 'Não especificado')
            print(f'   ✅ Redirecionamento detectado para: {redirect_location}')
            
            # Seguir o redirecionamento
            if redirect_location:
                try:
                    final_response = session.get(redirect_location)
                    print(f'   Status da página final: {final_response.status_code}')
                    
                    if 'dashboard' in redirect_location.lower():
                        print(f'   ✅ SUCESSO: Redirecionado para dashboard!')
                    else:
                        print(f'   ⚠️ Redirecionado para: {redirect_location}')
                        
                except Exception as e:
                    print(f'   Erro ao seguir redirecionamento: {e}')
        
        elif login_response.status_code == 200:
            print(f'   ⚠️ Status 200 - Pode indicar erro de login (página recarregada)')
            
            # Verificar se há mensagens de erro na resposta
            response_text = login_response.text.lower()
            if 'erro' in response_text or 'inválid' in response_text or 'negado' in response_text:
                print(f'   ❌ Possível erro de login detectado na resposta')
            else:
                print(f'   ℹ️ Resposta não contém erros óbvios')
        
        else:
            print(f'   ❌ Status inesperado: {login_response.status_code}')
    
    except Exception as e:
        print(f'   ❌ Erro na requisição de login: {e}')
    
    # Verificar dados no banco após tentativa
    print(f'\n🔍 PASSO 3: VERIFICAR LOGS NO BANCO')
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar último login
        cursor.execute('SELECT last_login FROM usuarios WHERE username = ?', ('LeoFragoso',))
        last_login = cursor.fetchone()
        
        if last_login and last_login[0]:
            print(f'   ✅ last_login atualizado: {last_login[0]}')
        else:
            print(f'   ❌ last_login não foi atualizado (ainda None)')
        
        # Verificar logs de atividade
        cursor.execute('''
            SELECT data_hora, acao, descricao 
            FROM log_atividades 
            WHERE usuario = 'LeoFragoso' 
            ORDER BY data_hora DESC 
            LIMIT 3
        ''')
        logs = cursor.fetchall()
        
        print(f'   Últimos logs:')
        for log in logs:
            print(f'     {log[0]} - {log[1]}: {log[2]}')
        
        conn.close()
        
    except Exception as e:
        print(f'   Erro ao verificar banco: {e}')
    
    print(f'\n🎯 CONCLUSÃO:')
    print(f'   Se houve redirecionamento para dashboard = LOGIN FUNCIONOU ✅')
    print(f'   Se status 200 sem redirecionamento = PROBLEMA NO LOGIN ❌')
    print(f'   Se last_login foi atualizado = AUTENTICAÇÃO FUNCIONOU ✅')

if __name__ == "__main__":
    test_login_comprehensive()
