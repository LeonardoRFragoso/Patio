#!/usr/bin/env python3
import requests
import json

def test_api():
    # Simular sessão de admin_administrativo
    session_data = {
        'username': 'admin_adm',
        'nivel': 'admin_administrativo',
        'unidade': 'Rio de Janeiro',
        'user_id': 1
    }
    
    # Fazer login primeiro
    login_data = {
        'username': 'admin_adm',
        'password': 'Admin@123',
        'role': 'admin'
    }
    
    session = requests.Session()
    
    try:
        # Fazer login
        print("=== FAZENDO LOGIN ===")
        login_response = session.post('http://127.0.0.1:8505/auth/login', data=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            print("Login realizado com sucesso!")
        else:
            print(f"Erro no login: {login_response.text}")
            return
        
        # Testar API de descargas
        print("\n=== TESTANDO API DE DESCARGAS ===")
        api_response = session.get('http://127.0.0.1:8505/operacoes/descargas/corrigir')
        print(f"API Status: {api_response.status_code}")
        print(f"Content-Type: {api_response.headers.get('content-type')}")
        
        if api_response.status_code == 200:
            try:
                data = api_response.json()
                print(f"Resposta JSON: {json.dumps(data, indent=2)}")
                
                containers = data.get('containers', [])
                print(f"\nTotal de containers retornados: {len(containers)}")
                
                for i, container in enumerate(containers):
                    print(f"Container {i+1}: {container.get('container_numero')} - Unidade: {container.get('unidade')}")
                    
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar JSON: {e}")
                print(f"Resposta raw: {api_response.text}")
        else:
            print(f"Erro na API: {api_response.text}")
            
    except Exception as e:
        print(f"Erro geral: {e}")

if __name__ == '__main__':
    test_api()
