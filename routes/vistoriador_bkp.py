from flask import Blueprint, request, render_template, jsonify, session, redirect, url_for, g, current_app
from functools import wraps
import sqlite3
from datetime import datetime
import os

# Definir o blueprint para as rotas de vistoriador
vistoriador_bp = Blueprint('vistoriador', __name__, url_prefix='/vistoriador')

# Função auxiliar para obter conexão com o banco de dados
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Decorator para verificar se o usuário é um vistoriador
def vistoriador_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verificar se o usuário está logado e tem papel de vistoriador
        if 'user_id' not in session or session.get('role') != 'vistoriador':
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

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
        tipo_container = request.form.get('tipo_container', '').strip().upper()
        tamanho = request.form.get('tamanho', '').strip()
        tipo_operacao = request.form.get('tipo_operacao', '').strip()
        condicao = request.form.get('condicao', '').strip()
        observacoes = request.form.get('observacoes', '').strip()
        
        # Processar avarias (pode vir como JSON ou como campos de formulário)
        avarias = []
        avarias_json = request.form.get('avarias')
        if avarias_json:
            try:
                avarias = json.loads(avarias_json)
            except json.JSONDecodeError:
                # Se não for um JSON válido, tentar obter como campos de formulário
                avarias = request.form.getlist('avarias[]')
                if not isinstance(avarias, list):
                    avarias = [avarias] if avarias else []
        
        # Validar dados obrigatórios
        campos_obrigatorios = {
            'Número do Container': container_numero,
            'Status': status,
            'Código ISO': iso_container,
            'Capacidade': capacidade,
            'Tara': tara,
            'Armador': armador,
            'Tipo de Container': tipo_container,
            'Tamanho': tamanho,
            'Tipo de Operação': tipo_operacao,
            'Condição': condicao
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
        
        # Conectar ao banco de dados
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar e criar tabelas se não existirem
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vistorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                container_numero TEXT NOT NULL,
                iso_container TEXT NOT NULL,
                tipo_container TEXT NOT NULL,
                tamanho TEXT NOT NULL,
                capacidade REAL NOT NULL,
                tara REAL NOT NULL,
                lacre TEXT,
                armador TEXT NOT NULL,
                tipo_operacao TEXT NOT NULL,
                condicao TEXT NOT NULL,
                observacoes TEXT,
                usuario_id INTEGER NOT NULL,
                unidade TEXT NOT NULL,
                data_vistoria TEXT NOT NULL,
                status TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
            
            CREATE TABLE IF NOT EXISTS vistoria_avarias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vistoria_id INTEGER NOT NULL,
                estrutura_codigo INTEGER,
                estrutura_nome TEXT,
                avaria_codigo INTEGER,
                avaria_nome TEXT,
                lado TEXT,
                posicao TEXT,
                FOREIGN KEY (vistoria_id) REFERENCES vistorias(id) ON DELETE CASCADE
            )
        ''')
        
        # Inserir registro de vistoria
        cursor.execute('''
            INSERT INTO vistorias (
                container_numero, status, iso_container, tipo_container, tamanho,
                capacidade, tara, lacre, armador, tipo_operacao, condicao,
                observacoes, usuario_id, unidade, data_vistoria
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero, status, iso_container, tipo_container, tamanho,
            capacidade, tara, lacre, armador, tipo_operacao, condicao,
            observacoes, usuario_id, unidade, data_vistoria
        ))
        
        # Obter o ID da vistoria recém-inserida
        vistoria_id = cursor.lastrowid
        
        # Inserir avarias, se houver
        if avarias and isinstance(avarias, list):
            for avaria in avarias:
                if isinstance(avaria, dict):
                    cursor.execute('''
                        INSERT INTO vistoria_avarias (
                            vistoria_id, estrutura_codigo, estrutura_nome,
                            avaria_codigo, avaria_nome, lado, posicao
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        vistoria_id,
                        avaria.get('estrutura_codigo'),
                        avaria.get('estrutura_nome', ''),
                        avaria.get('avaria_codigo'),
                        avaria.get('avaria_nome', ''),
                        avaria.get('lado', ''),
                        avaria.get('posicao', '')
                    ))
        
        # Atualizar tabela de containers
        cursor.execute('''
            INSERT OR REPLACE INTO containers (
                numero, status, posicao_atual, unidade, tipo_container,
                tamanho, capacidade, tara, armador, data_criacao, ultima_atualizacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero,
            "vistoriado",  # Status inicial após vistoria
            "aguardando descarga",  # Posição inicial
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
        conn.commit()
        conn.close()
        
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
        
        conn.close()
        
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
@vistoriador_required
def obter_vistoria(vistoria_id):
    try:
        # Obter unidade do usuário da sessão
        unidade = session.get('unidade')
        
        # Conectar ao banco de dados
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Buscar a vistoria específica
        cursor.execute('''
            SELECT v.*, u.username as vistoriador_nome
            FROM vistorias v
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.id = ? AND v.unidade = ?
        ''', (vistoria_id, unidade))
        
        vistoria = cursor.fetchone()
        
        if not vistoria:
            conn.close()
            return jsonify({'success': False, 'message': 'Vistoria não encontrada ou não pertence à sua unidade'})
        
        # Converter para dicionário
        resultado = {
            'id': vistoria['id'],
            'container_numero': vistoria['container_numero'],
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
        
        conn.close()
        
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
        container_numero = request.form.get('container_numero').strip().upper()
        status = request.form.get('status')
        iso_container = request.form.get('iso_container').strip().upper()
        capacidade = request.form.get('capacidade')
        tara = request.form.get('tara')
        lacre = request.form.get('lacre', '').strip().upper()
        armador = request.form.get('armador', '').strip().upper()
        observacoes = request.form.get('observacoes', '')
        
        # Validar dados
        if not container_numero or not status or not iso_container or not capacidade or not tara or not armador:
            return jsonify({'success': False, 'message': 'Todos os campos obrigatórios devem ser preenchidos'})
        
        # Conectar ao banco de dados
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar se a vistoria existe e pertence à unidade do usuário
        cursor.execute('''
            SELECT * FROM vistorias 
            WHERE id = ? AND unidade = ?
        ''', (vistoria_id, unidade))
        
        vistoria = cursor.fetchone()
        
        if not vistoria:
            conn.close()
            return jsonify({'success': False, 'message': 'Vistoria não encontrada ou não pertence à sua unidade'})
        
        # Atualizar os dados da vistoria
        cursor.execute('''
            UPDATE vistorias SET
                container_numero = ?,
                status = ?,
                iso_container = ?,
                capacidade = ?,
                tara = ?,
                lacre = ?,
                armador = ?,
                observacoes = ?
            WHERE id = ? AND unidade = ?
        ''', (
            container_numero, status, iso_container, capacidade,
            tara, lacre, armador, observacoes, vistoria_id, unidade
        ))
        
        # Atualizar o container correspondente na tabela de containers se existir
        cursor.execute('''
            UPDATE containers SET
                status = 'vistoriado',
                ultima_atualizacao = ?
            WHERE numero = ?
        ''', (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), container_numero))
        
        # Commit e fechar conexão
        conn.commit()
        conn.close()
        
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar se a vistoria existe e pertence à unidade do usuário
        cursor.execute('''
            SELECT * FROM vistorias 
            WHERE id = ? AND unidade = ?
        ''', (vistoria_id, unidade))
        
        vistoria = cursor.fetchone()
        
        if not vistoria:
            conn.close()
            return jsonify({'success': False, 'message': 'Vistoria não encontrada ou não pertence à sua unidade'})
        
        # Excluir a vistoria
        cursor.execute('DELETE FROM vistorias WHERE id = ?', (vistoria_id,))
        
        # Commit e fechar conexão
        conn.commit()
        conn.close()
        
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
            conn.commit()
        
        # Buscar todos os armadores
        cursor.execute('SELECT nome FROM armadores ORDER BY nome')
        armadores = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({'success': True, 'armadores': armadores})
    
    except Exception as e:
        print(f"Erro ao listar armadores: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao listar armadores: {str(e)}'})
