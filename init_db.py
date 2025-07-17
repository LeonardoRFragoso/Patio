import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash

# Garantir que estamos no diretório correto
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Configurações
DB_FILE = 'database.db'

def initialize_database():
    """Inicializa o banco de dados com as tabelas necessárias"""
    print("Inicializando banco de dados...")
    
    # Verificar se o arquivo do banco de dados já existe
    if os.path.exists(DB_FILE):
        user_input = input(f"O arquivo {DB_FILE} já existe. Deseja recriá-lo? (s/n): ")
        if user_input.lower() != 's':
            print("Operação cancelada.")
            return False
        
        # Fazer backup do arquivo existente
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        backup_file = f"{DB_FILE}.bak.{timestamp}"
        os.rename(DB_FILE, backup_file)
        print(f"Backup do banco de dados criado: {backup_file}")
    
    # Conectar ao banco de dados
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Criar tabela de usuários
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nivel TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login TEXT,
        ultima_alteracao_senha TEXT
    )
    ''')
    
    # Adicionar comentário sobre os níveis de usuário disponíveis
    cursor.execute('''
    -- Os níveis de usuário disponíveis são:
    -- 'operador': Acesso básico ao sistema
    -- 'inventariante': Acesso para gerenciar inventário
    -- 'admin': Acesso administrativo completo
    ''')
    
    # Criar tabela de containers
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS containers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'no patio',
        posicao_atual TEXT,
        data_criacao TEXT NOT NULL,
        ultima_atualizacao TEXT NOT NULL
    )
    ''')
    
    # Criar tabela de operações
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS operacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,  -- 'descarga', 'movimentacao', 'carregamento'
        modo TEXT,  -- 'ferrovia', 'rodoviaria' (para descarga e carregamento)
        container_id INTEGER NOT NULL,
        posicao TEXT NOT NULL,
        placa TEXT,  -- para modo rodoviário
        vagao TEXT,  -- para modo ferroviário
        data_operacao TEXT NOT NULL,
        usuario_id INTEGER NOT NULL,
        observacoes TEXT,
        FOREIGN KEY(container_id) REFERENCES containers(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
    ''')
    
    # Criar tabela de logs de atividades
    cursor.execute('''
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
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS solicitacoes_registro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        setor TEXT,
        justificativa TEXT,
        data_solicitacao TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        processado_por TEXT,
        data_processamento TEXT
    )
    ''')
    
    # Criar tabela de solicitações de senha
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS solicitacoes_senha (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        data_solicitacao TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        processado_por TEXT,
        data_processamento TEXT,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
    ''')
    
    # Criar usuário admin inicial
    admin_username = 'admin'
    admin_email = 'admin@example.com'
    admin_password = 'Admin@123'
    admin_role = 'admin'
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    password_hash = generate_password_hash(admin_password)
    
    cursor.execute('''
    INSERT INTO usuarios (username, email, password_hash, nivel, created_at)
    VALUES (?, ?, ?, ?, ?)
    ''', (admin_username, admin_email, password_hash, admin_role, created_at))
    
    # Registrar a criação do usuário admin nos logs
    cursor.execute('''
    INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
    VALUES (?, ?, ?, ?, ?)
    ''', (created_at, 'sistema', 'admin', 'INICIALIZAÇÃO', 'Criação do usuário administrador inicial'))
    
    # Salvar alterações
    conn.commit()
    conn.close()
    
    print("Banco de dados inicializado com sucesso!")
    print(f"Usuário admin criado com as seguintes credenciais:")
    print(f"  Usuário: {admin_username}")
    print(f"  Senha: {admin_password}")
    print(f"  Função: {admin_role}")
    print("\nIMPORTANTE: Altere essa senha imediatamente após o primeiro login!")
    
    return True

def create_test_users():
    """Cria usuários de teste para demonstração"""
    print("\nDeseja criar usuários de teste? (s/n): ", end="")
    user_input = input()
    if user_input.lower() != 's':
        return
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Lista de usuários de teste com os três níveis
    test_users = [
        ('operador1', 'operador1@example.com', 'Operador@123', 'operador'),
        ('operador2', 'operador2@example.com', 'Operador@456', 'operador'),
        ('inventariante1', 'inventariante1@example.com', 'Invent@123', 'inventariante'),
        ('inventariante2', 'inventariante2@example.com', 'Invent@456', 'inventariante'),
        ('admin2', 'admin2@example.com', 'Admin@123', 'admin')
    ]
    
    for username, email, password, role in test_users:
        password_hash = generate_password_hash(password)
        
        try:
            cursor.execute('''
            INSERT INTO usuarios (username, email, password_hash, nivel, created_at)
            VALUES (?, ?, ?, ?, ?)
            ''', (username, email, password_hash, role, created_at))
            
            # Registrar a criação do usuário nos logs
            cursor.execute('''
            INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
            VALUES (?, ?, ?, ?, ?)
            ''', (created_at, 'sistema', 'admin', 'INICIALIZAÇÃO', f'Criação do usuário de teste: {username}'))
            
            print(f"Usuário de teste criado: {username} (senha: {password})")
        except sqlite3.IntegrityError:
            print(f"Usuário '{username}' já existe. Ignorando.")
    
    conn.commit()
    conn.close()
    print("Usuários de teste criados com sucesso!")

if __name__ == '__main__':
    if initialize_database():
        create_test_users()
    print("\nProcesso de inicialização concluído!")
