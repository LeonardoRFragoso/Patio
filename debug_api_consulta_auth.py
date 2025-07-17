#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de debug para testar a API de consulta de containers com autenticação
"""

import requests
import json
from datetime import datetime

def fazer_login(session, base_url):
    """Faz login no sistema"""
    
    print("🔐 Fazendo login...")
    
    # Primeiro, obter a página de login para pegar o CSRF token
    login_page = session.get(f"{base_url}/auth/login")
    
    if login_page.status_code != 200:
        print(f"❌ Erro ao acessar página de login: {login_page.status_code}")
        return False
    
    # Extrair CSRF token (simplificado - assumindo que está no HTML)
    # Em um caso real, você precisaria parsear o HTML para extrair o token
    
    # Dados de login (usando credenciais de teste)
    login_data = {
        'username': 'admin',  # ou outro usuário de teste
        'password': 'admin123'  # ou outra senha de teste
    }
    
    # Fazer login
    login_response = session.post(f"{base_url}/auth/login", data=login_data)
    
    if login_response.status_code == 200 and 'dashboard' in login_response.url:
        print("✅ Login realizado com sucesso")
        return True
    else:
        print(f"❌ Erro no login: {login_response.status_code}")
        print(f"   URL final: {login_response.url}")
        return False

def testar_api_consulta_com_auth():
    """Testa a API de consulta de containers com autenticação"""
    
    # URL da API
    base_url = "http://127.0.0.1:8505"
    
    # Containers para testar
    containers_teste = ["TESTE123", "TESTE1234544S", "TESTE"]
    
    print("=" * 60)
    print("🔍 TESTE DA API DE CONSULTA DE CONTAINERS (COM AUTH)")
    print("=" * 60)
    
    # Criar sessão para manter cookies
    session = requests.Session()
    
    # Fazer login
    if not fazer_login(session, base_url):
        print("❌ Não foi possível fazer login. Abortando teste.")
        return
    
    for container_numero in containers_teste:
        print(f"\n📦 Testando container: {container_numero}")
        print("-" * 40)
        
        try:
            # Fazer requisição para a API usando a sessão autenticada
            url = f"{base_url}/operacoes/buscar_container?numero={container_numero}"
            print(f"🌐 URL: {url}")
            
            response = session.get(url)
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                # Mostrar conteúdo bruto primeiro
                content = response.text
                print(f"📄 Conteúdo bruto da resposta: '{content[:100]}{'...' if len(content) > 100 else ''}'")
                
                # Verificar se é HTML (página de erro) ou JSON
                if content.strip().startswith('<!DOCTYPE') or content.strip().startswith('<html'):
                    print("❌ Resposta é HTML, não JSON. Possível erro de autenticação ou redirecionamento.")
                    continue
                
                try:
                    data = response.json()
                    print(f"✅ Resposta JSON recebida:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    
                    # Verificar estrutura da resposta
                    if data.get('success') and data.get('container'):
                        container = data['container']
                        print(f"\n🔍 ANÁLISE DOS CAMPOS:")
                        print(f"   - Número: {container.get('numero', 'N/A')}")
                        print(f"   - Status: {container.get('status', 'N/A')}")
                        print(f"   - Posição: {container.get('posicao_atual', 'N/A')}")
                        print(f"   - Tamanho: {container.get('tamanho', 'N/A')}")
                        print(f"   - Tipo: {container.get('tipo_container', 'N/A')}")
                        print(f"   - Armador: {container.get('armador', 'N/A')}")
                        print(f"   - Booking: {container.get('booking', 'N/A')}")
                        print(f"   - Condição: {container.get('condicao', 'N/A')}")
                        print(f"   - Capacidade: {container.get('capacidade', 'N/A')}")
                        print(f"   - Tara: {container.get('tara', 'N/A')}")
                        print(f"   - Placa: {container.get('placa', 'N/A')}")
                        print(f"   - Vagão: {container.get('vagao', 'N/A')}")
                        print(f"   - Data Vistoria: {container.get('data_vistoria', 'N/A')}")
                        
                        # Verificar operações
                        operacoes = data.get('operacoes', [])
                        print(f"   - Operações: {len(operacoes)} encontradas")
                        
                        if operacoes:
                            print(f"   - Primeira operação: {operacoes[0]}")
                    else:
                        print(f"❌ Container não encontrado ou estrutura de resposta inválida")
                        print(f"   Mensagem: {data.get('message', 'N/A')}")
                        
                except json.JSONDecodeError as e:
                    print(f"❌ Erro ao decodificar JSON: {e}")
                    print(f"📄 Conteúdo completo da resposta:")
                    print(repr(content))
                    
            else:
                print(f"❌ Erro na requisição: {response.status_code}")
                print(f"   Resposta: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 TESTE CONCLUÍDO")
    print("=" * 60)

if __name__ == "__main__":
    testar_api_consulta_com_auth()
