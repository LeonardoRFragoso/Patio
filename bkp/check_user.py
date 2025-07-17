import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

cursor.execute('SELECT username, nivel, unidade FROM usuarios WHERE username = "operador1"')
result = cursor.fetchone()

if result:
    print(f"Usuário: {result[0]}")
    print(f"Nível: {result[1]}")
    print(f"Unidade: {result[2]}")
else:
    print("Usuário não encontrado")

conn.close()
