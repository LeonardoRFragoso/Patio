"""
API Routes para gerenciamento de placas de caminhão
Substitui a dependência da planilha SharePoint/OneDrive
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import logging
from models.placas import PlacasModel, inicializar_placas
from utils.permissions import login_required
from utils.csrf import csrf

logger = logging.getLogger(__name__)

# Blueprint para API de placas
placas_api_bp = Blueprint('placas_api', __name__, url_prefix='/api/placas')

def init_placas_on_first_request():
    """Inicializa placas na primeira requisição"""
    try:
        inicializar_placas()
    except Exception as e:
        logger.error(f"Erro ao inicializar placas: {e}")

@placas_api_bp.before_request
def before_request():
    """Executado antes de cada requisição"""
    # Inicializar placas se necessário (apenas uma vez)
    if not hasattr(placas_api_bp, '_placas_initialized'):
        init_placas_on_first_request()
        placas_api_bp._placas_initialized = True

@placas_api_bp.route('/listar', methods=['GET'])
@login_required
def listar_placas():
    """Lista todas as placas ativas"""
    try:
        apenas_ativas = request.args.get('apenas_ativas', 'true').lower() == 'true'
        placas = PlacasModel.listar_placas(apenas_ativas=apenas_ativas)
        
        return jsonify({
            'success': True,
            'placas': placas,
            'total': len(placas)
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@placas_api_bp.route('/simples', methods=['GET'])
@login_required
def obter_placas_simples():
    """Retorna lista simples de placas para comboboxes"""
    try:
        apenas_ativas = request.args.get('apenas_ativas', 'true').lower() == 'true'
        placas = PlacasModel.obter_placas_simples(apenas_ativas=apenas_ativas)
        
        return jsonify({
            'success': True,
            'placas': placas,
            'total': len(placas)
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter placas simples: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# Endpoint removido - usar /simples com autenticação CSRF

@placas_api_bp.route('/adicionar', methods=['POST'])
@login_required
@csrf
def adicionar_placa():
    """Adiciona uma nova placa"""
    try:
        data = request.get_json()
        
        if not data or 'placa' not in data:
            return jsonify({
                'success': False,
                'error': 'Placa é obrigatória'
            }), 400
        
        placa = data['placa']
        observacoes = data.get('observacoes', '')
        usuario_criacao = session.get('username', 'usuario_desconhecido')
        
        resultado = PlacasModel.adicionar_placa(
            placa=placa,
            usuario_criacao=usuario_criacao,
            observacoes=observacoes
        )
        
        if resultado['success']:
            return jsonify(resultado), 201
        else:
            return jsonify(resultado), 400
            
    except Exception as e:
        logger.error(f"Erro ao adicionar placa: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@placas_api_bp.route('/editar/<int:placa_id>', methods=['PUT'])
@login_required
@csrf
def editar_placa(placa_id):
    """Edita uma placa existente"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados são obrigatórios'
            }), 400
        
        nova_placa = data.get('placa')
        ativa = data.get('ativa')
        observacoes = data.get('observacoes')
        usuario_edicao = session.get('username', 'usuario_desconhecido')
        
        resultado = PlacasModel.editar_placa(
            placa_id=placa_id,
            nova_placa=nova_placa,
            ativa=ativa,
            observacoes=observacoes,
            usuario_edicao=usuario_edicao
        )
        
        if resultado['success']:
            return jsonify(resultado)
        else:
            return jsonify(resultado), 400
            
    except Exception as e:
        logger.error(f"Erro ao editar placa {placa_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@placas_api_bp.route('/excluir/<int:placa_id>', methods=['DELETE'])
@login_required
@csrf
def excluir_placa(placa_id):
    """Exclui uma placa (exclusão lógica por padrão)"""
    try:
        # Por padrão, fazer exclusão lógica (desativar)
        exclusao_fisica = request.args.get('fisica', 'false').lower() == 'true'
        
        resultado = PlacasModel.excluir_placa(
            placa_id=placa_id,
            exclusao_logica=not exclusao_fisica
        )
        
        if resultado['success']:
            return jsonify(resultado)
        else:
            return jsonify(resultado), 400
            
    except Exception as e:
        logger.error(f"Erro ao excluir placa {placa_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@placas_api_bp.route('/buscar', methods=['GET'])
@login_required
def buscar_placas():
    """Busca placas por termo"""
    try:
        termo = request.args.get('termo', '').strip()
        apenas_ativas = request.args.get('apenas_ativas', 'true').lower() == 'true'
        
        placas = PlacasModel.buscar_placas(termo=termo, apenas_ativas=apenas_ativas)
        
        return jsonify({
            'success': True,
            'placas': placas,
            'total': len(placas),
            'termo_busca': termo
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@placas_api_bp.route('/refresh', methods=['POST'])
@login_required
@csrf
def refresh_placas():
    """Atualiza cache de placas (compatibilidade com sistema atual)"""
    try:
        # Para compatibilidade com o sistema atual, retorna as placas do banco
        placas = PlacasModel.obter_placas_simples(apenas_ativas=True)
        
        return jsonify({
            'success': True,
            'message': f'Placas atualizadas com sucesso! {len(placas)} placas carregadas.',
            'placas': placas,
            'total': len(placas),
            'fonte': 'banco_de_dados'
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao atualizar placas do banco de dados'
        }), 500

@placas_api_bp.route('/status', methods=['GET'])
@login_required
def status_placas():
    """Retorna status do sistema de placas"""
    try:
        placas_ativas = PlacasModel.listar_placas(apenas_ativas=True)
        placas_inativas = PlacasModel.listar_placas(apenas_ativas=False)
        total_inativas = len(placas_inativas) - len(placas_ativas)
        
        return jsonify({
            'success': True,
            'status': {
                'total_ativas': len(placas_ativas),
                'total_inativas': total_inativas,
                'total_geral': len(placas_inativas),
                'fonte_dados': 'banco_de_dados',
                'tabela': 'placas_caminhao'
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter status das placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@placas_api_bp.route('/inicializar', methods=['POST'])
@login_required
@csrf
def inicializar_placas_manual():
    """Inicializa placas manualmente (apenas para admin)"""
    try:
        # Verificar se usuário é admin
        user_level = session.get('user_level', '')
        if user_level not in ['admin', 'admin_administrativo']:
            return jsonify({
                'success': False,
                'error': 'Acesso negado. Apenas administradores podem inicializar placas.'
            }), 403
        
        resultado = inicializar_placas()
        
        if resultado:
            placas_ativas = PlacasModel.listar_placas(apenas_ativas=True)
            return jsonify({
                'success': True,
                'message': f'Placas inicializadas com sucesso! {len(placas_ativas)} placas disponíveis.',
                'total_placas': len(placas_ativas)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erro ao inicializar placas'
            }), 500
            
    except Exception as e:
        logger.error(f"Erro ao inicializar placas manualmente: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# Rota para compatibilidade com sistema SharePoint (será removida futuramente)
@placas_api_bp.route('/sharepoint/refresh', methods=['POST'])
@login_required
@csrf
def sharepoint_compatibility():
    """Rota de compatibilidade com sistema SharePoint antigo"""
    try:
        # Redirecionar para o novo sistema
        return refresh_placas()
        
    except Exception as e:
        logger.error(f"Erro na rota de compatibilidade SharePoint: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao atualizar placas'
        }), 500
