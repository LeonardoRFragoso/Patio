from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
from datetime import datetime
import sqlite3
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from utils.db import get_db
from utils.security import is_strong_password
from utils.permissions import admin_required, admin_completo_required, admin_administrativo_required

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('admin_routes')

# Criar o Blueprint para as rotas de administração
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Decorator para verificar se o usuário está autenticado e é administrador

@admin_bp.route('/corrigir-descarga')
@admin_required  # Ambos os tipos de admin podem acessar
def pagina_corrigir_descarga():
    """Dashboard admin – página para correção de descarga"""
    try:
        # Contador de solicitações pendentes para badge do sidebar (mantém consistência)
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM solicitacoes_registro WHERE status = 'pendente'")
        solicitacoes_pendentes = cursor.fetchone()[0]

        return render_template('admin/corrigir_descarga.html', solicitacoes_pendentes=solicitacoes_pendentes)
    except Exception as e:
        logger.error(f"Erro ao renderizar página corrigir descarga: {str(e)}")
        flash('Erro ao carregar página de correção de descarga', 'danger')
        return redirect(url_for('admin.admin_dashboard'))
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.info(f"Verificando acesso administrativo para: {session.get('username', 'Usuário desconhecido')}")
        
        if 'username' not in session:
            flash('Você precisa fazer login para acessar esta página', 'danger')
            return redirect(url_for('auth.login'))
        
        # Verificar se o usuário é administrador (completo ou administrativo)
        role = session.get('role')
        if role != 'admin' and role != 'admin_administrativo':
            flash('Você não tem permissão para acessar esta página', 'danger')
            return redirect(url_for('auth.dashboard'))
            
        return f(*args, **kwargs)
    return decorated_function

# Função para registrar ações administrativas nos logs
def log_admin_action(usuario, acao, detalhes):
    try:
        db = get_db()
        cursor = db.cursor()
        data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("""
            INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
            VALUES (?, ?, ?, ?, ?)
        """, (data_hora, usuario, 'admin', acao, detalhes))
        # O banco está em autocommit mode, não precisa de commit manual
        logger.info(f"Log registrado: {usuario} - {acao}")
    except Exception as e:
        logger.error(f"Erro ao registrar log administrativo: {e}")

