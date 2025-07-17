from flask import Blueprint, jsonify, request, session
import logging
from posicoes_suzano import patio_suzano
from db import get_db

logger = logging.getLogger(__name__)

posicoes_bp = Blueprint('posicoes', __name__)

@posicoes_bp.route('/disponiveis', methods=['GET'])
def get_posicoes_disponiveis():
    """
    Retorna as posições disponíveis para um container com determinado status
    Parâmetros:
    - status_container: CHEIO ou VAZIO (default: CHEIO)
    - unidade: unidade do pátio (default: FLORIANO)
    """
    try:
        status_container = request.args.get('status', 'CHEIO')
        unidade = request.args.get('unidade', 'FLORIANO')
        
        # Verificar unidade suportada
        if unidade.upper() == 'SUZANO':
            # Obter posições disponíveis do pátio Suzano
            posicoes = patio_suzano.sugerir_posicoes_para_container(status_container)
        else:
            return jsonify({
                'success': False,
                'error': f'Unidade {unidade} não suportada para busca de posições, apenas Suzano'
            }), 400
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar posições já ocupadas
        cursor.execute(
            'SELECT posicao_atual FROM containers WHERE status = "no patio" AND unidade = ?',
            (unidade,)
        )
        posicoes_ocupadas = [row[0] for row in cursor.fetchall()]
        
        # Filtrar posições disponíveis (não ocupadas)
        posicoes_disponiveis = [p for p in posicoes if p not in posicoes_ocupadas]
        
        # Ordenar posições por baia, posição e altura
        # Formato da posição: A01-1 (baia A, posição 01, altura 1)
        def ordenar_posicao(p):
            # Extrair componentes da posição no formato A01-1
            baia = p[0]  # Primeira letra (A, B, C, etc)
            partes = p[1:].split('-')  # Separar pelo hífen
            posicao_num = int(partes[0])  # Número da posição (01, 02, etc)
            altura = int(partes[1])  # Altura (1, 2, etc)
            return (baia, posicao_num, altura)
            
        posicoes_ordenadas = sorted(posicoes_disponiveis, key=ordenar_posicao)
        
        # Agrupar posições por baia e posição
        posicoes_agrupadas = {}
        for posicao in posicoes_ordenadas:
            # Extrair baia e posição no formato A01-1
            partes = posicao.split('-')
            baia_pos = partes[0]  # Ex: A01
            altura = int(partes[1])  # Ex: 1
            
            if baia_pos not in posicoes_agrupadas:
                posicoes_agrupadas[baia_pos] = []
                
            posicoes_agrupadas[baia_pos].append({
                'posicao_completa': posicao,
                'altura': altura
            })
        
        # Converter para formato de resposta
        resultado = []
        for baia_pos, alturas in posicoes_agrupadas.items():
            # Ordenar por altura (começando pela altura 1)
            alturas_ordenadas = sorted(alturas, key=lambda a: a['altura'])
            
            # Adicionar apenas a menor altura disponível para cada posição
            if alturas_ordenadas:
                resultado.append({
                    'baia_posicao': baia_pos,
                    'posicao_completa': alturas_ordenadas[0]['posicao_completa'],
                    'altura': alturas_ordenadas[0]['altura'],
                    'label': f"{baia_pos}-{alturas_ordenadas[0]['altura']}"
                })
        
        return jsonify({
            'success': True,
            'posicoes': resultado
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar posições disponíveis: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro ao buscar posições disponíveis: {str(e)}'
        }), 500
