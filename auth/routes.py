from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from datetime import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import logging
import sqlite3
from utils.db import get_db_connection
from utils.security import track_login_attempt, is_login_blocked, reset_login_attempts, is_strong_password
from flask import jsonify
from posicoes_suzano import PatioSuzano

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('auth_routes')

# Criar o Blueprint para as rotas de autenticação
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# ========================================
# CONSTANTES E CONFIGURAÇÕES
# ========================================

# Lista de unidades disponíveis no sistema
UNIDADES_DISPONIVEIS = ['Rio de Janeiro', 'Floriano', 'Suzano']
UNIDADE_PADRAO = 'Rio de Janeiro'

# Níveis de usuário
NIVEL_ADMIN = 'admin'
NIVEL_VISTORIADOR = 'vistoriador'
NIVEL_OPERADOR = 'operador'

# ========================================
# FUNÇÕES AUXILIARES
# ========================================

def log_auth_activity(username, acao, detalhes):
    """Função centralizada para registrar atividades de autenticação"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute("""
                INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
                VALUES (?, ?, ?, ?, ?)
            """, (data_hora, username, 'auth', acao, detalhes))
            conn.commit()
    except Exception as e:
        logger.error(f"Erro ao registrar log de autenticação: {e}")

def validar_campos_obrigatorios(campos, nomes_campos=None):
    """Valida se todos os campos obrigatórios foram preenchidos"""
    if nomes_campos is None:
        nomes_campos = ['campo'] * len(campos)
    
    campos_vazios = []
    for i, campo in enumerate(campos):
        if not campo or not campo.strip():
            campos_vazios.append(nomes_campos[i])
    
    return len(campos_vazios) == 0, campos_vazios

def verificar_usuario_existe(username=None, email=None):
    """Verifica se usuário ou email já existem no banco"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            if username:
                cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
                if cursor.fetchone():
                    return True, "Nome de usuário já existe"
            
            if email:
                cursor.execute("SELECT id FROM usuarios WHERE email = ?", (email,))
                if cursor.fetchone():
                    return True, "E-mail já está em uso"
            
            return False, None
    except Exception as e:
        logger.error(f"Erro ao verificar existência de usuário: {e}")
        return True, "Erro interno do servidor"

def obter_usuario_completo(user_id):
    """Obtém informações completas do usuário pelo ID"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM usuarios WHERE id = ?", (user_id,))
            return cursor.fetchone()
    except Exception as e:
        logger.error(f"Erro ao obter dados do usuário {user_id}: {e}")
        return None

def verificar_credenciais(username, password):
    """Verifica credenciais de login do usuário"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM usuarios WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            if not user or not check_password_hash(user['password_hash'], password):
                return None, "Usuário ou senha inválidos"
            
            return user, None
    except Exception as e:
        logger.error(f"Erro ao verificar credenciais: {e}")
        return None, "Erro interno do servidor"

def atualizar_ultimo_login(user_id):
    """Atualiza o timestamp do último login do usuário"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE usuarios SET last_login = ? WHERE id = ?
            """, (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), user_id))
            conn.commit()
            return True
    except Exception as e:
        logger.error(f"Erro ao atualizar último login: {e}")
        return False

def configurar_sessao_usuario(user):
    """Configura a sessão do usuário após login bem-sucedido"""
    session['username'] = user['username']
    session['user_id'] = user['id']
    session['role'] = user['nivel']  # Para compatibilidade com código existente
    session['nivel'] = user['nivel']  # Para nova lógica de permissões
    session['unidade'] = user['unidade']
    session['logged_in'] = True  # ✅ CORREÇÃO: Adicionar chave logged_in para @login_required
    # sqlite3.Row não possui método get; acesso direto garantindo chave presente
    session['primeiro_login'] = user['primeiro_login'] if 'primeiro_login' in user.keys() else 0

