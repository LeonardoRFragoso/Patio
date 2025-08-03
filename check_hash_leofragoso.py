import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

def check_and_fix_hash():
    print('=== VERIFICAÇÃO E CORREÇÃO DO HASH DA SENHA ===\n')
    
    # Conectar ao banco
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Verificar hash atual do LeoFragoso
    cursor.execute("SELECT username, password_hash FROM usuarios WHERE username = 'LeoFragoso'")
    user = cursor.fetchone()
    
    if user:
        username, current_hash = user
        print(f'👤 Usuário: {username}')
        print(f'🔐 Hash atual: {current_hash[:50]}...')
        print(f'📏 Tamanho do hash: {len(current_hash)}')
        
        # Verificar tipo do hash
        if current_hash.startswith('scrypt:'):
            print('❌ PROBLEMA: Hash tipo scrypt não suportado pelo Werkzeug!')
            
            # Gerar novo hash Werkzeug
            nova_senha = 'Leo@2025'
            novo_hash = generate_password_hash(nova_senha)
            
            print(f'\n🔧 CORREÇÃO:')
            print(f'   Nova senha: {nova_senha}')
            print(f'   Novo hash: {novo_hash[:50]}...')
            
            # Testar o novo hash
            if check_password_hash(novo_hash, nova_senha):
                print('✅ Novo hash validado com sucesso!')
                
                # Atualizar no banco
                cursor.execute(
                    "UPDATE usuarios SET password_hash = ? WHERE username = ?",
                    (novo_hash, username)
                )
                conn.commit()
                print('✅ Hash atualizado no banco de dados!')
                
            else:
                print('❌ Erro na validação do novo hash!')
                
        elif current_hash.startswith('pbkdf2:'):
            print('✅ Hash já está no formato Werkzeug (pbkdf2)')
            
            # Testar se funciona com a senha
            senha_teste = 'Leo@2025'
            if check_password_hash(current_hash, senha_teste):
                print(f'✅ Hash funciona com a senha: {senha_teste}')
            else:
                print(f'❌ Hash NÃO funciona com a senha: {senha_teste}')
                print('🔧 Gerando novo hash...')
                
                novo_hash = generate_password_hash(senha_teste)
                cursor.execute(
                    "UPDATE usuarios SET password_hash = ? WHERE username = ?",
                    (novo_hash, username)
                )
                conn.commit()
                print('✅ Novo hash gerado e salvo!')
        else:
            print(f'⚠️ Tipo de hash desconhecido: {current_hash[:20]}...')
    
    else:
        print('❌ Usuário LeoFragoso não encontrado!')
    
    # Verificar resultado final
    print('\n📋 VERIFICAÇÃO FINAL:')
    cursor.execute("SELECT username, password_hash FROM usuarios WHERE username = 'LeoFragoso'")
    user_final = cursor.fetchone()
    
    if user_final:
        username, hash_final = user_final
        print(f'👤 Usuário: {username}')
        print(f'🔐 Hash final: {hash_final[:50]}...')
        
        # Teste final
        if check_password_hash(hash_final, 'Leo@2025'):
            print('✅ SUCESSO: Hash funciona perfeitamente!')
        else:
            print('❌ ERRO: Hash ainda não funciona!')
    
    conn.close()

if __name__ == "__main__":
    check_and_fix_hash()
