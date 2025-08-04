#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3

def check_users_and_levels():
    """Verifica todos os usuários cadastrados e seus níveis"""
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Primeiro verificar estrutura da tabela
        cursor.execute('PRAGMA table_info(usuarios)')
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print("ESTRUTURA DA TABELA USUARIOS:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        print()
        
        # Buscar todos os usuários com colunas disponíveis
        if 'ativo' in column_names:
            query = 'SELECT username, nivel, ativo, unidade FROM usuarios ORDER BY nivel, username'
        else:
            query = 'SELECT username, nivel, unidade FROM usuarios ORDER BY nivel, username'
        
        cursor.execute(query)
        users = cursor.fetchall()
        
        print("=" * 80)
        print("USUÁRIOS CADASTRADOS NO SISTEMA")
        print("=" * 80)
        
        # Agrupar por nível
        levels = {}
        for user in users:
            if 'ativo' in column_names:
                username, nivel, ativo, unidade = user
            else:
                username, nivel, unidade = user
                ativo = 1  # Assumir ativo se coluna não existe
            
            if nivel not in levels:
                levels[nivel] = []
            levels[nivel].append({
                'username': username,
                'ativo': ativo,
                'unidade': unidade
            })
        
        # Exibir usuários por nível
        for nivel, usuarios in levels.items():
            print(f"\n🔹 NÍVEL: {nivel.upper()}")
            print("-" * 60)
            for user in usuarios:
                status = "✅ ATIVO" if user['ativo'] else "❌ INATIVO"
                print(f"  👤 {user['username']:<15} | {status} | {user['unidade']:<10}")
        
        print(f"\n📊 RESUMO:")
        print(f"Total de usuários: {len(users)}")
        for nivel, usuarios in levels.items():
            ativos = sum(1 for u in usuarios if u['ativo'])
            print(f"  - {nivel}: {len(usuarios)} usuários ({ativos} ativos)")
        
        conn.close()
        
    except Exception as e:
        print(f"Erro ao verificar usuários: {e}")

if __name__ == "__main__":
    check_users_and_levels()