def obter_solicitacoes_pendentes():
    """Obtém solicitações pendentes para administradores"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Solicitações de registro
            cursor.execute("""
                SELECT * FROM solicitacoes_registro 
                WHERE status = 'pendente'
                ORDER BY data_solicitacao DESC
            """)
            pending_requests = cursor.fetchall()
            
            # Solicitações de senha
            cursor.execute("""
                SELECT s.*, u.username, u.email 
                FROM solicitacoes_senha s
                JOIN usuarios u ON s.usuario_id = u.id
                WHERE s.status = 'pendente'
                ORDER BY s.data_solicitacao DESC
            """)
            pending_password_requests = cursor.fetchall()
            
            return pending_requests, pending_password_requests
    except Exception as e:
        logger.error(f"Erro ao obter solicitações pendentes: {e}")
        return [], []

# ========================================
# DECORATORS
# ========================================

def login_required(f):
    """Decorator para verificar se o usuário está autenticado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash('Você precisa fazer login para acessar esta página', 'danger')
            return redirect(url_for('auth.login'))
        if session.get('primeiro_login') and request.endpoint != 'auth.primeiro_login':
            flash('Você precisa definir uma nova senha antes de continuar', 'warning')
            return redirect(url_for('auth.primeiro_login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator para verificar se o usuário é administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash('Você precisa fazer login para acessar esta página', 'danger')
            return redirect(url_for('auth.login'))
        
        if session.get('role') != NIVEL_ADMIN:
            flash('Acesso negado: privilégios de administrador necessários', 'danger')
            return redirect(url_for('auth.dashboard'))
        
        return f(*args, **kwargs)
    return decorated_function

# ========================================
# ROTAS DE AUTENTICAÇÃO
# ========================================

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Rota para login do usuário"""
    # Se o usuário já está logado, redirecionar para o dashboard
    if 'username' in session:
        return redirect(url_for('auth.dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        role = request.form.get('role', '')
        
        # Validação básica
        campos_validos, campos_vazios = validar_campos_obrigatorios(
            [username, password], 
            ['nome de usuário', 'senha']
        )
        
        if not campos_validos:
            flash('Por favor, preencha todos os campos', 'danger')
            return render_template('auth/login.html')
        
        # Verificar tentativas de força bruta
        allowed, minutes = track_login_attempt(username)
        if not allowed:
            flash(f'Muitas tentativas de login. Tente novamente após {minutes} minutos.', 'danger')
            log_auth_activity(username, 'LOGIN_BLOQUEADO', f"Conta bloqueada por {minutes} minutos devido a múltiplas tentativas")
            return render_template('auth/login.html')
        
        # Verificar credenciais
        user, error_message = verificar_credenciais(username, password)
        
        if not user:
            flash(error_message, 'danger')
            log_auth_activity(username, 'LOGIN_FALHA', "Tentativa de login falhou")
            return render_template('auth/login.html')
        
        # Verificar se o perfil do usuário corresponde à aba selecionada
        user_role = user['nivel']
        if (role == 'user' and user_role != NIVEL_OPERADOR) or \
           (role == 'inspector' and user_role != NIVEL_VISTORIADOR) or \
           (role == 'admin' and user_role != NIVEL_ADMIN and user_role != 'admin_administrativo'):
            flash('Acesso negado: Você deve usar a aba correspondente ao seu perfil de usuário', 'danger')
            log_auth_activity(username, 'LOGIN_FALHA', f"Tentativa de login com perfil incorreto. Aba: {role}, Perfil: {user_role}")
            return render_template('auth/login.html')
        
        # Login bem-sucedido
        try:
            # Resetar contador de tentativas
            reset_login_attempts(username)
            
            # Atualizar último login
            atualizar_ultimo_login(user['id'])
            
            # Configurar sessão
            configurar_sessao_usuario(user)
            
            # Registrar atividade
            log_auth_activity(username, 'LOGIN', "Login realizado com sucesso")

            flash(f'Bem-vindo(a), {username}!', 'success')

            # sqlite3.Row não possui método get
            if user['primeiro_login'] == 1:
                flash('Por favor, defina uma nova senha para continuar.', 'warning')
                return redirect(url_for('auth.primeiro_login'))

            # Redirecionar com base no nível de acesso
            return redirecionar_por_nivel(user['nivel'])
            
        except Exception as e:
            logger.error(f"Erro durante configuração de login: {e}")
            flash('Ocorreu um erro durante o login. Por favor, tente novamente.', 'danger')
    
    # Método GET
    return render_template('auth/login.html')

def redirecionar_por_nivel(nivel):
    """Redireciona usuário baseado no seu nível de acesso"""
    if nivel == NIVEL_ADMIN:
        return redirect(url_for('admin.admin_dashboard'))
    elif nivel == 'admin_administrativo':
        return redirect(url_for('admin.admin_administrativo_dashboard'))
    elif nivel == NIVEL_VISTORIADOR:
        return redirect(url_for('auth.dashboard', tipo='vistoriador'))
    else:
        return redirect(url_for('auth.dashboard'))

@auth_bp.route('/primeiro-login', methods=['GET', 'POST'])
@login_required
def primeiro_login():
    """Força a definição de nova senha no primeiro acesso"""
    if not session.get('primeiro_login'):
        return redirect(url_for('auth.dashboard'))

    if request.method == 'POST':
        nova_senha = request.form.get('nova_senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')

        campos_validos, _ = validar_campos_obrigatorios([nova_senha, confirmar_senha])
        if not campos_validos:
            flash('Por favor, preencha todos os campos', 'danger')
            return render_template('auth/primeiro_login.html')

        if nova_senha != confirmar_senha:
            flash('Nova senha e confirmação não coincidem', 'danger')
            return render_template('auth/primeiro_login.html')

        senha_forte, mensagem = is_strong_password(nova_senha)
        if not senha_forte:
            flash(f'A senha não atende aos requisitos de segurança: {mensagem}', 'danger')
            return render_template('auth/primeiro_login.html')

        try:
            password_hash = generate_password_hash(nova_senha, method='pbkdf2:sha256')
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE usuarios
                    SET password_hash = ?, senha_temporaria = 0, primeiro_login = 0, ultima_alteracao_senha = ?
                    WHERE id = ?
                    """,
                    (password_hash, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), session.get('user_id'))
                )
                conn.commit()

            log_auth_activity(session.get('username'), 'ALTERAR_SENHA', 'Senha definida no primeiro login')
            session['primeiro_login'] = 0
            flash('Senha atualizada com sucesso!', 'success')
            return redirecionar_por_nivel(session.get('nivel'))
        except Exception as e:
            logger.error(f"Erro ao definir nova senha: {e}")
            flash('Erro ao atualizar senha. Tente novamente.', 'danger')

    return render_template('auth/primeiro_login.html')

