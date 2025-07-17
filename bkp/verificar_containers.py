#!/usr/bin/env python3
"""
Script para verificar o estado atual dos containers
"""

import sqlite3

def verificar_containers():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print("🔍 VERIFICAÇÃO DE CONTAINERS")
    print("="*50)
    
    # Total de containers
    cursor.execute("SELECT COUNT(*) FROM containers")
    total = cursor.fetchone()[0]
    print(f"📦 Total de containers: {total}")
    
    # Containers por tamanho
    cursor.execute("SELECT tamanho, COUNT(*) FROM containers GROUP BY tamanho")
    por_tamanho = cursor.fetchall()
    print(f"\n📏 Por tamanho:")
    for tamanho, count in por_tamanho:
        print(f"   {tamanho} TEU: {count} containers")
    
    # Containers de 40 TEU
    cursor.execute("SELECT numero, posicao_atual FROM containers WHERE tamanho = '40' ORDER BY posicao_atual")
    containers_40 = cursor.fetchall()
    print(f"\n🚛 Containers de 40 TEU ({len(containers_40)}):")
    for numero, posicao in containers_40:
        print(f"   {numero}: {posicao}")
    
    # Containers em altura > 1
    cursor.execute("""
        SELECT numero, posicao_atual, tamanho 
        FROM containers 
        WHERE posicao_atual LIKE '%-2' OR 
              posicao_atual LIKE '%-3' OR 
              posicao_atual LIKE '%-4' OR 
              posicao_atual LIKE '%-5'
        ORDER BY posicao_atual
    """)
    containers_altura = cursor.fetchall()
    print(f"\n🏗️ Containers em altura > 1 ({len(containers_altura)}):")
    for numero, posicao, tamanho in containers_altura:
        print(f"   {numero} ({tamanho} TEU): {posicao}")
    
    # Containers de 40 TEU em altura > 1
    containers_40_altura = [c for c in containers_altura if c[2] == '40']
    print(f"\n⚠️  Containers de 40 TEU em altura > 1 ({len(containers_40_altura)}):")
    for numero, posicao, tamanho in containers_40_altura:
        print(f"   {numero}: {posicao}")
    
    conn.close()

if __name__ == "__main__":
    verificar_containers()
