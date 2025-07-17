import sqlite3
import os
from flask import g, current_app
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('db')

def get_db():
    """Função para obter conexão com o banco de dados"""
    if 'db' not in g:
        try:
            # Adicionar timeout para evitar esperas infinitas
            g.db = sqlite3.connect(
                current_app.config['DATABASE'],
                detect_types=sqlite3.PARSE_DECLTYPES,
                timeout=30.0,  # 30 segundos de timeout
                isolation_level=None  # Autocommit mode
            )
            # Configurar para que as conexões não bloqueiem indefinidamente
            g.db.execute('PRAGMA busy_timeout = 10000;')  # 10 segundos
            g.db.row_factory = sqlite3.Row
            logger.debug("Nova conexão com o banco de dados estabelecida")
        except sqlite3.Error as e:
            logger.error(f"Erro ao conectar ao banco de dados: {e}")
            raise
    return g.db

def close_db(e=None):
    """Função para fechar conexão com o banco de dados"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(app):
    """Inicializar o banco de dados"""
    # Criar o diretório do banco de dados se não existir
    db_path = os.path.dirname(app.config['DATABASE'])
    if db_path and not os.path.exists(db_path):
        os.makedirs(db_path)
    
    # Registrar função para fechar db após cada requisição
    app.teardown_appcontext(close_db)

def create_tables():
    """Criar tabelas no banco de dados se não existirem"""
    db = get_db()
    cursor = db.cursor()
    
    # Criar tabela de usuários
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nome TEXT,
            nivel TEXT NOT NULL DEFAULT 'comum',
            unidade TEXT DEFAULT 'Rio de Janeiro',
            created_at TEXT NOT NULL,
            last_login TEXT,
            senha_temporaria INTEGER DEFAULT 0,
            primeiro_login INTEGER DEFAULT 1,
            ultima_alteracao_senha TEXT
        )
    ''')
    
    # Criar tabela de logs
    db.execute('''
        CREATE TABLE IF NOT EXISTS log_atividades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_hora TEXT NOT NULL,
            usuario TEXT NOT NULL,
            nivel TEXT NOT NULL,
            acao TEXT NOT NULL,
            descricao TEXT
        )
    ''')
    
    # Criar tabela de solicitações de registro
    db.execute('''
        CREATE TABLE IF NOT EXISTS solicitacoes_registro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            setor TEXT,
            unidade TEXT DEFAULT 'Rio de Janeiro',
            justificativa TEXT,
            data_solicitacao TEXT NOT NULL,
            status TEXT DEFAULT 'pendente',
            motivo_rejeicao TEXT,
            data_processamento TEXT,
            processado_por TEXT
        )
    ''')
    
    # Criar tabela de solicitações de senha
    db.execute('''
        CREATE TABLE IF NOT EXISTS solicitacoes_senha (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            username TEXT NOT NULL,
            data_solicitacao TEXT NOT NULL,
            status TEXT DEFAULT 'pendente',
            data_aprovacao TEXT,
            aprovado_por TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )
    ''')
    
    # ✅ NOVAS TABELAS PARA O SISTEMA DE CONTAINERS
    
    # Criar tabela de containers
    db.execute('''
        CREATE TABLE IF NOT EXISTS containers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL DEFAULT 'no patio',
            posicao_atual TEXT,
            unidade TEXT DEFAULT 'Rio de Janeiro',
            data_criacao TEXT NOT NULL,
            ultima_atualizacao TEXT NOT NULL
        )
    ''')
    
    # Criar tabela de operações
    db.execute('''
        CREATE TABLE IF NOT EXISTS operacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            modo TEXT,
            container_id INTEGER NOT NULL,
            posicao TEXT,
            placa TEXT,
            vagao TEXT,
            data_operacao TEXT NOT NULL,
            usuario_id INTEGER NOT NULL,
            observacoes TEXT,
            FOREIGN KEY (container_id) REFERENCES containers (id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )
    ''')
    
    # Criar tabela de estruturas customizáveis
    db.execute('''
        CREATE TABLE IF NOT EXISTS estruturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            ativo INTEGER DEFAULT 1,
            data_criacao TEXT NOT NULL,
            criado_por TEXT NOT NULL
        )
    ''')
    
    # Criar tabela de avarias customizáveis
    db.execute('''
        CREATE TABLE IF NOT EXISTS avarias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            ativo INTEGER DEFAULT 1,
            data_criacao TEXT NOT NULL,
            criado_por TEXT NOT NULL
        )
    ''')
    
    # Criar tabela de operações de carregamento
    db.execute('''
        CREATE TABLE IF NOT EXISTS operacoes_carregamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            container_id TEXT NOT NULL,
            data_hora TEXT NOT NULL,
            tipo TEXT NOT NULL,
            placa TEXT,
            vagao TEXT,
            observacoes TEXT,
            usuario TEXT NOT NULL,
            unidade TEXT NOT NULL
        )
    ''')
    
    # ✅ CRIAR ÍNDICES PARA OTIMIZAÇÃO
    
    # Índices para tabela containers
    db.execute('CREATE INDEX IF NOT EXISTS idx_containers_numero ON containers(numero)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_containers_posicao ON containers(posicao_atual)')
    
    # Índices para tabela operações
    db.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_container ON operacoes(container_id)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_tipo ON operacoes(tipo)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_data ON operacoes(data_operacao)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_operacoes_usuario ON operacoes(usuario_id)')
    
    # Índices para tabela estruturas
    db.execute('CREATE INDEX IF NOT EXISTS idx_estruturas_codigo ON estruturas(codigo)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_estruturas_ativo ON estruturas(ativo)')
    
    # Índices para tabela avarias
    db.execute('CREATE INDEX IF NOT EXISTS idx_avarias_codigo ON avarias(codigo)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_avarias_ativo ON avarias(ativo)')
    
    # Índices para tabela operacoes_carregamento
    db.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_container ON operacoes_carregamento(container_id)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_tipo ON operacoes_carregamento(tipo)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_data ON operacoes_carregamento(data_hora)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_usuario_id ON operacoes_carregamento(usuario_id)')
    
    # Commit para salvar as alterações
    db.commit()
    
    # ✅ INSERIR DADOS DE EXEMPLO PARA TESTE (OPCIONAL)
    inserir_dados_exemplo(db)
    
    # ✅ INICIALIZAR ESTRUTURAS E AVARIAS PADRÃO
    def inicializar_estruturas_avarias_padrao():
        """Inicializa estruturas e avarias padrão se não existirem"""
        try:
            db = get_db()
            cursor = db.cursor()
            
            # Verificar se já existem estruturas
            cursor.execute('SELECT COUNT(*) FROM estruturas')
            count_estruturas = cursor.fetchone()[0]
            
            # Verificar se já existem avarias
            cursor.execute('SELECT COUNT(*) FROM avarias')
            count_avarias = cursor.fetchone()[0]
            
            # Se não existirem estruturas, inserir padrões
            if count_estruturas == 0:
                logger.info("Inserindo estruturas padrão...")
                
                # Lista de estruturas padrão
                estruturas_padrao = [
                    ('TETO', 'Teto'),
                    ('PISO', 'Piso'),
                    ('PORTA', 'Porta'),
                    ('LATERAL', 'Lateral'),
                    ('FRENTE', 'Frente'),
                    ('FUNDO', 'Fundo')
                ]
                
                from datetime import datetime
                data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                for codigo, nome in estruturas_padrao:
                    db.execute('''
                        INSERT OR IGNORE INTO estruturas (codigo, nome, data_criacao, criado_por)
                        VALUES (?, ?, ?, ?)
                    ''', (codigo, nome, data_atual, 'sistema'))
            
            # Se não existirem avarias, inserir padrões
            if count_avarias == 0:
                logger.info("Inserindo avarias padrão...")
                
                # Lista de avarias padrão
                avarias_padrao = [
                    ('AMASSADO', 'Amassado'),
                    ('FURADO', 'Furado'),
                    ('RASGADO', 'Rasgado'),
                    ('QUEBRADO', 'Quebrado'),
                    ('OXIDADO', 'Oxidado'),
                    ('RISCADO', 'Riscado')
                ]
                
                from datetime import datetime
                data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                for codigo, nome in avarias_padrao:
                    db.execute('''
                        INSERT OR IGNORE INTO avarias (codigo, nome, data_criacao, criado_por)
                        VALUES (?, ?, ?, ?)
                    ''', (codigo, nome, data_atual, 'sistema'))
            
            db.commit()
            logger.info("Estruturas e avarias padrão verificadas/inseridas")
            
        except sqlite3.Error as e:
            logger.error(f"Erro ao inicializar estruturas e avarias padrão: {e}")
            raise

    inicializar_estruturas_avarias_padrao()

    logger.info("Tabelas criadas ou já existentes")

def inserir_dados_exemplo(db):
    """
    Inserir alguns containers de exemplo para facilitar os testes
    Apenas insere se não existirem containers no sistema
    """
    try:
        # Verificar se já existem containers
        cursor = db.cursor()
        cursor.execute('SELECT COUNT(*) FROM containers')
        count = cursor.fetchone()[0]
        
        if count == 0:
            logger.info("Inserindo dados de exemplo para containers...")
            
            # Inserir containers de exemplo
            containers_exemplo = [
                ('TCLU1234567', 'no patio', 'A1-15'),
                ('MSCU9876543', 'no patio', 'B2-08'),
                ('GESU5555444', 'no patio', 'C3-22'),
                ('CSNU7777888', 'no patio', 'D4-11'),
                ('HDMU3333222', 'no patio', 'E5-05')
            ]
            
            from datetime import datetime
            data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            for numero, status, posicao in containers_exemplo:
                db.execute('''
                    INSERT OR IGNORE INTO containers (numero, status, posicao_atual, data_criacao, ultima_atualizacao)
                    VALUES (?, ?, ?, ?, ?)
                ''', (numero, status, posicao, data_atual, data_atual))
            
            db.commit()
            logger.info(f"Inseridos {len(containers_exemplo)} containers de exemplo")
        else:
            logger.info(f"Sistema já possui {count} containers cadastrados")
            
    except Exception as e:
        logger.error(f"Erro ao inserir dados de exemplo: {e}")

def verificar_integridade_db():
    """Verifica a integridade do banco de dados e corrige problemas comuns"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        logger.info("Verificando integridade do banco de dados...")
        
        # Verificar integridade do banco de dados
        cursor.execute("PRAGMA integrity_check")
        integrity_result = cursor.fetchone()[0]
        
        # Verificar se todas as tabelas necessárias existem
        tabelas_necessarias = ['usuarios', 'containers', 'operacoes', 'log_atividades', 'estruturas', 'avarias']
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tabelas_existentes = [row[0] for row in cursor.fetchall()]
        
        tabelas_faltando = []
        for tabela in tabelas_necessarias:
            if tabela not in tabelas_existentes:
                tabelas_faltando.append(tabela)
        
        if integrity_result != "ok" or tabelas_faltando:
            logger.warning(f"Verificação de integridade falhou: {integrity_result}")
            if tabelas_faltando:
                logger.warning(f"Tabelas faltando no banco de dados: {tabelas_faltando}")
            
            # Tentar reparar o banco de dados
            logger.info("Tentando reparar o banco de dados...")
            cursor.execute("VACUUM")
            db.commit()
            
            # Verificar novamente
            cursor.execute("PRAGMA integrity_check")
            new_integrity_result = cursor.fetchone()[0]
            
            if new_integrity_result != "ok":
                logger.error(f"Falha ao reparar o banco de dados: {new_integrity_result}")
            else:
                logger.info("Banco de dados reparado com sucesso")
                
            return False
        
        # Verificar se há dados básicos nas tabelas
        cursor.execute('SELECT COUNT(*) FROM containers')
        count_containers = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM usuarios')
        count_usuarios = cursor.fetchone()[0]
        
        logger.info(f"Integridade do DB: {count_containers} containers, {count_usuarios} usuários")
        
        return True
        
    except Exception as e:
        logger.error(f"Erro ao verificar integridade do banco: {e}")
        return False

