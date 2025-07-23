#!/usr/bin/env python3
"""
Script para debugar a conexão exata do Flask com o banco de dados
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
import sqlite3

def debug_flask_database():
    print('🔍 TESTANDO CONEXÃO EXATA DO FLASK COM O BANCO')
    print('=' * 60)
    
    try:
        # Usar a mesma função que o Flask usa
        db = get_db()
        cursor = db.cursor()
        
        # Testar a consulta EXATA usada no backend
        unidade = 'Suzano'
        
        print(f'🎯 Testando para unidade: {unidade}')
        print('\n📋 CONSULTA SQL EXATA DO BACKEND:')
        
        cursor.execute('''
            SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho, armador
            FROM containers
            WHERE unidade = ? AND posicao_atual IS NOT NULL 
                  AND posicao_atual != '' AND posicao_atual != 'EM TRANSITO'
            ORDER BY posicao_atual
        ''', (unidade,))
        
        containers_raw = cursor.fetchall()
        
        print(f'\n📦 RESULTADO: {len(containers_raw)} containers encontrados')
        print('\nDetalhes:')
        for i, row in enumerate(containers_raw, 1):
            container_id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho_real, armador = row
            print(f'{i:2d}. ID:{container_id:3d} | {numero:15s} | {status:15s} | {posicao_atual:8s} | {tamanho_real:3s} | {armador}')
        
        # Verificar TODOS os containers de Suzano (sem filtros)
        print('\n🔍 VERIFICANDO TODOS OS CONTAINERS DE SUZANO (SEM FILTROS):')
        cursor.execute('SELECT id, numero, status, posicao_atual, unidade FROM containers WHERE unidade = ? ORDER BY id', (unidade,))
        todos_suzano = cursor.fetchall()
        
        print(f'Total de containers da unidade Suzano: {len(todos_suzano)}')
        for id, numero, status, posicao, unidade_container in todos_suzano:
            # Verificar se passa nos filtros
            filtro_ok = posicao is not None and posicao != '' and posicao != 'EM TRANSITO'
            status_filtro = '✅' if filtro_ok else '❌'
            print(f'{status_filtro} ID:{id:3d} | {numero:15s} | {status:15s} | {posicao or "NULL":8s}')
        
        # Verificar se há diferença entre os containers esperados e encontrados
        print('\n🎯 ANÁLISE DE DISCREPÂNCIA:')
        containers_esperados = [
            (135, 'TCLU1234567'),
            (136, 'MSCU9876543'), 
            (137, 'GESU5555444'),
            (138, 'CSNU7777888'),
            (139, 'HDMU3333222'),
            (140, 'TESTE'),
            (142, 'TESTE123'),
            (143, 'TESTE1234544S')
        ]
        
        containers_encontrados = [(row[0], row[1]) for row in containers_raw]
        
        print('Containers esperados (8):')
        for id, numero in containers_esperados:
            if (id, numero) in containers_encontrados:
                print(f'  ✅ ID:{id:3d} | {numero}')
            else:
                print(f'  ❌ ID:{id:3d} | {numero} - AUSENTE')
        
        ausentes = [item for item in containers_esperados if item not in containers_encontrados]
        if ausentes:
            print(f'\n🚨 CONTAINERS AUSENTES: {len(ausentes)}')
            for id, numero in ausentes:
                # Verificar por que está ausente
                cursor.execute('SELECT id, numero, status, posicao_atual, unidade FROM containers WHERE id = ?', (id,))
                container_info = cursor.fetchone()
                if container_info:
                    id_db, numero_db, status_db, posicao_db, unidade_db = container_info
                    print(f'    ID:{id_db} | {numero_db} | {status_db} | {posicao_db or "NULL"} | {unidade_db}')
                else:
                    print(f'    ID:{id} | {numero} - NÃO EXISTE NO BANCO')
        
        db.close()
        
    except Exception as e:
        print(f'❌ ERRO: {e}')

if __name__ == '__main__':
    debug_flask_database()
