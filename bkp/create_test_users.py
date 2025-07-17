import sqlite3
import os
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash
import logging

# Configurar logging para debug
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('create_users')

# Garantir que estamos no diretório correto
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Configurações
DB_FILE = 'database.db'

def create_test_users():
    """Cria usuários de teste no banco de dados"""
    print("Criando usuários de teste...")
    
    # Verificar se o arquivo do banco de dados existe
    if not os.path.exists(DB_FILE):
        print(f"Erro: O arquivo {DB_FILE} não existe. Execute init_db.py primeiro.")
        return False
        
    # Verificar a estrutura da tabela usuários
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(usuarios)")
        columns = cursor.fetchall()
        conn.close()
        
        print("Estrutura da tabela 'usuarios':")
        column_names = [col[1] for col in columns]
        print(f"Colunas: {column_names}")
        
        # Verificar se temos as colunas necessárias
        required_columns = ['username', 'email', 'password_hash', 'nivel', 'unidade', 'created_at']
        missing_columns = [col for col in required_columns if col not in column_names]
        
        if missing_columns:
            print(f"Erro: Colunas necessárias ausentes na tabela 'usuarios': {missing_columns}")
            return False
            
    except sqlite3.Error as e:
        print(f"Erro ao verificar a estrutura da tabela: {e}")
        return False
    
    # Conectar ao banco de dados
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
    except sqlite3.Error as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return False
    
    # Data de criação
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Senha para ambos os usuários (atendendo aos requisitos de segurança)
    password = 'Teste@123'
    # Especificar o método pbkdf2:sha256 para compatibilidade
    password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    # Verificar se os usuários já existem
    cursor.execute('SELECT username FROM usuarios WHERE username IN (?, ?, ?, ?, ?)', 
                 ('teste_operador', 'teste_inventariante', 'teste_admin', 'teste_comum', 'teste_vistoriador'))
    existing_users = [row[0] for row in cursor.fetchall()]
    
    users_created = []
    users_updated = []
    
    # 1. Criar ou atualizar usuário operador de teste
    if 'teste_operador' not in existing_users:
        try:
            cursor.execute('''
            INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, created_at, senha_temporaria, primeiro_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', ('teste_operador', 'teste_operador@example.com', password_hash, 'Operador de Teste', 'operador', 'SANTOS', created_at, 0, 0))
        except sqlite3.Error as e:
            print(f"Erro ao inserir usuário teste_operador: {e}")
            # Continuar com os outros usuários mesmo se este falhar
        users_created.append('teste_operador')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'CRIAÇÃO_USUÁRIO', 'Criação do usuário de teste: teste_operador'))
    else:
        # Atualizar a senha do usuário existente
        cursor.execute('''
        UPDATE usuarios SET password_hash = ? WHERE username = ?
        ''', (password_hash, 'teste_operador'))
        users_updated.append('teste_operador')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'ATUALIZAÇÃO_SENHA', 'Atualização de senha do usuário de teste: teste_operador'))
        
    # 2. Criar ou atualizar usuário inventariante de teste
    if 'teste_inventariante' not in existing_users:
        try:
            cursor.execute('''
            INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, created_at, senha_temporaria, primeiro_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', ('teste_inventariante', 'teste_inventariante@example.com', password_hash, 'Inventariante de Teste', 'inventariante', 'SANTOS', created_at, 0, 0))
        except sqlite3.Error as e:
            print(f"Erro ao inserir usuário teste_inventariante: {e}")
            # Continuar com os outros usuários mesmo se este falhar
        users_created.append('teste_inventariante')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'CRIAÇÃO_USUÁRIO', 'Criação do usuário de teste: teste_inventariante'))
    else:
        # Atualizar a senha do usuário existente
        cursor.execute('''
        UPDATE usuarios SET password_hash = ? WHERE username = ?
        ''', (password_hash, 'teste_inventariante'))
        users_updated.append('teste_inventariante')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'ATUALIZAÇÃO_SENHA', 'Atualização de senha do usuário de teste: teste_inventariante'))
        
    # Para compatibilidade, manter o usuário comum se já existir
    if 'teste_comum' in existing_users:
        # Atualizar a senha do usuário existente
        cursor.execute('''
        UPDATE usuarios SET password_hash = ? WHERE username = ?
        ''', (password_hash, 'teste_comum'))
        users_updated.append('teste_comum')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'ATUALIZAÇÃO_SENHA', 'Atualização de senha do usuário de teste: teste_comum'))
    
    # 3. Criar ou atualizar usuário vistoriador de teste
    if 'teste_vistoriador' not in existing_users:
        cursor.execute('''
        INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, created_at, senha_temporaria, primeiro_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('teste_vistoriador', 'teste_vistoriador@example.com', password_hash, 'Vistoriador de Teste', 'vistoriador', 'SANTOS', created_at, 0, 0))
        users_created.append('teste_vistoriador')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'CRIAÇÃO_USUÁRIO', 'Criação do usuário de teste: teste_vistoriador'))
    else:
        # Atualizar a senha do usuário existente
        cursor.execute('''
        UPDATE usuarios SET password_hash = ? WHERE username = ?
        ''', (password_hash, 'teste_vistoriador'))
        users_updated.append('teste_vistoriador')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'ATUALIZAÇÃO_SENHA', 'Atualização de senha do usuário de teste: teste_vistoriador'))
    
    # 4. Criar ou atualizar usuário admin de teste
    if 'teste_admin' not in existing_users:
        try:
            cursor.execute('''
            INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, created_at, senha_temporaria, primeiro_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', ('teste_admin', 'teste_admin@example.com', password_hash, 'Administrador de Teste', 'admin', 'SANTOS', created_at, 0, 0))
        except sqlite3.Error as e:
            print(f"Erro ao inserir usuário teste_admin: {e}")
            # Continuar com os outros usuários mesmo se este falhar
        users_created.append('teste_admin')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'CRIAÇÃO_USUÁRIO', 'Criação do usuário de teste: teste_admin'))
    else:
        # Atualizar a senha do usuário admin existente
        cursor.execute('''
        UPDATE usuarios SET password_hash = ? WHERE username = ?
        ''', (password_hash, 'teste_admin'))
        users_updated.append('teste_admin')
        
        # Registrar no log
        cursor.execute('''
        INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
        VALUES (?, ?, ?, ?, ?)
        ''', (created_at, 'system', 'INFO', 'ATUALIZAÇÃO_SENHA', 'Atualização de senha do usuário de teste: teste_admin'))
    
    # Confirmar alterações
    try:
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        print(f"Erro ao finalizar as alterações: {e}")
        return False
    
    # Exibir mensagem
    if users_created:
        print(f"Usuários de teste criados com sucesso: {', '.join(users_created)}")
    
    if users_updated:
        print(f"Usuários de teste atualizados com sucesso: {', '.join(users_updated)}")
    
    if users_created or users_updated:
        print("\nDados de acesso:")
        print("- Operador: username='teste_operador', senha='Teste@123'")
        print("- Vistoriador (SANTOS): username='teste_vistoriador', senha='Teste@123'")
        print("- Inventariante: username='teste_inventariante', senha='Teste@123'")
        print("- Administrador: username='teste_admin', senha='Teste@123'")
        if 'teste_comum' in users_updated:
            print("- Usuario comum (legado): username='teste_comum', senha='Teste@123'")
        print("\nNota: Todas as senhas atendem aos requisitos de segurança (mínimo 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial).")
        return True
    else:
        print("Nenhum usuário criado ou atualizado.")
        return False

if __name__ == "__main__":
    create_test_users()
