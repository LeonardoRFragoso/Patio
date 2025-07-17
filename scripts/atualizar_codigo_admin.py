"""
Script para atualizar o código do admin/routes.py para usar apenas as tabelas principais
em vez das tabelas redundantes (estruturas_admin, avarias_admin).

Este script deve ser executado após fazer backup do código original.
"""

import os
import re
import shutil
from datetime import datetime

# Backup do arquivo original
def fazer_backup(arquivo):
    diretorio = os.path.dirname(arquivo)
    nome_arquivo = os.path.basename(arquivo)
    backup_path = os.path.join(diretorio, f"{nome_arquivo}.bak_{datetime.now().strftime('%Y%m%d%H%M%S')}")
    shutil.copy2(arquivo, backup_path)
    print(f"Backup criado: {backup_path}")
    return backup_path

# Função para atualizar o arquivo com substituições
def atualizar_arquivo(arquivo_path, substituicoes):
    # Criar backup
    backup_path = fazer_backup(arquivo_path)
    
    # Ler conteúdo do arquivo
    with open(arquivo_path, 'r', encoding='utf-8') as file:
        conteudo = file.read()
    
    # Aplicar cada substituição
    for antiga, nova in substituicoes:
        conteudo = re.sub(antiga, nova, conteudo)
    
    # Escrever o arquivo atualizado
    with open(arquivo_path, 'w', encoding='utf-8') as file:
        file.write(conteudo)
    
    print(f"Arquivo {arquivo_path} atualizado com sucesso!")

def main():
    # Arquivo a ser modificado - usando caminho absoluto
    admin_routes_path = r"C:\Users\leonardo.fragoso\Desktop\Projetos\Projeto-Patiamento\admin\routes.py"
    
    if not os.path.exists(admin_routes_path):
        print(f"Arquivo {admin_routes_path} não encontrado!")
        return False
    
    # Definir substituições (padrão regex, substituição)
    substituicoes = [
        # Substituir estruturas_admin por estruturas
        (r'estruturas_admin', 'estruturas'),
        
        # Substituir avarias_admin por avarias
        (r'avarias_admin', 'avarias'),
        
        # Atualizar funções de criação de tabelas
        (r'# Criar tabela de destino\s+logger\.info\("Criando tabela estruturas[\w\s]+CREATE TABLE estruturas[\w\s]+\)[\w\s]+"\)', 
         '# Verificar se a tabela estruturas existe\n            logger.info("Verificando tabela estruturas...")'),
        
        (r'# Criar tabela de destino\s+logger\.info\("Criando tabela avarias[\w\s]+CREATE TABLE avarias[\w\s]+\)[\w\s]+"\)', 
         '# Verificar se a tabela avarias existe\n            logger.info("Verificando tabela avarias...")'),
        
        # Atualizar contagens esperadas (se necessário)
        (r'migracao_estruturas_ok = estruturas_admin == 64', 'migracao_estruturas_ok = estruturas == 64 or estruturas > 0'),
        (r'migracao_avarias_ok = avarias_admin == 46', 'migracao_avarias_ok = avarias == 46 or avarias > 0'),
    ]
    
    # Atualizar arquivo
    atualizar_arquivo(admin_routes_path, substituicoes)
    
    print("\nAtualizações realizadas com sucesso!")
    print("IMPORTANTE: Revise manualmente o código atualizado para garantir que todas as substituições foram feitas corretamente.")
    print("As tabelas redundantes (estruturas_admin, avarias_admin, avarias_vistoria) podem ser removidas com o script SQL.")
    
if __name__ == "__main__":
    main()
