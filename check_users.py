#!/usr/bin/env python3
"""
Script para verificar usuários no banco de dados
"""

import sqlite3

def check_users():
    """Verifica usuários no banco de dados"""
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar usuários operador
        cursor.execute('SELECT username, email, nivel FROM usuarios WHERE username LIKE "operador%"')
        operadores = cursor.fetchall()
        
        print("=== USUARIOS OPERADOR ===")
        for user in operadores:
            print(f"Username: {user[0]}, Email: {user[1]}, Nivel: {user[2]}")
        
        # Verificar todos os usuários
        cursor.execute('SELECT username, email, nivel FROM usuarios LIMIT 10')
        todos = cursor.fetchall()
        
        print("\n=== TODOS OS USUARIOS (primeiros 10) ===")
        for user in todos:
            print(f"Username: {user[0]}, Email: {user[1]}, Nivel: {user[2]}")
        
        conn.close()
        
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check_users()
