import sqlite3

def compare_users():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Buscar dados dos dois usuários
    users_to_check = ['operador1', 'LeoFragoso']
    
    print('=== COMPARAÇÃO DE USUÁRIOS ===\n')
    
    for username in users_to_check:
        cursor.execute('SELECT * FROM usuarios WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if user:
            print(f'📋 USUÁRIO: {username}')
            columns = [desc[0] for desc in cursor.description]
            for i, col in enumerate(columns):
                if col == 'password_hash':
                    print(f'  {col}: [HASH OCULTO]')
                else:
                    value = user[i]
                    if col in ['senha_temporaria', 'primeiro_login']:
                        status = "✅ SIM" if value == 1 else "❌ NÃO"
                        print(f'  {col}: {value} ({status})')
                    else:
                        print(f'  {col}: {value}')
            print('-' * 50)
        else:
            print(f'❌ Usuário {username} não encontrado\n')
    
    # Verificar diferenças críticas
    print('\n=== ANÁLISE DE DIFERENÇAS ===')
    
    cursor.execute('SELECT username, nivel, senha_temporaria, primeiro_login, unidade FROM usuarios WHERE username IN (?, ?)', users_to_check)
    users_data = cursor.fetchall()
    
    if len(users_data) == 2:
        user1, user2 = users_data
        print(f'Operador1: nível={user1[1]}, senha_temp={user1[2]}, primeiro_login={user1[3]}, unidade={user1[4]}')
        print(f'LeoFragoso: nível={user2[1]}, senha_temp={user2[2]}, primeiro_login={user2[3]}, unidade={user2[4]}')
        
        # Identificar diferenças
        if user1[1] != user2[1]:
            print(f'⚠️ DIFERENÇA DE NÍVEL: {user1[1]} vs {user2[1]}')
        if user1[2] != user2[2]:
            print(f'⚠️ DIFERENÇA SENHA_TEMPORARIA: {user1[2]} vs {user2[2]}')
        if user1[3] != user2[3]:
            print(f'⚠️ DIFERENÇA PRIMEIRO_LOGIN: {user1[3]} vs {user2[3]}')
        if user1[4] != user2[4]:
            print(f'⚠️ DIFERENÇA UNIDADE: {user1[4]} vs {user2[4]}')
    
    conn.close()

if __name__ == "__main__":
    compare_users()
