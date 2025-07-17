from db import get_db_connection

def check_table_structure(table_name):
    """Verifica a estrutura de uma tabela no banco de dados"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Obter informações sobre as colunas da tabela
    cursor.execute(f'PRAGMA table_info({table_name})')
    columns = cursor.fetchall()
    
    print(f'Colunas da tabela {table_name}:')
    for col in columns:
        print(f'{col[0]}: {col[1]} ({col[2]})')
    
    conn.close()

if __name__ == '__main__':
    check_table_structure('operacoes')
