import sqlite3
import os

# Caminho para o banco de dados
db_path = os.path.join('backend', 'database', 'patio.db')

# Conectar ao banco de dados
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Obter informações sobre a tabela containers
print("=== ESQUEMA DA TABELA CONTAINERS ===")
cursor.execute("PRAGMA table_info(containers)")
columns = cursor.fetchall()
for col in columns:
    print(f"Coluna {col[0]}: {col[1]} ({col[2]}) {'NOT NULL' if col[3] else 'NULL'} {'PRIMARY KEY' if col[5] else ''}")

# Verificar os primeiros registros da tabela
print("\n=== AMOSTRA DE DADOS DA TABELA CONTAINERS ===")
cursor.execute("SELECT * FROM containers LIMIT 3")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print("Nenhum registro encontrado")

# Verificar o esquema da tabela vistorias para comparação
print("\n=== ESQUEMA DA TABELA VISTORIAS ===")
cursor.execute("PRAGMA table_info(vistorias)")
columns = cursor.fetchall()
for col in columns:
    print(f"Coluna {col[0]}: {col[1]} ({col[2]}) {'NOT NULL' if col[3] else 'NULL'} {'PRIMARY KEY' if col[5] else ''}")

# Fechar a conexão
conn.close()
