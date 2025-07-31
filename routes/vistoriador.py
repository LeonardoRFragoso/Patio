from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
from utils.db import get_db
from utils.permissions import vistoriador_required, admin_required, admin_completo_only_required
from utils.csrf import csrf
import os
import json
import sqlite3
from datetime import datetime, timedelta

# Definir o blueprint para as rotas de vistoriador
vistoriador_bp = Blueprint('vistoriador', __name__, url_prefix='/vistoriador')

# Decorator para verificar se o usuário é um vistoriador
def vistoriador_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verificar se o usuário está logado e tem papel de vistoriador
        if 'user_id' not in session or session.get('role') != 'vistoriador':
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

# ✅ NOVA ROTA: Indicadores do Pátio
@vistoriador_bp.route('/indicadores-patio', methods=['GET'])
@vistoriador_required
def obter_indicadores_patio():
    """
    Retorna indicadores estatísticos do pátio para o dashboard do vistoriador
    """
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Data de hoje para calcular estatísticas diárias
        hoje = datetime.now().strftime('%Y-%m-%d')
        
        # 1. Total de containers na unidade
        cursor.execute('''
            SELECT COUNT(*) FROM containers WHERE unidade = ?
        ''', (unidade,))
        total_containers = cursor.fetchone()[0]
        
        # 2. Containers vistoriados
        cursor.execute('''
            SELECT COUNT(*) FROM containers WHERE status = 'vistoriado' AND unidade = ?
        ''', (unidade,))
        containers_vistoriados = cursor.fetchone()[0]
        
        # 3. Containers no pátio
        cursor.execute('''
            SELECT COUNT(*) FROM containers 
            WHERE status = 'no patio' AND unidade = ? 
            AND posicao_atual IS NOT NULL
        ''', (unidade,))
        containers_no_patio = cursor.fetchone()[0]
        
        # 4. Containers carregados
        cursor.execute('''
            SELECT COUNT(*) FROM containers 
            WHERE status IN ('carregado', 'fora do patio') AND unidade = ?
        ''', (unidade,))
        containers_carregados = cursor.fetchone()[0]
        
        # 5. Novos containers hoje (vistoriados hoje)
        cursor.execute('''
            SELECT COUNT(*) FROM vistorias v
            JOIN containers c ON v.container_numero = c.numero
            WHERE DATE(v.data_vistoria) = ? AND c.unidade = ?
        ''', (hoje, unidade))
        vistoriados_hoje = cursor.fetchone()[0]
        
        # 6. Containers carregados hoje
        cursor.execute('''
            SELECT COUNT(*) FROM operacoes_carregamento 
            WHERE DATE(data_hora) = ? AND unidade = ?
        ''', (hoje, unidade))
        carregados_hoje = cursor.fetchone()[0]
        
        # 7. Distribuição por altura (apenas containers no pátio)
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN posicao_atual LIKE '%-1' THEN '1'
                    WHEN posicao_atual LIKE '%-2' THEN '2'
                    WHEN posicao_atual LIKE '%-3' THEN '3'
                    WHEN posicao_atual LIKE '%-4' THEN '4'
                    WHEN posicao_atual LIKE '%-5' THEN '5'
                    ELSE 'Indefinido'
                END as altura,
                COUNT(*) as total
            FROM containers 
            WHERE status = 'no patio' AND unidade = ? 
            AND posicao_atual IS NOT NULL
            GROUP BY altura
        ''', (unidade,))
        
        containers_por_altura = {}
        for row in cursor.fetchall():
            altura, total = row
            containers_por_altura[altura] = total
        
        # 8. Distribuição por baia
        cursor.execute('''
            SELECT 
                SUBSTR(posicao_atual, 1, 1) as baia,
                COUNT(*) as total
            FROM containers 
            WHERE status = 'no patio' AND unidade = ? 
            AND posicao_atual IS NOT NULL
            GROUP BY baia
        ''', (unidade,))
        
        containers_por_baia = {}
        for row in cursor.fetchall():
            baia, total = row
            containers_por_baia[baia] = total
        
        # 9. Taxa de ocupação (estimativa baseada no pátio de Suzano)
        # Assumindo capacidade total de 1000 posições (ajustar conforme necessário)
        capacidade_total = 1000
        taxa_ocupacao = round((containers_no_patio / capacidade_total) * 100, 1) if capacidade_total > 0 else 0
        
        # 10. Últimas operações
        cursor.execute('''
            SELECT o.tipo, COUNT(*) as total
            FROM operacoes o
            JOIN containers c ON o.container_id = c.id
            WHERE c.unidade = ? AND DATE(o.data_operacao) = ?
            GROUP BY o.tipo
        ''', (unidade, hoje))
        
        operacoes_hoje = {}
        for row in cursor.fetchall():
            tipo, total = row
            operacoes_hoje[tipo] = total
        
        # 11. Distribuição por armador (containers no pátio)
        cursor.execute('''
            SELECT 
                c.armador as armador,
                COUNT(*) as total
            FROM containers c
            WHERE c.status = 'no patio' AND c.unidade = ? 
            AND c.posicao_atual IS NOT NULL
            GROUP BY c.armador
            ORDER BY total DESC
            LIMIT 10
        ''', (unidade,))
        
        containers_por_armador = {}
        for row in cursor.fetchall():
            armador, total = row
            containers_por_armador[armador or 'Não informado'] = total
        
        db.close()
        
        # Montar resposta
        indicadores = {
            'total_containers': total_containers,
            'containers_vistoriados': containers_vistoriados,
            'containers_no_patio': containers_no_patio,
            'containers_carregados': containers_carregados,
            'containers_fora_patio': total_containers - containers_vistoriados - containers_no_patio - containers_carregados,
            'vistoriados_hoje': vistoriados_hoje,
            'carregados_hoje': carregados_hoje,
            'novos_hoje': vistoriados_hoje,  # Alias para compatibilidade
            'containers_por_altura': containers_por_altura,
            'containers_por_baia': containers_por_baia,
            'containers_por_armador': containers_por_armador,  # Nova estatística por armador
            'taxa_ocupacao': taxa_ocupacao,
            'operacoes_hoje': operacoes_hoje,
            'capacidade_total': capacidade_total,
            'ultima_atualizacao': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'indicadores': indicadores
        })
        
    except Exception as e:
        print(f"Erro ao obter indicadores do pátio: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao obter indicadores: {str(e)}'
        }), 500

# ✅ NOVA ROTA: Listar todos os containers com detalhes
@vistoriador_bp.route('/listar-containers-completo', methods=['GET'])
@vistoriador_required
def listar_containers_completo():
    """
    Retorna lista completa de containers da unidade com todos os detalhes
    Usado para a funcionalidade de consulta e filtragem
    """
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se um filtro de status foi enviado na query string
        status_param = request.args.get('status', '').strip().lower()

        # Montar consulta base
        query = '''
            SELECT 
                c.numero,
                c.status,
                c.posicao_atual,
                c.unidade,
                c.data_criacao,
                c.ultima_atualizacao,
                c.tamanho,
                c.capacidade,
                c.tara,
                c.armador,
                c.tipo_container,
                v.iso_container,
                v.data_vistoria,
                v.lacre,
                v.observacoes,
                v.status as status_vistoria
            FROM containers c
            LEFT JOIN (
                SELECT *
                FROM vistorias
                WHERE id IN (SELECT MAX(id) FROM vistorias GROUP BY container_numero)
            ) v ON c.numero = v.container_numero
            WHERE c.unidade = ?'''  # condição obrigatória de unidade

        params = [unidade]

        # Aplicar filtro de status se fornecido e diferente de 'todos'
        if status_param and status_param != 'todos':
            # O card "Carregados" considera tanto status "carregado" quanto "fora do patio".
            # Quando o frontend envia status=carregado devemos incluir ambos na consulta.
            if status_param == 'carregado':
                query += " AND LOWER(c.status) IN ('carregado', 'fora do patio')"
            else:
                query += " AND LOWER(c.status) = ?"
                params.append(status_param)

        query += " ORDER BY c.ultima_atualizacao DESC"

        # Executar a consulta com os parâmetros apropriados
        cursor.execute(query, params)
        
        containers = []
        for row in cursor.fetchall():
            container_data = {
                'numero': row[0],
                'status': row[1],
                'posicao_atual': row[2],
                'unidade': row[3],
                'data_criacao': row[4],
                'ultima_atualizacao': row[5],
                'tamanho': row[6] or '20',
                'capacidade': row[7],
                'tara': row[8],
                'armador': row[9],
                'tipo_container': row[10],
                'iso_container': row[11],
                'data_vistoria': row[12],
                'lacre': row[13],
                'observacoes': row[14],
                'status_vistoria': row[15]
            }
            containers.append(container_data)
        
        db.close()
        
        return jsonify({
            'success': True,
            'containers': containers,
            'total': len(containers),
            'unidade': unidade
        })
        
    except Exception as e:
        print(f"Erro ao listar containers completo: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao listar containers: {str(e)}'
        }), 500

# ✅ NOVA ROTA: Detalhes de um container específico
@vistoriador_bp.route('/detalhes-container/<container_numero>', methods=['GET'])
@vistoriador_required
def obter_detalhes_container(container_numero):
    """
    Retorna detalhes completos de um container específico
    Incluindo histórico de operações e informações de vistoria
    """
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Buscar informações do container juntamente com a ÚLTIMA vistoria registrada
        cursor.execute('''
            SELECT 
                c.id                 AS container_id,
                c.numero             AS numero,
                c.status             AS status_container,
                c.posicao_atual      AS posicao_atual,
                c.unidade            AS unidade,
                c.tamanho            AS tamanho_container,
                c.tipo_container     AS tipo_container,
                c.ultima_atualizacao AS ultima_atualizacao,
                v.id                 AS vistoria_id,
                v.status             AS status_vistoria,
                v.iso_container      AS iso_container,
                v.tamanho_teu        AS tamanho_teu,
                v.data_vistoria      AS data_vistoria,
                v.lacre              AS lacre,
                v.observacoes        AS obs_vistoria,
                v.vagao              AS vagao,
                v.placa              AS placa
            FROM containers c
            LEFT JOIN (
                SELECT * FROM vistorias 
                WHERE container_numero = ? 
                ORDER BY datetime(data_vistoria) DESC 
                LIMIT 1
            ) v ON v.container_numero = c.numero
            WHERE c.numero = ? AND c.unidade = ?
        ''', (container_numero, container_numero, unidade))
        
        container = cursor.fetchone()
        
        if not container:
            return jsonify({
                'success': False,
                'message': 'Container não encontrado na unidade atual'
            }), 404
        
        # A conexão utiliza row_factory = sqlite3.Row, portanto podemos converter direto em dict
        row_dict = dict(container)
        
        # Agrupar dados relevantes para o card
        container_data = {
            'numero': row_dict.get('numero'),
            'status': row_dict.get('status_vistoria') or row_dict.get('status_container'),
            'posicao_atual': row_dict.get('posicao_atual'),
            'tamanho': row_dict.get('tamanho_teu') or row_dict.get('tamanho_container') or '20',
            'tipo_container': row_dict.get('tipo_container') or row_dict.get('iso_container'),
            'ultima_atualizacao': row_dict.get('ultima_atualizacao') or row_dict.get('data_vistoria'),
            'lacre': row_dict.get('lacre'),
            'observacoes': row_dict.get('obs_vistoria'),
            'vagao': row_dict.get('vagao'),
            'placa': row_dict.get('placa')
        }
        
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
                u.username as operador
            FROM operacoes o
            LEFT JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.container_id = ?
            ORDER BY o.data_operacao DESC
            LIMIT 20
        ''', (container[0],))
        
        historico_operacoes = []
        for op in cursor.fetchall():
            historico_operacoes.append({
                'tipo': op[0],
                'modo': op[1],
                'posicao': op[2],
                'placa': op[3],
                'vagao': op[4],
                'data_operacao': op[5],
                'observacoes': op[6],
                'operador': op[7]
            })
        
        # Buscar avarias da vistoria, se houver
        if container[13]:  # Se há data de vistoria
            cursor.execute('''
                SELECT 
                    av.estrutura_codigo,
                    av.estrutura_nome,
                    av.avaria_codigo,
                    av.avaria_nome,
                    av.observacoes
                FROM avarias_vistoria av
                JOIN vistorias v ON av.vistoria_id = v.id
                WHERE v.container_numero = ?
                ORDER BY av.id
            ''', (container_numero,))
            
            avarias = []
            for avaria in cursor.fetchall():
                avarias.append({
                    'estrutura_codigo': avaria[0],
                    'estrutura_nome': avaria[1],
                    'avaria_codigo': avaria[2],
                    'avaria_nome': avaria[3],
                    'observacoes': avaria[4]
                })
            
            container_data['avarias'] = avarias
        
        db.close()
        
        return jsonify({
            'success': True,
            'container': container_data,
            'historico_operacoes': historico_operacoes
        })
        
    except Exception as e:
        print(f"Erro ao obter detalhes do container {container_numero}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao obter detalhes: {str(e)}'
        }), 500

