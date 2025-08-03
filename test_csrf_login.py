import requests
import re
from bs4 import BeautifulSoup

def test_csrf_login():
    print('=== TESTE DE LOGIN COM TOKEN CSRF ===\n')
    
    server_url = "http://127.0.0.1:8505"
    session = requests.Session()
    
    # Passo 1: Obter página de login e extrair token CSRF
    print('🔍 PASSO 1: EXTRAIR TOKEN CSRF')
    
    try:
        login_page = session.get(f"{server_url}/auth/login")
        print(f'   Status da página: {login_page.status_code}')
        
        # Extrair token CSRF usando regex
        csrf_pattern = r'name="csrf_token"\s+value="([^"]+)"'
        csrf_match = re.search(csrf_pattern, login_page.text)
        
        if csrf_match:
            csrf_token = csrf_match.group(1)
            print(f'   ✅ Token CSRF extraído: {csrf_token[:20]}...')
        else:
            print('   ❌ Token CSRF não encontrado')
            return
            
    except Exception as e:
        print(f'   ❌ Erro ao obter página: {e}')
        return
    
    # Passo 2: Fazer login com token CSRF
    print(f'\n🔍 PASSO 2: LOGIN COM TOKEN CSRF')
    
    login_data = {
        'username': 'LeoFragoso',
        'password': 'Leo@2025',
        'role': 'user',
        'csrf_token': csrf_token
    }
    
    print(f'   Dados enviados:')
    for key, value in login_data.items():
        if key == 'csrf_token':
            print(f'     {key}: {value[:20]}...')
        else:
            print(f'     {key}: {value}')
    
    try:
        login_response = session.post(
            f"{server_url}/auth/login",
            data=login_data,
            allow_redirects=False
        )
        
        print(f'\n   Status da resposta: {login_response.status_code}')
        
        if login_response.status_code == 302:
            redirect_location = login_response.headers.get('Location', '')
            print(f'   ✅ REDIRECIONAMENTO: {redirect_location}')
            
            if 'dashboard' in redirect_location:
                print(f'   🎉 SUCESSO! Login funcionou e redirecionou para dashboard')
                
                # Seguir redirecionamento para confirmar
                dashboard_response = session.get(redirect_location)
                print(f'   Status do dashboard: {dashboard_response.status_code}')
                
                if dashboard_response.status_code == 200:
                    print(f'   ✅ Dashboard carregado com sucesso!')
                else:
                    print(f'   ⚠️ Problema ao carregar dashboard')
            else:
                print(f'   ⚠️ Redirecionado para local inesperado: {redirect_location}')
                
        elif login_response.status_code == 200:
            print(f'   ❌ Status 200 - Login falhou, página recarregada')
            
            # Verificar se há mensagens de erro
            if 'alert' in login_response.text.lower() or 'erro' in login_response.text.lower():
                print(f'   Possível mensagem de erro na página')
                
                # Extrair mensagens de flash
                flash_pattern = r'class="alert[^"]*"[^>]*>([^<]+)'
                flash_matches = re.findall(flash_pattern, login_response.text)
                
                for flash_msg in flash_matches:
                    print(f'     Mensagem: {flash_msg.strip()}')
            
        elif login_response.status_code == 400:
            print(f'   ❌ Status 400 - Bad Request (provavelmente CSRF ou validação)')
            
        else:
            print(f'   ❌ Status inesperado: {login_response.status_code}')
            
    except Exception as e:
        print(f'   ❌ Erro na requisição: {e}')
    
    # Passo 3: Verificar se sessão foi criada
    print(f'\n🔍 PASSO 3: VERIFICAR SESSÃO')
    
    try:
        # Tentar acessar uma página que requer login
        dashboard_direct = session.get(f"{server_url}/auth/dashboard", allow_redirects=False)
        
        if dashboard_direct.status_code == 200:
            print(f'   ✅ Sessão ativa - Dashboard acessível diretamente')
        elif dashboard_direct.status_code == 302:
            redirect_to = dashboard_direct.headers.get('Location', '')
            if 'login' in redirect_to:
                print(f'   ❌ Sessão não ativa - Redirecionado para login')
            else:
                print(f'   ⚠️ Redirecionado para: {redirect_to}')
        else:
            print(f'   ⚠️ Status inesperado ao acessar dashboard: {dashboard_direct.status_code}')
            
    except Exception as e:
        print(f'   ❌ Erro ao verificar sessão: {e}')

if __name__ == "__main__":
    test_csrf_login()
