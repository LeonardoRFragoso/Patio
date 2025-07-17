"""
Utilitários de segurança para o sistema de login
"""
import re
import time
from datetime import datetime, timedelta
from flask import request, session

# Dicionário para armazenar tentativas de login
# Estrutura: { 'username_ou_ip': {'count': 0, 'last_attempt': timestamp, 'blocked_until': timestamp} }
login_attempts = {}

# Configurações de segurança
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = True
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_TIME_MINUTES = 15

def is_strong_password(password):
    """
    Valida a força da senha de acordo com as políticas definidas
    Retorna (booleano, mensagem) indicando se a senha é válida e, se não for, o motivo
    """
    error_messages = []
    
    # Verificar comprimento mínimo
    if len(password) < PASSWORD_MIN_LENGTH:
        error_messages.append(f"A senha deve ter pelo menos {PASSWORD_MIN_LENGTH} caracteres")
    
    # Verificar caracteres específicos
    if PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        error_messages.append("A senha deve conter pelo menos uma letra maiúscula")
    
    if PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        error_messages.append("A senha deve conter pelo menos uma letra minúscula")
    
    if PASSWORD_REQUIRE_DIGIT and not re.search(r'\d', password):
        error_messages.append("A senha deve conter pelo menos um número")
    
    if PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        error_messages.append("A senha deve conter pelo menos um caractere especial (!@#$%^&*(),.?\":{}|<>)")
    
    # Verificar se tem sequências óbvias
    common_sequences = ['123456', 'abcdef', 'qwerty', 'password']
    if any(seq in password.lower() for seq in common_sequences):
        error_messages.append("A senha não deve conter sequências óbvias (123456, abcdef, qwerty, password)")
    
    if error_messages:
        return False, error_messages
    return True, ["Senha forte"]

def track_login_attempt(username):
    """
    Verifica se o usuário ou IP está tentando força bruta
    Retorna (permitido, tempo_restante_bloqueio) onde:
    - permitido: booleano indicando se a tentativa é permitida
    - tempo_restante_bloqueio: tempo restante em minutos se bloqueado, ou 0 se não bloqueado
    """
    ip = request.remote_addr
    identifier = f"{username}_{ip}" if username else ip
    
    now = datetime.now()
    current_time = now.timestamp()
    
    # Limpar entradas antigas (mais de 24 horas)
    cleanup_time = now - timedelta(hours=24)
    cleanup_timestamp = cleanup_time.timestamp()
    to_delete = [key for key, data in login_attempts.items() 
                if data.get('last_attempt', 0) < cleanup_timestamp]
    
    for key in to_delete:
        if key in login_attempts:
            del login_attempts[key]
    
    # Verificar se está bloqueado
    if identifier in login_attempts:
        data = login_attempts[identifier]
        
        # Se estiver bloqueado, verificar se o tempo já passou
        if 'blocked_until' in data:
            if current_time < data['blocked_until']:
                # Ainda está bloqueado
                minutes_remaining = int((data['blocked_until'] - current_time) / 60) + 1
                return False, minutes_remaining
            else:
                # Bloqueio expirou, resetar contagem
                data['count'] = 1
                data['last_attempt'] = current_time
                del data['blocked_until']
                return True, 0
        
        # Não está bloqueado, atualizar contagem
        data['count'] += 1
        data['last_attempt'] = current_time
        
        # Verificar se atingiu o limite de tentativas
        if data['count'] >= MAX_LOGIN_ATTEMPTS:
            # Bloquear por LOCKOUT_TIME_MINUTES
            blocked_until = current_time + (LOCKOUT_TIME_MINUTES * 60)
            data['blocked_until'] = blocked_until
            return False, LOCKOUT_TIME_MINUTES
    else:
        # Primeira tentativa para este usuário/IP
        login_attempts[identifier] = {
            'count': 1, 
            'last_attempt': current_time
        }
    
    return True, 0

def is_login_blocked(username):
    """
    Verifica se o usuário está bloqueado por tentativas excessivas de login
    Retorna (bloqueado, tempo_restante) onde:
    - bloqueado: booleano indicando se está bloqueado
    - tempo_restante: tempo restante em minutos se bloqueado, ou 0 se não estiver
    """
    ip = request.remote_addr
    identifier = f"{username}_{ip}" if username else ip
    
    if identifier not in login_attempts:
        return False, 0
        
    data = login_attempts[identifier]
    current_time = datetime.now().timestamp()
    
    if 'blocked_until' in data and current_time < data['blocked_until']:
        # Ainda está bloqueado
        minutes_remaining = int((data['blocked_until'] - current_time) / 60) + 1
        return True, minutes_remaining
    
    return False, 0


def reset_login_attempts(username):
    """
    Reseta as tentativas de login após um login bem-sucedido
    """
    ip = request.remote_addr
    identifier = f"{username}_{ip}" if username else ip
    
    if identifier in login_attempts:
        del login_attempts[identifier]
