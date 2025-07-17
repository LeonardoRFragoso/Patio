#!/usr/bin/env python3
"""
Script para verificar e padronizar posições no formato A01-1
"""

import sqlite3
import re
from datetime import datetime

def verificar_posicoes_atuais():
    """Verifica as posições atuais no banco de dados"""
    conn = sqlite3.connect('backend/database.db')
    cursor = conn.cursor()
    
    # Buscar todas as posições distintas
    cursor.execute('''
        SELECT DISTINCT posicao_atual 
        FROM containers 
        WHERE posicao_atual IS NOT NULL 
        AND posicao_atual != '' 
        ORDER BY posicao_atual
    ''')
    
    posicoes = cursor.fetchall()
    
    print("=== POSIÇÕES ATUAIS NO BANCO ===")
    formato_antigo = []
    formato_novo = []
    formato_invalido = []
    
    for pos in posicoes:
        posicao = pos[0]
        print(f"  - {posicao}")
        
        # Verificar formato A01-1 (novo)
        if re.match(r'^[A-E](0[1-9]|1[0-9]|20)-[1-5]$', posicao):
            formato_novo.append(posicao)
        # Verificar formato A011 (antigo)
        elif re.match(r'^[A-E]\d{3}$', posicao):
            formato_antigo.append(posicao)
        else:
            formato_invalido.append(posicao)
    
    print(f"\n=== RESUMO ===")
    print(f"Total de posições: {len(posicoes)}")
    print(f"Formato novo (A01-1): {len(formato_novo)}")
    print(f"Formato antigo (A011): {len(formato_antigo)}")
    print(f"Formato inválido: {len(formato_invalido)}")
    
    if formato_antigo:
        print(f"\n=== POSIÇÕES NO FORMATO ANTIGO ===")
        for pos in formato_antigo:
            print(f"  - {pos}")
    
    if formato_invalido:
        print(f"\n=== POSIÇÕES INVÁLIDAS ===")
        for pos in formato_invalido:
            print(f"  - {pos}")
    
    conn.close()
    return formato_antigo, formato_invalido

def converter_posicao_antigo_para_novo(posicao_antiga):
    """Converte posição do formato A011 para A01-1"""
    if not re.match(r'^[A-E]\d{3}$', posicao_antiga):
        return None
    
    baia = posicao_antiga[0]
    resto = posicao_antiga[1:]
    
    # Extrair posição e altura
    if len(resto) == 3:
        posicao_num = int(resto[:2])
        altura = int(resto[2])
        
        # Validar limites
        if 1 <= posicao_num <= 20 and 1 <= altura <= 5:
            return f"{baia}{posicao_num:02d}-{altura}"
    
    return None

def atualizar_posicoes_banco():
    """Atualiza posições no banco de dados para o formato A01-1"""
    conn = sqlite3.connect('backend/database.db')
    cursor = conn.cursor()
    
    # Buscar containers com posições no formato antigo
    cursor.execute('''
        SELECT id, numero, posicao_atual 
        FROM containers 
        WHERE posicao_atual IS NOT NULL 
        AND posicao_atual != ''
        AND posicao_atual REGEXP '^[A-E][0-9]{3}$'
    ''')
    
    containers = cursor.fetchall()
    
    print(f"\n=== ATUALIZANDO {len(containers)} CONTAINERS ===")
    
    atualizados = 0
    erros = 0
    
    for container in containers:
        container_id, numero, posicao_antiga = container
        posicao_nova = converter_posicao_antigo_para_novo(posicao_antiga)
        
        if posicao_nova:
            try:
                cursor.execute('''
                    UPDATE containers 
                    SET posicao_atual = ?, ultima_atualizacao = ?
                    WHERE id = ?
                ''', (posicao_nova, datetime.now().isoformat(), container_id))
                
                print(f"  ✅ {numero}: {posicao_antiga} → {posicao_nova}")
                atualizados += 1
            except Exception as e:
                print(f"  ❌ Erro ao atualizar {numero}: {e}")
                erros += 1
        else:
            print(f"  ⚠️ Não foi possível converter {numero}: {posicao_antiga}")
            erros += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n=== RESULTADO ===")
    print(f"Atualizados: {atualizados}")
    print(f"Erros: {erros}")

def atualizar_operacoes_banco():
    """Atualiza posições na tabela de operações"""
    conn = sqlite3.connect('backend/database.db')
    cursor = conn.cursor()
    
    # Verificar se a tabela operacoes existe
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='operacoes'")
    if not cursor.fetchone():
        print("Tabela 'operacoes' não encontrada")
        conn.close()
        return
    
    # Buscar operações com posições no formato antigo
    cursor.execute('''
        SELECT id, posicao 
        FROM operacoes 
        WHERE posicao IS NOT NULL 
        AND posicao != ''
        AND posicao REGEXP '^[A-E][0-9]{3}$'
    ''')
    
    operacoes = cursor.fetchall()
    
    print(f"\n=== ATUALIZANDO {len(operacoes)} OPERAÇÕES ===")
    
    atualizados = 0
    erros = 0
    
    for operacao in operacoes:
        operacao_id, posicao_antiga = operacao
        posicao_nova = converter_posicao_antigo_para_novo(posicao_antiga)
        
        if posicao_nova:
            try:
                cursor.execute('''
                    UPDATE operacoes 
                    SET posicao = ?
                    WHERE id = ?
                ''', (posicao_nova, operacao_id))
                
                print(f"  ✅ Operação {operacao_id}: {posicao_antiga} → {posicao_nova}")
                atualizados += 1
            except Exception as e:
                print(f"  ❌ Erro ao atualizar operação {operacao_id}: {e}")
                erros += 1
        else:
            print(f"  ⚠️ Não foi possível converter operação {operacao_id}: {posicao_antiga}")
            erros += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n=== RESULTADO OPERAÇÕES ===")
    print(f"Atualizados: {atualizados}")
    print(f"Erros: {erros}")

if __name__ == "__main__":
    print("🔍 Verificando posições atuais...")
    formato_antigo, formato_invalido = verificar_posicoes_atuais()
    
    if formato_antigo:
        resposta = input(f"\n❓ Encontradas {len(formato_antigo)} posições no formato antigo. Deseja atualizá-las? (s/n): ")
        if resposta.lower() in ['s', 'sim', 'y', 'yes']:
            print("\n🔄 Atualizando containers...")
            atualizar_posicoes_banco()
            
            print("\n🔄 Atualizando operações...")
            atualizar_operacoes_banco()
            
            print("\n✅ Atualização concluída!")
            
            print("\n🔍 Verificando resultado...")
            verificar_posicoes_atuais()
    else:
        print("\n✅ Todas as posições já estão no formato correto A01-1!")
