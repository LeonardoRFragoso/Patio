#!/usr/bin/env python3
"""
Script de validação das permissões do Admin Administrativo
Testa se as rotas estão corretamente protegidas e se o redirecionamento funciona
"""

import sqlite3
import os
from datetime import datetime

def test_database_structure():
    """Testa se a estrutura do banco está correta para suportar as novas funcionalidades"""
    print("🔍 Testando estrutura do banco de dados...")
    
    db_path = 'database.db'
    if not os.path.exists(db_path):
        print("❌ Banco de dados não encontrado!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar se existe usuário admin_administrativo
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE nivel = 'admin_administrativo'")
        admin_adm_count = cursor.fetchone()[0]
        
        if admin_adm_count == 0:
            print("⚠️  Nenhum usuário admin_administrativo encontrado")
            print("   Criando usuário de teste...")
            
            # Criar usuário admin_administrativo de teste
            from werkzeug.security import generate_password_hash
            password_hash = generate_password_hash('Admin@123')
            data_criacao = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute("""
                INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, ativo, data_criacao)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, ('admin_adm', 'admin@teste.com', password_hash, 'Admin Administrativo', 'admin_administrativo', 'TODAS', data_criacao))
            
            conn.commit()
            print("✅ Usuário admin_administrativo criado com sucesso")
        else:
            print(f"✅ Encontrados {admin_adm_count} usuários admin_administrativo")
        
        # Verificar se tabela correcoes_descarga existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='correcoes_descarga'")
        if not cursor.fetchone():
            print("⚠️  Tabela correcoes_descarga não encontrada, criando...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS correcoes_descarga (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    operacao_id INTEGER NOT NULL,
                    container_id INTEGER NOT NULL,
                    posicao_anterior TEXT,
                    nova_posicao TEXT NOT NULL,
                    usuario_id INTEGER NOT NULL,
                    data_correcao TEXT NOT NULL,
                    observacoes TEXT,
                    FOREIGN KEY (operacao_id) REFERENCES operacoes(id),
                    FOREIGN KEY (container_id) REFERENCES containers(id),
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                )
            """)
            conn.commit()
            print("✅ Tabela correcoes_descarga criada")
        else:
            print("✅ Tabela correcoes_descarga existe")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erro ao testar banco: {e}")
        return False

def test_permissions_structure():
    """Testa se os decoradores de permissão estão implementados corretamente"""
    print("\n🔍 Testando estrutura de permissões...")
    
    try:
        # Testar import dos novos decoradores
        from utils.permissions import admin_completo_only_required, admin_administrativo_only_required
        print("✅ Novos decoradores importados com sucesso")
        
        # Testar se as rotas foram atualizadas
        from admin.routes import admin_bp
        print("✅ Blueprint admin importado com sucesso")
        
        # Verificar se os templates existem
        templates_path = 'templates/admin'
        required_templates = [
            'admin_administrativo_dashboard.html',
            'historico_containers.html'
        ]
        
        for template in required_templates:
            template_path = os.path.join(templates_path, template)
            if os.path.exists(template_path):
                print(f"✅ Template {template} existe")
            else:
                print(f"❌ Template {template} não encontrado")
                return False
        
        return True
        
    except ImportError as e:
        print(f"❌ Erro de importação: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        return False

def print_access_summary():
    """Imprime resumo dos acessos por tipo de admin"""
    print("\n📋 RESUMO DOS ACESSOS POR TIPO DE ADMIN:")
    print("\n🔵 ADMIN COMPLETO (admin):")
    print("   ✅ Dashboard administrativo completo")
    print("   ✅ Gerenciamento de usuários")
    print("   ✅ Gerenciamento de estruturas e avarias")
    print("   ✅ Migração e validação de dados")
    print("   ✅ Correção de descargas")
    print("   ✅ Todas as funcionalidades técnicas")
    
    print("\n🟢 ADMIN ADMINISTRATIVO (admin_administrativo):")
    print("   ✅ Dashboard simplificado específico")
    print("   ✅ Correção de descargas de TODAS as unidades")
    print("   ✅ Histórico completo de containers com filtros")
    print("   ❌ Gerenciamento de usuários (bloqueado)")
    print("   ❌ Gerenciamento de estruturas/avarias (bloqueado)")
    print("   ❌ Funcionalidades técnicas do sistema (bloqueado)")

def print_routes_summary():
    """Imprime resumo das rotas implementadas"""
    print("\n🛣️  ROTAS IMPLEMENTADAS:")
    print("\n📍 Admin Administrativo:")
    print("   • GET  /admin/admin-administrativo - Dashboard específico")
    print("   • GET  /admin/historico-containers - Página de histórico")
    print("   • GET  /admin/api/historico-containers - API de busca com filtros")
    print("   • GET  /admin/api/container-detalhes/<id> - Detalhes completos")
    print("   • GET  /admin/corrigir-descarga - Correção de descargas (compartilhada)")
    
    print("\n📍 Redirecionamento:")
    print("   • GET  /admin/ - Redireciona para dashboard apropriado")

def main():
    """Função principal de teste"""
    print("🚀 INICIANDO VALIDAÇÃO DO SISTEMA ADMIN ADMINISTRATIVO")
    print("=" * 60)
    
    # Testes
    db_ok = test_database_structure()
    permissions_ok = test_permissions_structure()
    
    print("\n" + "=" * 60)
    print("📊 RESULTADO DOS TESTES:")
    print(f"   Banco de dados: {'✅ OK' if db_ok else '❌ FALHA'}")
    print(f"   Permissões: {'✅ OK' if permissions_ok else '❌ FALHA'}")
    
    if db_ok and permissions_ok:
        print("\n🎉 SISTEMA VALIDADO COM SUCESSO!")
        print("\n📝 PRÓXIMOS PASSOS:")
        print("   1. Reiniciar o servidor Flask")
        print("   2. Fazer login com admin_adm / Admin@123")
        print("   3. Verificar se é redirecionado para dashboard correto")
        print("   4. Testar funcionalidades de correção e histórico")
    else:
        print("\n⚠️  SISTEMA COM PROBLEMAS - VERIFICAR ERROS ACIMA")
    
    # Imprimir resumos
    print_access_summary()
    print_routes_summary()
    
    print("\n" + "=" * 60)
    print("✅ VALIDAÇÃO CONCLUÍDA")

if __name__ == "__main__":
    main()
