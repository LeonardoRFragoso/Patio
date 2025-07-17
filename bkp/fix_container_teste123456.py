"""
Script para corrigir o modo de transporte do container TESTE123456 que já está no sistema.

Este script atualiza diretamente o banco de dados para adicionar informações de
modo de transporte (vagão ou placa) para o container TESTE123456 que já foi vistoriado.
"""

from utils.db import get_db
from datetime import datetime

def fix_container_teste123456():
    """
    Corrige o modo de transporte para o container TESTE123456 que já está no sistema.
    """
    try:
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Verificar se o container existe e está vistoriado
        cursor.execute("""
            SELECT c.id, v.id 
            FROM containers c
            JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.numero = 'TESTE123456' AND c.status = 'vistoriado'
        """)
        
        result = cursor.fetchone()
        if not result:
            print("Container TESTE123456 não encontrado ou não está vistoriado.")
            return False
        
        container_id, vistoria_id = result
        
        # Definir modo de transporte como ferroviário (você pode alterar para rodoviário se preferir)
        modo_transporte = 'ferroviaria'  # ou 'rodoviaria'
        
        # Dados do transporte
        vagao = 'VG12345' if modo_transporte == 'ferroviaria' else ''
        placa = '' if modo_transporte == 'ferroviaria' else 'ABC1234'
        
        # 1. Verificar se as colunas vagao e placa existem na tabela vistorias
        try:
            cursor.execute("SELECT vagao FROM vistorias LIMIT 1")
        except Exception:
            print("Adicionando coluna 'vagao' à tabela vistorias...")
            cursor.execute("ALTER TABLE vistorias ADD COLUMN vagao TEXT")
        
        try:
            cursor.execute("SELECT placa FROM vistorias LIMIT 1")
        except Exception:
            print("Adicionando coluna 'placa' à tabela vistorias...")
            cursor.execute("ALTER TABLE vistorias ADD COLUMN placa TEXT")
        
        # 2. Atualizar a vistoria com as informações de transporte
        cursor.execute("""
            UPDATE vistorias
            SET vagao = ?, placa = ?
            WHERE id = ?
        """, (vagao, placa, vistoria_id))
        
        # 3. Commit das alterações
        db.commit()
        db.close()
        
        print(f"Container TESTE123456 atualizado com sucesso para modo {modo_transporte}.")
        if modo_transporte == 'ferroviaria':
            print(f"Número do vagão: {vagao}")
        else:
            print(f"Placa do caminhão: {placa}")
        
        return True
        
    except Exception as e:
        print(f"Erro ao atualizar container TESTE123456: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== Correção do Container TESTE123456 ===")
    fix_container_teste123456()
