#!/usr/bin/env python3
"""
Script para debugar problemas de permissões na correção de descargas
"""

import sqlite3
from utils.db import get_db_connection
from utils.permissions import get_user_role, has_role
from flask import session
from app import create_app

def verificar_usuario_admin_adm():
    """Verifica o usuário admin_adm no banco de dados"""
    print("=== VERIFICANDO USUÁRIO admin_adm NO BANCO ===")
    
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
                print(f"   Unidade: {user['unidade']}")
                print(f"   Ativo: {user.get('ativo', 'N/A')}")
                print(f"   Nome: {user.get('nome', 'N/A')}")
                return user
            else:
                print("❌ Usuário admin_adm não encontrado no banco")
                return None
                
    except Exception as e:
        print(f"❌ Erro ao verificar usuário: {e}")
        return None

def simular_sessao_admin_adm():
    """Simula uma sessão do admin_adm e testa permissões"""
    print("\n=== SIMULANDO SESSÃO DO admin_adm ===")
    
    app = create_app()
    with app.app_context():
        with app.test_request_context():
            # Simular dados de sessão
            session['username'] = 'admin_adm'
            session['user_id'] = 1
            session['role'] = 'admin_administrativo'
            session['nivel'] = 'admin_administrativo'
            session['unidade'] = 'Rio de Janeiro'
            
            print(f"✅ Sessão configurada:")
            print(f"   Username: {session.get('username')}")
            print(f"   User ID: {session.get('user_id')}")
            print(f"   Role: {session.get('role')}")
            print(f"   Nível: {session.get('nivel')}")
            print(f"   Unidade: {session.get('unidade')}")
            
            # Testar funções de permissão
            print(f"\n=== TESTANDO PERMISSÕES ===")
            user_role = get_user_role()
            print(f"   get_user_role(): {user_role}")
            
            is_admin = has_role('admin')
            print(f"   has_role('admin'): {is_admin}")
            
            is_admin_administrativo = has_role('admin_administrativo')
            print(f"   has_role('admin_administrativo'): {is_admin_administrativo}")
            
            # Verificar se passa no teste do decorador admin_required
            admin_roles = ['admin', 'admin_administrativo']
            passes_admin_check = user_role in admin_roles
            print(f"   Passa no @admin_required: {passes_admin_check}")
            
            if not passes_admin_check:
                print(f"❌ PROBLEMA: user_role '{user_role}' não está em {admin_roles}")
            else:
                print(f"✅ Permissões OK para correção de descargas")

def testar_rota_correcao():
    """Testa a rota de correção diretamente"""
    print("\n=== TESTANDO ROTA DE CORREÇÃO ===")
    
    app = create_app()
    with app.app_context():
        try:
            from routes.operacoes import corrigir_descarga
            print("✅ Função corrigir_descarga importada com sucesso")
            
            # Verificar decoradores aplicados
            decorators = []
            if hasattr(corrigir_descarga, '__wrapped__'):
                decorators.append("Tem decoradores aplicados")
            
            print(f"   Decoradores: {decorators if decorators else 'Nenhum detectado'}")
            
        except Exception as e:
            print(f"❌ Erro ao importar função: {e}")

def verificar_estrutura_tabelas():
    """Verifica se as tabelas necessárias existem"""
    print("\n=== VERIFICANDO ESTRUTURA DO BANCO ===")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verificar tabela usuarios
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
            if cursor.fetchone():
                print("✅ Tabela 'usuarios' existe")
                
                # Verificar colunas da tabela usuarios
                cursor.execute("PRAGMA table_info(usuarios)")
                columns = cursor.fetchall()
                print(f"   Colunas: {[col[1] for col in columns]}")
            else:
                print("❌ Tabela 'usuarios' não existe")
                
            # Verificar tabela operacoes
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='operacoes'")
            if cursor.fetchone():
                print("✅ Tabela 'operacoes' existe")
            else:
                print("❌ Tabela 'operacoes' não existe")
                
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura: {e}")

if __name__ == "__main__":
    print("🔍 DIAGNÓSTICO DE PERMISSÕES - CORREÇÃO DE DESCARGAS")
    print("=" * 60)
    
    # 1. Verificar usuário no banco
    user = verificar_usuario_admin_adm()
    
    # 2. Verificar estrutura do banco
    verificar_estrutura_tabelas()
    
    # 3. Simular sessão e testar permissões
    simular_sessao_admin_adm()
    
    # 4. Testar rota de correção
    testar_rota_correcao()
    
    print("\n" + "=" * 60)
    print("🏁 DIAGNÓSTICO CONCLUÍDO")