def log_activity(usuario, acao, detalhes=None, nivel=None):
    """Função para registrar atividades dos usuários
    
    Args:
        usuario: Nome do usuário que realizou a ação
        acao: Descrição curta da ação realizada
        detalhes: Detalhes adicionais da ação (opcional)
        nivel: Nível do usuário (opcional, será buscado no banco se não fornecido)
    """
    from datetime import datetime
    import time
    
    max_retries = 3
    retry_delay = 0.5  # segundos
    
    for attempt in range(max_retries):
        try:
            db = get_db()
            data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Se o nível não foi fornecido, buscar no banco
            if nivel is None:
                cursor = db.cursor()
                cursor.execute('SELECT nivel FROM usuarios WHERE username = ?', (usuario,))
                result = cursor.fetchone()
                nivel = result[0] if result else 'desconhecido'
            
            db.execute('''
                INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
                VALUES (?, ?, ?, ?, ?)
            ''', (data_hora, usuario, nivel, acao, detalhes))
            
            # Se estamos usando autocommit (isolation_level=None), não precisamos fazer commit
            # Mas vamos manter para compatibilidade caso a configuração mude
            if db.isolation_level is not None:
                db.commit()
                
            logger.info(f"Log registrado: {usuario} - {acao}")
            return True
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                logger.warning(f"Banco de dados bloqueado, tentativa {attempt+1}/{max_retries}. Aguardando...")
                time.sleep(retry_delay * (attempt + 1))  # Backoff exponencial
            else:
                logger.error(f"Erro ao registrar log após {attempt+1} tentativas: {e}")
                return False
        except Exception as e:
            logger.error(f"Erro ao registrar log: {e}")
            return False
    
    return False

