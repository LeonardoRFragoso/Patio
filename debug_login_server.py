import sqlite3
from werkzeug.security import check_password_hash
import sys
import os

# Adicionar o diretório do projeto ao path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def debug_login_server():
    print('=== DEBUG DETALHADO DO SERVIDOR DE LOGIN ===\n')
    
    # Simular exatamente o que o servidor faz
    username = "LeoFragoso"
    password = "Leo@2025"
    role = "user"
    
    print(f'📋 DADOS RECEBIDOS:')
    print(f'   username: {username}')
    print(f'   password: {password}')
    print(f'   role: {role}')
    
    # Passo 1: Validação básica (como no código)
    print(f'\n🔍 PASSO 1: VALIDAÇÃO BÁSICA')
    campos_validos = bool(username and username.strip() and password)
    print(f'   Campos válidos: {"✅ SIM" if campos_validos else "❌ NÃO"}')
    
    if not campos_validos:
        print('❌ FALHA: Campos obrigatórios não preenchidos')
        return
    
    # Passo 2: Verificar tentativas de força bruta (simulado)
    print(f'\n🔍 PASSO 2: VERIFICAR TENTATIVAS DE FORÇA BRUTA')
    print(f'   Simulando track_login_attempt("{username}")...')
    # Como não temos a tabela login_attempts, assumimos que está permitido
    allowed = True
    print(f'   Tentativas permitidas: {"✅ SIM" if allowed else "❌ NÃO"}')
    
    # Passo 3: Verificar credenciais (função verificar_credenciais)
    print(f'\n🔍 PASSO 3: VERIFICAR CREDENCIAIS')
    
    try:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row  # Para acessar colunas por nome
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM usuarios WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user:
            print('❌ FALHA: Usuário não encontrado')
            return
        
        print(f'   Usuário encontrado: ✅ SIM (ID: {user["id"]})')
        
        # Verificar senha
        password_valid = check_password_hash(user['password_hash'], password)
        print(f'   Senha válida: {"✅ SIM" if password_valid else "❌ NÃO"}')
        
        if not password_valid:
            print('❌ FALHA: Senha inválida')
            return
        
        # Passo 4: Verificar correspondência de perfil
        print(f'\n🔍 PASSO 4: VERIFICAR CORRESPONDÊNCIA DE PERFIL')
        
        user_role = user['nivel']
        NIVEL_OPERADOR = 'operador'
        NIVEL_VISTORIADOR = 'vistoriador'
        NIVEL_ADMIN = 'admin'
        
        print(f'   role do formulário: "{role}"')
        print(f'   user_role do banco: "{user_role}"')
        
        # Lógica EXATA do código auth/routes.py
        profile_match = True
        error_msg = ""
        
        if role == 'user' and user_role != NIVEL_OPERADOR:
            profile_match = False
            error_msg = f'Aba "user" requer nível "operador", mas usuário tem "{user_role}"'
        elif role == 'inspector' and user_role != NIVEL_VISTORIADOR:
            profile_match = False
            error_msg = f'Aba "inspector" requer nível "vistoriador", mas usuário tem "{user_role}"'
        elif role == 'admin' and user_role != NIVEL_ADMIN and user_role != 'admin_administrativo':
            profile_match = False
            error_msg = f'Aba "admin" requer nível "admin" ou "admin_administrativo", mas usuário tem "{user_role}"'
        
        print(f'   Correspondência de perfil: {"✅ SIM" if profile_match else "❌ NÃO"}')
        
        if not profile_match:
            print(f'   Erro: {error_msg}')
            print('❌ FALHA: Acesso negado - perfil não corresponde à aba')
            return
        
        # Passo 5: Login bem-sucedido (simulação)
        print(f'\n🔍 PASSO 5: CONFIGURAÇÃO DE LOGIN')
        
        # Simular reset_login_attempts
        print(f'   reset_login_attempts("{username}"): ✅ OK')
        
        # Simular atualizar_ultimo_login
        print(f'   atualizar_ultimo_login({user["id"]}): ✅ OK')
        
        # Simular configurar_sessao_usuario
        session_data = {
            'username': user['username'],
            'user_id': user['id'],
            'role': user['nivel'],
            'nivel': user['nivel'],
            'unidade': user['unidade'],
            'logged_in': True
        }
        
        print(f'   configurar_sessao_usuario: ✅ OK')
        print(f'     Dados da sessão: {session_data}')
        
        # Simular log_auth_activity
        print(f'   log_auth_activity("{username}", "LOGIN", "Login realizado com sucesso"): ✅ OK')
        
        # Simular redirecionar_por_nivel
        print(f'\n🔍 PASSO 6: REDIRECIONAMENTO')
        
        if user_role == NIVEL_ADMIN:
            redirect_url = 'admin.admin_dashboard'
        elif user_role == 'admin_administrativo':
            redirect_url = 'admin.admin_administrativo_dashboard'
        elif user_role == NIVEL_VISTORIADOR:
            redirect_url = 'auth.dashboard (tipo=vistoriador)'
        else:
            redirect_url = 'auth.dashboard'
        
        print(f'   redirecionar_por_nivel("{user_role}"): {redirect_url}')
        
        print(f'\n🎉 RESULTADO FINAL:')
        print(f'   ✅ TODAS AS VALIDAÇÕES PASSARAM!')
        print(f'   ✅ LOGIN DEVERIA SER BEM-SUCEDIDO!')
        print(f'   ✅ REDIRECIONAMENTO PARA: {redirect_url}')
        
        # Verificar se há algum problema específico
        print(f'\n🔍 VERIFICAÇÕES ADICIONAIS:')
        
        # Verificar se há campos None que podem causar problemas
        problematic_fields = []
        for field in ['username', 'nivel', 'unidade']:
            if not user[field]:
                problematic_fields.append(field)
        
        if problematic_fields:
            print(f'   ⚠️ Campos problemáticos (None/vazios): {problematic_fields}')
        else:
            print(f'   ✅ Todos os campos essenciais preenchidos')
        
        conn.close()
        
    except Exception as e:
        print(f'❌ ERRO DURANTE VERIFICAÇÃO: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_login_server()
