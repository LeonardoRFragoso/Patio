#!/usr/bin/env python3
"""
Script para inserir 50 containers de teste no pátio de Suzano
seguindo as regras de empilhamento e TEU.

Regras implementadas:
1. Containers não podem ser flutuantes (altura > 1 sem suporte)
2. Containers de 40 TEU devem estar em baias pares
3. Containers de 20 TEU podem estar em qualquer baia
4. Máximo 5 alturas por posição
5. Distribuição equilibrada entre as baias A-E
"""

import sqlite3
import random
from datetime import datetime, timedelta
import sys
import os

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def conectar_db():
    """Conecta ao banco de dados SQLite"""
    db_path = os.path.join(os.path.dirname(__file__), 'patio_containers.db')
    return sqlite3.connect(db_path)

def gerar_numero_container():
    """Gera um número de container único no formato ABCD1234567"""
    letras = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=4))
    numeros = ''.join(random.choices('0123456789', k=7))
    return f"{letras}{numeros}"

def verificar_container_existe(cursor, numero):
    """Verifica se um container já existe no banco"""
    cursor.execute('SELECT id FROM containers WHERE numero = ?', (numero,))
    return cursor.fetchone() is not None

def obter_posicoes_ocupadas(cursor):
    """Obtém todas as posições ocupadas no pátio de Suzano"""
    cursor.execute('''
        SELECT posicao_atual FROM containers 
        WHERE unidade = 'Suzano' AND status = 'no patio' 
        AND posicao_atual IS NOT NULL
    ''')
    return {row[0] for row in cursor.fetchall()}

def decompor_posicao(posicao):
    """Decompõe uma posição no formato A01-1 em row, baia, altura"""
    import re
    match = re.match(r'^([A-E])([0-9]{2})-([1-5])$', posicao)
    if match:
        return match.group(1), int(match.group(2)), int(match.group(3))  # row, baia, altura
    return None, None, None

def verificar_suporte_adequado(posicoes_ocupadas, row, baia, altura):
    """Verifica se há suporte adequado para um container na altura especificada"""
    if altura == 1:
        return True  # Altura 1 sempre tem suporte (chão)
    
    # Verificar se todas as alturas abaixo estão ocupadas
    for h in range(1, altura):
        posicao_abaixo = f"{row}{baia:02d}-{h}"
        if posicao_abaixo not in posicoes_ocupadas:
            return False
    return True

def gerar_posicoes_validas(posicoes_ocupadas, tamanho_teu):
    """Gera lista de posições válidas baseadas nas regras"""
    posicoes_validas = []
    
    # Definir baias baseadas no tamanho TEU
    if tamanho_teu == 40:
        # Containers de 40 TEU: apenas baias pares
        baias = ['A', 'B', 'C', 'D', 'E']
        linhas_validas = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]  # Apenas pares
    else:
        # Containers de 20 TEU: qualquer baia
        baias = ['A', 'B', 'C', 'D', 'E']
        linhas_validas = list(range(1, 21))  # 1 a 20
    
    for row in baias:  # Agora baias são rows (A-E)
        for baia in linhas_validas:  # Agora linhas são baias (1-20)
            for altura in range(1, 6):  # Alturas 1 a 5
                posicao = f"{row}{baia:02d}-{altura}"
                
                # Verificar se a posição não está ocupada
                if posicao in posicoes_ocupadas:
                    continue
                
                # Verificar se há suporte adequado
                if verificar_suporte_adequado(posicoes_ocupadas, row, baia, altura):
                    posicoes_validas.append(posicao)
    
    return posicoes_validas

