#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os

def check_inventariante_references():
    """Verificar referências ao inventariante no arquivo de permissões"""
    
    permissions_file = 'utils/permissions.py'
    
    if not os.path.exists(permissions_file):
        print("❌ Arquivo permissions.py não encontrado")
        return
    
    try:
        with open(permissions_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("🔍 VERIFICANDO REFERÊNCIAS AO INVENTARIANTE")
        print("=" * 60)
        
        # Verificar se tem a string 'inventariante'
        has_inventariante = 'inventariante' in content.lower()
        print(f"Contém 'inventariante': {has_inventariante}")
        
        if has_inventariante:
            print("\n📍 LINHAS COM 'INVENTARIANTE':")
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                if 'inventariante' in line.lower():
                    print(f"   Linha {i}: {line.strip()}")
        else:
            print("✅ Nenhuma referência ao inventariante encontrada")
        
        # Verificar ROLES
        print(f"\n📋 ROLES existe: {'ROLES = {' in content}")
        
        # Verificar função inventariante_required
        has_function = 'def inventariante_required' in content
        print(f"📋 Função inventariante_required: {has_function}")
        
        print("\n" + "=" * 60)
        
        if not has_inventariante and not has_function:
            print("✅ ARQUIVO LIMPO - Nenhuma referência ao inventariante")
            return True
        else:
            print("❌ AINDA HÁ REFERÊNCIAS AO INVENTARIANTE")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao verificar arquivo: {e}")
        return False

if __name__ == "__main__":
    check_inventariante_references()
