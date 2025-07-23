#!/usr/bin/env python3
import sqlite3
import os

def debug_sql_query():
    # Conectar ao banco
    db_path = 'database.db'
    if not os.path.exists(db_path):
        print('❌ Arquivo database.db não encontrado')
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print('🔍 TESTANDO A CONSULTA SQL EXATA DO BACKEND')
    print('=' * 60)

    # Testar a consulta exata usada no backend
    unidade = 'Suzano'
    
    print(f'🎯 Testando para unidade: {unidade}')
    print('\n📋 CONSULTA SQL:')
    query = '''
        SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho, armador
        FROM containers
        WHERE unidade = ? AND posicao_atual IS NOT NULL 
              AND posicao_atual != '' AND posicao_atual != 'EM TRANSITO'
        ORDER BY posicao_atual
    '''
    print(query)
    
    cursor.execute(query, (unidade,))
    containers_raw = cursor.fetchall()
    
    print(f'\n📦 RESULTADO: {len(containers_raw)} containers encontrados')
    print('\nDetalhes:')
    for i, (id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho, armador) in enumerate(containers_raw, 1):
        print(f'{i:2d}. ID:{id:3d} | {numero:15s} | {status:15s} | {posicao_atual:8s} | {tamanho:3s} | {armador}')
    
    # Verificar se há containers que não passam no filtro
    print('\n🔍 VERIFICANDO CONTAINERS QUE NÃO PASSAM NO FILTRO:')
    
    cursor.execute('SELECT id, numero, status, posicao_atual, unidade FROM containers WHERE unidade = ?', (unidade,))
    todos_containers = cursor.fetchall()
    
    print(f'Total de containers da unidade {unidade}: {len(todos_containers)}')
    
    containers_filtrados = []
    for id, numero, status, posicao_atual, unidade_container in todos_containers:
        # Aplicar os mesmos filtros
        if posicao_atual is None or posicao_atual == '' or posicao_atual == 'EM TRANSITO':
            containers_filtrados.append((numero, status, posicao_atual, 'Posição inválida'))
    
    if containers_filtrados:
        print('\nContainers FILTRADOS:')
        for numero, status, posicao, motivo in containers_filtrados:
            print(f'  ❌ {numero} | {status} | {posicao or "NULL"} | {motivo}')
    else:
        print('\n✅ Nenhum container foi filtrado pela consulta SQL')
    
    # Verificar se há diferença entre os dados mostrados e os logs
    print('\n🔍 COMPARAÇÃO COM OS LOGS DO BACKEND:')
    containers_nos_logs = ['TESTE123', 'TESTE', 'TESTE1234544S', 'HDMU3333222']
    containers_encontrados = [row[1] for row in containers_raw]
    
    print('Containers nos logs do backend:', containers_nos_logs)
    print('Containers encontrados na consulta:', containers_encontrados)
    
    ausentes = [c for c in containers_encontrados if c not in containers_nos_logs]
    extras_nos_logs = [c for c in containers_nos_logs if c not in containers_encontrados]
    
    if ausentes:
        print(f'\n❌ Containers encontrados mas NÃO nos logs: {ausentes}')
    if extras_nos_logs:
        print(f'\n❌ Containers nos logs mas NÃO encontrados: {extras_nos_logs}')
    
    if not ausentes and not extras_nos_logs:
        print('\n✅ Consulta SQL retorna exatamente os mesmos containers dos logs')
    
    conn.close()

if __name__ == '__main__':
    debug_sql_query()
