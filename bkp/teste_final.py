from posicoes_suzano import PatioSuzano
import sqlite3

def main():
    patio = PatioSuzano()
    db = sqlite3.connect('database.db')
    
    print("=== TESTE DE VALIDACAO DE CONTAINERS FLUTUANTES ===")
    print()
    
    # Teste 1: Container flutuante
    print("1. Testando container flutuante (B01-3):")
    resultado = patio.validar_operacao('B01-3', 'descarga', db, tamanho_teu=20)
    print(f"   Valido: {resultado['valido']}")
    if not resultado['valido']:
        print("   ✅ PASSOU - Container flutuante rejeitado")
    else:
        print("   ❌ FALHOU - Container flutuante aceito")
    print()
    
    # Teste 2: Container válido na altura 1
    print("2. Testando container válido (A01-1):")
    resultado = patio.validar_operacao('A01-1', 'descarga', db, tamanho_teu=20)
    print(f"   Valido: {resultado['valido']}")
    if resultado['valido']:
        print("   ✅ PASSOU - Container válido aceito")
    else:
        print("   ❌ FALHOU - Container válido rejeitado")
    print()
    
    # Teste 3: Container 40 TEU em baia ímpar
    print("3. Testando 40 TEU em baia ímpar (A03-1):")
    resultado = patio.validar_operacao('A03-1', 'descarga', db, tamanho_teu=40)
    print(f"   Valido: {resultado['valido']}")
    if not resultado['valido']:
        print("   ✅ PASSOU - 40 TEU em baia ímpar rejeitado")
    else:
        print("   ❌ FALHOU - 40 TEU em baia ímpar aceito")
    print()
    
    # Teste 4: Container 40 TEU em baia par
    print("4. Testando 40 TEU em baia par (A02-1):")
    resultado = patio.validar_operacao('A02-1', 'descarga', db, tamanho_teu=40)
    print(f"   Valido: {resultado['valido']}")
    if resultado['valido']:
        print("   ✅ PASSOU - 40 TEU em baia par aceito")
    else:
        print("   ❌ FALHOU - 40 TEU em baia par rejeitado")
    
    db.close()
    print()
    print("=== TESTE CONCLUIDO ===")

if __name__ == "__main__":
    main()
