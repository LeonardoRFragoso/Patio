import sqlite3
import os
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('update_db_schema')

# Caminho do banco de dados
DB_FILE = 'C:\\Users\\leonardo.fragoso\\Desktop\\Projetos\\Projeto-Patiamento\\database.db'

def update_schema():
    """Atualiza o esquema do banco de dados adicionando colunas faltantes"""
    logger.info("Iniciando atualização do esquema do banco de dados...")
    
    # Verificar se o arquivo do banco de dados existe
    if not os.path.exists(DB_FILE):
        logger.error(f"Arquivo de banco de dados não encontrado: {DB_FILE}")
        return False
    
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Verificar se a coluna posicao_anterior existe na tabela operacoes
        cursor.execute("PRAGMA table_info(operacoes)")
        colunas_operacoes = [col[1] for col in cursor.fetchall()]
        
        alteracoes = []
        
        # Adicionar coluna posicao_anterior se não existir
        if 'posicao_anterior' not in colunas_operacoes:
            cursor.execute('''
                ALTER TABLE operacoes ADD COLUMN posicao_anterior TEXT
            ''')
            alteracoes.append("Adicionada coluna 'posicao_anterior' à tabela 'operacoes'")
        
        # Adicionar coluna resultado_vistoria se não existir
        if 'resultado_vistoria' not in colunas_operacoes:
            cursor.execute('''
                ALTER TABLE operacoes ADD COLUMN resultado_vistoria TEXT
            ''')
            alteracoes.append("Adicionada coluna 'resultado_vistoria' à tabela 'operacoes'")
        
        # Verificar se a tabela operacoes_carregamento existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='operacoes_carregamento'")
        if cursor.fetchone():
            # Verificar colunas da tabela operacoes_carregamento
            cursor.execute("PRAGMA table_info(operacoes_carregamento)")
            colunas_carregamento = {col[1]: col[2] for col in cursor.fetchall()}
            
            # Criar tabela temporária com a estrutura correta
            if 'usuario' in colunas_carregamento and 'usuario_id' not in colunas_carregamento:
                logger.info("Convertendo coluna 'usuario' para 'usuario_id' na tabela 'operacoes_carregamento'...")
                
                # Criar tabela temporária
                cursor.execute('''
                    CREATE TABLE operacoes_carregamento_temp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        container_id TEXT,
                        data_hora TEXT,
                        tipo TEXT,
                        placa TEXT,
                        vagao TEXT,
                        observacoes TEXT,
                        usuario_id INTEGER,
                        unidade TEXT,
                        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
                    )
                ''')
                
                # Obter dados da tabela original
                cursor.execute("SELECT id, container_id, data_hora, tipo, placa, vagao, observacoes, usuario, unidade FROM operacoes_carregamento")
                registros = cursor.fetchall()
                
                # Para cada registro, tentar encontrar o usuario_id correspondente
                for registro in registros:
                    id, container_id, data_hora, tipo, placa, vagao, observacoes, username, unidade = registro
                    
                    # Buscar o ID do usuário pelo nome de usuário
                    cursor.execute("SELECT id FROM usuarios WHERE username = ?", (username,))
                    usuario_result = cursor.fetchone()
                    usuario_id = usuario_result[0] if usuario_result else None
                    
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
                
                alteracoes.append("Convertida coluna 'usuario' para 'usuario_id' na tabela 'operacoes_carregamento'")
        
        # Commit das alterações
        conn.commit()
        
        # Verificar integridade do banco após alterações
        cursor.execute("PRAGMA integrity_check")
        integridade = cursor.fetchone()[0]
        
        if integridade == "ok":
            logger.info("Verificação de integridade do banco de dados: OK")
        else:
            logger.warning(f"Verificação de integridade do banco de dados: {integridade}")
        
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
        logger.error(f"Erro ao atualizar o esquema do banco de dados: {e}")
        return False

if __name__ == "__main__":
    if update_schema():
        print("Atualização do esquema do banco de dados concluída com sucesso!")
    else:
        print("Falha ao atualizar o esquema do banco de dados. Verifique os logs para mais detalhes.")
