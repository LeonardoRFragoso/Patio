#!/usr/bin/env python3
"""
Script para debugar a página de histórico de containers
"""

from app import create_app
import sqlite3
import os

def test_with_app_context():
    """Testa dentro do contexto da aplicação Flask"""
    app = create_app()
    with app.app_context():
        print("=== TESTE COM CONTEXTO DA APLICAÇÃO ===")
        
        try:
            from utils.db import get_db
            
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
            
            # Testar query da API
            where_sql = "1=1"
            params = []
            
            # Contar total
            count_query = f"SELECT COUNT(*) FROM containers c WHERE {where_sql}"
            cursor.execute(count_query, params)
            total_registros = cursor.fetchone()[0]
            print(f"Total de registros para API: {total_registros}")
            
            # Query principal da API
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
            
            print(f"Containers encontrados pela query da API: {len(containers)}")
            
            # Mostrar dados dos containers
            for container in containers:
                print(f"- ID: {container[0]}")
                print(f"  Número: {container[1]}")
                print(f"  Unidade: {container[2]}")
                print(f"  Status: {container[3]}")
                print(f"  Posição: {container[4]}")
                print(f"  Tamanho: {container[5]}")
                print(f"  Armador: {container[6]}")
                print(f"  Data Criação: {container[7]}")
                print(f"  Nome Unidade: {container[9]}")
                print("  ---")
            
            # Simular resposta da API
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
                    'ultima_operacao': container[8] or '-',
                    'data_ultima_operacao': container[8],
                    'nome_unidade': container[9] or container[2]
                }
                resultados.append(resultado)
            
            api_response = {
                'success': True,
                'containers': resultados,
                'total_registros': total_registros,
                'pagina_atual': 1,
                'itens_por_pagina': 50,
                'total_paginas': (total_registros + 50 - 1) // 50
            }
            
            print(f"\nResposta simulada da API:")
            print(f"Success: {api_response['success']}")
            print(f"Total registros: {api_response['total_registros']}")
            print(f"Containers retornados: {len(api_response['containers'])}")
            print(f"Página atual: {api_response['pagina_atual']}")
            print(f"Total páginas: {api_response['total_paginas']}")
            
            return True
            
        except Exception as e:
            print(f"Erro no teste: {e}")
            import traceback
            traceback.print_exc()
            return False

def test_columns_exist():
    """Verifica se todas as colunas necessárias existem"""
    app = create_app()
    with app.app_context():
        print("\n=== VERIFICAÇÃO DE COLUNAS ===")
        
        try:
            from utils.db import get_db
            
            db = get_db()
            cursor = db.cursor()
            
            # Verificar estrutura da tabela containers
            cursor.execute("PRAGMA table_info(containers)")
            columns = cursor.fetchall()
            
            print("Colunas da tabela containers:")
            column_names = []
            for col in columns:
                column_names.append(col[1])
                print(f"- {col[1]} ({col[2]})")
            
            # Verificar se colunas necessárias existem
            required_columns = [
                'id', 'numero', 'unidade', 'status', 'posicao_atual', 
                'tamanho', 'armador', 'data_criacao', 'ultima_atualizacao'
            ]
            
            missing_columns = []
            for col in required_columns:
                if col not in column_names:
                    missing_columns.append(col)
            
            if missing_columns:
                print(f"\nColunas faltantes: {missing_columns}")
                return False
            else:
                print(f"\nTodas as colunas necessárias estão presentes!")
                return True
                
        except Exception as e:
            print(f"Erro na verificação de colunas: {e}")
            return False

def test_api_route():
    """Testa a rota da API diretamente"""
    app = create_app()
    with app.app_context():
        print("\n=== TESTE DA ROTA DA API ===")
        
        try:
            from admin.routes import api_historico_containers
            from flask import request
            
            # Simular request
            with app.test_request_context('/admin/api/historico-containers'):
                # Simular sessão de admin_administrativo
                from flask import session
                session['username'] = 'admin_adm'
                session['role'] = 'admin_administrativo'
                session['nivel'] = 'admin_administrativo'
                
                # Chamar a função da API
                response = api_historico_containers()
                
                print(f"Tipo de resposta: {type(response)}")
                
                if hasattr(response, 'get_json'):
                    data = response.get_json()
                    print(f"Dados da resposta: {data}")
                else:
                    print(f"Resposta: {response}")
                
                return True
                
        except Exception as e:
            print(f"Erro no teste da rota: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    print("Debug da página de histórico de containers")
    print("=" * 50)
    
    # Teste 1: Contexto da aplicação
    app_ok = test_with_app_context()
    
    # Teste 2: Verificar colunas
    columns_ok = test_columns_exist()
    
    # Teste 3: Testar rota da API
    api_ok = test_api_route()
    
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES:")
    print(f"Contexto da aplicação: {'✅ OK' if app_ok else '❌ ERRO'}")
    print(f"Colunas da tabela: {'✅ OK' if columns_ok else '❌ ERRO'}")
    print(f"Rota da API: {'✅ OK' if api_ok else '❌ ERRO'}")
