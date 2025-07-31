#!/usr/bin/env python3
"""
Script para testar se os dados estão sendo passados corretamente para o template
"""

from app import create_app
from flask import session

def test_template_rendering():
    """Testa se o template está recebendo os dados corretos"""
    app = create_app()
    
    with app.app_context():
        with app.test_client() as client:
            # Simular login como admin_administrativo
            with client.session_transaction() as sess:
                sess['username'] = 'admin_adm'
                sess['role'] = 'admin_administrativo'
                sess['nivel'] = 'admin_administrativo'
                sess['unidade'] = 'Suzano'
            
            # Fazer requisição para a página de histórico
            response = client.get('/admin/historico-containers')
            
            print(f"Status da resposta: {response.status_code}")
            
            if response.status_code == 200:
                html_content = response.get_data(as_text=True)
                
                # Procurar por dados das unidades no HTML
                if 'unidades' in html_content:
                    print("✅ Variável 'unidades' encontrada no HTML")
                    
                    # Extrair a parte que contém as unidades
                    import re
                    pattern = r'const unidades = (\[.*?\]);'
                    match = re.search(pattern, html_content)
                    
                    if match:
                        unidades_js = match.group(1)
                        print(f"Unidades no JavaScript: {unidades_js}")
                    else:
                        print("❌ Padrão de unidades não encontrado no JavaScript")
                        
                        # Procurar por qualquer menção a unidades
                        lines = html_content.split('\n')
                        for i, line in enumerate(lines):
                            if 'unidades' in line.lower():
                                print(f"Linha {i+1}: {line.strip()}")
                else:
                    print("❌ Variável 'unidades' não encontrada no HTML")
                
                # Verificar se há erros de JavaScript no HTML
                if 'console.error' in html_content:
                    print("⚠️ Possíveis erros de console encontrados no HTML")
                
                # Salvar HTML para análise
                with open('debug_historico_page.html', 'w', encoding='utf-8') as f:
                    f.write(html_content)
                print("HTML salvo em debug_historico_page.html para análise")
                
                return True
            else:
                print(f"❌ Erro na requisição: {response.status_code}")
                print(f"Resposta: {response.get_data(as_text=True)}")
                return False

if __name__ == "__main__":
    print("Testando renderização do template de histórico")
    print("=" * 50)
    
    success = test_template_rendering()
    
    print("\n" + "=" * 50)
    print(f"Resultado: {'✅ SUCESSO' if success else '❌ ERRO'}")
