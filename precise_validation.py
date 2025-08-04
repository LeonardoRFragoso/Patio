#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re

def check_file_for_obsolete_terms(file_path, terms):
    """Verificar arquivo específico para termos obsoletos"""
    if not os.path.exists(file_path):
        return f"❌ Arquivo não encontrado: {file_path}"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        found_terms = []
        for term in terms:
            if term in content:
                # Encontrar linhas específicas
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if term in line:
                        found_terms.append(f"Linha {i}: {line.strip()}")
        
        if found_terms:
            return f"❌ {file_path}: encontradas referências:\n" + "\n".join(f"   {term}" for term in found_terms)
        else:
            return f"✅ {file_path}: limpo"
            
    except Exception as e:
        return f"❌ Erro ao verificar {file_path}: {e}"

def main():
    """Verificação precisa"""
    print("🔍 VERIFICAÇÃO PRECISA DE REFERÊNCIAS OBSOLETAS")
    print("=" * 70)
    
    # Arquivos e termos para verificar
    files_to_check = [
        'routes/operacoes.py',
        'routes/containers.py',
        'admin/routes.py',
        'routes/vistoriador.py'
    ]
    
    obsolete_terms = ['inventariante_required', 'admin_operacional_required']
    
    all_clean = True
    
    for file_path in files_to_check:
        result = check_file_for_obsolete_terms(file_path, obsolete_terms)
        print(result)
        if "❌" in result:
            all_clean = False
    
    print("\n" + "=" * 70)
    
    if all_clean:
        print("🎉 TODOS OS ARQUIVOS ESTÃO LIMPOS!")
        print("✅ Nenhuma referência obsoleta encontrada")
    else:
        print("⚠️  REFERÊNCIAS OBSOLETAS ENCONTRADAS")
        print("📝 Verificar detalhes acima")
    
    # Verificação adicional no utils/permissions.py
    print(f"\n🔍 VERIFICAÇÃO ADICIONAL - utils/permissions.py")
    print("-" * 50)
    
    permissions_result = check_file_for_obsolete_terms('utils/permissions.py', obsolete_terms)
    print(permissions_result)
    
    return all_clean

if __name__ == "__main__":
    main()
