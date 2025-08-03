import sqlite3

def check_database_structure():
    print('=== VERIFICAÇÃO DA ESTRUTURA DO BANCO DE DADOS ===\n')
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Verificar estrutura da tabela usuarios
    print('📋 ESTRUTURA DA TABELA USUARIOS:')
    cursor.execute("PRAGMA table_info(usuarios)")
    columns = cursor.fetchall()
    
    for col in columns:
        cid, name, type_, notnull, default_value, pk = col
        nullable = "NOT NULL" if notnull else "NULL"
        primary = "PRIMARY KEY" if pk else ""
        default = f"DEFAULT {default_value}" if default_value else ""
        print(f'   {name:<25} {type_:<15} {nullable:<10} {primary} {default}')
    
    # Verificar estrutura da tabela solicitacoes_registro
    print('\n📋 ESTRUTURA DA TABELA SOLICITACOES_REGISTRO:')
    cursor.execute("PRAGMA table_info(solicitacoes_registro)")
    columns = cursor.fetchall()
    
    for col in columns:
        cid, name, type_, notnull, default_value, pk = col
        nullable = "NOT NULL" if notnull else "NULL"
        primary = "PRIMARY KEY" if pk else ""
        default = f"DEFAULT {default_value}" if default_value else ""
        print(f'   {name:<25} {type_:<15} {nullable:<10} {primary} {default}')
    
    # Verificar campos do formulário vs campos da tabela
    print('\n🔍 ANÁLISE DOS CAMPOS DO FORMULÁRIO DE REGISTRO:')
    
    # Campos do formulário (baseado no template)
    form_fields = [
        'nome',
        'username', 
        'email',
        'password',
        'confirmar_senha',
        'setor',
        'unidade',
        'justificativa'
    ]
    
    # Campos da tabela usuarios
    user_table_fields = [col[1] for col in columns]
    
    print('\n📝 CAMPOS DO FORMULÁRIO:')
    for field in form_fields:
        print(f'   - {field}')
    
    print('\n🗃️ CAMPOS DA TABELA USUARIOS:')
    cursor.execute("PRAGMA table_info(usuarios)")
    user_columns = cursor.fetchall()
    for col in user_columns:
        print(f'   - {col[1]}')
    
    print('\n🗃️ CAMPOS DA TABELA SOLICITACOES_REGISTRO:')
    cursor.execute("PRAGMA table_info(solicitacoes_registro)")
    request_columns = cursor.fetchall()
    for col in request_columns:
        print(f'   - {col[1]}')
    
    # Análise de compatibilidade
    print('\n⚖️ ANÁLISE DE COMPATIBILIDADE:')
    
    user_fields = [col[1] for col in user_columns]
    request_fields = [col[1] for col in request_columns]
    
    print('\n✅ CAMPOS QUE CORRESPONDEM (formulário → tabela usuarios):')
    for field in form_fields:
        if field == 'password':
            if 'password_hash' in user_fields:
                print(f'   - {field} → password_hash ✅')
            else:
                print(f'   - {field} → ❌ SEM CORRESPONDÊNCIA')
        elif field == 'confirmar_senha':
            print(f'   - {field} → (validação apenas) ✅')
        elif field in user_fields:
            print(f'   - {field} → {field} ✅')
        elif field in request_fields:
            print(f'   - {field} → {field} (solicitacoes_registro) ✅')
        else:
            print(f'   - {field} → ❌ SEM CORRESPONDÊNCIA')
    
    print('\n⚠️ CAMPOS OBRIGATÓRIOS DA TABELA USUARIOS SEM CORRESPONDÊNCIA:')
    required_user_fields = [col[1] for col in user_columns if col[3] == 1]  # notnull = 1
    for field in required_user_fields:
        if field not in form_fields and field not in ['id', 'password_hash', 'created_at', 'last_login']:
            print(f'   - {field} (obrigatório)')
    
    conn.close()

if __name__ == "__main__":
    check_database_structure()
