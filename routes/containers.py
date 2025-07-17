from flask import Blueprint, request, jsonify, current_app, session, g
from datetime import datetime
import logging
import sqlite3
import re
from db import get_db, log_activity
from auth.routes import login_required
from utils.permissions import operador_required, inventariante_required, admin_required
from utils.csrf import csrf

# Configuração de logging para este módulo
logger = logging.getLogger('containers')

containers_bp = Blueprint('containers', __name__)

# Rota para listar todos os containers
@containers_bp.route('/operacoes/containers/lista', methods=['GET'])
@login_required
def listar_containers():
    """
    Retorna a lista de todos os containers no sistema
    Suporta parâmetro de query 'refresh' para forçar atualização do cache
    ✅ ATUALIZADO: Garante que posições estão no formato A01-1
    """
    try:
        # Verificar se o usuário está autenticado
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter a unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
        
        # Buscar apenas containers da unidade do usuário
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, unidade, data_criacao, ultima_atualizacao
            FROM containers
            WHERE unidade = ?
            ORDER BY ultima_atualizacao DESC
        ''', (unidade,))
        
        containers = []
        for row in cursor.fetchall():
            # ✅ GARANTIR QUE POSIÇÃO ESTÁ NO FORMATO A01-1
            posicao_atual = row[3]
            
            # Se a posição não está no formato A01-1, converter
            if posicao_atual and len(posicao_atual) == 4 and posicao_atual[0].isalpha() and posicao_atual[1:].isdigit():
                # Garantir formato A01-1
                posicao_formatada = f"{posicao_atual[0]}{posicao_atual[1:3]}-{posicao_atual[3]}"
            else:
                posicao_formatada = posicao_atual
            
            containers.append({
                'id': row[0],
                'numero': row[1],
                'status': row[2],
                'posicao_atual': posicao_formatada,  # Sempre no formato A01-1
                'unidade': row[4],
                'data_criacao': row[5],
                'ultima_atualizacao': row[6]
            })
        
        # Registrar atividade no log
        log_activity(
            usuario=session.get('username', 'sistema'),
            acao='listar_containers',
            detalhes=f'Listagem de {len(containers)} containers',
            nivel=session.get('nivel', 'desconhecido')
        )
        
        return jsonify({
            'success': True,
            'data': containers,
            'count': len(containers),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar containers: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao buscar lista de containers'
        }), 500

# Rota para listar containers vistoriados
@containers_bp.route('/operacoes/containers/vistoriados', methods=['GET'])
@login_required
def listar_containers_vistoriados():
    """
    Retorna a lista de containers que foram vistoriados e estão prontos para descarga
    Suporta parâmetro de query 'refresh' para forçar atualização do cache
    ✅ ATUALIZADO: Garante que posições estão no formato A01-1
    """
    try:
        # Verificar se o usuário está autenticado
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter a unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
            
        # Buscar apenas containers vistoriados da unidade do usuário (vistoria mais recente)
        cursor.execute('''
            SELECT c.id, c.numero, c.status, c.posicao_atual, c.unidade, 
                   o.placa, o.vagao, o.data_operacao
            FROM containers c
            JOIN operacoes o ON c.id = o.container_id
            WHERE o.tipo = 'vistoria' AND c.status = 'vistoriado' AND c.unidade = ?
            AND o.data_operacao = (
                SELECT MAX(o2.data_operacao) 
                FROM operacoes o2 
                WHERE o2.container_id = c.id AND o2.tipo = 'vistoria'
            )
            ORDER BY o.data_operacao DESC
        ''', (unidade,))
        
        containers = []
        for row in cursor.fetchall():
            # GARANTIR QUE POSIÇÃO ESTÁ NO FORMATO A01-1
            posicao_atual = row[3]
            
            # Se a posição não está no formato A01-1, converter
            if posicao_atual and len(posicao_atual) == 4 and posicao_atual[0].isalpha() and posicao_atual[1:].isdigit():
                # Garantir formato A01-1
                posicao_formatada = f"{posicao_atual[0]}{posicao_atual[1:3]}-{posicao_atual[3]}"
            else:
                posicao_formatada = posicao_atual
            
            containers.append({
                'id': row[0],
                'numero': row[1],
                'status': row[2],
                'posicao_atual': posicao_formatada,  # Sempre no formato A01-1
                'unidade': row[4],
                'placa': row[5],
                'vagao': row[6],
                'data_vistoria': row[7]
            })
        
        # Registrar atividade no log
        log_activity(
            usuario=session.get('username', 'sistema'),
            acao='listar_containers_vistoriados',
            detalhes=f'Listagem de {len(containers)} containers vistoriados',
            nivel=session.get('nivel', 'desconhecido')
        )
        
        return jsonify({
            'success': True,
            'data': containers,
            'count': len(containers),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar containers vistoriados: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao buscar lista de containers vistoriados'
        }), 500

# Rota para buscar um container específico
@containers_bp.route('/operacoes/buscar_container', methods=['GET'])
@containers_bp.route('/buscar_container', methods=['GET'])
@login_required
def buscar_container():
    """
    Busca informações detalhadas de um container específico
    Parâmetro de query 'numero' com o número do container
    ✅ ATUALIZADO: Garante que posições estão no formato A01-1
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
        
        # Obter a unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
            
        # Buscar o container apenas da unidade do usuário
        # Buscar todos os campos da tabela containers
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, unidade, data_criacao, ultima_atualizacao,
                   tipo_container, tamanho, capacidade, tara, armador, booking
            FROM containers
            WHERE numero = ? AND unidade = ?
        ''', (numero_container, unidade))
        
        # Log para debug
        logger.info(f"Buscando container {numero_container} na unidade {unidade}")
        
        container = cursor.fetchone()
        
        if not container:
            return jsonify({
                'success': False,
                'message': f'Container {numero_container} não encontrado'
            }), 404

        # Montar o dicionário com todos os campos
        container_info = {
            'id': container[0],
            'numero': container[1],
            'status': container[2],
            'posicao_atual': container[3],
            'unidade': container[4],
            'data_criacao': container[5],
            'ultima_atualizacao': container[6],
            'tipo_container': container[7],
            'tamanho': container[8],
            'capacidade': container[9],
            'tara': container[10],
            'armador': container[11],
            'booking': container[12],
        }

        # Buscar operações relacionadas ao container
        cursor.execute('''
            SELECT tipo, modo, posicao, placa, vagao, data_operacao, observacoes
            FROM operacoes
            WHERE container_id = ?
            ORDER BY data_operacao DESC
        ''', (container[0],))
        
        operacoes = []
        for op in cursor.fetchall():
            posicao_operacao = op[2]
            # Se a posição contém informação de movimentação (DE: A01-1 → PARA: A02-1)
            if posicao_operacao and 'DE:' in posicao_operacao and '→' in posicao_operacao:
                parts = posicao_operacao.split('→')
                if len(parts) == 2:
                    origem = parts[0].replace('DE:', '').strip()
                    destino = parts[1].replace('PARA:', '').strip()
                    if origem and len(origem) == 4 and origem[0].isalpha() and origem[1:].isdigit():
                        origem_formatada = f"{origem[0]}{origem[1:3]}-{origem[3]}"
                    else:
                        origem_formatada = origem
                    if destino and len(destino) == 4 and destino[0].isalpha() and destino[1:].isdigit():
                        destino_formatado = f"{destino[0]}{destino[1:3]}-{destino[3]}"
                    else:
                        destino_formatado = destino
                    posicao_formatada = f"DE: {origem_formatada} → PARA: {destino_formatado}"
                else:
                    posicao_formatada = posicao_operacao
            else:
                if posicao_operacao and len(posicao_operacao) == 4 and posicao_operacao[0].isalpha() and posicao_operacao[1:].isdigit():
                    posicao_formatada = f"{posicao_operacao[0]}{posicao_operacao[1:3]}-{posicao_operacao[3]}"
                else:
                    posicao_formatada = posicao_operacao
            operacoes.append({
                'tipo': op[0],
                'modo': op[1],
                'posicao': posicao_formatada,
                'placa': op[3],
                'vagao': op[4],
                'data_operacao': op[5],
                'observacoes': op[6]
            })
        container_info['operacoes'] = operacoes

        # Buscar vistorias relacionadas ao container
        cursor.execute('''
            SELECT * FROM vistorias WHERE container_numero = ? ORDER BY data_vistoria DESC
        ''', (container[1],))
        vistorias = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]
        container_info['vistorias'] = vistorias

        # Buscar avarias relacionadas às vistorias do container
        cursor.execute('''
            SELECT * FROM avarias_vistoria WHERE vistoria_id IN (
                SELECT id FROM vistorias WHERE container_numero = ?
            )
        ''', (container[1],))
        avarias = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]
        container_info['avarias'] = avarias

        # ✅ GARANTIR QUE POSIÇÃO ATUAL ESTÁ NO FORMATO A01-1
        posicao_atual = container[3]
        if posicao_atual and len(posicao_atual) == 4 and posicao_atual[0].isalpha() and posicao_atual[1:].isdigit():
            # Converter de A011 para A01-1
            posicao_formatada = f"{posicao_atual[0]}{posicao_atual[1:3]}-{posicao_atual[3]}"
        else:
            posicao_formatada = posicao_atual
        # Atualizar campo já existente mantendo demais dados
        container_info['posicao_atual'] = posicao_formatada  # Sempre no formato A01-1

        # 🔄 BUSCAR ÚLTIMA VISTORIA PARA SOBRESCREVER/ADICIONAR DADOS RELEVANTES
        # Buscar todos os campos relevantes da tabela vistorias
        cursor.execute('''
            SELECT v.*
            FROM vistorias v
            WHERE v.container_numero = ?
            ORDER BY datetime(v.data_vistoria) DESC
            LIMIT 1
        ''', (container[1],))
        
        # Log para debug
        logger.info(f"Buscando última vistoria para o container {container[1]}")
        ultima_vistoria = cursor.fetchone()

        if ultima_vistoria:
            # Converter a linha da vistoria em um dicionário
            col_names = [desc[0] for desc in cursor.description]
            vist_dict = dict(zip(col_names, ultima_vistoria))
            
            # Log para debug
            logger.info(f"Dados da última vistoria: {vist_dict}")
            
            # ✅ MAPEAMENTO CORRETO entre campos da vistoria e campos do container_info
            # Baseado na estrutura real das tabelas
            
            # Campos diretos (mesmo nome nas duas tabelas)
            if 'armador' in vist_dict and vist_dict['armador']:
                container_info['armador'] = vist_dict['armador']
                logger.info(f"Atualizando armador com valor {vist_dict['armador']} da vistoria")
            
            if 'tamanho' in vist_dict and vist_dict['tamanho']:
                container_info['tamanho'] = vist_dict['tamanho']
                logger.info(f"Atualizando tamanho com valor {vist_dict['tamanho']} da vistoria")
            
            if 'capacidade' in vist_dict and vist_dict['capacidade']:
                container_info['capacidade'] = vist_dict['capacidade']
                logger.info(f"Atualizando capacidade com valor {vist_dict['capacidade']} da vistoria")
            
            if 'tara' in vist_dict and vist_dict['tara']:
                container_info['tara'] = vist_dict['tara']
                logger.info(f"Atualizando tara com valor {vist_dict['tara']} da vistoria")
            
            if 'status' in vist_dict and vist_dict['status']:
                container_info['status'] = vist_dict['status']
                logger.info(f"Atualizando status com valor {vist_dict['status']} da vistoria")
            
            # Campos específicos da vistoria (não existem na tabela containers)
            if 'iso_container' in vist_dict and vist_dict['iso_container']:
                container_info['iso_container'] = vist_dict['iso_container']
                logger.info(f"Adicionando iso_container com valor {vist_dict['iso_container']} da vistoria")
            
            if 'lacre' in vist_dict and vist_dict['lacre']:
                container_info['lacre'] = vist_dict['lacre']
                logger.info(f"Adicionando lacre com valor {vist_dict['lacre']} da vistoria")
            
            if 'observacoes_gerais' in vist_dict and vist_dict['observacoes_gerais']:
                container_info['observacoes_gerais'] = vist_dict['observacoes_gerais']
                logger.info(f"Adicionando observacoes_gerais com valor {vist_dict['observacoes_gerais']} da vistoria")
            
            if 'condicao' in vist_dict and vist_dict['condicao']:
                container_info['condicao'] = vist_dict['condicao']
                logger.info(f"Adicionando condicao com valor {vist_dict['condicao']} da vistoria")
            
            if 'placa' in vist_dict and vist_dict['placa']:
                container_info['placa'] = vist_dict['placa']
                logger.info(f"Adicionando placa com valor {vist_dict['placa']} da vistoria")
            
            if 'vagao' in vist_dict and vist_dict['vagao']:
                container_info['vagao'] = vist_dict['vagao']
                logger.info(f"Adicionando vagao com valor {vist_dict['vagao']} da vistoria")
            
            # Mapear tipo_container baseado no iso_container se disponível
            if 'iso_container' in vist_dict and vist_dict['iso_container']:
                container_info['tipo_container'] = vist_dict['iso_container']
                logger.info(f"Mapeando tipo_container com valor {vist_dict['iso_container']} da vistoria")
            
            # Adicionar campos específicos da vistoria que não têm mapeamento direto
            container_info['data_vistoria'] = vist_dict.get('data_vistoria')
            container_info['vistoriante_id'] = vist_dict.get('vistoriante_id')
            container_info['armador_linha'] = vist_dict.get('armador_linha')
            
            # Priorizar o status da vistoria se existir
            if 'status' in vist_dict and vist_dict['status']:
                container_info['status'] = vist_dict['status']
                logger.info(f"Status final atualizado para: {vist_dict['status']}")

        # ✅ Manter operacoes e outras listas já adicionadas em container_info
        container_info['operacoes'] = operacoes
        
        # Registrar atividade no log
        log_activity(
            usuario=session.get('username', 'sistema'),
            acao='buscar_container',
            detalhes=f'Busca de container {numero_container}',
            nivel=session.get('nivel', 'desconhecido')
        )
        
        # Log final para debug
        logger.info(f"Dados finais do container: {container_info}")
        
        return jsonify({
            'success': True,
            'container': container_info
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar container: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao buscar informações do container'
        }), 500

