#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para testar manualmente as validações de posicionamento de containers
"""

import sqlite3
from posicoes_suzano import patio_suzano

def main():
    print("\n=== TESTE MANUAL DE VALIDAÇÃO DE POSICIONAMENTO ===\n")
    
    # Conectar ao banco de dados
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    
    # Testar validação de posição duplicada
    print("1. Validação de posição duplicada:")
    # Criar container na posição A01-1 (ou usar um existente)
    print("\n1. Verificando posição A01-1...")
    cursor = conn.cursor()
    cursor.execute("SELECT numero FROM containers WHERE posicao_atual = 'A01-1'")
    container = cursor.fetchone()
    
    if container:
        print(f"  - Posição A01-1 já ocupada pelo container: {container['numero']}")
    else:
        print("  - Posição A01-1 está livre")
        
    # Tentar validar a mesma posição
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-1",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    print(f"  - Validação retornou: {resultado['valido']}")
    print(f"  - Mensagem: {resultado.get('mensagem', 'Nenhuma mensagem')}")
    
    # Testar validação de container flutuante
    print("\n2. Validação de container flutuante:")
    
    # Verificar se existe container na posição A01-1 (altura 1)
    cursor.execute("SELECT numero FROM containers WHERE posicao_atual = 'A01-1'")
    container_altura1 = cursor.fetchone()
    
    if container_altura1:
        print(f"  - Posição A01-1 (altura 1) ocupada pelo container: {container_altura1['numero']}")
    else:
        print("  - Posição A01-1 (altura 1) está livre")
    
    # Validar posição A01-2 (altura 2)
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-2",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    print(f"  - Validação para A01-2 (altura 2) retornou: {resultado['valido']}")
    print(f"  - Mensagem: {resultado.get('mensagem', 'Nenhuma mensagem')}")
    
    if not resultado['valido'] and 'sugestoes' in resultado:
        print(f"  - Sugestões: {', '.join(resultado['sugestoes'][:5])}")
    
    # Testar validação de container flutuante em altura 3
    print("\n3. Validação de container flutuante em altura 3:")
    
    # Verificar se existem containers nas posições A01-1 e A01-2
    cursor.execute("SELECT numero FROM containers WHERE posicao_atual = 'A01-1'")
    container_altura1 = cursor.fetchone()
    
    cursor.execute("SELECT numero FROM containers WHERE posicao_atual = 'A01-2'")
    container_altura2 = cursor.fetchone()
    
    if container_altura1:
        print(f"  - Posição A01-1 (altura 1) ocupada pelo container: {container_altura1['numero']}")
    else:
        print("  - Posição A01-1 (altura 1) está livre")
        
    if container_altura2:
        print(f"  - Posição A01-2 (altura 2) ocupada pelo container: {container_altura2['numero']}")
    else:
        print("  - Posição A01-2 (altura 2) está livre")
    
    # Validar posição A01-3 (altura 3)
    # Como a baia é 01 (ímpar), usamos tamanho_teu=20
    resultado = patio_suzano.validar_operacao(
        posicao="A01-3",
        status_container="CHEIO",
        db_connection=conn,
        tamanho_teu=20
    )
    
    print(f"  - Validação para A01-3 (altura 3) retornou: {resultado['valido']}")
    print(f"  - Mensagem: {resultado.get('mensagem', 'Nenhuma mensagem')}")
    
    conn.close()
    
    print("\n=== TESTE CONCLUÍDO ===")

if __name__ == "__main__":
    main()