# Função para migrar dados completos das tabelas originais
def inicializar_tabelas_estruturas_avarias():
    """
    Migra TODOS os dados das tabelas originais estruturas e avarias_tipo
    para as tabelas da interface administrativa
    """
    try:
        db = get_db()
        cursor = db.cursor()
        data_agora = datetime.now().isoformat()
        
        # ========================================
        # MIGRAÇÃO DE ESTRUTURAS (64 registros)
        # ========================================
        
        # Verificar se a tabela de destino existe
        cursor.execute("""SELECT name FROM sqlite_master 
                         WHERE type='table' AND name='estruturas'""")
        
        if not cursor.fetchone():
            # Criar tabela de destino
            logger.info("Criando tabela estruturas...")
            cursor.execute("""
            CREATE TABLE estruturas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT NOT NULL UNIQUE,
                nome TEXT NOT NULL,
                ativo INTEGER DEFAULT 1,
                data_criacao TEXT,
                criado_por TEXT
            )
            """)
        else:
            # Verificar se precisa remigrar (se está vazia ou incompleta)
            cursor.execute("SELECT COUNT(*) FROM estruturas WHERE ativo = 1")
            count_atual = cursor.fetchone()[0]
            if count_atual < 64:
                cursor.execute("DELETE FROM estruturas")
                logger.info("Tabela estruturas limpa para remigração completa")
        
        # Verificar se a tabela original existe
        cursor.execute("""SELECT name FROM sqlite_master 
                         WHERE type='table' AND name='estruturas'""")
        
        if cursor.fetchone():
            # Migrar TODAS as estruturas da tabela original
            logger.info("Migrando TODAS as estruturas da tabela original...")
            cursor.execute("""
            INSERT OR REPLACE INTO estruturas (codigo, nome, ativo, data_criacao, criado_por)
            SELECT codigo, nome, 1, ?, 'sistema'
            FROM estruturas 
            ORDER BY CAST(codigo AS INTEGER)
            """, (data_agora,))
            
            # Verificar quantas foram migradas
            cursor.execute("SELECT COUNT(*) FROM estruturas WHERE ativo = 1")
            total_estruturas = cursor.fetchone()[0]
            logger.info(f"✅ {total_estruturas} estruturas migradas com sucesso")
        else:
            logger.warning("⚠️ Tabela 'estruturas' original não encontrada!")
        
        # ========================================
        # MIGRAÇÃO DE AVARIAS (46 registros)
        # ========================================
        
        # Verificar se a tabela de destino existe
        cursor.execute("""SELECT name FROM sqlite_master 
                         WHERE type='table' AND name='avarias'""")
        
        if not cursor.fetchone():
            # Criar tabela de destino
            logger.info("Criando tabela avarias...")
            cursor.execute("""
            CREATE TABLE avarias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT NOT NULL UNIQUE,
                nome TEXT NOT NULL,
                ativo INTEGER DEFAULT 1,
                data_criacao TEXT,
                criado_por TEXT
            )
            """)
        else:
            # Verificar se precisa remigrar (se está vazia ou incompleta)
            cursor.execute("SELECT COUNT(*) FROM avarias WHERE ativo = 1")
            count_atual = cursor.fetchone()[0]
            if count_atual < 46:
                cursor.execute("DELETE FROM avarias")
                logger.info("Tabela avarias limpa para remigração completa")
        
        # Verificar se a tabela original existe
        cursor.execute("""SELECT name FROM sqlite_master 
                         WHERE type='table' AND name='avarias'""")
        
        if cursor.fetchone():
            # Migrar TODAS as avarias da tabela original
            logger.info("Migrando TODAS as avarias da tabela original...")
            cursor.execute("""
            INSERT OR REPLACE INTO avarias (codigo, nome, ativo, data_criacao, criado_por)
            SELECT codigo, nome, 1, ?, 'sistema'
            FROM avarias 
            ORDER BY CAST(codigo AS INTEGER)
            """, (data_agora,))
            
            # Verificar quantas foram migradas
            cursor.execute("SELECT COUNT(*) FROM avarias WHERE ativo = 1")
            total_avarias = cursor.fetchone()[0]
            logger.info(f"✅ {total_avarias} avarias migradas com sucesso")
        else:
            logger.warning("⚠️ Tabela 'avarias' original não encontrada!")
        
        # ========================================
        # CONFIRMAÇÃO FINAL
        # ========================================
        
        cursor.execute("SELECT COUNT(*) FROM estruturas WHERE ativo = 1")
        result = cursor.fetchone()
        final_estruturas = result[0] if result else 0
        
        cursor.execute("SELECT COUNT(*) FROM avarias WHERE ativo = 1")
        result = cursor.fetchone()
        final_avarias = result[0] if result else 0
        
        logger.info(f"""
        🎯 MIGRAÇÃO COMPLETA REALIZADA:
        ✅ {final_estruturas} estruturas (esperado: 64)
        ✅ {final_avarias} avarias (esperado: 46)
        📊 Total: {final_estruturas + final_avarias} registros migrados
        """)
        
        # Verificar se os números estão corretos
        if final_estruturas != 64:
            logger.warning(f"⚠️ Esperado 64 estruturas, migrado {final_estruturas}")
        if final_avarias != 46:
            logger.warning(f"⚠️ Esperado 46 avarias, migrado {final_avarias}")
            
    except Exception as e:
        logger.error(f"❌ Erro na migração completa: {e}")
        raise

#----------------------------------------------
# Rotas para o Dashboard Administrativo
#----------------------------------------------

