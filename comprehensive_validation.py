#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import re
from datetime import datetime

def get_db_connection():
    """Conectar ao banco de dados"""
    return sqlite3.connect('database.db')

def print_header(title):
    """Imprimir cabeçalho formatado"""
    print(f"\n{'='*80}")
    print(f"🔍 {title}")
    print(f"{'='*80}")

def print_section(title):
    """Imprimir seção formatada"""
    print(f"\n📋 {title}")
    print("-" * 60)

def validate_database_structure():
    """Validar estrutura do banco de dados"""
    print_section("VALIDAÇÃO DA ESTRUTURA DO BANCO DE DADOS")
    
    success = True
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Verificar se tabela usuarios existe e tem as colunas necessárias
        cursor.execute("PRAGMA table_info(usuarios)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        required_columns = ['id', 'username', 'email', 'password_hash', 'nivel', 'nome', 'unidade', 'setor', 'ativo']
        missing_columns = [col for col in required_columns if col not in column_names]
        
        if missing_columns:
            print(f"❌ Colunas faltantes na tabela usuarios: {missing_columns}")
            success = False
        else:
            print("✅ Tabela usuarios possui todas as colunas necessárias")
        
        # Verificar se tabela login_attempts existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'")
        login_table = cursor.fetchone()
        
        if login_table:
            print("✅ Tabela login_attempts existe")
        else:
            print("❌ Tabela login_attempts não encontrada")
            success = False
            
    except Exception as e:
        print(f"❌ Erro na validação da estrutura: {e}")
        success = False
    finally:
        db.close()
    
    return success

def validate_user_profiles():
    """Validar perfis de usuário no banco"""
    print_section("VALIDAÇÃO DOS PERFIS DE USUÁRIO")
    
    success = True
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Contar usuários por perfil
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
        
        # Verificar se perfis obsoletos foram removidos
        obsolete_profiles = ['inventariante', 'admin_operacional']
        current_profiles = [profile[0] for profile in profiles]
        
        found_obsolete = [prof for prof in obsolete_profiles if prof in current_profiles]
        
        if found_obsolete:
            print(f"❌ Perfis obsoletos ainda existem: {found_obsolete}")
            success = False
        else:
            print("✅ Perfis obsoletos removidos (inventariante, admin_operacional)")
        
        # Mostrar estrutura atual
        print("\n📊 ESTRUTURA ATUAL DOS PERFIS:")
        total_users = 0
        for profile in profiles:
            nivel, total, usuarios = profile
            total_users += total
            print(f"   • {nivel}: {total} usuários")
            if usuarios:
                user_list = usuarios.split(',')
                for user in user_list[:3]:
                    print(f"     - {user}")
                if len(user_list) > 3:
                    print(f"     - ... e mais {len(user_list) - 3} usuários")
        
        print(f"\n📈 Total de usuários no sistema: {total_users}")
        
        # Verificar se usuários específicos foram migrados corretamente
        cursor.execute("SELECT username, nivel FROM usuarios WHERE username IN ('inventariante1', 'inventariante2', 'admin_operacional')")
        migrated_users = cursor.fetchall()
        
        expected_migrations = {
            'inventariante1': 'admin_administrativo',
            'inventariante2': 'admin_administrativo',
            'admin_operacional': 'admin_administrativo'
        }
        
        print("\n🔄 VERIFICAÇÃO DE MIGRAÇÕES:")
        for user, expected_level in expected_migrations.items():
            found = False
            for migrated_user, actual_level in migrated_users:
                if migrated_user == user:
                    found = True
                    if actual_level == expected_level:
                        print(f"   ✅ {user}: migrado para {actual_level}")
                    else:
                        print(f"   ❌ {user}: esperado {expected_level}, encontrado {actual_level}")
                        success = False
                    break
            if not found:
                print(f"   ❌ {user}: usuário não encontrado")
                success = False
        
    except Exception as e:
        print(f"❌ Erro na validação dos perfis: {e}")
        success = False
    finally:
        db.close()
    
    return success

def validate_permissions_file():
    """Validar arquivo de permissões"""
    print_section("VALIDAÇÃO DO ARQUIVO DE PERMISSÕES")
    
    success = True
    permissions_file = 'utils/permissions.py'
    
    if not os.path.exists(permissions_file):
        print("❌ Arquivo utils/permissions.py não encontrado")
        return False
    
    try:
        with open(permissions_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Verificar ROLES
        roles_match = re.search(r'ROLES\s*=\s*\{([^}]+)\}', content, re.DOTALL)
        if roles_match:
            roles_content = roles_match.group(1)
            print("✅ Dicionário ROLES encontrado")
            
            # Verificar se perfis obsoletos foram removidos
            obsolete_in_roles = []
            if 'inventariante' in roles_content:
                obsolete_in_roles.append('inventariante')
            if 'admin_operacional' in roles_content:
                obsolete_in_roles.append('admin_operacional')
            
            if obsolete_in_roles:
                print(f"❌ Perfis obsoletos ainda em ROLES: {obsolete_in_roles}")
                success = False
            else:
                print("✅ Perfis obsoletos removidos do ROLES")
            
            # Mostrar ROLES atual
            print(f"📋 ROLES atual: {roles_content.strip()}")
        else:
            print("❌ Dicionário ROLES não encontrado")
            success = False
        
        # Verificar funções obsoletas
        obsolete_functions = ['inventariante_required', 'admin_operacional_required']
        found_obsolete_functions = []
        
        for func in obsolete_functions:
            if f'def {func}' in content:
                found_obsolete_functions.append(func)
        
        if found_obsolete_functions:
            print(f"❌ Funções obsoletas encontradas: {found_obsolete_functions}")
            success = False
        else:
            print("✅ Funções obsoletas removidas")
        
        # Verificar referências em comentários
        obsolete_refs = []
        if 'inventariante' in content.lower():
            obsolete_refs.append('inventariante')
        if 'admin_operacional' in content.lower():
            obsolete_refs.append('admin_operacional')
        
        if obsolete_refs:
            print(f"❌ Referências obsoletas em comentários: {obsolete_refs}")
            success = False
        else:
            print("✅ Nenhuma referência obsoleta em comentários")
        
    except Exception as e:
        print(f"❌ Erro na validação do arquivo: {e}")
        success = False
    
    return success

def validate_routes_and_templates():
    """Validar rotas e templates"""
    print_section("VALIDAÇÃO DE ROTAS E TEMPLATES")
    
    success = True
    
    # Verificar se nova rota de relatórios existe
    admin_routes_file = 'admin/routes.py'
    if os.path.exists(admin_routes_file):
        try:
            with open(admin_routes_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if "@admin_bp.route('/relatorios')" in content and "@admin_administrativo_only_required" in content:
                print("✅ Rota /admin/relatorios implementada com permissão correta")
            else:
                print("❌ Rota /admin/relatorios não encontrada ou sem permissão correta")
                success = False
                
        except Exception as e:
            print(f"❌ Erro ao verificar rotas: {e}")
            success = False
    else:
        print("❌ Arquivo admin/routes.py não encontrado")
        success = False
    
    # Verificar template de relatórios
    template_file = 'templates/admin/relatorios.html'
    if os.path.exists(template_file):
        print("✅ Template de relatórios criado")
        
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # Verificar elementos essenciais do template
            essential_elements = ['status_counts', 'operacoes_counts', 'ocupacao_unidades']
            missing_elements = [elem for elem in essential_elements if elem not in template_content]
            
            if missing_elements:
                print(f"❌ Elementos faltantes no template: {missing_elements}")
                success = False
            else:
                print("✅ Template possui todos os elementos necessários")
                
        except Exception as e:
            print(f"❌ Erro ao verificar template: {e}")
            success = False
    else:
        print("❌ Template templates/admin/relatorios.html não encontrado")
        success = False
    
    return success

def validate_code_references():
    """Validar referências no código"""
    print_section("VALIDAÇÃO DE REFERÊNCIAS NO CÓDIGO")
    
    success = True
    
    # Arquivos para verificar
    files_to_check = [
        'admin/routes.py',
        'routes/operacoes.py',
        'routes/vistoriador.py',
        'routes/containers.py'
    ]
    
    obsolete_terms = ['inventariante_required', 'admin_operacional_required']
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                found_obsolete = []
                for term in obsolete_terms:
                    if term in content:
                        found_obsolete.append(term)
                
                if found_obsolete:
                    print(f"❌ {file_path}: referências obsoletas encontradas: {found_obsolete}")
                    success = False
                else:
                    print(f"✅ {file_path}: limpo")
                    
            except Exception as e:
                print(f"❌ Erro ao verificar {file_path}: {e}")
                success = False
        else:
            print(f"⚠️  {file_path}: arquivo não encontrado")
    
    return success

def generate_final_report():
    """Gerar relatório final"""
    print_header("RELATÓRIO FINAL DE VALIDAÇÃO")
    
    # Executar todas as validações
    validations = [
        ("Estrutura do Banco de Dados", validate_database_structure()),
        ("Perfis de Usuário", validate_user_profiles()),
        ("Arquivo de Permissões", validate_permissions_file()),
        ("Rotas e Templates", validate_routes_and_templates()),
        ("Referências no Código", validate_code_references())
    ]
    
    print_section("RESUMO DAS VALIDAÇÕES")
    
    all_success = True
    for validation_name, result in validations:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"   {status}: {validation_name}")
        if not result:
            all_success = False
    
    print_section("RESULTADO GERAL")
    
    if all_success:
        print("🎉 TODAS AS VALIDAÇÕES PASSARAM!")
        print("✅ Sistema completamente refatorado e funcional")
        print("\n📋 RESUMO DAS ALTERAÇÕES IMPLEMENTADAS:")
        print("   • Perfil 'inventariante' removido (2 usuários migrados)")
        print("   • Perfil 'admin_operacional' removido (1 usuário migrado)")
        print("   • Nova funcionalidade de relatórios implementada")
        print("   • Código limpo de referências obsoletas")
        print("   • Estrutura de perfis otimizada")
        
        print("\n🚀 SISTEMA PRONTO PARA USO!")
        print("📋 Perfis ativos:")
        print("   • admin: Acesso completo")
        print("   • admin_administrativo: Correção de descargas + relatórios")
        print("   • vistoriador: Vistorias e inspeções")
        print("   • operador: Operações básicas")
        
    else:
        print("❌ ALGUMAS VALIDAÇÕES FALHARAM")
        print("⚠️  Verificar erros acima e corrigir antes de usar o sistema")
    
    print(f"\n📅 Validação executada em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("="*80)
    
    return all_success

def main():
    """Função principal"""
    print_header("VALIDAÇÃO COMPLETA DO SISTEMA DE PERFIS")
    print(f"📅 Executado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    # Executar validação completa
    success = generate_final_report()
    
    if success:
        print("\n🎯 CONCLUSÃO: Refatoração dos perfis concluída com sucesso!")
    else:
        print("\n⚠️  CONCLUSÃO: Há pendências a serem corrigidas.")

if __name__ == "__main__":
    main()
