#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para verificar se a correção no JavaScript foi aplicada corretamente
"""

import os
import re

def main():
    # Caminho para o arquivo dashboard.js
    js_path = os.path.join('static', 'js', 'dashboard.js')
    
    # Verificar se o arquivo existe
    if not os.path.exists(js_path):
        print(f"Erro: Arquivo {js_path} não encontrado!")
        return
    
    # Ler o conteúdo do arquivo
    with open(js_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Verificar se a correção foi aplicada
    pattern = r'\(container\.status === "no patio" \|\| container\.status === "carregado"\)'
    if re.search(pattern, content):
        print("✅ Correção aplicada com sucesso!")
        print("Agora o sistema aceita containers com status 'no patio' ou 'carregado' para movimentação.")
        print("\nPróximos passos:")
        print("1. Reinicie o servidor Flask (python app.py)")
        print("2. Atualize a página no navegador (F5)")
        print("3. Tente novamente a movimentação de container")
    else:
        print("❌ Correção não encontrada no arquivo!")
        print("Verifique se o arquivo foi salvo corretamente.")

if __name__ == "__main__":
    main()
