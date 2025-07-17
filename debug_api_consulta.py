#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de debug para testar a API de consulta de containers
"""

import requests
import json
from datetime import datetime

def testar_api_consulta():
    """Testa a API de consulta de containers"""
    
    # URL da API
    base_url = "http://127.0.0.1:8505"
    
    # Containers para testar
    containers_teste = ["TESTE123", "TESTE1234544S", "TESTE"]
    
    print("=" * 60)
    print("🔍 TESTE DA API DE CONSULTA DE CONTAINERS")
    print("=" * 60)
    
    for container_numero in containers_teste:
        print(f"\n📦 Testando container: {container_numero}")
        print("-" * 40)
        
        try:
            # Fazer requisição para a API
            url = f"{base_url}/operacoes/buscar_container?numero={container_numero}"
            print(f"🌐 URL: {url}")
            
            response = requests.get(url)
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                # Mostrar conteúdo bruto primeiro
                content = response.text
                print(f"📄 Conteúdo bruto da resposta: '{content[:200]}{'...' if len(content) > 200 else ''}'")
                
                try:
                    data = response.json()
                    print(f"✅ Resposta JSON recebida:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                except json.JSONDecodeError as e:
                    print(f"❌ Erro ao decodificar JSON: {e}")
                    print(f"📄 Conteúdo completo da resposta:")
                    print(repr(content))
                    continue
                
                # Verificar estrutura da resposta
                if data.get('success') and data.get('container'):
                    container = data['container']
                    print(f"\n🔍 ANÁLISE DOS CAMPOS:")
                    print(f"   - Número: {container.get('numero', 'N/A')}")
                    print(f"   - Status: {container.get('status', 'N/A')}")
                    print(f"   - Posição: {container.get('posicao_atual', 'N/A')}")
                    print(f"   - Tamanho: {container.get('tamanho', 'N/A')}")
                    print(f"   - Tipo: {container.get('tipo_container', 'N/A')}")
                    print(f"   - Armador: {container.get('armador', 'N/A')}")
                    print(f"   - Booking: {container.get('booking', 'N/A')}")
                    print(f"   - Condição: {container.get('condicao', 'N/A')}")
                    print(f"   - Capacidade: {container.get('capacidade', 'N/A')}")
                    print(f"   - Tara: {container.get('tara', 'N/A')}")
                    print(f"   - Placa: {container.get('placa', 'N/A')}")
                    print(f"   - Vagão: {container.get('vagao', 'N/A')}")
                    print(f"   - Data Vistoria: {container.get('data_vistoria', 'N/A')}")
                    
                    # Verificar operações
                    operacoes = data.get('operacoes', [])
                    print(f"   - Operações: {len(operacoes)} encontradas")
                    
                    if operacoes:
                        print(f"   - Primeira operação: {operacoes[0]}")
                else:
                    print(f"❌ Estrutura de resposta inválida")
                    
            else:
                print(f"❌ Erro na requisição: {response.status_code}")
                print(f"   Resposta: {response.text}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 TESTE CONCLUÍDO")
    print("=" * 60)

if __name__ == "__main__":
    testar_api_consulta()
