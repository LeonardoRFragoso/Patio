from flask import Blueprint, request, jsonify, current_app, session, g, render_template, redirect, url_for, flash
from datetime import datetime, timedelta
import logging
import sqlite3
import time
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import BadRequest
from db import get_db, log_activity
from auth.routes import login_required
from utils.permissions import operador_required, inventariante_required, admin_required

# Configuração de logging para este módulo
logger = logging.getLogger('operacoes')

operacoes_bp = Blueprint('operacoes', __name__)

# Página principal de operações
@operacoes_bp.route('/')
@login_required
def index():
    """Página principal de operações"""
    return render_template('operacoes/index.html')

# ✅ NOVO ENDPOINT: Listar TODOS os containers para consulta
@operacoes_bp.route('/containers/todos', methods=['GET'])
@login_required
def listar_todos_containers():
    """
    Retorna lista de TODOS os containers cadastrados no sistema para a unidade do usuário
    Usado para combobox de consulta de status
    """
    try:
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'Usuário não encontrado'
            }), 404
        
        unidade_usuario = user_data[0]
        
        # Buscar TODOS os containers da unidade do usuário, independente do status
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE unidade = ?
            ORDER BY ultima_atualizacao DESC
        ''', (unidade_usuario,))
        
        containers_raw = cursor.fetchall()
        containers = []
        
        for container in containers_raw:
            container_data = {
                'numero': container[0],
                'status': container[1],
                'posicao_atual': container[2],
                'ultima_atualizacao': container[3],
                'unidade': container[4]
            }
            containers.append(container_data)
        
        logger.info(f"Retornando {len(containers)} containers totais para consulta na unidade {unidade_usuario}")
        
        return jsonify({
            'success': True,
            'data': containers,
            'count': len(containers),
            'message': f'{len(containers)} containers disponíveis para consulta na unidade {unidade_usuario}'
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar todos os containers: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Erro ao buscar todos os containers'
        }), 500

# ✅ NOVO ENDPOINT: Listar containers disponíveis para movimentação
@operacoes_bp.route('/containers/lista', methods=['GET'])
@login_required
def listar_containers_movimentacao():
    """
    Retorna lista de containers disponíveis para movimentação (apenas os que estão no pátio)
    Filtrado pela unidade do usuário logado
    """
    try:
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'Usuário não encontrado'
            }), 404
        
        unidade_usuario = user_data[0]
        
        # Buscar apenas containers que estão no pátio e têm posição definida
        # Estes são os únicos que podem ser movimentados
        # Filtrar pela unidade do usuário
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE status = 'no patio' 
            AND posicao_atual IS NOT NULL 
            AND posicao_atual != ''
            AND unidade = ?
            ORDER BY ultima_atualizacao DESC
        ''', (unidade_usuario,))
        
        containers_raw = cursor.fetchall()
        containers = []
        
        for container in containers_raw:
            container_data = {
                'numero': container[0],
                'status': container[1],
                'posicao_atual': container[2],
                'ultima_atualizacao': container[3],
                'unidade': container[4]
            }
            containers.append(container_data)
        
        logger.info(f"Retornando {len(containers)} containers disponíveis para movimentação na unidade {unidade_usuario}")
        
        return jsonify({
            'success': True,
            'data': containers,
            'count': len(containers),
            'message': f'{len(containers)} containers disponíveis para movimentação na unidade {unidade_usuario}'
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar containers para movimentação: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Erro ao buscar containers disponíveis para movimentação'
        }), 500

