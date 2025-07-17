from flask import Blueprint, request, jsonify, current_app, session, g
from datetime import datetime
import logging
import sqlite3
from db import get_db, log_activity, get_container_info
from auth.routes import login_required
from utils.permissions import operador_required, vistoriador_required, admin_required
from utils.csrf import csrf

# Configuração de logging para este módulo
logger = logging.getLogger('operacoes_containers')

operacoes_containers_bp = Blueprint('operacoes_containers', __name__)

# Rota para registrar uma nova operação de container
@operacoes_containers_bp.route('/operacoes/registrar_operacao', methods=['POST'])
@login_required
# @csrf  # Desativado temporariamente para testes
def registrar_operacao():
    """
    Registra uma nova operação de container (entrada, saída, movimentação, vistoria)
    """
    try:
        # Verificar se o usuário está autenticado
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter dados do request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dados não fornecidos'
            }), 400
        
        # Validar campos obrigatórios
        campos_obrigatorios = ['numero_container', 'tipo_operacao']
        for campo in campos_obrigatorios:
            if campo not in data or not data[campo]:
                return jsonify({
                    'success': False,
                    'message': f'Campo obrigatório não fornecido: {campo}'
                }), 400
        
        # Padronizar o número do container (maiúsculas)
        numero_container = data['numero_container'].upper()
        tipo_operacao = data['tipo_operacao']
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se o container existe
        container = get_container_info(numero_container)
        
        if not container and tipo_operacao != 'entrada':
            return jsonify({
                'success': False,
                'message': f'Container {numero_container} não encontrado no sistema'
            }), 404
        
        # Processar a operação com base no tipo
        data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        usuario = session.get('username', 'sistema')
        user_id = session.get('user_id')
        
        if tipo_operacao == 'entrada':
            # Se o container não existe, criar um novo
            if not container:
                cursor.execute('''
                    INSERT INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao)
                    VALUES (?, ?, ?, ?, ?)
                ''', (numero_container, 'no patio', data.get('posicao', ''), data_atual, data_atual))
                
                container_id = cursor.lastrowid
            else:
                container_id = container['id']
                # Atualizar status e posição do container
                cursor.execute('''
                    UPDATE containers 
                    SET status = 'no patio', posicao_atual = ?, ultima_atualizacao = ?
                    WHERE id = ?
                ''', (data.get('posicao', ''), data_atual, container_id))
            
            # Registrar operação de entrada
            cursor.execute('''
                INSERT INTO operacoes (container_id, tipo, modo, posicao, placa, vagao, data_operacao, usuario_id, observacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                container_id, 
                'entrada', 
                data.get('modo', 'indefinido'),
                data.get('posicao', ''),
                data.get('placa', ''),
                data.get('vagao', ''),
                data_atual,
                session.get('user_id'),
                data.get('observacoes', '')
            ))
            
            mensagem = f'Container {numero_container} registrado com entrada no pátio'
            
        elif tipo_operacao == 'saida':
            # Atualizar status do container
            cursor.execute('''
                UPDATE containers 
                SET status = 'saiu', ultima_atualizacao = ?
                WHERE id = ?
            ''', (data_atual, container['id']))
            
            # Registrar operação de saída
            cursor.execute('''
                INSERT INTO operacoes (container_id, tipo, modo, posicao, placa, vagao, data_operacao, usuario_id, observacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                container['id'], 
                'saida', 
                data.get('modo', 'indefinido'),
                '',  # Posição vazia para saída
                data.get('placa', ''),
                data.get('vagao', ''),
                data_atual,
                session.get('user_id'),
                data.get('observacoes', '')
            ))
            
            mensagem = f'Container {numero_container} registrado com saída do pátio'
            
        elif tipo_operacao == 'movimentacao':
            # Validar nova posição
            nova_posicao = data.get('posicao', '')
            if not nova_posicao:
                return jsonify({
                    'success': False,
                    'message': 'Nova posição não fornecida para movimentação'
                }), 400
            
            # Atualizar posição do container
            cursor.execute('''
                UPDATE containers 
                SET posicao_atual = ?, ultima_atualizacao = ?
                WHERE id = ?
            ''', (nova_posicao, data_atual, container['id']))
            
            # Registrar operação de movimentação
            # Incluir a posição anterior nas observações
            observacoes = data.get('observacoes', '')
            observacoes_completas = f"Movido de {container['posicao_atual']} para {nova_posicao}. {observacoes}"
            # Registrar operação de movimentação
            cursor.execute('''
                INSERT INTO operacoes (container_id, tipo, modo, posicao, posicao_anterior, data_operacao, usuario_id, observacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                container['id'], 
                'movimentacao', 
                'interno',
                nova_posicao,
                container.get('posicao_atual', ''),  # Posição anterior
                data_atual,
                session.get('user_id'),
                observacoes_completas
            ))
            
            mensagem = f'Container {numero_container} movimentado para {nova_posicao}'
            
        elif tipo_operacao == 'vistoria':
            # Validar dados da vistoria
            if not data.get('resultado_vistoria'):
                return jsonify({
                    'success': False,
                    'message': 'Resultado da vistoria não fornecido'
                }), 400
            
            # Atualizar status do container para vistoriado
            cursor.execute('''
                UPDATE containers 
                SET status = 'vistoriado', ultima_atualizacao = ?
                WHERE id = ?
            ''', (data_atual, container['id']))
            
            # Registrar operação de vistoria
            cursor.execute('''
                INSERT INTO operacoes (container_id, tipo, modo, posicao, placa, vagao, data_operacao, usuario_id, observacoes, resultado_vistoria)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                container['id'], 
                'vistoria', 
                data.get('modo', 'indefinido'),
                container.get('posicao_atual', ''),
                data.get('placa', ''),
                data.get('vagao', ''),
                data_atual,
                session.get('user_id'),
                data.get('observacoes', ''),
                data.get('resultado_vistoria', '')
            ))
            
            mensagem = f'Container {numero_container} vistoriado com sucesso'
        
        else:
            return jsonify({
                'success': False,
                'message': f'Tipo de operação inválido: {tipo_operacao}'
            }), 400
        
        # Commit das alterações
        db.commit()
        
        # Registrar atividade no log
        log_activity(
            usuario=usuario,
            acao=f'operacao_{tipo_operacao}',
            detalhes=f'Container {numero_container}: {mensagem}',
            nivel=session.get('nivel', 'desconhecido')
        )
        
        return jsonify({
            'success': True,
            'message': mensagem,
            'operacao': {
                'tipo': tipo_operacao,
                'container': numero_container,
                'data': data_atual
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao registrar operação de container: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao registrar operação de container'
        }), 500

# Rota para obter histórico de operações de um container
@operacoes_containers_bp.route('/operacoes/historico_container', methods=['GET'])
@login_required
def historico_container():
    """
    Retorna o histórico de operações de um container específico
    Parâmetro de query 'numero' com o número do container
    """
    try:
        # Verificar se o usuário está autenticado
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter o número do container da query
        numero_container = request.args.get('numero')
        
        if not numero_container:
            return jsonify({
                'success': False,
                'message': 'Número do container não fornecido'
            }), 400
        
        # Padronizar o número do container (maiúsculas)
        numero_container = numero_container.upper()
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Buscar o container
        cursor.execute('''
            SELECT id FROM containers WHERE numero = ?
        ''', (numero_container,))
        
        container = cursor.fetchone()
        
        if not container:
            return jsonify({
                'success': False,
                'message': f'Container {numero_container} não encontrado'
            }), 404
        
        # Buscar histórico de operações
        cursor.execute('''
            SELECT tipo, modo, posicao, posicao_anterior, placa, vagao, 
                   data_operacao, usuario, observacoes, resultado_vistoria
            FROM operacoes
            WHERE container_id = ?
            ORDER BY data_operacao DESC
        ''', (container[0],))
        
        operacoes = []
        for op in cursor.fetchall():
            operacoes.append({
                'tipo': op[0],
                'modo': op[1],
                'posicao': op[2],
                'posicao_anterior': op[3],
                'placa': op[4],
                'vagao': op[5],
                'data_operacao': op[6],
                'usuario': op[7],
                'observacoes': op[8],
                'resultado_vistoria': op[9]
            })
        
        # Registrar atividade no log
        log_activity(
            usuario=session.get('username', 'sistema'),
            acao='consulta_historico',
            detalhes=f'Consulta de histórico do container {numero_container}',
            nivel=session.get('nivel', 'desconhecido')
        )
        
        return jsonify({
            'success': True,
            'container': numero_container,
            'operacoes': operacoes,
            'count': len(operacoes)
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico de container: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao buscar histórico do container'
        }), 500
