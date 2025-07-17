#!/usr/bin/env python3
"""
Teste específico para verificar se a validação de containers flutuantes está funcionando
durante operações de movimentação.
"""

import sys
import os
import sqlite3
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import patio_suzano

def criar_container_teste(db, numero, posicao, tamanho=20):
    """Cria um container de teste no banco de dados"""
    cursor = db.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO containers 
        (numero, posicao_atual, status, tamanho, unidade, data_entrada, ultima_atualizacao)
        VALUES (?, ?, 'no patio', ?, 'SUZANO', ?, ?)
    ''', (numero, posicao, tamanho, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    db.commit()
    print(f"✅ Container {numero} criado na posição {posicao}")

def limpar_containers_teste(db):
    """Remove containers de teste"""
    cursor = db.cursor()
    cursor.execute("DELETE FROM containers WHERE numero LIKE 'TESTE%'")
    db.commit()
    print("🧹 Containers de teste removidos")

def testar_container_flutuante():
    """Testa a validação de container flutuante"""
    print("🧪 TESTE DE VALIDAÇÃO DE CONTAINER FLUTUANTE")
    print("=" * 50)
    
    # Obter conexão com o banco
    db = sqlite3.connect('database.db')
    
    # Limpar dados de teste anteriores
    limpar_containers_teste(db)
    
    print("\n📋 CENÁRIO: Container na altura 2 sem suporte na altura 1")
    print("- Posição A01-1: VAZIA")
    print("- Posição A01-2: Tentativa de colocar container")
    
    # Verificar se A01-1 está vazia
    cursor = db.cursor()
    cursor.execute('SELECT COUNT(*) FROM containers WHERE posicao_atual = ?', ('A01-1',))
    count_a01_1 = cursor.fetchone()[0]
    print(f"- Containers em A01-1: {count_a01_1}")
    
    # Testar validação de container flutuante para A01-2
    print("\n🔍 TESTANDO: Validação de container flutuante em A01-2")
    resultado_flutuante = patio_suzano.verificar_container_flutuante('A01-2', db)
    
    print(f"- É flutuante: {resultado_flutuante['flutuante']}")
    print(f"- Mensagem: {resultado_flutuante['mensagem']}")
    print(f"- Posições necessárias: {resultado_flutuante['posicoes_necessarias']}")
    print(f"- Posições vazias: {resultado_flutuante['posicoes_vazias']}")
    
    # Testar validação completa da operação
    print("\n🔍 TESTANDO: Validação completa da operação em A01-2")
    resultado_operacao = patio_suzano.validar_operacao(
        posicao='A01-2',
        status_container='CHEIO',
        db_connection=db,
        tamanho_teu=20
    )
    
    print(f"- Operação válida: {resultado_operacao['valido']}")
    print(f"- Mensagem: {resultado_operacao['mensagem']}")
    print(f"- Detalhes: {resultado_operacao.get('detalhes', {})}")
    print(f"- Sugestões: {resultado_operacao.get('sugestoes', [])}")
    
    # Verificar se a validação está funcionando corretamente
    print("\n📊 RESULTADO DO TESTE:")
    if resultado_flutuante['flutuante'] and not resultado_operacao['valido']:
        print("✅ TESTE PASSOU: Container flutuante foi detectado e rejeitado")
        return True
    elif resultado_flutuante['flutuante'] and resultado_operacao['valido']:
        print("❌ TESTE FALHOU: Container flutuante foi detectado mas operação foi aceita")
        return False
    elif not resultado_flutuante['flutuante']:
        print("❌ TESTE FALHOU: Container flutuante NÃO foi detectado")
        return False
    else:
        print("❓ RESULTADO INESPERADO")
        return False

def testar_cenario_real():
    """Testa o cenário real mencionado pelo usuário"""
    print("\n" + "=" * 50)
    print("🧪 TESTE DO CENÁRIO REAL")
    print("=" * 50)
    
    db = sqlite3.connect('database.db')
    
    # Verificar containers existentes no pátio
    cursor = db.cursor()
    cursor.execute('''
        SELECT numero, posicao_atual, status, tamanho 
        FROM containers 
        WHERE status = 'no patio' 
        ORDER BY posicao_atual
    ''')
    
    containers = cursor.fetchall()
    print(f"\n📦 CONTAINERS NO PÁTIO ({len(containers)} total):")
    
    containers_flutuantes = []
    
    for container in containers:
        numero, posicao, status, tamanho = container
        print(f"- {numero}: {posicao} ({status}, {tamanho} TEU)")
        
        # Verificar se este container é flutuante
        resultado = patio_suzano.verificar_container_flutuante(posicao, db)
        if resultado['flutuante']:
            containers_flutuantes.append((numero, posicao, resultado['mensagem']))
    
    print(f"\n🚨 CONTAINERS FLUTUANTES DETECTADOS ({len(containers_flutuantes)} total):")
    if containers_flutuantes:
        for numero, posicao, mensagem in containers_flutuantes:
            print(f"- {numero} em {posicao}: {mensagem}")
    else:
        print("- Nenhum container flutuante detectado")
    
    return len(containers_flutuantes) > 0

if __name__ == "__main__":
    print("🔬 INICIANDO TESTES DE VALIDAÇÃO DE CONTAINERS FLUTUANTES")
    print("=" * 60)
    
    # Teste 1: Validação básica
    teste1_passou = testar_container_flutuante()
    
    # Teste 2: Cenário real
    tem_flutuantes = testar_cenario_real()
    
    print("\n" + "=" * 60)
    print("📋 RESUMO DOS TESTES:")
    print(f"- Teste de validação básica: {'✅ PASSOU' if teste1_passou else '❌ FALHOU'}")
    print(f"- Containers flutuantes no pátio: {'🚨 SIM' if tem_flutuantes else '✅ NÃO'}")
    
    if tem_flutuantes:
        print("\n⚠️  ATENÇÃO: Foram detectados containers flutuantes no pátio!")
        print("   Isso indica que a validação não está sendo aplicada corretamente")
        print("   durante as operações de movimentação.")
    else:
        print("\n✅ Nenhum container flutuante detectado no pátio atual.")
