#!/usr/bin/env python3
"""
Script para verificar a estrutura da tabela usuarios
"""

import sqlite3

def check_users_table():
    """Verifica a estrutura da tabela usuarios"""
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO ESTRUTURA DA TABELA USUARIOS")
        print("=" * 50)
        
        # Verificar estrutura da tabela
        cursor.execute("PRAGMA table_info(usuarios)")
        columns = cursor.fetchall()
        print(f"\n📋 COLUNAS DA TABELA 'usuarios':")
        for col in columns:
            print(f"   - {col['name']} ({col['type']}) - {'NOT NULL' if col['notnull'] else 'NULL'} - Default: {col['dflt_value']}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ ERRO: {e}")

if __name__ == "__main__":
    check_users_table()
