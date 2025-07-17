from posicoes_suzano import PatioSuzano
import sqlite3

def main():
    patio = PatioSuzano()
    db = sqlite3.connect('database.db')
    
    print("🧪 TESTE COMPLETO DE VALIDAÇÃO DE CONTAINERS FLUTUANTES")
    print("=" * 60)
    
    testes_passaram = []
    
    # Teste 1: Container flutuante (altura 3 sem suporte)
    print("\n1. 🔍 TESTE: Container flutuante (C01-3)")
    print("-" * 40)
    resultado = patio.validar_operacao('C01-3', 'descarga', db, tamanho_teu=20)
    print(f"   Posição: C01-3 (altura 3)")
    print(f"   Válido: {resultado['valido']}")
    print(f"   Mensagem: {resultado['mensagem']}")
    
    if not resultado['valido'] and 'flutuante' in resultado['mensagem'].lower():
        print("   ✅ PASSOU - Container flutuante foi rejeitado corretamente")
        testes_passaram.append(True)
    else:
        print("   ❌ FALHOU - Container flutuante não foi rejeitado")
        testes_passaram.append(False)
    
    # Teste 2: Container válido na altura 1
    print("\n2. 🔍 TESTE: Container válido na altura 1 (A03-1)")
    print("-" * 40)
    resultado = patio.validar_operacao('A03-1', 'descarga', db, tamanho_teu=20)
    print(f"   Posição: A03-1 (altura 1)")
    print(f"   Válido: {resultado['valido']}")
    print(f"   Mensagem: {resultado['mensagem']}")
    
    if resultado['valido']:
        print("   ✅ PASSOU - Container válido foi aceito")
        testes_passaram.append(True)
    else:
        print("   ❌ FALHOU - Container válido foi rejeitado")
        testes_passaram.append(False)
    
    # Teste 3: Container 40 TEU em baia ímpar
    print("\n3. 🔍 TESTE: Container 40 TEU em baia ímpar (A05-1)")
    print("-" * 40)
    resultado = patio.validar_operacao('A05-1', 'descarga', db, tamanho_teu=40)
    print(f"   Posição: A05-1 (baia ímpar, 40 TEU)")
    print(f"   Válido: {resultado['valido']}")
    print(f"   Mensagem: {resultado['mensagem']}")
    
    if not resultado['valido'] and ('40' in resultado['mensagem'] or 'ímpar' in resultado['mensagem'] or 'par' in resultado['mensagem']):
        print("   ✅ PASSOU - Container 40 TEU em baia ímpar foi rejeitado")
        testes_passaram.append(True)
    else:
        print("   ❌ FALHOU - Container 40 TEU em baia ímpar não foi rejeitado")
        testes_passaram.append(False)
    
    # Teste 4: Container 40 TEU em baia par
    print("\n4. 🔍 TESTE: Container 40 TEU em baia par (A06-1)")
    print("-" * 40)
    resultado = patio.validar_operacao('A06-1', 'descarga', db, tamanho_teu=40)
    print(f"   Posição: A06-1 (baia par, 40 TEU)")
    print(f"   Válido: {resultado['valido']}")
    print(f"   Mensagem: {resultado['mensagem']}")
    
    if resultado['valido']:
        print("   ✅ PASSOU - Container 40 TEU em baia par foi aceito")
        testes_passaram.append(True)
    else:
        print("   ❌ FALHOU - Container 40 TEU em baia par foi rejeitado")
        testes_passaram.append(False)
    
    # Teste 5: Verificação direta de container flutuante
    print("\n5. 🔍 TESTE: Verificação direta de container flutuante (D01-4)")
    print("-" * 40)
    verificacao = patio.verificar_container_flutuante('D01-4', db)
    print(f"   Posição: D01-4 (altura 4)")
    print(f"   É flutuante: {verificacao['flutuante']}")
    print(f"   Mensagem: {verificacao['mensagem']}")
    
    if verificacao['flutuante']:
        print("   ✅ PASSOU - Container flutuante foi detectado")
        testes_passaram.append(True)
    else:
        print("   ❌ FALHOU - Container flutuante não foi detectado")
        testes_passaram.append(False)
    
    db.close()
    
    # Resumo final
    total_testes = len(testes_passaram)
    testes_ok = sum(testes_passaram)
    
    print("\n" + "=" * 60)
    print("📊 RESUMO FINAL DOS TESTES")
    print("=" * 60)
    print(f"✅ Testes que passaram: {testes_ok}/{total_testes}")
    print(f"❌ Testes que falharam: {total_testes - testes_ok}/{total_testes}")
    print(f"📈 Taxa de sucesso: {(testes_ok/total_testes)*100:.1f}%")
    
    if testes_ok == total_testes:
        print("\n🎉 PARABÉNS! TODOS OS TESTES PASSARAM!")
        print("✅ A validação de containers flutuantes está funcionando perfeitamente!")
        print("✅ O sistema está pronto para uso em produção!")
    elif testes_ok >= total_testes * 0.8:
        print("\n🟡 MAIORIA DOS TESTES PASSOU!")
        print("⚠️  Alguns ajustes podem ser necessários.")
    else:
        print("\n🔴 MUITOS TESTES FALHARAM!")
        print("❌ Verificar a implementação da validação.")
    
    return testes_ok == total_testes

if __name__ == "__main__":
    main()
