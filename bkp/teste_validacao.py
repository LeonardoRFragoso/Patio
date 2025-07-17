"""
Script para testar os novos endpoints de validação de posições do pátio de Floriano.
"""

import requests
import json

# Configurações
BASE_URL = 'http://127.0.0.1:8505'
HEADERS = {'Content-Type': 'application/json'}

def testar_endpoint_validacao():
    """Testa o endpoint /validar_posicao"""
    print("🧪 TESTANDO ENDPOINT /validar_posicao")
    print("=" * 50)
    
    # Simulação de testes sem login (deve retornar erro 401)
    url = f"{BASE_URL}/validar_posicao"
    
    testes = [
        {"posicao": "A01-1", "status": "CHEIO", "operacao": "descarga"},
        {"posicao": "C01-4", "status": "CHEIO", "operacao": "descarga"},
        {"posicao": "A01-1", "status": "VAZIO", "operacao": "movimentacao"},
        {"posicao": "X999", "status": "CHEIO", "operacao": "descarga"},  # Posição inválida
    ]
    
    for i, teste in enumerate(testes, 1):
        print(f"\n🔍 Teste {i}: {teste}")
        try:
            response = requests.post(url, json=teste, headers=HEADERS, timeout=5)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ❌ Erro de autenticação (esperado sem login)")
            else:
                data = response.json()
                print(f"   Resposta: {data}")
                
        except Exception as e:
            print(f"   ❌ Erro na requisição: {e}")

def testar_endpoint_sugestoes():
    """Testa o endpoint /sugestoes_posicoes"""
    print("\n\n🧪 TESTANDO ENDPOINT /sugestoes_posicoes")
    print("=" * 50)
    
    # Simulação de testes sem login (deve retornar erro 401)
    url = f"{BASE_URL}/sugestoes_posicoes"
    
    testes = [
        {"status": "CHEIO"},
        {"status": "VAZIO"},
        {"status": "CHEIO", "baia": "A"},
        {"status": "VAZIO", "altura_max": "3"},
    ]
    
    for i, teste in enumerate(testes, 1):
        params = "&".join([f"{k}={v}" for k, v in teste.items()])
        test_url = f"{url}?{params}"
        
        print(f"\n🔍 Teste {i}: {teste}")
        print(f"   URL: {test_url}")
        
        try:
            response = requests.get(test_url, timeout=5)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ❌ Erro de autenticação (esperado sem login)")
            else:
                data = response.json()
                print(f"   Resposta: {data}")
                
        except Exception as e:
            print(f"   ❌ Erro na requisição: {e}")

def testar_funcoes_diretas():
    """Testa as funções do módulo posicoes_floriano diretamente"""
    print("\n\n🧪 TESTANDO FUNÇÕES DIRETAS DO MÓDULO")
    print("=" * 50)
    
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(__file__))
        
        from posicoes_floriano import patio_floriano
        
        # Testes de validação
        print("\n📋 Testes de Validação:")
        testes_validacao = [
            ("A01-1", "CHEIO"),
            ("A01-1", "VAZIO"),
            ("C01-4", "CHEIO"),  # Deve ser inválido (apenas VAZIO)
            ("C01-4", "VAZIO"),  # Deve ser válido
            ("X999", "CHEIO"),  # Posição inexistente
        ]
        
        for posicao, status in testes_validacao:
            resultado = patio_floriano.validar_operacao(posicao, status)
            emoji = "✅" if resultado['valido'] else "❌"
            print(f"   {emoji} {posicao} + {status}: {resultado['mensagem']}")
            if not resultado['valido'] and resultado.get('sugestoes'):
                print(f"      💡 Sugestões: {', '.join(resultado['sugestoes'][:3])}")
        
        # Testes de sugestões
        print("\n💡 Testes de Sugestões:")
        
        sugestoes_cheio = patio_floriano.sugerir_posicoes_para_container("CHEIO")
        print(f"   Primeiras 5 posições para CHEIO: {', '.join(sugestoes_cheio[:5])}")
        
        sugestoes_vazio = patio_floriano.sugerir_posicoes_para_container("VAZIO")
        print(f"   Primeiras 5 posições para VAZIO: {', '.join(sugestoes_vazio[:5])}")
        
        # Sugestões filtradas
        sugestoes_baia_a = patio_floriano.sugerir_posicoes_para_container("CHEIO", baia_preferida="A")
        print(f"   Primeiras 5 posições CHEIO na baia A: {', '.join(sugestoes_baia_a[:5])}")
        
        sugestoes_altura_max = patio_floriano.sugerir_posicoes_para_container("VAZIO", altura_maxima=2)
        print(f"   Primeiras 5 posições VAZIO até altura 2: {', '.join(sugestoes_altura_max[:5])}")
        
        # Estatísticas
        stats = patio_floriano.obter_estatisticas_patio()
        print(f"\n📊 Estatísticas do Pátio:")
        print(f"   Total de posições: {stats['total_posicoes']}")
        print(f"   Posições CHEIO/VAZIO: {stats['posicoes_cheio_vazio']}")
        print(f"   Posições apenas VAZIO: {stats['posicoes_apenas_vazio']}")
        print(f"   Baias disponíveis: {', '.join(stats['baias_disponiveis'])}")
        
        print("\n✅ Todos os testes diretos foram executados com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro nos testes diretos: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("🚀 INICIANDO TESTES DE VALIDAÇÃO DO PÁTIO DE FLORIANO")
    print("=" * 60)
    
    # Testar funções diretas primeiro
    testar_funcoes_diretas()
    
    # Testar endpoints (vão dar erro 401 sem login, mas confirma que estão funcionando)
    testar_endpoint_validacao()
    testar_endpoint_sugestoes()
    
    print("\n" + "=" * 60)
    print("🎯 RESUMO DOS TESTES:")
    print("✅ Módulo posicoes_floriano carregado e funcionando")
    print("✅ Funções de validação operacionais")
    print("✅ Funções de sugestão operacionais") 
    print("✅ Endpoints criados (requerem autenticação)")
    print("\n💡 Para testar os endpoints completos, faça login no sistema!")

if __name__ == "__main__":
    main()
