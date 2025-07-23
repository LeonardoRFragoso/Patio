import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

print('🔍 VERIFICANDO CONTAINERS DA UNIDADE SUZANO')
print('=' * 50)

# Buscar todos os containers de Suzano
cursor.execute('SELECT id, numero, status, posicao_atual, unidade FROM containers WHERE unidade = ? ORDER BY id', ('Suzano',))
todos_suzano = cursor.fetchall()

print(f'Total de containers da unidade Suzano: {len(todos_suzano)}')
print()

for id, numero, status, posicao, unidade in todos_suzano:
    # Verificar se passa nos filtros
    filtro_ok = posicao is not None and posicao != '' and posicao != 'EM TRANSITO'
    status_filtro = '✅' if filtro_ok else '❌'
    pos_display = posicao if posicao else 'NULL'
    print(f'{status_filtro} ID:{id} | {numero} | {status} | Pos: {pos_display} | {unidade}')

print('\n🎯 TESTANDO CONSULTA EXATA DO BACKEND:')
cursor.execute('''
    SELECT id, numero, status, posicao_atual 
    FROM containers 
    WHERE unidade = ? AND posicao_atual IS NOT NULL 
          AND posicao_atual != "" AND posicao_atual != "EM TRANSITO"
    ORDER BY posicao_atual
''', ('Suzano',))

resultado = cursor.fetchall()
print(f'Resultado da consulta backend: {len(resultado)} containers')
for id, numero, status, posicao in resultado:
    print(f'  - {numero} | {status} | {posicao}')

conn.close()
