#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Teste da validação de movimentação considerando containers flutuantes
"""

import sqlite3
import sys
import os
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import PatioSuzano

def criar_container_teste(db, numero, posicao_inicial, tamanho=20, status='no patio'):
    """Cria um container de teste no banco de dados"""
    cursor = db.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO containers 
        (numero, posicao_atual, status, tamanho, unidade, data_criacao, ultima_atualizacao)
        VALUES (?, ?, ?, ?, 'SUZANO', ?, ?)
    ''', (numero, posicao_inicial, status, tamanho, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    db.commit()
    print(f"✅ Container {numero} criado na posição {posicao_inicial}")

def limpar_containers_teste(db):
    """Remove containers de teste"""
    cursor = db.cursor()
    cursor.execute("DELETE FROM containers WHERE numero LIKE 'TESTE%'")
    db.commit()
    print("🧹 Containers de teste removidos")

def testar_cenario_movimentacao_problematica():
    """Testa cenário onde movimentação causaria containers flutuantes"""
    
    print("\n🧪 TESTE DE MOVIMENTAÇÃO PROBLEMÁTICA")
    print("=" * 50)
    
    # Conectar ao banco
    db = sqlite3.connect('database.db')
    patio = PatioSuzano()
    
    try:
        # Limpar dados de teste anteriores
        limpar_containers_teste(db)
        
        # Criar cenário:
        # TESTE001 em A01-1 (base)
        # TESTE002 em A01-2 (depende de A01-1)
        # TESTE003 em A01-3 (depende de A01-1 e A01-2)
        
        print("\n📦 CRIANDO CENÁRIO DE TESTE:")
        criar_container_teste(db, 'TESTE001', 'A01-1', 20, 'no patio')  # Base
        criar_container_teste(db, 'TESTE002', 'A01-2', 20, 'no patio')  # Altura 2
        criar_container_teste(db, 'TESTE003', 'A01-3', 20, 'no patio')  # Altura 3
        
        print("\n🏗️ ESTRUTURA CRIADA:")
        print("   A01-3: TESTE003 (altura 3)")
        print("   A01-2: TESTE002 (altura 2)")
        print("   A01-1: TESTE001 (altura 1) ← BASE")
        
        # Teste 1: Tentar mover container da base (A01-1) - DEVE FALHAR
        print("\n🔄 TESTE 1: Mover container da BASE (A01-1 → B01-1)")
        print("-" * 50)
        
        resultado = patio.validar_movimentacao('A01-1', 'B01-1', 'CHEIO', db, 20)
        
        print(f"✅ Resultado: {'VÁLIDO' if resultado['valido'] else 'INVÁLIDO'}")
        print(f"📝 Mensagem: {resultado['mensagem']}")
        
        if 'containers_afetados' in resultado['detalhes']:
            print("🚨 Containers que ficarão flutuantes:")
            for container in resultado['detalhes']['containers_afetados']:
                print(f"   - {container['numero']} em {container['posicao']}: {container['motivo']}")
        
        if resultado['sugestoes']:
            print("💡 Sugestões:")
            for sugestao in resultado['sugestoes']:
                print(f"   - {sugestao}")
        
        # Teste 2: Tentar mover container do meio (A01-2) - DEVE FALHAR
        print("\n🔄 TESTE 2: Mover container do MEIO (A01-2 → B01-1)")
        print("-" * 50)
        
        resultado2 = patio.validar_movimentacao('A01-2', 'B01-1', 'CHEIO', db, 20)
        
        print(f"✅ Resultado: {'VÁLIDO' if resultado2['valido'] else 'INVÁLIDO'}")
        print(f"📝 Mensagem: {resultado2['mensagem']}")
        
        if 'containers_afetados' in resultado2['detalhes']:
            print("🚨 Containers que ficarão flutuantes:")
            for container in resultado2['detalhes']['containers_afetados']:
                print(f"   - {container['numero']} em {container['posicao']}: {container['motivo']}")
        
        # Teste 3: Mover container do topo (A01-3) - DEVE PASSAR
        print("\n🔄 TESTE 3: Mover container do TOPO (A01-3 → B01-1)")
        print("-" * 50)
        
        resultado3 = patio.validar_movimentacao('A01-3', 'B01-1', 'CHEIO', db, 20)
        
        print(f"✅ Resultado: {'VÁLIDO' if resultado3['valido'] else 'INVÁLIDO'}")
        print(f"📝 Mensagem: {resultado3['mensagem']}")
        
        # Resumo
        print("\n" + "=" * 60)
        print("📋 RESUMO DOS TESTES:")
        print(f"- Mover BASE (A01-1): {'❌ REJEITADO' if not resultado['valido'] else '✅ ACEITO'}")
        print(f"- Mover MEIO (A01-2): {'❌ REJEITADO' if not resultado2['valido'] else '✅ ACEITO'}")
        print(f"- Mover TOPO (A01-3): {'✅ ACEITO' if resultado3['valido'] else '❌ REJEITADO'}")
        
        # Verificar se os resultados estão corretos
        if not resultado['valido'] and not resultado2['valido'] and resultado3['valido']:
            print("\n🎉 VALIDAÇÃO FUNCIONANDO CORRETAMENTE!")
            print("   ✅ Movimentações que causariam containers flutuantes foram rejeitadas")
            print("   ✅ Movimentação segura foi aceita")
        else:
            print("\n⚠️ PROBLEMA NA VALIDAÇÃO!")
            print("   ❌ Alguns resultados não estão como esperado")
        
        return resultado, resultado2, resultado3
        
    finally:
        # Limpar dados de teste
        limpar_containers_teste(db)
        db.close()

if __name__ == "__main__":
    print("🔬 TESTE DE VALIDAÇÃO DE MOVIMENTAÇÃO - CONTAINERS FLUTUANTES")
    print("=" * 70)
    
    testar_cenario_movimentacao_problematica()
