from app import app
from db import get_db
import sqlite3

def check_containers():
    # Usar o contexto da aplicação Flask
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
    
        print("=== VERIFICAÇÃO DE CONTAINERS NO BANCO DE DADOS ===")
    
        # Verificar todos os containers
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
        ''')
        containers = cursor.fetchall()
    
        print(f"\n1. Total de containers no banco: {len(containers)}")
        for c in containers:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
    
        # Verificar containers no pátio ou carregados
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE status IN ('no patio', 'carregado')
        ''')
        containers_patio = cursor.fetchall()
    
        print(f"\n2. Containers com status 'no patio' ou 'carregado': {len(containers_patio)}")
        for c in containers_patio:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
    
        # Verificar containers por unidade
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE unidade = 'Floriano'
        ''')
        containers_floriano = cursor.fetchall()
    
        print(f"\n3. Containers na unidade Floriano: {len(containers_floriano)}")
        for c in containers_floriano:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
    
        # Verificar containers no pátio ou carregados na unidade Floriano
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE status IN ('no patio', 'carregado')
            AND unidade = 'Floriano'
        ''')
        containers_patio_floriano = cursor.fetchall()
    
        print(f"\n4. Containers com status 'no patio' ou 'carregado' na unidade Floriano: {len(containers_patio_floriano)}")
        for c in containers_patio_floriano:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
    
        # Verificar containers com posição definida
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE posicao_atual IS NOT NULL 
            AND posicao_atual != ''
        ''')
        containers_com_posicao = cursor.fetchall()
    
        print(f"\n5. Containers com posição definida: {len(containers_com_posicao)}")
        for c in containers_com_posicao:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
            
        # Verificar a consulta exata que estamos usando na função listar_containers_movimentacao
        cursor.execute('''
            SELECT numero, status, posicao_atual, ultima_atualizacao, unidade
            FROM containers 
            WHERE status IN ('no patio', 'carregado') 
            AND posicao_atual IS NOT NULL 
            AND posicao_atual != ''
            AND unidade = 'Floriano'
            ORDER BY ultima_atualizacao DESC
        ''')
        containers_movimentacao = cursor.fetchall()
        
        print(f"\n6. Containers disponíveis para movimentação (consulta exata): {len(containers_movimentacao)}")
        for c in containers_movimentacao:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[4]}")
            
        # Verificar se há containers com status diferente de 'no patio' ou 'carregado'
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE status NOT IN ('no patio', 'carregado')
        ''')
        outros_status = cursor.fetchall()
        
        print(f"\n7. Containers com outros status: {len(outros_status)}")
        for c in outros_status:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
            
        # Verificar se há containers sem unidade definida
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade 
            FROM containers
            WHERE unidade IS NULL OR unidade = ''
        ''')
        sem_unidade = cursor.fetchall()
        
        print(f"\n8. Containers sem unidade definida: {len(sem_unidade)}")
        for c in sem_unidade:
            print(f"- Número: {c[0]}, Status: {c[1]}, Posição: {c[2]}, Unidade: {c[3]}")
            
        # Verificar todas as unidades distintas no banco
        cursor.execute('''
            SELECT DISTINCT unidade FROM containers
        ''')
        unidades = cursor.fetchall()
        
        print(f"\n9. Unidades distintas no banco: {len(unidades)}")
        for u in unidades:
            print(f"- {u[0]}")
            
        # Verificar todos os status distintos no banco
        cursor.execute('''
            SELECT DISTINCT status FROM containers
        ''')
        status_list = cursor.fetchall()
        
        print(f"\n10. Status distintos no banco: {len(status_list)}")
        for s in status_list:
            print(f"- {s[0]}")
            
        # Verificar o usuário logado
        try:
            from flask import session
            username = session.get('username')
            if username:
                cursor.execute('SELECT unidade FROM usuarios WHERE username = ?', (username,))
                user_data = cursor.fetchone()
                if user_data:
                    print(f"\n11. Usuário logado: {username}, Unidade: {user_data[0]}")
                else:
                    print(f"\n11. Usuário logado: {username}, mas não foi encontrado no banco")
            else:
                print("\n11. Nenhum usuário logado na sessão")
        except Exception as e:
            print(f"\n11. Erro ao verificar usuário logado: {str(e)}")
            
        print("\n=== FIM DA VERIFICAÇÃO ===\n")
        
        # Retornar os resultados para uso posterior se necessário
        return {
            'total': len(containers),
            'no_patio_ou_carregado': len(containers_patio),
            'floriano': len(containers_floriano),
            'no_patio_ou_carregado_floriano': len(containers_patio_floriano),
            'com_posicao': len(containers_com_posicao),
            'movimentacao': len(containers_movimentacao)
        }

if __name__ == "__main__":
    check_containers()