# ✅ NOVA ROTA: Estatísticas rápidas para widgets
@vistoriador_bp.route('/estatisticas-rapidas', methods=['GET'])
@vistoriador_required
def obter_estatisticas_rapidas():
    """
    Retorna estatísticas rápidas para widgets no dashboard
    """
    try:
        unidade = session.get('unidade')
        
        if not unidade:
            return jsonify({
                'success': False,
                'message': 'Unidade do usuário não definida'
            }), 400
        
        db = get_db()
        cursor = db.cursor()
        
        hoje = datetime.now().strftime('%Y-%m-%d')
        
        # Vistorias realizadas hoje
        cursor.execute('''
            SELECT COUNT(*) FROM vistorias v
            JOIN containers c ON v.container_numero = c.numero
            WHERE DATE(v.data_vistoria) = ? AND c.unidade = ?
        ''', (hoje, unidade))
        vistorias_hoje = cursor.fetchone()[0]
        
        # Containers aguardando descarga
        cursor.execute('''
            SELECT COUNT(*) FROM containers
            WHERE status = 'vistoriado' AND unidade = ?
        ''', (unidade,))
        aguardando_descarga = cursor.fetchone()[0]
        
        # Posições ocupadas no pátio
        cursor.execute('''
            SELECT COUNT(*) FROM containers
            WHERE status = 'no patio' AND posicao_atual IS NOT NULL AND unidade = ?
        ''', (unidade,))
        posicoes_ocupadas = cursor.fetchone()[0]
        
        # Última vistoria realizada
        cursor.execute('''
            SELECT v.container_numero, v.data_vistoria
            FROM vistorias v
            JOIN containers c ON v.container_numero = c.numero
            WHERE c.unidade = ?
            ORDER BY v.data_vistoria DESC
            LIMIT 1
        ''', (unidade,))
        
        ultima_vistoria = cursor.fetchone()
        ultima_vistoria_info = {
            'container': ultima_vistoria[0] if ultima_vistoria else None,
            'data': ultima_vistoria[1] if ultima_vistoria else None
        }
        
        db.close()
        
        return jsonify({
            'success': True,
            'estatisticas': {
                'vistorias_hoje': vistorias_hoje,
                'aguardando_descarga': aguardando_descarga,
                'posicoes_ocupadas': posicoes_ocupadas,
                'ultima_vistoria': ultima_vistoria_info
            }
        })
        
    except Exception as e:
        print(f"Erro ao obter estatísticas rápidas: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Erro ao obter estatísticas: {str(e)}'
        }), 500

