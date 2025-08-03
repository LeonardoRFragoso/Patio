import sqlite3

def fix_user_level():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Verificar nível atual
    cursor.execute('SELECT username, nivel FROM usuarios WHERE username = ?', ('LeoFragoso',))
    user = cursor.fetchone()
    
    if user:
        print(f'=== USUÁRIO ENCONTRADO ===')
        print(f'Username: {user[0]}')
        print(f'Nível atual: {user[1]}')
        
        if user[1] == 'user':
            print('\n🔧 CORRIGINDO NÍVEL DE "user" PARA "operador"...')
            
            # Atualizar nível para operador
            cursor.execute('UPDATE usuarios SET nivel = ? WHERE username = ?', ('operador', 'LeoFragoso'))
            conn.commit()
            
            # Verificar se foi atualizado
            cursor.execute('SELECT username, nivel FROM usuarios WHERE username = ?', ('LeoFragoso',))
            updated_user = cursor.fetchone()
            
            if updated_user and updated_user[1] == 'operador':
                print('✅ SUCESSO! Nível atualizado para "operador"')
                print(f'Novo nível: {updated_user[1]}')
            else:
                print('❌ ERRO: Falha ao atualizar nível')
        else:
            print(f'ℹ️ Nível já é "{user[1]}" - não precisa alterar')
    else:
        print('❌ Usuário LeoFragoso não encontrado')
    
    # Mostrar todos os níveis válidos no sistema
    print('\n=== NÍVEIS VÁLIDOS NO SISTEMA ===')
    cursor.execute('SELECT DISTINCT nivel FROM usuarios ORDER BY nivel')
    niveis = cursor.fetchall()
    for nivel in niveis:
        print(f'- {nivel[0]}')
    
    conn.close()

if __name__ == "__main__":
    fix_user_level()
