#!/usr/bin/env python3
"""
Script para testar diretamente a resposta da API obter_dados_patio_3d
e verificar se os dados estão sendo retornados corretamente
"""

import requests
import json
import sys

def test_api_response():
    """Testa a resposta da API para o container TESTE123"""
    
    # URL da API
    url = "http://127.0.0.1:8505/operacoes/containers/patio-3d"
    
    try:
        # Fazer requisição para a API
        print("🔍 Fazendo requisição para:", url)
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Resposta recebida com sucesso!")
            print(f"📊 Status: {response.status_code}")
            print(f"📦 Total de containers: {len(data.get('containers', []))}")
            
            # Procurar pelo container TESTE123
            containers = data.get('containers', [])
            teste123 = None
            
            for container in containers:
                if container.get('numero') == 'TESTE123':
                    teste123 = container
                    break
            
            if teste123:
                print("\n🎯 CONTAINER TESTE123 ENCONTRADO:")
                print("=" * 50)
                
                # Informações básicas
                print(f"Número: {teste123.get('numero')}")
                print(f"Status: {teste123.get('status')}")
                print(f"Posição: {teste123.get('posicao_atual')}")
                print(f"Armador: {teste123.get('armador')}")
                
                # Dados de vistoria
                vistorias = teste123.get('vistorias', [])
                print(f"\n📋 VISTORIAS ({len(vistorias)} encontradas):")
                for i, vistoria in enumerate(vistorias):
                    print(f"  Vistoria {i+1}:")
                    print(f"    Data: {vistoria.get('data_vistoria')}")
                    print(f"    Lacre: {vistoria.get('lacre')}")
                    print(f"    Condição: {vistoria.get('condicao')}")
                    print(f"    Placa: {vistoria.get('placa')}")
                    print(f"    Vagão: {vistoria.get('vagao')}")
                
                # Dados de operação
                operacoes = teste123.get('operacoes', [])
                print(f"\n🚛 OPERAÇÕES ({len(operacoes)} encontradas):")
                for i, operacao in enumerate(operacoes):
                    print(f"  Operação {i+1}:")
                    print(f"    Tipo: {operacao.get('tipo')}")
                    print(f"    Modo: {operacao.get('modo')}")
                    print(f"    Placa: {operacao.get('placa')}")
                    print(f"    Vagão: {operacao.get('vagao')}")
                    print(f"    Data: {operacao.get('data_operacao')}")
                    print(f"    Observações: {operacao.get('observacoes')}")
                
                # Dados extras
                print(f"\n💼 DADOS EXTRAS:")
                print(f"  Booking: {teste123.get('booking')}")
                print(f"  Capacidade: {teste123.get('capacidade')}")
                print(f"  Tara: {teste123.get('tara')}")
                
                print("\n🔍 ESTRUTURA COMPLETA (JSON):")
                print("=" * 50)
                print(json.dumps(teste123, indent=2, ensure_ascii=False))
                
            else:
                print("❌ Container TESTE123 não encontrado na resposta da API")
                print("📋 Containers disponíveis:")
                for container in containers:
                    print(f"  - {container.get('numero', 'N/A')}")
        
        else:
            print(f"❌ Erro na requisição: {response.status_code}")
            print(f"📄 Resposta: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor")
        print("💡 Verifique se o servidor está rodando em http://127.0.0.1:8505")
    
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    test_api_response()
