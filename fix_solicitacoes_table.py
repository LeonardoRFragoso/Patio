#!/usr/bin/env python3
"""
Script para corrigir a estrutura da tabela solicitacoes_registro
Adiciona a coluna 'unidade' que está faltando
"""

import sqlite3
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_solicitacoes_table():
    """Adiciona a coluna 'unidade' na tabela solicitacoes_registro se não existir"""
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar estrutura atual da tabela
        cursor.execute("PRAGMA table_info(solicitacoes_registro)")
        columns = [row[1] for row in cursor.fetchall()]
        
        logger.info(f"Colunas atuais na tabela solicitacoes_registro: {columns}")
        
        # Verificar se a coluna 'unidade' já existe
        if 'unidade' not in columns:
            logger.info("Coluna 'unidade' não encontrada. Adicionando...")
            
            # Adicionar a coluna 'unidade' com valor padrão
            cursor.execute("""
                ALTER TABLE solicitacoes_registro 
                ADD COLUMN unidade TEXT DEFAULT 'Rio de Janeiro'
            """)
            
            logger.info("Coluna 'unidade' adicionada com sucesso!")
            
            # Verificar se há registros existentes para atualizar
            cursor.execute("SELECT COUNT(*) FROM solicitacoes_registro")
            count = cursor.fetchone()[0]
            
            if count > 0:
                # Atualizar registros existentes que têm unidade NULL
                cursor.execute("""
                    UPDATE solicitacoes_registro 
                    SET unidade = 'Rio de Janeiro' 
                    WHERE unidade IS NULL
                """)
                logger.info(f"Atualizados {cursor.rowcount} registros existentes com unidade padrão")
            
        else:
            logger.info("Coluna 'unidade' já existe na tabela")
        
        # Verificar se a coluna 'motivo_rejeicao' existe (outra coluna que pode estar faltando)
        if 'motivo_rejeicao' not in columns:
            logger.info("Coluna 'motivo_rejeicao' não encontrada. Adicionando...")
            cursor.execute("""
                ALTER TABLE solicitacoes_registro 
                ADD COLUMN motivo_rejeicao TEXT
            """)
            logger.info("Coluna 'motivo_rejeicao' adicionada com sucesso!")
        
        # Commit das mudanças
        conn.commit()
        
        # Verificar estrutura final
        cursor.execute("PRAGMA table_info(solicitacoes_registro)")
        final_columns = [row[1] for row in cursor.fetchall()]
        
        logger.info(f"Estrutura final da tabela: {final_columns}")
        
        conn.close()
        logger.info("Correção da tabela concluída com sucesso!")
        
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Erro ao corrigir tabela: {e}")
        return False
    except Exception as e:
        logger.error(f"Erro inesperado: {e}")
        return False

if __name__ == "__main__":
    logger.info("Iniciando correção da tabela solicitacoes_registro...")
    success = fix_solicitacoes_table()
    
    if success:
        logger.info("✅ Correção concluída com sucesso!")
        print("\n🎯 RESULTADO:")
        print("✅ Tabela solicitacoes_registro corrigida")
        print("✅ Coluna 'unidade' adicionada")
        print("✅ Registros existentes atualizados")
        print("\nO sistema agora deve funcionar corretamente para registro de usuários.")
    else:
        logger.error("❌ Falha na correção da tabela")
        print("\n❌ ERRO:")
        print("Falha ao corrigir a tabela. Verifique os logs para mais detalhes.")
