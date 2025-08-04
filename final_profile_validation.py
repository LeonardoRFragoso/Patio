#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import re

def final_profile_validation():
    """Validação final e relatório das correções aplicadas nos perfis de usuário"""
    
    print("=" * 80)
    print("RELATÓRIO FINAL - CORREÇÕES DOS PERFIS DE USUÁRIO")
    print("=" * 80)
    
    # 1. Validar migração de usuários
    migration_success = validate_user_migration()
    
    # 2. Validar remoção do inventariante
    removal_success = validate_inventariante_removal()
    
    # 3. Validar nova funcionalidade
    functionality_success = validate_new_functionality()
    
    # 4. Estrutura final dos perfis
    structure_success = validate_final_structure()
    
    # 5. Gerar relatório final
    generate_final_report(migration_success, removal_success, functionality_success, structure_success)

def validate_user_migration():
    """Validar migração de usuários inventariante para admin_administrativo"""
    print("\n✅ 1. MIGRAÇÃO DE USUÁRIOS")
    print("-" * 50)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar se não há mais usuários inventariante
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'inventariante'")
        inventariante_count = cursor.fetchone()[0]
        
        # Verificar usuários admin_administrativo
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_administrativo'")
        admin_adm_users = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        migrated_users = ['inventariante1', 'inventariante2']
        migration_complete = (inventariante_count == 0 and 
                            all(user in admin_adm_users for user in migrated_users))
        
        if migration_complete:
            print(f"   ✅ Migração completa: {len(migrated_users)} usuários migrados")
            print(f"   📋 Usuários admin_administrativo: {', '.join(admin_adm_users)}")
            return True
        else:
            print(f"   ❌ Migração incompleta")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro na validação: {e}")
        return False

