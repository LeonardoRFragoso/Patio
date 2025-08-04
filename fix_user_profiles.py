#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import re
from datetime import datetime

def fix_user_profiles():
    """
    Implementar as 4 recomendações para corrigir os perfis de usuário:
    1. Migrar usuários inventariante para admin_administrativo
    2. Remover o nível inventariante do sistema
    3. Consolidar funcionalidades de inventário no perfil administrativo
    4. Revisar o perfil admin_operacional
    """
    
    print("=" * 80)
    print("CORREÇÃO DOS PERFIS DE USUÁRIO")
    print("=" * 80)
    
    # 1. Migrar usuários inventariante
    migrate_inventariante_users()
    
    # 2. Remover nível inventariante do código
    remove_inventariante_level()
    
    # 3. Consolidar funcionalidades no admin_administrativo
    consolidate_inventory_functions()
    
    # 4. Revisar admin_operacional
    review_admin_operacional()
    
    print("\n✅ CORREÇÕES APLICADAS COM SUCESSO!")
    print("\n📋 PRÓXIMOS PASSOS:")
    print("   1. Reiniciar o servidor para aplicar mudanças")
    print("   2. Testar login dos usuários migrados")
    print("   3. Verificar funcionalidades consolidadas")

def migrate_inventariante_users():
    """1. Migrar usuários do nível inventariante para admin_administrativo"""
    print("\n🔄 1. MIGRANDO USUÁRIOS INVENTARIANTE")
    print("-" * 50)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Buscar usuários inventariante
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'inventariante'")
        inventariante_users = cursor.fetchall()
        
        if not inventariante_users:
            print("   ℹ️ Nenhum usuário inventariante encontrado")
            conn.close()
            return
        
        print(f"   📋 Usuários a migrar: {len(inventariante_users)}")
        for user in inventariante_users:
            print(f"      - {user[0]}")
        
        # Migrar para admin_administrativo
        cursor.execute('''
            UPDATE usuarios 
            SET nivel = 'admin_administrativo',
                ultima_alteracao_senha = ?
            WHERE nivel = 'inventariante'
        ''', (datetime.now().isoformat(),))
        
        migrated_count = cursor.rowcount
        conn.commit()
        
        print(f"   ✅ {migrated_count} usuários migrados para admin_administrativo")
        
        # Verificar migração
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_administrativo'")
        admin_users = cursor.fetchall()
        print(f"   📊 Total de usuários admin_administrativo: {len(admin_users)}")
        for user in admin_users:
            print(f"      - {user[0]}")
        
        conn.close()
        
    except Exception as e:
        print(f"   ❌ Erro na migração: {e}")

def remove_inventariante_level():
    """2. Remover o nível inventariante do sistema"""
    print("\n🗑️ 2. REMOVENDO NÍVEL INVENTARIANTE DO CÓDIGO")
    print("-" * 50)
    
    files_to_update = [
        'utils/permissions.py',
        'app.py',
        'auth/routes.py'
    ]
    
    for filepath in files_to_update:
        if os.path.exists(filepath):
            update_file_remove_inventariante(filepath)
    
    # Remover rota específica do inventariante
    remove_inventariante_route()

