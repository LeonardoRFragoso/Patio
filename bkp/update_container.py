import sqlite3

def update_container_position():
    """Atualiza a posição do container TESTE123456 para A1-01"""
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Atualizar a posição do container
        cursor.execute('''
            UPDATE containers 
            SET posicao_atual = ? 
            WHERE numero = ? AND unidade = ?
        ''', ('A1-01', 'TESTE123456', 'Floriano'))
        
        # Commit da transação
        conn.commit()
        
        # Verificar se a atualização foi bem-sucedida
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers 
            WHERE numero = ?
        ''', ('TESTE123456',))
        
        container = cursor.fetchone()
        
        if container:
            print(f"Container atualizado: Número: {container[0]}, Status: {container[1]}, Posição: {container[2]}, Unidade: {container[3]}")
        else:
            print("Container não encontrado após atualização.")
            
        # Fechar conexão
        conn.close()
        
        print("Operação concluída com sucesso!")
        
    except Exception as e:
        print(f"Erro ao atualizar container: {str(e)}")

if __name__ == "__main__":
    update_container_position()
