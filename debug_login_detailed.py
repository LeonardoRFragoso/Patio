import sqlite3
from werkzeug.security import check_password_hash

def debug_login_detailed():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print('=== DEBUG DETALHADO DO LOGIN ===\n')
    
    # Verificar dados completos do LeoFragoso
    cursor.execute('SELECT * FROM usuarios WHERE username = ?', ('LeoFragoso',))
    user = cursor.fetchone()
    
    if user:
        columns = [desc[0] for desc in cursor.description]
        user_dict = dict(zip(columns, user))
        
        print('📋 DADOS COMPLETOS DO LEOFRAGOSO:')
        for key, value in user_dict.items():
            if key == 'password_hash':
                print(f'  {key}: [HASH PRESENTE: {len(str(value))} chars]')
            else:
                print(f'  {key}: {value}')
        
        print('\n🔍 VERIFICAÇÕES CRÍTICAS:')
        
        # 1. Verificar se o hash da senha está válido
        password_hash = user_dict.get('password_hash')
        if password_hash and len(str(password_hash)) > 10:
            print('✅ Hash da senha: PRESENTE e válido')
        else:
            print('❌ Hash da senha: INVÁLIDO ou ausente')
        
        # 2. Verificar nível
        nivel = user_dict.get('nivel')
        print(f'✅ Nível: {nivel} ({"VÁLIDO" if nivel == "operador" else "INVÁLIDO"})')
        
        # 3. Verificar unidade
        unidade = user_dict.get('unidade')
        print(f'✅ Unidade: {unidade}')
        
        # 4. Verificar campos que podem bloquear
        senha_temporaria = user_dict.get('senha_temporaria', 0)
        primeiro_login = user_dict.get('primeiro_login', 0)
        print(f'📋 senha_temporaria: {senha_temporaria} ({"BLOQUEADO" if senha_temporaria == 1 else "OK"})')
        print(f'📋 primeiro_login: {primeiro_login} ({"PRIMEIRO LOGIN" if primeiro_login == 1 else "OK"})')
        
        # 5. Verificar se há tentativas de login bloqueadas
        print('\n🔒 VERIFICANDO TENTATIVAS DE LOGIN:')
        try:
            cursor.execute('SELECT * FROM login_attempts WHERE username = ? ORDER BY timestamp DESC LIMIT 5', ('LeoFragoso',))
            attempts = cursor.fetchall()
            if attempts:
                print(f'  Encontradas {len(attempts)} tentativas recentes:')
                for attempt in attempts:
                    print(f'    {attempt}')
            else:
                print('  ✅ Nenhuma tentativa de login registrada')
        except Exception as e:
            print(f'  ⚠️ Erro ao verificar tentativas: {e}')
        
        # 6. Testar hash da senha com uma senha comum
        print('\n🔐 TESTANDO HASH DA SENHA:')
        test_passwords = ['123456', 'admin', 'operador', 'LeoFragoso', 'leo123', 'fragoso']
        for test_pass in test_passwords:
            try:
                if check_password_hash(password_hash, test_pass):
                    print(f'  ✅ Senha encontrada: {test_pass}')
                    break
            except:
                pass
        else:
            print('  ❌ Nenhuma senha comum funcionou')
    
    else:
        print('❌ Usuário LeoFragoso não encontrado')
    
    # Comparar com operador1 que funciona
    print('\n=== COMPARAÇÃO COM OPERADOR1 (QUE FUNCIONA) ===')
    cursor.execute('SELECT username, nivel, senha_temporaria, primeiro_login, unidade, last_login FROM usuarios WHERE username = ?', ('operador1',))
    operador1 = cursor.fetchone()
    
    if operador1:
        print(f'operador1: nível={operador1[1]}, senha_temp={operador1[2]}, primeiro_login={operador1[3]}, unidade={operador1[4]}, last_login={operador1[5]}')
    
    conn.close()

if __name__ == "__main__":
    debug_login_detailed()
