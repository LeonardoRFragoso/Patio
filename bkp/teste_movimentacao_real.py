#!/usr/bin/env python3
"""
Teste para simular uma operação de movimentação real e verificar
se a validação de containers flutuantes está sendo aplicada corretamente.
"""

import sys
import os
import sqlite3
import json
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import patio_suzano

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

def simular_validacao_movimentacao(container_numero, posicao_original, nova_posicao):
    """Simula exatamente a validação que acontece na função registrar_operacao"""
    print(f"\n🔄 SIMULANDO MOVIMENTAÇÃO:")
    print(f"   Container: {container_numero}")
    print(f"   De: {posicao_original} → Para: {nova_posicao}")
    
    db = sqlite3.connect('database.db')
    cursor = db.cursor()
    
    # 1. Verificar se nova posição está ocupada
    print(f"\n1️⃣ Verificando se posição {nova_posicao} está ocupada...")
    cursor.execute(
        'SELECT numero FROM containers WHERE posicao_atual = ? AND status = "no patio" AND numero != ? AND unidade = ?', 
        (nova_posicao, container_numero, 'SUZANO')
    )
    container_existente = cursor.fetchone()
    if container_existente:
        print(f"❌ Posição {nova_posicao} ocupada pelo container {container_existente[0]}")
        return False
    else:
        print(f"✅ Posição {nova_posicao} está livre")
    
    # 2. Buscar informações do container
    print(f"\n2️⃣ Buscando informações do container {container_numero}...")
    cursor.execute('SELECT status, tamanho FROM containers WHERE numero = ? AND unidade = ?', (container_numero, 'SUZANO'))
    container_info = cursor.fetchone()
    
    if not container_info:
        print(f"❌ Container {container_numero} não encontrado")
        return False
    
    status_sistema = container_info[0]
    tamanho_container = container_info[1] if container_info[1] else '20'
    
    try:
        tamanho_teu = int(tamanho_container) if tamanho_container in ['20', '40'] else 20
    except:
        tamanho_teu = 20
    
    print(f"✅ Container encontrado: status={status_sistema}, tamanho={tamanho_teu} TEU")
    
    # 3. Validação específica do pátio Suzano (como no código real)
    print(f"\n3️⃣ Iniciando validação do pátio Suzano...")
    
    try:
        # Validar cenário CHEIO
        print(f"   🔍 Validando cenário CHEIO para posição {nova_posicao}")
        resultado_cheio = patio_suzano.validar_operacao(
            posicao=nova_posicao,
            status_container='CHEIO',
            db_connection=db,
            tamanho_teu=tamanho_teu
        )
        print(f"   📊 Resultado CHEIO: válido={resultado_cheio['valido']}, msg='{resultado_cheio['mensagem']}'")
        
        # Validar cenário VAZIO
        print(f"   🔍 Validando cenário VAZIO para posição {nova_posicao}")
        resultado_vazio = patio_suzano.validar_operacao(
            posicao=nova_posicao,
            status_container='VAZIO',
            db_connection=db,
            tamanho_teu=tamanho_teu
        )
        print(f"   📊 Resultado VAZIO: válido={resultado_vazio['valido']}, msg='{resultado_vazio['mensagem']}'")
        
    except Exception as e:
        print(f"❌ Erro na validação: {str(e)}")
        return False
    
    # 4. Lógica de decisão (como no código real)
    print(f"\n4️⃣ Aplicando lógica de decisão...")
    if not resultado_cheio['valido'] and not resultado_vazio['valido']:
        print(f"❌ OPERAÇÃO REJEITADA: Posição {nova_posicao} não é válida para nenhum cenário")
        print(f"   Erro CHEIO: {resultado_cheio['mensagem']}")
        print(f"   Erro VAZIO: {resultado_vazio['mensagem']}")
        return False
    else:
        print(f"✅ OPERAÇÃO ACEITA: Pelo menos um cenário é válido")
        if resultado_cheio['valido']:
            print(f"   ✓ Cenário CHEIO válido")
        if resultado_vazio['valido']:
            print(f"   ✓ Cenário VAZIO válido")
        return True