@auth_bp.route('/logout')
def logout():
    """Rota para logout do usuário"""
    if 'username' in session:
        username = session.get('username')
        log_auth_activity(username, 'LOGOUT', "Logout realizado com sucesso")
        
        # Limpar a sessão
        session.clear()
        flash('Você saiu do sistema com sucesso!', 'success')
    
    return redirect(url_for('auth.login'))

@auth_bp.route('/dashboard')
@auth_bp.route('/dashboard/<tipo>')
@login_required
def dashboard(tipo=None):
    """Rota para o dashboard do usuário"""
    try:
        # Verificar se há um parâmetro de consulta de container
        numero_container = request.args.get('numero_container')
        if numero_container:
            # Redirecionar para a rota de busca de container
            logger.info(f"Redirecionando consulta de container {numero_container} para a rota de busca")
            return redirect(url_for('containers.buscar_container', numero=numero_container))
        
        user = obter_usuario_completo(session.get('user_id'))
        
        if not user:
            flash('Erro ao carregar informações do usuário', 'danger')
            return redirect(url_for('auth.logout'))
        
        # Verificar o nível do usuário
        user_role = user['nivel']
        is_admin = user_role == NIVEL_ADMIN
        is_vistoriador = user_role == NIVEL_VISTORIADOR
        is_operador = user_role == NIVEL_OPERADOR
        
        # Redirecionar para o dashboard do admin se for administrador
        if is_admin and not tipo:
            logger.info(f"Redirecionando usuário admin {user['username']} para dashboard administrativo")
            return redirect(url_for('admin.admin_dashboard'))
        
        # Obter solicitações pendentes apenas para administradores
        pending_requests, pending_password_requests = ([], [])
        if is_admin:
            pending_requests, pending_password_requests = obter_solicitacoes_pendentes()
        
        # Determinar qual template carregar
        template = determinar_template_dashboard(tipo, is_vistoriador)
        
        return render_template(template, 
                            user=user,
                            user_role=user_role,
                            is_admin=is_admin,
                            is_vistoriador=is_vistoriador,
                            is_operador=is_operador,
                            unidade=user['unidade'],
                            pending_requests=pending_requests,
                            pending_password_requests=pending_password_requests)
    
    except Exception as e:
        logger.error(f"Erro ao carregar dashboard: {e}")
        flash(f"Erro ao carregar dashboard: {e}", "danger")
        return redirect(url_for('auth.login'))

def determinar_template_dashboard(tipo, is_vistoriador):
    """Determina qual template de dashboard usar"""
    if tipo == 'vistoriador' or is_vistoriador:
        return 'auth/dashboard_vistoriador.html'
    return 'auth/dashboard.html'

