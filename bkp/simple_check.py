import sqlite3
import os

# Conectar ao banco de dados
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

print("=== CONTAINERS DISPONÍVEIS PARA CARREGAMENTO ===")
cursor.execute("SELECT numero, status, posicao_atual, unidade FROM containers WHERE status = 'no patio' ORDER BY numero;")
containers_disponiveis = cursor.fetchall()

if containers_disponiveis:
    print(f"Encontrados {len(containers_disponiveis)} containers disponíveis:")
    for container in containers_disponiveis:
        numero, status, posicao, unidade = container
        print(f"  - {numero} | Status: {status} | Posição: {posicao} | Unidade: {unidade}")
else:
    print("Nenhum container disponível para carregamento (status 'no patio')")

print("\n=== CONTAINERS CARREGADOS ===")
cursor.execute("SELECT numero, status, posicao_atual, unidade FROM containers WHERE status = 'carregado' ORDER BY numero;")
containers_carregados = cursor.fetchall()

if containers_carregados:
    print(f"Encontrados {len(containers_carregados)} containers carregados:")
    for container in containers_carregados:
        numero, status, posicao, unidade = container
        print(f"  - {numero} | Status: {status} | Posição: {posicao} | Unidade: {unidade}")

print("\n=== RESUMO POR STATUS ===")
cursor.execute("SELECT status, COUNT(*) FROM containers GROUP BY status ORDER BY status;")
resumo_status = cursor.fetchall()

for status, count in resumo_status:
    print(f"  - {status}: {count} containers")

conn.close()
