#!/usr/bin/env python3
"""
Script simples para corrigir unidade do admin_adm
"""

import sqlite3
from utils.db import get_db_connection
from app import create_app

def main():
    print("🔧 CORRIGINDO UNIDADE DO admin_adm")
    
    app = create_app()
    with app.app_context():
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Verificar estado atual
                print("=== ESTADO ATUAL ===")
                cursor.execute("SELECT username, unidade, nivel FROM usuarios WHERE username = 'admin_adm'")
                user = cursor.fetchone()
                
                if user:
                    print(f"Username: {user['username']}")
                    print(f"Unidade atual: {user['unidade']}")
                    print(f"Nível: {user['nivel']}")
                else:
                    print("❌ Usuário admin_adm não encontrado")
                    return
                
                # Corrigir unidade
                print("\n=== CORRIGINDO UNIDADE ===")
                cursor.execute("UPDATE usuarios SET unidade = 'TODAS' WHERE username = 'admin_adm'")
                conn.commit()
                
                # Verificar correção
                cursor.execute("SELECT unidade FROM usuarios WHERE username = 'admin_adm'")
                nova_unidade = cursor.fetchone()
                print(f"✅ Nova unidade: {nova_unidade['unidade']}")
                
                # Listar containers por unidade
                print("\n=== CONTAINERS POR UNIDADE ===")
                cursor.execute("SELECT unidade, COUNT(*) as total FROM containers GROUP BY unidade")
                containers = cursor.fetchall()
                
                for container in containers:
                    print(f"   {container['unidade']}: {container['total']} containers")
                
        except Exception as e:
            print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main()