# ✅ NOVA ROTA: Atualizar posições para formato A01-1
@containers_bp.route('/operacoes/containers/atualizar_formato', methods=['POST'])
@login_required
@admin_required
def atualizar_formato_posicoes():
    """
    Rota administrativa para atualizar todas as posições no banco 
    do formato antigo A011 para A01-1 (executar apenas uma vez)
    """
    try:
        # Verificar se o usuário está autenticado e é admin
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Contador de atualizações
        containers_atualizados = 0
        operacoes_atualizadas = 0
        
        # Atualizar containers
        cursor.execute('SELECT id, posicao_atual FROM containers WHERE posicao_atual IS NOT NULL')
        containers = cursor.fetchall()
        
        for container_id, posicao_atual in containers:
            if posicao_atual and len(posicao_atual) == 4 and posicao_atual[0].isalpha() and posicao_atual[1:].isdigit():
                # Garantir formato A01-1
                nova_posicao = f"{posicao_atual[0]}{posicao_atual[1:3]}-{posicao_atual[3]}"
                
                cursor.execute(
                    'UPDATE containers SET posicao_atual = ? WHERE id = ?',
                    (nova_posicao, container_id)
                )
                containers_atualizados += 1
        
        # Atualizar operações
        cursor.execute('SELECT id, posicao FROM operacoes WHERE posicao IS NOT NULL')
        operacoes = cursor.fetchall()
        
        for operacao_id, posicao in operacoes:
            nova_posicao = None
            
            # Se a posição contém informação de movimentação
            if posicao and 'DE:' in posicao and '→' in posicao:
                parts = posicao.split('→')
                if len(parts) == 2:
                    origem = parts[0].replace('DE:', '').strip()
                    destino = parts[1].replace('PARA:', '').strip()
                    
                    # Converter origem se necessário
                    if origem and len(origem) == 4 and origem[0].isalpha() and origem[1:].isdigit():
                        origem_formatada = f"{origem[0]}{origem[1:3]}-{origem[3]}"
                    else:
                        origem_formatada = origem
                    
                    # Converter destino se necessário
                    if destino and len(destino) == 4 and destino[0].isalpha() and destino[1:].isdigit():
                        destino_formatado = f"{destino[0]}{destino[1:3]}-{destino[3]}"
                    else:
                        destino_formatado = destino
                    
                    nova_posicao = f"DE: {origem_formatada} → PARA: {destino_formatado}"
            else:
                # Posição simples
                if posicao and len(posicao) == 4 and posicao[0].isalpha() and posicao[1:].isdigit():
                    nova_posicao = f"{posicao[0]}{posicao[1:3]}-{posicao[3]}"
            
            if nova_posicao and nova_posicao != posicao:
                cursor.execute(
                    'UPDATE operacoes SET posicao = ? WHERE id = ?',
                    (nova_posicao, operacao_id)
                )
                operacoes_atualizadas += 1
        
        # Commit das alterações
        db.commit()
        
        # Registrar atividade no log
        log_activity(
            usuario=session.get('username', 'sistema'),
            acao='atualizar_formato_posicoes',
            detalhes=f'Atualizados {containers_atualizados} containers e {operacoes_atualizadas} operações para formato A01-1',
            nivel=session.get('nivel', 'admin')
        )
        
        return jsonify({
            'success': True,
            'message': f'Formato atualizado com sucesso! Containers: {containers_atualizados}, Operações: {operacoes_atualizadas}',
            'containers_atualizados': containers_atualizados,
            'operacoes_atualizadas': operacoes_atualizadas
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar formato de posições: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao atualizar formato das posições'
        }), 500