def testar_cenario_container_flutuante():
    """Testa o cenário específico de container flutuante"""
    print("🧪 TESTE DE CENÁRIO CONTAINER FLUTUANTE")
    print("=" * 50)
    
    db = sqlite3.connect('database.db')
    
    # Limpar dados de teste
    cursor = db.cursor()
    cursor.execute("DELETE FROM containers WHERE numero LIKE 'TESTE%'")
    db.commit()
    
    # Criar container de teste na posição A01-1
    criar_container_teste(db, 'TESTE001', 'A01-1', 20, 'no patio')
    
    # Tentar mover para A01-2 (seria flutuante se A01-1 estivesse vazia)
    print(f"\n📋 CENÁRIO 1: Movimentação VÁLIDA (com suporte)")
    resultado1 = simular_validacao_movimentacao('TESTE001', 'A01-1', 'A01-2')
    
    # Agora vamos simular o cenário problemático
    # Remover o container de A01-1 e tentar colocar outro em A01-2
    cursor.execute("DELETE FROM containers WHERE numero = 'TESTE001'")
    db.commit()
    
    # Criar container em outra posição
    criar_container_teste(db, 'TESTE002', 'B01-1', 20, 'no patio')
    
    print(f"\n📋 CENÁRIO 2: Movimentação INVÁLIDA (container flutuante)")
    resultado2 = simular_validacao_movimentacao('TESTE002', 'B01-1', 'A01-2')
    
    # Limpar dados de teste
    cursor.execute("DELETE FROM containers WHERE numero LIKE 'TESTE%'")
    db.commit()
    
    return resultado1, resultado2

def verificar_containers_existentes():
    """Verifica se há containers flutuantes no pátio atual"""
    print("\n" + "=" * 50)
    print("🔍 VERIFICAÇÃO DE CONTAINERS EXISTENTES")
    print("=" * 50)
    
    db = sqlite3.connect('database.db')
    cursor = db.cursor()
    
    # Buscar todos os containers no pátio
    cursor.execute('''
        SELECT numero, posicao_atual, status, tamanho 
        FROM containers 
        WHERE status = 'no patio' AND unidade = 'SUZANO'
        ORDER BY posicao_atual
    ''')
    
    containers = cursor.fetchall()
    print(f"📦 Total de containers no pátio: {len(containers)}")
    
    if len(containers) == 0:
        print("ℹ️  Pátio vazio - não há containers para verificar")
        return
    
    containers_flutuantes = []
    
    print(f"\n🔍 Verificando containers flutuantes...")
    for container in containers:
        numero, posicao, status, tamanho = container
        
        # Verificar se é flutuante
        resultado = patio_suzano.verificar_container_flutuante(posicao, db)
        if resultado['flutuante']:
            containers_flutuantes.append((numero, posicao, resultado['mensagem']))
            print(f"🚨 {numero} em {posicao}: {resultado['mensagem']}")
    
    if not containers_flutuantes:
        print("✅ Nenhum container flutuante detectado")
    else:
        print(f"\n⚠️  ATENÇÃO: {len(containers_flutuantes)} container(s) flutuante(s) detectado(s)!")

if __name__ == "__main__":
    print("🔬 TESTE DE MOVIMENTAÇÃO REAL - CONTAINERS FLUTUANTES")
    print("=" * 60)
    
    # Verificar containers existentes primeiro
    verificar_containers_existentes()
    
    # Testar cenários de movimentação
    resultado_valido, resultado_invalido = testar_cenario_container_flutuante()
    
    print("\n" + "=" * 60)
    print("📋 RESUMO DOS TESTES:")
    print(f"- Movimentação com suporte (válida): {'✅ ACEITA' if resultado_valido else '❌ REJEITADA'}")
    print(f"- Movimentação flutuante (inválida): {'❌ ACEITA (PROBLEMA!)' if resultado_invalido else '✅ REJEITADA'}")
    
    if resultado_invalido:
        print("\n🚨 PROBLEMA DETECTADO: Sistema está aceitando containers flutuantes!")
        print("   A validação não está funcionando corretamente.")
    else:
        print("\n✅ Sistema funcionando corretamente - containers flutuantes são rejeitados.")
