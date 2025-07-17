import sqlite3
import os

# Caminho para o banco de dados
db_path = 'C:/Users/leonardo.fragoso/Desktop/Projetos/patio-servidor/backend/database.db'

print(f"Verificando banco de dados em: {db_path}")
print(f"O arquivo existe? {os.path.exists(db_path)}")

# Conectar ao banco de dados
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Obter informações sobre a tabela containers
    print("\n=== ESQUEMA DA TABELA CONTAINERS ===")
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
except Exception as e:
    print(f"Erro ao acessar o banco de dados: {e}")
    
    # Listar arquivos no diretório backend para verificar onde está o banco de dados
    backend_dir = 'C:/Users/leonardo.fragoso/Desktop/Projetos/patio-servidor/backend'
    print(f"\nArquivos no diretório backend:")
    for root, dirs, files in os.walk(backend_dir):
        for file in files:
            if file.endswith('.db'):
                print(f"Encontrado arquivo de banco de dados: {os.path.join(root, file)}")
