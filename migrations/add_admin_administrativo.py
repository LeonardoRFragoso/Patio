"""
Script de migração para adicionar suporte ao novo tipo de administrador (admin_administrativo)
"""
import os
import sys
import sqlite3
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('migration')

# Obter caminho do banco de dados
DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database.db')

def run_migration():
    """Executa a migração para adicionar suporte ao admin_administrativo"""
    logger.info(f"Iniciando migração para adicionar suporte ao admin_administrativo no banco {DB_FILE}")
    
    if not os.path.exists(DB_FILE):
        logger.error(f"Arquivo de banco de dados não encontrado: {DB_FILE}")
        return False
    
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verificar se já existem usuários com o nível admin_administrativo
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'admin_administrativo'")
        count = cursor.fetchone()[0]
        
        if count > 0:
            logger.info(f"Já existem {count} usuários com nível admin_administrativo. Migração não necessária.")
            return True
        
        # Criar um usuário admin_administrativo de exemplo
        username = "admin_adm"
        email = "admin_adm@exemplo.com"
        from werkzeug.security import generate_password_hash
        password_hash = generate_password_hash("Admin@123")
        created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Verificar se o usuário já existe
        cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if user:
            # Atualizar o usuário existente para o novo nível
            cursor.execute("""
                UPDATE usuarios 
                SET nivel = 'admin_administrativo', email = ?
                WHERE username = ?
            """, (email, username))
            logger.info(f"Usuário {username} atualizado para admin_administrativo")
        else:
            # Criar um novo usuário admin_administrativo
            cursor.execute("""
                INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (username, email, password_hash, "Administrador Administrativo", "admin_administrativo", "Rio de Janeiro", created_at))
            logger.info(f"Usuário {username} criado com nível admin_administrativo")
        
        # Registrar a migração no log de atividades
        cursor.execute("""
            INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
            VALUES (?, ?, ?, ?, ?)
        """, (created_at, "sistema", "admin", "MIGRAÇÃO", "Adicionado suporte para admin_administrativo"))
        
        # Commit das alterações
        conn.commit()
        logger.info("Migração concluída com sucesso!")
        
        return True
        
    except Exception as e:
        logger.error(f"Erro durante a migração: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
