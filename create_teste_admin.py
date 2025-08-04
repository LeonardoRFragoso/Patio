#!/usr/bin/env python3
"""
Script para criar o usuário teste_admin com nível admin e senha 1234
"""

import sqlite3
from werkzeug.security import generate_password_hash
from datetime import datetime

def create_teste_admin():
    """Cria o usuário teste_admin"""
    
    print("🔧 CRIANDO USUÁRIO teste_admin")
    print("=" * 40)
    
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verificar se já existe
        cursor.execute("SELECT id FROM usuarios WHERE username = ?", ('teste_admin',))
        existing = cursor.fetchone()
        
        if existing:
            print("⚠️  Usuário teste_admin já existe!")
            
            # Atualizar senha e nível
            password_hash = generate_password_hash('1234', method='pbkdf2:sha256')
            cursor.execute("""
                UPDATE usuarios 
                SET nivel = ?, password_hash = ?
                WHERE username = ?
            """, ('admin', password_hash, 'teste_admin'))
            
            print("✅ Usuário atualizado:")
        else:
            # Criar novo usuário
            password_hash = generate_password_hash('1234', method='pbkdf2:sha256')
            
            cursor.execute("""
                INSERT INTO usuarios (username, email, nome, nivel, unidade, password_hash, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                'teste_admin',
                'teste_admin@exemplo.com',
                'Administrador de Teste',
                'admin',
                'Suzano',
                password_hash,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            print("✅ Usuário criado:")
        
        conn.commit()
        
        # Verificar criação
        cursor.execute("SELECT id, username, nivel FROM usuarios WHERE username = ?", ('teste_admin',))
        user = cursor.fetchone()
        
        print(f"   - ID: {user[0]}")
        print(f"   - Username: {user[1]}")
        print(f"   - Nível: {user[2]}")
        print(f"   - Senha: 1234")
        print(f"   - Email: teste_admin@exemplo.com")
        
        print("\n🎯 CREDENCIAIS DE ACESSO:")
        print("   Username: teste_admin")
        print("   Senha: 1234")
        print("   Nível: admin")
        print("   Aba de Login: Admin (terceira aba)")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        return False

if __name__ == "__main__":
    create_teste_admin()
