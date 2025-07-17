#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Teste da integração da validação de movimentação no backend
"""

import sqlite3
import sys
import os
import json
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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

def simular_requisicao_movimentacao(posicao_origem, posicao_destino, container_numero):
    """Simula uma requisição de movimentação como seria feita pelo frontend"""
    
    # Conectar ao banco
    db = sqlite3.connect('database.db')
    
    try:
        # Importar a validação
        from posicoes_suzano import patio_suzano
        
        # Simular os dados que viriam do frontend
        dados = {
            'numero_container': container_numero,
            'tipo_operacao': 'movimentacao',
            'posicao': posicao_destino,
            'posicao_anterior': posicao_origem,
            'observacoes': 'Teste de movimentação',
            'tamanho_teu': 20
        }
        
        print(f"\n🔄 SIMULANDO MOVIMENTAÇÃO:")
        print(f"   Container: {container_numero}")
        print(f"   De: {posicao_origem} → Para: {posicao_destino}")
        
        # Buscar informações do container
        cursor = db.cursor()
        cursor.execute('SELECT id, posicao_atual, status, unidade FROM containers WHERE numero = ?', (container_numero,))
        container = cursor.fetchone()
        
        if not container:
            print(f"❌ Container {container_numero} não encontrado")
            return False
        
        container_id, posicao_atual, status, unidade = container
        print(f"   Status atual: {status} na posição {posicao_atual}")
        
        # Verificar se está no pátio
        if status not in ['no patio', 'carregado']:
            print(f"❌ Container não pode ser movimentado (Status: {status})")
            return False
        
        # Aplicar a validação de movimentação (como no backend)
        if unidade == 'SUZANO' and posicao_origem:
            validacao_movimentacao = patio_suzano.validar_movimentacao(
                posicao_origem, posicao_destino, 'CHEIO', db, 20
            )
            
            if not validacao_movimentacao['valido']:
                print(f"❌ MOVIMENTAÇÃO REJEITADA:")
                print(f"   Motivo: {validacao_movimentacao['mensagem']}")
                
                if 'containers_afetados' in validacao_movimentacao['detalhes']:
                    print("   Containers que ficarão flutuantes:")
                    for container_afetado in validacao_movimentacao['detalhes']['containers_afetados']:
                        print(f"     - {container_afetado['numero']} em {container_afetado['posicao']}")
                
                if validacao_movimentacao['sugestoes']:
                    print("   Sugestões:")
                    for sugestao in validacao_movimentacao['sugestoes']:
                        print(f"     - {sugestao}")
                
                return False
            
            print(f"✅ VALIDAÇÃO PASSOU: {validacao_movimentacao['mensagem']}")
        
        # Se chegou até aqui, a movimentação seria aceita
        print("✅ MOVIMENTAÇÃO SERIA ACEITA pelo backend")
        return True
        
    except Exception as e:
        print(f"❌ ERRO na simulação: {str(e)}")
        return False
    finally:
        db.close()

def testar_cenarios_completos():
    """Testa cenários completos de movimentação"""
    
    print("🔬 TESTE COMPLETO DE VALIDAÇÃO NO BACKEND")
    print("=" * 60)
    
    # Conectar ao banco
    db = sqlite3.connect('database.db')
    
    try:
        # Limpar dados de teste anteriores
        limpar_containers_teste(db)
        
        # Criar cenário de teste
        print("\n📦 CRIANDO CENÁRIO DE TESTE:")
        criar_container_teste(db, 'TESTE001', 'A01-1', 20, 'no patio')  # Base
        criar_container_teste(db, 'TESTE002', 'A01-2', 20, 'no patio')  # Altura 2
        criar_container_teste(db, 'TESTE003', 'A01-3', 20, 'no patio')  # Altura 3
        
        print("\n🏗️ ESTRUTURA CRIADA:")
        print("   A01-3: TESTE003 (altura 3)")
        print("   A01-2: TESTE002 (altura 2)")
        print("   A01-1: TESTE001 (altura 1) ← BASE")
        
        # Teste 1: Tentar mover container da base - DEVE FALHAR
        print("\n" + "="*50)
        print("🧪 TESTE 1: Mover container da BASE")
        resultado1 = simular_requisicao_movimentacao('A01-1', 'B01-1', 'TESTE001')
        
        # Teste 2: Tentar mover container do meio - DEVE FALHAR
        print("\n" + "="*50)
        print("🧪 TESTE 2: Mover container do MEIO")
        resultado2 = simular_requisicao_movimentacao('A01-2', 'B01-1', 'TESTE002')
        
        # Teste 3: Mover container do topo - DEVE PASSAR
        print("\n" + "="*50)
        print("🧪 TESTE 3: Mover container do TOPO")
        resultado3 = simular_requisicao_movimentacao('A01-3', 'B01-1', 'TESTE003')
        
        # Resumo
        print("\n" + "=" * 60)
        print("📋 RESUMO DOS TESTES NO BACKEND:")
        print(f"- Mover BASE (A01-1): {'❌ REJEITADO' if not resultado1 else '✅ ACEITO'}")
        print(f"- Mover MEIO (A01-2): {'❌ REJEITADO' if not resultado2 else '✅ ACEITO'}")
        print(f"- Mover TOPO (A01-3): {'✅ ACEITO' if resultado3 else '❌ REJEITADO'}")
        
        # Verificar se os resultados estão corretos
        if not resultado1 and not resultado2 and resultado3:
            print("\n🎉 INTEGRAÇÃO NO BACKEND FUNCIONANDO PERFEITAMENTE!")
            print("   ✅ Backend rejeita movimentações que causariam containers flutuantes")
            print("   ✅ Backend aceita movimentações seguras")
            print("   ✅ Sistema está protegido contra containers flutuantes")
        else:
            print("\n⚠️ PROBLEMA NA INTEGRAÇÃO DO BACKEND!")
            print("   ❌ Alguns resultados não estão como esperado")
            
    finally:
        # Limpar dados de teste
        limpar_containers_teste(db)
        db.close()

if __name__ == "__main__":
    testar_cenarios_completos()
