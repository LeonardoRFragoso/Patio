import sqlite3
from werkzeug.security import check_password_hash

def simulate_login():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print('=== SIMULAÇÃO COMPLETA DO PROCESSO DE LOGIN ===\n')
    
    # Dados do formulário
    username = "LeoFragoso"
    password = "Leo@2025"
    role = "user"  # Valor enviado pela aba Operador
    
    print(f'📋 DADOS DO FORMULÁRIO:')
    print(f'   username: {username}')
    print(f'   password: {password}')
    print(f'   role: {role}')
    
    # Passo 1: Validação básica
    print(f'\n🔍 PASSO 1: VALIDAÇÃO BÁSICA')
    campos_validos = username and password
    print(f'   Campos preenchidos: {"✅ SIM" if campos_validos else "❌ NÃO"}')
    
    if not campos_validos:
        print('❌ FALHA: Campos obrigatórios não preenchidos')
        return
    
    # Passo 2: Verificar credenciais
    print(f'\n🔍 PASSO 2: VERIFICAR CREDENCIAIS')
    cursor.execute("SELECT * FROM usuarios WHERE username = ?", (username,))
    user = cursor.fetchone()
    
    if not user:
        print('❌ FALHA: Usuário não encontrado')
        return
    
    columns = [desc[0] for desc in cursor.description]
    user_dict = dict(zip(columns, user))
    
    print(f'   Usuário encontrado: ✅ SIM')
    print(f'   ID: {user_dict["id"]}')
    print(f'   Nível: {user_dict["nivel"]}')
    
    # Verificar senha
    password_valid = check_password_hash(user_dict['password_hash'], password)
    print(f'   Senha válida: {"✅ SIM" if password_valid else "❌ NÃO"}')
    
    if not password_valid:
        print('❌ FALHA: Senha inválida')
        return
    
    # Passo 3: Verificar correspondência de perfil
    print(f'\n🔍 PASSO 3: VERIFICAR CORRESPONDÊNCIA DE PERFIL')
    user_role = user_dict['nivel']
    NIVEL_OPERADOR = 'operador'
    NIVEL_VISTORIADOR = 'vistoriador'
    NIVEL_ADMIN = 'admin'
    
    print(f'   role do formulário: {role}')
    print(f'   user_role do banco: {user_role}')
    
    # Lógica de validação exata do código
    profile_valid = True
    error_message = ""
    
    if role == 'user' and user_role != NIVEL_OPERADOR:
        profile_valid = False
        error_message = f"Aba 'user' requer nível 'operador', mas usuário tem '{user_role}'"
    elif role == 'inspector' and user_role != NIVEL_VISTORIADOR:
        profile_valid = False
        error_message = f"Aba 'inspector' requer nível 'vistoriador', mas usuário tem '{user_role}'"
    elif role == 'admin' and user_role != NIVEL_ADMIN and user_role != 'admin_administrativo':
        profile_valid = False
        error_message = f"Aba 'admin' requer nível 'admin' ou 'admin_administrativo', mas usuário tem '{user_role}'"
    
    print(f'   Perfil válido: {"✅ SIM" if profile_valid else "❌ NÃO"}')
    if not profile_valid:
        print(f'   Erro: {error_message}')
        print('❌ FALHA: Perfil não corresponde à aba selecionada')
        return
    
    # Passo 4: Verificar campos bloqueadores
    print(f'\n🔍 PASSO 4: VERIFICAR CAMPOS BLOQUEADORES')
    senha_temporaria = user_dict.get('senha_temporaria', 0)
    primeiro_login = user_dict.get('primeiro_login', 0)
    
    print(f'   senha_temporaria: {senha_temporaria} ({"❌ BLOQUEADO" if senha_temporaria == 1 else "✅ OK"})')
    print(f'   primeiro_login: {primeiro_login} ({"⚠️ ESPECIAL" if primeiro_login == 1 else "✅ OK"})')
    
    # Passo 5: Login bem-sucedido
    print(f'\n🎯 RESULTADO FINAL:')
    print(f'   ✅ TODAS AS VALIDAÇÕES PASSARAM!')
    print(f'   ✅ Login deve ser bem-sucedido')
    print(f'   ✅ Usuário deve ser redirecionado para dashboard operacional')
    
    # Verificar função de redirecionamento
    print(f'\n🔄 REDIRECIONAMENTO ESPERADO:')
    if user_role == 'operador':
        print(f'   Função: redirecionar_por_nivel("operador")')
        print(f'   Destino esperado: Dashboard operacional')
    
    # Verificar se há tentativas bloqueadas
    print(f'\n🔒 VERIFICAR BLOQUEIOS:')
    try:
        cursor.execute('SELECT COUNT(*) FROM login_attempts WHERE username = ?', (username,))
        attempts_count = cursor.fetchone()[0]
        print(f'   Tentativas registradas: {attempts_count}')
    except:
        print(f'   Tabela login_attempts não existe - sem bloqueios')
    
    conn.close()

if __name__ == "__main__":
    simulate_login()
