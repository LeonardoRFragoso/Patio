import sqlite3
import hashlib

def check_user_status():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Verificar estrutura da tabela
    cursor.execute('PRAGMA table_info(usuarios)')
    table_info = cursor.fetchall()
    print('=== ESTRUTURA DA TABELA USUARIOS ===')
    for col in table_info:
        print(f'Coluna: {col[1]}, Tipo: {col[2]}, Não Nulo: {col[3]}, Padrão: {col[4]}')
    
    # Verificar se usuário existe
    cursor.execute('SELECT * FROM usuarios WHERE username = ?', ('LeoFragoso',))
    user = cursor.fetchone()
    
    if user:
        print('\n=== USUÁRIO LEOFRAGOSO ENCONTRADO ===')
        columns = [desc[0] for desc in cursor.description]
        for i, col in enumerate(columns):
            if col == 'password_hash':
                print(f'{col}: [HASH OCULTO]')
            else:
                print(f'{col}: {user[i]}')
        
        # Verificar se coluna ativo existe
        if 'ativo' in columns:
            ativo_index = columns.index('ativo')
            if user[ativo_index] == 1:
                print('\n✅ Status: ATIVO')
            else:
                print('\n❌ Status: INATIVO - Este é o problema!')
        else:
            print('\n⚠️ Coluna "ativo" não existe na tabela')
            
        # Verificar nível
        if 'nivel' in columns:
            nivel = user[columns.index('nivel')]
            print(f'📋 Nível: {nivel}')
        
    else:
        print('❌ Usuário LeoFragoso não encontrado')
        
    # Verificar todos os usuários para comparação
    print('\n=== TODOS OS USUÁRIOS ===')
    try:
        cursor.execute('SELECT id, username, nivel FROM usuarios ORDER BY id')
        users = cursor.fetchall()
        for user in users:
            print(f'ID: {user[0]}, Username: {user[1]}, Nível: {user[2]}')
    except Exception as e:
        print(f'Erro ao listar usuários: {e}')
    
    conn.close()

if __name__ == "__main__":
    check_user_status()
