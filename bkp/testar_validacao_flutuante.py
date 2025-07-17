#!/usr/bin/env python3
"""
Script para testar a validação de containers flutuantes
através das operações de vistoria, descarga e movimentação.
"""

import requests
import json
import sys

# Configuração da API
BASE_URL = "http://127.0.0.1:8505"
SESSION = requests.Session()

def fazer_login():
    """Faz login no sistema"""
    print("🔐 Fazendo login...")
    
    # Primeiro, obter a página de login para pegar o token CSRF
    response = SESSION.get(f"{BASE_URL}/auth/login")
    if response.status_code != 200:
        print(f"❌ Erro ao acessar página de login: {response.status_code}")
        return False
    
    # Fazer login
    login_data = {
        'username': 'operador1',
        'password': 'senha123'
    }
    
    response = SESSION.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code == 200 and ('dashboard' in response.url or response.status_code == 302):
        print("✅ Login realizado com sucesso")
        return True
    else:
        print(f"❌ Erro no login: {response.status_code}")
        return False

def testar_descarga_flutuante():
    """Testa descarga de container em posição flutuante"""
    print("\n🧪 TESTE 1: Descarga em posição flutuante (A05-3)")
    print("=" * 50)
    
    # Tentar descarregar container na altura 3 sem containers nas alturas 1 e 2
    dados_descarga = {
        'numero_container': 'FLUT001',
        'tipo_operacao': 'descarga',
        'posicao': 'A05-3',  # Altura 3 sem suporte
        'modo': 'rodoviaria',
        'placa': 'ABC1234',
        'tamanho_teu': 20,
        'observacoes': 'Teste de validação de container flutuante'
    }
    
    response = SESSION.post(
        f"{BASE_URL}/operacoes/registrar_operacao",
        json=dados_descarga,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Status: {response.status_code}")
    try:
        resultado = response.json()
        print(f"Resposta: {json.dumps(resultado, indent=2, ensure_ascii=False)}")
        
        if response.status_code == 400 and not resultado.get('success', True):
            print("✅ VALIDAÇÃO FUNCIONOU: Container flutuante foi rejeitado")
            return True
        else:
            print("❌ VALIDAÇÃO FALHOU: Container flutuante foi aceito")
            return False
    except:
        print(f"❌ Erro ao processar resposta: {response.text}")
        return False

def testar_movimentacao_flutuante():
    """Testa movimentação para posição flutuante"""
    print("\n🧪 TESTE 2: Movimentação para posição flutuante (B07-4)")
    print("=" * 50)
    
    # Primeiro, verificar se existe um container para mover
    # Vamos usar um dos containers de teste existentes
    dados_movimentacao = {
        'container_id': 'TEST001',
        'tipo': 'movimentacao',
        'posicao_original': 'A01-1',  # Posição atual do container
        'posicao': 'B07-4',  # Altura 4 sem suporte
        'observacoes': 'Teste de validação de movimentação flutuante'
    }
    
    response = SESSION.post(
        f"{BASE_URL}/operacoes/registrar_operacao",
        json=dados_movimentacao,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Status: {response.status_code}")
    try:
        resultado = response.json()
        print(f"Resposta: {json.dumps(resultado, indent=2, ensure_ascii=False)}")
        
        if response.status_code == 400 and not resultado.get('success', True):
            print("✅ VALIDAÇÃO FUNCIONOU: Movimentação flutuante foi rejeitada")
            return True
        else:
            print("❌ VALIDAÇÃO FALHOU: Movimentação flutuante foi aceita")
            return False
    except:
        print(f"❌ Erro ao processar resposta: {response.text}")
        return False

def testar_descarga_40_teu_baia_impar():
    """Testa descarga de container 40 TEU em baia ímpar"""
    print("\n🧪 TESTE 3: Container 40 TEU em baia ímpar (A03-1)")
    print("=" * 50)
    
    dados_descarga = {
        'numero_container': 'TEU40001',
        'tipo_operacao': 'descarga',
        'posicao': 'A03-1',  # Baia ímpar para container 40 TEU
        'modo': 'rodoviaria',
        'placa': 'DEF5678',
        'tamanho_teu': 40,
        'observacoes': 'Teste de validação de container 40 TEU em baia ímpar'
    }
    
    response = SESSION.post(
        f"{BASE_URL}/operacoes/registrar_operacao",
        json=dados_descarga,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Status: {response.status_code}")
    try:
        resultado = response.json()
        print(f"Resposta: {json.dumps(resultado, indent=2, ensure_ascii=False)}")
        
        if response.status_code == 400 and not resultado.get('success', True):
            print("✅ VALIDAÇÃO FUNCIONOU: Container 40 TEU em baia ímpar foi rejeitado")
            return True
        else:
            print("❌ VALIDAÇÃO FALHOU: Container 40 TEU em baia ímpar foi aceito")
            return False
    except:
        print(f"❌ Erro ao processar resposta: {response.text}")
        return False

def testar_descarga_valida():
    """Testa descarga válida para confirmar que o sistema aceita operações corretas"""
    print("\n🧪 TESTE 4: Descarga válida (C06-1)")
    print("=" * 50)
    
    dados_descarga = {
        'numero_container': 'VALID001',
        'tipo_operacao': 'descarga',
        'posicao': 'C06-1',  # Posição válida na altura 1
        'modo': 'rodoviaria',
        'placa': 'GHI9012',
        'tamanho_teu': 20,
        'observacoes': 'Teste de descarga válida'
    }
    
    response = SESSION.post(
        f"{BASE_URL}/operacoes/registrar_operacao",
        json=dados_descarga,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Status: {response.status_code}")
    try:
        resultado = response.json()
        print(f"Resposta: {json.dumps(resultado, indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200 and resultado.get('success', False):
            print("✅ OPERAÇÃO VÁLIDA: Descarga aceita corretamente")
            return True
        else:
            print("❌ PROBLEMA: Operação válida foi rejeitada")
            return False
    except:
        print(f"❌ Erro ao processar resposta: {response.text}")
        return False

def main():
    """Executa todos os testes"""
    print("🧪 TESTANDO VALIDAÇÃO DE CONTAINERS FLUTUANTES")
    print("=" * 60)
    
    if not fazer_login():
        print("❌ Não foi possível fazer login. Encerrando testes.")
        return
    
    testes_passaram = []
    
    # Executar testes
    testes_passaram.append(testar_descarga_flutuante())
    testes_passaram.append(testar_movimentacao_flutuante())
    testes_passaram.append(testar_descarga_40_teu_baia_impar())
    testes_passaram.append(testar_descarga_valida())
    
    # Resumo
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES")
    print("=" * 60)
    
    total_testes = len(testes_passaram)
    testes_ok = sum(testes_passaram)
    
    print(f"✅ Testes passaram: {testes_ok}/{total_testes}")
    print(f"❌ Testes falharam: {total_testes - testes_ok}/{total_testes}")
    
    if testes_ok == total_testes:
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("✅ A validação de containers flutuantes está funcionando corretamente!")
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM!")
        print("❌ Verificar a implementação da validação.")

if __name__ == "__main__":
    main()
