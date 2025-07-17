from flask import Blueprint

operacoes_bp = Blueprint('operacoes', __name__, url_prefix='/operacoes')

from . import routes
