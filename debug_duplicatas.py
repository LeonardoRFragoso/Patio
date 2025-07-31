#!/usr/bin/env python3
import sqlite3

def check_duplicates():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print('=== VERIFICANDO DUPLICATAS NO BANCO ===')
    cursor.execute('SELECT numero, COUNT(*) as count FROM containers GROUP BY numero HAVING COUNT(*) > 1')
    duplicatas = cursor.fetchall()
    
    if duplicatas:
        print('Containers duplicados encontrados:')
        for numero, count in duplicatas:
            print(f'  {numero}: {count} registros')
    else:
        print('Nenhuma duplicata encontrada no banco')
    
    print('\n=== CONTAGEM TOTAL DE CONTAINERS ===')
    cursor.execute('SELECT COUNT(*) FROM containers')
    total = cursor.fetchone()[0]
    print(f'Total de containers no banco: {total}')
    
    print('\n=== CONTAINERS ÚNICOS ===')
    cursor.execute('SELECT COUNT(DISTINCT numero) FROM containers')
    unicos = cursor.fetchone()[0]
    print(f'Containers únicos por número: {unicos}')
    
    print('\n=== TODOS OS CONTAINERS ===')
    cursor.execute('SELECT id, numero, unidade, status FROM containers ORDER BY numero, id')
    containers = cursor.fetchall()
    for container in containers:
        print(f'ID: {container[0]}, Número: {container[1]}, Unidade: {container[2]}, Status: {container[3]}')
    
    print('\n=== TESTANDO API QUERY CORRIGIDA ===')
    # Simular a query da API corrigida
    query = """
        SELECT c.id, c.numero, c.unidade, c.status, c.posicao_atual, c.tamanho, 
               c.armador, c.data_criacao, c.ultima_atualizacao, c.tipo_container,
               c.capacidade, c.tara, c.booking,
               (
                   SELECT u.nome 
                   FROM usuarios u 
                   WHERE u.unidade = c.unidade 
                   LIMIT 1
               ) as nome_unidade
        FROM containers c
        WHERE 1=1
        ORDER BY c.data_criacao DESC, c.numero ASC
        LIMIT 50 OFFSET 0
    """
    
    cursor.execute(query)
    api_results = cursor.fetchall()
    print(f'Resultados da API: {len(api_results)} registros')
    
    # Verificar se há duplicatas na resposta da API
    numeros_api = [row[1] for row in api_results]
    numeros_unicos = set(numeros_api)
    
    if len(numeros_api) != len(numeros_unicos):
        print('PROBLEMA: API retorna duplicatas!')
        from collections import Counter
        contador = Counter(numeros_api)
        for numero, count in contador.items():
            if count > 1:
                print(f'  {numero}: {count} vezes na resposta da API')
    else:
        print('✅ API não retorna duplicatas - PROBLEMA RESOLVIDO!')
    
    conn.close()

if __name__ == '__main__':
    check_duplicates()
