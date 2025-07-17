#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para migrar todos os dados relacionados à unidade Floriano para Suzano.
Este script garante que todos os containers e usuários no sistema sejam
associados apenas com a unidade Suzano, removendo dependências da unidade Floriano.
"""

import sqlite3
import logging
import sys
import os

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Ajustar caminho para o banco de dados
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database.db')

def conectar_bd():
    """Estabelece conexão com o banco de dados"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Para acessar colunas por nome
        return conn
    except sqlite3.Error as e:
        logger.error(f"Erro ao conectar ao banco de dados: {str(e)}")
        sys.exit(1)

def migrar_containers_para_suzano(conn):
    """Migra todos os containers de Floriano para Suzano"""
    cursor = conn.cursor()
    
    try:
        # Obter contagem de containers por unidade antes da migração
        cursor.execute('''
            SELECT unidade, COUNT(*) as count 
            FROM containers 
            GROUP BY unidade
        ''')
        resultados_antes = cursor.fetchall()
        
        # Mostrar informação antes da migração
        for row in resultados_antes:
            logger.info(f"Antes da migração: {row['count']} containers na unidade {row['unidade']}")
        
        # Atualizar todos os containers de Floriano para Suzano
        cursor.execute('''
            UPDATE containers
            SET unidade = 'Suzano'
            WHERE unidade = 'Floriano'
        ''')
        
        containers_atualizados = cursor.rowcount
        logger.info(f"Containers atualizados para Suzano: {containers_atualizados}")
        
        # Obter contagem após a atualização
        cursor.execute('''
            SELECT unidade, COUNT(*) as count 
            FROM containers 
            GROUP BY unidade
        ''')
        resultados_depois = cursor.fetchall()
        
        # Mostrar informação após migração
        for row in resultados_depois:
            logger.info(f"Após migração: {row['count']} containers na unidade {row['unidade']}")
            
        conn.commit()
        return containers_atualizados
        
    except sqlite3.Error as e:
        conn.rollback()
        logger.error(f"Erro ao migrar containers: {str(e)}")
        return 0

def migrar_usuarios_para_suzano(conn):
    """Migra todos os usuários de Floriano para Suzano"""
    cursor = conn.cursor()
    
    try:
        # Obter contagem de usuários por unidade antes da migração
        cursor.execute('''
            SELECT unidade, COUNT(*) as count 
            FROM usuarios 
            GROUP BY unidade
        ''')
        resultados_antes = cursor.fetchall()
        
        # Mostrar informação antes da migração
        for row in resultados_antes:
            logger.info(f"Antes da migração: {row['count']} usuários na unidade {row['unidade']}")
        
        # Atualizar todos os usuários de Floriano para Suzano
        cursor.execute('''
            UPDATE usuarios
            SET unidade = 'Suzano'
            WHERE unidade = 'Floriano'
        ''')
        
        usuarios_atualizados = cursor.rowcount
        logger.info(f"Usuários atualizados para Suzano: {usuarios_atualizados}")
        
        # Obter contagem após a atualização
        cursor.execute('''
            SELECT unidade, COUNT(*) as count 
            FROM usuarios 
            GROUP BY unidade
        ''')
        resultados_depois = cursor.fetchall()
        
        # Mostrar informação após migração
        for row in resultados_depois:
            logger.info(f"Após migração: {row['count']} usuários na unidade {row['unidade']}")
            
        conn.commit()
        return usuarios_atualizados
    
    except sqlite3.Error as e:
        conn.rollback()
        logger.error(f"Erro ao migrar usuários: {str(e)}")
        return 0

def migrar_operacoes_para_suzano(conn):
    """Atualiza quaisquer referências à unidade Floriano nas operações"""
    cursor = conn.cursor()
    
    try:
        # Verificar se existe a coluna 'unidade' na tabela operacoes
        cursor.execute("PRAGMA table_info(operacoes)")
        colunas = cursor.fetchall()
        tem_coluna_unidade = any(col['name'] == 'unidade' for col in colunas)
        
        if not tem_coluna_unidade:
            logger.info("A tabela operacoes não possui coluna 'unidade', nenhuma alteração necessária.")
            return 0
            
        # Se existir, atualizar as operações
        cursor.execute('''
            UPDATE operacoes
            SET unidade = 'Suzano'
            WHERE unidade = 'Floriano'
        ''')
        
        operacoes_atualizadas = cursor.rowcount
        logger.info(f"Operações atualizadas para Suzano: {operacoes_atualizadas}")
        
        conn.commit()
        return operacoes_atualizadas
    
    except sqlite3.Error as e:
        conn.rollback()
        logger.error(f"Erro ao migrar operações: {str(e)}")
        return 0

def main():
    logger.info("Iniciando processo de migração para unidade Suzano...")
    
    conn = conectar_bd()
    
    try:
        # Migrar containers
        containers_migrados = migrar_containers_para_suzano(conn)
        
        # Migrar usuários
        usuarios_migrados = migrar_usuarios_para_suzano(conn)
        
        # Migrar operações (se aplicável)
        operacoes_migradas = migrar_operacoes_para_suzano(conn)
        
        # Resumo
        logger.info("\n=== RESUMO DA MIGRAÇÃO ===")
        logger.info(f"Containers migrados para Suzano: {containers_migrados}")
        logger.info(f"Usuários migrados para Suzano: {usuarios_migrados}")
        logger.info(f"Operações migradas para Suzano: {operacoes_migradas}")
        logger.info("===========================\n")
        
        if containers_migrados > 0 or usuarios_migrados > 0 or operacoes_migradas > 0:
            logger.info("Migração para unidade Suzano concluída com sucesso!")
        else:
            logger.info("Nenhum dado precisou ser migrado para Suzano.")
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()
