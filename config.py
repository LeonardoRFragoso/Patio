import os
from datetime import timedelta

class Config:
    # Configuração básica
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sua_chave_secreta_default')
    
    # Configuração do banco de dados
    DATABASE = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'database.db')
    
    # Configuração da sessão
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = True
    
    # Configuração CSRF
    WTF_CSRF_TIME_LIMIT = 86400  # 24 horas em segundos
    
    # Configuração de log
    LOG_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'logs')
    LOG_LEVEL = 'INFO'
