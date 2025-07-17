import os
import sqlite3
from datetime import datetime

def get_db():
    """Conecta ao banco de dados SQLite"""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def verificar_containers():
    """Verifica o estado dos containers no banco de dados após as correções"""
    try:
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        print("\n" + "=" * 50)
        print("VERIFICAÇÃO DE CONTAINERS APÓS CORREÇÕES")
        print("=" * 50)
        
        # 1. Verificar containers vistoriados
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers 
            WHERE status = 'vistoriado'
        ''')
        
        containers_vistoriados = cursor.fetchall()
        print(f"\n1. CONTAINERS VISTORIADOS: {len(containers_vistoriados)}")
        print("-" * 40)
        
        if containers_vistoriados:
            for container in containers_vistoriados:
                print(f"   * {container['numero']}")
                print(f"     Status: {container['status']}")
                print(f"     Posição: {container['posicao_atual'] or 'Não definida'}")
                print(f"     Unidade: {container['unidade']}")
                print()
        else:
            print("   Nenhum container vistoriado encontrado.")
        
        # 2. Verificar containers no pátio
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers 
            WHERE status = 'no patio'
        ''')
        
        containers_no_patio = cursor.fetchall()
        print(f"\n2. CONTAINERS NO PÁTIO: {len(containers_no_patio)}")
        print("-" * 40)
        
        if containers_no_patio:
            for container in containers_no_patio:
                print(f"   * {container['numero']}")
                print(f"     Status: {container['status']}")
                print(f"     Posição: {container['posicao_atual'] or 'Não definida'}")
                print(f"     Unidade: {container['unidade']}")
                print()
        else:
            print("   Nenhum container no pátio encontrado.")
        
        # 3. Verificar containers carregados
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers 
            WHERE status = 'carregado'
        ''')
        
        containers_carregados = cursor.fetchall()
        print(f"\n3. CONTAINERS CARREGADOS: {len(containers_carregados)}")
        print("-" * 40)
        
        if containers_carregados:
            for container in containers_carregados:
                print(f"   * {container['numero']}")
                print(f"     Status: {container['status']}")
                print(f"     Posição: {container['posicao_atual'] or 'Não definida'}")
                print(f"     Unidade: {container['unidade']}")
                print()
        else:
            print("   Nenhum container carregado encontrado.")
        
        # 4. Verificar containers que atendem aos critérios para movimentação
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers 
            WHERE status IN ('no patio', 'carregado') 
            AND posicao_atual IS NOT NULL 
            AND posicao_atual != ''
        ''')
        
        containers_movimentacao = cursor.fetchall()
        print(f"\n4. CONTAINERS DISPONÍVEIS PARA MOVIMENTAÇÃO: {len(containers_movimentacao)}")
        print("-" * 40)
        
        if containers_movimentacao:
            for container in containers_movimentacao:
                print(f"   * {container['numero']}")
                print(f"     Status: {container['status']}")
                print(f"     Posição: {container['posicao_atual']}")
                print(f"     Unidade: {container['unidade']}")
                print()
        else:
            print("   Nenhum container disponível para movimentação encontrado.")
        
        # 5. Verificar containers por unidade
        unidades = ['Floriano', 'Suzano', 'Rio de Janeiro']
        print("\n5. CONTAINERS POR UNIDADE:")
        print("-" * 40)
        
        for unidade in unidades:
            cursor.execute('''
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN status = 'no patio' AND posicao_atual IS NOT NULL AND posicao_atual != '' THEN 1 ELSE 0 END) as no_patio_com_posicao,
                       SUM(CASE WHEN status = 'carregado' AND posicao_atual IS NOT NULL AND posicao_atual != '' THEN 1 ELSE 0 END) as carregado_com_posicao,
                       SUM(CASE WHEN status = 'vistoriado' THEN 1 ELSE 0 END) as vistoriados
                FROM containers 
                WHERE unidade = ?
            ''', (unidade,))
            
            resultado = cursor.fetchone()
            print(f"   * {unidade}:")
            print(f"     Total: {resultado['total']}")
            print(f"     No Pátio com Posição: {resultado['no_patio_com_posicao']}")
            print(f"     Carregados com Posição: {resultado['carregado_com_posicao']}")
            print(f"     Vistoriados: {resultado['vistoriados']}")
            print()
        
        # 6. Verificar operações recentes
        cursor.execute('''
            SELECT o.tipo, o.posicao, o.data_operacao, c.numero, c.status, c.posicao_atual, c.unidade
            FROM operacoes o
            JOIN containers c ON o.container_id = c.id
            ORDER BY o.data_operacao DESC
            LIMIT 5
        ''')
        
        operacoes_recentes = cursor.fetchall()
        print(f"\n6. OPERAÇÕES RECENTES: {len(operacoes_recentes)}")
        print("-" * 40)
        
        if operacoes_recentes:
            for op in operacoes_recentes:
                print(f"   * Data: {op['data_operacao']}")
                print(f"     Tipo: {op['tipo'].upper()}")
                print(f"     Container: {op['numero']}")
                print(f"     Posição da operação: {op['posicao']}")
                print(f"     Status atual: {op['status']}")
                print(f"     Posição atual: {op['posicao_atual'] or 'Não definida'}")
                print(f"     Unidade: {op['unidade']}")
                print()
        else:
            print("   Nenhuma operação recente encontrada.")
        
        db.close()
        print("=" * 50)
        print("FIM DA VERIFICAÇÃO")
        print("=" * 50 + "\n")
        
    except Exception as e:
        print(f"Erro ao verificar containers: {str(e)}")

if __name__ == "__main__":
    verificar_containers()
