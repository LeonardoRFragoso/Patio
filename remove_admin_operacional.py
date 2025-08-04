#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import re

def get_db_connection():
    """Conectar ao banco de dados"""
    return sqlite3.connect('database.db')

def check_admin_operacional_users():
    """Verificar usuários no perfil admin_operacional"""
    print("🔍 VERIFICANDO USUÁRIOS ADMIN_OPERACIONAL")
    print("=" * 50)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        cursor.execute("SELECT username, email, nome FROM usuarios WHERE nivel = 'admin_operacional'")
        users = cursor.fetchall()
        
        if users:
            print(f"📋 Encontrados {len(users)} usuários admin_operacional:")
            for user in users:
                print(f"   • {user[0]} ({user[2]}) - {user[1]}")
            return users
        else:
            print("✅ Nenhum usuário admin_operacional encontrado")
            return []
            
    except Exception as e:
        print(f"❌ Erro ao verificar usuários: {e}")
        return []
    finally:
        db.close()

def migrate_admin_operacional_users():
    """Migrar usuários admin_operacional para admin_administrativo"""
    print("\n🔄 MIGRANDO USUÁRIOS ADMIN_OPERACIONAL")
    print("=" * 50)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Verificar usuários antes da migração
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_operacional'")
        users_before = cursor.fetchall()
        
        if not users_before:
            print("✅ Nenhum usuário para migrar")
            return True
        
        print(f"📋 Migrando {len(users_before)} usuários para admin_administrativo...")
        
        # Migrar usuários
        cursor.execute("""
            UPDATE usuarios 
            SET nivel = 'admin_administrativo' 
            WHERE nivel = 'admin_operacional'
        """)
        
        # Verificar migração
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_administrativo'")
        users_after = cursor.fetchall()
        
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_operacional'")
        remaining_users = cursor.fetchall()
        
        db.commit()
        
        print(f"✅ Migração concluída!")
        print(f"   • Usuários admin_administrativo: {len(users_after)}")
        print(f"   • Usuários admin_operacional restantes: {len(remaining_users)}")
        
        if len(remaining_users) == 0:
            print("✅ Todos os usuários migrados com sucesso!")
            return True
        else:
            print("❌ Alguns usuários não foram migrados")
            return False
            
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        return False
    finally:
        db.close()

def remove_admin_operacional_from_code():
    """Remover referências ao admin_operacional do código"""
    print("\n🗑️ REMOVENDO ADMIN_OPERACIONAL DO CÓDIGO")
    print("=" * 50)
    
    permissions_file = 'utils/permissions.py'
    
    if not os.path.exists(permissions_file):
        print("❌ Arquivo permissions.py não encontrado")
        return False
    
    try:
        # Ler arquivo
        with open(permissions_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remover admin_operacional do ROLES
        roles_pattern = r"(ROLES\s*=\s*\{[^}]*)'admin_operacional':\s*\d+,?\s*([^}]*\})"
        if re.search(roles_pattern, content, re.DOTALL):
            content = re.sub(r"'admin_operacional':\s*\d+,?\s*", '', content)
            print("✅ Removido admin_operacional do dicionário ROLES")
        
        # Remover função admin_operacional_required se existir
        function_pattern = r'def admin_operacional_required.*?(?=def|\Z)'
        if re.search(function_pattern, content, re.DOTALL):
            content = re.sub(function_pattern, '', content, flags=re.DOTALL)
            print("✅ Removida função admin_operacional_required")
        
        # Remover referências em comentários
        content = re.sub(r'admin_operacional[,\s]*', '', content)
        content = re.sub(r',\s*admin_operacional', '', content)
        
        # Salvar arquivo se houve mudanças
        if content != original_content:
            with open(permissions_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print("✅ Arquivo permissions.py atualizado")
            return True
        else:
            print("✅ Nenhuma referência ao admin_operacional encontrada no código")
            return True
            
    except Exception as e:
        print(f"❌ Erro ao atualizar código: {e}")
        return False

def validate_removal():
    """Validar se admin_operacional foi completamente removido"""
    print("\n✅ VALIDANDO REMOÇÃO")
    print("=" * 50)
    
    success = True
    
    # Verificar banco de dados
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'admin_operacional'")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("✅ Banco de dados: Nenhum usuário admin_operacional")
        else:
            print(f"❌ Banco de dados: {count} usuários admin_operacional restantes")
            success = False
            
    except Exception as e:
        print(f"❌ Erro na validação do banco: {e}")
        success = False
    finally:
        db.close()
    
    # Verificar código
    permissions_file = 'utils/permissions.py'
    if os.path.exists(permissions_file):
        try:
            with open(permissions_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'admin_operacional' in content.lower():
                print("❌ Código: Ainda há referências ao admin_operacional")
                success = False
            else:
                print("✅ Código: Nenhuma referência ao admin_operacional")
                
        except Exception as e:
            print(f"❌ Erro na validação do código: {e}")
            success = False
    
    return success

def show_final_structure():
    """Mostrar estrutura final dos perfis"""
    print("\n📊 ESTRUTURA FINAL DOS PERFIS")
    print("=" * 50)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        cursor.execute("""
            SELECT nivel, COUNT(*) as total, GROUP_CONCAT(username) as usuarios
            FROM usuarios 
            GROUP BY nivel 
            ORDER BY 
                CASE nivel 
                    WHEN 'admin' THEN 1
                    WHEN 'admin_administrativo' THEN 2
                    WHEN 'vistoriador' THEN 3
                    WHEN 'operador' THEN 4
                    ELSE 5
                END
        """)
        
        profiles = cursor.fetchall()
        
        for profile in profiles:
            nivel, total, usuarios = profile
            print(f"📋 {nivel}: {total} usuários")
            if usuarios:
                user_list = usuarios.split(',')
                for user in user_list[:3]:  # Mostrar até 3 usuários
                    print(f"   • {user}")
                if len(user_list) > 3:
                    print(f"   • ... e mais {len(user_list) - 3} usuários")
        
    except Exception as e:
        print(f"❌ Erro ao mostrar estrutura: {e}")
    finally:
        db.close()

def main():
    """Função principal"""
    print("🔧 REMOÇÃO DO PERFIL ADMIN_OPERACIONAL")
    print("=" * 60)
    
    # 1. Verificar usuários
    users = check_admin_operacional_users()
    
    if users:
        # 2. Migrar usuários
        if migrate_admin_operacional_users():
            print("✅ Migração de usuários concluída")
        else:
            print("❌ Falha na migração de usuários")
            return
    
    # 3. Remover do código
    if remove_admin_operacional_from_code():
        print("✅ Remoção do código concluída")
    else:
        print("❌ Falha na remoção do código")
        return
    
    # 4. Validar remoção
    if validate_removal():
        print("\n🎉 REMOÇÃO COMPLETA COM SUCESSO!")
    else:
        print("\n❌ Remoção incompleta - verificar erros acima")
        return
    
    # 5. Mostrar estrutura final
    show_final_structure()
    
    print("\n" + "=" * 60)
    print("✅ PERFIL ADMIN_OPERACIONAL REMOVIDO COM SUCESSO!")
    print("📋 Sistema agora possui apenas os perfis necessários:")
    print("   • admin: Acesso completo")
    print("   • admin_administrativo: Correção de descargas e relatórios")
    print("   • vistoriador: Vistorias e inspeções")
    print("   • operador: Operações básicas")

if __name__ == "__main__":
    main()