# ✅ ENDPOINT MELHORADO: Buscar posição específica de um container
@operacoes_bp.route('/container/posicao/<container_numero>', methods=['GET'])
@login_required
def buscar_posicao_container(container_numero):
    """
    Busca especificamente a posição atual de um container
    Usado para auto-preenchimento no formulário de movimentação
    """
    try:
        if not container_numero:
            return jsonify({'success': False, 'error': 'Número do container é obrigatório'}), 400
        
        # Normalizar o número do container
        container_numero = container_numero.upper().strip()
        
        # Buscar o container
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao
            FROM containers 
            WHERE numero = ?
        ''', (container_numero,))
        
        container = cursor.fetchone()
        
        if not container:
            return jsonify({
                'success': False, 
                'message': f'Container {container_numero} não encontrado no sistema'
            })
        
        # Verificar se o container está disponível para movimentação
        if container[1] != 'no patio':
            return jsonify({
                'success': False,
                'message': f'Container {container_numero} não está no pátio (Status: {container[1]})'
            })
        
        if not container[2]:
            return jsonify({
                'success': False,
                'message': f'Container {container_numero} não possui posição definida'
            })
        
        # Retornar dados da posição
        return jsonify({
            'success': True,
            'container': {
                'numero': container[0],
                'status': container[1],
                'posicao_atual': container[2],
                'ultima_atualizacao': container[3]
            },
            'posicao': container[2],
            'status': container[1],
            'message': f'Posição atual: {container[2]}'
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar posição do container {container_numero}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Erro ao buscar posição do container'
        }), 500

# ✅ ENDPOINT MELHORADO: Verificar se container existe e pode ser movimentado
@operacoes_bp.route('/container/verificar/<container_numero>', methods=['GET'])
@login_required  
def verificar_container_movimentacao(container_numero):
    """
    Verifica se um container pode ser movimentado
    Retorna informações detalhadas sobre disponibilidade
    """
    try:
        if not container_numero:
            return jsonify({'success': False, 'error': 'Número do container é obrigatório'}), 400
        
        container_numero = container_numero.upper().strip()
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao
            FROM containers 
            WHERE numero = ?
        ''', (container_numero,))
        
        container = cursor.fetchone()
        
        if not container:
            return jsonify({
                'success': True,
                'exists': False,
                'can_move': False,
                'message': 'Container não encontrado no sistema'
            })
        
        # Verificar se pode ser movimentado
        can_move = (container[1] == 'no patio' and container[2] is not None and container[2] != '')
        
        return jsonify({
            'success': True,
            'exists': True,
            'can_move': can_move,
            'container': {
                'numero': container[0],
                'status': container[1],
                'posicao_atual': container[2],
                'ultima_atualizacao': container[3]
            },
            'message': 'Disponível para movimentação' if can_move else f'Não disponível - Status: {container[1]}'
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar container {container_numero}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Erro ao verificar container'
        }), 500

