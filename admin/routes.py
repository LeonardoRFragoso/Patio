from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, make_response
from functools import wraps
from datetime import datetime
import sqlite3
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from utils.db import get_db
from utils.security import is_strong_password
from utils.permissions import admin_required, admin_completo_required, admin_administrativo_required, admin_completo_only_required, admin_administrativo_only_required

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('admin_routes')

# Criar o Blueprint para as rotas de administração
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Decorator para verificar se o usuário está autenticado e é administrador

@admin_bp.route('/')
@admin_required
def admin_index():
    """Rota raiz que redireciona para o dashboard apropriado baseado no tipo de admin"""
    user_role = session.get('role')
    if user_role == 'admin':
        return redirect(url_for('admin.admin_dashboard'))
    elif user_role == 'admin_administrativo':
        return redirect(url_for('admin.admin_administrativo_dashboard'))
    else:
        flash('Tipo de usuário não reconhecido', 'danger')
        return redirect(url_for('auth.dashboard'))

@admin_bp.route('/admin-administrativo')
@admin_administrativo_only_required
def admin_administrativo_dashboard():
    """Dashboard específico para Admin Administrativo"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Estatísticas de descargas corrigidas (últimos 30 dias)
        cursor.execute("""
            SELECT COUNT(*) FROM correcoes_descarga 
            WHERE data_correcao >= datetime('now', '-30 days')
        """)
        descargas_corrigidas = cursor.fetchone()[0]
        
        # Total de containers por unidade (converter para dicionário)
        cursor.execute("""
            SELECT unidade, COUNT(*) as total
            FROM containers 
            GROUP BY unidade
            ORDER BY total DESC
        """)
        containers_por_unidade_raw = cursor.fetchall()
        containers_por_unidade = {row[0]: row[1] for row in containers_por_unidade_raw}
        
        # Containers no pátio por unidade (converter para dicionário)
        cursor.execute("""
            SELECT unidade, COUNT(*) as total
            FROM containers 
            WHERE status = 'no patio'
            GROUP BY unidade
            ORDER BY total DESC
        """)
        containers_patio_raw = cursor.fetchall()
        containers_patio_por_unidade = {row[0]: row[1] for row in containers_patio_raw}
        
        # Total geral de containers
        cursor.execute("SELECT COUNT(*) FROM containers")
        total_containers = cursor.fetchone()[0]
        
        # Containers no pátio (total)
        cursor.execute("SELECT COUNT(*) FROM containers WHERE status = 'no patio'")
        containers_no_patio = cursor.fetchone()[0]
        
        # Total de unidades
        cursor.execute("SELECT COUNT(DISTINCT unidade) FROM containers")
        total_unidades = cursor.fetchone()[0]
        
        return render_template('admin/admin_administrativo_dashboard.html', 
                             descargas_corrigidas=descargas_corrigidas,
                             containers_por_unidade=containers_por_unidade,
                             containers_patio_por_unidade=containers_patio_por_unidade,
                             total_containers=total_containers,
                             containers_no_patio=containers_no_patio,
                             total_unidades=total_unidades)
    except Exception as e:
        logger.error(f"Erro ao carregar dashboard admin administrativo: {str(e)}")
        flash('Erro ao carregar dashboard', 'danger')
        return redirect(url_for('auth.dashboard'))

@admin_bp.route('/historico-containers')
@admin_administrativo_only_required
def historico_containers():
    """Página de histórico completo de containers com filtros"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Buscar todas as unidades disponíveis para o filtro
        cursor.execute("SELECT DISTINCT unidade FROM containers ORDER BY unidade")
        unidades = [row[0] for row in cursor.fetchall()]
        
        return render_template('admin/historico_containers.html', unidades=unidades)
    except Exception as e:
        logger.error(f"Erro ao carregar página de histórico: {str(e)}")
        flash('Erro ao carregar página de histórico', 'danger')
        return redirect(url_for('admin.admin_administrativo_dashboard'))

