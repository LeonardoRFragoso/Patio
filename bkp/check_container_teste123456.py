"""
Script para verificar se o container TESTE123456 possui informações de modo de transporte.
"""

from utils.db import get_db

def check_container_teste123456():
    """
    Verifica se o container TESTE123456 possui informações de modo de transporte.
    """
    try:
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se o container existe e está vistoriado
        cursor.execute("""
            SELECT c.numero, v.vagao, v.placa 
            FROM containers c
            JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.numero = 'TESTE123456'
        """)
        
        result = cursor.fetchone()
        if not result:
            print("Container TESTE123456 não encontrado no banco de dados.")
            return False
        
        container_numero, vagao, placa = result
        
        print(f"Container: {container_numero}")
        print(f"Vagão: '{vagao}'")
        print(f"Placa: '{placa}'")
        
        if (not vagao or vagao.strip() == '') and (not placa or placa.strip() == ''):
            print("PROBLEMA: Container não possui informações de vagão ou placa!")
            return False
        else:
            print("OK: Container possui informações de modo de transporte.")
            return True
        
    except Exception as e:
        print(f"Erro ao verificar container TESTE123456: {str(e)}")
        return False
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    print("=== Verificação do Container TESTE123456 ===")
    check_container_teste123456()
