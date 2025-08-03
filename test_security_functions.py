import sys
import os

# Adicionar o diretório do projeto ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_security_functions():
    print('=== TESTE DAS FUNÇÕES DE SEGURANÇA ===\n')
    
    # Teste 1: Importar funções de segurança
    print('🔍 TESTE 1: IMPORTAR FUNÇÕES DE SEGURANÇA')
    
    try:
        from utils.security import track_login_attempt, reset_login_attempts, is_login_blocked
        print('   ✅ Funções importadas com sucesso')
    except Exception as e:
        print(f'   ❌ Erro ao importar funções: {e}')
        return
    
    # Teste 2: Testar track_login_attempt fora do contexto Flask
    print(f'\n🔍 TESTE 2: TRACK_LOGIN_ATTEMPT FORA DO CONTEXTO FLASK')
    
    try:
        # Isso deve falhar porque não há contexto de requisição Flask
        allowed, minutes = track_login_attempt('LeoFragoso')
        print(f'   ⚠️ Função executou sem erro: allowed={allowed}, minutes={minutes}')
    except Exception as e:
        print(f'   ❌ ERRO ESPERADO (sem contexto Flask): {e}')
        print(f'   🔧 Este erro pode estar causando falha no login!')
    
    # Teste 3: Simular contexto Flask
    print(f'\n🔍 TESTE 3: SIMULAR CONTEXTO FLASK')
    
    try:
        from flask import Flask
        app = Flask(__name__)
        
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
            print('   ✅ Contexto Flask criado')
            
            # Testar track_login_attempt com contexto
            allowed, minutes = track_login_attempt('LeoFragoso')
            print(f'   ✅ track_login_attempt: allowed={allowed}, minutes={minutes}')
            
            # Testar reset_login_attempts
            reset_login_attempts('LeoFragoso')
            print(f'   ✅ reset_login_attempts: executado sem erro')
            
            # Testar is_login_blocked
            blocked, time_remaining = is_login_blocked('LeoFragoso')
            print(f'   ✅ is_login_blocked: blocked={blocked}, time_remaining={time_remaining}')
            
    except Exception as e:
        print(f'   ❌ Erro no contexto Flask: {e}')
        import traceback
        traceback.print_exc()
    
    # Teste 4: Verificar se o problema está na função de login
    print(f'\n🔍 TESTE 4: SIMULAR PROCESSO COMPLETO DE LOGIN')
    
    try:
        from flask import Flask
        app = Flask(__name__)
        
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
            username = 'LeoFragoso'
            
            # Passo 1: Verificar se login está bloqueado
            blocked, time_remaining = is_login_blocked(username)
            print(f'   1. is_login_blocked: blocked={blocked}, time_remaining={time_remaining}')
            
            if blocked:
                print(f'   ❌ PROBLEMA: Usuário está bloqueado por {time_remaining} minutos!')
                return
            
            # Passo 2: Track login attempt
            allowed, minutes = track_login_attempt(username)
            print(f'   2. track_login_attempt: allowed={allowed}, minutes={minutes}')
            
            if not allowed:
                print(f'   ❌ PROBLEMA: Login não permitido - bloqueado por {minutes} minutos!')
                return
            
            # Passo 3: Simular login bem-sucedido
            print(f'   3. Simulando login bem-sucedido...')
            
            # Passo 4: Reset login attempts
            reset_login_attempts(username)
            print(f'   4. reset_login_attempts: ✅ OK')
            
            print(f'\n   🎉 PROCESSO COMPLETO SEM ERROS!')
            
    except Exception as e:
        print(f'   ❌ ERRO NO PROCESSO: {e}')
        import traceback
        traceback.print_exc()
    
    # Teste 5: Verificar estado atual do dicionário login_attempts
    print(f'\n🔍 TESTE 5: VERIFICAR ESTADO DO DICIONÁRIO')
    
    try:
        from utils.security import login_attempts
        print(f'   Estado atual do login_attempts: {login_attempts}')
        
        if login_attempts:
            print(f'   ⚠️ Há tentativas registradas:')
            for key, data in login_attempts.items():
                print(f'     {key}: {data}')
        else:
            print(f'   ✅ Dicionário vazio - sem bloqueios')
            
    except Exception as e:
        print(f'   ❌ Erro ao verificar dicionário: {e}')

if __name__ == "__main__":
    test_security_functions()
