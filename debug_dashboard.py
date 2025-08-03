#!/usr/bin/env python3
"""
Script para debugar o erro do dashboard administrativo
"""

import sys
sys.path.append('.')

from db import get_db
from flask import Flask, g
import traceback

def debug_dashboard():
    """Debug das consultas do dashboard"""
    app = Flask(__name__)
    app.config['DATABASE'] = 'database.db'
    
    with app.app_context():
        try:
            print("=== DEBUG DASHBOARD ADMINISTRATIVO ===\n")
            
            db = get_db()
            cursor = db.cursor()
            
            print("1. Testando estatísticas básicas...")
            
            # Estatísticas básicas
            cursor.execute("SELECT COUNT(*) FROM usuarios")
            total_usuarios = cursor.fetchone()[0]
            print(f"   ✅ Total usuários: {total_usuarios}")
            
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'admin'")
            total_admins = cursor.fetchone()[0]
            print(f"   ✅ Total admins: {total_admins}")
            
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'user'")
            total_users = cursor.fetchone()[0]
            print(f"   ✅ Total users: {total_users}")
            
            print("\n2. Testando logs recentes...")
            cursor.execute("""
                SELECT * FROM log_atividades
                ORDER BY data_hora DESC
                LIMIT 10
            """)
            logs_recentes = cursor.fetchall()
            print(f"   ✅ Logs recentes: {len(logs_recentes)} encontrados")
            print(f"   Tipo: {type(logs_recentes)}")
            
            print("\n3. Testando solicitações de registro pendentes...")
            cursor.execute("""
                SELECT * FROM solicitacoes_registro 
                WHERE status = 'pendente'
                ORDER BY data_solicitacao DESC
            """)
            solicitacoes_pendentes = cursor.fetchall()
            print(f"   ✅ Solicitações pendentes: {len(solicitacoes_pendentes)} encontradas")
            print(f"   Tipo: {type(solicitacoes_pendentes)}")
            
            print("\n4. Testando solicitações de senha pendentes...")
            cursor.execute("""
                SELECT s.*, u.username, u.email 
                FROM solicitacoes_senha s
                JOIN usuarios u ON s.usuario_id = u.id
                WHERE s.status = 'pendente'
                ORDER BY s.data_solicitacao DESC
            """)
            senha_pendentes = cursor.fetchall()
            print(f"   ✅ Senhas pendentes: {len(senha_pendentes)} encontradas")
            print(f"   Tipo: {type(senha_pendentes)}")
            
            print("\n5. Testando comparações que podem causar erro...")
            
            # Testar comparações que podem dar erro
            print(f"   solicitacoes_pendentes > 0: ", end="")
            try:
                result = solicitacoes_pendentes > 0
                print(f"❌ ERRO ENCONTRADO! Resultado: {result}")
            except Exception as e:
                print(f"❌ ERRO: {e}")
                
            print(f"   len(solicitacoes_pendentes) > 0: ", end="")
            try:
                result = len(solicitacoes_pendentes) > 0
                print(f"✅ OK! Resultado: {result}")
            except Exception as e:
                print(f"❌ ERRO: {e}")
                
            print(f"   bool(solicitacoes_pendentes): ", end="")
            try:
                result = bool(solicitacoes_pendentes)
                print(f"✅ OK! Resultado: {result}")
            except Exception as e:
                print(f"❌ ERRO: {e}")
            
            print("\n6. Simulando render_template...")
            template_vars = {
                'total_usuarios': total_usuarios,
                'total_admins': total_admins,
                'total_users': total_users,
                'logs_recentes': logs_recentes,
                'solicitacoes_pendentes': solicitacoes_pendentes,
                'senha_pendentes': senha_pendentes,
                'username': 'teste_admin',
                'role': 'admin'
            }
            
            print("   ✅ Variáveis do template preparadas sem erro!")
            
            # Testar cada variável individualmente
            for key, value in template_vars.items():
                print(f"   {key}: {type(value)} = {value if not isinstance(value, list) or len(value) < 3 else f'[{len(value)} items]'}")
            
            print("\n✅ TODAS AS CONSULTAS EXECUTARAM SEM ERRO!")
            print("❓ O erro pode estar no template ou em outra parte do código.")
            
        except Exception as e:
            print(f"\n❌ ERRO ENCONTRADO: {e}")
            print("\n🔍 TRACEBACK COMPLETO:")
            traceback.print_exc()

if __name__ == "__main__":
    debug_dashboard()