def update_file_remove_inventariante(filepath):
    """Atualizar arquivo removendo referências ao inventariante"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remover do dicionário ROLES
        if 'ROLES = {' in content:
            content = re.sub(
                r"'inventariante':\s*\d+,?\s*#[^\n]*\n?", 
                "", 
                content
            )
        
        # Remover decorator inventariante_required
        if 'def inventariante_required' in content:
            # Encontrar e remover a função completa
            pattern = r'def inventariante_required\(f\):.*?return role_required\(\'inventariante\'\)\(f\)'
            content = re.sub(pattern, '', content, flags=re.DOTALL)
        
        # Remover referências em is_inventariante
        content = re.sub(
            r"'is_inventariante':\s*has_role\('inventariante'\),?\s*\n?",
            "",
            content
        )
        
        # Salvar se houve mudanças
        if content != original_content:
            # Criar backup
            backup_path = f"{filepath}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original_content)
            
            # Salvar versão atualizada
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✅ Atualizado: {filepath}")
            print(f"   💾 Backup criado: {backup_path}")
        else:
            print(f"   ℹ️ Nenhuma mudança necessária: {filepath}")
            
    except Exception as e:
        print(f"   ❌ Erro ao atualizar {filepath}: {e}")

def remove_inventariante_route():
    """Remover rota específica do inventariante"""
    print("\n   🛣️ Removendo rota /relatorio do inventariante")
    
    try:
        filepath = 'routes/operacoes.py'
        if not os.path.exists(filepath):
            print(f"   ℹ️ Arquivo {filepath} não encontrado")
            return
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Encontrar e comentar a rota do inventariante
        lines = content.split('\n')
        new_lines = []
        in_inventariante_route = False
        
        for i, line in enumerate(lines):
            if '@inventariante_required' in line:
                in_inventariante_route = True
                new_lines.append(f"# REMOVIDO: {line}")
            elif in_inventariante_route and line.strip().startswith('def relatorio'):
                new_lines.append(f"# REMOVIDO: {line}")
                # Comentar toda a função
                indent_level = len(line) - len(line.lstrip())
                for j in range(i + 1, len(lines)):
                    next_line = lines[j]
                    if next_line.strip() == '' or next_line.startswith(' ' * (indent_level + 1)):
                        new_lines.append(f"# REMOVIDO: {next_line}")
                    else:
                        # Função terminou
                        new_lines.append(next_line)
                        in_inventariante_route = False
                        break
            elif in_inventariante_route and line.strip().startswith('@operacoes_bp.route'):
                new_lines.append(f"# REMOVIDO: {line}")
            else:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        if content != original_content:
            # Criar backup
            backup_path = f"{filepath}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original_content)
            
            # Salvar versão atualizada
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✅ Rota /relatorio removida de {filepath}")
            print(f"   💾 Backup criado: {backup_path}")
        
    except Exception as e:
        print(f"   ❌ Erro ao remover rota: {e}")

def consolidate_inventory_functions():
    """3. Consolidar funcionalidades de inventário no perfil administrativo"""
    print("\n📦 3. CONSOLIDANDO FUNCIONALIDADES DE INVENTÁRIO")
    print("-" * 50)
    
    # Adicionar funcionalidades de inventário ao admin_administrativo
    inventory_functions = [
        "Relatórios de inventário",
        "Controle de estoque de containers", 
        "Análise de ocupação do pátio",
        "Estatísticas de movimentação"
    ]
    
    print("   📋 Funcionalidades a consolidar no admin_administrativo:")
    for func in inventory_functions:
        print(f"      - {func}")
    
    # Criar nova rota de relatórios para admin_administrativo
    create_inventory_route_for_admin()
    
    print("   ✅ Funcionalidades consolidadas no perfil admin_administrativo")

def create_inventory_route_for_admin():
    """Criar rota de relatórios específica para admin_administrativo"""
    try:
        filepath = 'admin/routes.py'
        if not os.path.exists(filepath):
            print(f"   ℹ️ Arquivo {filepath} não encontrado")
            return
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Verificar se já existe a rota
        if '/admin/relatorios' in content:
            print("   ℹ️ Rota de relatórios já existe")
            return
        
        # Adicionar nova rota de relatórios
        new_route = '''
@admin_bp.route('/relatorios')
@admin_administrativo_only_required
def relatorios():
    """Relatórios de inventário para admin administrativo"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Contagem de containers por status
        cursor.execute("""
            SELECT status, COUNT(*) as total
            FROM containers
            GROUP BY status
        """)
        status_counts = cursor.fetchall()
        
        # Contagem de operações por tipo
        cursor.execute("""
            SELECT tipo, COUNT(*) as total
            FROM operacoes
            WHERE DATE(data_operacao) >= DATE('now', '-30 days')
            GROUP BY tipo
        """)
        operacoes_counts = cursor.fetchall()
        
        # Ocupação por unidade
        cursor.execute("""
            SELECT unidade, COUNT(*) as total
            FROM containers
            WHERE posicao_atual IS NOT NULL AND posicao_atual != ''
            GROUP BY unidade
        """)
        ocupacao_unidades = cursor.fetchall()
        
        return render_template('admin/relatorios.html',
                             status_counts=status_counts,
                             operacoes_counts=operacoes_counts,
                             ocupacao_unidades=ocupacao_unidades)
        
    except Exception as e:
        flash(f'Erro ao gerar relatórios: {str(e)}', 'danger')
        return redirect(url_for('admin.admin_administrativo_dashboard'))
'''
        
        # Adicionar no final do arquivo, antes da última linha
        lines = content.split('\n')
        lines.insert(-1, new_route)
        content = '\n'.join(lines)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("   ✅ Nova rota /admin/relatorios criada para admin_administrativo")
        
    except Exception as e:
        print(f"   ❌ Erro ao criar rota de relatórios: {e}")

def review_admin_operacional():
    """4. Revisar o perfil admin_operacional"""
    print("\n🔍 4. REVISANDO PERFIL ADMIN_OPERACIONAL")
    print("-" * 50)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar usuários admin_operacional
        cursor.execute("SELECT username FROM usuarios WHERE nivel = 'admin_operacional'")
        admin_op_users = cursor.fetchall()
        
        if admin_op_users:
            print(f"   📋 Usuários admin_operacional encontrados: {len(admin_op_users)}")
            for user in admin_op_users:
                print(f"      - {user[0]}")
            
            print("\n   💡 RECOMENDAÇÃO:")
            print("      O perfil admin_operacional não possui funcionalidades específicas.")
            print("      Considere migrar para um dos seguintes perfis:")
            print("      - admin_administrativo (se foco em relatórios/correções)")
            print("      - admin (se precisa de acesso completo)")
            print("      - vistoriador (se foco em operações de campo)")
        else:
            print("   ℹ️ Nenhum usuário admin_operacional encontrado")
        
        conn.close()
        
    except Exception as e:
        print(f"   ❌ Erro na revisão: {e}")

if __name__ == "__main__":
    fix_user_profiles()
