#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para verificar os containers no banco de dados
"""

import sqlite3
import sys

def main():
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("\n=== VERIFICAÇÃO DE CONTAINERS NO BANCO DE DADOS ===\n")
        
        # Verificar todos os containers
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
        ''')
        containers = cursor.fetchall()
        
        print(f"1. Total de containers no banco: {len(containers)}")
        for c in containers:
            print(f"- Número: {c['numero']}, Status: {c['status']}, Posição: {c['posicao_atual']}, Unidade: {c['unidade']}")
        
        # Verificar containers na unidade Floriano
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE unidade = 'Floriano'
        ''')
        containers_floriano = cursor.fetchall()
        
        print(f"\n2. Containers na unidade Floriano: {len(containers_floriano)}")
        for c in containers_floriano:
            print(f"- Número: {c['numero']}, Status: {c['status']}, Posição: {c['posicao_atual']}, Unidade: {c['unidade']}")
        
        # Verificar containers no pátio ou carregados na unidade Floriano
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE status IN ('no patio', 'carregado')
            AND unidade = 'Floriano'
        ''')
        containers_patio_floriano = cursor.fetchall()
        
        print(f"\n3. Containers com status 'no patio' ou 'carregado' na unidade Floriano: {len(containers_patio_floriano)}")
        for c in containers_patio_floriano:
            print(f"- Número: {c['numero']}, Status: {c['status']}, Posição: {c['posicao_atual']}, Unidade: {c['unidade']}")
        
        # Verificar a consulta exata que estamos usando na função listar_containers_movimentacao
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
        
        print(f"\n4. Containers disponíveis para movimentação (consulta exata): {len(containers_movimentacao)}")
        for c in containers_movimentacao:
            print(f"- Número: {c['numero']}, Status: {c['status']}, Posição: {c['posicao_atual']}, Unidade: {c['unidade']}")
        
        # Verificar case sensitivity na unidade
        cursor.execute('''
            SELECT DISTINCT unidade FROM containers
        ''')
        unidades = cursor.fetchall()
        
        print(f"\n5. Unidades distintas no banco: {len(unidades)}")
        for u in unidades:
            print(f"- Unidade: '{u['unidade']}'")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"Erro ao acessar o banco de dados: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
