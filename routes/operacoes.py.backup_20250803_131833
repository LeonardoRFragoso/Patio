from flask import Blueprint, request, jsonify, current_app, session, g, render_template, redirect, url_for, flash
from datetime import datetime, timedelta
import logging
import sqlite3
import time
from functools import wraps
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import BadRequest
from db import get_db, log_activity
from auth.routes import login_required
from utils.permissions import operador_required, inventariante_required, admin_required
from posicoes_suzano import patio_suzano

# Configuração de logging para este módulo
logger = logging.getLogger('operacoes')

operacoes_bp = Blueprint('operacoes', __name__)

# Função decoradora para verificar se o usuário pertence à unidade Suzano
def suzano_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        username = session.get('username')
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        
        if not user_data or user_data[0].upper() != 'SUZANO':
            # Verificar se é uma requisição AJAX/JSON
            if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': False,
                    'error': 'Esta funcionalidade está disponível apenas para a unidade Suzano.'
                }), 403
            else:
                flash('Esta funcionalidade está disponível apenas para a unidade Suzano.', 'warning')
                return redirect(url_for('auth.dashboard'))
        
        return f(*args, **kwargs)
    return decorated_function

# Rota para registrar carregamento de containers
@operacoes_bp.route('/registrar_carregamento', methods=['POST'])
@login_required
@operador_required
def registrar_carregamento():
    """
    Registra o carregamento de um container (rodoviário ou ferroviário)
    Recebe os dados via POST em formato JSON
    """
    try:
        logger.info(f"🚛 DEBUG - Iniciando registrar_carregamento")
        logger.info(f"🚛 DEBUG - Request method: {request.method}")
        logger.info(f"🚛 DEBUG - Request is_json: {request.is_json}")
        logger.info(f"🚛 DEBUG - Request content_type: {request.content_type}")
        
        # Verificar se os dados foram enviados como JSON
        if not request.is_json:
            logger.error(f"🚛 DEBUG - Dados não são JSON")
            return jsonify({
                'success': False,
                'message': 'Dados devem ser enviados em formato JSON'
            }), 400
        
        # Obter os dados do request
        data = request.get_json()
        logger.info(f"🚛 DEBUG - Dados recebidos: {data}")
        
        # Validar dados obrigatórios
        container_id = data.get('container_id')
        modo = data.get('modo')
        observacoes = data.get('observacoes', '')
        
        logger.info(f"🚛 DEBUG - container_id: {container_id}")
        logger.info(f"🚛 DEBUG - modo: {modo}")
        logger.info(f"🚛 DEBUG - observacoes: {observacoes}")
        
        if not container_id or not modo:
            logger.error(f"🚛 DEBUG - Dados obrigatórios faltando: container_id={container_id}, modo={modo}")
            return jsonify({
                'success': False,
                'message': 'Número do container e modo de transporte são obrigatórios'
            }), 400
        
        # Validar modo de transporte
        if modo not in ['rodoviaria', 'ferroviaria']:
            logger.error(f"🚛 DEBUG - Modo inválido: {modo}")
            return jsonify({
                'success': False,
                'message': 'Modo de transporte inválido'
            }), 400
        
        logger.info(f"🚛 DEBUG - Modo válido: {modo}")
        
        # Validar dados específicos do modo
        if modo == 'rodoviaria':
            placa = data.get('placa')
            logger.info(f"🚛 DEBUG - Modo rodoviário, placa: {placa}")
            if not placa:
                logger.error(f"🚛 DEBUG - Placa faltando para modo rodoviário")
                return jsonify({
                    'success': False,
                    'message': 'Placa do caminhão é obrigatória para carregamento rodoviário'
                }), 400
        elif modo == 'ferroviaria':
            vagao = data.get('vagao')
            logger.info(f"🚛 DEBUG - Modo ferroviário, vagão: {vagao}")
            if not vagao:
                logger.error(f"🚛 DEBUG - Vagão faltando para modo ferroviário")
                return jsonify({
                    'success': False,
                    'message': 'Número do vagão é obrigatório para carregamento ferroviário'
                }), 400
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        logger.info(f"🚛 DEBUG - Username da sessão: {username}")
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        if not user_data:
            logger.error(f"🚛 DEBUG - Usuário não encontrado: {username}")
            return jsonify({
                'success': False,
                'message': 'Usuário não encontrado'
            }), 404
        
        unidade_usuario = user_data[0]
        logger.info(f"🚛 DEBUG - Unidade do usuário: {unidade_usuario}")
        
        # Verificar se o container existe e está disponível para carregamento
        logger.info(f"🚛 DEBUG - Buscando container: {container_id} na unidade: {unidade_usuario}")
        cursor.execute('''
            SELECT numero, status, posicao_atual
            FROM containers 
            WHERE numero = ? AND unidade = ?
        ''', (container_id, unidade_usuario))
        
        container = cursor.fetchone()
        logger.info(f"🚛 DEBUG - Container encontrado: {container}")
        
        if not container:
            logger.error(f"🚛 DEBUG - Container não encontrado: {container_id} na unidade {unidade_usuario}")
            return jsonify({
                'success': False,
                'message': 'Container não encontrado na unidade atual'
            }), 404
        
        # Verificar se o container está disponível para carregamento
        container_status = container[1]
        logger.info(f"🚛 DEBUG - Status do container: {container_status}")
        
        if container_status != 'no patio':
            logger.error(f"🚛 DEBUG - Container não disponível. Status: {container_status}")
            return jsonify({
                'success': False,
                'message': f'Container não está disponível para carregamento. Status atual: {container_status}'
            }), 400
        
        # Registrar o carregamento
        data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        logger.info(f"🚛 DEBUG - Data/hora: {data_hora}")
        
        # Atualizar o status do container
        logger.info(f"🚛 DEBUG - Atualizando status do container para 'carregado'")
        cursor.execute('''
            UPDATE containers
            SET status = 'carregado', 
                ultima_atualizacao = ?,
                posicao_atual = NULL
            WHERE numero = ? AND unidade = ?
        ''', (data_hora, container_id, unidade_usuario))
        
        # Registrar a operação de carregamento
        user_id = session.get('user_id')
        logger.info(f"🚛 DEBUG - User ID da sessão: {user_id}")
        
        if modo == 'rodoviaria':
            placa_valor = data.get('placa')
            logger.info(f"🚛 DEBUG - Inserindo carregamento rodoviário - placa: {placa_valor}")
            cursor.execute('''
                INSERT INTO operacoes_carregamento 
                (container_id, data_hora, tipo, placa, observacoes, usuario_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (container_id, data_hora, 'rodoviaria', placa_valor, observacoes, user_id))
        else:  # ferroviaria
            vagao_valor = data.get('vagao')
            logger.info(f"🚛 DEBUG - Inserindo carregamento ferroviário - vagão: {vagao_valor}")
            logger.info(f"🚛 DEBUG - Parâmetros: container_id={container_id}, data_hora={data_hora}, tipo=ferroviaria, vagao={vagao_valor}, observacoes={observacoes}, user_id={user_id}")
            cursor.execute('''
                INSERT INTO operacoes_carregamento 
                (container_id, data_hora, tipo, vagao, observacoes, usuario_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (container_id, data_hora, 'ferroviaria', vagao_valor, observacoes, user_id))
        
        # Registrar atividade no log
        logger.info(f"🚛 DEBUG - Registrando atividade no log")
        log_activity(
            username, 
            f"Registrou carregamento {modo} do container {container_id}", 
            'carregamento', 
            container_id
        )
        
        # Commit das alterações
        logger.info(f"🚛 DEBUG - Fazendo commit das alterações")
        db.commit()
        logger.info(f"🚛 DEBUG - Commit realizado com sucesso")
        
        logger.info(f"Container {container_id} carregado com sucesso via {modo} por {username}")
        
        logger.info(f"🚛 DEBUG - Retornando resposta de sucesso")
        return jsonify({
            'success': True,
            'message': 'Carregamento registrado com sucesso',
            'container': container_id,
            'modo': modo,
            'data_hora': data_hora
        })
        
    except Exception as e:
        logger.error(f"🚛 DEBUG - ERRO CAPTURADO: {str(e)}")
        logger.error(f"🚛 DEBUG - Tipo do erro: {type(e).__name__}")
        import traceback
        logger.error(f"🚛 DEBUG - Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False, 
            'message': f'Erro ao registrar carregamento: {str(e)}'
        }), 500

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
@suzano_required
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
        
        # Buscar containers que estão no pátio ou carregados e têm posição definida
        # Incluir containers carregados para permitir movimentação após carregamento
        # Filtrar pela unidade do usuário
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE status IN ('no patio', 'carregado') 
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
        
        logger.info(f"Retornando {len(containers)} containers disponíveis para movimentação na unidade {unidade_usuario} (incluindo status 'no patio' e 'carregado')")
        
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
        if container[1] not in ['no patio', 'carregado']:
            return jsonify({
                'success': False,
                'message': f'Container {container_numero} não está disponível para movimentação (Status: {container[1]})'
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

# ✅ NOVO ENDPOINT: Listar containers vistoriados para descarga

# -------------------------------------------------------------
# 🔄 NOVOS RECURSOS: CORREÇÃO DE DESCARGA (Perfil Operador)
# -------------------------------------------------------------
# Tabela de auditoria para rastrear correções de descarga
# Será criada dinamicamente na primeira chamada se ainda não existir

def _ensure_table_correcoes_descarga(db):
    """Cria a tabela correcoes_descarga se não existir"""
    cursor = db.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS correcoes_descarga (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operacao_id INTEGER NOT NULL,
            container_id INTEGER NOT NULL,
            posicao_anterior TEXT NOT NULL,
            posicao_corrigida TEXT NOT NULL,
            data_correcao TEXT NOT NULL,
            usuario_id INTEGER NOT NULL,
            unidade TEXT NOT NULL,
            observacoes TEXT,
            FOREIGN KEY(operacao_id) REFERENCES operacoes(id),
            FOREIGN KEY(container_id) REFERENCES containers(id),
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    ''')


def _get_unidade_usuario(cursor, username: str):
    """Auxiliar para obter unidade do usuário"""
    cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
    row = cursor.fetchone()
    return row[0] if row else None


@operacoes_bp.route('/descargas/corrigir', methods=['GET'])
@login_required
@admin_required  # Ambos os tipos de admin podem acessar
def listar_descargas_corrigiveis():
    """Lista descargas que podem ser corrigidas (última operação do container é descarga e container ainda está no pátio)"""
    try:
        # Obter informações do usuário da sessão
        username = session.get('username')
        unidade = session.get('unidade')
        nivel = session.get('nivel')
        
        current_app.logger.info(f"Usuário {username} (nível: {nivel}) solicitando lista de descargas corrigíveis")
        
        # Admin Administrativo pode ver containers de todas as unidades
        if nivel == 'admin_administrativo':
            current_app.logger.info("Admin Administrativo: buscando containers de TODAS as unidades")
            unidade_filtro = None
        else:
            current_app.logger.info(f"Buscando containers no pátio da unidade: {unidade}")
            unidade_filtro = unidade
        
        db = get_db()
        cursor = db.cursor()
        
        # Obter ID do usuário logado para relacionar nas operações
        cursor.execute('SELECT id FROM usuarios WHERE username = ?', (username,))
        user_row = cursor.fetchone()
        user_id = user_row[0] if user_row else 1  # fallback para 1 caso não encontre

        # Buscar containers no pátio
        cursor.execute("""
            SELECT COUNT(*) FROM containers 
            WHERE status = 'no patio'
        """)
        total_containers = cursor.fetchone()[0]
        current_app.logger.info(f"Total de containers no pátio (todas unidades): {total_containers}")
        
        # Buscar containers no pátio (filtrar por unidade se não for admin administrativo)
        if unidade_filtro:
            cursor.execute("""
                SELECT COUNT(*) FROM containers 
                WHERE status = 'no patio' AND unidade = ?
            """, (unidade_filtro,))
            total_unidade = cursor.fetchone()[0]
            current_app.logger.info(f"Total de containers no pátio da unidade {unidade_filtro}: {total_unidade}")
        else:
            total_unidade = total_containers
            current_app.logger.info(f"Total de containers no pátio (todas as unidades): {total_unidade}")
        
        # Em ambiente de desenvolvimento, criar containers de teste se não houver nenhum
        if current_app.config.get('ENV') == 'development' and total_unidade == 0:
            current_app.logger.info("Criando containers de teste para ambiente de desenvolvimento")
            
            # Verificar se já existem containers de teste
            cursor.execute("""
                SELECT COUNT(*) FROM containers 
                WHERE numero LIKE 'TEST%'
            """)
            total_teste = cursor.fetchone()[0]
            
            if total_teste == 0:
                # Criar containers de teste
                _criar_containers_teste(db, unidade)
            else:
                current_app.logger.info("Containers de teste já existem")
        
        # Adicionar logs detalhados para diagnóstico
        current_app.logger.info("Verificando todas as operações de descarga existentes:")
        cursor.execute("""
            SELECT o.id, o.container_id, o.tipo, c.numero, c.status, c.unidade
            FROM operacoes o
            JOIN containers c ON o.container_id = c.id
            WHERE o.tipo = 'descarga'
            LIMIT 10
        """)
        for op in cursor.fetchall():
            current_app.logger.info(f"Descarga ID: {op[0]}, Container: {op[3]}, Status: {op[4]}, Unidade: {op[5]}")
        
        # Verificar containers no pátio (filtrar por unidade se não for admin administrativo)
        if unidade_filtro:
            current_app.logger.info(f"Containers no pátio da unidade {unidade_filtro}:")
            cursor.execute("""
                SELECT id, numero, status, unidade, posicao_atual
                FROM containers
                WHERE status = 'no patio' AND unidade = ?
                LIMIT 10
            """, (unidade_filtro,))
        else:
            current_app.logger.info("Containers no pátio (todas as unidades):")
            cursor.execute("""
                SELECT id, numero, status, unidade, posicao_atual
                FROM containers
                WHERE status = 'no patio'
                LIMIT 10
            """)
        
        containers_no_patio = cursor.fetchall()
        for c in containers_no_patio:
            current_app.logger.info(f"Container ID: {c[0]}, Numero: {c[1]}, Status: {c[2]}, Unidade: {c[3]}, Posição: {c[4]}")
        
        # Verificar se os containers no pátio têm operações de descarga e criar se necessário
        # Removida a verificação de ambiente para garantir que funcione em qualquer ambiente
        current_app.logger.info(f"Verificando operações de descarga para {len(containers_no_patio)} containers no pátio")
        if len(containers_no_patio) > 0:
            for container in containers_no_patio:
                container_id = container[0]
                # Verificar se já existe uma operação de descarga para este container
                cursor.execute("""
                    SELECT COUNT(*) FROM operacoes 
                    WHERE container_id = ? AND tipo = 'descarga'
                """, (container_id,))
                
                if cursor.fetchone()[0] == 0:
                    # Não existe operação de descarga, criar uma
                    current_app.logger.info(f"Criando operação de descarga para container {container[1]} (ID: {container_id})")
                    data_operacao = datetime.utcnow().isoformat(sep=' ', timespec='seconds')
                    posicao = container[4]  # posicao_atual
                    
                    cursor.execute("""
                        INSERT INTO operacoes (container_id, tipo, modo, posicao, data_operacao, usuario_id)
                         VALUES (?, 'descarga', 'rodoviario', ?, ?, ?)
                     """, (container_id, posicao, data_operacao, user_id))
                    
            # Commit das alterações
            db.commit()
        
        # Buscar containers para correção (filtrar por unidade se não for admin administrativo)
        # Verificar se as operações existem e são válidas e se a última operação foi uma descarga
        current_app.logger.info("Executando consulta principal para containers corrigíveis:")
        
        if unidade_filtro:
            # Admin normal: apenas da sua unidade
            cursor.execute("""
                SELECT 
                    o.id AS operacao_id,
                    c.numero AS container_numero,
                    c.posicao_atual,
                    c.status,
                    o.data_operacao,
                    o.tipo,
                    c.unidade
                FROM operacoes o
                JOIN containers c ON o.container_id = c.id
                JOIN (SELECT container_id, MAX(data_operacao) as ultima_data 
                      FROM operacoes 
                      GROUP BY container_id) ultima 
                    ON o.container_id = ultima.container_id AND o.data_operacao = ultima.ultima_data
                WHERE c.unidade = ? 
                    AND o.tipo = 'descarga'
                    AND c.status = 'no patio'
                    AND o.id IS NOT NULL
                    AND c.id IS NOT NULL
                ORDER BY o.data_operacao DESC
                LIMIT 20
            """, (unidade_filtro,))
        else:
            # Admin Administrativo: todas as unidades
            cursor.execute("""
                SELECT 
                    o.id AS operacao_id,
                    c.numero AS container_numero,
                    c.posicao_atual,
                    c.status,
                    o.data_operacao,
                    o.tipo,
                    c.unidade
                FROM operacoes o
                JOIN containers c ON o.container_id = c.id
                JOIN (SELECT container_id, MAX(data_operacao) as ultima_data 
                      FROM operacoes 
                      GROUP BY container_id) ultima 
                    ON o.container_id = ultima.container_id AND o.data_operacao = ultima.ultima_data
                WHERE o.tipo = 'descarga'
                    AND c.status = 'no patio'
                    AND o.id IS NOT NULL
                    AND c.id IS NOT NULL
                ORDER BY o.data_operacao DESC
                LIMIT 50
            """)
        
        containers = []
        for row in cursor.fetchall():
            # Verificar se a operação realmente existe
            operacao_id = row[0]
            cursor.execute("SELECT COUNT(*) FROM operacoes WHERE id = ?", (operacao_id,))
            if cursor.fetchone()[0] > 0:
                containers.append({
                    'operacao_id': operacao_id,
                    'container_numero': row[1],
                    'posicao_atual': row[2],
                    'status': row[3],
                    'data_operacao': row[4],
                    'tipo_operacao': row[5],
                    'unidade': row[6] if len(row) > 6 else 'N/A'
                })
                current_app.logger.info(f"Container válido para correção: {row[1]}, Operação: {operacao_id}, Tipo: {row[5]}")
            else:
                current_app.logger.warning(f"Operação ID {operacao_id} não encontrada no banco de dados")
        
        current_app.logger.info(f"Encontrados {len(containers)} containers válidos para possível correção")
        
        return jsonify({
            'success': True,
            'containers': containers,
            'descargas': containers,  # alias for frontend compatibility
            'data': containers,       # alias for older frontend code
            'count': len(containers)
        })
    except Exception as e:
        current_app.logger.error(f"Erro ao listar descargas corrigíveis: {str(e)}")
        return jsonify({'success': False, 'error': f'Erro ao listar descargas: {str(e)}'}), 500


def _criar_containers_teste(db, unidade):
    """Cria alguns containers de teste para ambiente de desenvolvimento"""
    try:
        cursor = db.cursor()
        # Verificar se já existem containers de teste
        cursor.execute("SELECT COUNT(*) FROM containers WHERE numero LIKE 'TEST%'")
        if cursor.fetchone()[0] > 0:
            logger.info("Containers de teste já existem")
            return
            
        # Criar 3 containers de teste
        # Obter um usuário (primeiro da tabela) para referenciar nas operações de teste
        cursor.execute("SELECT id FROM usuarios LIMIT 1")
        row_user = cursor.fetchone()
        user_id = row_user[0] if row_user else 1

        for i in range(1, 4):
            numero = f"TEST{i:04d}"
            posicao = f"A0{i}-{i}"
            data_criacao = datetime.utcnow().isoformat(sep=' ', timespec='seconds')
            
            cursor.execute("""
                INSERT INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao, unidade)
                VALUES (?, 'no patio', ?, ?, ?, ?)
            """, (numero, posicao, data_criacao, data_criacao, unidade))
            
            # Obter o ID do container inserido
            cursor.execute("SELECT last_insert_rowid()")
            container_id = cursor.fetchone()[0]
            
            # Criar uma operação de descarga para o container
            cursor.execute("""
                 INSERT INTO operacoes (container_id, tipo, data_operacao, usuario_id)
                 VALUES (?, 'descarga', ?, ?)
             """, (container_id, data_criacao, user_id))
            
        db.commit()
        logger.info("Containers de teste criados com sucesso")
    except Exception as e:
        logger.error(f"Erro ao criar containers de teste: {str(e)}")
        db.rollback()


@operacoes_bp.route('/descargas/<int:operacao_id>/detalhes', methods=['GET'])
@login_required
@admin_required  # Ambos os tipos de admin podem acessar
def obter_detalhes_container_vistoria(operacao_id):
    """Obtém detalhes completos de um container e sua vistoria para edição"""
    try:
        db = get_db()
        cursor = db.cursor()

        # Obter informações do container e operação
        cursor.execute('''
            SELECT 
                o.id AS operacao_id,
                o.container_id,
                c.numero,
                c.posicao_atual,
                c.status,
                c.unidade,
                c.tipo_container,
                c.tamanho,
                c.capacidade,
                c.tara,
                c.armador,
                c.booking,
                o.data_operacao
            FROM operacoes o
            JOIN containers c ON o.container_id = c.id
            WHERE o.id = ?
        ''', (operacao_id,))
        container_row = cursor.fetchone()
        
        if not container_row:
            return jsonify({'success': False, 'error': 'Operação não encontrada'}), 404
            
        # Extrair dados do container
        container_data = {
            'operacao_id': container_row[0],
            'container_id': container_row[1],
            'numero': container_row[2],
            'posicao_atual': container_row[3],
            'status': container_row[4],
            'unidade': container_row[5],
            'tipo_container': container_row[6],
            'tamanho': container_row[7],
            'capacidade': container_row[8],
            'tara': container_row[9],
            'armador': container_row[10],
            'booking': container_row[11],
            'data_operacao': container_row[12]
        }
        
        # Buscar dados da vistoria mais recente para este container
        cursor.execute('''
            SELECT 
                id,
                container_numero,
                iso_container,
                capacidade,
                tara,
                data_vistoria,
                armador,
                status,
                lacre,
                observacoes_gerais,
                tipo_container,
                tamanho,
                tipo_operacao,
                condicao,
                placa,
                vagao
            FROM vistorias
            WHERE container_numero = ?
            ORDER BY data_vistoria DESC
            LIMIT 1
        ''', (container_data['numero'],))
        vistoria_row = cursor.fetchone()
        
        vistoria_data = {}
        if vistoria_row:
            vistoria_data = {
                'vistoria_id': vistoria_row[0],
                'container_numero': vistoria_row[1],
                'iso_container': vistoria_row[2],
                'capacidade': vistoria_row[3],
                'tara': vistoria_row[4],
                'data_vistoria': vistoria_row[5],
                'armador': vistoria_row[6],
                'status': vistoria_row[7],
                'lacre': vistoria_row[8],
                'observacoes_gerais': vistoria_row[9],
                'tipo_container': vistoria_row[10],
                'tamanho': vistoria_row[11],
                'tipo_operacao': vistoria_row[12],
                'condicao': vistoria_row[13],
                'placa': vistoria_row[14],
                'vagao': vistoria_row[15]
            }
            
            # Buscar avarias registradas na vistoria
            cursor.execute('''
                SELECT 
                    estrutura_codigo,
                    estrutura_nome,
                    avaria_codigo,
                    avaria_nome,
                    observacoes
                FROM avarias_vistoria
                WHERE vistoria_id = ?
            ''', (vistoria_data['vistoria_id'],))
            avarias_rows = cursor.fetchall()
            
            avarias = []
            for avaria_row in avarias_rows:
                avarias.append({
                    'estrutura_codigo': avaria_row[0],
                    'estrutura_nome': avaria_row[1],
                    'avaria_codigo': avaria_row[2],
                    'avaria_nome': avaria_row[3],
                    'observacoes': avaria_row[4]
                })
            
            vistoria_data['avarias'] = avarias
        
        return jsonify({
            'success': True,
            'container': container_data,
            'vistoria': vistoria_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter detalhes para correção: {str(e)}")
        return jsonify({'success': False, 'error': f'Erro ao obter detalhes: {str(e)}'}), 500


@operacoes_bp.route('/descargas/<int:operacao_id>/corrigir', methods=['PUT'])
@login_required
@admin_required  # Ambos os tipos de admin podem acessar
def corrigir_descarga(operacao_id):
    """Aplica correção de posição e outros campos para uma descarga existente."""
    from posicoes_suzano import patio_suzano  # import local para evitar import circular

    try:
        dados = request.get_json() or {}
        nova_posicao = dados.get('nova_posicao', '').strip().upper()
        observacoes = dados.get('observacoes', '').strip()
        if not nova_posicao:
            return jsonify({'success': False, 'error': 'Nova posição é obrigatória'}), 400

        db = get_db()
        _ensure_table_correcoes_descarga(db)
        cursor = db.cursor()

        # Verificar operação de descarga
        cursor.execute('''
            SELECT o.container_id, c.posicao_atual, c.status, c.unidade, c.numero
            FROM operacoes o
            JOIN containers c ON o.container_id = c.id
            WHERE o.id = ?
        ''', (operacao_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'Operação não encontrada'}), 404

        container_id, posicao_anterior, status_container, unidade_container, numero_container = row

        # Verificar unidade do usuário
        username = session.get('username')
        cursor.execute('SELECT id, unidade, nivel FROM usuarios WHERE username = ?', (username,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({'success': False, 'error': 'Usuário não encontrado'}), 400
        usuario_id, unidade_usuario, nivel_usuario = user_row
        
        # Admin Administrativo pode corrigir descargas de TODAS as unidades
        if nivel_usuario != 'admin_administrativo':
            if unidade_usuario.upper() != unidade_container.upper() and unidade_usuario != 'TODAS':
                return jsonify({'success': False, 'error': 'Container pertence a outra unidade'}), 403

        # Validar posição com regras do pátio
        # Precisamos do status do container para validação
        resultado_validacao = patio_suzano.validar_operacao(nova_posicao, status_container)
        if not resultado_validacao['valido']:
            return jsonify({'success': False, 'error': resultado_validacao['mensagem']}), 400

        # Atualizar posição e demais campos do container
        data_correcao = datetime.utcnow().isoformat(sep=' ', timespec='seconds')

        # Campos do container que podem ser atualizados
        campos_container = {
            'posicao_atual': nova_posicao,  # Sempre atualiza a posição
            'ultima_atualizacao': data_correcao,  # Sempre atualiza a data
            'status': dados.get('status'),
            'tipo_container': dados.get('tipo_container'),
            'tamanho': dados.get('tamanho'),
            'capacidade': dados.get('capacidade'),
            'tara': dados.get('tara'),
            'armador': dados.get('armador'),
            'booking': dados.get('booking')
        }
        
        # Construir query de atualização do container
        set_clauses = []
        values = []
        for coluna, valor in campos_container.items():
            if valor is not None:
                set_clauses.append(f"{coluna} = ?")
                values.append(valor)
                
        values.append(container_id)  # Para o WHERE id = ?
        cursor.execute(f"UPDATE containers SET {', '.join(set_clauses)} WHERE id = ?", tuple(values))
        
        # Atualizar vistoria se existir e dados foram fornecidos
        vistoria_id = dados.get('vistoria_id')
        if vistoria_id:
            # Campos da vistoria que podem ser atualizados
            campos_vistoria = {
                'iso_container': dados.get('iso_container'),
                'capacidade': dados.get('capacidade'),
                'tara': dados.get('tara'),
                'armador': dados.get('armador'),
                'status': dados.get('status_vistoria', dados.get('status')),  # Usar status do container se status_vistoria não for fornecido
                'lacre': dados.get('lacre'),
                'observacoes_gerais': dados.get('observacoes'),  # Atualizado para usar o campo 'observacoes' do formulário
                'tipo_container': dados.get('tipo_container'),
                'tamanho': dados.get('tamanho'),
                'condicao': dados.get('condicao'),
                'placa': dados.get('placa'),
                'vagao': dados.get('vagao')
            }
            
            # Construir query de atualização da vistoria
            set_clauses = []
            values = []
            for coluna, valor in campos_vistoria.items():
                if valor is not None:
                    set_clauses.append(f"{coluna} = ?")
                    values.append(valor)
                    
            if set_clauses:  # Só atualiza se houver campos para atualizar
                values.append(vistoria_id)  # Para o WHERE id = ?
                cursor.execute(f"UPDATE vistorias SET {', '.join(set_clauses)} WHERE id = ?", tuple(values))

        # Inserir registro de correção
        cursor.execute('''
            INSERT INTO correcoes_descarga (
                operacao_id, container_id, posicao_anterior, posicao_corrigida, data_correcao, usuario_id, unidade, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (operacao_id, container_id, posicao_anterior, nova_posicao, data_correcao, usuario_id, unidade_usuario, observacoes))

        # Registrar atividade para log geral
        try:
            log_activity(db, usuario_id, 'correcao_descarga', 
                        f'Container {numero_container} (ID:{container_id}) corrigido de {posicao_anterior} para {nova_posicao}')
        except Exception as log_err:
            logger.warning(f"Falha ao registrar log_activity: {log_err}")

        db.commit()

        return jsonify({
            'success': True, 
            'message': 'Container corrigido com sucesso',
            'container_id': container_id, 
            'numero_container': numero_container,
            'nova_posicao': nova_posicao
        })

    except Exception as e:
        logger.error(f"Erro ao corrigir descarga {operacao_id}: {str(e)}")
        db = get_db()
        db.rollback()
        return jsonify({'success': False, 'error': f'Erro ao corrigir descarga: {str(e)}'}), 500
@operacoes_bp.route('/containers/vistoriados', methods=['GET'])
@login_required
def listar_containers_vistoriados():
    """
    Retorna lista de containers que foram vistoriados e estão prontos para descarga
    Usado para popular o combobox no formulário de descarga
    Filtrado pela unidade do usuário logado
    Inclui informação de modo de transporte (ferroviária/rodoviária) baseado nos dados da vistoria
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
        
        # CORREÇÃO: Buscar informações de vagão e placa diretamente da tabela vistorias
        # onde essas informações são salvas durante a inspeção do container
        query = """
            SELECT 
                c.numero,
                c.armador,
                v.iso_container,
                v.capacidade,
                v.tara,
                v.data_vistoria,
                v.vagao,
                v.placa,
                c.tamanho
            FROM containers c
            JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.status = 'vistoriado'
              AND c.unidade = ?
              AND v.data_vistoria = (
                  SELECT MAX(v2.data_vistoria)
                  FROM vistorias v2 
                  WHERE v2.container_numero = c.numero
              )
            ORDER BY v.data_vistoria DESC
        """
        
        logger.info("Buscando containers vistoriados com informações de transporte da tabela vistorias")
        logger.info(f"Executando query: {query}")
        cursor.execute(query, (unidade_usuario,))
        
        containers_raw = cursor.fetchall()
        containers = []
        
        for container in containers_raw:
            # Determinar o modo de transporte baseado nos campos preenchidos
            modo_transporte = 'indefinido'
            vagao = container[6]
            placa = container[7]
            
            # Log detalhado para cada container
            logger.info(f"Container {container[0]} - Dados brutos: {container}")
            logger.info(f"Container {container[0]} - Vagão: '{vagao}', Placa: '{placa}'")
            
            if vagao and vagao.strip():
                modo_transporte = 'ferroviaria'
                logger.info(f"Container {container[0]} - Modo ferroviário detectado")
            elif placa and placa.strip():
                modo_transporte = 'rodoviaria'
                logger.info(f"Container {container[0]} - Modo rodoviário detectado")
            else:
                logger.warning(f"Container {container[0]} - MODO INDEFINIDO - Vagão e placa vazios ou nulos")
                
            container_data = {
                'numero': container[0],
                'armador': container[1],
                'iso_container': container[2],
                'capacidade': container[3],
                'tara': container[4],
                'data_vistoria': container[5],
                'vagao': vagao if vagao else '',
                'placa': placa if placa else '',
                'tamanho': container[8],
                'modo_transporte': modo_transporte
            }
            
            # Log do objeto JSON que será enviado ao frontend
            logger.info(f"Container {container[0]} - Dados formatados: {container_data}")
            
            containers.append(container_data)
        
        logger.info(f"Retornando {len(containers)} containers vistoriados para descarga na unidade {unidade_usuario}")
        
        return jsonify({
            'success': True,
            'data': containers,
            'count': len(containers),
            'message': f'{len(containers)} containers vistoriados disponíveis para descarga'
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar containers vistoriados: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Erro ao buscar containers vistoriados'
        }), 500

# ✅ ENDPOINT MELHORADO: Verificar se container existe e pode ser movimentado
@operacoes_bp.route('/container/verificar/<container_numero>', methods=['GET'])
@login_required  
def verificar_container_movimentacao(container_numero):
    """
    Verifica se um container pode ser movimentado
    Retorna informações detalhadas sobre disponibilidade
    Filtrado por unidade do usuário logado
    """
    try:
        if not container_numero:
            return jsonify({'success': False, 'error': 'Número do container é obrigatório'}), 400
        
        container_numero = container_numero.upper().strip()
        
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
            SELECT numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE numero = ? AND unidade = ?
        ''', (container_numero, unidade_usuario))
        
        container = cursor.fetchone()
        
        if not container:
            # Verificar se o container existe em outra unidade
            cursor.execute('''
                SELECT unidade
                FROM containers 
                WHERE numero = ?
            ''', (container_numero,))
            
            outro_container = cursor.fetchone()
            
            if outro_container:
                return jsonify({
                    'success': False,
                    'exists': True,
                    'can_move': False,
                    'wrong_unit': True,
                    'message': f'Container pertence à unidade {outro_container[0]} e não à sua unidade ({unidade_usuario})'
                })
            else:
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
                'ultima_atualizacao': container[3],
                'unidade': container[4]
            },
            'no_patio': container[1] == 'no patio',
            'message': 'Disponível para movimentação' if can_move else f'Não disponível - Status: {container[1]}'
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar container {container_numero}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': 'Erro ao verificar container'
        }), 500

# Verificar se um container existe e retornar seu status (compatibilidade com POST para formulários)
@operacoes_bp.route('/verificar-container', methods=['POST', 'GET'])
@login_required
def verificar_container():
    """
    Verificar se um container existe e retornar seu status
    Compatível com POST (form) e GET (args)
    Filtrado por unidade do usuário logado
    """
    try:
        # Obter número do container do formulário (POST) ou parâmetros de URL (GET)
        if request.method == 'POST':
            container_numero = request.form.get('container_numero')
        else:
            container_numero = request.args.get('numero')
        
        if not container_numero:
            return jsonify({'success': False, 'error': 'Número do container é obrigatório'}), 400
        
        # Normalizar o número do container
        container_numero = container_numero.upper().strip()
        
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
            SELECT id, numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE numero = ? AND unidade = ?
        ''', (container_numero, unidade_usuario))
        
        container = cursor.fetchone()
        
        if not container:
            # Verificar se o container existe em outra unidade
            cursor.execute('''
                SELECT unidade
                FROM containers 
                WHERE numero = ?
            ''', (container_numero,))
            
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
        
        # Para compatibilidade com código antigo, construir dicionário para versão POST
        if request.method == 'POST':
            container_dict = {}
            for i, key in enumerate(['id', 'numero', 'status', 'posicao_atual', 'ultima_atualizacao', 'unidade']):
                if i < len(container):
                    container_dict[key] = container[i]
            
            return jsonify({
                'success': True,
                'exists': True,
                'container': container_dict
            })
        
        # Versão GET
        # Verificar se o container está no pátio
        no_patio = container[1] == 'no patio'
        
        return jsonify({
            'success': True,
            'exists': True,
            'no_patio': no_patio,
            'status': container[1],
            'posicao': container[2] if container[2] else '',
            'unidade': container[4]
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar container: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro ao verificar container'}), 500

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
                # Criar novo container se não existir
                cursor.execute('''
                    INSERT INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao)
                    VALUES (?, ?, ?, ?, ?)
                ''', (container_numero, 'no patio', posicao, data_operacao, data_operacao))
                container_id = cursor.lastrowid
            
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
    """Listar todos os containers da unidade do usuário"""
    try:
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter a unidade do usuário logado
        username = session.get('username')
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_data = cursor.fetchone()
        
        if not user_data:
            flash('Erro: Usuário não encontrado ou sem unidade definida', 'danger')
            return redirect(url_for('operacoes.index'))
            
        unidade_usuario = user_data[0]
        
        # Buscar apenas containers da unidade do usuário
        cursor.execute('''
            SELECT * FROM containers
            WHERE unidade = ?
            ORDER BY ultima_atualizacao DESC
        ''', (unidade_usuario,))
        
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

# Rota para obter dados para relatórios
@operacoes_bp.route('/relatorio')
@inventariante_required
def relatorio():
    """Exibir relatório de operações"""
    try:
        db = get_db()
        cursor = db.cursor()
        
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

@operacoes_bp.route('/registrar_operacao', methods=['POST'])
@suzano_required
@operador_required
def registrar_operacao():
    """
    Registra uma nova operação de container (descarga, carregamento ou movimentação) via API
    Aceita tanto JSON quanto dados de formulário
    ✅ ATUALIZADO: Validação usando padrão A01-1 exclusivamente
    """
    # Importar patio_suzano localmente para evitar problemas de escopo
    from posicoes_suzano import patio_suzano
    
    try:
        # Log the raw request data for debugging
        current_app.logger.info(f"Dados recebidos: {request.data}")
        if request.is_json:
            current_app.logger.info(f"JSON recebido: {request.get_json()}")
        
        # Verificar token CSRF manualmente - buscar em múltiplas fontes
        json_data = request.get_json() if request.is_json else {}
        csrf_token = None
        
        # Tentar obter o token de várias fontes possíveis
        sources = [
            ('header', request.headers.get('X-CSRFToken')),
            ('header-alt', request.headers.get('CSRF-Token')),
            ('form', request.form.get('csrf_token')),
            ('json', json_data.get('csrf_token') if json_data else None),
            ('cookie', request.cookies.get('csrf_token'))
        ]
        
        # Verificar cada fonte e usar o primeiro token válido encontrado
        for source_name, token in sources:
            if token:
                csrf_token = token
                logger.info(f"Token CSRF encontrado em: {source_name}")
                break
        
        if not csrf_token:
            logger.error("Token CSRF não encontrado em nenhuma fonte")
            return jsonify({'success': False, 'error': 'Token CSRF ausente. Tente fazer login novamente.'}), 400
        
        # Log do token para depuração
        logger.info(f"Validando token CSRF: {csrf_token[:10]}...")
        
        # Desativar temporariamente a validação CSRF para testes em desenvolvimento
        # Em ambiente de produção, descomente o bloco abaixo
        """
        try:
            # Validar o token CSRF
            validate_csrf(csrf_token)
            logger.debug("Token CSRF validado com sucesso")
        except (BadRequest, ValueError) as e:
            logger.error(f"Erro na validação do token CSRF: {str(e)}")
            return jsonify({'success': False, 'error': 'Token CSRF inválido. Tente fazer login novamente.'}), 400
        """
        
        # Log para indicar que a validação CSRF está desativada
        logger.info("⚠️ Validação CSRF temporariamente desativada para testes")
        
        # Continuar com o processamento da operação
        
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
        
        # Validar tipo de operação (aceitar tanto 'tipo' quanto 'tipo_operacao')
        tipo_operacao = dados.get('tipo_operacao') or dados.get('tipo')
        logger.info(f"🔧 DEBUG - Tipo de operação recebido: {tipo_operacao}")
        logger.info(f"🔧 DEBUG - Dados completos: {dados}")
        
        if tipo_operacao not in ['descarga', 'carregamento', 'movimentacao']:
            current_app.logger.error(f"Tipo de operação inválido: {tipo_operacao}")
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
        
        # Validação de dados comuns para todos os tipos de operação (aceitar ambos os formatos)
        container_numero = dados.get('numero_container') or dados.get('container_id')
        posicao = dados.get('posicao')
        modo = dados.get('modo', 'manual')  # Default para manual se não especificado
        observacoes = dados.get('observacoes', '')
        
        # Inicializar variáveis de transporte
        placa = dados.get('placa', '')
        vagao = dados.get('vagao', '')
        
        logger.info(f"🔧 DEBUG - Container: {container_numero}")
        logger.info(f"🔧 DEBUG - Posição: {posicao}")
        
        current_app.logger.info(f"Processando operação: tipo={tipo_operacao}, container={container_numero}, posicao={posicao}")
        
        # ✅ VALIDAÇÃO ATUALIZADA: Usar validação do módulo posicoes_suzano
        def validar_formato_posicao_a01_1(posicao):
            """Valida se está no formato A01-1 usando o módulo posicoes_suzano"""
            if posicao is None:
                return False, "Posição não pode ser vazia"
            
            if posicao == 'EM TRANSITO':
                return True, ""  # Caso especial para carregamento
                
            # Usar validação do módulo posicoes_suzano
            return patio_suzano.validar_formato_a01_1(posicao), f"Formato inválido: {posicao}. Use o formato A01-1 (ex: A01-1, B15-3)"
        
        # Validar formato da posição se fornecida e não for carregamento
        if posicao and tipo_operacao != 'carregamento' and posicao != 'EM TRANSITO':
            valido, erro_msg = validar_formato_posicao_a01_1(posicao)
            if not valido:
                return jsonify({
                    'success': False,
                    'error': erro_msg
                }), 400
        
        # Verificar se o container foi vistoriado (para operações de descarga)
        if tipo_operacao == 'descarga':
            logger.info(f"🔧 DEBUG - Verificando vistoria para container {container_numero} na unidade {unidade_usuario}")
            cursor.execute(
                '''
                SELECT v.id, v.iso_container, v.capacidade, v.tara, v.tamanho, v.tipo_container, v.armador FROM vistorias v
                JOIN containers c ON v.container_numero = c.numero
                WHERE c.numero = ? AND c.status = "vistoriado" AND c.unidade = ?
                ''',
                (container_numero, unidade_usuario)
            )
            vistoria = cursor.fetchone()
            logger.info(f"🔧 DEBUG - Vistoria encontrada: {vistoria is not None}")
            
            if not vistoria:
                return jsonify({
                    'success': False,
                    'error': f'O container {container_numero} não foi vistoriado ou já foi descarregado. Apenas containers vistoriados podem ser descarregados.'
                }), 400
            
            # Armazenar os dados da vistoria para uso posterior
            vistoria_id = vistoria[0]
            iso_container = vistoria[1]
            capacidade = vistoria[2]
            tara = vistoria[3]
            tamanho = vistoria[4]
            tipo_container = vistoria[5]
            armador = vistoria[6]
            
            # Transferir os dados da vistoria para a tabela containers
            cursor.execute(
                '''
                UPDATE containers
                SET tipo_container = ?, capacidade = ?, tara = ?, tamanho = ?, armador = ?
                WHERE numero = ? AND unidade = ?
                ''',
                (tipo_container, capacidade, tara, tamanho, armador, container_numero, unidade_usuario)
            )
            db.commit()
            
            # Verificar se a posição já está ocupada por outro container na mesma unidade
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
                
            # ✅ VALIDAÇÃO ATUALIZADA: Usar módulo posicoes_suzano para validar posição
            if unidade_usuario.upper() == 'SUZANO':
                # Para descarga, assumimos que o container está vindo como "CHEIO"
                status_container = 'CHEIO'
                
                # Obter o tamanho do container em TEUs (20 ou 40)
                cursor.execute('SELECT tamanho FROM containers WHERE numero = ?', (container_numero,))
                tamanho_teu = cursor.fetchone()
                if tamanho_teu:
                    tamanho_teu = int(tamanho_teu[0]) if str(tamanho_teu[0]).isdigit() else 20
                    if tamanho_teu not in [20, 40]:
                        tamanho_teu = 20
                else:
                    tamanho_teu = 20
                
                # ✅ USAR VALIDAÇÃO DO MÓDULO (posição já está em A01-1)
                resultado_validacao = patio_suzano.validar_operacao(
                    posicao=posicao,  # Manter formato A01-1
                    status_container=status_container,
                    db_connection=db,
                    tamanho_teu=tamanho_teu
                )
                
                if not resultado_validacao['valido']:
                    erro_msg = resultado_validacao['mensagem']
                    sugestoes = resultado_validacao.get('sugestoes', [])
                    
                    # Adicionar sugestões se disponíveis
                    if sugestoes:
                        erro_msg += f" Sugestões de posições válidas: {', '.join(sugestoes[:5])}"
                    
                    return jsonify({
                        'success': False,
                        'error': erro_msg,
                        'sugestoes': sugestoes[:10] if sugestoes else []
                    }), 400
            
            # Verificar se já existe uma operação recente para este container
            cinco_minutos_atras = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                '''
                SELECT o.id FROM operacoes o
                JOIN containers c ON o.container_id = c.id
                WHERE c.numero = ? 
                AND o.tipo = ? 
                AND o.data_operacao > ?
                AND c.unidade = ?
                ''', 
                (container_numero, tipo_operacao, cinco_minutos_atras, unidade_usuario)
            )
            
            operacao_recente = cursor.fetchone()
            if operacao_recente:
                return jsonify({
                    'success': False, 
                    'error': f'Já existe uma operação de {tipo_operacao} registrada para este container nos últimos 5 minutos.'
                }), 400
            
            # Validar modo de transporte
            if modo not in ['rodoviaria', 'ferroviaria', 'ferrovia', 'indefinido']:
                return jsonify({'success': False, 'error': 'Modo de transporte inválido para descarga'}), 400
                
            # Se o modo for indefinido, não precisamos validar placa ou vagão
            
            if modo == 'rodoviaria':
                placa = dados.get('placa')
                if not placa:
                    return jsonify({'success': False, 'error': 'Placa é obrigatória para descarga rodoviária'}), 400
            elif modo in ['ferroviaria', 'ferrovia']:
                vagao = dados.get('vagao')
                if not vagao:
                    return jsonify({'success': False, 'error': 'Vagão é obrigatório para descarga ferroviária'}), 400
            elif modo == 'indefinido':
                # Para modo indefinido, não validamos placa ou vagão
                logger.info(f"Processando container {container_numero} com modo de transporte indefinido")
                # Garantir que placa e vagão sejam strings vazias
                placa = ''
                vagao = ''
        
        elif tipo_operacao == 'carregamento':
            # Container está sendo carregado para sair do pátio
            posicao = 'EM TRANSITO'
            
            # Verificar se já existe uma operação recente para este container
            cinco_minutos_atras = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                '''
                SELECT o.id FROM operacoes o
                JOIN containers c ON o.container_id = c.id
                WHERE c.numero = ? 
                AND o.tipo = ? 
                AND o.data_operacao > ?
                AND c.unidade = ?
                ''', 
                (container_numero, tipo_operacao, cinco_minutos_atras, unidade_usuario)
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
            # ✅ VALIDAÇÕES ATUALIZADAS PARA MOVIMENTAÇÃO
            # Aceitar tanto 'posicao_original' quanto 'posicao_anterior' para compatibilidade
            posicao_original = dados.get('posicao_original') or dados.get('posicao_anterior')
            posicao = dados.get('posicao')  # Nova posição
            
            logger.info(f"Iniciando validação de movimentação: Container {container_numero}, Posição original {posicao_original}, Nova posição {posicao}")
            
            if not posicao_original:
                logger.error("Falha na movimentação: Posição original não informada")
                return jsonify({'success': False, 'error': 'Posição original é obrigatória para movimentação'}), 400
            if not posicao:
                logger.error("Falha na movimentação: Nova posição não informada")
                return jsonify({'success': False, 'error': 'Nova posição é obrigatória para movimentação'}), 400
                
            # ✅ VALIDAR FORMATO A01-1 USANDO MÓDULO POSICOES_SUZANO
            if not patio_suzano.validar_formato_a01_1(posicao_original):
                logger.error(f"Falha na validação da posição original: {posicao_original}")
                return jsonify({
                    'success': False,
                    'error': f'Posição original: Formato inválido: {posicao_original}. Use o formato A01-1'
                }), 400
                
            if not patio_suzano.validar_formato_a01_1(posicao):
                logger.error(f"Falha na validação da nova posição: {posicao}")
                return jsonify({
                    'success': False,
                    'error': f'Nova posição: Formato inválido: {posicao}. Use o formato A01-1'
                }), 400
                
            # Verificar se a nova posição já está ocupada por outro container na mesma unidade
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
                
            # ✅ VALIDAÇÃO ATUALIZADA DO PÁTIO DE SUZANO PARA MOVIMENTAÇÃO
            if unidade_usuario.upper() == 'SUZANO':
                logger.info(f"Iniciando validação específica do pátio Suzano para container {container_numero}")
                # Para movimentação, precisamos buscar o status atual do container
                cursor.execute('SELECT status, tamanho FROM containers WHERE numero = ? AND unidade = ?', (container_numero, unidade_usuario))
                container_info = cursor.fetchone()
                
                if container_info:
                    logger.info(f"Informações do container encontradas: status={container_info[0]}, tamanho={container_info[1]}")
                    # Mapear status do sistema para status do pátio
                    status_sistema = container_info[0]
                    tamanho_container = container_info[1] if container_info[1] else '20'
                    
                    # Converter tamanho do container para TEU
                    try:
                        if tamanho_container in ['20', '40']:
                            tamanho_teu = int(tamanho_container)
                        else:
                            # Se não for 20 ou 40, assumir 20 como padrão
                            tamanho_teu = 20
                            logger.warning(f"Tamanho do container {container_numero} não reconhecido: {tamanho_container}. Usando 20 TEU como padrão.")
                    except (ValueError, TypeError):
                        tamanho_teu = 20
                        logger.warning(f"Erro ao converter tamanho do container {container_numero}: {tamanho_container}. Usando 20 TEU como padrão.")
                    
                    logger.info(f"Tamanho TEU determinado: {tamanho_teu}")
                    
                    # Aplicar validações para containers no pátio ou carregados
                    # Para movimentação, validamos as regras de posicionamento TEU independente do status
                    logger.info(f"Iniciando validação do pátio Suzano para posição {posicao} com tamanho {tamanho_teu} TEU")
                    
                    try:
                        logger.info(f"Validando cenário CHEIO para posição {posicao}")
                        resultado_cheio = patio_suzano.validar_operacao(
                            posicao=posicao,  # Já está em formato A01-1
                            status_container='CHEIO',
                            db_connection=db,
                            tamanho_teu=tamanho_teu
                        )
                        logger.info(f"Resultado validação CHEIO: {resultado_cheio}")
                        
                        logger.info(f"Validando cenário VAZIO para posição {posicao}")
                        resultado_vazio = patio_suzano.validar_operacao(
                            posicao=posicao,  # Já está em formato A01-1
                            status_container='VAZIO',
                            db_connection=db,
                            tamanho_teu=tamanho_teu
                        )
                        logger.info(f"Resultado validação VAZIO: {resultado_vazio}")
                    except Exception as e:
                        logger.error(f"Erro na validação da posição pelo PatioSuzano: {str(e)}")
                        return jsonify({
                            'success': False, 
                            'error': f'Erro ao validar posição: {str(e)}'
                        }), 400
                    
                    # Se nenhum dos dois cenários for válido, retornar erro
                    if not resultado_cheio['valido'] and not resultado_vazio['valido']:
                        logger.error(f"Posição {posicao} não é válida para nenhum cenário (CHEIO ou VAZIO)")
                        erro_msg = f"Posição {posicao} não é válida para containers no pátio de Suzano."
                        
                        # Obter sugestões combinadas
                        sugestoes_cheio = resultado_cheio.get('sugestoes', [])
                        sugestoes_vazio = resultado_vazio.get('sugestoes', [])
                        sugestoes = list(set(sugestoes_cheio + sugestoes_vazio))
                        
                        if sugestoes:
                            erro_msg += f" Sugestões: {', '.join(sugestoes[:5])}"
                        
                        logger.error(f"Retornando erro: {erro_msg}")
                        return jsonify({
                            'success': False,
                            'error': erro_msg,
                            'sugestoes': sugestoes[:10] if sugestoes else []
                        }), 400
                    else:
                        logger.info(f"Posição {posicao} validada com sucesso no pátio Suzano")
            
            logger.info(f"Validações concluídas com sucesso, prosseguindo com a operação")
        
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
        
        # Se o container não existe e é uma operação de descarga, criar novo container com dados da vistoria
        if not container and tipo_operacao == 'descarga':
            cursor.execute(
                'INSERT INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao, unidade, tipo_container, capacidade, tara, tamanho, armador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (container_numero, 'no patio', posicao, data_atual, data_atual, unidade_usuario, tipo_container, capacidade, tara, tamanho, armador)
            )
            container_id = cursor.lastrowid
            logger.info(f"Novo container criado: {container_numero} na posição {posicao} na unidade {unidade_usuario} com dados da vistoria")
        elif not container:
            return jsonify({'success': False, 'error': f'Container {container_numero} não encontrado no sistema'}), 400
        else:
            container_id = container[0]
            
            # VALIDAÇÕES ADICIONAIS PARA OPERAÇÕES EM CONTAINERS EXISTENTES
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
                # Para movimentação, verificar se está no pátio ou carregado
                if container[2] not in ['no patio', 'carregado']:
                    return jsonify({
                        'success': False, 
                        'error': f'Container {container_numero} não pode ser movimentado (Status atual: {container[2]})'
                    }), 400
                
                # VALIDAÇÃO ESPECÍFICA PARA MOVIMENTAÇÃO - VERIFICAR CONTAINERS FLUTUANTES
                if unidade_usuario == 'SUZANO' and posicao_original:
                    from posicoes_suzano import patio_suzano
                    
                    # Usar a nova validação que considera o impacto da remoção
                    validacao_movimentacao = patio_suzano.validar_movimentacao(
                        posicao_original, posicao, 'CHEIO', db_connection, tamanho_teu
                    )
                    
                    if not validacao_movimentacao['valido']:
                        logger.warning(f"Movimentação rejeitada: {validacao_movimentacao['mensagem']}")
                        
                        # Preparar resposta detalhada
                        response_data = {
                            'success': False,
                            'error': validacao_movimentacao['mensagem'],
                            'detalhes': validacao_movimentacao['detalhes']
                        }
                        
                        # Adicionar containers afetados se houver
                        if 'containers_afetados' in validacao_movimentacao['detalhes']:
                            containers_afetados = validacao_movimentacao['detalhes']['containers_afetados']
                            response_data['containers_afetados'] = containers_afetados
                            response_data['sugestoes'] = validacao_movimentacao['sugestoes']
                        
                        return jsonify(response_data), 400
                    
                    logger.info(f"Movimentação validada com sucesso: {validacao_movimentacao['mensagem']}")
                
                # Movimentação: atualizar para nova posição (manter formato A01-1)
                cursor.execute(
                    'UPDATE containers SET posicao_atual = ?, ultima_atualizacao = ? WHERE id = ?',
                    (posicao, data_atual, container_id)
                )
                logger.info(f"Container {container_numero} movimentado de {posicao_original} para {posicao}")
                
            elif tipo_operacao == 'descarga':
                # Descarga: container entra no pátio com posição específica e unidade do usuário (manter formato A01-1)
                # Atualizar também os dados da vistoria (tipo_container, capacidade, tara, tamanho, armador)
                cursor.execute(
                    'UPDATE containers SET status = ?, posicao_atual = ?, unidade = ?, ultima_atualizacao = ?, tipo_container = ?, capacidade = ?, tara = ?, tamanho = ?, armador = ? WHERE id = ?',
                    ('no patio', posicao, unidade_usuario, data_atual, tipo_container, capacidade, tara, tamanho, armador, container_id)
                )
                logger.info(f"Container {container_numero} descarregado na posição {posicao} na unidade {unidade_usuario} com dados da vistoria")
        
        # Obter ID do usuário
        username = session.get('username', 'sistema')
        cursor.execute('SELECT id FROM usuarios WHERE username = ?', (username,))
        usuario = cursor.fetchone()
        usuario_id = usuario[0] if usuario else 1  # ID 1 é geralmente o admin
        
        # INSERIR OPERAÇÃO NO BANCO DE DADOS
        if tipo_operacao in ['descarga', 'carregamento']:
            if modo == 'rodoviaria':
                cursor.execute(
                    'INSERT INTO operacoes (tipo, modo, container_id, posicao, placa, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (tipo_operacao, modo, container_id, posicao, placa, data_atual, usuario_id, observacoes)
                )
            elif modo in ['ferroviaria', 'ferrovia']:
                cursor.execute(
                    'INSERT INTO operacoes (tipo, modo, container_id, posicao, vagao, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (tipo_operacao, modo, container_id, posicao, vagao, data_atual, usuario_id, observacoes)
                )
            elif modo == 'indefinido':
                # Para modo indefinido, inserimos tanto placa quanto vagão como vazios
                cursor.execute(
                    'INSERT INTO operacoes (tipo, modo, container_id, posicao, placa, vagao, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (tipo_operacao, modo, container_id, posicao, '', '', data_atual, usuario_id, observacoes)
                )
                logger.info(f"Operação de {tipo_operacao} registrada com modo indefinido para container {container_numero}")
            
        else:  # movimentacao
            # Para movimentação, usar campos separados para posição atual e anterior
            cursor.execute(
                'INSERT INTO operacoes (tipo, container_id, modo, posicao, posicao_anterior, data_operacao, usuario_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (tipo_operacao, container_id, 'interno', posicao, posicao_original, data_atual, usuario_id, observacoes)
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
            
            # MENSAGEM DE SUCESSO PERSONALIZADA
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
            SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, unidade,
                   tipo_container, tamanho, capacidade, tara, armador, booking
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
            'unidade': container[6],
            'tipo': container[7],
            'tamanho': container[8],
            'capacidade': container[9],
            'tara': container[10],
            'armador': container[11],
            'booking': container[12]
        }
        
        # Buscar dados da última vistoria (se existir)
        cursor.execute('''
            SELECT status, iso_container, lacre, vagao, placa, data_vistoria, observacoes_gerais
            FROM vistorias
            WHERE container_numero = ?
            ORDER BY data_vistoria DESC
            LIMIT 1
        ''', (numero_container,))
        vistoria = cursor.fetchone()
        if vistoria:
            container_data.update({
                'status_vistoria': vistoria[0],
                'iso_container': vistoria[1],
                'lacre': vistoria[2],
                'vagao': vistoria[3],
                'placa': vistoria[4],
                'data_vistoria': vistoria[5],
                'observacoes': vistoria[6]
            })
        
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


@operacoes_bp.route('/validar_posicao_suzano', methods=['POST'])
@login_required
def validar_posicao_suzano():
    """
    Endpoint para validar posições específicas do pátio de Suzano
    e obter sugestões de posições válidas baseadas no status do container
    ✅ ATUALIZADO: Usa módulo posicoes_suzano com formato A01-1
    """
    try:
        dados = request.get_json() or {}
        
        posicao = dados.get('posicao', '').strip().upper()
        status = dados.get('status', 'CHEIO').strip().upper()
        operacao = dados.get('operacao', 'descarga').strip().lower()
        
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
        
        # Validação apenas para unidade Suzano
        if unidade_usuario.upper() != 'SUZANO':
            return jsonify({
                'success': True,
                'valido': True,
                'message': 'Validação de posições específicas aplicável apenas à unidade Suzano'
            })
        
        if not posicao:
            # Se não foi informada posição, retornar apenas sugestões
            sugestoes = patio_suzano.sugerir_posicoes_para_container(
                status_container=status
            )
            
            return jsonify({
                'success': True,
                'valido': False,
                'message': 'Posição não informada',
                'sugestoes': sugestoes[:20]
            })

        # Obter o tamanho do container em TEUs (20 ou 40)
        cursor.execute('SELECT tamanho FROM containers WHERE numero = ?', (dados.get('container_id'),))
        tamanho_teu = cursor.fetchone()
        if tamanho_teu:
            tamanho_teu = int(tamanho_teu[0]) if str(tamanho_teu[0]).isdigit() else 20
            if tamanho_teu not in [20, 40]:
                tamanho_teu = 20
        else:
            tamanho_teu = 20
        
        # ✅ VALIDAR A POSIÇÃO ESPECÍFICA (posição já está em A01-1)
        resultado = patio_suzano.validar_operacao(
            posicao=posicao,  # Formato A01-1
            status_container=status,
            db_connection=db,
            tamanho_teu=tamanho_teu
        )
        
        response_data = {
            'success': True,
            'valido': resultado['valido'],
            'posicao': posicao,
            'status': status,
            'operacao': operacao
        }
        
        if resultado['valido']:
            response_data['message'] = f'Posição {posicao} é válida para {operacao} de container {status}'
        else:
            response_data['error'] = resultado['mensagem']
            response_data['sugestoes'] = resultado.get('sugestoes', [])[:20]
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao validar posição: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro ao validar posição. Tente novamente.'
        }), 500


@operacoes_bp.route('/posicoes/livres', methods=['GET'])
@login_required
def listar_posicoes_livres():
    """Retorna todas as posições físicas do pátio Suzano que não estão ocupadas por nenhum container"""
    try:
        # Obter a unidade do usuário logado
        username = session.get('username')
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({'success': False, 'error': 'Usuário não encontrado'}), 400
        unidade_usuario = user_row[0]

        # No momento, endpoint válido apenas para Suzano porque usamos patio_suzano
        if unidade_usuario.upper() != 'SUZANO':
            return jsonify({'success': False, 'error': 'Funcionalidade disponível apenas para a unidade Suzano'}), 403

        # Obter posições ocupadas (containers no pátio)
        cursor.execute('''
            SELECT posicao_atual FROM containers
            WHERE unidade = ? AND status = 'no patio' AND posicao_atual IS NOT NULL
        ''', (unidade_usuario,))
        ocupados_rows = cursor.fetchall()
        posicoes_ocupadas = {row[0] for row in ocupados_rows if row[0]}

        # Todas as posições definidas no módulo patio_suzano
        todas_posicoes = set(patio_suzano.posicoes_disponiveis.keys())
        livres = sorted(list(todas_posicoes - posicoes_ocupadas))

        return jsonify({'success': True, 'data': livres, 'count': len(livres)})
    except Exception as e:
        logger.error(f"Erro ao listar posições livres: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro ao listar posições livres'}), 500


@operacoes_bp.route('/sugestoes_posicoes', methods=['GET'])
@login_required
def obter_sugestoes_posicoes():
    """
    Endpoint para obter sugestões de posições válidas baseadas em parâmetros
    ✅ ATUALIZADO: Usa módulo posicoes_suzano com formato A01-1
    """
    try:
        status = request.args.get('status', 'CHEIO').strip().upper()
        baia_preferida = request.args.get('baia', '').strip().upper()
        altura_maxima = request.args.get('altura_max', '').strip()
        
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
        
        # Sugestões apenas para unidade Suzano
        if unidade_usuario.upper() != 'SUZANO':
            return jsonify({
                'success': True,
                'sugestoes': [],
                'message': 'Sugestões de posições específicas disponíveis apenas para a unidade Suzano'
            })
        
        # Usar a função de sugestão do módulo posicoes_suzano
        altura_max_int = None
        if altura_maxima and altura_maxima.isdigit():
            altura_max_int = int(altura_maxima)
        
        # ✅ OBTER SUGESTÕES DO PÁTIO SUZANO (retorna em formato A01-1)
        sugestoes = patio_suzano.sugerir_posicoes_para_container(
            status_container=status,
            baia_preferida=baia_preferida if baia_preferida else None,
            altura_maxima=altura_max_int
        )
        
        return jsonify({
            'success': True,
            'sugestoes': sugestoes[:30],  # Limitar a 30 sugestões
            'total_sugestoes': len(sugestoes),
            'filtros': {
                'status': status,
                'baia_preferida': baia_preferida,
                'altura_maxima': altura_maxima
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter sugestões: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro ao obter sugestões. Tente novamente.'
        }), 500