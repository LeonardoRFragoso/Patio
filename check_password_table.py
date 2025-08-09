#!/usr/bin/env python3
"""
Script para verificar a estrutura da tabela solicitacoes_senha
"""

import sqlite3

def check_password_table():
    """Verifica a estrutura da tabela solicitacoes_senha"""
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO ESTRUTURA DA TABELA SOLICITACOES_SENHA")
        print("=" * 55)
        
        # Verificar estrutura da tabela
        cursor.execute("PRAGMA table_info(solicitacoes_senha)")
        columns = cursor.fetchall()
        print(f"\n📋 COLUNAS DA TABELA 'solicitacoes_senha':")
        for col in columns:
            print(f"   - {col['name']} ({col['type']}) - {'NOT NULL' if col['notnull'] else 'NULL'} - Default: {col['dflt_value']}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ ERRO: {e}")

if __name__ == "__main__":
    check_password_table()
