#!/usr/bin/env python3
"""
Script para testar inserção de solicitação de senha
"""

import sqlite3
from datetime import datetime

def test_password_request_insertion():
    """Testa inserção de solicitação de senha"""
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🧪 TESTANDO INSERÇÃO DE SOLICITAÇÃO DE SENHA")
        print("=" * 50)
        
        # Buscar um usuário existente para teste
        cursor.execute("SELECT id, username, email FROM usuarios WHERE username = 'admin'")
        user = cursor.fetchone()
        
        if not user:
            print("❌ Usuário 'admin' não encontrado!")
            return
        
        print(f"✅ Usuário encontrado: {user['username']} (ID: {user['id']}, Email: {user['email']})")
        
        # Tentar inserir uma solicitação (simulando o código atual)
        print(f"\n🔄 Tentando inserir solicitação...")
        
        try:
            cursor.execute("""
                INSERT INTO solicitacoes_senha (usuario_id, username, data_solicitacao)
                VALUES (?, ?, ?)
            """, (user['id'], user['username'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            
            conn.commit()
            print("✅ Inserção bem-sucedida!")
            
            # Verificar se foi inserido
            cursor.execute("SELECT * FROM solicitacoes_senha WHERE usuario_id = ?", (user['id'],))
            solicitacao = cursor.fetchone()
            
            if solicitacao:
                print(f"📝 Solicitação criada:")
                print(f"   ID: {solicitacao['id']}")
                print(f"   Usuário: {solicitacao['username']}")
                print(f"   Data: {solicitacao['data_solicitacao']}")
                print(f"   Status: {solicitacao['status']}")
            
        except Exception as e:
            print(f"❌ ERRO na inserção: {e}")
            
            # Tentar inserir com status explícito
            print(f"\n🔄 Tentando inserir com status explícito...")
            try:
                cursor.execute("""
                    INSERT INTO solicitacoes_senha (usuario_id, username, data_solicitacao, status)
                    VALUES (?, ?, ?, ?)
                """, (user['id'], user['username'], datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'pendente'))
                
                conn.commit()
                print("✅ Inserção com status explícito bem-sucedida!")
                
            except Exception as e2:
                print(f"❌ ERRO na inserção com status: {e2}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ ERRO GERAL: {e}")

if __name__ == "__main__":
    test_password_request_insertion()
