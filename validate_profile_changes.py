#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import re

def validate_profile_changes():
    """Validar se todas as mudanças nos perfis foram aplicadas corretamente"""
    
    print("=" * 80)
    print("VALIDAÇÃO DAS MUDANÇAS NOS PERFIS DE USUÁRIO")
    print("=" * 80)
    
    all_valid = True
    
    # 1. Validar migração de usuários
    all_valid &= validate_user_migration()
    
    # 2. Validar remoção do nível inventariante
    all_valid &= validate_inventariante_removal()
    
    # 3. Validar nova funcionalidade de relatórios
    all_valid &= validate_reports_functionality()
    
    # 4. Validar estrutura atual dos perfis
    all_valid &= validate_current_profile_structure()
    
    print(f"\n{'='*80}")
    if all_valid:
        print("✅ TODAS AS VALIDAÇÕES PASSARAM!")
        print("🎉 Sistema de perfis corrigido com sucesso!")
    else:
        print("❌ ALGUMAS VALIDAÇÕES FALHARAM!")
        print("⚠️ Verifique os problemas reportados acima")
    print(f"{'='*80}")
    
    return all_valid

def validate_user_migration():
    """Validar se os usuários foram migrados corretamente"""
    print("\n🔄 1. VALIDANDO MIGRAÇÃO DE USUÁRIOS")
    print("-" * 50)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar se não há mais usuários inventariante
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'inventariante'")
        inventariante_count = cursor.fetchone()[0]
        
        if inventariante_count == 0:
            print("   ✅ Nenhum usuário inventariante encontrado (correto)")
        else:
            print(f"   ❌ Ainda existem {inventariante_count} usuários inventariante")
            conn.close()
            return False
        
        # Verificar usuários admin_administrativo
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_administrativo'")
        admin_adm_users = cursor.fetchall()
        
        expected_users = ['admin_adm', 'inventariante1', 'inventariante2']
        actual_users = [user[0] for user in admin_adm_users]
        
        print(f"   📋 Usuários admin_administrativo: {len(actual_users)}")
        for user in actual_users:
            status = "✅" if user in expected_users else "⚠️"
            print(f"      {status} {user}")
        
        if set(actual_users) >= set(expected_users):
            print("   ✅ Migração de usuários validada")
            conn.close()
            return True
        else:
            print("   ❌ Usuários esperados não encontrados")
            conn.close()
            return False
            
    except Exception as e:
        print(f"   ❌ Erro na validação: {e}")
        return False

def validate_inventariante_removal():
    """Validar se o nível inventariante foi removido do código"""
    print("\n🗑️ 2. VALIDANDO REMOÇÃO DO NÍVEL INVENTARIANTE")
    print("-" * 50)
    
    files_to_check = {
        'utils/permissions.py': ['ROLES', 'inventariante_required'],
        'app.py': ['is_inventariante'],
        'routes/operacoes.py': ['@inventariante_required']
    }
    
    all_removed = True
    
    for filepath, patterns in files_to_check.items():
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                file_clean = True
                for pattern in patterns:
                    if pattern in content and not content.count(f"# REMOVIDO: {pattern}") > 0:
                        # Verificar se não é apenas um comentário ou backup
                        lines_with_pattern = [line for line in content.split('\n') 
                                            if pattern in line and not line.strip().startswith('#')]
                        if lines_with_pattern:
                            print(f"   ❌ {filepath}: '{pattern}' ainda presente")
                            file_clean = False
                
                if file_clean:
                    print(f"   ✅ {filepath}: Limpo de referências inventariante")
                else:
                    all_removed = False
                    
            except Exception as e:
                print(f"   ❌ Erro ao verificar {filepath}: {e}")
                all_removed = False
        else:
            print(f"   ⚠️ {filepath}: Arquivo não encontrado")
    
    return all_removed

def validate_reports_functionality():
    """Validar se a nova funcionalidade de relatórios foi criada"""
    print("\n📦 3. VALIDANDO FUNCIONALIDADE DE RELATÓRIOS")
    print("-" * 50)
    
    # Verificar se a rota foi adicionada
    admin_routes_file = 'admin/routes.py'
    template_file = 'templates/admin/relatorios.html'
    
    route_exists = False
    template_exists = False
    
    # Verificar rota
    if os.path.exists(admin_routes_file):
        try:
            with open(admin_routes_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if "/admin/relatorios" in content and "@admin_administrativo_only_required" in content:
                print("   ✅ Rota /admin/relatorios criada com permissão correta")
                route_exists = True
            else:
                print("   ❌ Rota /admin/relatorios não encontrada ou sem permissão")
        except Exception as e:
            print(f"   ❌ Erro ao verificar rota: {e}")
    else:
        print(f"   ❌ Arquivo {admin_routes_file} não encontrado")
    
    # Verificar template
    if os.path.exists(template_file):
        print("   ✅ Template de relatórios criado")
        template_exists = True
    else:
        print("   ❌ Template de relatórios não encontrado")
    
    return route_exists and template_exists

def validate_current_profile_structure():
    """Validar estrutura atual dos perfis"""
    print("\n🔍 4. VALIDANDO ESTRUTURA ATUAL DOS PERFIS")
    print("-" * 50)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Buscar todos os níveis atuais
        cursor.execute("SELECT nivel, COUNT(*) FROM usuarios GROUP BY nivel ORDER BY nivel")
        current_levels = cursor.fetchall()
        
        expected_levels = {
            'admin': 'Acesso completo',
            'admin_administrativo': 'Correção de descargas e relatórios',
            'admin_operacional': 'Perfil a revisar',
            'operador': 'Operações básicas',
            'vistoriador': 'Vistorias e inspeções'
        }
        
        print("   📊 ESTRUTURA ATUAL DOS PERFIS:")
        
        structure_valid = True
        for nivel, count in current_levels:
            if nivel in expected_levels:
                status = "✅"
                description = expected_levels[nivel]
            elif nivel == 'inventariante':
                status = "❌"
                description = "DEVE SER REMOVIDO"
                structure_valid = False
            else:
                status = "⚠️"
                description = "Perfil não documentado"
            
            print(f"      {status} {nivel}: {count} usuários - {description}")
        
        # Verificar se inventariante foi completamente removido
        inventariante_exists = any(nivel == 'inventariante' for nivel, _ in current_levels)
        if inventariante_exists:
            print("   ❌ Nível inventariante ainda existe no banco!")
            structure_valid = False
        
        conn.close()
        return structure_valid
        
    except Exception as e:
        print(f"   ❌ Erro na validação: {e}")
        return False

if __name__ == "__main__":
    validate_profile_changes()
