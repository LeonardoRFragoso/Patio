#!/usr/bin/env python3
"""
Script para debugar solicitações de recuperação de senha
"""

import sqlite3
from datetime import datetime

def debug_password_requests():
    """Debug das solicitações de senha"""
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO SOLICITAÇÕES DE RECUPERAÇÃO DE SENHA")
        print("=" * 60)
        
        # Verificar se a tabela existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='solicitacoes_senha'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("❌ Tabela 'solicitacoes_senha' NÃO EXISTE!")
            return
        
        print("✅ Tabela 'solicitacoes_senha' existe")
        
        # Verificar estrutura da tabela
        cursor.execute("PRAGMA table_info(solicitacoes_senha)")
        columns = cursor.fetchall()
        print(f"\n📋 ESTRUTURA DA TABELA:")
        for col in columns:
            print(f"   - {col['name']} ({col['type']}) - {'NOT NULL' if col['notnull'] else 'NULL'}")
        
        # Contar total de solicitações
        cursor.execute("SELECT COUNT(*) as total FROM solicitacoes_senha")
        total = cursor.fetchone()['total']
        print(f"\n📊 TOTAL DE SOLICITAÇÕES: {total}")
        
        # Buscar todas as solicitações
        cursor.execute("""
            SELECT s.*, u.username, u.email 
            FROM solicitacoes_senha s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            ORDER BY s.data_solicitacao DESC
        """)
        solicitacoes = cursor.fetchall()
        
        if solicitacoes:
            print(f"\n📝 SOLICITAÇÕES ENCONTRADAS:")
            for i, sol in enumerate(solicitacoes, 1):
                print(f"\n   {i}. ID: {sol['id']}")
                print(f"      Usuário: {sol['username']} (ID: {sol['usuario_id']})")
                print(f"      Email: {sol['email']}")
                print(f"      Data: {sol['data_solicitacao']}")
                print(f"      Status: {sol['status']}")
                if sol['data_aprovacao']:
                    print(f"      Aprovação: {sol['data_aprovacao']} por {sol['aprovado_por']}")
        else:
            print("\n❌ NENHUMA SOLICITAÇÃO ENCONTRADA!")
        
        # Verificar solicitações pendentes especificamente
        cursor.execute("""
            SELECT s.*, u.username, u.email 
            FROM solicitacoes_senha s
            JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.status = 'pendente'
            ORDER BY s.data_solicitacao DESC
        """)
        pendentes = cursor.fetchall()
        
        print(f"\n⏳ SOLICITAÇÕES PENDENTES: {len(pendentes)}")
        for sol in pendentes:
            print(f"   - {sol['username']} ({sol['data_solicitacao']})")
        
        # Verificar usuários que podem ter solicitado
        print(f"\n👥 USUÁRIOS NO SISTEMA:")
        cursor.execute("SELECT id, username, email FROM usuarios ORDER BY username")
        usuarios = cursor.fetchall()
        for user in usuarios:
            print(f"   - ID {user['id']}: {user['username']} ({user['email']})")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ ERRO: {e}")

if __name__ == "__main__":
    debug_password_requests()
