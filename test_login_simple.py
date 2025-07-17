#!/usr/bin/env python3
"""
Script simples para testar login
"""

import requests
from bs4 import BeautifulSoup

def test_login():
    """Testa login com diferentes usuários"""
    
    session = requests.Session()
    
    # Usuários para testar
    users_to_test = [
        ('teste_operador', 'Teste@123'),
        ('operador1', 'Operador@123'),
        ('admin', 'admin123')
    ]
    
    for username, password in users_to_test:
        print(f"\n=== TESTANDO: {username} ===")
        
        try:
            # Obter CSRF token
            login_page = session.get('http://127.0.0.1:8505/auth/login')
            soup = BeautifulSoup(login_page.text, 'html.parser')
            csrf_token = soup.find('input', {'name': 'csrf_token'})
            
            if not csrf_token:
                print("[ERRO] CSRF token não encontrado")
                continue
                
            csrf_value = csrf_token.get('value')
            
            # Tentar login
            login_data = {
                'username': username,
                'password': password,
                'csrf_token': csrf_value
            }
            
            login_response = session.post('http://127.0.0.1:8505/auth/login', data=login_data)
            
            print(f"Status: {login_response.status_code}")
            
            if login_response.status_code == 302:
                print("[SUCESSO] Login realizado com sucesso!")
                
                # Testar acesso ao dashboard
                dashboard_response = session.get('http://127.0.0.1:8505/auth/dashboard')
                if dashboard_response.status_code == 200:
                    print("[OK] Dashboard acessível")
                    
                    # Testar endpoint de containers vistoriados
                    containers_response = session.get('http://127.0.0.1:8505/operacoes/containers/vistoriados')
                    if containers_response.status_code == 200:
                        containers_data = containers_response.json()
                        print(f"[OK] Containers endpoint: {len(containers_data.get('data', []))} containers")
                        return True
                    else:
                        print(f"[ERRO] Containers endpoint: {containers_response.status_code}")
                else:
                    print(f"[ERRO] Dashboard: {dashboard_response.status_code}")
            else:
                print("[ERRO] Login falhou")
                # Mostrar parte da resposta para debug
                if 'senha incorreta' in login_response.text.lower() or 'invalid' in login_response.text.lower():
                    print("   Motivo: Credenciais inválidas")
                elif 'csrf' in login_response.text.lower():
                    print("   Motivo: Problema com CSRF token")
                else:
                    print(f"   Response snippet: {login_response.text[:200]}")
                    
        except Exception as e:
            print(f"[ERRO] Exceção: {e}")
    
    return False

if __name__ == "__main__":
    success = test_login()
    if success:
        print("\n[FINAL] Login funcionando! Agora teste a descarga no browser:")
        print("1. Acesse: http://127.0.0.1:8505/auth/login")
        print("2. Use as credenciais que funcionaram acima")
        print("3. Clique em 'Descarga' no dashboard")
    else:
        print("\n[FINAL] Nenhum login funcionou. Verificar configuração do sistema.")