# Rota para registrar uma nova operação via formulário web
@operacoes_bp.route('/nova', methods=['GET', 'POST'])
@login_required
def nova_operacao():
    """Rota para registrar uma nova operação"""
    if request.method == 'POST':
        # Processar o formulário de nova operação
        tipo_operacao = request.form.get('tipo_operacao')
        
        # Validar tipo de operação
        if tipo_operacao not in ['descarga', 'movimentacao', 'carregamento']:
            flash('Tipo de operação inválido', 'danger')
            return redirect(url_for('operacoes.nova_operacao'))
        
        # Obter dados comuns
        container_numero = request.form.get('container_numero')
        posicao = request.form.get('posicao')
        observacoes = request.form.get('observacoes', '')
        
        # Validar dados obrigatórios
        if not container_numero or not posicao:
            flash('Por favor, preencha todos os campos obrigatórios', 'danger')
            return redirect(url_for('operacoes.nova_operacao'))
        
        try:
            # Obter conexão com o banco de dados
            db = get_db()
            cursor = db.cursor()
            data_operacao = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            usuario_id = session.get('user_id')
            
            # Verificar se o container já existe
            cursor.execute('SELECT id FROM containers WHERE numero = ?', (container_numero,))
            container = cursor.fetchone()
            
            if container:
                container_id = container['id']
            else:
                # Criar novo container
                cursor.execute('''
                    INSERT INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao)
                    VALUES (?, ?, ?, ?, ?)
                ''', (container_numero, 'no patio', posicao, data_operacao, data_operacao))
                container_id = cursor.lastrowid
            
            # Processar dados específicos por tipo de operação
            if tipo_operacao in ['descarga', 'carregamento']:
                modo = request.form.get('modo')
                if not modo or modo not in ['ferrovia', 'rodoviaria']:
                    flash('Modo de transporte inválido', 'danger')
                    return redirect(url_for('operacoes.nova_operacao'))
                
                if modo == 'rodoviaria':
                    placa = request.form.get('placa')
                    if not placa:
                        flash('Placa do veículo é obrigatória para modo rodoviário', 'danger')
                        return redirect(url_for('operacoes.nova_operacao'))
                    
                    # Inserir operação rodoviária
                    cursor.execute('''
                        INSERT INTO operacoes (tipo, modo, container_id, posicao, placa, data_operacao, usuario_id, observacoes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (tipo_operacao, modo, container_id, posicao, placa, data_operacao, usuario_id, observacoes))
                else:  # ferrovia
                    vagao = request.form.get('vagao')
                    if not vagao:
                        flash('Número do vagão é obrigatório para modo ferroviário', 'danger')
                        return redirect(url_for('operacoes.nova_operacao'))
                    
                    # Inserir operação ferroviária
                    cursor.execute('''
                        INSERT INTO operacoes (tipo, modo, container_id, posicao, vagao, data_operacao, usuario_id, observacoes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (tipo_operacao, modo, container_id, posicao, vagao, data_operacao, usuario_id, observacoes))
            else:  # movimentação
                # Inserir operação de movimentação
                cursor.execute('''
                    INSERT INTO operacoes (tipo, container_id, posicao, data_operacao, usuario_id, observacoes)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (tipo_operacao, container_id, posicao, data_operacao, usuario_id, observacoes))
            
            # Atualizar posição do container
            if tipo_operacao == 'carregamento':
                cursor.execute('UPDATE containers SET status = ?, ultima_atualizacao = ? WHERE id = ?', 
                              ('fora do patio', data_operacao, container_id))
            else:
                cursor.execute('UPDATE containers SET posicao_atual = ?, status = ?, ultima_atualizacao = ? WHERE id = ?', 
                              (posicao, 'no patio', data_operacao, container_id))
            
            db.commit()
            
            flash(f'Operação de {tipo_operacao} registrada com sucesso!', 'success')
            return redirect(url_for('operacoes.listar_operacoes'))
                
        except Exception as e:
            logger.error(f"Erro ao registrar operação: {e}")
            flash(f'Erro ao registrar operação: {str(e)}', 'danger')
            return redirect(url_for('operacoes.nova_operacao'))
    
    # Método GET
    return render_template('operacoes/nova_operacao.html')

# Listar todas as operações
@operacoes_bp.route('/listar')
@login_required
def listar_operacoes():
    """Listar todas as operações"""
    try:
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT o.*, c.numero as container_numero, u.username as usuario_nome
            FROM operacoes o
            JOIN containers c ON o.container_id = c.id
            JOIN usuarios u ON o.usuario_id = u.id
            ORDER BY o.data_operacao DESC
        ''')
        
        operacoes = cursor.fetchall()
        
        return render_template('operacoes/listar_operacoes.html', operacoes=operacoes)
            
    except Exception as e:
        logger.error(f"Erro ao listar operações: {e}")
        flash(f'Erro ao listar operações: {str(e)}', 'danger')
        return redirect(url_for('operacoes.index'))

# Listar todos os containers
@operacoes_bp.route('/containers')
@login_required
def listar_containers():
    """Listar todos os containers"""
    try:
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT * FROM containers
            ORDER BY ultima_atualizacao DESC
        ''')
        
        containers = cursor.fetchall()
        
        return render_template('operacoes/listar_containers.html', containers=containers)
            
    except Exception as e:
        logger.error(f"Erro ao listar containers: {e}")
        flash(f'Erro ao listar containers: {str(e)}', 'danger')
        return redirect(url_for('operacoes.index'))

# Exibir detalhes de um container específico
@operacoes_bp.route('/container/<int:container_id>')
@login_required
def detalhe_container(container_id):
    """Exibir detalhes de um container específico"""
    try:
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter dados do container
        cursor.execute('SELECT * FROM containers WHERE id = ?', (container_id,))
        container = cursor.fetchone()
        
        if not container:
            flash('Container não encontrado', 'danger')
            return redirect(url_for('operacoes.listar_containers'))
        
        # Obter histórico de operações do container
        cursor.execute('''
            SELECT o.*, u.username as usuario_nome
            FROM operacoes o
            JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.container_id = ?
            ORDER BY o.data_operacao DESC
        ''', (container_id,))
        
        operacoes = cursor.fetchall()
        
        return render_template('operacoes/detalhe_container.html', 
                              container=container,
                              operacoes=operacoes)
            
    except Exception as e:
        logger.error(f"Erro ao exibir detalhes do container: {e}")
        flash(f'Erro ao exibir detalhes do container: {str(e)}', 'danger')
        return redirect(url_for('operacoes.listar_containers'))

# Verificar se um container existe e retornar seu status
@operacoes_bp.route('/verificar-container', methods=['POST'])
@login_required
def verificar_container():
    """Verificar se um container existe e retornar seu status"""
    try:
        container_numero = request.form.get('container_numero')
        
        if not container_numero:
            return jsonify({'success': False, 'error': 'Número do container não informado'})
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('SELECT * FROM containers WHERE numero = ?', (container_numero,))
        container = cursor.fetchone()
        
        if container:
            # Converter para dicionário para serialização JSON
            container_dict = {}
            for key in container.keys():
                container_dict[key] = container[key]
            
            return jsonify({
                'success': True,
                'exists': True,
                'container': container_dict
            })
        else:
            return jsonify({
                'success': True,
                'exists': False
            })
                
    except Exception as e:
        logger.error(f"Erro ao verificar container: {e}")
        return jsonify({'success': False, 'error': f'Erro ao verificar container: {str(e)}'})

# Rota para obter dados para relatórios
@operacoes_bp.route('/relatorio')
@inventariante_required
def relatorio():
    """Exibir relatório de operações"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Contagem de containers por status
            cursor.execute('''
                SELECT status, COUNT(*) as total
                FROM containers
                GROUP BY status
            ''')
            status_counts = cursor.fetchall()
            
            # Contagem de operações por tipo
            cursor.execute('''
                SELECT tipo, COUNT(*) as total
                FROM operacoes
                GROUP BY tipo
            ''')
            tipo_counts = cursor.fetchall()
            
            return render_template('operacoes/relatorio.html', 
                                  status_counts=status_counts,
                                  tipo_counts=tipo_counts)
    
    except Exception as e:
        flash(f'Erro ao gerar relatório: {str(e)}', 'danger')
        return redirect(url_for('operacoes.index'))

# API para registrar uma nova operação via AJAX
@operacoes_bp.route('/registrar', methods=['POST'])
def registrar_operacao():
    """
    Registra uma nova operação de container (descarga, carregamento ou movimentação) via API
    Aceita tanto JSON quanto dados de formulário
    ✅ MELHORADO: Validação especial para movimentação com posição original
    """
    try:
        # Verificar token CSRF manualmente
        csrf_token = request.headers.get('X-CSRFToken') or request.form.get('csrf_token')
        if not csrf_token:
            logger.error("Token CSRF não encontrado no cabeçalho")
            return jsonify({'success': False, 'error': 'Token CSRF ausente'}), 400
            
        try:
            validate_csrf(csrf_token)
            logger.debug("Token CSRF validado com sucesso")
        except (BadRequest, ValueError) as e:
            logger.error(f"Erro de validação CSRF: {str(e)}")
            return jsonify({'success': False, 'error': 'Token CSRF inválido ou expirado'}), 400
        
        # Obter dados da requisição (pode ser JSON ou form-data)
        if request.is_json:
            dados = request.get_json() or {}
        else:
            # Converter dados do formulário para dicionário
            dados = dict(request.form)
            # Converter valores de lista para string (quando há múltiplos valores)
            for key, value in dados.items():
                if isinstance(value, list) and len(value) == 1:
                    dados[key] = value[0]
        
        logger.debug(f"Dados recebidos: {dados}")
        
        if not dados:
            return jsonify({'success': False, 'error': 'Dados inválidos'}), 400
        
        # Validar tipo de operação
        tipo_operacao = dados.get('tipo')
        if tipo_operacao not in ['descarga', 'carregamento', 'movimentacao']:
            return jsonify({'success': False, 'error': 'Tipo de operação inválido'}), 400
        
        # Obter conexão com o banco de dados
        try:
            db = get_db()
            cursor = db.cursor()
            
            # Obter a unidade do usuário logado
            username = session.get('username')
            cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
            result = cursor.fetchone()
            if not result:
                return jsonify({'success': False, 'error': 'Usuário não encontrado'}), 400
            unidade_usuario = result[0]
            logger.debug(f"Unidade do usuário: {unidade_usuario}")
        except sqlite3.Error as e:
            logger.error(f"Erro ao conectar ao banco de dados: {str(e)}")
            return jsonify({'success': False, 'error': 'Erro ao conectar ao banco de dados. Tente novamente.'}), 500
        
        # Obter dados básicos
        container_numero = dados.get('container_id')
        modo = dados.get('modo')
        observacoes = dados.get('observacoes', '').strip()
        
        # Validações básicas
        if not container_numero:
            return jsonify({'success': False, 'error': 'Número do container não informado'}), 400
        
        # Variáveis para armazenar dados da operação
        posicao = None
        posicao_original = None
        placa = None
        vagao = None
        
        # ✅ VALIDAÇÕES ESPECÍFICAS MELHORADAS POR TIPO DE OPERAÇÃO
        if tipo_operacao == 'descarga':
            # Descarga sempre precisa de posição
            posicao = dados.get('posicao')
            if not posicao:
                return jsonify({'success': False, 'error': 'Posição é obrigatória para descarga'}), 400
                
            # ✅ NOVA VERIFICAÇÃO: Verificar se a posição já está ocupada por outro container na mesma unidade
            cursor.execute(
                'SELECT numero FROM containers WHERE posicao_atual = ? AND status = "no patio" AND unidade = ?', 
                (posicao, unidade_usuario)
            )
            container_existente = cursor.fetchone()
            
            if container_existente:
                return jsonify({
                    'success': False, 
                    'error': f'Posição {posicao} já está ocupada pelo container {container_existente[0]}. Escolha outra posição.'
                }), 400
                
            # ✅ NOVA VERIFICAÇÃO: Verificar se já existe uma operação recente para este container
            # Verificar operações nos últimos 5 minutos
            cinco_minutos_atras = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                '''
                SELECT id FROM operacoes 
                WHERE container_id = (SELECT id FROM containers WHERE numero = ?) 
                AND tipo = ? 
                AND data_operacao > ?
                ''', 
                (container_numero, tipo_operacao, cinco_minutos_atras)
            )
            
            operacao_recente = cursor.fetchone()
            if operacao_recente:
                return jsonify({
                    'success': False, 
                    'error': f'Já existe uma operação de {tipo_operacao} registrada para este container nos últimos 5 minutos.'
                }), 400
            
            # Validar modo de transporte
            if modo not in ['rodoviaria', 'ferroviaria']:
                return jsonify({'success': False, 'error': 'Modo de transporte inválido para descarga'}), 400
            
            if modo == 'rodoviaria':
                placa = dados.get('placa')
                if not placa:
                    return jsonify({'success': False, 'error': 'Placa é obrigatória para descarga rodoviária'}), 400
            elif modo == 'ferroviaria':
                vagao = dados.get('vagao')
                if not vagao:
                    return jsonify({'success': False, 'error': 'Vagão é obrigatório para descarga ferroviária'}), 400
        
        elif tipo_operacao == 'carregamento':
            # Container está sendo carregado para sair do pátio
            posicao = 'EM TRANSITO'
            
            # ✅ NOVA VERIFICAÇÃO: Verificar se já existe uma operação recente para este container
            # Verificar operações nos últimos 5 minutos
            cinco_minutos_atras = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                '''
                SELECT id FROM operacoes 
                WHERE container_id = (SELECT id FROM containers WHERE numero = ?) 
                AND tipo = ? 
                AND data_operacao > ?
                ''', 
                (container_numero, tipo_operacao, cinco_minutos_atras)
            )
            
            operacao_recente = cursor.fetchone()
            if operacao_recente:
                return jsonify({
                    'success': False, 
                    'error': f'Já existe uma operação de {tipo_operacao} registrada para este container nos últimos 5 minutos.'
                }), 400
            
            # Validar modo de transporte
            if modo not in ['rodoviaria', 'ferroviaria']:
                return jsonify({'success': False, 'error': 'Modo de transporte inválido para carregamento'}), 400
            
            if modo == 'rodoviaria':
                placa = dados.get('placa')
                if not placa:
                    return jsonify({'success': False, 'error': 'Placa é obrigatória para carregamento rodoviário'}), 400
            elif modo == 'ferroviaria':
                vagao = dados.get('vagao')
                if not vagao:
                    return jsonify({'success': False, 'error': 'Vagão é obrigatório para carregamento ferroviário'}), 400
        
        elif tipo_operacao == 'movimentacao':
            # ✅ VALIDAÇÕES ESPECIAIS PARA MOVIMENTAÇÃO
            posicao_original = dados.get('posicao_original')
            posicao = dados.get('posicao')  # Nova posição
            
            if not posicao_original:
                return jsonify({'success': False, 'error': 'Posição original é obrigatória para movimentação'}), 400
            if not posicao:
                return jsonify({'success': False, 'error': 'Nova posição é obrigatória para movimentação'}), 400
                
            # ✅ NOVA VERIFICAÇÃO: Verificar se a nova posição já está ocupada por outro container na mesma unidade
            cursor.execute(
                'SELECT numero FROM containers WHERE posicao_atual = ? AND status = "no patio" AND numero != ? AND unidade = ?', 
                (posicao, container_numero, unidade_usuario)
            )
            container_existente = cursor.fetchone()
            
            if container_existente:
                return jsonify({
                    'success': False, 
                    'error': f'Posição {posicao} já está ocupada pelo container {container_existente[0]}. Escolha outra posição.'
                }), 400
                
            # ✅ NOVA VERIFICAÇÃO: Verificar se já existe uma operação recente para este container
            # Verificar operações nos últimos 5 minutos
            cinco_minutos_atras = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                '''
                SELECT id FROM operacoes 
                WHERE container_id = (SELECT id FROM containers WHERE numero = ?) 
                AND tipo = ? 
                AND data_operacao > ?
                ''', 
                (container_numero, tipo_operacao, cinco_minutos_atras)
            )
            
            operacao_recente = cursor.fetchone()
            if operacao_recente:
                return jsonify({
                    'success': False, 
                    'error': f'Já existe uma operação de {tipo_operacao} registrada para este container nos últimos 5 minutos.'
                }), 400
            
            # ✅ VALIDAÇÃO EXTRA: Verificar se o container realmente está na posição original informada
            cursor.execute('SELECT posicao_atual FROM containers WHERE numero = ?', (container_numero,))
            container_atual = cursor.fetchone()
            
            if container_atual:
                posicao_atual_bd = container_atual[0]
                if posicao_atual_bd != posicao_original:
                    return jsonify({
                        'success': False, 
                        'error': f'Posição original informada ({posicao_original}) não confere com a posição atual no sistema ({posicao_atual_bd}). Atualize os dados e tente novamente.'
                    }), 400
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'Usuário não encontrado'
            }), 404
        
        unidade_usuario = user_data[0]
        
        # Verificar se o container já existe na unidade do usuário
        cursor.execute('SELECT id, posicao_atual, status, unidade FROM containers WHERE numero = ?', (container_numero,))
        container = cursor.fetchone()
        container_id = None
        
        # Se o container existe mas é de outra unidade
        if container and container[3] != unidade_usuario and tipo_operacao != 'descarga':
            return jsonify({
                'success': False,
                'error': f'Container {container_numero} pertence à unidade {container[3]} e não à sua unidade ({unidade_usuario})'
            }), 400
        
        data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Se o container não existe e é uma operação de descarga, criar novo container
        if not container and tipo_operacao == 'descarga':
            cursor.execute(
                'INSERT INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao, unidade) VALUES (?, ?, ?, ?, ?, ?)',
                (container_numero, 'no patio', posicao, data_atual, data_atual, unidade_usuario)
            )
            container_id = cursor.lastrowid
            logger.info(f"Novo container criado: {container_numero} na posição {posicao} na unidade {unidade_usuario}")
        elif not container:
            return jsonify({'success': False, 'error': f'Container {container_numero} não encontrado no sistema'}), 400
        else:
            container_id = container[0]
            
            # ✅ VALIDAÇÕES ADICIONAIS PARA OPERAÇÕES EM CONTAINERS EXISTENTES
            if tipo_operacao == 'carregamento':
                # Para carregamento, verificar se o container está no pátio
                if container[2] != 'no patio':
                    return jsonify({
                        'success': False, 
                        'error': f'Container {container_numero} não está disponível para carregamento (Status atual: {container[2]})'
                    }), 400
                
                # Carregamento: container sai do pátio
                cursor.execute(
                    'UPDATE containers SET status = ?, posicao_atual = NULL, ultima_atualizacao = ? WHERE id = ?',
                    ('fora do patio', data_atual, container_id)
                )
                logger.info(f"Container {container_numero} carregado - removido do pátio")
                
            elif tipo_operacao == 'movimentacao':
                # Para movimentação, verificar se está no pátio
                if container[2] != 'no patio':
                    return jsonify({
                        'success': False, 
                        'error': f'Container {container_numero} não pode ser movimentado (Status atual: {container[2]})'
                    }), 400
                
                # Movimentação: atualizar para nova posição
                cursor.execute(
                    'UPDATE containers SET posicao_atual = ?, ultima_atualizacao = ? WHERE id = ?',
                    (posicao, data_atual, container_id)
                )
                logger.info(f"Container {container_numero} movimentado de {posicao_original} para {posicao}")
                
            elif tipo_operacao == 'descarga':
                # Descarga: container entra no pátio com posição específica
                cursor.execute(
                    'UPDATE containers SET status = ?, posicao_atual = ?, ultima_atualizacao = ? WHERE id = ?',
                    ('no patio', posicao, data_atual, container_id)
                )
                logger.info(f"Container {container_numero} descarregado na posição {posicao}")
        
        # Obter ID do usuário
        username = session.get('username', 'sistema')
        cursor.execute('SELECT id FROM usuarios WHERE username = ?', (username,))
        usuario = cursor.fetchone()
        usuario_id = usuario[0] if usuario else 1  # ID 1 é geralmente o admin
        
        # ✅ INSERIR OPERAÇÃO NO BANCO DE DADOS (MELHORADO)
        if tipo_operacao in ['descarga', 'carregamento']:
            if modo == 'rodoviaria':
                cursor.execute(
                    'INSERT INTO operacoes (tipo, modo, container_id, posicao, placa, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (tipo_operacao, modo, container_id, posicao, placa, data_atual, usuario_id, observacoes)
                )
            elif modo == 'ferroviaria':
                cursor.execute(
                    'INSERT INTO operacoes (tipo, modo, container_id, posicao, vagao, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (tipo_operacao, modo, container_id, posicao, vagao, data_atual, usuario_id, observacoes)
                )
        else:  # movimentacao
            # ✅ Para movimentação, armazenar informação completa da movimentação
            posicao_completa = f"DE: {posicao_original} → PARA: {posicao}"
            cursor.execute(
                'INSERT INTO operacoes (tipo, container_id, posicao, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
                (tipo_operacao, container_id, posicao_completa, data_atual, usuario_id, observacoes)
            )
        
        try:
            # Commit das alterações
            if db.isolation_level is not None:  # Se não estiver em modo autocommit
                db.commit()
            
            # Usar a função log_activity melhorada
            log_success = log_activity(
                username, 
                'info', 
                'OPERACAO', 
                f'{tipo_operacao.upper()}: Container {container_numero} {f"({posicao_original} → {posicao})" if tipo_operacao == "movimentacao" else f"- {posicao}" if posicao != "EM TRANSITO" else "carregado"}'
            )
            
            if not log_success:
                logger.warning("Não foi possível registrar o log, mas a operação foi concluída")
            
            # Log da operação
            logger.info(f"✅ Operação registrada: {tipo_operacao} - Container: {container_numero} - Usuário: {username}")
            
            # ✅ MENSAGEM DE SUCESSO PERSONALIZADA
            if tipo_operacao == 'movimentacao':
                mensagem = f'Movimentação registrada: Container {container_numero} movido de {posicao_original} para {posicao}'
            elif tipo_operacao == 'descarga':
                mensagem = f'Descarga registrada: Container {container_numero} posicionado em {posicao}'
            elif tipo_operacao == 'carregamento':
                mensagem = f'Carregamento registrado: Container {container_numero} removido do pátio'
            else:
                mensagem = f'Operação de {tipo_operacao} registrada com sucesso!'
            
            return jsonify({
                'success': True, 
                'message': mensagem
            })
            
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                logger.error(f"Erro de bloqueio do banco de dados: {str(e)}")
                return jsonify({
                    'success': False, 
                    'error': 'O banco de dados está temporariamente indisponível. Tente novamente em alguns instantes.'
                }), 503  # Service Unavailable
            else:
                logger.error(f"Erro operacional do SQLite: {str(e)}")
                return jsonify({'success': False, 'error': 'Erro ao processar a operação. Tente novamente.'}), 500
        
    except Exception as e:
        logger.error(f"Erro ao registrar operação: {str(e)}")
        # Retornar erro genérico sem expor detalhes internos
        return jsonify({
            'success': False,
            'error': 'Ocorreu um erro ao processar a operação. Por favor, tente novamente.'
        }), 500


@operacoes_bp.route('/verificar-container', methods=['GET'])
@login_required
def verificar_container():
    # Verificar se um container existe e retornar seu status
    try:
        numero_container = request.args.get('numero')
        
        if not numero_container:
            return jsonify({'success': False, 'error': 'Número do container é obrigatório'}), 400
        
        # Normalizar o número do container
        numero_container = numero_container.upper().strip()
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'Usuário não encontrado'
            }), 404
        
        unidade_usuario = user_data[0]
        
        # Buscar o container na unidade do usuário
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, unidade
            FROM containers 
            WHERE numero = ? AND unidade = ?
        ''', (numero_container, unidade_usuario))
        
        container = cursor.fetchone()
        
        if not container:
            # Verificar se o container existe em outra unidade
            cursor.execute('''
                SELECT unidade
                FROM containers 
                WHERE numero = ?
            ''', (numero_container,))
            
            outro_container = cursor.fetchone()
            
            if outro_container:
                return jsonify({
                    'success': False,
                    'exists': True,
                    'wrong_unit': True,
                    'message': f'Container pertence à unidade {outro_container[0]} e não à sua unidade ({unidade_usuario})'
                })
            else:
                return jsonify({
                    'success': False,
                    'exists': False,
                    'message': 'Container não encontrado no sistema'
                })
        
        # Verificar se o container está no pátio
        no_patio = container[2] == 'no patio'
        
        return jsonify({
            'success': True,
            'exists': True,
            'no_patio': no_patio,
            'status': container[2],
            'posicao': container[3] if container[3] else '',
            'unidade': container[4]
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar container: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro ao verificar container'}), 500


@operacoes_bp.route('/buscar_container', methods=['GET'])
@login_required
def buscar_container():
    """
    Busca informações de um container pelo número
    ✅ MELHORADO: Informações mais detalhadas para suporte à movimentação
    ✅ MELHORADO: Filtro por unidade do usuário logado
    """
    try:
        numero_container = request.args.get('numero')
        
        if not numero_container:
            return jsonify({'success': False, 'error': 'Número do container é obrigatório'}), 400
        
        # Normalizar o número do container
        numero_container = numero_container.upper().strip()
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'Usuário não encontrado'
            }), 404
        
        unidade_usuario = user_data[0]
        
        # Buscar o container na unidade do usuário
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, unidade
            FROM containers 
            WHERE numero = ? AND unidade = ?
        ''', (numero_container, unidade_usuario))
        
        container = cursor.fetchone()
        
        if not container:
            # Verificar se o container existe em outra unidade
            cursor.execute('''
                SELECT unidade
                FROM containers 
                WHERE numero = ?
            ''', (numero_container,))
            
            outro_container = cursor.fetchone()
            
            if outro_container:
                return jsonify({
                    'success': False,
                    'wrong_unit': True,
                    'message': f'Container pertence à unidade {outro_container[0]} e não à sua unidade ({unidade_usuario})'
                })
            else:
                return jsonify({'success': False, 'message': 'Container não encontrado'})
        
        # Converter para dicionário
        container_data = {
            'id': container[0],
            'numero': container[1],
            'status': container[2],
            'posicao_atual': container[3],
            'data_criacao': container[4],
            'ultima_atualizacao': container[5],
            'unidade': container[6]
        }
        
        # Buscar histórico de operações
        cursor.execute('''
            SELECT tipo, modo, posicao, placa, vagao, data_operacao, observacoes
            FROM operacoes
            WHERE container_id = ?
            ORDER BY data_operacao DESC
            LIMIT 10
        ''', (container[0],))
        
        operacoes_raw = cursor.fetchall()
        operacoes = []
        
        for op in operacoes_raw:
            operacao = {
                'tipo': op[0],
                'modo': op[1],
                'posicao': op[2],
                'placa': op[3],
                'vagao': op[4],
                'data_operacao': op[5],
                'observacoes': op[6]
            }
            operacoes.append(operacao)
        
        return jsonify({
            'success': True,
            'container': container_data,
            'operacoes': operacoes
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar container: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro ao buscar container. Tente novamente.'}), 500