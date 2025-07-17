"""
Módulo de utilitários para gerenciamento de proteção CSRF (Cross-Site Request Forgery).
Fornece funções para integração com Flask-WTF e manipulação de tokens CSRF.
"""
from flask_wtf.csrf import validate_csrf as flask_validate_csrf
from flask_wtf.csrf import generate_csrf
from flask import request, jsonify
from functools import wraps

def csrf(f):
    """
    Decorator para validação de token CSRF em rotas.
    Verifica a presença e validade do token CSRF no cabeçalho X-CSRFToken ou no formulário.
    
    Args:
        f (callable): Função a ser decorada.
        
    Returns:
        callable: Função decorada que valida o token CSRF antes de executar.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Obter token CSRF do cabeçalho ou do formulário
        csrf_token = request.headers.get('X-CSRFToken') or request.form.get('csrf_token')
        
        # Se não houver token, rejeitar a requisição
        if not csrf_token:
            return jsonify({'success': False, 'error': 'Token CSRF ausente'}), 400
        
        try:
            # Validar o token CSRF
            flask_validate_csrf(csrf_token)
        except Exception as e:
            return jsonify({'success': False, 'error': f'Token CSRF inválido ou expirado: {e}'}), 400
        
        return f(*args, **kwargs)
    return decorated_function

def get_csrf_token():
    """
    Gera e retorna um novo token CSRF.
    
    Returns:
        str: Token CSRF válido.
    """
    return generate_csrf()
