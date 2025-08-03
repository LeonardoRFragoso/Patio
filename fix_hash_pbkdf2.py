import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

def fix_hash_to_pbkdf2():
    print('=== CORREÇÃO FORÇADA PARA HASH PBKDF2 ===\n')
    
    # Conectar ao banco
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Verificar hash atual
    cursor.execute("SELECT username, password_hash FROM usuarios WHERE username = 'LeoFragoso'")
    user = cursor.fetchone()
    
    if user:
        username, current_hash = user
        print(f'👤 Usuário: {username}')
        print(f'🔐 Hash atual: {current_hash[:50]}...')
        
        # Forçar geração de hash pbkdf2
        senha = 'Leo@2025'
        
        # Método 1: Especificar explicitamente o método pbkdf2
        try:
            novo_hash = generate_password_hash(senha, method='pbkdf2:sha256')
            print(f'✅ Método 1 - Hash pbkdf2 gerado: {novo_hash[:50]}...')
            
            # Testar o hash
            if check_password_hash(novo_hash, senha):
                print('✅ Hash pbkdf2 validado com sucesso!')
                
                # Atualizar no banco
                cursor.execute(
                    "UPDATE usuarios SET password_hash = ? WHERE username = ?",
                    (novo_hash, username)
                )
                conn.commit()
                print('✅ Hash pbkdf2 salvo no banco!')
                
                # Verificação final
                cursor.execute("SELECT password_hash FROM usuarios WHERE username = 'LeoFragoso'")
                hash_final = cursor.fetchone()[0]
                
                print(f'\n📋 VERIFICAÇÃO FINAL:')
                print(f'🔐 Hash final: {hash_final[:50]}...')
                print(f'📝 Tipo: {"pbkdf2" if hash_final.startswith("pbkdf2:") else "outro"}')
                
                if check_password_hash(hash_final, senha):
                    print('🎉 SUCESSO TOTAL: Login deve funcionar agora!')
                else:
                    print('❌ Ainda há problema com o hash')
                    
            else:
                print('❌ Erro na validação do hash pbkdf2')
                
        except Exception as e:
            print(f'❌ Erro ao gerar hash pbkdf2: {e}')
            
            # Método 2: Tentar sem especificar método
            print('\n🔧 Tentando método alternativo...')
            novo_hash = generate_password_hash(senha)
            print(f'Hash alternativo: {novo_hash[:50]}...')
    
    else:
        print('❌ Usuário LeoFragoso não encontrado!')
    
    conn.close()

if __name__ == "__main__":
    fix_hash_to_pbkdf2()
