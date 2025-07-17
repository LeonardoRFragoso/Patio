from flask import Blueprint, render_template, jsonify, session, current_app
from functools import wraps
import sqlite3
import logging

# Configuração do logging
logger = logging.getLogger(__name__)

visualizacao_bp = Blueprint('visualizacao', __name__)

def login_required(f):
    """Decorator para verificar se o usuário está logado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Acesso negado. Faça login primeiro.'}), 401
        return f(*args, **kwargs)
    return decorated_function

@visualizacao_bp.route('/visualizacao_patio')
@login_required
def visualizacao_patio():
    """Página de visualização 3D do pátio"""
    try:
        # Verificar todas as possíveis variáveis de sessão para o tipo de usuário
        user_tipo = session.get('user_tipo', '')
        user_role = session.get('role', '')
        user_name = session.get('username', '')
        
        # Usar qualquer uma das variáveis de sessão que contenha o tipo
        tipo_efetivo = user_tipo or user_role
        
        # Log para debug
        logger.info(f"Sessão do usuário {user_name}: user_tipo={user_tipo}, role={user_role}")
        
        # Verificar se o usuário tem permissão (operador ou vistoriador)
        if not tipo_efetivo or tipo_efetivo not in ['operador', 'vistoriador']:
            logger.warning(f"Tentativa de acesso não autorizado à visualização 3D: {user_name} (tipo={tipo_efetivo})")
            return render_template('shared/acesso_negado.html', 
                                 message="Apenas operadores e vistoriadores podem acessar a visualização do pátio."), 403
        
        logger.info(f"Usuário {user_name} ({tipo_efetivo}) acessou a visualização 3D do pátio")
        return render_template('visualizacao/patio_3d.html', 
                             user_name=user_name, 
                             user_tipo=tipo_efetivo)
                             
    except Exception as e:
        logger.error(f"Erro ao carregar visualização do pátio: {str(e)}")
        return render_template('shared/erro.html', 
                             message="Erro interno do servidor"), 500

@visualizacao_bp.route('/visualizacao_patio_teste')
def visualizacao_patio_teste():
    """Página de teste da visualização 3D do pátio (sem autenticação)"""
    try:
        logger.info("Página de teste da visualização 3D acessada")
        return render_template('visualizacao/patio_3d_teste.html')
    except Exception as e:
        logger.error(f"Erro ao carregar página de teste: {str(e)}")
        return render_template('shared/erro.html', 
                             message="Erro interno do servidor"), 500

@visualizacao_bp.route('/teste_threejs')
def teste_threejs():
    """Página de teste básico do THREE.js sem complexidade"""
    try:
        logger.info("Página de teste básico do THREE.js acessada")
        return render_template('visualizacao/teste_3d.html')
    except Exception as e:
        logger.error(f"Erro ao carregar página de teste básico THREE.js: {str(e)}")
        return render_template('shared/erro.html',
                             message="Erro interno do servidor"), 500

@visualizacao_bp.route('/api/patio/status')
@login_required
def api_patio_status():
    """API para obter status atual do pátio em tempo real"""
    try:
        user_id = session.get('user_id')
        user_unidade = session.get('unidade', 'floriano')
        
        db_path = current_app.config['DATABASE']
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        
        # Buscar todos os containers no pátio da unidade do usuário
        cursor.execute('''
            SELECT 
                c.numero,
                c.status,
                c.posicao_atual,
                c.ultima_atualizacao,
                v.iso_container,
                v.capacidade,
                v.tara,
                v.data_vistoria,
                v.armador,
                v.status as status_container,
                v.observacoes
            FROM containers c
            LEFT JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.unidade = ? 
            AND c.posicao_atual IS NOT NULL 
            AND c.posicao_atual LIKE '_%-_'
            AND c.status = 'no patio'
            ORDER BY c.posicao_atual
        ''', (user_unidade,))
        
        containers_ocupados = []
        for row in cursor.fetchall():
            container_data = {
                'numero': row['numero'],
                'status': row['status'],
                'posicao': row['posicao_atual'],
                'ultima_atualizacao': row['ultima_atualizacao'],
                'iso_container': row['iso_container'],
                'capacidade': row['capacidade'],
                'tara': row['tara'],
                'data_vistoria': row['data_vistoria'],
                'armador': row['armador'],
                'status_container': row['status_container'],
                'observacoes': row['observacoes']
            }
            containers_ocupados.append(container_data)
        
        # Carregar posições disponíveis do pátio Suzano
        from posicoes_suzano import patio_suzano
        
        posicoes_disponiveis = []
        for posicao, condicao in patio_suzano.posicoes_disponiveis.items():
            baia, pos_num, altura = patio_suzano.decompor_posicao(posicao)
            
            # Verificar se a posição está ocupada
            ocupada = any(c['posicao'] == posicao for c in containers_ocupados)
            
            posicao_data = {
                'posicao': posicao,
                'baia': baia,
                'posicao_numero': pos_num,
                'altura': altura,
                'condicao': condicao,
                'ocupada': ocupada
            }
            posicoes_disponiveis.append(posicao_data)
        
        # Calcular estatísticas
        total_posicoes = len(posicoes_disponiveis)
        posicoes_ocupadas = len(containers_ocupados)
        posicoes_livres = total_posicoes - posicoes_ocupadas
        taxa_ocupacao = (posicoes_ocupadas / total_posicoes * 100) if total_posicoes > 0 else 0
        
        # Estatísticas por baia
        stats_por_baia = {}
        for baia in ['A', 'B', 'C', 'D', 'E']:
            posicoes_baia = [p for p in posicoes_disponiveis if p['baia'] == baia]
            ocupadas_baia = [p for p in posicoes_baia if p['ocupada']]
            
            stats_por_baia[baia] = {
                'total': len(posicoes_baia),
                'ocupadas': len(ocupadas_baia),
                'livres': len(posicoes_baia) - len(ocupadas_baia),
                'taxa_ocupacao': (len(ocupadas_baia) / len(posicoes_baia) * 100) if posicoes_baia else 0
            }
        
        # Estatísticas por altura
        stats_por_altura = {}
        for altura in range(1, 6):
            posicoes_altura = [p for p in posicoes_disponiveis if p['altura'] == altura]
            ocupadas_altura = [p for p in posicoes_altura if p['ocupada']]
            
            stats_por_altura[str(altura)] = {
                'total': len(posicoes_altura),
                'ocupadas': len(ocupadas_altura),
                'livres': len(posicoes_altura) - len(ocupadas_altura),
                'taxa_ocupacao': (len(ocupadas_altura) / len(posicoes_altura) * 100) if posicoes_altura else 0
            }
        
        db.close()
        
        response_data = {
            'containers_ocupados': containers_ocupados,
            'posicoes_disponiveis': posicoes_disponiveis,
            'estatisticas': {
                'total_posicoes': total_posicoes,
                'posicoes_ocupadas': posicoes_ocupadas,
                'posicoes_livres': posicoes_livres,
                'taxa_ocupacao': round(taxa_ocupacao, 1),
                'por_baia': stats_por_baia,
                'por_altura': stats_por_altura
            },
            'timestamp': logger.handlers[0].formatter.formatTime(logging.LogRecord('', '', '', '', '', '', '', ''), '%Y-%m-%d %H:%M:%S') if logger.handlers else None
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao obter status do pátio: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@visualizacao_bp.route('/api/container/<numero>/detalhes')
@login_required
def api_container_detalhes(numero):
    """API para obter detalhes completos de um container específico"""
    try:
        user_unidade = session.get('unidade', 'floriano')
        
        db_path = current_app.config['DATABASE']
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        
        # Buscar detalhes do container
        cursor.execute('''
            SELECT 
                c.*,
                v.iso_container,
                v.capacidade,
                v.tara,
                v.data_vistoria,
                v.armador,
                v.status as status_container,
                v.observacoes as obs_vistoria
            FROM containers c
            LEFT JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.numero = ? AND c.unidade = ?
        ''', (numero, user_unidade))
        
        container = cursor.fetchone()
        if not container:
            return jsonify({'error': 'Container não encontrado'}), 404
        
        # Buscar histórico de operações
        cursor.execute('''
            SELECT 
                o.tipo,
                o.modo,
                o.posicao,
                o.placa,
                o.vagao,
                o.data_operacao,
                o.observacoes,
                u.nome as operador_nome
            FROM operacoes o
            JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.container_id = ?
            ORDER BY o.data_operacao DESC
            LIMIT 10
        ''', (container['id'],))
        
        historico = [dict(row) for row in cursor.fetchall()]
        
        db.close()
        
        container_detalhes = {
            'container': dict(container),
            'historico_operacoes': historico
        }
        
        return jsonify(container_detalhes)
        
    except Exception as e:
        logger.error(f"Erro ao obter detalhes do container {numero}: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500