@admin_bp.route('/api/historico-containers')
@admin_administrativo_only_required
def api_historico_containers():
    """API para buscar containers com filtros - TODAS AS UNIDADES para Admin Administrativo"""
    try:
        # Parâmetros de filtro
        unidade = request.args.get('unidade', '')
        numero = request.args.get('numero', '')
        status = request.args.get('status', '')
        data_inicio = request.args.get('data_inicio', '')
        data_fim = request.args.get('data_fim', '')
        itens_por_pagina = int(request.args.get('itens_por_pagina', 50))
        pagina = int(request.args.get('pagina', 1))
        
        db = get_db()
        cursor = db.cursor()
        
        # Construir query base - Admin Administrativo vê TODAS as unidades
        where_clauses = []
        params = []
        
        # Não filtrar por unidade do usuário - Admin Administrativo vê todas
        if unidade:
            where_clauses.append("c.unidade = ?")
            params.append(unidade)
            
        if numero:
            where_clauses.append("c.numero LIKE ?")
            params.append(f"%{numero}%")
            
        if status:
            where_clauses.append("c.status = ?")
            params.append(status)
            
        if data_inicio:
            where_clauses.append("c.data_criacao >= ?")
            params.append(data_inicio)
            
        if data_fim:
            where_clauses.append("c.data_criacao <= ?")
            params.append(data_fim + ' 23:59:59')
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Contar total de registros
        count_query = f"SELECT COUNT(*) FROM containers c WHERE {where_sql}"
        cursor.execute(count_query, params)
        total_registros = cursor.fetchone()[0]
        
        # Buscar containers com paginação - query corrigida para evitar duplicação
        offset = (pagina - 1) * itens_por_pagina
        query = f"""
            SELECT c.id, c.numero, c.unidade, c.status, c.posicao_atual, c.tamanho, 
                   c.armador, c.data_criacao, c.ultima_atualizacao, c.tipo_container,
                   c.capacidade, c.tara, c.booking,
                   (
                       SELECT u.nome 
                       FROM usuarios u 
                       WHERE u.unidade = c.unidade 
                       LIMIT 1
                   ) as nome_unidade
            FROM containers c
            WHERE {where_sql}
            ORDER BY c.data_criacao DESC, c.numero ASC
            LIMIT ? OFFSET ?
        """
        
        cursor.execute(query, params + [itens_por_pagina, offset])
        containers = cursor.fetchall()
        
        # Formatar resultados com colunas corretas
        resultados = []
        for container in containers:
            resultados.append({
                'id': container[0],
                'numero': container[1],
                'unidade': container[2],
                'status': container[3],
                'posicao_atual': container[4] or '-',
                'tamanho': container[5] or '-',
                'armador': container[6] or '-',
                'data_criacao': container[7],
                'ultima_atualizacao': container[8],
                'tipo_container': container[9] or '-',
                'capacidade': container[10] or '-',
                'tara': container[11] or '-',
                'booking': container[12] or '-',
                'nome_unidade': container[13] or container[2]
            })
        
        logger.info(f"Admin Administrativo buscou histórico: {total_registros} containers encontrados")
        
        return jsonify({
            'success': True,
            'containers': resultados,
            'total_registros': total_registros,
            'pagina_atual': pagina,
            'itens_por_pagina': itens_por_pagina,
            'total_paginas': (total_registros + itens_por_pagina - 1) // itens_por_pagina
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico de containers: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/api/download-relatorio-containers')
@admin_administrativo_only_required
def download_relatorio_containers():
    """Download de relatório de containers em CSV, Excel ou PDF"""
    try:
        from io import StringIO, BytesIO
        from datetime import datetime
        import pandas as pd

        formato = request.args.get('formato', 'csv').lower()

        # Parâmetros de filtro (mesmos da API de busca)
        unidade = request.args.get('unidade', '')
        numero = request.args.get('numero', '')
        status = request.args.get('status', '')
        data_inicio = request.args.get('data_inicio', '')
        data_fim = request.args.get('data_fim', '')

        db = get_db()
        cursor = db.cursor()

        # Construir query - Admin Administrativo vê TODAS as unidades
        where_clauses = []
        params = []

        if unidade:
            where_clauses.append("c.unidade = ?")
            params.append(unidade)

        if numero:
            where_clauses.append("c.numero LIKE ?")
            params.append(f"%{numero}%")

        if status:
            where_clauses.append("c.status = ?")
            params.append(status)

        if data_inicio:
            where_clauses.append("c.data_criacao >= ?")
            params.append(data_inicio)

        if data_fim:
            where_clauses.append("c.data_criacao <= ?")
            params.append(data_fim + ' 23:59:59')

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        query = f"""
            SELECT c.numero, c.unidade, c.status, c.posicao_atual, c.tamanho,
                   c.armador, c.data_criacao, c.ultima_operacao, c.data_ultima_operacao,
                   c.tipo, c.lacre, c.peso_bruto, c.tara, c.payload
            FROM containers c
            WHERE {where_sql}
            ORDER BY c.data_criacao DESC, c.numero ASC
        """

        cursor.execute(query, params)
        containers = cursor.fetchall()

        columns = [
            'Número', 'Unidade', 'Status', 'Posição Atual', 'Tamanho',
            'Armador', 'Data Criação', 'Última Operação', 'Data Última Operação',
            'Tipo', 'Lacre', 'Peso Bruto', 'Tara', 'Payload'
        ]
        rows = []
        for c in containers:
            rows.append([
                c[0] or '', c[1] or '', c[2] or '', c[3] or '', c[4] or '',
                c[5] or '', c[6] or '', c[7] or '', c[8] or '', c[9] or '',
                c[10] or '', c[11] or 0, c[12] or 0, c[13] or 0
            ])

        df = pd.DataFrame(rows, columns=columns)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        if formato == 'xlsx':
            output = BytesIO()
            df.to_excel(output, index=False)
            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = f'relatorio_containers_{timestamp}.xlsx'
        elif formato == 'pdf':
            output = BytesIO()
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
            from reportlab.lib import colors

            doc = SimpleDocTemplate(output, pagesize=letter)
            data = [columns] + df.fillna('').values.tolist()
            table = Table(data, repeatRows=1)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.25, colors.grey)
            ]))
            doc.build([table])
            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'application/pdf'
            filename = f'relatorio_containers_{timestamp}.pdf'
        else:
            output = StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv; charset=utf-8'
            filename = f'relatorio_containers_{timestamp}.csv'

        response.headers['Content-Disposition'] = f'attachment; filename={filename}'

        logger.info(
            f"Admin Administrativo baixou relatório: {len(containers)} containers (formato {formato})"
        )

        return response

    except Exception as e:
        logger.error(f"Erro ao gerar relatório de containers: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro ao gerar relatório'
        }), 500

