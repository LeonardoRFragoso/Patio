import os
import sqlite3
from datetime import datetime
import random
import string

def get_db():
    """Conecta ao banco de dados SQLite"""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def gerar_numero_container():
    """Gera um número de container aleatório para teste"""
    prefixo = ''.join(random.choices(string.ascii_uppercase, k=4))
    numero = ''.join(random.choices(string.digits, k=7))
    return f"{prefixo}{numero}"

def testar_fluxo_completo():
    """Testa o fluxo completo de vistoria e descarga de um container"""
    try:
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        print("\n" + "=" * 50)
        print("TESTE DE FLUXO COMPLETO: VISTORIA E DESCARGA")
        print("=" * 50)
        
        # Gerar dados de teste
        container_numero = gerar_numero_container()
        unidade_teste = "Floriano"  # Unidade do vistoriador/operador
        data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        posicao_teste = f"A{random.randint(1, 9)}-{random.randint(10, 99)}"
        
        print(f"\n1. DADOS DE TESTE:")
        print("-" * 40)
        print(f"   * Número do Container: {container_numero}")
        print(f"   * Unidade do Usuário: {unidade_teste}")
        print(f"   * Posição para Descarga: {posicao_teste}")
        print(f"   * Data/Hora: {data_atual}")
        
        # 1. Simular vistoria do container
        print("\n2. SIMULANDO VISTORIA DO CONTAINER:")
        print("-" * 40)
        
        # Inserir vistoria
        cursor.execute('''
            INSERT INTO vistorias (
                container_numero, iso_container, capacidade, tara, lacre, armador,
                observacoes, usuario_id, unidade, data_vistoria, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero, 'ISO1234', 30000, 2500, 'LACRE123', 'MSC',
            'Container de teste', 1, unidade_teste, data_atual, 'vistoriado'
        ))
        
        # Inserir container com status vistoriado
        cursor.execute('''
            INSERT INTO containers (
                numero, status, posicao_atual, unidade, tipo_container,
                tamanho, capacidade, tara, armador, data_criacao, ultima_atualizacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero,
            "vistoriado",  # Status inicial após vistoria
            None,  # Posição inicial será definida na descarga
            unidade_teste,
            'DRY',
            '40HC',
            30000,
            2500,
            'MSC',
            data_atual,
            data_atual
        ))
        
        print(f"   * Vistoria registrada para o container {container_numero}")
        print(f"   * Status definido como 'vistoriado'")
        print(f"   * Unidade definida como '{unidade_teste}'")
        print(f"   * Posição definida como 'None' (será definida na descarga)")
        
        # Verificar se o container foi registrado corretamente após vistoria
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade
            FROM containers
            WHERE numero = ?
        ''', (container_numero,))
        
        container_apos_vistoria = cursor.fetchone()
        
        print("\n   Dados do container após vistoria:")
        print(f"   * Número: {container_apos_vistoria['numero']}")
        print(f"   * Status: {container_apos_vistoria['status']}")
        print(f"   * Posição: {container_apos_vistoria['posicao_atual'] or 'Não definida'}")
        print(f"   * Unidade: {container_apos_vistoria['unidade']}")
        
        # 2. Simular descarga do container
        print("\n3. SIMULANDO DESCARGA DO CONTAINER:")
        print("-" * 40)
        
        # Obter ID do container
        cursor.execute('SELECT id FROM containers WHERE numero = ?', (container_numero,))
        container_id = cursor.fetchone()['id']
        
        # Atualizar container para status "no patio" e definir posição
        cursor.execute('''
            UPDATE containers 
            SET status = ?, posicao_atual = ?, unidade = ?, ultima_atualizacao = ? 
            WHERE id = ?
        ''', ('no patio', posicao_teste, unidade_teste, data_atual, container_id))
        
        # Registrar operação de descarga
        cursor.execute('''
            INSERT INTO operacoes (
                tipo, modo, container_id, posicao, placa, data_operacao, usuario_id, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'descarga', 'rodoviaria', container_id, posicao_teste, 
            'ABC1234', data_atual, 1, 'Descarga de teste'
        ))
        
        print(f"   * Descarga registrada para o container {container_numero}")
        print(f"   * Status atualizado para 'no patio'")
        print(f"   * Posição definida como '{posicao_teste}'")
        print(f"   * Unidade mantida como '{unidade_teste}'")
        
        # Verificar se o container foi atualizado corretamente após descarga
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade
            FROM containers
            WHERE numero = ?
        ''', (container_numero,))
        
        container_apos_descarga = cursor.fetchone()
        
        print("\n   Dados do container após descarga:")
        print(f"   * Número: {container_apos_descarga['numero']}")
        print(f"   * Status: {container_apos_descarga['status']}")
        print(f"   * Posição: {container_apos_descarga['posicao_atual'] or 'Não definida'}")
        print(f"   * Unidade: {container_apos_descarga['unidade']}")
        
        # 3. Verificar se o container aparece na lista de containers para movimentação
        cursor.execute('''
            SELECT numero, status, posicao_atual, unidade
            FROM containers 
            WHERE status IN ('no patio', 'carregado') 
            AND posicao_atual IS NOT NULL 
            AND posicao_atual != ''
            AND unidade = ?
            AND numero = ?
        ''', (unidade_teste, container_numero))
        
        container_movimentacao = cursor.fetchone()
        
        print("\n4. VERIFICAÇÃO PARA MOVIMENTAÇÃO:")
        print("-" * 40)
        
        if container_movimentacao:
            print(f"   ✅ Container {container_numero} está disponível para movimentação!")
            print(f"   * Status: {container_movimentacao['status']}")
            print(f"   * Posição: {container_movimentacao['posicao_atual']}")
            print(f"   * Unidade: {container_movimentacao['unidade']}")
        else:
            print(f"   ❌ Container {container_numero} NÃO está disponível para movimentação!")
            print("   * Verifique se o container tem status 'no patio' ou 'carregado'")
            print("   * Verifique se o container tem uma posição definida")
            print("   * Verifique se o container está na unidade correta")
        
        # Commit e fechar conexão
        db.commit()
        db.close()
        
        print("\n" + "=" * 50)
        print("TESTE CONCLUÍDO")
        print("=" * 50)
        
    except Exception as e:
        print(f"\nErro durante o teste: {str(e)}")
        # Tentar fazer rollback se possível
        try:
            if db:
                db.rollback()
                db.close()
        except:
            pass

if __name__ == "__main__":
    testar_fluxo_completo()
