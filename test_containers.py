#!/usr/bin/env python3
import sqlite3

def test_containers():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print('=== CONTAINERS NO PÁTIO ===')
    cursor.execute('SELECT numero, status, unidade FROM containers WHERE status = "no patio"')
    containers = cursor.fetchall()
    for c in containers:
        print(f'Container: {c["numero"]}, Status: {c["status"]}, Unidade: {c["unidade"]}')

    print('\n=== OPERAÇÕES DE DESCARGA ===')
    cursor.execute('''
    SELECT o.id, o.tipo, c.numero, c.unidade, o.data_operacao
    FROM operacoes o
    JOIN containers c ON o.container_id = c.id
    WHERE o.tipo = "descarga" AND c.status = "no patio"
    ORDER BY o.data_operacao DESC
    ''')
    operacoes = cursor.fetchall()
    for op in operacoes:
        print(f'Op ID: {op["id"]}, Container: {op["numero"]}, Unidade: {op["unidade"]}, Data: {op["data_operacao"]}')

    print('\n=== CONSULTA COMPLETA (COMO ADMIN ADMINISTRATIVO) ===')
    cursor.execute('''
    SELECT 
        o.id AS operacao_id,
        c.numero AS container_numero,
        c.posicao_atual,
        c.status,
        o.data_operacao,
        o.tipo,
        c.unidade
    FROM operacoes o
    JOIN containers c ON o.container_id = c.id
    JOIN (SELECT container_id, MAX(data_operacao) as ultima_data 
          FROM operacoes 
          GROUP BY container_id) ultima 
        ON o.container_id = ultima.container_id AND o.data_operacao = ultima.ultima_data
    WHERE o.tipo = "descarga"
        AND c.status = "no patio"
        AND o.id IS NOT NULL
        AND c.id IS NOT NULL
    ORDER BY o.data_operacao DESC
    LIMIT 50
    ''')
    
    resultados = cursor.fetchall()
    print(f'Total de containers encontrados: {len(resultados)}')
    for r in resultados:
        print(f'Op: {r["operacao_id"]}, Container: {r["container_numero"]}, Unidade: {r["unidade"]}, Posição: {r["posicao_atual"]}')

    conn.close()

if __name__ == '__main__':
    test_containers()