@admin_bp.route('/api/unidades')
@admin_administrativo_only_required
def api_unidades():
    """API para obter lista de unidades disponíveis"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Buscar todas as unidades disponíveis
        cursor.execute("SELECT DISTINCT unidade FROM containers WHERE unidade IS NOT NULL ORDER BY unidade")
        unidades = [row[0] for row in cursor.fetchall()]
        
        # Buscar também status disponíveis
        cursor.execute("SELECT DISTINCT status FROM containers WHERE status IS NOT NULL ORDER BY status")
        status_list = [row[0] for row in cursor.fetchall()]
        
        # Buscar tamanhos disponíveis
        cursor.execute("SELECT DISTINCT tamanho FROM containers WHERE tamanho IS NOT NULL ORDER BY tamanho")
        tamanhos = [row[0] for row in cursor.fetchall()]
        
        # Buscar armadores disponíveis
        cursor.execute("SELECT DISTINCT armador FROM containers WHERE armador IS NOT NULL ORDER BY armador")
        armadores = [row[0] for row in cursor.fetchall()]
        
        logger.info(f"Admin Administrativo carregou filtros: {len(unidades)} unidades, {len(status_list)} status")
        
        return jsonify({
            'success': True,
            'unidades': unidades,
            'status': status_list,
            'tamanhos': tamanhos,
            'armadores': armadores
        })
        
    except Exception as e:
        logger.error(f"Erro ao carregar unidades: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/api/container-historico/<string:container_numero>')
@admin_administrativo_only_required
def api_container_historico(container_numero):
    """API para obter TODO o histórico do container: dados principais, todas as vistorias, operações e correções de descarga."""
    try:
        db = get_db()
        cursor = db.cursor()

        # Buscar dados principais do container
        cursor.execute("SELECT * FROM containers WHERE numero = ?", (container_numero,))
        container = cursor.fetchone()
        if not container:
            return jsonify({'success': False, 'error': 'Container não encontrado'}), 404
        container_dict = dict(zip([col[0] for col in cursor.description], container))
        container_id = container_dict['id']

        # Buscar todas as vistorias
        cursor.execute("SELECT * FROM vistorias WHERE container_numero = ? ORDER BY data_vistoria ASC", (container_numero,))
        vistorias = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Buscar todas as operações
        cursor.execute("SELECT * FROM operacoes WHERE container_id = ? ORDER BY data_operacao ASC", (container_id,))
        operacoes = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Buscar todas as correções de descarga
        cursor.execute("SELECT * FROM correcoes_descarga WHERE container_id = ? ORDER BY data_correcao ASC", (container_id,))
        correcoes = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        return jsonify({
            'success': True,
            'container': container_dict,
            'vistorias': vistorias,
            'operacoes': operacoes,
            'correcoes_descarga': correcoes
        })
    except Exception as e:
        logger.error(f"Erro ao buscar histórico completo do container: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/container-detalhes/<int:container_id>')
@admin_administrativo_only_required
def api_container_detalhes(container_id):
    """API para obter detalhes completos do container por ID"""
    try:
        db = get_db()
        cursor = db.cursor()

        # Buscar dados principais do container por ID
        cursor.execute("SELECT * FROM containers WHERE id = ?", (container_id,))
        container = cursor.fetchone()
        if not container:
            return jsonify({'success': False, 'error': 'Container não encontrado'}), 404
        
        container_dict = dict(zip([col[0] for col in cursor.description], container))
        container_numero = container_dict['numero']

        # Buscar todas as vistorias
        cursor.execute("SELECT * FROM vistorias WHERE container_numero = ? ORDER BY data_vistoria DESC", (container_numero,))
        vistorias = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Buscar todas as operações
        cursor.execute("SELECT * FROM operacoes WHERE container_id = ? ORDER BY data_operacao DESC", (container_id,))
        operacoes = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        # Buscar todas as correções de descarga
        cursor.execute("SELECT * FROM correcoes_descarga WHERE container_id = ? ORDER BY data_correcao DESC", (container_id,))
        correcoes = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]

        logger.info(f"Admin Administrativo acessou detalhes do container ID {container_id} ({container_numero})")

        return jsonify({
            'success': True,
            'container': container_dict,
            'vistorias': vistorias,
            'operacoes': operacoes,
            'correcoes': correcoes
        })
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do container ID {container_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/corrigir-descarga')
@admin_required  # Ambos os tipos de admin podem acessar
def pagina_corrigir_descarga():
    """Dashboard admin – página para correção de descarga"""
    try:
        # Solicitações pendentes para badge do sidebar (mantém consistência)
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM solicitacoes_registro WHERE status = 'pendente'")
        solicitacoes_pendentes = cursor.fetchall()

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

@admin_bp.route('/dashboard')
@admin_completo_only_required
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
@admin_completo_only_required
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
@admin_completo_only_required
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
            password_hash = generate_password_hash(password, method='pbkdf2:sha256')
            
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
@admin_completo_only_required
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
                password_hash = generate_password_hash(password, method='pbkdf2:sha256')
                
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
@admin_completo_only_required
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
@admin_completo_only_required
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
@admin_completo_only_required
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
        if not senha_gerada or len(senha_gerada.strip()) == 0:
            flash("É necessário informar uma senha inicial", "danger")
            return redirect(url_for('admin.listar_solicitacoes'))
            
        # Gerar hash da senha
        password_hash = generate_password_hash(senha_gerada, method='pbkdf2:sha256')
        
        # Inserir o novo usuário
        cursor.execute("""
            INSERT INTO usuarios (username, email, nome, nivel, unidade, password_hash, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            solicitacao['username'],
            solicitacao['email'],
            solicitacao['nome'],
            nivel,
            solicitacao['unidade'],
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
@admin_completo_only_required
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
@admin_completo_only_required
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
@admin_completo_only_required
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
@admin_completo_only_required
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
@admin_completo_only_required
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
@admin_completo_only_required
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

@admin_bp.route('/relatorios')
@admin_administrativo_only_required
def relatorios():
    """Relatórios de inventário para admin administrativo"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Contagem de containers por status
        cursor.execute("""
            SELECT status, COUNT(*) as total
            FROM containers
            GROUP BY status
        """)
        status_counts = cursor.fetchall()
        
        # Contagem de operações por tipo
        cursor.execute("""
            SELECT tipo, COUNT(*) as total
            FROM operacoes
            WHERE DATE(data_operacao) >= DATE('now', '-30 days')
            GROUP BY tipo
        """)
        operacoes_counts = cursor.fetchall()
        
        # Ocupação por unidade
        cursor.execute("""
            SELECT unidade, COUNT(*) as total
            FROM containers
            WHERE posicao_atual IS NOT NULL AND posicao_atual != ''
            GROUP BY unidade
        """)
        ocupacao_unidades = cursor.fetchall()
        
        return render_template('admin/relatorios.html',
                             status_counts=status_counts,
                             operacoes_counts=operacoes_counts,
                             ocupacao_unidades=ocupacao_unidades)
        
    except Exception as e:
        flash(f'Erro ao gerar relatórios: {str(e)}', 'danger')
        return redirect(url_for('admin.admin_administrativo_dashboard'))

        return jsonify({'success': False, 'error': str(e)}), 500