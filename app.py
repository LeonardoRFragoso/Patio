from flask import Flask, render_template, g, session, request, redirect, url_for, jsonify
from flask_wtf.csrf import CSRFProtect, generate_csrf
from auth.routes import auth_bp
from admin.routes import admin_bp
from routes.operacoes import operacoes_bp
from routes.vistoriador import vistoriador_bp
from routes.visualizacao import visualizacao_bp
from utils.sharepoint_data import sharepoint_bp
from routes.posicoes import posicoes_bp
from routes.operacoes_posicoes import bp_posicoes_mov
from config import Config
from db import init_db, create_tables, inicializar_estruturas_avarias_padrao, verificar_integridade_db
from datetime import datetime
from utils.permissions import get_user_role, has_role
import logging
from functools import wraps

# Configurar logging
logging.basicConfig(level=logging.DEBUG)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Inicializar proteção CSRF
    csrf = CSRFProtect()
    csrf.init_app(app)
    
    # Configurar o nome do campo CSRF para corresponder ao que estamos usando nos templates
    app.config['WTF_CSRF_FIELD_NAME'] = 'csrf_token'
    app.config['WTF_CSRF_HEADER_NAME'] = 'X-CSRFToken'
    
    # Inicializar banco de dados
    init_db(app)
    
    # Criar tabelas se não existirem
    with app.app_context():
        create_tables()
        
    # Inicializar estruturas e avarias padrão
    with app.app_context():
        from db import inicializar_estruturas_avarias_padrao, verificar_integridade_db
        verificar_integridade_db()
        inicializar_estruturas_avarias_padrao()
        
    # Registrar handlers de erro
    from utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    # Adicionar cabeçalhos CORS
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5000'  # Ou '*' para desenvolvimento
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Rota para obter token CSRF
    @app.route('/api/csrf-token', methods=['GET'])
    def get_csrf_token():
        token = generate_csrf()
        response = jsonify({'csrf_token': token})
        response.headers.set('X-CSRFToken', token)
        return response
    
    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(operacoes_bp, url_prefix='/operacoes')
    app.register_blueprint(vistoriador_bp)
    app.register_blueprint(sharepoint_bp, url_prefix='/api/sharepoint')
    app.register_blueprint(visualizacao_bp)
    app.register_blueprint(posicoes_bp, url_prefix='/api/posicoes')
    app.register_blueprint(bp_posicoes_mov)
    
    # Registrar blueprint de containers
    from routes.containers import containers_bp
    app.register_blueprint(containers_bp)  # ✅ NOVO BLUEPRINT PARA CONTAINERS
    
    # Registrar blueprint de operações de containers
    from routes.operacoes_containers import operacoes_containers_bp
    app.register_blueprint(operacoes_containers_bp)  # ✅ NOVO BLUEPRINT PARA OPERAÇÕES DE CONTAINERS
    
    # Registrar blueprint da API de placas
    from routes.placas_api import placas_api_bp
    app.register_blueprint(placas_api_bp)  # ✅ NOVO BLUEPRINT PARA API DE PLACAS

    # Context processor para disponibilizar dados em todos os templates
    @app.context_processor
    def utility_processor():
        # Adicionar informações de permissões para todos os templates
        user_data = {
            'now': datetime.now(),
            'is_authenticated': 'username' in session,
            'current_user': session.get('username', None),
            'user_role': get_user_role(),
            'is_admin': has_role('admin'),
            'is_vistoriador': has_role('vistoriador'),
            'is_operador': has_role('operador')
        }
        
        # Adicionar contador de solicitações pendentes para admins
        if has_role('admin'):
            try:
                from db import get_db
                db = get_db()
                cursor = db.cursor()
                
                # Contar solicitações de registro pendentes
                cursor.execute("SELECT COUNT(*) FROM solicitacoes_registro WHERE status = 'pendente'")
                registro_pendentes = cursor.fetchone()[0]
                
                # Contar solicitações de senha pendentes
                cursor.execute("SELECT COUNT(*) FROM solicitacoes_senha WHERE status = 'pendente'")
                senha_pendentes = cursor.fetchone()[0]
                
                # Total de solicitações pendentes
                total_pendentes = registro_pendentes + senha_pendentes
                
                user_data.update({
                    'solicitacoes_pendentes_count': total_pendentes,
                    'registro_pendentes_count': registro_pendentes,
                    'senha_pendentes_count': senha_pendentes
                })
                
            except Exception as e:
                # Em caso de erro, não quebrar a aplicação
                user_data.update({
                    'solicitacoes_pendentes_count': 0,
                    'registro_pendentes_count': 0,
                    'senha_pendentes_count': 0
                })
        
        return user_data
    
    @app.route('/')
    def index():
        from flask import redirect, url_for
        return redirect(url_for('auth.login'))
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8505, debug=True)
