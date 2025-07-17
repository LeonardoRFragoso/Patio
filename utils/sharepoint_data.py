"""
Rotas para acessar dados do SharePoint/OneDrive
Fornece endpoints para obter placas e outros dados da planilha
"""

from flask import Blueprint, jsonify, request
import logging
from auth.routes import login_required
from utils.sharepoint_client import get_sharepoint_client, get_placas_list, refresh_placas_cache

# Configuração de logging
logger = logging.getLogger('sharepoint_routes')

# Criar blueprint
sharepoint_bp = Blueprint('sharepoint', __name__)

@sharepoint_bp.route('/placas', methods=['GET'])
@login_required
def obter_placas():
    """
    Obtém lista de placas da planilha OneDrive
    
    Query Parameters:
        refresh (bool): Se True, força atualização do cache
    
    Returns:
        JSON: Lista de placas com status da operação
    """
    try:
        # Verificar se deve forçar refresh
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'
        
        logger.debug(f"Obtendo placas (refresh={force_refresh})")
        
        # Obter cliente SharePoint
        client = get_sharepoint_client()
        
        # Obter dados das placas
        placas_data = client.get_placas_data(force_refresh=force_refresh)
        
        # Obter status do cache
        cache_status = client.get_cache_status()
        
        return jsonify({
            'success': True,
            'data': {
                'placas': placas_data,
                'total': len(placas_data),
                'cache_status': cache_status
            },
            'message': f'{len(placas_data)} placas carregadas com sucesso'
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao carregar placas da planilha OneDrive',
            'details': str(e)
        }), 500

@sharepoint_bp.route('/placas/lista', methods=['GET'])
@login_required
def obter_placas_simples():
    """
    Obtém lista simples de placas (apenas strings)
    
    Query Parameters:
        refresh (bool): Se True, força atualização do cache
    
    Returns:
        JSON: Lista simples de placas
    """
    try:
        # Verificar se deve forçar refresh
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'
        
        logger.debug(f"Obtendo lista simples de placas (refresh={force_refresh})")
        
        # Obter lista de placas
        placas_list = get_placas_list(force_refresh=force_refresh)
        
        return jsonify({
            'success': True,
            'data': placas_list,
            'total': len(placas_list),
            'message': f'{len(placas_list)} placas disponíveis'
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter lista de placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao carregar lista de placas',
            'details': str(e)
        }), 500

@sharepoint_bp.route('/placas/refresh', methods=['POST'])
@login_required
def atualizar_placas():
    """
    Força atualização do cache de placas
    
    Returns:
        JSON: Status da atualização
    """
    try:
        logger.info("Atualizando cache de placas...")
        
        # Forçar atualização
        success = refresh_placas_cache()
        
        if success:
            # Obter contagem atualizada
            placas_list = get_placas_list()
            
            return jsonify({
                'success': True,
                'message': f'Cache atualizado com sucesso. {len(placas_list)} placas carregadas.',
                'total_placas': len(placas_list)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Falha ao atualizar cache de placas'
            }), 500
            
    except Exception as e:
        logger.error(f"Erro ao atualizar placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno ao atualizar placas',
            'details': str(e)
        }), 500

@sharepoint_bp.route('/placas/status', methods=['GET'])
@login_required
def status_placas():
    """
    Obtém status do cache de placas
    
    Returns:
        JSON: Informações sobre o cache
    """
    try:
        client = get_sharepoint_client()
        cache_status = client.get_cache_status()
        
        return jsonify({
            'success': True,
            'data': cache_status
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter status: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao obter status do cache',
            'details': str(e)
        }), 500

@sharepoint_bp.route('/placas/buscar', methods=['GET'])
@login_required
def buscar_placas():
    """
    Busca placas por termo
    
    Query Parameters:
        q (str): Termo de busca
        limit (int): Limite de resultados (padrão: 10)
    
    Returns:
        JSON: Placas que correspondem ao termo de busca
    """
    try:
        # Obter parâmetros
        termo_busca = request.args.get('q', '').strip().upper()
        limite = int(request.args.get('limit', 10))
        
        if not termo_busca:
            return jsonify({
                'success': False,
                'error': 'Termo de busca é obrigatório'
            }), 400
        
        # Obter todas as placas
        client = get_sharepoint_client()
        todas_placas = client.get_placas_data()
        
        # Filtrar placas que contenham o termo
        placas_filtradas = []
        for placa_data in todas_placas:
            if termo_busca in placa_data['placa']:
                placas_filtradas.append(placa_data)
                if len(placas_filtradas) >= limite:
                    break
        
        return jsonify({
            'success': True,
            'data': placas_filtradas,
            'total': len(placas_filtradas),
            'termo_busca': termo_busca,
            'message': f'{len(placas_filtradas)} placas encontradas'
        })
        
    except ValueError:
        return jsonify({
            'success': False,
            'error': 'Parâmetro "limit" deve ser um número'
        }), 400
    except Exception as e:
        logger.error(f"Erro ao buscar placas: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao buscar placas',
            'details': str(e)
        }), 500