#!/usr/bin/env python3
"""
Teste para verificar o problema na validação dupla (CHEIO e VAZIO)
que pode estar permitindo containers flutuantes.
"""

import sys
import os
import sqlite3
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import patio_suzano

def testar_validacao_dupla():
    """Testa a validação dupla CHEIO/VAZIO para container flutuante"""
    print("🧪 TESTE DE VALIDAÇÃO DUPLA (CHEIO/VAZIO)")
    print("=" * 50)
    
    # Conectar ao banco
    db = sqlite3.connect('database.db')
    
    # Posição de teste: A01-2 (altura 2 sem suporte)
    posicao_teste = 'A01-2'
    
    print(f"\n📍 TESTANDO POSIÇÃO: {posicao_teste}")
    
    # Verificar se A01-1 está vazia
    cursor = db.cursor()
    cursor.execute('SELECT COUNT(*) FROM containers WHERE posicao_atual = ?', ('A01-1',))
    count_a01_1 = cursor.fetchone()[0]
    print(f"- Containers em A01-1 (suporte): {count_a01_1}")
    
    # Testar validação para container CHEIO
    print(f"\n🔍 VALIDAÇÃO PARA CONTAINER CHEIO:")
    resultado_cheio = patio_suzano.validar_operacao(
        posicao=posicao_teste,
        status_container='CHEIO',
        db_connection=db,
        tamanho_teu=20
    )
    
    print(f"- Válido: {resultado_cheio['valido']}")
    print(f"- Mensagem: {resultado_cheio['mensagem']}")
    
    # Testar validação para container VAZIO
    print(f"\n🔍 VALIDAÇÃO PARA CONTAINER VAZIO:")
    resultado_vazio = patio_suzano.validar_operacao(
        posicao=posicao_teste,
        status_container='VAZIO',
        db_connection=db,
        tamanho_teu=20
    )
    
    print(f"- Válido: {resultado_vazio['valido']}")
    print(f"- Mensagem: {resultado_vazio['mensagem']}")
    
    # Simular a lógica do backend
    print(f"\n🤖 LÓGICA DO BACKEND:")
    print(f"- Resultado CHEIO válido: {resultado_cheio['valido']}")
    print(f"- Resultado VAZIO válido: {resultado_vazio['valido']}")
    
    # A lógica atual: se QUALQUER um for válido, aceita
    operacao_aceita = resultado_cheio['valido'] or resultado_vazio['valido']
    print(f"- Operação seria aceita: {operacao_aceita}")
    
    # Análise do problema
    print(f"\n📊 ANÁLISE:")
    if not resultado_cheio['valido'] and not resultado_vazio['valido']:
        print("✅ CORRETO: Ambas validações falharam, operação rejeitada")
        return False
    elif resultado_cheio['valido'] and resultado_vazio['valido']:
        print("✅ CORRETO: Ambas validações passaram, operação aceita")
        return False
    elif not resultado_cheio['valido'] and resultado_vazio['valido']:
        print("❌ PROBLEMA: Validação CHEIO falhou (container flutuante)")
        print("❌          mas validação VAZIO passou, operação aceita!")
        print("❌          Isso permite containers flutuantes!")
        return True
    elif resultado_cheio['valido'] and not resultado_vazio['valido']:
        print("❌ PROBLEMA: Validação VAZIO falhou")
        print("❌          mas validação CHEIO passou, operação aceita!")
        return True
    
    return False

def verificar_posicoes_vazias():
    """Verifica se posições VAZIO têm regras diferentes para containers flutuantes"""
    print("\n" + "=" * 50)
    print("🧪 VERIFICAÇÃO DE REGRAS PARA POSIÇÕES VAZIO")
    print("=" * 50)
    
    db = sqlite3.connect('database.db')
    
    # Verificar se posições VAZIO têm validação de container flutuante
    posicoes_teste = ['A01-2', 'A01-3', 'A01-4', 'A01-5']
    
    for posicao in posicoes_teste:
        print(f"\n📍 TESTANDO: {posicao}")
        
        # Verificar validação de container flutuante diretamente
        resultado_flutuante = patio_suzano.verificar_container_flutuante(posicao, db)
        print(f"- É flutuante: {resultado_flutuante['flutuante']}")
        
        # Verificar validação completa para VAZIO
        resultado_vazio = patio_suzano.validar_operacao(
            posicao=posicao,
            status_container='VAZIO',
            db_connection=db,
            tamanho_teu=20
        )
        print(f"- Validação VAZIO: {resultado_vazio['valido']}")
        print(f"- Mensagem: {resultado_vazio['mensagem']}")
        
        if resultado_flutuante['flutuante'] and resultado_vazio['valido']:
            print("❌ PROBLEMA: Container flutuante mas validação VAZIO passou!")

if __name__ == "__main__":
    print("🔬 TESTE DE VALIDAÇÃO DUPLA PARA CONTAINERS FLUTUANTES")
    print("=" * 60)
    
    # Teste principal
    tem_problema = testar_validacao_dupla()
    
    # Verificação adicional
    verificar_posicoes_vazias()
    
    print("\n" + "=" * 60)
    print("📋 CONCLUSÃO:")
    if tem_problema:
        print("❌ PROBLEMA IDENTIFICADO: A validação dupla permite containers flutuantes!")
        print("   Solução: A validação de container flutuante deve ser aplicada")
        print("   independentemente do status (CHEIO ou VAZIO).")
    else:
        print("✅ Validação funcionando corretamente.")
