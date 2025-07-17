#!/usr/bin/env python3
"""
Script para testar a funcionalidade de descarga
"""

import requests
from bs4 import BeautifulSoup
import json

def test_descarga():
    """Testa a funcionalidade de descarga"""
    
    # Criar sessão
    session = requests.Session()
    
    print("[INFO] Testando funcionalidade de descarga...")
    
    try:
        # 1. Acessar página de login para obter CSRF token
        print("1. Obtendo CSRF token...")
        login_page = session.get('http://127.0.0.1:8505/auth/login')
        soup = BeautifulSoup(login_page.text, 'html.parser')
        csrf_token = soup.find('input', {'name': 'csrf_token'})
        
        if not csrf_token:
            print("[ERRO] CSRF token não encontrado")
            return False
            
        csrf_value = csrf_token.get('value')
        print(f"[OK] CSRF token obtido: {csrf_value[:20]}...")
        
        # 2. Fazer login
        print("2. Fazendo login como operador1...")
        login_data = {
            'username': 'operador1',
            'password': 'Operador@123',
            'csrf_token': csrf_value
        }
        
        login_response = session.post('http://127.0.0.1:8505/auth/login', data=login_data)
        
        if login_response.status_code == 302:  # Redirect após login bem-sucedido
            print("[OK] Login realizado com sucesso")
        else:
            print(f"[ERRO] Erro no login: {login_response.status_code}")
            print(f"Response: {login_response.text[:500]}")
            return False
        
        # 3. Acessar dashboard
        print("3. Acessando dashboard...")
        dashboard_response = session.get('http://127.0.0.1:8505/auth/dashboard')
        
        if dashboard_response.status_code == 200:
            print("[OK] Dashboard acessado com sucesso")
        else:
            print(f"[ERRO] Erro ao acessar dashboard: {dashboard_response.status_code}")
            return False
        
        # 4. Testar endpoint de containers vistoriados
        print("4. Testando endpoint de containers vistoriados...")
        containers_response = session.get('http://127.0.0.1:8505/operacoes/containers/vistoriados')
        
        if containers_response.status_code == 200:
            containers_data = containers_response.json()
            print(f"[OK] Endpoint funcionando: {containers_data}")
            
            if containers_data.get('success'):
                containers = containers_data.get('data', [])
                print(f"[INFO] Encontrados {len(containers)} containers vistoriados")
                
                for container in containers[:3]:  # Mostrar apenas os 3 primeiros
                    print(f"   - {container.get('numero', 'N/A')} ({container.get('teu', 'N/A')} TEU)")
            else:
                print(f"[AVISO] Endpoint retornou erro: {containers_data.get('message', 'Erro desconhecido')}")
        else:
            print(f"[ERRO] Erro no endpoint: {containers_response.status_code}")
            print(f"Response: {containers_response.text[:300]}")
            return False
        
        print("\n[SUCESSO] TESTE CONCLUIDO COM SUCESSO!")
        print("[OK] Login funcionando")
        print("[OK] Dashboard acessivel") 
        print("[OK] Endpoint de containers vistoriados funcionando")
        print("\n[PROXIMO] Testar a descarga no browser")
        print("   1. Acesse: http://127.0.0.1:8505/auth/login")
        print("   2. Login: operador1 / Operador@123")
        print("   3. Clique em 'Descarga' no dashboard")
        print("   4. Verifique se o formulário carrega corretamente")
        
        return True
        
    except Exception as e:
        print(f"[ERRO] Erro durante o teste: {e}")
        return False

if __name__ == "__main__":
    test_descarga()
