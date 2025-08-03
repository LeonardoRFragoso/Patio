import sqlite3

def fix_primeiro_login():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Verificar status atual
    cursor.execute('SELECT username, primeiro_login FROM usuarios WHERE username = ?', ('LeoFragoso',))
    user = cursor.fetchone()
    
    if user:
        print(f'=== USUÁRIO LEOFRAGOSO ===')
        print(f'Username: {user[0]}')
        print(f'primeiro_login atual: {user[1]} ({"✅ SIM" if user[1] == 1 else "❌ NÃO"})')
        
        if user[1] == 1:
            print('\n🔧 CORRIGINDO primeiro_login de 1 para 0...')
            
            # Atualizar primeiro_login para 0 (não é mais primeiro login)
            cursor.execute('UPDATE usuarios SET primeiro_login = 0 WHERE username = ?', ('LeoFragoso',))
            conn.commit()
            
            # Verificar se foi atualizado
            cursor.execute('SELECT username, primeiro_login FROM usuarios WHERE username = ?', ('LeoFragoso',))
            updated_user = cursor.fetchone()
            
            if updated_user and updated_user[1] == 0:
                print('✅ SUCESSO! primeiro_login atualizado para 0')
                print(f'Novo valor: {updated_user[1]} (❌ NÃO)')
            else:
                print('❌ ERRO: Falha ao atualizar primeiro_login')
        else:
            print(f'ℹ️ primeiro_login já é {user[1]} - não precisa alterar')
    else:
        print('❌ Usuário LeoFragoso não encontrado')
    
    # Comparar com operador1 para confirmar
    print('\n=== COMPARAÇÃO COM OPERADOR1 ===')
    cursor.execute('SELECT username, primeiro_login FROM usuarios WHERE username IN (?, ?)', ('operador1', 'LeoFragoso'))
    users = cursor.fetchall()
    
    for user in users:
        status = "✅ SIM" if user[1] == 1 else "❌ NÃO"
        print(f'{user[0]}: primeiro_login = {user[1]} ({status})')
    
    conn.close()

if __name__ == "__main__":
    fix_primeiro_login()
