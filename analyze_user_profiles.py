#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sqlite3
from collections import defaultdict

def analyze_user_profiles():
    """Análise completa dos perfis de usuário, funcionalidades, rotas e templates"""
    
    print("=" * 100)
    print("ANÁLISE COMPLETA DOS PERFIS DE USUÁRIO")
    print("=" * 100)
    
    # 1. Verificar usuários cadastrados
    check_users()
    
    # 2. Mapear decoradores de permissão
    map_permission_decorators()
    
    # 3. Mapear rotas por perfil
    map_routes_by_profile()
    
    # 4. Mapear templates por perfil
    map_templates_by_profile()
    
    # 5. Análise específica do inventariante
    analyze_inventariante_functionality()

def check_users():
    """Verificar usuários cadastrados por nível"""
    print("\n📊 USUÁRIOS CADASTRADOS POR NÍVEL")
    print("-" * 60)
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT nivel, COUNT(*) FROM usuarios GROUP BY nivel ORDER BY nivel')
        levels = cursor.fetchall()
        
        for nivel, count in levels:
            cursor.execute('SELECT username FROM usuarios WHERE nivel = ? ORDER BY username', (nivel,))
            users = cursor.fetchall()
            usernames = [u[0] for u in users]
            
            print(f"🔹 {nivel.upper()}: {count} usuários")
            print(f"   Usuários: {', '.join(usernames)}")
        
        conn.close()
        
    except Exception as e:
        print(f"Erro: {e}")

def map_permission_decorators():
    """Mapear todos os decoradores de permissão"""
    print("\n🔐 DECORADORES DE PERMISSÃO ENCONTRADOS")
    print("-" * 60)
    
    decorators = set()
    
    # Buscar em todos os arquivos Python
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Buscar decoradores @*_required
                        matches = re.findall(r'@(\w*_required)', content)
                        decorators.update(matches)
                except:
                    pass
    
    for decorator in sorted(decorators):
        print(f"  - @{decorator}")

def map_routes_by_profile():
    """Mapear rotas específicas por perfil"""
    print("\n🛣️ ROTAS POR PERFIL DE USUÁRIO")
    print("-" * 60)
    
    routes_by_profile = defaultdict(list)
    
    # Mapear rotas por arquivo
    route_files = [
        'auth/routes.py',
        'admin/routes.py', 
        'routes/operacoes.py',
        'routes/vistoriador.py',
        'routes/containers.py',
        'routes/placas_api.py'
    ]
    
    for route_file in route_files:
        if os.path.exists(route_file):
            analyze_routes_in_file(route_file, routes_by_profile)
    
    # Exibir rotas por perfil
    for profile in sorted(routes_by_profile.keys()):
        print(f"\n🔹 {profile.upper()}:")
        for route in sorted(routes_by_profile[profile]):
            print(f"   {route}")

def analyze_routes_in_file(filepath, routes_by_profile):
    """Analisar rotas em um arquivo específico"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Buscar padrões de rotas com decoradores
        lines = content.split('\n')
        current_decorators = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Detectar decoradores
            if line.startswith('@') and '_required' in line:
                decorator = line.replace('@', '').replace('()', '')
                current_decorators.append(decorator)
            
            # Detectar definição de rota
            elif line.startswith('@') and '.route(' in line:
                route_match = re.search(r"route\(['\"]([^'\"]+)['\"]", line)
                if route_match:
                    route = route_match.group(1)
                    
                    # Buscar função na próxima linha
                    if i + 1 < len(lines):
                        func_line = lines[i + 1].strip()
                        if func_line.startswith('def '):
                            func_name = func_line.split('(')[0].replace('def ', '')
                            
                            # Mapear para perfis baseado nos decoradores
                            for decorator in current_decorators:
                                profile = map_decorator_to_profile(decorator)
                                if profile:
                                    routes_by_profile[profile].append(f"{route} ({func_name})")
                    
                    current_decorators = []
            
            # Limpar decoradores se não for uma linha de decorator ou rota
            elif not line.startswith('@') and line:
                current_decorators = []
                
    except Exception as e:
        print(f"Erro ao analisar {filepath}: {e}")

def map_decorator_to_profile(decorator):
    """Mapear decorador para perfil de usuário"""
    mapping = {
        'admin_required': 'admin/admin_administrativo',
        'admin_completo_only_required': 'admin',
        'admin_administrativo_only_required': 'admin_administrativo',
        'operador_required': 'operador',
        'vistoriador_required': 'vistoriador',
        'inventariante_required': 'inventariante',
        'admin_operacional_required': 'admin_operacional',
        'login_required': 'todos_logados'
    }
    return mapping.get(decorator)

def map_templates_by_profile():
    """Mapear templates específicos por perfil"""
    print("\n📄 TEMPLATES POR PERFIL")
    print("-" * 60)
    
    template_dirs = [
        'templates/auth',
        'templates/admin', 
        'templates/operacoes',
        'templates/vistoriador',
        'templates/inventariante'
    ]
    
    for template_dir in template_dirs:
        if os.path.exists(template_dir):
            print(f"\n🔹 {template_dir.upper()}:")
            for file in os.listdir(template_dir):
                if file.endswith('.html'):
                    print(f"   {file}")

def analyze_inventariante_functionality():
    """Análise específica das funcionalidades do inventariante"""
    print("\n🔍 ANÁLISE ESPECÍFICA: INVENTARIANTE")
    print("-" * 60)
    
    # Buscar todas as referências ao inventariante
    inventariante_refs = []
    
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        lines = content.split('\n')
                        
                        for i, line in enumerate(lines, 1):
                            if 'inventariante' in line.lower():
                                inventariante_refs.append({
                                    'file': filepath,
                                    'line': i,
                                    'content': line.strip()
                                })
                except:
                    pass
    
    print("Referências ao inventariante encontradas:")
    for ref in inventariante_refs[:20]:  # Limitar a 20 resultados
        print(f"  📁 {ref['file']}:{ref['line']}")
        print(f"     {ref['content']}")
        print()
    
    if len(inventariante_refs) > 20:
        print(f"... e mais {len(inventariante_refs) - 20} referências")

if __name__ == "__main__":
    analyze_user_profiles()