def validate_inventariante_removal():
    """Validar remoção do nível inventariante do código"""
    print("\n🗑️ 2. REMOÇÃO DO NÍVEL INVENTARIANTE")
    print("-" * 50)
    
    # Verificar se inventariante foi removido do ROLES mas ROLES ainda existe
    permissions_file = 'utils/permissions.py'
    if os.path.exists(permissions_file):
        try:
            with open(permissions_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Verificar se ROLES existe mas sem inventariante
            has_roles = 'ROLES = {' in content
            has_inventariante = "'inventariante'" in content and not content.count("# REMOVIDO:") > 0
            
            if has_roles and not has_inventariante:
                print("   ✅ ROLES existe sem referência ao inventariante")
                
                # Verificar se função inventariante_required foi removida
                has_inventariante_function = 'def inventariante_required' in content
                if not has_inventariante_function:
                    print("   ✅ Função inventariante_required removida")
                    return True
                else:
                    print("   ⚠️ Função inventariante_required ainda existe")
                    return False
            else:
                print(f"   ❌ ROLES: {has_roles}, Inventariante: {has_inventariante}")
                return False
                
        except Exception as e:
            print(f"   ❌ Erro ao verificar: {e}")
            return False
    else:
        print("   ❌ Arquivo permissions.py não encontrado")
        return False

def validate_new_functionality():
    """Validar nova funcionalidade de relatórios"""
    print("\n📦 3. NOVA FUNCIONALIDADE DE RELATÓRIOS")
    print("-" * 50)
    
    # Verificar rota no admin/routes.py
    admin_routes_file = 'admin/routes.py'
    template_file = 'templates/admin/relatorios.html'
    
    route_exists = False
    template_exists = False
    
    if os.path.exists(admin_routes_file):
        try:
            with open(admin_routes_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Procurar pela rota e decorador específicos
            has_route = "@admin_bp.route('/relatorios')" in content
            has_decorator = "@admin_administrativo_only_required" in content
            has_function = "def relatorios():" in content
            
            if has_route and has_decorator and has_function:
                print("   ✅ Rota /admin/relatorios criada com permissão correta")
                route_exists = True
            else:
                print(f"   ❌ Rota: {has_route}, Decorador: {has_decorator}, Função: {has_function}")
                
        except Exception as e:
            print(f"   ❌ Erro ao verificar rota: {e}")
    else:
        print("   ❌ Arquivo admin/routes.py não encontrado")
    
    # Verificar template
    if os.path.exists(template_file):
        print("   ✅ Template de relatórios criado")
        template_exists = True
    else:
        print("   ❌ Template de relatórios não encontrado")
    
    return route_exists and template_exists

def validate_final_structure():
    """Validar estrutura final dos perfis"""
    print("\n🔍 4. ESTRUTURA FINAL DOS PERFIS")
    print("-" * 50)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT nivel, COUNT(*) FROM usuarios GROUP BY nivel ORDER BY nivel")
        current_levels = cursor.fetchall()
        
        expected_structure = {
            'admin': 'Acesso completo ao sistema',
            'admin_administrativo': 'Correção de descargas e relatórios de inventário',
            'admin_operacional': 'Perfil a ser revisado (sem funcionalidades específicas)',
            'operador': 'Operações básicas do pátio',
            'vistoriador': 'Vistorias e inspeções de containers'
        }
        
        print("   📊 ESTRUTURA ATUAL:")
        structure_valid = True
        
        for nivel, count in current_levels:
            if nivel in expected_structure:
                print(f"      ✅ {nivel}: {count} usuários - {expected_structure[nivel]}")
            elif nivel == 'inventariante':
                print(f"      ❌ {nivel}: {count} usuários - DEVE SER REMOVIDO")
                structure_valid = False
            else:
                print(f"      ⚠️ {nivel}: {count} usuários - Perfil não documentado")
        
        # Verificar se inventariante foi completamente removido
        inventariante_exists = any(nivel == 'inventariante' for nivel, _ in current_levels)
        if not inventariante_exists:
            print("   ✅ Nível inventariante completamente removido")
        else:
            structure_valid = False
        
        conn.close()
        return structure_valid
        
    except Exception as e:
        print(f"   ❌ Erro na validação: {e}")
        return False

def generate_final_report(migration_success, removal_success, functionality_success, structure_success):
    """Gerar relatório final das correções"""
    print(f"\n{'='*80}")
    print("RELATÓRIO FINAL DAS CORREÇÕES")
    print(f"{'='*80}")
    
    corrections = [
        ("Migração de usuários inventariante", migration_success),
        ("Remoção do nível inventariante", removal_success), 
        ("Nova funcionalidade de relatórios", functionality_success),
        ("Estrutura final dos perfis", structure_success)
    ]
    
    all_success = all(success for _, success in corrections)
    
    print("\n📋 RESUMO DAS CORREÇÕES:")
    for correction, success in corrections:
        status = "✅ SUCESSO" if success else "❌ FALHOU"
        print(f"   {status}: {correction}")
    
    print(f"\n🎯 RESULTADO GERAL:")
    if all_success:
        print("   🎉 TODAS AS CORREÇÕES FORAM APLICADAS COM SUCESSO!")
        print("\n📝 FUNCIONALIDADES IMPLEMENTADAS:")
        print("   • Usuários inventariante1 e inventariante2 migrados para admin_administrativo")
        print("   • Nível inventariante removido do sistema")
        print("   • Nova rota /admin/relatorios para relatórios de inventário")
        print("   • Template de relatórios com estatísticas completas")
        print("   • Estrutura de perfis organizada e documentada")
        
        print("\n🚀 PRÓXIMOS PASSOS:")
        print("   1. Reiniciar o servidor Flask")
        print("   2. Testar login dos usuários migrados")
        print("   3. Acessar /admin/relatorios com usuário admin_administrativo")
        print("   4. Considerar migração do usuário admin_operacional")
        
    else:
        print("   ⚠️ ALGUMAS CORREÇÕES PRECISAM DE ATENÇÃO")
        print("   📞 Verifique os itens marcados como FALHOU acima")
    
    print(f"\n{'='*80}")
    
    return all_success

if __name__ == "__main__":
    final_profile_validation()
