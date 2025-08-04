#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sqlite3
from collections import defaultdict

def detailed_profile_analysis():
    """Análise detalhada das funcionalidades por perfil"""
    
    print("=" * 100)
    print("MAPEAMENTO DETALHADO DE FUNCIONALIDADES POR PERFIL")
    print("=" * 100)
    
    # Mapear funcionalidades específicas
    profiles = {
        'OPERADOR': analyze_operador_functions(),
        'VISTORIADOR': analyze_vistoriador_functions(),
        'INVENTARIANTE': analyze_inventariante_functions(),
        'ADMIN_OPERACIONAL': analyze_admin_operacional_functions(),
        'ADMIN_ADMINISTRATIVO': analyze_admin_administrativo_functions(),
        'ADMIN_COMPLETO': analyze_admin_completo_functions()
    }
    
    for profile, functions in profiles.items():
        print(f"\n🔹 {profile}")
        print("=" * 80)
        
        if functions['routes']:
            print("📍 ROTAS ESPECÍFICAS:")
            for route in sorted(functions['routes']):
                print(f"   {route}")
        
        if functions['templates']:
            print("\n📄 TEMPLATES ESPECÍFICOS:")
            for template in sorted(functions['templates']):
                print(f"   {template}")
        
        if functions['description']:
            print(f"\n📝 DESCRIÇÃO:")
            print(f"   {functions['description']}")
    
    # Análise específica do inventariante
    analyze_inventariante_issue()

def analyze_operador_functions():
    """Analisar funcionalidades do operador"""
    routes = []
    templates = []
    
    # Buscar rotas com @operador_required
    routes.extend(find_routes_with_decorator('operador_required'))
    
    # Templates específicos
    templates = [
        'templates/auth/dashboard.html (dashboard principal)',
        'templates/operacoes/nova_operacao.html',
        'templates/operacoes/listar_operacoes.html'
    ]
    
    description = """
    Perfil básico do sistema. Pode realizar operações básicas de movimentação de containers,
    registrar operações e consultar informações básicas do pátio.
    """
    
    return {
        'routes': routes,
        'templates': templates,
        'description': description.strip()
    }

def analyze_vistoriador_functions():
    """Analisar funcionalidades do vistoriador"""
    routes = []
    templates = []
    
    # Buscar rotas com @vistoriador_required
    routes.extend(find_routes_with_decorator('vistoriador_required'))
    
    # Analisar arquivo vistoriador.py especificamente
    vistoriador_routes = analyze_vistoriador_file()
    routes.extend(vistoriador_routes)
    
    templates = [
        'templates/auth/dashboard_vistoriador.html',
        'templates/vistoriador/* (todos os templates de vistoria)'
    ]
    
    description = """
    Perfil para inspeção e vistoria de containers. Pode realizar vistorias,
    registrar condições dos containers, gerenciar estruturas e avarias.
    Herda funcionalidades do operador.
    """
    
    return {
        'routes': routes,
        'templates': templates,
        'description': description.strip()
    }

def analyze_inventariante_functions():
    """Analisar funcionalidades do inventariante"""
    routes = []
    templates = []
    
    # Buscar rotas com @inventariante_required
    routes.extend(find_routes_with_decorator('inventariante_required'))
    
    # Verificar se existe diretório de templates
    if os.path.exists('templates/inventariante'):
        for file in os.listdir('templates/inventariante'):
            if file.endswith('.html'):
                templates.append(f'templates/inventariante/{file}')
    
    description = """
    Perfil intermediário para controle de inventário. Herda funcionalidades
    do vistoriador e operador. Pode gerenciar inventário de containers.
    """
    
    return {
        'routes': routes,
        'templates': templates,
        'description': description.strip()
    }

def analyze_admin_operacional_functions():
    """Analisar funcionalidades do admin operacional"""
    routes = []
    templates = []
    
    # Buscar rotas específicas (se existirem)
    routes.extend(find_routes_with_decorator('admin_operacional_required'))
    
    description = """
    Perfil administrativo operacional. Funcionalidades específicas não claramente
    definidas no código atual. Pode ser um perfil em desenvolvimento.
    """
    
    return {
        'routes': routes,
        'templates': templates,
        'description': description.strip()
    }

def analyze_admin_administrativo_functions():
    """Analisar funcionalidades do admin administrativo"""
    routes = []
    templates = []
    
    # Buscar rotas específicas
    routes.extend(find_routes_with_decorator('admin_administrativo_only_required'))
    routes.extend(find_routes_with_decorator('admin_required'))
    
    # Templates específicos
    templates = [
        'templates/admin/admin_administrativo_dashboard.html',
        'templates/admin/historico_containers.html',
        'templates/admin/corrigir_descarga.html'
    ]
    
    # Analisar rotas específicas no admin/routes.py
    admin_routes = analyze_admin_routes_file()
    routes.extend(admin_routes)
    
    description = """
    Perfil administrativo com foco em correção de descargas e histórico completo.
    Pode ajustar descargas de TODAS as unidades e visualizar histórico completo
    de containers. NÃO pode gerenciar usuários ou estruturas.
    """
    
    return {
        'routes': routes,
        'templates': templates,
        'description': description.strip()
    }

def analyze_admin_completo_functions():
    """Analisar funcionalidades do admin completo"""
    routes = []
    templates = []
    
    # Buscar rotas específicas
    routes.extend(find_routes_with_decorator('admin_completo_only_required'))
    routes.extend(find_routes_with_decorator('admin_required'))
    
    # Templates específicos
    templates = [
        'templates/admin/dashboard.html',
        'templates/admin/usuarios.html',
        'templates/admin/novo_usuario.html',
        'templates/admin/editar_usuario.html',
        'templates/admin/solicitacoes.html',
        'templates/admin/estruturas_avarias.html'
    ]
    
    description = """
    Perfil com acesso completo ao sistema. Pode gerenciar usuários, estruturas,
    avarias, realizar todas as operações administrativas, migração de dados,
    validação de posições, etc. Acesso total a todas as funcionalidades.
    """
    
    return {
        'routes': routes,
        'templates': templates,
        'description': description.strip()
    }

