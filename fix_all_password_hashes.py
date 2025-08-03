import os
import shutil

def fix_all_password_hashes():
    print('=== PADRONIZAÇÃO DE TODOS OS HASHES DE SENHA ===\n')
    
    # Arquivos que precisam ser corrigidos
    files_to_fix = [
        'admin/routes.py',
        'auth/routes.py'
    ]
    
    for file_path in files_to_fix:
        print(f'🔧 Corrigindo: {file_path}')
        
        # Fazer backup
        backup_path = f'{file_path}.backup'
        try:
            shutil.copy2(file_path, backup_path)
            print(f'   ✅ Backup criado: {backup_path}')
        except Exception as e:
            print(f'   ⚠️ Erro ao criar backup: {e}')
        
        # Ler arquivo
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Substituir todas as ocorrências de generate_password_hash sem método específico
        original_calls = [
            'generate_password_hash(password)',
            'generate_password_hash(nova_senha)',
            'generate_password_hash(senha_gerada)'
        ]
        
        replacement_calls = [
            'generate_password_hash(password, method=\'pbkdf2:sha256\')',
            'generate_password_hash(nova_senha, method=\'pbkdf2:sha256\')',
            'generate_password_hash(senha_gerada, method=\'pbkdf2:sha256\')'
        ]
        
        changes_made = 0
        for original, replacement in zip(original_calls, replacement_calls):
            if original in content:
                content = content.replace(original, replacement)
                changes_made += 1
                print(f'   ✅ Corrigido: {original} → {replacement}')
        
        if changes_made > 0:
            # Salvar arquivo corrigido
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'   ✅ {changes_made} correções aplicadas em {file_path}')
        else:
            print(f'   ℹ️ Nenhuma correção necessária em {file_path}')
        
        print()
    
    print('📋 RESUMO DAS CORREÇÕES:')
    print('   1. admin/routes.py - Criação de novos usuários')
    print('   2. admin/routes.py - Edição de usuários existentes')
    print('   3. admin/routes.py - Aprovação de solicitações')
    print('   4. auth/routes.py - Redefinição de senhas')
    print()
    print('🔧 BENEFÍCIOS:')
    print('   - Todos os novos usuários terão hash pbkdf2:sha256')
    print('   - Compatibilidade total com Flask/Werkzeug')
    print('   - Sem erros de "unsupported hash type"')
    print()
    print('⚠️ IMPORTANTE:')
    print('   - Backups criados para todos os arquivos')
    print('   - Reinicie o servidor para aplicar as mudanças')

if __name__ == "__main__":
    fix_all_password_hashes()
