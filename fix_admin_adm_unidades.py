#!/usr/bin/env python3
"""
Script para corrigir o usuário admin_adm para ter acesso a TODAS as unidades
"""

import sqlite3
from utils.db import get_db_connection
from app import create_app

def verificar_usuario_admin_adm():
    """Verifica o estado atual do usuário admin_adm"""
    print("=== VERIFICANDO USUÁRIO admin_adm ===")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Buscar usuário admin_adm
            cursor.execute("SELECT * FROM usuarios WHERE username = ?", ('admin_adm',))
            user = cursor.fetchone()
            
            if user:
                print(f"✅ Usuário encontrado:")
                print(f"   ID: {user['id']}")
                print(f"   Username: {user['username']}")
                print(f"   Nível: {user['nivel']}")
                print(f"   Unidade ATUAL: {user['unidade']}")
                print(f"   Ativo: {user.get('ativo', 'N/A')}")
                print(f"   Nome: {user.get('nome', 'N/A')}")
                return user
            else:
                print("❌ Usuário admin_adm não encontrado no banco")
                return None
                
    except Exception as e:
        print(f"❌ Erro ao verificar usuário: {e}")
        return None

def corrigir_unidade_admin_adm():
    """Corrige a unidade do admin_adm para 'TODAS'"""
    print("\n=== CORRIGINDO UNIDADE DO admin_adm ===")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Atualizar unidade para 'TODAS'
            cursor.execute("""
                UPDATE usuarios 
                SET unidade = 'TODAS'
                WHERE username = 'admin_adm'
            """)
            
            rows_affected = cursor.rowcount
            conn.commit()
            
            if rows_affected > 0:
                print(f"✅ Usuário admin_adm atualizado com sucesso!")
                print(f"   Unidade alterada para: TODAS")
                
                # Verificar a alteração
                cursor.execute("SELECT unidade FROM usuarios WHERE username = ?", ('admin_adm',))
                nova_unidade = cursor.fetchone()
                print(f"   Confirmação: {nova_unidade['unidade']}")
                
                return True
            else:
                print("❌ Nenhuma linha foi afetada - usuário pode não existir")
                return False
                
    except Exception as e:
        print(f"❌ Erro ao corrigir unidade: {e}")
        return False

def verificar_outras_rotas_com_restricao_unidade():
    """Verifica outras rotas que podem ter restrição de unidade"""
    print("\n=== VERIFICANDO OUTRAS ROTAS COM RESTRIÇÃO DE UNIDADE ===")
    
    import os
    import re
    
    # Arquivos para verificar
    arquivos_para_verificar = [
        'routes/operacoes.py',
        'admin/routes.py',
        'routes/vistoriador.py',
        'routes/containers.py'
    ]
    
    padrao_unidade = re.compile(r'unidade.*!=.*unidade|Container pertence a outra unidade', re.IGNORECASE)
    
    for arquivo in arquivos_para_verificar:
        caminho_completo = os.path.join('.', arquivo)
        if os.path.exists(caminho_completo):
            try:
                with open(caminho_completo, 'r', encoding='utf-8') as f:
                    linhas = f.readlines()
                    
                for i, linha in enumerate(linhas, 1):
                    if padrao_unidade.search(linha):
                        print(f"⚠️  {arquivo}:{i} - {linha.strip()}")
                        
            except Exception as e:
                print(f"❌ Erro ao verificar {arquivo}: {e}")

def listar_containers_por_unidade():
    """Lista containers por unidade para verificar distribuição"""
    print("\n=== CONTAINERS POR UNIDADE ===")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT unidade, COUNT(*) as total
                FROM containers 
                GROUP BY unidade
                ORDER BY unidade
            """)
            
            resultados = cursor.fetchall()
            
            for resultado in resultados:
                print(f"   {resultado['unidade']}: {resultado['total']} containers")
                
    except Exception as e:
        print(f"❌ Erro ao listar containers: {e}")

if __name__ == "__main__":
    print("🔧 CORREÇÃO DE UNIDADES PARA ADMIN_ADM")
    print("=" * 50)
    
    # Criar contexto da aplicação
    app = create_app()
    with app.app_context():
        # 1. Verificar estado atual
        user = verificar_usuario_admin_adm()
        
        # 2. Listar containers por unidade
        listar_containers_por_unidade()
        
        # 3. Corrigir unidade se necessário
        if user and user['unidade'] != 'TODAS':
            print(f"\n🔄 Unidade atual '{user['unidade']}' precisa ser corrigida para 'TODAS'")
            sucesso = corrigir_unidade_admin_adm()
            
            if sucesso:
                print("✅ Correção aplicada com sucesso!")
            else:
                print("❌ Falha na correção")
        else:
            print("✅ Unidade já está configurada corretamente como 'TODAS'")
        
        # 4. Verificar outras rotas
        verificar_outras_rotas_com_restricao_unidade()
    
    print("\n" + "=" * 50)
    print("🏁 CORREÇÃO CONCLUÍDA")