def find_routes_with_decorator(decorator):
    """Encontrar rotas que usam um decorador específico"""
    routes = []
    
    # Arquivos para analisar
    files_to_check = [
        'auth/routes.py',
        'admin/routes.py',
        'routes/operacoes.py',
        'routes/vistoriador.py',
        'routes/containers.py',
        'routes/placas_api.py'
    ]
    
    for filepath in files_to_check:
        if os.path.exists(filepath):
            routes.extend(extract_routes_from_file(filepath, decorator))
    
    return routes

def extract_routes_from_file(filepath, target_decorator):
    """Extrair rotas de um arquivo que usam um decorador específico"""
    routes = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
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
                    
                    # Verificar se tem o decorador alvo
                    if target_decorator in current_decorators:
                        # Buscar método HTTP
                        methods = []
                        if 'methods=' in line:
                            methods_match = re.search(r"methods=\[([^\]]+)\]", line)
                            if methods_match:
                                methods = [m.strip().replace("'", "").replace('"', '') 
                                         for m in methods_match.group(1).split(',')]
                        
                        # Buscar função na próxima linha
                        func_name = "unknown"
                        if i + 1 < len(lines):
                            func_line = lines[i + 1].strip()
                            if func_line.startswith('def '):
                                func_name = func_line.split('(')[0].replace('def ', '')
                        
                        method_str = f"[{','.join(methods)}]" if methods else "[GET]"
                        routes.append(f"{method_str} {route} -> {func_name}() [{filepath}]")
                
                current_decorators = []
            
            # Limpar decoradores se não for uma linha de decorator ou rota
            elif not line.startswith('@') and line:
                current_decorators = []
                
    except Exception as e:
        print(f"Erro ao analisar {filepath}: {e}")
    
    return routes

def analyze_vistoriador_file():
    """Análise específica do arquivo vistoriador.py"""
    routes = []
    
    if not os.path.exists('routes/vistoriador.py'):
        return routes
    
    try:
        with open('routes/vistoriador.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Buscar todas as rotas definidas
        route_matches = re.findall(r"@vistoriador_bp\.route\(['\"]([^'\"]+)['\"].*?\)\s*\ndef\s+(\w+)", content, re.DOTALL)
        
        for route, func in route_matches:
            routes.append(f"[GET/POST] {route} -> {func}() [routes/vistoriador.py]")
    
    except Exception as e:
        print(f"Erro ao analisar vistoriador.py: {e}")
    
    return routes

def analyze_admin_routes_file():
    """Análise específica do arquivo admin/routes.py"""
    routes = []
    
    if not os.path.exists('admin/routes.py'):
        return routes
    
    try:
        with open('admin/routes.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Buscar rotas específicas do admin administrativo
        admin_adm_routes = [
            '/admin/admin-administrativo',
            '/admin/historico-containers',
            '/admin/api/historico-containers',
            '/admin/api/container-detalhes/<id>',
            '/admin/api/unidades'
        ]
        
        for route in admin_adm_routes:
            if route in content:
                routes.append(f"[GET/POST] {route} -> admin_administrativo [admin/routes.py]")
    
    except Exception as e:
        print(f"Erro ao analisar admin/routes.py: {e}")
    
    return routes

def analyze_inventariante_issue():
    """Análise específica do problema do inventariante"""
    print(f"\n🚨 ANÁLISE DO PROBLEMA: INVENTARIANTE")
    print("=" * 80)
    
    # Buscar todas as referências ao inventariante no código
    inventariante_usage = []
    
    try:
        # Buscar em operacoes.py
        if os.path.exists('routes/operacoes.py'):
            with open('routes/operacoes.py', 'r', encoding='utf-8') as f:
                content = f.read()
                if '@inventariante_required' in content:
                    # Encontrar a linha específica
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if '@inventariante_required' in line:
                            # Buscar a rota na linha seguinte
                            if i + 1 < len(lines) and '.route(' in lines[i + 1]:
                                route_match = re.search(r"route\(['\"]([^'\"]+)['\"]", lines[i + 1])
                                if route_match:
                                    route = route_match.group(1)
                                    inventariante_usage.append(f"Rota: {route} (linha {i + 2})")
        
        print("📍 FUNCIONALIDADES ESPECÍFICAS DO INVENTARIANTE ENCONTRADAS:")
        if inventariante_usage:
            for usage in inventariante_usage:
                print(f"   {usage}")
        else:
            print("   ❌ NENHUMA funcionalidade específica encontrada!")
        
        print(f"\n💡 RECOMENDAÇÃO:")
        print(f"   O nível 'inventariante' parece ter sido criado mas não tem funcionalidades")
        print(f"   específicas implementadas. As funcionalidades de inventário deveriam")
        print(f"   estar no perfil 'admin_administrativo' conforme mencionado pelo usuário.")
        
        print(f"\n📋 USUÁRIOS INVENTARIANTE CADASTRADOS:")
        try:
            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            cursor.execute("SELECT username FROM usuarios WHERE nivel = 'inventariante'")
            users = cursor.fetchall()
            for user in users:
                print(f"   - {user[0]}")
            conn.close()
        except Exception as e:
            print(f"   Erro ao buscar usuários: {e}")
            
    except Exception as e:
        print(f"Erro na análise: {e}")

if __name__ == "__main__":
    detailed_profile_analysis()
