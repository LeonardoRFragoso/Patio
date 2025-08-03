import sqlite3
from werkzeug.security import check_password_hash

def test_login_leofragoso():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print('=== TESTE DE LOGIN LEOFRAGOSO ===\n')
    
    # Buscar dados atualizados do usuário
    cursor.execute('SELECT * FROM usuarios WHERE username = ?', ('LeoFragoso',))
    user = cursor.fetchone()
    
    if not user:
        print('❌ Usuário LeoFragoso não encontrado')
        return
    
    columns = [desc[0] for desc in cursor.description]
    user_dict = dict(zip(columns, user))
    
    print('📋 DADOS ATUAIS DO USUÁRIO:')
    for key, value in user_dict.items():
        if key == 'password_hash':
            print(f'   {key}: {value[:50]}... (Werkzeug hash)')
        else:
            print(f'   {key}: {value}')
    
    # Testar credenciais
    password_to_test = "Leo@2025"
    password_hash = user_dict['password_hash']
    
    print(f'\n🔐 TESTE DE CREDENCIAIS:')
    print(f'   Usuário: LeoFragoso')
    print(f'   Senha: {password_to_test}')
    
    try:
        password_valid = check_password_hash(password_hash, password_to_test)
        print(f'   Resultado: {"✅ SENHA VÁLIDA" if password_valid else "❌ SENHA INVÁLIDA"}')
        
        if password_valid:
            # Simular verificações do sistema de login
            print(f'\n🔍 VERIFICAÇÕES DO SISTEMA:')
            
            # 1. Nível válido
            nivel = user_dict['nivel']
            nivel_valido = nivel in ['operador', 'vistoriador', 'admin', 'admin_administrativo']
            print(f'   Nível "{nivel}": {"✅ VÁLIDO" if nivel_valido else "❌ INVÁLIDO"}')
            
            # 2. Campos bloqueadores
            senha_temp = user_dict.get('senha_temporaria', 0)
            primeiro_login = user_dict.get('primeiro_login', 0)
            print(f'   Senha temporária: {"❌ BLOQUEADO" if senha_temp == 1 else "✅ OK"}')
            print(f'   Primeiro login: {"⚠️ REQUER AÇÃO" if primeiro_login == 1 else "✅ OK"}')
            
            # 3. Unidade
            unidade = user_dict.get('unidade')
            print(f'   Unidade: {unidade} {"✅ OK" if unidade else "❌ FALTANDO"}')
            
            # 4. Verificar se deve funcionar
            should_work = (
                password_valid and 
                nivel_valido and 
                senha_temp == 0 and 
                unidade
            )
            
            print(f'\n🎯 RESULTADO FINAL:')
            print(f'   Login deve funcionar: {"✅ SIM" if should_work else "❌ NÃO"}')
            
            if should_work:
                print(f'   Dashboard esperado: Operador')
                print(f'   Rota esperada: /auth/dashboard')
            else:
                print(f'   Problemas identificados - verificar logs do servidor')
        
    except Exception as e:
        print(f'   ❌ ERRO ao verificar senha: {e}')
    
    # Verificar logs recentes se existir tabela
    print(f'\n📋 VERIFICANDO LOGS RECENTES:')
    try:
        cursor.execute('''
            SELECT data_hora, usuario, acao, descricao 
            FROM log_atividades 
            WHERE usuario = 'LeoFragoso' 
            ORDER BY data_hora DESC 
            LIMIT 5
        ''')
        logs = cursor.fetchall()
        
        if logs:
            for log in logs:
                print(f'   {log[0]} - {log[2]}: {log[3]}')
        else:
            print('   Nenhum log encontrado')
    except Exception as e:
        print(f'   Erro ao verificar logs: {e}')
    
    conn.close()

if __name__ == "__main__":
    test_login_leofragoso()
