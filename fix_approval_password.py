#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para adicionar preenchimento automático da senha "1234" no formulário de aprovação
"""

import os
import re

def fix_approval_password():
    """Adiciona preenchimento automático da senha no formulário de aprovação"""
    
    file_path = r"c:\Users\leonardo.fragoso\Desktop\Projetos\patio-servidor\templates\admin\solicitacoes.html"
    
    if not os.path.exists(file_path):
        print(f"❌ Arquivo não encontrado: {file_path}")
        return False
    
    try:
        # Ler o arquivo
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Padrão para encontrar o código de animação do formulário de aprovação
        pattern = r"(form\.style\.transform = 'translateY\(0\)';)\s*(\}, 50\);)"
        
        # Substituição com o código de preenchimento automático da senha
        replacement = r"""\1
                        
                        // Preencher automaticamente a senha inicial
                        const senhaInput = form.querySelector('input[name="senha_inicial"]');
                        if (senhaInput && !senhaInput.value) {
                            senhaInput.value = '1234';
                        }
                    \2"""
        
        # Fazer a substituição
        new_content = re.sub(pattern, replacement, content, count=1)
        
        if new_content != content:
            # Criar backup
            backup_path = file_path + '.backup_password'
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Backup criado: {backup_path}")
            
            # Salvar o arquivo modificado
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print("✅ Preenchimento automático da senha '1234' adicionado com sucesso!")
            print("📋 Modificação aplicada:")
            print("   - Senha '1234' será preenchida automaticamente ao abrir formulário de aprovação")
            print("   - Campo será preenchido apenas se estiver vazio")
            print("   - Funcionalidade integrada à animação de abertura do modal")
            
            return True
        else:
            print("⚠️  Padrão não encontrado. Tentando abordagem alternativa...")
            
            # Abordagem alternativa: procurar por um padrão mais específico
            alt_pattern = r"(setTimeout\(\(\) => \{\s*form\.classList\.add\('show'\);\s*form\.style\.opacity = '1';\s*form\.style\.transform = 'translateY\(0\)';)\s*(\}, 50\);)"
            
            alt_replacement = r"""\1
                        
                        // Preencher automaticamente a senha inicial
                        const senhaInput = form.querySelector('input[name="senha_inicial"]');
                        if (senhaInput && !senhaInput.value) {
                            senhaInput.value = '1234';
                        }
                    \2"""
            
            new_content_alt = re.sub(alt_pattern, alt_replacement, content, count=1, flags=re.DOTALL)
            
            if new_content_alt != content:
                # Criar backup
                backup_path = file_path + '.backup_password'
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Backup criado: {backup_path}")
                
                # Salvar o arquivo modificado
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content_alt)
                
                print("✅ Preenchimento automático da senha '1234' adicionado com sucesso (abordagem alternativa)!")
                return True
            else:
                print("❌ Não foi possível encontrar o padrão para modificação")
                print("📋 Verifique se o arquivo contém o código de animação do formulário de aprovação")
                return False
            
    except Exception as e:
        print(f"❌ Erro ao processar arquivo: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Adicionando preenchimento automático da senha '1234' no formulário de aprovação...")
    success = fix_approval_password()
    
    if success:
        print("\n🎯 CORREÇÃO CONCLUÍDA!")
        print("📝 Próximos passos:")
        print("   1. Reinicie o servidor Flask")
        print("   2. Acesse a página de solicitações")
        print("   3. Clique em 'Aprovar' em uma solicitação")
        print("   4. Verifique se o campo 'Senha Inicial' é preenchido automaticamente com '1234'")
    else:
        print("\n❌ CORREÇÃO FALHOU!")
        print("📝 Verifique manualmente o arquivo e adicione o código:")
        print("""
        // Preencher automaticamente a senha inicial
        const senhaInput = form.querySelector('input[name="senha_inicial"]');
        if (senhaInput && !senhaInput.value) {
            senhaInput.value = '1234';
        }
        """)
