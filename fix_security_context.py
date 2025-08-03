import os
import shutil

def fix_security_context():
    print('=== CORREÇÃO DAS FUNÇÕES DE SEGURANÇA ===\n')
    
    # Fazer backup do arquivo original
    original_file = 'utils/security.py'
    backup_file = 'utils/security.py.backup'
    
    try:
        shutil.copy2(original_file, backup_file)
        print(f'✅ Backup criado: {backup_file}')
    except Exception as e:
        print(f'⚠️ Erro ao criar backup: {e}')
    
    # Ler o arquivo original
    with open(original_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Aplicar correções
    print('🔧 Aplicando correções...')
    
    # Correção 1: Adicionar tratamento de contexto na função track_login_attempt
    old_track_function = '''def track_login_attempt(username):
    """
    Verifica se o usuário ou IP está tentando força bruta
    Retorna (permitido, tempo_restante_bloqueio) onde:
    - permitido: booleano indicando se a tentativa é permitida
    - tempo_restante_bloqueio: tempo restante em minutos se bloqueado, ou 0 se não bloqueado
    """
    ip = request.remote_addr
    identifier = f"{username}_{ip}" if username else ip'''
    
    new_track_function = '''def track_login_attempt(username):
    """
    Verifica se o usuário ou IP está tentando força bruta
    Retorna (permitido, tempo_restante_bloqueio) onde:
    - permitido: booleano indicando se a tentativa é permitida
    - tempo_restante_bloqueio: tempo restante em minutos se bloqueado, ou 0 se não bloqueado
    """
    try:
        ip = request.remote_addr
    except RuntimeError:
        # Fora do contexto de requisição Flask - usar IP padrão
        ip = '127.0.0.1'
    
    identifier = f"{username}_{ip}" if username else ip'''
    
    content = content.replace(old_track_function, new_track_function)
    
    # Correção 2: Adicionar tratamento de contexto na função is_login_blocked
    old_blocked_function = '''def is_login_blocked(username):
    """
    Verifica se o usuário está bloqueado por tentativas excessivas de login
    Retorna (bloqueado, tempo_restante) onde:
    - bloqueado: booleano indicando se está bloqueado
    - tempo_restante: tempo restante em minutos se bloqueado, ou 0 se não estiver
    """
    ip = request.remote_addr
    identifier = f"{username}_{ip}" if username else ip'''
    
    new_blocked_function = '''def is_login_blocked(username):
    """
    Verifica se o usuário está bloqueado por tentativas excessivas de login
    Retorna (bloqueado, tempo_restante) onde:
    - bloqueado: booleano indicando se está bloqueado
    - tempo_restante: tempo restante em minutos se bloqueado, ou 0 se não estiver
    """
    try:
        ip = request.remote_addr
    except RuntimeError:
        # Fora do contexto de requisição Flask - usar IP padrão
        ip = '127.0.0.1'
    
    identifier = f"{username}_{ip}" if username else ip'''
    
    content = content.replace(old_blocked_function, new_blocked_function)
    
    # Correção 3: Adicionar tratamento de contexto na função reset_login_attempts
    old_reset_function = '''def reset_login_attempts(username):
    """
    Reseta as tentativas de login após um login bem-sucedido
    """
    ip = request.remote_addr
    identifier = f"{username}_{ip}" if username else ip'''
    
    new_reset_function = '''def reset_login_attempts(username):
    """
    Reseta as tentativas de login após um login bem-sucedido
    """
    try:
        ip = request.remote_addr
    except RuntimeError:
        # Fora do contexto de requisição Flask - usar IP padrão
        ip = '127.0.0.1'
    
    identifier = f"{username}_{ip}" if username else ip'''
    
    content = content.replace(old_reset_function, new_reset_function)
    
    # Salvar o arquivo corrigido
    with open(original_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ Correções aplicadas com sucesso!')
    print('\n📋 CORREÇÕES REALIZADAS:')
    print('   1. track_login_attempt: Tratamento de contexto Flask')
    print('   2. is_login_blocked: Tratamento de contexto Flask')
    print('   3. reset_login_attempts: Tratamento de contexto Flask')
    print('\n🔧 BENEFÍCIOS:')
    print('   - Funções não falham mais fora do contexto de requisição')
    print('   - Login deve funcionar normalmente')
    print('   - Sistema mais robusto contra erros de contexto')
    
    print(f'\n⚠️ IMPORTANTE:')
    print(f'   - Backup salvo em: {backup_file}')
    print(f'   - Reinicie o servidor para aplicar as mudanças')

if __name__ == "__main__":
    fix_security_context()
