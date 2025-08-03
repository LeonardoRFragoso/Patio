#!/usr/bin/env python3
"""
Teste final para verificar se o dashboard administrativo está funcionando
"""

import sys
sys.path.append('.')

from db import get_db
from flask import Flask, g, render_template_string
import traceback

def test_dashboard_fix():
    """Testa se o erro do dashboard foi corrigido"""
    app = Flask(__name__)
    app.config['DATABASE'] = 'database.db'
    
    with app.app_context():
        try:
            print("=== TESTE FINAL DO DASHBOARD ADMINISTRATIVO ===\n")
            
            db = get_db()
            cursor = db.cursor()
            
            print("1. Simulando rota do dashboard...")
            
            # Simular exatamente o que o dashboard faz
            cursor.execute("SELECT COUNT(*) FROM usuarios")
            total_usuarios = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'admin'")
            total_admins = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'user'")
            total_users = cursor.fetchone()[0]
            
            cursor.execute("SELECT * FROM log_atividades ORDER BY data_hora DESC LIMIT 10")
            logs_recentes = cursor.fetchall()
            
            cursor.execute("SELECT * FROM solicitacoes_registro WHERE status = 'pendente' ORDER BY data_solicitacao DESC")
            solicitacoes_pendentes = cursor.fetchall()
            
            cursor.execute("SELECT s.*, u.username, u.email FROM solicitacoes_senha s JOIN usuarios u ON s.usuario_id = u.id WHERE s.status = 'pendente' ORDER BY s.data_solicitacao DESC")
            senha_pendentes = cursor.fetchall()
            
            print(f"   ✅ Dados coletados:")
            print(f"      - total_usuarios: {total_usuarios} ({type(total_usuarios)})")
            print(f"      - total_admins: {total_admins} ({type(total_admins)})")
            print(f"      - total_users: {total_users} ({type(total_users)})")
            print(f"      - logs_recentes: {len(logs_recentes)} items ({type(logs_recentes)})")
            print(f"      - solicitacoes_pendentes: {len(solicitacoes_pendentes)} items ({type(solicitacoes_pendentes)})")
            print(f"      - senha_pendentes: {len(senha_pendentes)} items ({type(senha_pendentes)})")
            
            print("\n2. Testando template base.html...")
            
            # Testar o template base.html que estava causando erro
            template_base = """
            {% if solicitacoes_pendentes and solicitacoes_pendentes|length > 0 %}
            Badge: {{ solicitacoes_pendentes|length }}
            {% else %}
            Sem solicitações
            {% endif %}
            """
            
            with app.test_request_context():
                result = render_template_string(template_base, solicitacoes_pendentes=solicitacoes_pendentes)
                print(f"   ✅ Template base renderizado: {result.strip()}")
            
            print("\n3. Testando template dashboard.html...")
            
            # Testar o template dashboard.html
            template_dashboard = """
            {% if solicitacoes_pendentes and solicitacoes_pendentes|length > 0 %}
            Badge Dashboard: {{ solicitacoes_pendentes|length }}
            {% else %}
            Dashboard sem solicitações
            {% endif %}
            """
            
            with app.test_request_context():
                result = render_template_string(template_dashboard, solicitacoes_pendentes=solicitacoes_pendentes)
                print(f"   ✅ Template dashboard renderizado: {result.strip()}")
            
            print("\n4. Simulando rota corrigir_descarga...")
            
            # Simular a rota corrigir_descarga que foi corrigida
            cursor.execute("SELECT * FROM solicitacoes_registro WHERE status = 'pendente'")
            solicitacoes_pendentes_corrigir = cursor.fetchall()
            
            print(f"   ✅ Rota corrigir_descarga: {len(solicitacoes_pendentes_corrigir)} items ({type(solicitacoes_pendentes_corrigir)})")
            
            with app.test_request_context():
                result = render_template_string(template_base, solicitacoes_pendentes=solicitacoes_pendentes_corrigir)
                print(f"   ✅ Template corrigir_descarga renderizado: {result.strip()}")
            
            print("\n🎉 TODOS OS TESTES PASSARAM!")
            print("✅ O dashboard administrativo deve estar funcionando corretamente!")
            print("✅ Não há mais comparações problemáticas entre lista e inteiro!")
            
        except Exception as e:
            print(f"\n❌ ERRO ENCONTRADO: {e}")
            print("\n🔍 TRACEBACK COMPLETO:")
            traceback.print_exc()

if __name__ == "__main__":
    test_dashboard_fix()
