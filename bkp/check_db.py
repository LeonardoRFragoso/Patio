import sqlite3
import os

def check_database():
    """Verifica o estado atual do banco de dados"""
    
    # Caminho para o banco de dados
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
    
    if not os.path.exists(db_path):
        print(f"Banco de dados não encontrado em: {db_path}")
        return
        
    print(f"Conectando ao banco de dados: {db_path}")
    
    # Conectar ao banco de dados
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Verificar estrutura do banco de dados
        db_path = 'containers.db'
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Listar todas as tabelas
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print("Tabelas encontradas:")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Se existe tabela de containers, mostrar estrutura
            for table_name in ['containers', 'container', 'Container']:
                try:
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = cursor.fetchall()
                    if columns:
                        print(f"\nEstrutura da tabela {table_name}:")
                        for col in columns:
                            print(f"  - {col[1]} ({col[2]})")
                        
                        # Mostrar alguns registros
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = cursor.fetchone()[0]
                        print(f"\nTotal de registros: {count}")
                        
                        if count > 0:
                            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                            rows = cursor.fetchall()
                            print("\nPrimeiros registros:")
                            for row in rows:
                                print(f"  {row}")
                        break
                except Exception as e:
                    print(f"Erro ao verificar tabela {table_name}: {e}")
                    continue
            
            conn.close()
        else:
            print("Arquivo containers.db não encontrado")
        
        # 1. Verificar todos os containers
        cursor.execute("SELECT numero, status, posicao_atual, unidade FROM containers")
        containers = cursor.fetchall()
        
        print(f"\n1. Total de containers no banco: {len(containers)}")
        for c in containers:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
        
        # 2. Verificar containers no pátio ou carregados
        cursor.execute("""
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE status IN ('no patio', 'carregado')
        """)
        containers_patio = cursor.fetchall()
        
        print(f"\n2. Containers com status 'no patio' ou 'carregado': {len(containers_patio)}")
        for c in containers_patio:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
        
        # 3. Verificar containers por unidade
        cursor.execute("""
            SELECT DISTINCT unidade FROM containers
        """)
        unidades = cursor.fetchall()
        
        print(f"\n3. Unidades distintas no banco: {len(unidades)}")
        for u in unidades:
            print(f"- {u[0]}")
            
            # Para cada unidade, verificar containers
            cursor.execute("""
                SELECT numero, status, posicao_atual, unidade 
                FROM containers
                WHERE unidade = ?
            """, (u[0],))
            containers_unidade = cursor.fetchall()
            
            print(f"  Containers na unidade {u[0]}: {len(containers_unidade)}")
            
            # Verificar containers no pátio ou carregados nesta unidade
            cursor.execute("""
                SELECT numero, status, posicao_atual, unidade 
                FROM containers
                WHERE status IN ('no patio', 'carregado')
                AND unidade = ?
            """, (u[0],))
            containers_patio_unidade = cursor.fetchall()
            
            print(f"  Containers com status 'no patio' ou 'carregado' na unidade {u[0]}: {len(containers_patio_unidade)}")
            
            # Verificar containers com posição definida nesta unidade
            cursor.execute("""
                SELECT numero, status, posicao_atual, unidade 
                FROM containers
                WHERE posicao_atual IS NOT NULL 
                AND posicao_atual != ''
                AND unidade = ?
            """, (u[0],))
            containers_com_posicao_unidade = cursor.fetchall()
            
            print(f"  Containers com posição definida na unidade {u[0]}: {len(containers_com_posicao_unidade)}")
            
            # Verificar containers que atendem a todos os critérios nesta unidade
            cursor.execute("""
                SELECT numero, status, posicao_atual, unidade 
                FROM containers
                WHERE status IN ('no patio', 'carregado')
                AND posicao_atual IS NOT NULL 
                AND posicao_atual != ''
                AND unidade = ?
            """, (u[0],))
            containers_movimentacao_unidade = cursor.fetchall()
            
            print(f"  Containers disponíveis para movimentação na unidade {u[0]}: {len(containers_movimentacao_unidade)}")
            for c in containers_movimentacao_unidade:
                print(f"  - Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
        
        # 4. Verificar todos os status distintos no banco
        cursor.execute("""
            SELECT DISTINCT status FROM containers
        """)
        status_list = cursor.fetchall()
        
        print(f"\n4. Status distintos no banco: {len(status_list)}")
        for s in status_list:
            print(f"- {s[0]}")
            
        # 5. Verificar usuários
        cursor.execute("SELECT username, unidade FROM usuarios")
        usuarios = cursor.fetchall()
        
        print(f"\n5. Usuários no banco: {len(usuarios)}")
        for u in usuarios:
            print(f"- Username: {u[0]}, Unidade: {u[1]}")
            
    except Exception as e:
        print(f"Erro ao verificar banco de dados: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_database()
