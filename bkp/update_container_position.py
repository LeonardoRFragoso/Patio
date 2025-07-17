#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para atualizar a posição de um container no banco de dados
"""

import sqlite3
import sys
from datetime import datetime

def main():
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("\n=== ATUALIZAÇÃO DE POSIÇÃO DE CONTAINER ===\n")
        
        # Verificar o container XZNL0629338
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, unidade 
            FROM containers
            WHERE numero = 'XZNL0629338'
        ''')
        container = cursor.fetchone()
        
        if not container:
            print("Container XZNL0629338 não encontrado no banco de dados.")
            return
        
        print(f"Container encontrado: {container['numero']}")
        print(f"Status atual: {container['status']}")
        print(f"Posição atual: {container['posicao_atual']}")
        print(f"Unidade: {container['unidade']}")
        
        # Atualizar a posição do container
        nova_posicao = "A01-1"
        data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.execute('''
            UPDATE containers
            SET posicao_atual = ?, ultima_atualizacao = ?
            WHERE id = ?
        ''', (nova_posicao, data_atual, container['id']))
        
        conn.commit()
        
        # Verificar se a atualização foi bem-sucedida
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE numero = 'XZNL0629338'
        ''')
        container_atualizado = cursor.fetchone()
        
        print("\nContainer atualizado:")
        print(f"Número: {container_atualizado['numero']}")
        print(f"Status: {container_atualizado['status']}")
        print(f"Nova posição: {container_atualizado['posicao_atual']}")
        print(f"Unidade: {container_atualizado['unidade']}")
        
        # Verificar containers disponíveis para movimentação
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE status IN ('no patio', 'carregado') 
            AND posicao_atual IS NOT NULL 
            AND posicao_atual != ''
            AND unidade = 'Floriano'
            ORDER BY ultima_atualizacao DESC
        ''')
        containers_movimentacao = cursor.fetchall()
        
        print(f"\nContainers disponíveis para movimentação após atualização: {len(containers_movimentacao)}")
        for c in containers_movimentacao:
            print(f"- Número: {c['numero']}, Status: {c['status']}, Posição: {c['posicao_atual']}, Unidade: {c['unidade']}")
        
        print("\n=== ATUALIZAÇÃO CONCLUÍDA ===")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"Erro ao acessar o banco de dados: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