# ✅ ROTAS ORIGINAIS (mantidas para compatibilidade)

@vistoriador_bp.route('/registrar', methods=['POST'])
@vistoriador_required
def registrar_vistoria():
    try:
        # Extrair dados do formulário
        container_numero = request.form.get('container_numero', '').strip().upper()
        status = request.form.get('status')
        iso_container = request.form.get('iso_container', '').strip().upper()
        capacidade = request.form.get('capacidade')
        tara = request.form.get('tara')
        lacre = request.form.get('lacre', '').strip().upper()
        armador = request.form.get('armador', '').strip().upper()
        
        # Obter campos adicionais do formulário ou definir valores padrão
        tipo_container = request.form.get('tipo_container', '').strip().upper() or 'PADRÃO'
        tamanho = request.form.get('tamanho', '').strip()
        tipo_operacao = request.form.get('tipo_operacao', '').strip() or 'PADRÃO'
        condicao = request.form.get('condicao', '').strip() or 'NOVO'
        
        # Obter informações de modo de transporte
        vagao = request.form.get('vagao', '').strip().upper()
        placa = request.form.get('placa', '').strip().upper()
        
        # O campo observações agora é 'observacoes_gerais' no frontend
        observacoes = request.form.get('observacoes_gerais', '').strip()
        
        # Processar avarias que vêm como JSON
        avarias = []
        avarias_json = request.form.get('avarias_registradas')
        if avarias_json:
            try:
                avarias = json.loads(avarias_json)
                print(f"Avarias JSON decodificadas com sucesso: {avarias}")
            except json.JSONDecodeError:
                print(f"Erro ao decodificar avarias JSON: {avarias_json}")
                avarias = request.form.getlist('avarias[]')
                if not isinstance(avarias, list):
                    avarias = [avarias] if avarias else []
                print(f"Avarias obtidas como lista de formulário: {avarias}")
        
        # Validar dados obrigatórios
        campos_obrigatorios = {
            'Número do Container': container_numero,
            'Status': status,
            'Código ISO': iso_container,
            'Capacidade': capacidade,
            'Tara': tara,
            'Armador': armador,
            'Tamanho': tamanho
        }
        
        campos_faltando = [campo for campo, valor in campos_obrigatorios.items() if not valor]
        if campos_faltando:
            return jsonify({
                'success': False, 
                'message': f'Campos obrigatórios não preenchidos: {", ".join(campos_faltando)}'
            })
            
        # Validar dados numéricos
        try:
            capacidade = float(capacidade) if capacidade else 0
            tara = float(tara) if tara else 0
            if capacidade <= 0 or tara <= 0:
                return jsonify({
                    'success': False, 
                    'message': 'Capacidade e tara devem ser valores numéricos positivos'
                })
        except ValueError:
            return jsonify({
                'success': False, 
                'message': 'Capacidade e tara devem ser valores numéricos válidos'
            })
        
        # Obter ID do usuário e unidade da sessão
        usuario_id = session.get('user_id')
        unidade = session.get('unidade')
        data_vistoria = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Log dos dados recebidos para debug
        print(f"Registrando vistoria para container {container_numero}")
        print(f"Avarias recebidas: {avarias}")
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar e criar tabelas se não existirem
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vistorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                container_numero TEXT NOT NULL,
                iso_container TEXT NOT NULL,
                capacidade REAL NOT NULL,
                tara REAL NOT NULL,
                lacre TEXT,
                armador TEXT NOT NULL,
                observacoes TEXT,
                usuario_id INTEGER NOT NULL,
                unidade TEXT NOT NULL,
                data_vistoria TEXT NOT NULL,
                status TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        ''')
        
        # Verificar se as novas colunas existem na tabela vistorias e adicioná-las se não existirem
        try:
            cursor.execute("SELECT tipo_container FROM vistorias LIMIT 1")
        except Exception:
            cursor.execute("ALTER TABLE vistorias ADD COLUMN tipo_container TEXT DEFAULT 'PADRÃO'")
        
        try:
            cursor.execute("SELECT tamanho FROM vistorias LIMIT 1")
        except Exception:
            cursor.execute("ALTER TABLE vistorias ADD COLUMN tamanho TEXT DEFAULT '20'")
        
        try:
            cursor.execute("SELECT tipo_operacao FROM vistorias LIMIT 1")
        except Exception:
            cursor.execute("ALTER TABLE vistorias ADD COLUMN tipo_operacao TEXT DEFAULT 'PADRÃO'")
        
        try:
            cursor.execute("SELECT condicao FROM vistorias LIMIT 1")
        except Exception:
            cursor.execute("ALTER TABLE vistorias ADD COLUMN condicao TEXT DEFAULT 'NOVO'")
        
        try:
            cursor.execute("SELECT vagao FROM vistorias LIMIT 1")
        except Exception:
            cursor.execute("ALTER TABLE vistorias ADD COLUMN vagao TEXT")
        
        try:
            cursor.execute("SELECT placa FROM vistorias LIMIT 1")
        except Exception:
            cursor.execute("ALTER TABLE vistorias ADD COLUMN placa TEXT")
        
        # Criar tabela para avarias de vistoria separadamente
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS avarias_vistoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vistoria_id INTEGER NOT NULL,
                estrutura_codigo TEXT,
                estrutura_nome TEXT,
                avaria_codigo TEXT,
                avaria_nome TEXT,
                observacoes TEXT,
                FOREIGN KEY (vistoria_id) REFERENCES vistorias (id) ON DELETE CASCADE
            )
        ''')
        
        # Inserir registro de vistoria
        cursor.execute('''
            INSERT INTO vistorias (
                container_numero, status, iso_container, tipo_container, tamanho,
                capacidade, tara, lacre, armador, tipo_operacao, condicao,
                observacoes, usuario_id, unidade, data_vistoria, vagao, placa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero, status, iso_container, tipo_container, tamanho,
            capacidade, tara, lacre, armador, tipo_operacao, condicao,
            observacoes, usuario_id, unidade, data_vistoria, vagao, placa
        ))
        
        # Obter o ID da vistoria recém-inserida
        vistoria_id = cursor.lastrowid
        
        # Inserir avarias, se houver
        if avarias and isinstance(avarias, list):
            for avaria in avarias:
                try:
                    estrutura_codigo = avaria.get('estrutura', '')
                    avaria_codigo = avaria.get('avaria', '')
                    avaria_observacoes = avaria.get('observacoes', '')
                    
                    # Buscar nomes correspondentes no banco de dados
                    cursor.execute('SELECT nome FROM estruturas WHERE codigo = ?', (estrutura_codigo,))
                    estrutura_result = cursor.fetchone()
                    estrutura_nome = estrutura_result[0] if estrutura_result else f'{estrutura_codigo}'
                    
                    cursor.execute('SELECT nome FROM avarias WHERE codigo = ?', (avaria_codigo,))
                    avaria_result = cursor.fetchone()
                    avaria_nome = avaria_result[0] if avaria_result else f'{avaria_codigo}'
                    
                    print(f'Processando avaria: estrutura={estrutura_codigo} ({estrutura_nome}), avaria={avaria_codigo} ({avaria_nome})')
                    
                    # Inserir avaria com estrutura
                    cursor.execute('''
                        INSERT INTO avarias_vistoria 
                        (vistoria_id, estrutura_codigo, estrutura_nome, avaria_codigo, avaria_nome, observacoes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        vistoria_id, 
                        estrutura_codigo, 
                        estrutura_nome,
                        avaria_codigo,
                        avaria_nome,
                        avaria_observacoes
                    ))
                except Exception as e:
                    print(f"Erro ao inserir avaria: {str(e)}, avaria: {avaria}")
                    continue
        
        # Atualizar tabela de containers
        cursor.execute('''
            INSERT OR REPLACE INTO containers (
                numero, status, posicao_atual, unidade, tipo_container,
                tamanho, capacidade, tara, armador, data_criacao, ultima_atualizacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero,
            "vistoriado",
            None,
            unidade,
            tipo_container,
            tamanho,
            capacidade,
            tara,
            armador,
            data_vistoria,
            data_vistoria
        ))
        
        # Commit e fechar conexão
        db.commit()
        db.close()
        
        return jsonify({'success': True, 'message': 'Vistoria registrada com sucesso'})
    
    except Exception as e:
        print(f"Erro ao registrar vistoria: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao registrar vistoria: {str(e)}'})

# Rota para listar vistorias recentes da unidade do usuário
@vistoriador_bp.route('/listar-vistorias', methods=['GET'])
@vistoriador_required
def listar_vistorias():
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se a tabela existe
        cursor.execute('''
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='vistorias'
        ''')
        
        if not cursor.fetchone():
            return jsonify({'success': True, 'vistorias': []})
        
        # Buscar vistorias recentes da unidade do usuário
        cursor.execute('''
            SELECT v.*, u.username as vistoriador_nome
            FROM vistorias v
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.unidade = ?
            ORDER BY v.data_vistoria DESC
            LIMIT 20
        ''', (unidade,))
        
        vistorias = cursor.fetchall()
        
        # Converter resultados para lista de dicionários
        resultado = []
        for v in vistorias:
            resultado.append({
                'id': v['id'],
                'container_numero': v['container_numero'],
                'status': v['status'],
                'iso_container': v['iso_container'],
                'capacidade': v['capacidade'],
                'tara': v['tara'],
                'lacre': v['lacre'],
                'armador': v['armador'] if 'armador' in v.keys() else 'N/A',
                'observacoes': v['observacoes'],
                'vistoriador': v['vistoriador_nome'],
                'unidade': v['unidade'],
                'data_vistoria': v['data_vistoria']
            })
        
        db.close()
        
        return jsonify({'success': True, 'vistorias': resultado})
    
    except Exception as e:
        print(f"Erro ao listar vistorias: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao listar vistorias: {str(e)}', 'vistorias': []})

# Rota para obter a lista de armadores do arquivo txt
@vistoriador_bp.route('/api/armadores', methods=['GET'])
def get_armadores():
    try:
        # Caminho para o arquivo de armadores
        armadores_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'armadores_brasil.txt')
        
        # Verificar se o arquivo existe
        if not os.path.exists(armadores_file):
            return jsonify({'success': False, 'message': 'Arquivo de armadores não encontrado', 'armadores': []})
        
        # Ler o arquivo de armadores
        armadores = []
        with open(armadores_file, 'r', encoding='utf-8') as file:
            for line in file:
                armador = line.strip()
                if armador:  # Ignorar linhas vazias
                    armadores.append(armador)
        
        return jsonify({'success': True, 'armadores': armadores})
        
    except Exception as e:
        print(f"Erro ao obter lista de armadores: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao obter lista de armadores: {str(e)}', 'armadores': []})

# Rota para obter detalhes de uma vistoria específica
@vistoriador_bp.route('/vistoria/<int:vistoria_id>', methods=['GET'])
@vistoriador_bp.route('/obter-vistoria/<int:vistoria_id>', methods=['GET'])
@vistoriador_required
def obter_vistoria(vistoria_id):
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Buscar a vistoria específica
        cursor.execute('''
            SELECT v.*, u.username as vistoriador_nome
            FROM vistorias v
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.id = ? AND v.unidade = ?
        ''', (vistoria_id, unidade))
        
        vistoria = cursor.fetchone()
        
        if not vistoria:
            db.close()
            return jsonify({'success': False, 'message': 'Vistoria não encontrada ou não pertence à sua unidade'})
        
        # Converter para dicionário
        resultado = {
            'id': vistoria['id'],
            'container_numero': vistoria['container_numero'],
            'numero_container': vistoria['container_numero'],
            'status': vistoria['status'],
            'iso_container': vistoria['iso_container'],
            'capacidade': vistoria['capacidade'],
            'tara': vistoria['tara'],
            'lacre': vistoria['lacre'],
            'armador': vistoria['armador'] if 'armador' in vistoria.keys() else 'N/A',
            'observacoes': vistoria['observacoes'],
            'vistoriador': vistoria['vistoriador_nome'],
            'unidade': vistoria['unidade'],
            'data_vistoria': vistoria['data_vistoria']
        }
        
        # Obter avarias associadas à vistoria no novo formato
        cursor.execute('''
            SELECT * FROM avarias_vistoria WHERE vistoria_id = ?
        ''', (vistoria_id,))
        
        avarias_raw = cursor.fetchall()
        avarias = []
        
        for avaria in avarias_raw:
            avaria_dict = dict(avaria)
            avarias.append({
                'estrutura': str(avaria_dict.get('estrutura_codigo', '')),
                'avaria': str(avaria_dict.get('avaria_codigo', '')),
                'observacoes': avaria_dict.get('observacoes', '')
            })
        
        resultado['avarias'] = json.dumps(avarias)
        
        db.close()
        
        return jsonify({'success': True, 'vistoria': resultado})
    
    except Exception as e:
        print(f"Erro ao obter detalhes da vistoria: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao obter detalhes da vistoria: {str(e)}'})

# Rota para editar uma vistoria existente
@vistoriador_bp.route('/editar/<int:vistoria_id>', methods=['POST'])
@vistoriador_required
def editar_vistoria(vistoria_id):
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        usuario_id = session.get('user_id')
        
        # Extrair dados do formulário
        container_numero = request.form.get('container_numero', '').strip().upper()
        status = request.form.get('status')
        iso_container = request.form.get('iso_container', '').strip().upper()
        capacidade = request.form.get('capacidade')
        tara = request.form.get('tara')
        lacre = request.form.get('lacre', '').strip().upper()
        armador = request.form.get('armador', '').strip().upper()
        tipo_container = request.form.get('tipo_container', '').strip().upper()
        tamanho = request.form.get('tamanho', '').strip()
        tipo_operacao = request.form.get('tipo_operacao', '').strip()
        condicao = request.form.get('condicao', '').strip()
        observacoes_gerais = request.form.get('observacoes_gerais', '').strip()
        
        # Para retrocompatibilidade, verificar se existe o campo observacoes tambem
        if not observacoes_gerais:
            observacoes_gerais = request.form.get('observacoes', '').strip()
        
        # Validar dados
        if not container_numero or not status or not iso_container or not capacidade or not tara or not armador:
            return jsonify({'success': False, 'message': 'Todos os campos obrigatórios devem ser preenchidos'})
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se a vistoria existe e pertence à unidade do usuário
        cursor.execute('''
            SELECT * FROM vistorias 
            WHERE id = ? AND unidade = ?
        ''', (vistoria_id, unidade))
        
        vistoria = cursor.fetchone()
        
        if not vistoria:
            db.close()
            return jsonify({'success': False, 'message': 'Vistoria não encontrada ou não pertence à sua unidade'})
        
        # Processar avarias do formulário de edição, se houver
        avarias = []
        avarias_json = request.form.get('avarias_registradas')
        if avarias_json:
            try:
                avarias = json.loads(avarias_json)
                print(f"Avarias na edição: {avarias}")
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar JSON de avarias: {str(e)}")
        
        # Atualizar informações da vistoria
        cursor.execute('''
            UPDATE vistorias SET
                container_numero = ?,
                status = ?,
                iso_container = ?,
                capacidade = ?,
                tara = ?,
                lacre = ?,
                armador = ?,
                tipo_container = ?,
                tamanho = ?,
                tipo_operacao = ?,
                condicao = ?,
                observacoes = ?
            WHERE id = ? AND unidade = ?
        ''', (
            container_numero, status, iso_container, capacidade,
            tara, lacre, armador, tipo_container, tamanho, 
            tipo_operacao, condicao, observacoes_gerais, vistoria_id, unidade
        ))
        
        # Se há novas avarias, primeiro excluímos as anteriores e depois inserimos as novas
        if avarias:
            # Remover avarias antigas
            cursor.execute('DELETE FROM avarias_vistoria WHERE vistoria_id = ?', (vistoria_id,))
            
            # Inserir novas avarias
            for avaria in avarias:
                try:
                    estrutura_codigo = str(avaria.get('estrutura', ''))
                    avaria_codigo = str(avaria.get('avaria', ''))
                    avaria_observacoes = avaria.get('observacoes', '')
                    
                    # Buscar os nomes correspondentes aos códigos
                    estrutura_nome = "" 
                    avaria_nome = ""
                    
                    # Buscar nome da estrutura
                    cursor.execute('SELECT nome FROM estruturas WHERE codigo = ?', (estrutura_codigo,))
                    estrutura_result = cursor.fetchone()
                    if estrutura_result:
                        estrutura_nome = estrutura_result['nome']
                    
                    # Buscar nome da avaria
                    cursor.execute('SELECT nome FROM avarias WHERE codigo = ?', (avaria_codigo,))
                    avaria_result = cursor.fetchone()
                    if avaria_result:
                        avaria_nome = avaria_result['nome']
                    
                    cursor.execute('''
                        INSERT INTO avarias_vistoria 
                        (vistoria_id, estrutura_codigo, estrutura_nome, avaria_codigo, avaria_nome, observacoes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        vistoria_id, 
                        estrutura_codigo, 
                        estrutura_nome,
                        avaria_codigo,
                        avaria_nome,
                        avaria_observacoes
                    ))
                except Exception as e:
                    print(f"Erro ao inserir avaria na edição: {str(e)}, avaria: {avaria}")
                    continue
        
        # Atualizar o container correspondente na tabela de containers se existir
        cursor.execute('''
            UPDATE containers SET
                status = 'vistoriado',
                ultima_atualizacao = ?
            WHERE numero = ?
        ''', (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), container_numero))
        
        # Commit e fechar conexão
        db.commit()
        db.close()
        
        return jsonify({'success': True, 'message': 'Vistoria atualizada com sucesso'})
    
    except Exception as e:
        print(f"Erro ao editar vistoria: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao editar vistoria: {str(e)}'})

# Rota para excluir uma vistoria
@vistoriador_bp.route('/excluir/<int:vistoria_id>', methods=['POST'])
@vistoriador_required
def excluir_vistoria(vistoria_id):
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se a vistoria existe e pertence à unidade do usuário
        cursor.execute('''
            SELECT * FROM vistorias 
            WHERE id = ? AND unidade = ?
        ''', (vistoria_id, unidade))
        
        vistoria = cursor.fetchone()
        
        if not vistoria:
            db.close()
            return jsonify({'success': False, 'message': 'Vistoria não encontrada ou não pertence à sua unidade'})
        
        # Excluir a vistoria
        cursor.execute('DELETE FROM vistorias WHERE id = ?', (vistoria_id,))
        
        # Commit e fechar conexão
        db.commit()
        db.close()
        
        return jsonify({'success': True, 'message': 'Vistoria excluída com sucesso'})
    
    except Exception as e:
        print(f"Erro ao excluir vistoria: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao excluir vistoria: {str(e)}'})

@vistoriador_bp.route('/listar-armadores', methods=['GET'])
@vistoriador_required
def listar_armadores():
    """
    Retorna a lista de armadores cadastrados para popular os formulários
    """
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Primeiro verifica se a tabela de armadores existe
        cursor.execute("""SELECT name FROM sqlite_master 
                        WHERE type='table' AND name='armadores'""") 
        if not cursor.fetchone():
            # Se não existir, criar a tabela com alguns armadores padrão
            cursor.execute('''CREATE TABLE IF NOT EXISTS armadores
                            (id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nome TEXT NOT NULL UNIQUE)''')
            
            # Adicionar alguns armadores padrão
            armadores_padrao = [
                ('MSC',),
                ('MAERSK',),
                ('CMA CGM',),
                ('COSCO',),
                ('EVERGREEN',),
                ('HAPAG-LLOYD',),
                ('ONE',),
                ('YANG MING',),
                ('HMM',),
                ('PIL',)
            ]
            
            cursor.executemany('INSERT OR IGNORE INTO armadores (nome) VALUES (?)', armadores_padrao)
            db.commit()
        
        # Buscar todos os armadores
        cursor.execute('SELECT nome FROM armadores ORDER BY nome')
        armadores = [row[0] for row in cursor.fetchall()]
        
        db.close()
        
        return jsonify({'success': True, 'armadores': armadores})
    
    except Exception as e:
        print(f"Erro ao listar armadores: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao listar armadores: {str(e)}'})

@vistoriador_bp.route('/listar-estruturas', methods=['GET'])
@vistoriador_required
def listar_estruturas():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            SELECT codigo, nome 
            FROM estruturas 
            WHERE ativo = 1 
            ORDER BY CAST(codigo AS INTEGER)
        ''')
        estruturas = []
        for row in cursor.fetchall():
            estruturas.append({
                'codigo': row[0],
                'nome': row[1]
            })
        db.close()
        return jsonify(estruturas)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao listar estruturas: {str(e)}'})

@vistoriador_bp.route('/listar-avarias', methods=['GET'])
@vistoriador_required
def listar_avarias():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            SELECT codigo, nome 
            FROM avarias 
            WHERE ativo = 1 
            ORDER BY CAST(codigo AS INTEGER)
        ''')
        avarias = []
        for row in cursor.fetchall():
            avarias.append({
                'codigo': row[0],
                'nome': row[1]
            })
        db.close()
        return jsonify(avarias)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao listar avarias: {str(e)}'})

@vistoriador_bp.route('/adicionar-estrutura', methods=['POST'])
@admin_completo_only_required
def adicionar_estrutura():
    """
    Adiciona uma nova estrutura ao banco de dados
    """
    try:
        data = request.get_json()
        nome = data.get('nome', '').strip()
        
        if not nome:
            return jsonify({'success': False, 'message': 'Nome da estrutura é obrigatório'})
        
        db = get_db()
        cursor = db.cursor()
        
        # Buscar o próximo código disponível
        cursor.execute('SELECT CAST(codigo AS INTEGER) FROM estruturas ORDER BY CAST(codigo AS INTEGER) DESC LIMIT 1')
        ultimo_codigo = cursor.fetchone()
        proximo_codigo = str((ultimo_codigo[0] if ultimo_codigo else 0) + 1)
        
        # Verificar se o nome já existe
        cursor.execute('SELECT id FROM estruturas WHERE nome = ? AND ativo = 1', (nome,))
        if cursor.fetchone():
            db.close()
            return jsonify({'success': False, 'message': 'Uma estrutura com este nome já existe'})
        
        # Inserir nova estrutura
        data_agora = datetime.now().isoformat()
        usuario = session.get('username', 'Desconhecido')
        
        # Formatar nome com código no padrão "CÓDIGO - NOME"
        nome_formatado = f"{proximo_codigo} - {nome}"
        
        cursor.execute('''
            INSERT INTO estruturas (codigo, nome, ativo, data_criacao, criado_por)
            VALUES (?, ?, 1, ?, ?)
        ''', (proximo_codigo, nome_formatado, data_agora, usuario))
        
        db.commit()
        db.close()
        
        return jsonify({
            'success': True, 
            'message': 'Estrutura adicionada com sucesso',
            'estrutura': {
                'codigo': proximo_codigo,
                'nome': nome_formatado
            }
        })
    
    except Exception as e:
        print(f"Erro ao adicionar estrutura: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao adicionar estrutura: {str(e)}'})

@vistoriador_bp.route('/adicionar-avaria', methods=['POST'])
@admin_completo_only_required
def adicionar_avaria():
    """
    Adiciona uma nova avaria ao banco de dados
    """
    try:
        data = request.get_json()
        nome = data.get('nome', '').strip()
        
        if not nome:
            return jsonify({'success': False, 'message': 'Nome da avaria é obrigatório'})
        
        db = get_db()
        cursor = db.cursor()
        
        # Buscar o próximo código disponível
        cursor.execute('SELECT CAST(codigo AS INTEGER) FROM avarias ORDER BY CAST(codigo AS INTEGER) DESC LIMIT 1')
        ultimo_codigo = cursor.fetchone()
        proximo_codigo = str((ultimo_codigo[0] if ultimo_codigo else 0) + 1)
        
        # Verificar se o nome já existe
        cursor.execute('SELECT id FROM avarias WHERE nome = ? AND ativo = 1', (nome,))
        if cursor.fetchone():
            db.close()
            return jsonify({'success': False, 'message': 'Uma avaria com este nome já existe'})
        
        # Inserir nova avaria
        data_agora = datetime.now().isoformat()
        usuario = session.get('username', 'Desconhecido')
        
        # Formatar nome com código no padrão "CÓDIGO - NOME"
        nome_formatado = f"{proximo_codigo} - {nome}"
        
        cursor.execute('''
            INSERT INTO avarias (codigo, nome, ativo, data_criacao, criado_por)
            VALUES (?, ?, 1, ?, ?)
        ''', (proximo_codigo, nome_formatado, data_agora, usuario))
        
        db.commit()
        db.close()
        
        return jsonify({
            'success': True, 
            'message': 'Avaria adicionada com sucesso',
            'avaria': {
                'codigo': proximo_codigo,
                'nome': nome_formatado
            }
        })
    
    except Exception as e:
        print(f"Erro ao adicionar avaria: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao adicionar avaria: {str(e)}'})