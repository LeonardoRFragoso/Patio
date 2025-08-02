"""
Módulo de gerenciamento de permissões para controle de acesso baseado em níveis de usuário.
Implementa verificações para os três níveis: Operador, Inventariante e Admin.
"""
from functools import wraps
from flask import session, redirect, url_for, flash, request, jsonify

# Definição dos níveis de acesso em ordem hierárquica
ROLES = {
    'operador': 0,  # Acesso básico
    'vistoriador': 1,  # Acesso para vistorias
    'inventariante': 2,  # Acesso intermediário
    'admin_administrativo': 3,  # Admin com acesso apenas à correção de descarga
    'admin': 4  # Acesso completo
}

def get_user_role():
    """Retorna o nível de acesso do usuário atual."""
    # Verificar tanto 'role' quanto 'nivel' para compatibilidade
    role = session.get('role') or session.get('nivel')
    return role

def has_role(required_role):
    """
    Verifica se o usuário tem o nível de acesso necessário.
    
    Args:
        required_role (str): Nível mínimo necessário ('operador', 'inventariante' ou 'admin')
    
    Returns:
        bool: True se o usuário tem o nível necessário, False caso contrário
    """
    user_role = get_user_role()
    
    if not user_role or user_role not in ROLES:
        return False
    
    return ROLES[user_role] >= ROLES[required_role]

def role_required(required_role):
    """
    Decorator para restringir acesso a rotas com base no nível do usuário.
    
    Args:
        required_role (str): Nível mínimo necessário ('operador', 'inventariante' ou 'admin')
    
    Returns:
        function: Decorator que verifica o nível de acesso
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not has_role(required_role):
                # Verificar se é uma requisição AJAX/JSON
                if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({
                        'success': False,
                        'error': f'Acesso negado. Você precisa ter nível de {required_role} ou superior.'
                    }), 403
                else:
                    flash(f'Acesso negado. Você precisa ter nível de {required_role} ou superior.', 'danger')
                    return redirect(url_for('auth.dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Decorators específicos para cada nível
def admin_required(f):
    """Decorator para restringir acesso apenas a administradores (completos ou administrativos)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_role = get_user_role()
        if user_role not in ['admin', 'admin_administrativo']:
            # Verificar se é uma requisição AJAX/JSON
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': False,
                    'error': 'Acesso negado. Você precisa ter nível de administrador.'
                }), 403
            else:
                flash('Acesso negado. Você precisa ter nível de administrador.', 'danger')
                return redirect(url_for('auth.dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def admin_completo_required(f):
    """Decorator para restringir acesso apenas a administradores completos."""
    return role_required('admin')(f)

def admin_administrativo_required(f):
    """Decorator para restringir acesso apenas a administradores administrativos ou completos."""
    return role_required('admin_administrativo')(f)

def admin_completo_only_required(f):
    """Decorator para restringir acesso APENAS a administradores completos (exclui admin_administrativo)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_role = get_user_role()
        if user_role != 'admin':
            # Verificar se é uma requisição AJAX/JSON
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': False,
                    'error': 'Acesso negado. Você precisa ter nível de administrador completo.'
                }), 403
            else:
                flash('Acesso negado. Você precisa ter nível de administrador completo.', 'danger')
                return redirect(url_for('auth.dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def admin_administrativo_only_required(f):
    """Decorator para restringir acesso APENAS a administradores administrativos (exclui admin completo)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_role = get_user_role()
        if user_role != 'admin_administrativo':
            # Verificar se é uma requisição AJAX/JSON
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': False,
                    'error': 'Acesso negado. Esta funcionalidade é específica para administradores administrativos.'
                }), 403
            else:
                flash('Acesso negado. Esta funcionalidade é específica para administradores administrativos.', 'danger')
                return redirect(url_for('auth.dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def inventariante_required(f):
    """Decorator para restringir acesso a inventariantes e administradores."""
    return role_required('inventariante')(f)

def vistoriador_required(f):
    """Decorator para restringir acesso a vistoriadores, inventariantes e administradores."""
    return role_required('vistoriador')(f)

def operador_required(f):
    """Decorator para restringir acesso a qualquer usuário autenticado."""
    return role_required('operador')(f)

def login_required(f):
    """Decorator para restringir acesso a usuários logados, independente do nível."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verificar se usuário está logado (mais flexível)
        username = session.get('username')
        user_id = session.get('user_id')
        
        # Se não tem username OU user_id, não está logado
        if not username or not user_id:
            # Verificar se é uma requisição AJAX/JSON
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': False,
                    'error': 'Sessão expirada ou usuário não autenticado. Por favor, faça login novamente.'
                }), 401
            else:
                flash('Por favor, faça login para acessar esta página.', 'warning')
                return redirect(url_for('auth.login'))
        
        # Se tem username e user_id mas não tem logged_in, adicionar para compatibilidade
        if 'logged_in' not in session:
            session['logged_in'] = True
            
        return f(*args, **kwargs)
    return decorated_function