@admin_bp.route('/')
@admin_required
def admin_dashboard():
    """Rota para o dashboard administrativo"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Estatísticas básicas
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        total_usuarios = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'admin'")
        total_admins = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'user'")
        total_users = cursor.fetchone()[0]
        
        # Logs recentes
        cursor.execute("""
            SELECT * FROM log_atividades
            ORDER BY data_hora DESC
            LIMIT 10
        """)
        logs_recentes = cursor.fetchall()
        
        # Solicitações de registro pendentes
        cursor.execute("""
            SELECT * FROM solicitacoes_registro 
            WHERE status = 'pendente'
            ORDER BY data_solicitacao DESC
        """)
        solicitacoes_pendentes = cursor.fetchall()
        
        # Solicitações de senha pendentes
        cursor.execute("""
            SELECT s.*, u.username, u.email 
            FROM solicitacoes_senha s
            JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.status = 'pendente'
            ORDER BY s.data_solicitacao DESC
        """)
        senha_pendentes = cursor.fetchall()
        
        return render_template('admin/dashboard.html',
                              total_usuarios=total_usuarios,
                              total_admins=total_admins,
                              total_users=total_users,
                              logs_recentes=logs_recentes,
                              solicitacoes_pendentes=solicitacoes_pendentes,
                              senha_pendentes=senha_pendentes,
                              username=session.get('username'),
                              role=session.get('role'))

    except Exception as e:
        logger.error(f"Erro ao carregar dashboard administrativo: {e}")
        flash(f"Erro ao carregar dashboard: {e}", "danger")
        return redirect(url_for('auth.login'))

#----------------------------------------------
# Rotas para Gerenciamento de Usuários e Solicitações
#----------------------------------------------

@admin_bp.route('/usuarios')
@admin_completo_required
def listar_usuarios():
    """Rota para listar todos os usuários"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute("""
            SELECT id, username, email, nivel, last_login, created_at
            FROM usuarios
            ORDER BY username
        """)
        usuarios = cursor.fetchall()
        
        return render_template('admin/usuarios.html', 
                              usuarios=usuarios,
                              username=session.get('username'),
                              role=session.get('role'))

    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}")
        flash(f"Erro ao listar usuários: {e}", "danger")
        return redirect(url_for('admin.admin_dashboard'))

@admin_bp.route('/usuarios/novo', methods=['GET', 'POST'])
@admin_completo_required
def novo_usuario():
    """Rota para criar um novo usuário"""
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        nivel = request.form.get('role')  # Form usa 'role', mas salvamos como 'nivel'
        unidade = request.form.get('unidade', 'Rio de Janeiro')  # Valor padrão (unidades válidas: Rio de Janeiro, Floriano, Suzano)
        
        # Validação básica
        if not username or not email or not password or not nivel:
            flash("Todos os campos são obrigatórios", "danger")
            return render_template('admin/novo_usuario.html')
        
        # Validar força da senha
        is_strong, messages = is_strong_password(password)
        if not is_strong:
            for msg in messages:
                flash(msg, "danger")
            return render_template('admin/novo_usuario.html')
        
        try:
            db = get_db()
            cursor = db.cursor()
            
            # Verificar se o username já existe
            cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
            if cursor.fetchone():
                flash("Nome de usuário já existe", "danger")
                return render_template('admin/novo_usuario.html')
            
            # Gerar hash da senha
            password_hash = generate_password_hash(password)
            
            # Inserir novo usuário
            cursor.execute("""
                INSERT INTO usuarios (username, email, password_hash, nivel, unidade, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (username, email, password_hash, nivel, unidade, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            
            # Registrar a ação nos logs administrativos
            log_admin_action(
                session.get('username'),
                "CRIAÇÃO DE USUÁRIO",
                f"Novo usuário criado: {username} (Função: {nivel})"
            )
            
            flash(f"Usuário {username} criado com sucesso", "success")
            return redirect(url_for('admin.listar_usuarios'))
        
        except Exception as e:
            logger.error(f"Erro ao criar usuário: {e}")
            flash(f"Erro ao criar usuário: {e}", "danger")
            return render_template('admin/novo_usuario.html')
    
    # Método GET
    return render_template('admin/novo_usuario.html')

@admin_bp.route('/usuarios/<int:usuario_id>/editar', methods=['GET', 'POST'])
@admin_completo_required
def editar_usuario(usuario_id):
    """Rota para editar um usuário existente"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Obter dados do usuário
        cursor.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,))
        usuario = cursor.fetchone()
        
        if not usuario:
            flash("Usuário não encontrado", "danger")
            return redirect(url_for('admin.listar_usuarios'))
        
        if request.method == 'POST':
            email = request.form.get('email')
            nivel = request.form.get('role')  # Form usa 'role', mas salvamos como 'nivel'
            unidade = request.form.get('unidade', 'Rio de Janeiro')  # Valor padrão (unidades válidas: Rio de Janeiro, Floriano, Suzano)
            password = request.form.get('password')
            
            # Verificação básica
            if not email or not nivel:
                flash("Campos email e nível são obrigatórios", "danger")
                return render_template('admin/editar_usuario.html', usuario=usuario)
            
            # Validar força da senha se estiver sendo alterada
            if password and password.strip():
                is_strong, messages = is_strong_password(password)
                if not is_strong:
                    for msg in messages:
                        flash(msg, "danger")
                    return render_template('admin/editar_usuario.html', usuario=usuario)
                
                # Gerar hash da nova senha
                password_hash = generate_password_hash(password)
                
                cursor.execute("""
                    UPDATE usuarios
                    SET email = ?, nivel = ?, unidade = ?, password_hash = ?
                    WHERE id = ?
                """, (email, nivel, unidade, password_hash, usuario_id))
            else:
                cursor.execute("""
                    UPDATE usuarios
                    SET email = ?, nivel = ?, unidade = ?
                    WHERE id = ?
                """, (email, nivel, unidade, usuario_id))
            
            # Registrar a ação nos logs administrativos
            log_admin_action(
                session.get('username'),
                "EDIÇÃO DE USUÁRIO",
                f"Usuário editado: {usuario['username']} (ID: {usuario_id})"
            )
            
            flash("Usuário atualizado com sucesso", "success")
            return redirect(url_for('admin.listar_usuarios'))
        
        # Método GET
        return render_template('admin/editar_usuario.html', usuario=usuario)

    except Exception as e:
        logger.error(f"Erro ao editar usuário: {e}")
        flash(f"Erro ao editar usuário: {e}", "danger")
        return redirect(url_for('admin.listar_usuarios'))

@admin_bp.route('/usuarios/<int:usuario_id>/excluir', methods=['POST'])
@admin_completo_required
def excluir_usuario(usuario_id):
    """Rota para excluir um usuário"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se o usuário existe
        cursor.execute("SELECT username FROM usuarios WHERE id = ?", (usuario_id,))
        usuario = cursor.fetchone()
        
        if not usuario:
            flash("Usuário não encontrado", "danger")
            return redirect(url_for('admin.listar_usuarios'))
        
        # Impedir a exclusão do próprio usuário
        if usuario['username'] == session.get('username'):
            flash("Você não pode excluir seu próprio usuário", "danger")
            return redirect(url_for('admin.listar_usuarios'))
        
        # Excluir o usuário
        cursor.execute("DELETE FROM usuarios WHERE id = ?", (usuario_id,))
        
        # Registrar a ação nos logs administrativos
        log_admin_action(
            session.get('username'),
            "EXCLUSÃO DE USUÁRIO",
            f"Usuário excluído: {usuario['username']} (ID: {usuario_id})"
        )
        
        flash("Usuário excluído com sucesso", "success")
        return redirect(url_for('admin.listar_usuarios'))

    except Exception as e:
        logger.error(f"Erro ao excluir usuário: {e}")
        flash(f"Erro ao excluir usuário: {e}", "danger")
        return redirect(url_for('admin.listar_usuarios'))

@admin_bp.route('/solicitacoes')
@admin_completo_required
def listar_solicitacoes():
    """Rota para listar todas as solicitações de registro pendentes"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Buscar todas as solicitações pendentes
        cursor.execute("""
            SELECT * FROM solicitacoes_registro 
            WHERE status = 'pendente'
            ORDER BY data_solicitacao DESC
        """)
        solicitacoes = cursor.fetchall()
        
        return render_template('admin/solicitacoes.html', 
                              solicitacoes=solicitacoes,
                              username=session.get('username'))

    except Exception as e:
        logger.error(f"Erro ao listar solicitações: {e}")
        flash(f"Erro ao carregar solicitações: {e}", "danger")
        return redirect(url_for('admin.admin_dashboard'))

@admin_bp.route('/solicitacoes/<int:solicitacao_id>/aprovar', methods=['POST'])
@admin_completo_required
def aprovar_solicitacao(solicitacao_id):
    """Rota para aprovar uma solicitação de registro e criar o usuário"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Buscar a solicitação pelo ID
        cursor.execute("SELECT * FROM solicitacoes_registro WHERE id = ?", (solicitacao_id,))
        solicitacao = cursor.fetchone()
        
        if not solicitacao:
            flash("Solicitação não encontrada", "danger")
            return redirect(url_for('admin.listar_solicitacoes'))
        
        # Verificar se a solicitação já foi processada
        if solicitacao['status'] != 'pendente':
            flash(f"Esta solicitação já foi {solicitacao['status']}", "warning")
            return redirect(url_for('admin.listar_solicitacoes'))
        
        # Dados do formulário
        nivel = request.form.get('nivel', 'operador')  # Nível padrão
        senha_gerada = request.form.get('senha_gerada')
        
        # Validar senha
        if not senha_gerada or len(senha_gerada) < 8:
            flash("A senha gerada precisa ter no mínimo 8 caracteres", "danger")
            return redirect(url_for('admin.listar_solicitacoes'))
            
        # Gerar hash da senha
        password_hash = generate_password_hash(senha_gerada)
        
        # Inserir o novo usuário
        cursor.execute("""
            INSERT INTO usuarios (username, email, nome, nivel, unidade, setor, password_hash, data_criacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            solicitacao['username'],
            solicitacao['email'],
            solicitacao['nome'],
            nivel,
            solicitacao['unidade'],
            solicitacao['setor'],
            password_hash,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        # Atualizar o status da solicitação
        cursor.execute("""
            UPDATE solicitacoes_registro 
            SET status = 'aprovada', 
                data_processamento = ?,
                processado_por = ?
            WHERE id = ?
        """, (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            session.get('username'),
            solicitacao_id
        ))
        
        # Registrar a ação
        log_admin_action(
            session.get('username'),
            "APROVAÇÃO DE REGISTRO",
            f"Solicitação de {solicitacao['username']} aprovada e usuário criado"
        )
        
        flash(f"Solicitação aprovada e usuário {solicitacao['username']} criado com sucesso!", "success")
        return redirect(url_for('admin.listar_solicitacoes'))

    except Exception as e:
        logger.error(f"Erro ao aprovar solicitação: {e}")
        flash(f"Erro ao processar solicitação: {e}", "danger")
        return redirect(url_for('admin.listar_solicitacoes'))

@admin_bp.route('/solicitacoes/<int:solicitacao_id>/rejeitar', methods=['POST'])
@admin_completo_required
def rejeitar_solicitacao(solicitacao_id):
    """Rota para rejeitar uma solicitação de registro"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Buscar a solicitação pelo ID
        cursor.execute("SELECT * FROM solicitacoes_registro WHERE id = ?", (solicitacao_id,))
        solicitacao = cursor.fetchone()
        
        if not solicitacao:
            flash("Solicitação não encontrada", "danger")
            return redirect(url_for('admin.listar_solicitacoes'))
        
        # Verificar se a solicitação já foi processada
        if solicitacao['status'] != 'pendente':
            flash(f"Esta solicitação já foi {solicitacao['status']}", "warning")
            return redirect(url_for('admin.listar_solicitacoes'))
        
        # Motivo da rejeição
        motivo = request.form.get('motivo', 'Não aprovado pela administração')
        
        # Atualizar o status da solicitação
        cursor.execute("""
            UPDATE solicitacoes_registro 
            SET status = 'rejeitada', 
                data_processamento = ?,
                processado_por = ?,
                observacoes = ?
            WHERE id = ?
        """, (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            session.get('username'),
            motivo,
            solicitacao_id
        ))
        
        # Registrar a ação
        log_admin_action(
            session.get('username'),
            "REJEIÇÃO DE REGISTRO",
            f"Solicitação de {solicitacao['username']} rejeitada. Motivo: {motivo}"
        )
        
        flash("Solicitação rejeitada com sucesso", "success")
        return redirect(url_for('admin.listar_solicitacoes'))

    except Exception as e:
        logger.error(f"Erro ao rejeitar solicitação: {e}")
        flash(f"Erro ao processar solicitação: {e}", "danger")
        return redirect(url_for('admin.listar_solicitacoes'))

#----------------------------------------------
# Rotas para Gerenciamento de Estruturas e Avarias
#----------------------------------------------

@admin_bp.route('/estruturas-avarias')
@admin_completo_required
def gerenciar_estruturas_avarias():
    """Rota para gerenciar estruturas e avarias de containers"""
    try:
        # Executar migração completa se necessário
        inicializar_tabelas_estruturas_avarias()
        
        db = get_db()
        cursor = db.cursor()
        
        # Buscar TODAS as estruturas (64 registros)
        cursor.execute("""
        SELECT * FROM estruturas 
        WHERE ativo = 1 
        ORDER BY CAST(codigo AS INTEGER)
        """)
        estruturas = cursor.fetchall()
        
        # Buscar TODAS as avarias (46 registros)  
        cursor.execute("""
        SELECT * FROM avarias 
        WHERE ativo = 1 
        ORDER BY CAST(codigo AS INTEGER)
        """)
        avarias = cursor.fetchall()
        
        # Log para confirmação
        logger.info(f"""
        📊 DADOS CARREGADOS:
        ✅ {len(estruturas)} estruturas 
        ✅ {len(avarias)} avarias
        📋 Total: {len(estruturas) + len(avarias)} registros
        """)
        
        # Registrar a ação
        log_admin_action(
            session.get('username'),
            "ACESSO CONFIGURAÇÕES",
            f"Acessou gerenciamento: {len(estruturas)} estruturas, {len(avarias)} avarias"
        )
        
        return render_template(
            'admin/estruturas_avarias.html',
            estruturas=estruturas,
            avarias=avarias
        )
        
    except Exception as e:
        logger.error(f"❌ Erro ao carregar estruturas/avarias completas: {e}")
        flash(f"Erro ao carregar dados: {e}", "danger")
        return redirect(url_for('admin.admin_dashboard'))

@admin_bp.route('/estruturas/adicionar', methods=['POST'])
@admin_completo_required
def adicionar_estrutura():
    """Rota para adicionar uma nova estrutura"""
    try:
        logger.info("Iniciando processo de adição de estrutura")
        
        # Obter dados do JSON
        data = request.get_json()
        if not data or 'nome' not in data:
            logger.error("Dados inválidos recebidos")
            return jsonify({'success': False, 'error': 'Dados inválidos'}), 400
            
        nome = data['nome'].strip().upper()
        if not nome:
            logger.error("Nome vazio")
            return jsonify({'success': False, 'error': 'Nome não pode ser vazio'}), 400

        logger.info(f"Tentando adicionar estrutura: {nome}")

        db = get_db()
        cursor = db.cursor()
        
        # Verificar se o nome já existe
        cursor.execute('SELECT * FROM estruturas WHERE nome LIKE ? AND ativo = 1', (f'%{nome}%',))
        if cursor.fetchone():
            logger.warning(f"Estrutura já existe: {nome}")
            return jsonify({'success': False, 'error': 'Esta estrutura já existe'}), 400
            
        # Obter o próximo código
        cursor.execute('SELECT MAX(CAST(codigo AS INTEGER)) FROM estruturas')
        resultado = cursor.fetchone()
        ultimo_codigo = resultado[0] if resultado[0] else 0
        proximo_codigo = str(int(ultimo_codigo) + 1)
        
        # Data e usuário
        data_agora = datetime.now().isoformat()
        usuario = session.get('username', 'sistema')
        
        # Formatar nome com código no padrão "CÓDIGO - NOME"
        nome_formatado = f"{proximo_codigo} - {nome}"
        
        logger.info(f"Inserindo estrutura: {nome_formatado}")
        
        cursor.execute('''
            INSERT INTO estruturas (codigo, nome, ativo, data_criacao, criado_por)
            VALUES (?, ?, 1, ?, ?)
        ''', (proximo_codigo, nome_formatado, data_agora, usuario))
        
        # Banco está em autocommit mode, não precisa de commit manual
        
        # Registrar a ação
        log_admin_action(
            usuario,
            "ADICIONAR ESTRUTURA",
            f"Estrutura adicionada: {nome_formatado}"
        )
        
        logger.info(f"Estrutura adicionada com sucesso: {nome_formatado}")
        
        return jsonify({
            'success': True, 
            'message': 'Estrutura adicionada com sucesso',
            'estrutura': {
                'codigo': proximo_codigo,
                'nome': nome_formatado
            }
        })
    
    except Exception as e:
        logger.error(f"Erro ao adicionar estrutura: {str(e)}")
        return jsonify({'success': False, 'error': f'Erro interno: {str(e)}'}), 500

@admin_bp.route('/avarias/adicionar', methods=['POST'])
@admin_completo_required
def adicionar_avaria():
    """Rota para adicionar uma nova avaria"""
    try:
        logger.info("Iniciando processo de adição de avaria")
        
        # Obter dados do JSON
        data = request.get_json()
        if not data or 'nome' not in data:
            logger.error("Dados inválidos recebidos")
            return jsonify({'success': False, 'error': 'Dados inválidos'}), 400
            
        nome = data['nome'].strip().upper()
        if not nome:
            logger.error("Nome vazio")
            return jsonify({'success': False, 'error': 'Nome não pode ser vazio'}), 400

        logger.info(f"Tentando adicionar avaria: {nome}")

        db = get_db()
        cursor = db.cursor()
        
        # Verificar se o nome já existe
        cursor.execute('SELECT * FROM avarias WHERE nome LIKE ? AND ativo = 1', (f'%{nome}%',))
        if cursor.fetchone():
            logger.warning(f"Avaria já existe: {nome}")
            return jsonify({'success': False, 'error': 'Esta avaria já existe'}), 400
            
        # Obter o próximo código
        cursor.execute('SELECT MAX(CAST(codigo AS INTEGER)) FROM avarias')
        resultado = cursor.fetchone()
        ultimo_codigo = resultado[0] if resultado[0] else 0
        proximo_codigo = str(int(ultimo_codigo) + 1)
        
        # Data e usuário
        data_agora = datetime.now().isoformat()
        usuario = session.get('username', 'sistema')
        
        # Formatar nome com código no padrão "CÓDIGO - NOME"
        nome_formatado = f"{proximo_codigo} - {nome}"
        
        logger.info(f"Inserindo avaria: {nome_formatado}")
        
        cursor.execute('''
            INSERT INTO avarias (codigo, nome, ativo, data_criacao, criado_por)
            VALUES (?, ?, 1, ?, ?)
        ''', (proximo_codigo, nome_formatado, data_agora, usuario))
        
        # Banco está em autocommit mode, não precisa de commit manual
        
        # Registrar a ação
        log_admin_action(
            usuario,
            "ADICIONAR AVARIA",
            f"Avaria adicionada: {nome_formatado}"
        )
        
        logger.info(f"Avaria adicionada com sucesso: {nome_formatado}")
        
        return jsonify({
            'success': True, 
            'message': 'Avaria adicionada com sucesso',
            'avaria': {
                'codigo': proximo_codigo,
                'nome': nome_formatado
            }
        })
    
    except Exception as e:
        logger.error(f"Erro ao adicionar avaria: {str(e)}")
        return jsonify({'success': False, 'error': f'Erro interno: {str(e)}'}), 500

#----------------------------------------------
# Rotas para Verificação e Migração de Dados
#----------------------------------------------

@admin_bp.route('/status-dados')
@admin_completo_required
def status_dados_completo():
    """Verifica se todos os dados foram migrados corretamente"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Verificar dados originais
        try:
            cursor.execute("SELECT COUNT(*) FROM estruturas")
            estruturas_original = cursor.fetchone()[0]
        except:
            estruturas_original = 0
        
        try:
            cursor.execute("SELECT COUNT(*) FROM avarias")
            avarias_original = cursor.fetchone()[0]
        except:
            avarias_original = 0
        
        # Verificar dados migrados
        try:
            cursor.execute("SELECT COUNT(*) FROM estruturas WHERE ativo = 1")
            estruturas = cursor.fetchone()[0]
        except:
            estruturas = 0
            
        try:
            cursor.execute("SELECT COUNT(*) FROM avarias WHERE ativo = 1")
            avarias = cursor.fetchone()[0]
        except:
            avarias = 0
        
        # Status da migração
        migracao_estruturas_ok = estruturas == 64
        migracao_avarias_ok = avarias == 46
        migracao_completa = migracao_estruturas_ok and migracao_avarias_ok
        
        return jsonify({
            'original': {
                'estruturas': estruturas_original,
                'avarias': avarias_original,
                'total': estruturas_original + avarias_original
            },
            'migrado': {
                'estruturas': estruturas,
                'avarias': avarias,
                'total': estruturas + avarias
            },
            'status': {
                'estruturas_ok': migracao_estruturas_ok,
                'avarias_ok': migracao_avarias_ok,
                'migracao_completa': migracao_completa,
                'percentual': round(((estruturas + avarias) / 110) * 100, 1) if (estruturas + avarias) > 0 else 0
            },
            'esperado': {
                'estruturas': 64,
                'avarias': 46,
                'total': 110
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/remigracao-completa', methods=['POST'])
@admin_completo_required
def remigracao_completa():
    """Força uma remigração completa de todos os dados"""
    try:
        logger.info("🔄 Iniciando remigração completa...")
        
        # Executar migração
        inicializar_tabelas_estruturas_avarias()
        
        # Verificar resultado
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM estruturas WHERE ativo = 1")
        total_estruturas = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM avarias WHERE ativo = 1")
        total_avarias = cursor.fetchone()[0]
        
        # Registrar ação
        log_admin_action(
            session.get('username'),
            "REMIGRAÇÃO COMPLETA",
            f"Remigração realizada: {total_estruturas} estruturas, {total_avarias} avarias"
        )
        
        sucesso = total_estruturas == 64 and total_avarias == 46
        
        return jsonify({
            'success': sucesso,
            'message': f'Remigração concluída: {total_estruturas} estruturas, {total_avarias} avarias',
            'estruturas': total_estruturas,
            'avarias': total_avarias,
            'total': total_estruturas + total_avarias,
            'esperado': 110,
            'completa': sucesso
        })
        
    except Exception as e:
        logger.error(f"❌ Erro na remigração: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500