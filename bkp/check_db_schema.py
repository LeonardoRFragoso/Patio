#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para verificar o esquema do banco de dados
"""

import sqlite3
import sys

def main():
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Listar todas as tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print("=== TABELAS NO BANCO DE DADOS ===")
        for table in tables:
            table_name = table[0]
            print(f"\nTabela: {table_name}")
            
            # Obter informações sobre as colunas da tabela
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            print("Colunas:")
            for col in columns:
                col_id, col_name, col_type, not_null, default_val, pk = col
                print(f"  - {col_name} ({col_type})")
                if pk:
                    print("    * Chave primária")
                if not_null:
                    print("    * NOT NULL")
                if default_val is not None:
                    print(f"    * Valor padrão: {default_val}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"Erro ao acessar o banco de dados: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