# ✅ ROTA PRINCIPAL: Dados para visualização 3D (APENAS DADOS REAIS)
@containers_bp.route('/operacoes/containers/patio-3d', methods=['GET'])
@login_required
def obter_dados_patio_3d():
    """
    Retorna dados dos containers REAIS para visualização 3D do pátio
    Inclui validação de empilhamento e detecção de containers flutuantes
    ✅ TRABALHA EXCLUSIVAMENTE COM DADOS REAIS DO BANCO
    """
    try:
        # Verificar se o usuário está autenticado
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Obter a unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
        
        logger.info(f"🔍 Buscando containers REAIS para unidade: {unidade}")
        
        # Buscar containers REAIS da unidade do usuário com posições válidas
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho, armador
            FROM containers
            WHERE unidade = ? AND posicao_atual IS NOT NULL 
                  AND posicao_atual != '' AND posicao_atual != 'EM TRANSITO'
            ORDER BY posicao_atual
        ''', (unidade,))
        
        containers_raw = cursor.fetchall()
        
        logger.info(f"📦 Encontrados {len(containers_raw)} containers REAIS no banco de dados")
        
        # ✅ PROCESSAR APENAS CONTAINERS REAIS
        containers = []
        posicoes_ocupadas = {}
        containers_flutuantes = []
        
        for row in containers_raw:
            container_id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho_real, armador = row
            
            # Garantir formato A01-1
            if posicao_atual and len(posicao_atual) == 4 and posicao_atual[0].isalpha() and posicao_atual[1:].isdigit():
                posicao_formatada = f"{posicao_atual[0]}{posicao_atual[1:3]}-{posicao_atual[3]}"
            else:
                posicao_formatada = posicao_atual
            
            # Decompor posição para análise
            try:
                match = re.match(r'^([A-E])([0-9]{2})-([1-5])$', posicao_formatada)
                if match:
                    row = match.group(1)  # A-E agora representa Row
                    baia = int(match.group(2))  # 01-20 agora representa Baia
                    altura = int(match.group(3))  # 1-5 continua sendo Altura
                    
                    # Usar tamanho real do container ou padrão 20
                    tamanho_container = tamanho_real if tamanho_real else 20
                    
                    container_data = {
                        'id': container_id,
                        'numero': numero,
                        'status': status,
                        'posicao': posicao_formatada,
                        'baia': baia,  # Agora é numérico (01-20)
                        'linha': row,  # Agora é o row (A-E) - mantendo nome 'linha' para compatibilidade
                        'altura': altura,
                        'tamanho': tamanho_container,
                        'tamanho_teu': tamanho_container,  # Nome alternativo
                        'peso': 25000 if tamanho_container == 40 else 15000,      # Valor estimado baseado no tamanho
                        'iso_code': '40DC' if tamanho_container == 40 else '20DC',
                        'data_criacao': data_criacao,
                        'ultima_atualizacao': ultima_atualizacao,
                        'armador': armador if armador else 'N/A',  # Campo armador incluído
                        'flutuante': False,
                        'tipo_container': 'real'  # Indica que é container REAL
                    }
                    
                    containers.append(container_data)
                    
                    # Registrar posição ocupada
                    chave_posicao = f"{row}{baia:02d}"
                    if chave_posicao not in posicoes_ocupadas:
                        posicoes_ocupadas[chave_posicao] = {}
                    posicoes_ocupadas[chave_posicao][altura] = container_data
                    
                    # Se é um container de 40 TEU, criar posições bloqueadas adjacentes
                    if tamanho_container == 40:
                        # Posição anterior (baia anterior)
                        if baia > 1:
                            pos_anterior = f"{row}{baia-1:02d}-{altura}"
                            container_bloqueado_anterior = {
                                'id': f"{container_id}_anterior",
                                'numero': f"{numero}_BLOQUEIA",
                                'status': 'bloqueado',
                                'posicao': pos_anterior,
                                'baia': baia - 1,  # Baia anterior
                                'linha': row,  # Mesmo row
                                'altura': altura,
                                'tamanho': 40,
                                'tamanho_teu': 40,
                                'peso': 0,
                                'iso_code': '40DC',
                                'data_criacao': data_criacao,
                                'ultima_atualizacao': ultima_atualizacao,
                                'armador': armador,
                                'flutuante': False,
                                'tipo_container': 'bloqueado',
                                'container_principal': numero
                            }
                            containers.append(container_bloqueado_anterior)
                        
                        # Posição posterior (baia posterior)
                        if baia < 20:
                            pos_posterior = f"{row}{baia+1:02d}-{altura}"
                            container_bloqueado_posterior = {
                                'id': f"{container_id}_posterior",
                                'numero': f"{numero}_BLOQUEIA",
                                'status': 'bloqueado',
                                'posicao': pos_posterior,
                                'baia': baia + 1,  # Baia posterior
                                'linha': row,  # Mesmo row
                                'altura': altura,
                                'tamanho': 40,
                                'tamanho_teu': 40,
                                'peso': 0,
                                'iso_code': '40DC',
                                'data_criacao': data_criacao,
                                'ultima_atualizacao': ultima_atualizacao,
                                'armador': armador,
                                'flutuante': False,
                                'tipo_container': 'bloqueado',
                                'container_principal': numero
                            }
                            containers.append(container_bloqueado_posterior)
                    
            except Exception as e:
                logger.warning(f"Erro ao processar posição {posicao_formatada}: {e}")
        
        # Verificar containers flutuantes (apenas nos REAIS)
        for container in containers:
            if container['tipo_container'] == 'real' and container['altura'] > 1:
                baia = container['baia']  # Agora é numérico
                row = container['linha']  # Agora é o row (A-E)
                altura = container['altura']
                chave_posicao = f"{row}{baia:02d}"
                
                # Verificar se há containers em todas as alturas abaixo
                flutuante = False
                for h in range(1, altura):
                    if chave_posicao not in posicoes_ocupadas or h not in posicoes_ocupadas[chave_posicao]:
                        flutuante = True
                        break
                
                if flutuante:
                    container['flutuante'] = True
                    containers_flutuantes.append(container)
        
        # Calcular estatísticas
        total_containers = len([c for c in containers if c['tipo_container'] == 'real'])  # Contar apenas containers reais
        containers_por_baia = {}
        containers_por_altura = {}
        containers_vistoriados = 0
        
        for container in containers:
            if container['tipo_container'] == 'real':  # Estatísticas apenas de containers reais
                # Por baia
                baia = container['baia']
                if baia not in containers_por_baia:
                    containers_por_baia[baia] = 0
                containers_por_baia[baia] += 1
                
                # Por altura
                altura = container['altura']
                if altura not in containers_por_altura:
                    containers_por_altura[altura] = 0
                containers_por_altura[altura] += 1
                
                # Vistoriados
                if container['status'] == 'vistoriado':
                    containers_vistoriados += 1
        
        # Registrar atividade no log
        log_activity(
            usuario=session.get('username', 'sistema'),
            acao='obter_dados_patio_3d',
            detalhes=f'Dados 3D REAIS: {total_containers} containers, {len(containers_flutuantes)} flutuantes',
            nivel=session.get('nivel', 'desconhecido')
        )
        
        logger.info(f"✅ Retornando {total_containers} containers REAIS para visualização 3D")
        
        return jsonify({
            'success': True,
            'data': {
                'containers': containers,  # Inclui containers reais + posições bloqueadas para 40 TEU
                'containers_flutuantes': containers_flutuantes,
                'estatisticas': {
                    'total_containers': total_containers,  # Apenas containers reais
                    'containers_vistoriados': containers_vistoriados,
                    'containers_flutuantes': len(containers_flutuantes),
                    'containers_por_baia': containers_por_baia,
                    'containers_por_altura': containers_por_altura
                }
            },
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter dados do pátio 3D: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao carregar dados do pátio 3D'
        }), 500

# ✅ NOVA ROTA: Validar consistência das posições
@containers_bp.route('/operacoes/containers/validar-posicoes', methods=['GET'])
@login_required
@admin_required
def validar_posicoes():
    """
    Rota para validar se todas as posições estão no formato A01-1
    Retorna relatório de inconsistências
    """
    try:
        # Verificar se o usuário está autenticado
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Usuário não autenticado'
            }), 401
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        inconsistencias = []
        
        # Verificar containers
        cursor.execute('SELECT id, numero, posicao_atual FROM containers WHERE posicao_atual IS NOT NULL')
        containers = cursor.fetchall()
        
        for container_id, numero, posicao_atual in containers:
            if posicao_atual:
                # Verificar se está no formato A01-1
                if not re.match(r'^[A-E][0-9]{2}-[1-5]$', posicao_atual):
                    inconsistencias.append({
                        'tipo': 'container',
                        'id': container_id,
                        'numero': numero,
                        'posicao': posicao_atual,
                        'problema': 'Formato incorreto'
                    })
        
        # Verificar operações
        cursor.execute('''
            SELECT o.id, c.numero, o.posicao, o.tipo 
            FROM operacoes o 
            JOIN containers c ON o.container_id = c.id 
            WHERE o.posicao IS NOT NULL
        ''')
        operacoes = cursor.fetchall()
        
        for operacao_id, numero, posicao, tipo in operacoes:
            if posicao and posicao not in ['EM TRANSITO']:
                # Verificar operações de movimentação
                if 'DE:' in posicao and '→' in posicao:
                    # Extrair posições
                    parts = posicao.split('→')
                    if len(parts) == 2:
                        origem = parts[0].replace('DE:', '').strip()
                        destino = parts[1].replace('PARA:', '').strip()
                        
                        # Verificar origem
                        if origem and not re.match(r'^[A-E][0-9]{2}-[1-5]$', origem):
                            inconsistencias.append({
                                'tipo': 'operacao',
                                'id': operacao_id,
                                'container': numero,
                                'posicao': origem,
                                'problema': 'Posição origem com formato incorreto'
                            })
                        
                        # Verificar destino
                        if destino and not re.match(r'^[A-E][0-9]{2}-[1-5]$', destino):
                            inconsistencias.append({
                                'tipo': 'operacao',
                                'id': operacao_id,
                                'container': numero,
                                'posicao': destino,
                                'problema': 'Posição destino com formato incorreto'
                            })
                else:
                    # Posição simples
                    if not re.match(r'^[A-E][0-9]{2}-[1-5]$', posicao):
                        inconsistencias.append({
                            'tipo': 'operacao',
                            'id': operacao_id,
                            'container': numero,
                            'posicao': posicao,
                            'problema': 'Formato incorreto'
                        })
        
        return jsonify({
            'success': True,
            'total_inconsistencias': len(inconsistencias),
            'inconsistencias': inconsistencias,
            'status': 'Todas as posições estão corretas' if len(inconsistencias) == 0 else f'{len(inconsistencias)} inconsistências encontradas'
        })
        
    except Exception as e:
        logger.error(f"Erro ao validar posições: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Erro ao validar posições'
        }), 500