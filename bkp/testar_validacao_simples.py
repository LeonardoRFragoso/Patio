#!/usr/bin/env python3
"""
Script para testar diretamente a validação de containers flutuantes
usando as funções do backend sem precisar de autenticação HTTP.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import PatioSuzano
import sqlite3

def testar_validacao_flutuante():
    """Testa a validação de containers flutuantes"""
    print("🧪 TESTANDO VALIDAÇÃO DE CONTAINERS FLUTUANTES")
    print("=" * 60)
    
    # Inicializar o pátio de Suzano
    patio = PatioSuzano()
    
    # Conectar ao banco de dados
    db = sqlite3.connect('database.db')
    
    print("\n🧪 TESTE 1: Container flutuante na altura 3 sem suporte")
    print("-" * 50)
    
    # Testar posição flutuante (altura 3 sem containers nas alturas 1 e 2)
    resultado = patio.validar_operacao('A05-3', 'descarga', db, tamanho_teu=20)
    
    print(f"Posição testada: A05-3")
    print(f"Válido: {resultado['valido']}")
    print(f"Mensagem: {resultado['mensagem']}")
    
    if not resultado['valido'] and 'flutuante' in resultado['mensagem'].lower():
        print("✅ TESTE 1 PASSOU: Container flutuante foi rejeitado")
        teste1_ok = True
    else:
        print("❌ TESTE 1 FALHOU: Container flutuante foi aceito")
        teste1_ok = False
    
    print("\n🧪 TESTE 2: Container 40 TEU em baia ímpar")
    print("-" * 50)
    
    # Testar container 40 TEU em baia ímpar
    resultado = patio.validar_operacao('A03-1', 'descarga', db, tamanho_teu=40)
    
    print(f"Posição testada: A03-1 (40 TEU)")
    print(f"Válido: {resultado['valido']}")
    print(f"Mensagem: {resultado['mensagem']}")
    
    if not resultado['valido'] and ('40' in resultado['mensagem'] or 'par' in resultado['mensagem'].lower()):
        print("✅ TESTE 2 PASSOU: Container 40 TEU em baia ímpar foi rejeitado")
        teste2_ok = True
    else:
        print("❌ TESTE 2 FALHOU: Container 40 TEU em baia ímpar foi aceito")
        teste2_ok = False
    
    print("\n🧪 TESTE 3: Posição válida na altura 1")
    print("-" * 50)
    
    # Testar posição válida
    resultado = patio.validar_operacao('C06-1', 'descarga', db, tamanho_teu=20)
    
    print(f"Posição testada: C06-1")
    print(f"Válido: {resultado['valido']}")
    print(f"Mensagem: {resultado['mensagem']}")
    
    if resultado['valido']:
        print("✅ TESTE 3 PASSOU: Posição válida foi aceita")
        teste3_ok = True
    else:
        print("❌ TESTE 3 FALHOU: Posição válida foi rejeitada")
        teste3_ok = False
    
    print("\n🧪 TESTE 4: Container 40 TEU em baia par")
    print("-" * 50)
    
    # Testar container 40 TEU em baia par
    resultado = patio.validar_operacao('A04-1', 'descarga', db, tamanho_teu=40)
    
    print(f"Posição testada: A04-1 (40 TEU)")
    print(f"Válido: {resultado['valido']}")
    print(f"Mensagem: {resultado['mensagem']}")
    
    if resultado['valido']:
        print("✅ TESTE 4 PASSOU: Container 40 TEU em baia par foi aceito")
        teste4_ok = True
    else:
        print("❌ TESTE 4 FALHOU: Container 40 TEU em baia par foi rejeitado")
        teste4_ok = False
    
    print("\n🧪 TESTE 5: Verificação de container flutuante específico")
    print("-" * 50)
    
    # Testar verificação direta de container flutuante
    verificacao = patio.verificar_container_flutuante('B07-4', db)
    
    print(f"Posição testada: B07-4")
    print(f"É flutuante: {verificacao['flutuante']}")
    print(f"Mensagem: {verificacao['mensagem']}")
    
    if verificacao['flutuante']:
        print("✅ TESTE 5 PASSOU: Container flutuante foi detectado")
        teste5_ok = True
    else:
        print("❌ TESTE 5 FALHOU: Container flutuante não foi detectado")
        teste5_ok = False
    
    # Fechar conexão
    db.close()
    
    # Resumo
    testes = [teste1_ok, teste2_ok, teste3_ok, teste4_ok, teste5_ok]
    testes_ok = sum(testes)
    total_testes = len(testes)
    
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES")
    print("=" * 60)
    print(f"✅ Testes passaram: {testes_ok}/{total_testes}")
    print(f"❌ Testes falharam: {total_testes - testes_ok}/{total_testes}")
    
    if testes_ok == total_testes:
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("✅ A validação de containers flutuantes está funcionando corretamente!")
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM!")
        print("❌ Verificar a implementação da validação.")
    
    return testes_ok == total_testes

def verificar_containers_teste():
    """Verifica os containers de teste no banco"""
    print("\n📦 VERIFICANDO CONTAINERS DE TESTE NO BANCO")
    print("=" * 60)
    
    db = sqlite3.connect('database.db')
    cursor = db.cursor()
    
    # Contar containers de teste
    cursor.execute("SELECT COUNT(*) FROM containers WHERE numero LIKE 'TEST%' AND unidade = 'Suzano'")
    total = cursor.fetchone()[0]
    print(f"Total de containers de teste: {total}")
    
    # Mostrar alguns exemplos
    cursor.execute("""
        SELECT numero, posicao_atual, tamanho 
        FROM containers 
        WHERE numero LIKE 'TEST%' AND unidade = 'Suzano' 
        ORDER BY posicao_atual 
        LIMIT 10
    """)
    
    print("\nExemplos de containers de teste:")
    for row in cursor.fetchall():
        print(f"  {row[0]} -> {row[1]} ({row[2]} TEU)")
    
    db.close()

if __name__ == "__main__":
    verificar_containers_teste()
    testar_validacao_flutuante()
