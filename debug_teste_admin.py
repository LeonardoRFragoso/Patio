#!/usr/bin/env python3
"""
Script para investigar problemas de login com o usuário teste_admin
"""

import sqlite3
from werkzeug.security import check_password_hash, generate_password_hash

def debug_teste_admin():
    """Investiga problemas com o usuário teste_admin"""
    
    print("🔍 INVESTIGANDO PROBLEMA COM USUÁRIO teste_admin")
    print("=" * 50)
    
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Verificar se o usuário teste_admin existe
        print("1. VERIFICANDO EXISTÊNCIA DO USUÁRIO")
        print("-" * 30)
        
        cursor.execute("SELECT * FROM usuarios WHERE username = ?", ('teste_admin',))
        user = cursor.fetchone()
        
        if user:
            print(f"✅ Usuário encontrado:")
            print(f"   ID: {user['id']}")
            print(f"   Username: {user['username']}")
            print(f"   Email: {user['email']}")
            print(f"   Nível: {user['nivel']}")
            print(f"   Created at: {user['created_at']}")
            print(f"   Hash: {user['password_hash'][:30]}...")
        else:
            print("❌ Usuário teste_admin NÃO encontrado!")
            
            # Verificar usuários similares
            cursor.execute("SELECT username, nivel FROM usuarios WHERE username LIKE '%test%' OR username LIKE '%admin%'")
            similar = cursor.fetchall()
            
            if similar:
                print("\n🔍 Usuários similares encontrados:")
                for u in similar:
                    print(f"   - {u[0]} (nível: {u[1]})")
            
            return False
        
        # 2. Testar senha padrão "1234"
        print("\n2. TESTANDO SENHA PADRÃO '1234'")
        print("-" * 30)
        
        senha_teste = "1234"
        if check_password_hash(user['password_hash'], senha_teste):
            print("✅ Senha '1234' está CORRETA")
        else:
            print("❌ Senha '1234' está INCORRETA")
            
            # Testar outras senhas comuns
            senhas_comuns = ['admin', 'teste', 'teste_admin', '123456', 'password']
            print("\n🔍 Testando senhas comuns:")
            for senha in senhas_comuns:
                if check_password_hash(user['password_hash'], senha):
                    print(f"✅ Senha '{senha}' funciona!")
                    break
            else:
                print("❌ Nenhuma senha comum funciona")
        
        # 3. Verificar nível de acesso
        print("\n3. VERIFICANDO NÍVEL DE ACESSO")
        print("-" * 30)
        
        if user['nivel'] == 'admin':
            print("✅ Nível 'admin' está correto")
        else:
            print(f"⚠️  Nível atual: '{user['nivel']}' (esperado: 'admin')")
        
        # 4. Verificar tentativas de login recentes
        print("\n4. VERIFICANDO TENTATIVAS DE LOGIN")
        print("-" * 30)
        
        try:
            cursor.execute("SELECT * FROM login_attempts WHERE username = ? ORDER BY timestamp DESC LIMIT 5", ('teste_admin',))
            attempts = cursor.fetchall()
            
            if attempts:
                print("📋 Últimas tentativas de login:")
                for attempt in attempts:
                    print(f"   - {attempt['timestamp']}: {attempt['success']} (IP: {attempt['ip_address']})")
            else:
                print("ℹ️  Nenhuma tentativa de login registrada")
        except:
            print("ℹ️  Tabela login_attempts não existe ou está vazia")
        
        # 5. Recriar usuário se necessário
        print("\n5. OPÇÃO DE CORREÇÃO")
        print("-" * 30)
        
        if user['nivel'] != 'admin' or not check_password_hash(user['password_hash'], '1234'):
            print("🔧 Usuário precisa ser corrigido!")
            
            corrigir = input("Deseja corrigir o usuário teste_admin? (s/N): ").lower().strip()
            if corrigir == 's':
                # Atualizar usuário
                new_hash = generate_password_hash('1234', method='pbkdf2:sha256')
                
                cursor.execute("""
                    UPDATE usuarios 
                    SET nivel = ?, password_hash = ?
                    WHERE username = ?
                """, ('admin', new_hash, 'teste_admin'))
                
                conn.commit()
                print("✅ Usuário teste_admin corrigido!")
                print("   - Nível: admin")
                print("   - Senha: 1234")
        else:
            print("✅ Usuário está configurado corretamente")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        return False

if __name__ == "__main__":
    debug_teste_admin()
