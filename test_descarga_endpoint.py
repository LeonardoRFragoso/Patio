#!/usr/bin/env python3
"""
Script para testar especificamente o endpoint de descarga
"""

import requests
import json

def test_descarga_endpoint():
    """Testa o endpoint de containers vistoriados"""
    
    print("[INFO] Testando endpoint de containers vistoriados...")
    
    try:
        # Testar endpoint diretamente (sem autenticação primeiro)
        response = requests.get('http://127.0.0.1:8505/operacoes/containers/vistoriados')
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"[OK] Response JSON: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                if data.get('success'):
                    containers = data.get('data', [])
                    print(f"[INFO] Encontrados {len(containers)} containers vistoriados")
                    
                    for i, container in enumerate(containers[:3]):
                        print(f"  Container {i+1}:")
                        print(f"    Numero: {container.get('numero', 'N/A')}")
                        print(f"    TEU: {container.get('teu', 'N/A')}")
                        print(f"    Vagao: {container.get('vagao', 'N/A')}")
                        print(f"    Placa: {container.get('placa', 'N/A')}")
                        print(f"    Data Vistoria: {container.get('data_vistoria', 'N/A')}")
                else:
                    print(f"[ERRO] Endpoint retornou erro: {data.get('message', 'Erro desconhecido')}")
                    
            except json.JSONDecodeError as e:
                print(f"[ERRO] Resposta não é JSON válido: {e}")
                print(f"Response text: {response.text[:500]}")
                
        elif response.status_code == 401:
            print("[INFO] Endpoint requer autenticação (esperado)")
            print("Isso significa que o endpoint existe e está funcionando")
            
        elif response.status_code == 404:
            print("[ERRO] Endpoint não encontrado - verificar rota")
            
        else:
            print(f"[ERRO] Status inesperado: {response.status_code}")
            print(f"Response: {response.text[:300]}")
            
    except requests.exceptions.ConnectionError:
        print("[ERRO] Não foi possível conectar ao servidor")
        print("Verifique se o servidor está rodando em http://127.0.0.1:8505")
        
    except Exception as e:
        print(f"[ERRO] Exceção: {e}")

if __name__ == "__main__":
    test_descarga_endpoint()
