#!/usr/bin/env python3
import sqlite3
import os
import re

def analyze_database():
    # Conectar ao banco
    db_path = 'database.db'
    if not os.path.exists(db_path):
        print('❌ Arquivo database.db não encontrado')
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS')
    print('=' * 60)

    # 1. Analisar tabela containers
    print('\n📦 TABELA CONTAINERS:')
    cursor.execute('SELECT COUNT(*) FROM containers')
    total_containers = cursor.fetchone()[0]
    print(f'Total de registros: {total_containers}')

    cursor.execute('SELECT id, numero, status, posicao_atual, unidade, tamanho, armador FROM containers ORDER BY id')
    containers = cursor.fetchall()

    print('\nDetalhes dos containers:')
    for i, (id, numero, status, posicao, unidade, tamanho, armador) in enumerate(containers, 1):
        print(f'{i:2d}. ID:{id:2d} | {numero:15s} | Status: {status:15s} | Pos: {posicao or "NULL":8s} | Un: {unidade or "NULL":8s} | Tam: {tamanho or "NULL":3s} | Arm: {armador or "NULL"}')

    # 2. Analisar containers por critérios de filtro
    print('\n🔍 ANÁLISE POR CRITÉRIOS DE FILTRO:')

    # Containers com posição válida (não NULL, não vazio, não EM TRANSITO)
    cursor.execute('''
        SELECT COUNT(*) FROM containers 
        WHERE posicao_atual IS NOT NULL 
        AND posicao_atual != "" 
        AND posicao_atual != "EM TRANSITO"
    ''')
    containers_com_posicao = cursor.fetchone()[0]
    print(f'Containers com posição válida: {containers_com_posicao}')

    # Containers por unidade
    cursor.execute('SELECT unidade, COUNT(*) FROM containers GROUP BY unidade')
    por_unidade = cursor.fetchall()
    print('Containers por unidade:')
    for unidade, count in por_unidade:
        print(f'  - {unidade or "NULL"}: {count}')

    # 3. Verificar padrão de posições
    print('\n📍 ANÁLISE DE POSIÇÕES:')
    cursor.execute('SELECT numero, posicao_atual FROM containers WHERE posicao_atual IS NOT NULL AND posicao_atual != ""')
    posicoes = cursor.fetchall()

    padrao_valido = re.compile(r'^[A-E][0-9]{2}-[1-5]$')
    posicoes_validas = 0
    posicoes_invalidas = []

    for numero, posicao in posicoes:
        if padrao_valido.match(posicao):
            posicoes_validas += 1
        else:
            posicoes_invalidas.append((numero, posicao))

    print(f'Posições no formato válido (A01-1 a E20-5): {posicoes_validas}')
    print(f'Posições em formato inválido: {len(posicoes_invalidas)}')

    if posicoes_invalidas:
        print('Containers com posições inválidas:')
        for numero, posicao in posicoes_invalidas:
            print(f'  - {numero}: "{posicao}"')

    # 4. Análise específica para visualização 3D
    print('\n🎯 CONTAINERS QUE DEVERIAM APARECER NO 3D:')
    
    # Simular o filtro exato usado no backend
    cursor.execute('''
        SELECT numero, status, posicao_atual, unidade, tamanho, armador
        FROM containers
        WHERE posicao_atual IS NOT NULL 
        AND posicao_atual != "" 
        AND posicao_atual != "EM TRANSITO"
        ORDER BY posicao_atual
    ''')
    containers_filtrados = cursor.fetchall()
    
    print(f'Containers que passam pelo filtro SQL: {len(containers_filtrados)}')
    
    containers_3d_validos = 0
    for numero, status, posicao, unidade, tamanho, armador in containers_filtrados:
        # Aplicar formatação de posição
        if posicao and len(posicao) == 4 and posicao[0].isalpha() and posicao[1:].isdigit():
            posicao_formatada = f"{posicao[0]}{posicao[1:3]}-{posicao[3]}"
        else:
            posicao_formatada = posicao
            
        # Verificar regex
        if padrao_valido.match(posicao_formatada):
            containers_3d_validos += 1
            print(f'  ✅ {numero} | {status} | {posicao_formatada} | {unidade} | {tamanho}')
        else:
            print(f'  ❌ {numero} | {status} | {posicao_formatada} | {unidade} | {tamanho} (FILTRADO)')
    
    print(f'\n🎯 RESULTADO FINAL: {containers_3d_validos} containers deveriam aparecer no 3D')

    # 5. Verificar outras tabelas
    print('\n📊 OUTRAS TABELAS:')
    
    cursor.execute('SELECT COUNT(*) FROM operacoes')
    total_operacoes = cursor.fetchone()[0]
    print(f'Total de operações: {total_operacoes}')
    
    cursor.execute('SELECT COUNT(*) FROM vistorias')
    total_vistorias = cursor.fetchone()[0]
    print(f'Total de vistorias: {total_vistorias}')

    conn.close()

if __name__ == '__main__':
    analyze_database()
