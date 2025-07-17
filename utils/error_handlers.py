from flask import jsonify, render_template, request
import logging
from db import log_activity
import traceback

# Configuração de logging para este módulo
logger = logging.getLogger('error_handlers')

def register_error_handlers(app):
    """
    Registra handlers para erros comuns na aplicação
    """
    
    @app.errorhandler(400)
    def bad_request_error(error):
        """Handler para erros 400 (Bad Request)"""
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'bad_request',
                'message': str(error) or 'Requisição inválida'
            }), 400
        return render_template('errors/400.html', error=error), 400
    
    @app.errorhandler(401)
    def unauthorized_error(error):
        """Handler para erros 401 (Unauthorized)"""
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'unauthorized',
                'message': str(error) or 'Não autorizado'
            }), 401
        return render_template('errors/401.html', error=error), 401
    
    @app.errorhandler(403)
    def forbidden_error(error):
        """Handler para erros 403 (Forbidden)"""
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'forbidden',
                'message': str(error) or 'Acesso negado'
            }), 403
        return render_template('errors/403.html', error=error), 403
    
    @app.errorhandler(404)
    def not_found_error(error):
        """Handler para erros 404 (Not Found)"""
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'not_found',
                'message': str(error) or 'Recurso não encontrado'
            }), 404
        return render_template('errors/404.html', error=error), 404
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handler para erros 500 (Internal Server Error)"""
        error_details = traceback.format_exc()
        logger.error(f"Erro interno do servidor: {error}\n{error_details}")
        
        # Registrar erro no log de atividades
        try:
            from flask import session
            username = session.get('username', 'sistema')
            log_activity(
                usuario=username,
                acao='erro_interno',
                detalhes=f"Erro em {request.path}: {str(error)[:200]}"
            )
        except Exception as e:
            logger.error(f"Erro ao registrar erro no log: {e}")
        
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'internal_server_error',
                'message': 'Erro interno do servidor'
            }), 500
        return render_template('errors/500.html', error=error), 500
    
    @app.errorhandler(405)
    def method_not_allowed_error(error):
        """Handler para erros 405 (Method Not Allowed)"""
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'method_not_allowed',
                'message': f'Método {request.method} não permitido para esta rota'
            }), 405
        return render_template('errors/405.html', error=error), 405
    
    @app.errorhandler(429)
    def too_many_requests_error(error):
        """Handler para erros 429 (Too Many Requests)"""
        if request.path.startswith('/operacoes/') or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'too_many_requests',
                'message': 'Muitas requisições. Por favor, tente novamente mais tarde.'
            }), 429
        return render_template('errors/429.html', error=error), 429
    
    logger.info("Handlers de erro registrados com sucesso")
