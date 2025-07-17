import sqlite3
from flask import current_app, g
import logging

# Importar funções do módulo principal db.py
from db import get_db as main_get_db
from db import close_db as main_close_db
from db import log_activity as main_log_activity
from db import verificar_integridade_db as main_verificar_integridade_db

# Configurar logger
logger = logging.getLogger('utils.db')

def get_db():
    """Wrapper para a função get_db do módulo principal"""
    try:
        # Usar a função principal para garantir consistência
        return main_get_db()
    except Exception as e:
        logger.error(f"Erro ao obter conexão com o banco de dados: {e}")
        # Fallback para implementação local caso a importação falhe
        if 'db' not in g:
            g.db = sqlite3.connect(
                current_app.config['DATABASE'],
                detect_types=sqlite3.PARSE_DECLTYPES,
                timeout=30.0
            )
            g.db.row_factory = sqlite3.Row
        return g.db
        
# Manter a função get_db_connection para compatibilidade com código existente
def get_db_connection():
    """Alias para get_db para manter compatibilidade"""
    return get_db()

def close_db_connection(e=None):
    """Wrapper para a função close_db do módulo principal"""
    try:
        main_close_db(e)
    except Exception as ex:
        logger.error(f"Erro ao fechar conexão com o banco de dados: {ex}")
        # Fallback para implementação local
        db = g.pop('db', None)
        if db is not None:
            db.close()

def init_db_connection(app):
    """Inicializa a conexão com o banco de dados"""
    app.teardown_appcontext(close_db_connection)
    
def log_db_activity(usuario, acao, detalhes=None, nivel=None):
    """Wrapper para a função log_activity do módulo principal
    
    Args:
        usuario: Nome do usuário que realizou a ação
        acao: Descrição curta da ação realizada
        detalhes: Detalhes adicionais da ação (opcional)
        nivel: Nível do usuário (opcional, será buscado no banco se não fornecido)
    """
    try:
        return main_log_activity(usuario, acao, detalhes, nivel)
    except Exception as e:
        logger.error(f"Erro ao registrar atividade no log: {e}")
        return False
        
def verificar_db_integridade():
    """Wrapper para a função verificar_integridade_db do módulo principal"""
    try:
        return main_verificar_integridade_db()
    except Exception as e:
        logger.error(f"Erro ao verificar integridade do banco de dados: {e}")
        return False