def inserir_containers_teste():
    """Insere 50 containers de teste seguindo as regras do pátio"""
    
    print("🚛 Iniciando inserção de containers de teste no pátio de Suzano...")
    print("=" * 60)
    
    try:
        db = conectar_db()
        cursor = db.cursor()
        
        # Limpar containers de teste anteriores
        print("🧹 Limpando containers de teste anteriores...")
        cursor.execute('''
            DELETE FROM containers 
            WHERE numero LIKE 'TEST%' AND unidade = 'Suzano'
        ''')
        db.commit()
        
        # Obter posições já ocupadas
        posicoes_ocupadas = obter_posicoes_ocupadas(cursor)
        print(f"📍 Posições já ocupadas: {len(posicoes_ocupadas)}")
        
        containers_inseridos = 0
        containers_20_teu = 0
        containers_40_teu = 0
        tentativas = 0
        max_tentativas = 200
        
        # Estatísticas por baia
        stats_baia = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
        stats_altura = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        while containers_inseridos < 50 and tentativas < max_tentativas:
            tentativas += 1
            
            # Gerar dados do container
            numero_container = f"TEST{containers_inseridos + 1:03d}"
            
            # Alternar entre 20 e 40 TEU (70% de 20 TEU, 30% de 40 TEU)
            tamanho_teu = 20 if random.random() < 0.7 else 40
            
            # Gerar posições válidas para este tamanho
            posicoes_validas = gerar_posicoes_validas(posicoes_ocupadas, tamanho_teu)
            
            if not posicoes_validas:
                print(f"⚠️  Não há posições válidas para container de {tamanho_teu} TEU")
                continue
            
            # Escolher uma posição aleatória
            posicao = random.choice(posicoes_validas)
            row, baia, altura = decompor_posicao(posicao)  # row, baia, altura
            
            # Dados do container
            data_atual = datetime.now() - timedelta(days=random.randint(0, 30))
            data_str = data_atual.strftime('%Y-%m-%d %H:%M:%S')
            
            status_opcoes = ['no patio']
            status = random.choice(status_opcoes)
            
            armadores = ['MSC', 'MAERSK', 'CMA CGM', 'COSCO', 'HAPAG-LLOYD', 'ONE', 'EVERGREEN']
            armador = random.choice(armadores)
            
            tipos_container = ['DRY', 'REEFER', 'TANK', 'FLAT RACK']
            tipo_container = random.choice(tipos_container)
            
            # Inserir container
            try:
                cursor.execute('''
                    INSERT INTO containers (
                        numero, status, posicao_atual, unidade, data_criacao, 
                        ultima_atualizacao, tamanho, armador, tipo_container,
                        capacidade, tara
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    numero_container, status, posicao, 'Suzano', data_str,
                    data_str, str(tamanho_teu), armador, tipo_container,
                    f"{tamanho_teu * 1000}kg", f"{tamanho_teu * 100}kg"
                ))
                
                # Atualizar estatísticas
                posicoes_ocupadas.add(posicao)
                containers_inseridos += 1
                
                if tamanho_teu == 20:
                    containers_20_teu += 1
                else:
                    containers_40_teu += 1
                
                stats_baia[row] += 1  # Agora row é A-E
                stats_altura[altura] += 1
                
                print(f"✅ Container {containers_inseridos:2d}/50: {numero_container} ({tamanho_teu} TEU) → {posicao}")
                
            except sqlite3.Error as e:
                print(f"❌ Erro ao inserir container {numero_container}: {e}")
                continue
        
        # Commit das alterações
        db.commit()
        
        print("\n" + "=" * 60)
        print("📊 RESUMO DA INSERÇÃO")
        print("=" * 60)
        print(f"✅ Containers inseridos: {containers_inseridos}/50")
        print(f"📦 Containers 20 TEU: {containers_20_teu}")
        print(f"📦 Containers 40 TEU: {containers_40_teu}")
        print(f"🔄 Tentativas realizadas: {tentativas}")
        
        print("\n📍 Distribuição por Baia:")
        for baia, count in stats_baia.items():
            print(f"   Baia {baia}: {count} containers")
        
        print("\n📏 Distribuição por Altura:")
        for altura, count in stats_altura.items():
            print(f"   Altura {altura}: {count} containers")
        
        # Verificar se há containers flutuantes (não deveria haver)
        print("\n🔍 Verificando containers flutuantes...")
        containers_flutuantes = 0
        
        cursor.execute('''
            SELECT numero, posicao_atual FROM containers 
            WHERE unidade = 'Suzano' AND status = 'no patio' 
            AND numero LIKE 'TEST%'
            ORDER BY posicao_atual
        ''')
        
        for row in cursor.fetchall():
            numero, posicao = row
            baia, linha, altura = decompor_posicao(posicao)
            
            if altura > 1:
                # Verificar se há suporte
                if not verificar_suporte_adequado(posicoes_ocupadas, baia, linha, altura):
                    print(f"⚠️  Container flutuante detectado: {numero} em {posicao}")
                    containers_flutuantes += 1
        
        if containers_flutuantes == 0:
            print("✅ Nenhum container flutuante detectado - Regras respeitadas!")
        else:
            print(f"❌ {containers_flutuantes} containers flutuantes detectados")
        
        print("\n🎯 Inserção concluída com sucesso!")
        
    except sqlite3.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
    finally:
        if 'db' in locals():
            db.close()

def limpar_containers_teste():
    """Remove todos os containers de teste"""
    print("🧹 Removendo containers de teste...")
    
    try:
        db = conectar_db()
        cursor = db.cursor()
        
        cursor.execute('''
            DELETE FROM containers 
            WHERE numero LIKE 'TEST%' AND unidade = 'Suzano'
        ''')
        
        removidos = cursor.rowcount
        db.commit()
        
        print(f"✅ {removidos} containers de teste removidos")
        
    except sqlite3.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Gerenciar containers de teste no pátio de Suzano')
    parser.add_argument('--limpar', action='store_true', help='Remove containers de teste')
    parser.add_argument('--inserir', action='store_true', help='Insere containers de teste')
    
    args = parser.parse_args()
    
    if args.limpar:
        limpar_containers_teste()
    elif args.inserir:
        inserir_containers_teste()
    else:
        print("Uso: python inserir_containers_teste.py [--inserir|--limpar]")
        print("  --inserir: Insere 50 containers de teste")
        print("  --limpar:  Remove containers de teste")
