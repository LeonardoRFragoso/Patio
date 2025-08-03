import sqlite3
import hashlib
from werkzeug.security import generate_password_hash, check_password_hash

def test_hash_compatibility():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print('=== TESTE DE COMPATIBILIDADE DE HASH ===\n')
    
    # Verificar hash do LeoFragoso
    cursor.execute('SELECT username, password_hash FROM usuarios WHERE username = ?', ('LeoFragoso',))
    leo_user = cursor.fetchone()
    
    if leo_user:
        leo_hash = leo_user[1]
        print(f'📋 LEOFRAGOSO:')
        print(f'   Hash atual: {leo_hash}')
        print(f'   Tipo de hash: {"SHA1" if len(leo_hash) == 40 else "Werkzeug/Flask"}')
        
        # Testar senha Leo@2025 com hash atual
        test_password = "Leo@2025"
        
        # Teste 1: SHA1 (usado no script de ativação)
        sha1_hash = hashlib.sha1(test_password.encode()).hexdigest()
        sha1_match = (leo_hash == sha1_hash)
        print(f'   Teste SHA1: {"✅ MATCH" if sha1_match else "❌ NO MATCH"}')
        
        # Teste 2: Werkzeug (usado pelo Flask)
        try:
            werkzeug_match = check_password_hash(leo_hash, test_password)
            print(f'   Teste Werkzeug: {"✅ MATCH" if werkzeug_match else "❌ NO MATCH"}')
        except:
            print(f'   Teste Werkzeug: ❌ ERRO (hash incompatível)')
        
        # Se não funcionar, vamos corrigir com hash Werkzeug
        if not werkzeug_match:
            print(f'\n🔧 CORRIGINDO HASH PARA WERKZEUG...')
            new_hash = generate_password_hash(test_password)
            cursor.execute('UPDATE usuarios SET password_hash = ? WHERE username = ?', (new_hash, 'LeoFragoso'))
            conn.commit()
            
            # Testar novamente
            verify_test = check_password_hash(new_hash, test_password)
            print(f'   Novo hash: {new_hash[:50]}...')
            print(f'   Verificação: {"✅ SUCESSO" if verify_test else "❌ FALHA"}')
    
    # Comparar com operador1 que funciona
    print(f'\n📋 OPERADOR1 (REFERÊNCIA):')
    cursor.execute('SELECT username, password_hash FROM usuarios WHERE username = ?', ('operador1',))
    op1_user = cursor.fetchone()
    
    if op1_user:
        op1_hash = op1_user[1]
        print(f'   Hash: {op1_hash[:50]}...')
        print(f'   Tipo de hash: {"SHA1" if len(op1_hash) == 40 else "Werkzeug/Flask"}')
        
        # Testar senhas comuns no operador1
        common_passwords = ['123456', 'admin', 'operador', 'operador1', 'senha123']
        for pwd in common_passwords:
            try:
                if check_password_hash(op1_hash, pwd):
                    print(f'   Senha do operador1: {pwd}')
                    break
            except:
                pass
    
    # Verificar outros usuários criados via registro
    print(f'\n📋 USUÁRIOS CRIADOS VIA REGISTRO:')
    cursor.execute('''
        SELECT username, password_hash, created_at 
        FROM usuarios 
        WHERE created_at > '2025-08-01' 
        AND username != 'LeoFragoso'
        ORDER BY created_at DESC
    ''')
    recent_users = cursor.fetchall()
    
    for user in recent_users:
        username, hash_val, created = user
        hash_type = "SHA1" if len(hash_val) == 40 else "Werkzeug/Flask"
        print(f'   {username}: {hash_type} hash, criado em {created}')
    
    conn.close()

if __name__ == "__main__":
    test_hash_compatibility()
