#!/usr/bin/env python3
"""
Script para adicionar tabelas faltantes ao banco database.db
sem afetar dados existentes
"""
import sqlite3
import os
from datetime import datetime

# Configurações
DB_FILE = 'database.db'

def add_missing_tables():
    """Adiciona tabelas faltantes ao banco de dados existente"""
    print("🔧 Adicionando tabelas faltantes ao banco de dados...")
    
    if not os.path.exists(DB_FILE):
        print(f"❌ ERRO: Arquivo {DB_FILE} não encontrado!")
        return False
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # Verificar quais tabelas já existem
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"📋 Tabelas existentes: {', '.join(existing_tables)}")
        
        tables_added = []
        
        # Adicionar tabela login_attempts se não existir
        if 'login_attempts' not in existing_tables:
            cursor.execute('''
            CREATE TABLE login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                attempts INTEGER DEFAULT 1,
                timestamp TEXT NOT NULL,
                blocked_until TEXT
            )
            ''')
            tables_added.append('login_attempts')
            print("✅ Tabela 'login_attempts' criada")
        
        # Adicionar coluna 'ativo' à tabela usuarios se não existir
        cursor.execute("PRAGMA table_info(usuarios)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'ativo' not in columns:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1")
            print("✅ Coluna 'ativo' adicionada à tabela 'usuarios'")
        
        # Adicionar coluna 'unidade' à tabela usuarios se não existir
        if 'unidade' not in columns:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN unidade TEXT DEFAULT 'Rio de Janeiro'")
            print("✅ Coluna 'unidade' adicionada à tabela 'usuarios'")
        
        # Adicionar coluna 'nome' à tabela usuarios se não existir
        if 'nome' not in columns:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN nome TEXT")
            print("✅ Coluna 'nome' adicionada à tabela 'usuarios'")
        
        # Adicionar coluna 'setor' à tabela usuarios se não existir
        if 'setor' not in columns:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN setor TEXT")
            print("✅ Coluna 'setor' adicionada à tabela 'usuarios'")
        
        # Commit das alterações
        conn.commit()
        
        if tables_added:
            print(f"🎉 {len(tables_added)} tabela(s) adicionada(s) com sucesso!")
        else:
            print("ℹ️  Todas as tabelas necessárias já existem")
        
        return True
        
    except Exception as e:
        print(f"❌ ERRO: {e}")
        return False
    finally:
        conn.close()

def test_login_debug():
    """Testa o debug do login após as correções"""
    print("\n🧪 Testando debug do login...")
    
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Buscar usuário admin_adm
        cursor.execute("SELECT * FROM usuarios WHERE username = ?", ('admin_adm',))
        user = cursor.fetchone()
        
        if user:
            print("✅ Usuário admin_adm encontrado:")
            print(f"   ID: {user['id']}")
            print(f"   Username: {user['username']}")
            print(f"   Nível: {user['nivel']}")
            
            # Verificar se tem campo ativo
            try:
                print(f"   Ativo: {user['ativo']}")
            except (KeyError, IndexError):
                print("   Ativo: Campo não existe (assumindo ativo)")
            
            # Testar senha
            from werkzeug.security import check_password_hash
            test_password = "admin_adm"
            
            if check_password_hash(user['password_hash'], test_password):
                print("✅ Senha 'admin_adm' está correta!")
            else:
                print("❌ Senha 'admin_adm' não confere")
                
                # Testar outras senhas
                other_passwords = ['admin', 'Admin123', '123456']
                for pwd in other_passwords:
                    if check_password_hash(user['password_hash'], pwd):
                        print(f"✅ Senha correta encontrada: '{pwd}'")
                        break
                else:
                    print("❌ Nenhuma senha comum funcionou")
            
            # Verificar nível
            if user['nivel'] in ['admin', 'admin_administrativo']:
                print("✅ Nível adequado para login admin")
            else:
                print(f"❌ Nível '{user['nivel']}' pode não ser adequado")
        else:
            print("❌ Usuário admin_adm não encontrado!")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ ERRO no teste: {e}")

def main():
    """Função principal"""
    print("=== CORREÇÃO DE TABELAS FALTANTES ===")
    print(f"Banco de dados: {DB_FILE}")
    print()
    
    if add_missing_tables():
        test_login_debug()
        print("\n🎉 CORREÇÃO CONCLUÍDA!")
        print("\n💡 Agora tente fazer login novamente com:")
        print("   Usuário: admin_adm")
        print("   Senha: admin_adm")
        print("   Aba: Admin (terceira aba)")
    else:
        print("\n❌ FALHA na correção!")

if __name__ == "__main__":
    main()
