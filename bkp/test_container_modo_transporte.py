#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script para testar a detecção do modo de transporte do container TESTE123456
Verifica os dados do container diretamente no banco de dados e simula o processamento
que ocorre no frontend para detectar o modo de transporte.
"""

import sqlite3
import json
import os
import sys
from datetime import datetime

# Configuração
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
CONTAINER_TESTE = 'TESTE123456'

def log_success(message):
    """Log mensagem de sucesso"""
    print(f"\033[92m✅ {message}\033[0m")

def log_error(message):
    """Log mensagem de erro"""
    print(f"\033[91m❌ {message}\033[0m")

def log_info(message):
    """Log mensagem informativa"""
    print(f"\033[94mℹ️ {message}\033[0m")

def log_warning(message):
    """Log mensagem de aviso"""
    print(f"\033[93m⚠️ {message}\033[0m")

def log_json(label, data):
    """Log dados JSON formatados"""
    print(f"\033[95m{label}:\033[0m")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print()

def conectar_db():
    """Conecta ao banco de dados SQLite"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Para acessar colunas pelo nome
        return conn
    except sqlite3.Error as e:
        log_error(f"Erro ao conectar ao banco de dados: {e}")
        sys.exit(1)

def verificar_container_db():
    """Verifica os dados do container TESTE123456 no banco de dados"""
    conn = conectar_db()
    cursor = conn.cursor()
    
    log_info(f"Verificando container {CONTAINER_TESTE} no banco de dados...")
    
    # Verificar na tabela containers
    cursor.execute("SELECT * FROM containers WHERE numero = ?", (CONTAINER_TESTE,))
    container_row = cursor.fetchone()
    
    if not container_row:
        log_error(f"Container {CONTAINER_TESTE} não encontrado na tabela containers!")
        conn.close()
        return None
    
    container_data = dict(container_row)
    log_success(f"Container {CONTAINER_TESTE} encontrado na tabela containers")
    log_json("Dados do container", container_data)
    
    # Verificar na tabela vistorias
    cursor.execute("SELECT * FROM vistorias WHERE container_numero = ?", (CONTAINER_TESTE,))
    vistoria_row = cursor.fetchone()
    
    if not vistoria_row:
        log_error(f"Container {CONTAINER_TESTE} não encontrado na tabela vistorias!")
        conn.close()
        return None
    
    vistoria_data = dict(vistoria_row)
    log_success(f"Container {CONTAINER_TESTE} encontrado na tabela vistorias")
    log_json("Dados da vistoria", vistoria_data)
    
    # Simular a consulta usada na rota /operacoes/containers/vistoriados
    cursor.execute("""
        SELECT 
            c.numero, 
            c.status, 
            c.unidade,
            v.iso_container, 
            v.capacidade, 
            v.tara, 
            v.data_vistoria,
            v.vagao,
            v.placa
        FROM containers c
        JOIN vistorias v ON c.numero = v.container_numero
        WHERE c.status = 'vistoriado' 
        AND c.numero = ?
    """, (CONTAINER_TESTE,))
    
    result = cursor.fetchone()
    
    if not result:
        log_error(f"Container {CONTAINER_TESTE} não encontrado na consulta de containers vistoriados!")
        conn.close()
        return None
    
    # Converter para dicionário
    container_vistoriado = dict(result)
    log_success(f"Container {CONTAINER_TESTE} encontrado na consulta de containers vistoriados")
    log_json("Dados do container vistoriado", container_vistoriado)
    
    conn.close()
    return container_vistoriado

def simular_processamento_frontend(container_data):
    """Simula o processamento que ocorre no frontend para detectar o modo de transporte"""
    log_info("Simulando processamento do frontend para detectar modo de transporte...")
    
    # Simular a lógica da função configurarFormularioDescargaUnico
    modo_transporte = 'indefinido'
    vagao = container_data.get('vagao', '')
    placa = container_data.get('placa', '')
    
    if vagao and vagao.strip():
        modo_transporte = 'ferroviaria'
        log_success(f"Modo de transporte detectado: FERROVIÁRIO (vagão: '{vagao}')")
    elif placa and placa.strip():
        modo_transporte = 'rodoviaria'
        log_success(f"Modo de transporte detectado: RODOVIÁRIO (placa: '{placa}')")
    else:
        log_error(f"Modo de transporte INDEFINIDO! Vagão: '{vagao}', Placa: '{placa}'")
    
    # Criar objeto como no frontend
    container_processado = {
        **container_data,
        'modoTransporte': modo_transporte
    }
    
    log_json("Objeto processado (como seria no frontend)", container_processado)
    return container_processado

def main():
    """Função principal"""
    print("\n" + "="*80)
    print(f"TESTE DE DETECÇÃO DE MODO DE TRANSPORTE - CONTAINER {CONTAINER_TESTE}")
    print("="*80 + "\n")
    
    # Verificar dados no banco
    container_data = verificar_container_db()
    
    if not container_data:
        log_error("Não foi possível obter os dados do container para teste!")
        return
    
    print("\n" + "-"*80)
    
    # Simular processamento do frontend
    container_processado = simular_processamento_frontend(container_data)
    
    print("\n" + "-"*80)
    
    # Verificar resultado final
    if container_processado['modoTransporte'] == 'indefinido':
        log_error("FALHA NO TESTE: Modo de transporte indefinido!")
        log_warning("Verifique se os campos 'vagao' e 'placa' estão preenchidos corretamente na tabela vistorias")
    else:
        log_success(f"TESTE BEM-SUCEDIDO: Modo de transporte detectado como {container_processado['modoTransporte']}")
        log_info("O frontend deve ser capaz de detectar o modo de transporte corretamente")
    
    print("\n" + "="*80)
    print(f"FIM DO TESTE - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