@auth_bp.route('/registro', methods=['GET', 'POST'])
def registro():
    """Rota para solicitar registro de novo usuário"""
    if request.method == 'POST':
        # Obter dados do formulário
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        nome = request.form.get('nome', '').strip()
        setor = request.form.get('setor', '').strip()  # Opcional
        unidade = request.form.get('unidade', UNIDADE_PADRAO)
        justificativa = request.form.get('justificativa', '').strip()
        nivel_solicitado = request.form.get('nivel_solicitado', '').strip()  # Novo campo
        
        # Justificativa é opcional - sem validação obrigatória
        
        # Validação de campos obrigatórios (justificativa é opcional)
        campos_validos, campos_vazios = validar_campos_obrigatorios(
            [username, email, nome, unidade],
            ['nome de usuário', 'email', 'nome completo', 'unidade']
        )
        
        if not campos_validos:
            flash(f'Por favor, preencha todos os campos obrigatórios: {", ".join(campos_vazios)}', 'danger')
            return render_template('auth/registro-moderno.html', unidades=UNIDADES_DISPONIVEIS)
        
        # Verificar se usuário ou email já existem
        existe, mensagem = verificar_usuario_existe(username, email)
        if existe:
            flash(mensagem, 'danger')
            return render_template('auth/registro-moderno.html', unidades=UNIDADES_DISPONIVEIS)
        
        # Processar registro com novo campo
        sucesso = processar_solicitacao_registro(nome, username, email, setor, unidade, justificativa, nivel_solicitado)
        
        if sucesso:
            # Redirecionar para página de confirmação dedicada
            return redirect(url_for('auth.registro_confirmacao'))
        else:
            flash("Erro ao processar solicitação. Tente novamente.", "danger")
            return render_template('auth/registro-moderno.html', unidades=UNIDADES_DISPONIVEIS)
    
    # Método GET
    return render_template('auth/registro-moderno.html', unidades=UNIDADES_DISPONIVEIS)

@auth_bp.route('/registro/confirmacao')
def registro_confirmacao():
    """Página de confirmação após envio de solicitação de registro"""
    return render_template('auth/registro_confirmacao.html')

def processar_solicitacao_registro(nome, username, email, setor, unidade, justificativa, nivel_solicitado=None):
    """Processa solicitação de registro de novo usuário"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO solicitacoes_registro 
                (nome, username, email, setor, unidade, justificativa, nivel_solicitado, data_solicitacao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (nome, username, email, setor, unidade, justificativa, nivel_solicitado,
                  datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            conn.commit()
            return True
    except Exception as e:
        logger.error(f"Erro ao processar solicitação de registro: {e}")
        return False

@auth_bp.route('/esqueci-senha', methods=['GET', 'POST'])
def esqueci_senha():
    """Rota para solicitar recuperação de senha"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        
        # Validação básica
        campos_validos, _ = validar_campos_obrigatorios([username, email])
        if not campos_validos:
            flash('Por favor, informe o nome de usuário e email', 'danger')
            return render_template('auth/esqueci_senha.html')
        
        # Processar solicitação
        sucesso = processar_solicitacao_senha(username, email)
        
        # Por segurança, sempre mostrar a mesma mensagem
        flash("""Solicitação de recuperação de senha enviada com sucesso!
              Um administrador irá processar sua solicitação e você receberá instruções por email.""", "success")
        return redirect(url_for('auth.login'))
    
    # Método GET
    return render_template('auth/esqueci_senha.html')

