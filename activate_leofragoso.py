#!/usr/bin/env python3
"""
Script para ativar completamente o usuário LeoFragoso
"""

import sqlite3
import hashlib
from datetime import datetime

def hash_password(password):
    """Gera hash da senha"""
    return hashlib.sha1(password.encode()).hexdigest()

def activate_user():
    """Ativa o usuário LeoFragoso"""
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    try:
        # Verificar status atual
        cursor.execute('SELECT username, nivel, primeiro_login, senha_temporaria FROM usuarios WHERE username = ?', ('LeoFragoso',))
        user = cursor.fetchone()
        
        if not user:
            print("❌ Usuário LeoFragoso não encontrado!")
            return
            
        print(f"📋 Status atual do usuário:")
        print(f"   Username: {user[0]}")
        print(f"   Nível: {user[1]}")
        print(f"   Primeiro login: {user[2]}")
        print(f"   Senha temporária: {user[3]}")
        
        # Definir nova senha permanente
        nova_senha = "Leo@2025"
        senha_hash = hash_password(nova_senha)
        
        # Atualizar usuário
        cursor.execute('''
            UPDATE usuarios 
            SET password_hash = ?,
                primeiro_login = 0,
                senha_temporaria = 0,
                ultima_alteracao_senha = ?,
                last_login = NULL
            WHERE username = ?
        ''', (senha_hash, datetime.now().isoformat(), 'LeoFragoso'))
        
        conn.commit()
        
        print(f"\n✅ Usuário LeoFragoso ativado com sucesso!")
        print(f"📝 Nova senha: {nova_senha}")
        print(f"🔐 Primeiro login: Não (ativado)")
        print(f"🔑 Senha temporária: Não")
        
        # Verificar se há tabela de tentativas de login
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'")
        if cursor.fetchone():
            # Limpar tentativas de login falhadas
            cursor.execute('DELETE FROM login_attempts WHERE username = ?', ('LeoFragoso',))
            conn.commit()
            print(f"🧹 Tentativas de login limpas")
        
        # Verificar status final
        cursor.execute('SELECT username, nivel, primeiro_login, senha_temporaria FROM usuarios WHERE username = ?', ('LeoFragoso',))
        user_final = cursor.fetchone()
        
        print(f"\n📋 Status final:")
        print(f"   Username: {user_final[0]}")
        print(f"   Nível: {user_final[1]}")
        print(f"   Primeiro login: {user_final[2]}")
        print(f"   Senha temporária: {user_final[3]}")
        
    except Exception as e:
        print(f"❌ Erro ao ativar usuário: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    activate_user()