# ✅ FUNÇÕES AUXILIARES PARA CONTAINERS

def get_containers_no_patio(unidade=None):
    """
    Retorna lista de containers que estão no pátio e podem ser movimentados
    Filtra por unidade se especificada
    """
    try:
        db = get_db()
        cursor = db.cursor()
        
        query = '''
            SELECT numero, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE status = 'no patio' 
            AND posicao_atual IS NOT NULL 
            AND posicao_atual != ''
        '''
        
        params = []
        if unidade:
            query += ' AND unidade = ?'
            params.append(unidade)
            
        query += ' ORDER BY ultima_atualizacao DESC'
        
        cursor.execute(query, params)
        
        containers = []
        for row in cursor.fetchall():
            containers.append({
                'numero': row[0],
                'posicao_atual': row[1],
                'ultima_atualizacao': row[2],
                'unidade': row[3]
            })
        
        return containers
        
    except Exception as e:
        logger.error(f"Erro ao buscar containers no pátio: {e}")
        return []

def get_container_info(numero_container, unidade=None):
    """
    Busca informações de um container específico
    Se a unidade for especificada, filtra por unidade
    """
    try:
        db = get_db()
        cursor = db.cursor()
        
        query = '''
            SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, unidade
            FROM containers 
            WHERE numero = ?
        '''
        
        params = [numero_container.upper()]
        
        if unidade:
            query += ' AND unidade = ?'
            params.append(unidade)
        
        cursor.execute(query, params)
        
        container = cursor.fetchone()
        
        if container:
            return {
                'id': container[0],
                'numero': container[1],
                'status': container[2],
                'posicao_atual': container[3],
                'data_criacao': container[4],
                'ultima_atualizacao': container[5],
                'unidade': container[6]
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Erro ao buscar container {numero_container}: {e}")
        return None

def get_db_stats():
    """
    Retorna estatísticas básicas do banco de dados
    """
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Contar containers por status
        cursor.execute('SELECT status, COUNT(*) FROM containers GROUP BY status')
        containers_por_status = dict(cursor.fetchall())
        
        # Contar operações por tipo
        cursor.execute('SELECT tipo, COUNT(*) FROM operacoes GROUP BY tipo')
        operacoes_por_tipo = dict(cursor.fetchall())
        
        # Total de registros
        cursor.execute('SELECT COUNT(*) FROM containers')
        total_containers = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM operacoes')
        total_operacoes = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM usuarios')
        total_usuarios = cursor.fetchone()[0]
        
        return {
            'containers_por_status': containers_por_status,
            'operacoes_por_tipo': operacoes_por_tipo,
            'totais': {
                'containers': total_containers,
                'operacoes': total_operacoes,
                'usuarios': total_usuarios
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas do banco: {e}")
        return None

def inicializar_estruturas_avarias_padrao():
    """
    Inicializa as estruturas e avarias padrão no banco se não existirem
    """
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se já existem estruturas
        cursor.execute('SELECT COUNT(*) FROM estruturas')
        count_estruturas = cursor.fetchone()[0]
        
        if count_estruturas == 0:
            # Inserir estruturas padrão
            estruturas_padrao = [
                ('1', '1 - ALAVANCA DA HASTE'),
                ('2', '2 - ANEL DA HASTE'),
                ('3', '3 - ASSOALHO'),
                ('4', '4 - BARRA J'),
                ('5', '5 - BOLSA'),
                ('6', '6 - BORRACHA/VEDAÇAO'),
                ('7', '7 - CABO DE LONA'),
                ('8', '8 - CABO ELETRICO (RF)'),
                ('9', '9 - CARGA EM FLAT RACK/OPEN TOP'),
                ('10', '10 - CINTA'),
                ('11', '11 - COL. DIREITA FRENTE'),
                ('12', '12 - COL. DIREITA PORTA/TRAS.'),
                ('13', '13 - COL. ESQUERDA FRENTE'),
                ('14', '14 - COL. ESQUERDA PORTA/TRAS.'),
                ('15', '15 - COMPARTIMENTO DO CABO (RF)'),
                ('16', '16 - CONTAINER'),
                ('17', '17 - DISPLAY (RF)'),
                ('18', '18 - DISPOSITIVO DE CANTO'),
                ('19', '19 - DIVERGENTE'),
                ('20', '20 - DOBRADIÇA'),
                ('21', '21 - ESCADA (TK)'),
                ('22', '22 - FRENTE'),
                ('23', '23 - FUNDO'),
                ('24', '24 - HASTE'),
                ('25', '25 - LACRE'),
                ('26', '26 - LADO DIREITO'),
                ('27', '27 - LADO DIREITO E ESQUERDO'),
                ('28', '28 - LADO DIREITO E FRENTE'),
                ('29', '29 - LADO DIREITO, ESQUERDO, FRENTE'),
                ('30', '30 - LADO ESQUERDO'),
                ('31', '31 - LADO ESQUERDO E FRENTE'),
                ('32', '32 - LONA'),
                ('33', '33 - LONG. INF. DIREITA'),
                ('34', '34 - LONG. INF. ESQUERDA'),
                ('35', '35 - LONG. INF. FRENTE'),
                ('36', '36 - LONG. INF. PORTA/TRAS.'),
                ('37', '37 - LONG. SUP . PORTA/TRAS.'),
                ('38', '38 - LONG. SUP. DIREITA'),
                ('39', '39 - LONG. SUP. ESQUERDA'),
                ('40', '40 - LONG. SUP. FRENTE'),
                ('41', '41 - MICRO LINK (RF)'),
                ('42', '42 - MOLA (FR)'),
                ('43', '43 - MOTOR/MAQUINÁRIO (RF)'),
                ('44', '44 - NUMERAÇÃO / IDENTIFICAÇÃO'),
                ('45', '45 - PAINEL DE CONTROLE'),
                ('46', '46 - PASSADIÇO'),
                ('47', '47 - PLACA DE IDENTIFICAÇÃO'),
                ('48', '48 - PLACA MÃE (RF)'),
                ('49', '49 - PORTA OU TRASEIRA'),
                ('50', '50 - RETENTOR DA ALAVANCA'),
                ('51', '51 - RETENTOR DA UNHA/TRAVA'),
                ('52', '52 - SUPORTE DA HASTE'),
                ('53', '53 - TAMPA'),
                ('54', '54 - TAMPA CONDENSADOR'),
                ('55', '55 - TAMPA EVAPORADOR'),
                ('56', '56 - TAMPA PAINEL'),
                ('57', '57 - TETO'),
                ('58', '58 - TOMADA (RF)'),
                ('59', '59 - TRAVA DA TAMPA (FR)'),
                ('60', '60 - TRAVESSA DE FUNDO'),
                ('61', '61 - TRAVESSA DE TETO (OT)'),
                ('62', '62 - UNHA/TRAVE DA HASTE'),
                ('63', '63 - VALVULA'),
                ('64', '64 - VENTILADOR')
            ]
            
            from datetime import datetime
            data_agora = datetime.now().isoformat()
            
            for codigo, nome in estruturas_padrao:
                cursor.execute('''
                    INSERT INTO estruturas (codigo, nome, ativo, data_criacao, criado_por)
                    VALUES (?, ?, 1, ?, 'Sistema')
                ''', (codigo, nome, data_agora))
            
            logger.info(f"Inseridas {len(estruturas_padrao)} estruturas padrão")
        
        # Verificar se já existem avarias
        cursor.execute('SELECT COUNT(*) FROM avarias')
        count_avarias = cursor.fetchone()[0]
        
        if count_avarias == 0:
            # Inserir avarias padrão
            avarias_padrao = [
                ('1', '1 - AMASSADO(A)'),
                ('2', '2 - AMASSADO(A) GRAVE'),
                ('3', '3 - ARRANHADO(A)'),
                ('4', '4 - CORTADO(A)'),
                ('5', '5 - DIVERGÊNCIA DE PESO'),
                ('6', '6 - EMBALAGEM SUJA'),
                ('7', '7 - EMPENADO(A)'),
                ('8', '8 - ENFERRUJADO(A)'),
                ('9', '9 - ENFERRUJADO(A) GRAVE'),
                ('10', '10 - ENTREABERTO(A)'),
                ('11', '11 - ESTUFADO(A)'),
                ('12', '12 - ESTUFADO(A) GRAVE'),
                ('13', '13 - FALTANDO'),
                ('14', '14 - FURADO(A)'),
                ('15', '15 - ILEGÍVEL'),
                ('16', '16 - LACRE DIVERGENTE'),
                ('17', '17 - LACRE IMPRÓPRIO'),
                ('18', '18 - LACRE ROMPIDO'),
                ('19', '19 - MAL ESTADO DE CONSERVAÇÃO'),
                ('20', '20 - MAL ESTADO DE CONSERVAÇÃO'),
                ('21', '21 - MANCHA DE OLEO'),
                ('22', '22 - MANCHADO/ARRANHADO/QUEBRADO'),
                ('23', '23 - MARCA DE PLACAR IMO'),
                ('24', '24 - MOLHADA - FR'),
                ('25', '25 - MOLHADO(A) E ENFERRUJADO(A)'),
                ('26', '26 - MOLHADO(A) E ENFERRUJADO(A)'),
                ('27', '27 - PEAÇÃO IMPROPRIA - FR'),
                ('28', '28 - PICHADO'),
                ('29', '29 - QUEBRADO'),
                ('30', '30 - QUEBRADO(A)'),
                ('31', '31 - QUEBRADO(A) E ARRANHADO(A) - C'),
                ('32', '32 - QUEBRADO(A) E ENFERRUJADO(A) -'),
                ('33', '33 - RASGADO(A)'),
                ('34', '34 - RASGADO(A) E VAZANDO'),
                ('35', '35 - REMENDADO(A)'),
                ('36', '36 - REMENDO MAL FEITO/GRANDE'),
                ('37', '37 - REMENDO PROVISÓRIO'),
                ('38', '38 - SEM AVARIA'),
                ('39', '39 - SEM IDENTIFICAÇÃO'),
                ('40', '40 - SEM LACRE'),
                ('41', '41 - SEM LACRE DE PAINEL'),
                ('42', '42 - SOLTA(O)'),
                ('43', '43 - SUJO(A)/RASGADO(A)/ABERTO(A)'),
                ('44', '44 - TORCIDO(A)'),
                ('45', '45 - TWIST-LOCK (FR)'),
                ('46', '46 - VAZANDO')
            ]
            
            from datetime import datetime
            data_agora = datetime.now().isoformat()
            
            for codigo, nome in avarias_padrao:
                cursor.execute('''
                    INSERT INTO avarias (codigo, nome, ativo, data_criacao, criado_por)
                    VALUES (?, ?, 1, ?, 'Sistema')
                ''', (codigo, nome, data_agora))
            
            logger.info(f"Inseridas {len(avarias_padrao)} avarias padrão")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Erro ao inicializar estruturas e avarias padrão: {e}")
        raise