def processar_solicitacao_senha(username, email):
    """Processa solicitação de recuperação de senha"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verificar se o usuário existe e se o email coincide
            cursor.execute("SELECT id FROM usuarios WHERE username = ? AND email = ?", (username, email))
            user = cursor.fetchone()
            
            if not user:
                # Por segurança, registrar tentativa mas não retornar erro específico
                log_auth_activity(username, 'SOLICITAÇÃO_SENHA_INVÁLIDA', 
                                f"Tentativa de recuperação com dados inválidos: {email}")
                return False
            
            # Registrar solicitação válida
            cursor.execute("""
                INSERT INTO solicitacoes_senha (usuario_id, username, data_solicitacao)
                VALUES (?, ?, ?)
            """, (user['id'], username, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            
            conn.commit()
            
            log_auth_activity(username, 'SOLICITAÇÃO_SENHA', 
                             "Solicitação de recuperação de senha registrada")
            return True
            
    except Exception as e:
        logger.error(f"Erro ao processar solicitação de senha: {e}")
        return False

@auth_bp.route('/alterar-senha', methods=['GET', 'POST'])
@login_required
def alterar_senha():
    """Rota para alterar a senha do usuário logado"""
    if request.method == 'POST':
        senha_atual = request.form.get('senha_atual', '')
        nova_senha = request.form.get('nova_senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')
        
        # Validação básica
        campos_validos, _ = validar_campos_obrigatorios([senha_atual, nova_senha, confirmar_senha])
        if not campos_validos:
            flash('Por favor, preencha todos os campos', 'danger')
            return render_template('auth/alterar_senha.html')
        
        # Verificar se senhas coincidem
        if nova_senha != confirmar_senha:
            flash('Nova senha e confirmação não coincidem', 'danger')
            return render_template('auth/alterar_senha.html')
        
        # Verificar força da senha
        senha_forte, mensagem = is_strong_password(nova_senha)
        if not senha_forte:
            flash(f'A senha não atende aos requisitos de segurança: {mensagem}', 'danger')
            return render_template('auth/alterar_senha.html')
        
        # Processar alteração
        sucesso, mensagem = processar_alteracao_senha(senha_atual, nova_senha)
        
        if sucesso:
            flash('Senha alterada com sucesso!', 'success')
            return redirect(url_for('auth.dashboard'))
        else:
            flash(mensagem, 'danger')
            return render_template('auth/alterar_senha.html')
    
    # Método GET
    return render_template('auth/alterar_senha.html')

def processar_alteracao_senha(senha_atual, nova_senha):
    """Processa alteração de senha do usuário"""
    try:
        user_id = session.get('user_id')
        username = session.get('username')
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verificar senha atual
            cursor.execute("SELECT password_hash FROM usuarios WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            
            if not check_password_hash(user['password_hash'], senha_atual):
                return False, 'Senha atual incorreta'
            
            # Atualizar senha
            password_hash = generate_password_hash(nova_senha, method='pbkdf2:sha256')
            cursor.execute("""
                UPDATE usuarios 
                SET password_hash = ?, ultima_alteracao_senha = ?
                WHERE id = ?
            """, (password_hash, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), user_id))
            
            conn.commit()
            
            log_auth_activity(username, 'ALTERAÇÃO_SENHA', "Senha alterada pelo usuário")
            
            return True, 'Senha alterada com sucesso'
            
    except Exception as e:
        logger.error(f"Erro ao alterar senha: {e}")
        return False, 'Erro interno do servidor'

# ========================================
# ROTAS DE API/AJAX (para evitar 404s)
# ========================================

@auth_bp.route('/check-session')
def check_session():
    """Verifica se a sessão do usuário ainda é válida"""
    try:
        if 'username' not in session:
            return {'valid': False}, 401
        
        # Verificar se o usuário ainda existe no banco
        user = obter_usuario_completo(session.get('user_id'))
        if not user:
            session.clear()
            return {'valid': False}, 401
        
        return {
            'valid': True,
            'username': user['username'],
            'role': user['nivel'],
            'unidade': user['unidade']
        }, 200
        
    except Exception as e:
        logger.error(f"Erro ao verificar sessão: {e}")
        return {'valid': False, 'error': 'Erro interno'}, 500

@auth_bp.route('/user-info')
@login_required
def user_info():
    """Retorna informações básicas do usuário logado"""
    try:
        user = obter_usuario_completo(session.get('user_id'))
        if not user:
            return {'error': 'Usuário não encontrado'}, 404
        
        return {
            'username': user['username'],
            'nome': user['nome'] if 'nome' in user.keys() else '',
            'email': user['email'] if 'email' in user.keys() else '',
            'role': user['nivel'],
            'unidade': user['unidade'],
            'last_login': user['last_login'] if 'last_login' in user.keys() else ''
        }, 200
        
    except Exception as e:
        logger.error(f"Erro ao obter informações do usuário: {e}")
        return {'error': 'Erro interno'}, 500

# ========================================
# ERROR HANDLERS ESPECÍFICOS DO BLUEPRINT
# ========================================

@auth_bp.errorhandler(404)
def not_found_error(error):
    """Handler para erros 404 específicos das rotas de auth"""
    logger.warning(f"Rota não encontrada em auth: {request.url}")
    flash('Página não encontrada', 'warning')
    return redirect(url_for('auth.dashboard'))

@auth_bp.errorhandler(500)
def internal_error(error):
    """Handler para erros 500 específicos das rotas de auth"""
    logger.error(f"Erro interno em auth: {error}")
    flash('Erro interno do servidor. Tente novamente.', 'danger')
    return redirect(url_for('auth.login'))

# ========================================
# FUNÇÕES DE LIMPEZA E MANUTENÇÃO
# ========================================

def limpar_sessoes_expiradas():
    """Remove sessões expiradas do sistema (função utilitária)"""
    # Esta função pode ser chamada periodicamente para limpeza
    try:
        # Implementar lógica de limpeza se necessário
        logger.info("Limpeza de sessões expiradas executada")
        return True
    except Exception as e:
        logger.error(f"Erro na limpeza de sessões: {e}")
        return False