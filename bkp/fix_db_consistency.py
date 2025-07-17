import sqlite3
import os
import logging
from datetime import datetime

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('fix_db_consistency')

# Caminho do banco de dados
DB_FILE = 'C:\\Users\\leonardo.fragoso\\Desktop\\Projetos\\Projeto-Patiamento\\database.db'

def fix_db_consistency():
    """Corrige inconsistências no banco de dados para melhorar a integridade"""
    logger.info("Iniciando correção de inconsistências no banco de dados...")
    
    # Verificar se o arquivo do banco de dados existe
    if not os.path.exists(DB_FILE):
        logger.error(f"Arquivo de banco de dados não encontrado: {DB_FILE}")
        return False
    
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Verificar se há registros na tabela log_atividades
        cursor.execute("SELECT COUNT(*) FROM log_atividades")
        count_logs = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_logs} registros na tabela log_atividades")
        
        # Verificar se há registros na tabela operacoes_carregamento
        cursor.execute("SELECT COUNT(*) FROM operacoes_carregamento")
        count_carregamentos = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_carregamentos} registros na tabela operacoes_carregamento")
        
        # Verificar se há registros na tabela solicitacoes_registro
        cursor.execute("SELECT COUNT(*) FROM solicitacoes_registro")
        count_solicitacoes = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_solicitacoes} registros na tabela solicitacoes_registro")
        
        # Verificar se há registros na tabela solicitacoes_senha
        cursor.execute("SELECT COUNT(*) FROM solicitacoes_senha")
        count_solicitacoes_senha = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_solicitacoes_senha} registros na tabela solicitacoes_senha")
        
        # Verificar se há registros na tabela operacoes
        cursor.execute("SELECT COUNT(*) FROM operacoes")
        count_operacoes = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_operacoes} registros na tabela operacoes")
        
        # Verificar se há registros na tabela containers
        cursor.execute("SELECT COUNT(*) FROM containers")
        count_containers = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_containers} registros na tabela containers")
        
        # Verificar se há registros na tabela usuarios
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        count_usuarios = cursor.fetchone()[0]
        logger.info(f"Encontrados {count_usuarios} registros na tabela usuarios")
        
        # Verificar integridade do banco antes das alterações
        cursor.execute("PRAGMA integrity_check")
        integridade = cursor.fetchone()[0]
        
        if integridade == "ok":
            logger.info("Verificação de integridade do banco de dados antes das alterações: OK")
        else:
            logger.warning(f"Verificação de integridade do banco de dados antes das alterações: {integridade}")
        
        # Criar tabelas temporárias e migrar dados
        alteracoes = []
        
        # 1. Corrigir tabela operacoes_carregamento (container_id TEXT -> INTEGER)
        if count_carregamentos > 0:
            logger.info("Corrigindo tipo da coluna container_id na tabela operacoes_carregamento...")
            
            # Criar tabela temporária
            cursor.execute('''
                CREATE TABLE operacoes_carregamento_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    container_id INTEGER,
                    data_hora TEXT,
                    tipo TEXT,
                    placa TEXT,
                    vagao TEXT,
                    observacoes TEXT,
                    usuario_id INTEGER,
                    unidade TEXT,
                    FOREIGN KEY (container_id) REFERENCES containers (id),
                    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
                )
            ''')
            
            # Obter dados da tabela original
            cursor.execute("SELECT id, container_id, data_hora, tipo, placa, vagao, observacoes, usuario_id, unidade FROM operacoes_carregamento")
            registros = cursor.fetchall()
            
            # Para cada registro, tentar encontrar o container_id correspondente
            for registro in registros:
                id, container_numero, data_hora, tipo, placa, vagao, observacoes, usuario_id, unidade = registro
                
                # Buscar o ID do container pelo número
                cursor.execute("SELECT id FROM containers WHERE numero = ?", (container_numero,))
                container_result = cursor.fetchone()
                container_id = container_result[0] if container_result else None
                
                # Inserir na tabela temporária
                cursor.execute('''
                    INSERT INTO operacoes_carregamento_temp 
                    (id, container_id, data_hora, tipo, placa, vagao, observacoes, usuario_id, unidade)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (id, container_id, data_hora, tipo, placa, vagao, observacoes, usuario_id, unidade))
            
            # Remover tabela original
            cursor.execute("DROP TABLE operacoes_carregamento")
            
            # Renomear tabela temporária
            cursor.execute("ALTER TABLE operacoes_carregamento_temp RENAME TO operacoes_carregamento")
            
            # Recriar índices
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_container ON operacoes_carregamento(container_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_tipo ON operacoes_carregamento(tipo)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_data ON operacoes_carregamento(data_hora)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_carregamento_usuario_id ON operacoes_carregamento(usuario_id)')
            
            alteracoes.append("Corrigido tipo da coluna container_id na tabela operacoes_carregamento")
        
        # Commit das alterações
        conn.commit()
        
        # Verificar integridade do banco após alterações
        cursor.execute("PRAGMA integrity_check")
        integridade = cursor.fetchone()[0]
        
        if integridade == "ok":
            logger.info("Verificação de integridade do banco de dados após alterações: OK")
        else:
            logger.warning(f"Verificação de integridade do banco de dados após alterações: {integridade}")
        
        # Fechar conexão
        conn.close()
        
        if alteracoes:
            logger.info(f"Alterações realizadas no banco de dados: {len(alteracoes)}")
            for alteracao in alteracoes:
                logger.info(f"- {alteracao}")
            return True
        else:
            logger.info("Nenhuma alteração necessária no banco de dados.")
            return True
        
    except sqlite3.Error as e:
        logger.error(f"Erro ao corrigir inconsistências no banco de dados: {e}")
        return False

if __name__ == "__main__":
    if fix_db_consistency():
        print("Correção de inconsistências no banco de dados concluída com sucesso!")
    else:
        print("Falha ao corrigir inconsistências no banco de dados. Verifique os logs para mais detalhes.")
