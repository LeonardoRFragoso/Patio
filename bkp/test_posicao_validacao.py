#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para testar as validações de posicionamento de containers
Verifica se as regras de validação de posição estão funcionando corretamente:
1. Não permitir dois containers na mesma posição
2. Não permitir containers "flutuantes" (em altura > 1 sem container na altura inferior)
"""

import os
import sys
import sqlite3
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('test_posicao_validacao')

# Importar módulos necessários
try:
    from posicoes_suzano import patio_suzano
except ImportError:
    logger.error("Erro ao importar módulo posicoes_suzano. Verifique se o arquivo está no diretório correto.")
    sys.exit(1)

def get_db_connection():
    """Cria uma conexão com o banco de dados SQLite."""
    try:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        logger.error(f"Erro ao conectar ao banco de dados: {e}")
        sys.exit(1)

def limpar_containers_teste(conn):
    """Remove containers de teste do banco de dados."""
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM containers WHERE numero LIKE 'TEST%'")
        cursor.execute("DELETE FROM operacoes WHERE container_id NOT IN (SELECT id FROM containers)")
        conn.commit()
        logger.info("Containers de teste removidos com sucesso")
    except sqlite3.Error as e:
        logger.error(f"Erro ao limpar containers de teste: {e}")

def criar_container_teste(conn, numero, posicao, status="no patio"):
    """Cria um container de teste no banco de dados."""
    try:
        cursor = conn.cursor()
        data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Verificar se o container já existe
        cursor.execute("SELECT id FROM containers WHERE numero = ?", (numero,))
        container = cursor.fetchone()
        
        if container:
            # Atualizar container existente
            cursor.execute(
                "UPDATE containers SET posicao_atual = ?, status = ?, ultima_atualizacao = ? WHERE numero = ?",
                (posicao, status, data_atual, numero)
            )
            logger.info(f"Container {numero} atualizado para posição {posicao}")
        else:
            # Criar novo container
            cursor.execute(
                "INSERT INTO containers (numero, posicao_atual, status, data_criacao, ultima_atualizacao, unidade) VALUES (?, ?, ?, ?, ?, ?)",
                (numero, posicao, status, data_atual, data_atual, "SUZANO")
            )
            logger.info(f"Container {numero} criado na posição {posicao}")
        
        conn.commit()
        return True
    except sqlite3.Error as e:
        logger.error(f"Erro ao criar container de teste: {e}")
        return False

def testar_validacao_posicao_duplicada():
    """Testa a validação de posição duplicada."""
    logger.info("\n=== TESTE DE VALIDAÇÃO DE POSIÇÃO DUPLICADA ===")
    
    conn = get_db_connection()
    
    # Limpar containers de teste anteriores
    limpar_containers_teste(conn)
    
    # Criar um container na posição A01-1
    criar_container_teste(conn, "TEST-DUPLICADO-1", "A01-1")
    
    # Tentar validar a mesma posição para outro container
    # Como a posição é A011 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-1",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    # Verificar se a validação detectou a posição duplicada
    if not resultado['valido']:
        logger.info("✅ SUCESSO: Validação detectou posição duplicada")
        logger.info(f"Mensagem: {resultado['mensagem']}")
    else:
        logger.error("❌ FALHA: Validação não detectou posição duplicada")
    
    # Limpar containers de teste
    limpar_containers_teste(conn)
    conn.close()

def testar_validacao_container_flutuante():
    """Testa a validação de container flutuante."""
    logger.info("\n=== TESTE DE VALIDAÇÃO DE CONTAINER FLUTUANTE ===")
    
    conn = get_db_connection()
    
    # Limpar containers de teste anteriores
    limpar_containers_teste(conn)
    
    # Cenário 1: Tentar posicionar container na altura 2 sem container na altura 1
    logger.info("\nCenário 1: Container na altura 2 sem container na altura 1")
    
    # Validar posição A012 (altura 2) sem container na altura 1
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-2",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    # Verificar se a validação detectou o container flutuante
    if not resultado['valido']:
        logger.info("✅ SUCESSO: Validação detectou container flutuante")
        logger.info(f"Mensagem: {resultado['mensagem']}")
    else:
        logger.error("❌ FALHA: Validação não detectou container flutuante")
    
    # Cenário 2: Posicionar container na altura 1 e depois validar altura 2
    logger.info("\nCenário 2: Container na altura 2 com container na altura 1")
    
    # Criar container na altura 1
    criar_container_teste(conn, "TEST-FLUTUANTE-1", "A01-1")
    
    # Validar posição A012 (altura 2) com container na altura 1
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-2",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    # Verificar se a validação permitiu o container na altura 2
    if resultado['valido']:
        logger.info("✅ SUCESSO: Validação permitiu container na altura 2 com container na altura 1")
    else:
        logger.error("❌ FALHA: Validação não permitiu container na altura 2 mesmo com container na altura 1")
        logger.error(f"Mensagem: {resultado['mensagem']}")
    
    # Cenário 3: Tentar posicionar container na altura 3 sem container na altura 2
    logger.info("\nCenário 3: Container na altura 3 sem container na altura 2")
    
    # Validar posição A013 (altura 3) sem container na altura 2
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-3",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    # Verificar se a validação detectou o container flutuante
    if not resultado['valido']:
        logger.info("✅ SUCESSO: Validação detectou container flutuante na altura 3")
        logger.info(f"Mensagem: {resultado['mensagem']}")
    else:
        logger.error("❌ FALHA: Validação não detectou container flutuante na altura 3")
    
    # Limpar containers de teste
    limpar_containers_teste(conn)
    conn.close()

def testar_sugestoes_posicoes_validas():
    """Testa se as sugestões de posições são válidas."""
    logger.info("\n=== TESTE DE SUGESTÕES DE POSIÇÕES VÁLIDAS ===")
    
    conn = get_db_connection()
    
    # Limpar containers de teste anteriores
    limpar_containers_teste(conn)
    
    # Criar alguns containers em posições específicas
    criar_container_teste(conn, "TEST-SUGESTAO-1", "A01-1")
    criar_container_teste(conn, "TEST-SUGESTAO-2", "A021")
    criar_container_teste(conn, "TEST-SUGESTAO-3", "B011")
    
    # Tentar validar uma posição inválida para obter sugestões
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-2",  # Altura 2 sem container na altura 1
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    # Verificar se a validação retornou sugestões
    if not resultado['valido'] and resultado.get('sugestoes'):
        logger.info("✅ SUCESSO: Validação retornou sugestões de posições válidas")
        logger.info(f"Sugestões: {', '.join(resultado['sugestoes'][:5])}")
    else:
        logger.error("❌ FALHA: Validação não retornou sugestões ou validou posição inválida")
    
    # Limpar containers de teste
    limpar_containers_teste(conn)
    conn.close()

def executar_testes():
    """Executa todos os testes e retorna um resumo dos resultados."""
    print("\n" + "=" * 80)
    print("TESTES DE VALIDAÇÃO DE POSICIONAMENTO DE CONTAINERS")
    print("=" * 80)
    
    # Executar testes
    print("\n1. Teste de validação de posição duplicada")
    print("-" * 40)
    testar_validacao_posicao_duplicada()
    
    print("\n2. Teste de validação de container flutuante")
    print("-" * 40)
    testar_validacao_container_flutuante()
    
    print("\n3. Teste de sugestões de posições válidas")
    print("-" * 40)
    testar_sugestoes_posicoes_validas()
    
    print("\n" + "=" * 80)
    print("TESTES CONCLUÍDOS!")
    print("=" * 80)

if __name__ == "__main__":
    executar_testes()
