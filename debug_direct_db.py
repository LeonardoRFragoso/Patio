#!/usr/bin/env python3
import sqlite3
import os

def debug_database_issue():
    print('🔍 INVESTIGAÇÃO DIRETA DO PROBLEMA NO BANCO')
    print('=' * 60)
    
    # Conectar diretamente ao banco
    db_path = 'database.db'
    if not os.path.exists(db_path):
        print('❌ Arquivo database.db não encontrado')
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Verificar todos os containers de Suzano
    print('📋 TODOS OS CONTAINERS DA UNIDADE SUZANO:')
    cursor.execute('SELECT id, numero, status, posicao_atual, unidade FROM containers WHERE unidade = ? ORDER BY id', ('Suzano',))
    todos_suzano = cursor.fetchall()
    
    print(f'Total encontrado: {len(todos_suzano)}')
    for id, numero, status, posicao, unidade in todos_suzano:
        print(f'  ID:{id:3d} | {numero:15s} | {status:15s} | {posicao:8s} | {unidade}')
    
    # 2. Aplicar EXATAMENTE os mesmos filtros do backend
    print('\n🎯 APLICANDO FILTROS EXATOS DO BACKEND:')
    cursor.execute('''
        SELECT id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho, armador
        FROM containers
        WHERE unidade = ? AND posicao_atual IS NOT NULL 
              AND posicao_atual != '' AND posicao_atual != 'EM TRANSITO'
        ORDER BY posicao_atual
    ''', ('Suzano',))
    
    containers_filtrados = cursor.fetchall()
    print(f'Containers após filtros: {len(containers_filtrados)}')
    
    for i, row in enumerate(containers_filtrados, 1):
        container_id, numero, status, posicao_atual, data_criacao, ultima_atualizacao, tamanho_real, armador = row
        print(f'{i:2d}. ID:{container_id:3d} | {numero:15s} | {status:15s} | {posicao_atual:8s} | {tamanho_real:3s}')
    
    # 3. Verificar especificamente os containers ausentes
    print('\n🚨 VERIFICANDO CONTAINERS AUSENTES:')
    containers_ausentes = [
        (135, 'TCLU1234567'),
        (136, 'MSCU9876543'), 
        (137, 'GESU5555444'),
        (138, 'CSNU7777888')
    ]
    
    for id_ausente, numero_ausente in containers_ausentes:
        cursor.execute('SELECT id, numero, status, posicao_atual, unidade FROM containers WHERE id = ?', (id_ausente,))
        resultado = cursor.fetchone()
        
        if resultado:
            id_db, numero_db, status_db, posicao_db, unidade_db = resultado
            print(f'  ID:{id_db:3d} | {numero_db:15s} | {status_db:15s} | {posicao_db or "NULL":8s} | {unidade_db}')
            
            # Verificar por que não passa no filtro
            if posicao_db is None:
                print(f'    ❌ MOTIVO: posicao_atual é NULL')
            elif posicao_db == '':
                print(f'    ❌ MOTIVO: posicao_atual é string vazia')
            elif posicao_db == 'EM TRANSITO':
                print(f'    ❌ MOTIVO: posicao_atual é "EM TRANSITO"')
            elif unidade_db != 'Suzano':
                print(f'    ❌ MOTIVO: unidade é "{unidade_db}", não "Suzano"')
            else:
                print(f'    ✅ DEVERIA PASSAR NO FILTRO!')
        else:
            print(f'  ID:{id_ausente:3d} | {numero_ausente:15s} - NÃO EXISTE NO BANCO')
    
    # 4. Verificar se há algum problema com encoding ou espaços
    print('\n🔍 VERIFICANDO PROBLEMAS DE ENCODING/ESPAÇOS:')
    cursor.execute('SELECT DISTINCT unidade FROM containers')
    unidades = cursor.fetchall()
    print('Unidades encontradas:')
    for (unidade,) in unidades:
        print(f'  "{unidade}" (length: {len(unidade)})')
    
    conn.close()

if __name__ == '__main__':
    debug_database_issue()
