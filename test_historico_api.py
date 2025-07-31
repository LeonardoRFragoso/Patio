#!/usr/bin/env python3
"""
Script para testar a API de histórico de containers
"""

import requests
import json
import sqlite3
from utils.db import get_db

def test_database_direct():
    """Testa consulta direta no banco de dados"""
    print("=== TESTE DIRETO NO BANCO ===")
    
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Verificar containers
        cursor.execute("SELECT COUNT(*) FROM containers")
        total = cursor.fetchone()[0]
        print(f"Total de containers no banco: {total}")
        
        # Verificar unidades
        cursor.execute("SELECT DISTINCT unidade FROM containers ORDER BY unidade")
        unidades = [row[0] for row in cursor.fetchall()]
        print(f"Unidades encontradas: {unidades}")
        
        # Buscar alguns containers
        cursor.execute("""
            SELECT c.id, c.numero, c.unidade, c.status, c.posicao_atual, c.tamanho, 
                   c.armador, c.data_criacao
            FROM containers c
            LIMIT 5
        """)
        containers = cursor.fetchall()
        
        print(f"\nPrimeiros containers:")
        for container in containers:
            print(f"- ID: {container[0]}, Número: {container[1]}, Unidade: {container[2]}, Status: {container[3]}")
            
        return True
        
    except Exception as e:
        print(f"Erro no teste direto: {e}")
        return False

def test_api_with_session():
    """Testa a API simulando uma sessão de admin_administrativo"""
    print("\n=== TESTE DA API COM SESSÃO ===")
    
    # Simular login
    session = requests.Session()
    
    # Fazer login como admin_administrativo
    login_data = {
        'username': 'admin_adm',
        'password': 'Admin@123',
        'nivel': 'admin'
    }
    
    try:
        # Login
        login_response = session.post('http://127.0.0.1:8505/auth/login', data=login_data)
        print(f"Status do login: {login_response.status_code}")
        
        if login_response.status_code == 200:
            # Testar página de histórico
            historico_response = session.get('http://127.0.0.1:8505/admin/historico-containers')
            print(f"Status da página de histórico: {historico_response.status_code}")
            
            # Testar API
            api_response = session.get('http://127.0.0.1:8505/admin/api/historico-containers')
            print(f"Status da API: {api_response.status_code}")
            
            if api_response.status_code == 200:
                data = api_response.json()
                print(f"Dados da API: {json.dumps(data, indent=2)}")
                return True
            else:
                print(f"Erro na API: {api_response.text}")
                return False
        else:
            print(f"Erro no login: {login_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("Erro: Servidor não está rodando. Execute 'python app.py' primeiro.")
        return False
    except Exception as e:
        print(f"Erro no teste da API: {e}")
        return False

def test_api_query_structure():
    """Testa a estrutura da query da API"""
    print("\n=== TESTE DA ESTRUTURA DA QUERY ===")
    
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Query similar à da API
        where_sql = "1=1"
        params = []
        
        # Contar total
        count_query = f"SELECT COUNT(*) FROM containers c WHERE {where_sql}"
        cursor.execute(count_query, params)
        total_registros = cursor.fetchone()[0]
        print(f"Total de registros: {total_registros}")
        
        # Query principal
        query = f"""
            SELECT c.id, c.numero, c.unidade, c.status, c.posicao_atual, c.tamanho, 
                   c.armador, c.data_criacao, c.ultima_atualizacao,
                   COALESCE(u.nome, c.unidade) as nome_unidade
            FROM containers c
            LEFT JOIN usuarios u ON c.unidade = u.unidade
            WHERE {where_sql}
            ORDER BY c.data_criacao DESC, c.numero ASC
            LIMIT 50 OFFSET 0
        """
        
        cursor.execute(query, params)
        containers = cursor.fetchall()
        
        print(f"Containers encontrados: {len(containers)}")
        
        # Formatar como a API
        resultados = []
        for container in containers:
            resultado = {
                'id': container[0],
                'numero': container[1],
                'unidade': container[2],
                'status': container[3],
                'posicao_atual': container[4] or '-',
                'tamanho': container[5] or '-',
                'armador': container[6] or '-',
                'data_criacao': container[7],
                'ultima_atualizacao': container[8],
                'nome_unidade': container[9] or container[2]
            }
            resultados.append(resultado)
        
        print(f"Resultados formatados:")
        for resultado in resultados:
            print(f"- {resultado['numero']} | {resultado['unidade']} | {resultado['status']}")
            
        return True
        
    except Exception as e:
        print(f"Erro no teste da query: {e}")
        return False

if __name__ == "__main__":
    print("Testando API de Histórico de Containers")
    print("=" * 50)
    
    # Teste 1: Banco direto
    db_ok = test_database_direct()
    
    # Teste 2: Estrutura da query
    query_ok = test_api_query_structure()
    
    # Teste 3: API com sessão (só se servidor estiver rodando)
    api_ok = test_api_with_session()
    
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES:")
    print(f"Banco de dados: {'✅ OK' if db_ok else '❌ ERRO'}")
    print(f"Query structure: {'✅ OK' if query_ok else '❌ ERRO'}")
    print(f"API com sessão: {'✅ OK' if api_ok else '❌ ERRO'}")
    
    if not api_ok:
        print("\nPara testar a API, execute primeiro:")
        print("python app.py")
        print("Depois execute este script novamente.")
