#!/usr/bin/env python3
"""
Script para debugar problema de login do usuário admin_adm
"""
import sqlite3
from werkzeug.security import check_password_hash
import sys
import os

# Adicionar o diretório do projeto ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def debug_user_login():
    """Debug do login do usuário admin_adm"""
    
    # Conectar ao banco de dados
    try:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("=== DEBUG LOGIN ADMIN_ADM ===")
        print()
        
        # 1. Verificar se o usuário existe
        print("1. Verificando se usuário admin_adm existe...")
        cursor.execute("SELECT * FROM usuarios WHERE username = ?", ('admin_adm',))
        user = cursor.fetchone()
        
        if not user:
            print("❌ ERRO: Usuário admin_adm não encontrado no banco!")
            return
        
        print("✅ Usuário encontrado:")
        print(f"   ID: {user['id']}")
        print(f"   Username: {user['username']}")
        print(f"   Email: {user['email']}")
        print(f"   Nível: {user['nivel']}")
        try:
            print(f"   Ativo: {user['ativo']}")
        except (KeyError, IndexError):
            print("   Ativo: Campo não existe")
        
        try:
            print(f"   Último login: {user['last_login']}")
        except (KeyError, IndexError):
            print("   Último login: Nunca")
        print()
        
        # 2. Verificar se está ativo
        print("2. Verificando status ativo...")
        try:
            ativo = user['ativo']
            if ativo != 1:
                print(f"❌ PROBLEMA: Usuário não está ativo (ativo = {ativo})")
            else:
                print("✅ Usuário está ativo")
        except (KeyError, IndexError):
            print("ℹ️  Campo 'ativo' não existe na tabela - assumindo usuário ativo")
        print()
        
        # 3. Testar senha
        print("3. Testando senha...")
        test_password = "admin_adm"  # Senha padrão esperada
        
        password_hash = user['password_hash']
        print(f"   Hash armazenado: {password_hash[:50]}...")
        
        if check_password_hash(password_hash, test_password):
            print("✅ Senha 'admin_adm' está correta!")
        else:
            print("❌ PROBLEMA: Senha 'admin_adm' não confere com o hash")
            
            # Testar outras senhas possíveis
            possible_passwords = ['admin', 'Admin123', '123456', 'password']
            print("   Testando outras senhas possíveis...")
            for pwd in possible_passwords:
                if check_password_hash(password_hash, pwd):
                    print(f"   ✅ Senha correta encontrada: '{pwd}'")
                    break
            else:
                print("   ❌ Nenhuma senha comum funcionou")
        print()
        
        # 4. Verificar nível de acesso
        print("4. Verificando nível de acesso...")
        nivel = user['nivel']
        print(f"   Nível atual: {nivel}")
        
        if nivel in ['admin', 'admin_administrativo']:
            print("✅ Nível adequado para aba Admin")
        else:
            print(f"❌ PROBLEMA: Nível '{nivel}' não é válido para aba Admin")
        print()
        
        # 5. Verificar tentativas de login bloqueadas
        print("5. Verificando bloqueios de login...")
        cursor.execute("""
            SELECT * FROM login_attempts 
            WHERE username = ? 
            ORDER BY timestamp DESC 
            LIMIT 5
        """, ('admin_adm',))
        
        attempts = cursor.fetchall()
        if attempts:
            print(f"   Encontradas {len(attempts)} tentativas recentes:")
            for attempt in attempts:
                print(f"   - {attempt['timestamp']}: {attempt['attempts']} tentativas")
        else:
            print("   ✅ Nenhuma tentativa de login registrada")
        print()
        
        # 6. Verificar logs de atividade
        print("6. Verificando logs de atividade recentes...")
        cursor.execute("""
            SELECT * FROM log_atividades 
            WHERE usuario = ? 
            ORDER BY data_hora DESC 
            LIMIT 5
        """, ('admin_adm',))
        
        logs = cursor.fetchall()
        if logs:
            print(f"   Últimas {len(logs)} atividades:")
            for log in logs:
                print(f"   - {log['data_hora']}: {log['acao']} - {log['descricao']}")
        else:
            print("   ℹ️  Nenhum log de atividade encontrado")
        print()
        
        # 7. Resumo do diagnóstico
        print("=== RESUMO DO DIAGNÓSTICO ===")
        
        issues = []
        try:
            ativo = user['ativo']
            if ativo != 1:
                issues.append("Usuário não está ativo")
        except (KeyError, IndexError):
            pass  # Campo não existe, assume ativo
        if not check_password_hash(password_hash, test_password):
            issues.append("Senha padrão não confere")
        if nivel not in ['admin', 'admin_administrativo']:
            issues.append(f"Nível '{nivel}' inadequado")
        
        if issues:
            print("❌ PROBLEMAS ENCONTRADOS:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("✅ Nenhum problema óbvio encontrado nos dados do usuário")
            print("   O problema pode estar na lógica de autenticação do frontend/backend")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ ERRO durante debug: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_user_login()
