#!/usr/bin/env python3
"""
Script para resetar a senha do usuário admin_adm
"""
import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# Configurações
DB_FILE = 'database.db'

def test_common_passwords():
    """Testa senhas comuns para descobrir a senha atual"""
    print("🔍 Testando senhas comuns...")
    
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Buscar usuário
    cursor.execute("SELECT * FROM usuarios WHERE username = ?", ('admin_adm',))
    user = cursor.fetchone()
    
    if not user:
        print("❌ Usuário admin_adm não encontrado!")
        conn.close()
        return None
    
    # Lista de senhas comuns para testar
    common_passwords = [
        'admin_adm',
        'admin',
        'Admin123',
        'admin123',
        'Admin@123',
        '123456',
        'password',
        'senha123',
        'Senha123',
        'administrador',
        'Admin',
        'ADMIN',
        'admin_administrativo',
        'Admin_Adm',
        'ADMIN_ADM',
        '12345',
        'abc123',
        'qwerty',
        'root',
        'toor'
    ]
    
    password_hash = user['password_hash']
    
    print(f"   Hash atual: {password_hash[:30]}...")
    print("   Testando senhas:")
    
    for i, pwd in enumerate(common_passwords, 1):
        if check_password_hash(password_hash, pwd):
            print(f"   ✅ SENHA ENCONTRADA: '{pwd}'")
            conn.close()
            return pwd
        else:
            print(f"   {i:2d}. '{pwd}' - ❌")
    
    print("   ❌ Nenhuma senha comum funcionou")
    conn.close()
    return None

def reset_password():
    """Reseta a senha do usuário admin_adm"""
    print("\n🔧 Resetando senha do usuário admin_adm...")
    
    # Nova senha
    new_password = "admin_adm"
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # Gerar novo hash
        new_hash = generate_password_hash(new_password)
        
        # Atualizar no banco
        cursor.execute("""
            UPDATE usuarios 
            SET password_hash = ?, ultima_atualizacao = ?
            WHERE username = ?
        """, (new_hash, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'admin_adm'))
        
        # Verificar se foi atualizado
        if cursor.rowcount > 0:
            conn.commit()
            print(f"✅ Senha resetada com sucesso!")
            print(f"   Nova senha: {new_password}")
            
            # Registrar no log
            cursor.execute("""
                INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'sistema',
                'admin',
                'RESET_SENHA',
                'Senha do usuário admin_adm resetada via script'
            ))
            conn.commit()
            
            return True
        else:
            print("❌ Erro: Usuário não foi encontrado para atualização")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao resetar senha: {e}")
        return False
    finally:
        conn.close()

def verify_reset():
    """Verifica se o reset da senha funcionou"""
    print("\n🧪 Verificando reset da senha...")
    
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Buscar usuário
        cursor.execute("SELECT * FROM usuarios WHERE username = ?", ('admin_adm',))
        user = cursor.fetchone()
        
        if not user:
            print("❌ Usuário não encontrado!")
            return False
        
        # Testar senha
        test_password = "admin_adm"
        if check_password_hash(user['password_hash'], test_password):
            print(f"✅ Senha '{test_password}' está funcionando!")
            return True
        else:
            print(f"❌ Senha '{test_password}' ainda não funciona")
            return False
            
    except Exception as e:
        print(f"❌ Erro na verificação: {e}")
        return False
    finally:
        conn.close()

def show_login_instructions():
    """Mostra instruções de login"""
    print("\n" + "="*50)
    print("🎉 PROBLEMA RESOLVIDO!")
    print("="*50)
    print()
    print("📋 INSTRUÇÕES PARA LOGIN:")
    print("   1. Abra o sistema no navegador")
    print("   2. Clique na aba 'Admin' (terceira aba)")
    print("   3. Digite as credenciais:")
    print("      👤 Usuário: admin_adm")
    print("      🔑 Senha: admin_adm")
    print("   4. Clique em 'Login Administrativo'")
    print()
    print("💡 Se ainda não funcionar, pode ser um problema no frontend.")
    print("   Verifique o console do navegador para erros JavaScript.")
    print()

def main():
    """Função principal"""
    print("=== RESET DE SENHA ADMIN_ADM ===")
    print()
    
    # Primeiro, tentar descobrir a senha atual
    current_password = test_common_passwords()
    
    if current_password:
        print(f"\n🎉 A senha atual é: '{current_password}'")
        print("   Tente fazer login com essa senha!")
        show_login_instructions()
        return
    
    # Se não encontrou, perguntar se quer resetar
    print("\n⚠️  Senha atual não foi descoberta.")
    response = input("Deseja resetar a senha para 'admin_adm'? (s/n): ")
    
    if response.lower() == 's':
        if reset_password():
            if verify_reset():
                show_login_instructions()
            else:
                print("❌ Falha na verificação do reset")
        else:
            print("❌ Falha no reset da senha")
    else:
        print("Operação cancelada.")

if __name__ == "__main__":
    main()
