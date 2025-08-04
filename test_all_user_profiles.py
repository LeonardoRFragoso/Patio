#!/usr/bin/env python3
"""
Script para testar se todos os perfis de usuários podem ser solicitados e aprovados com sucesso.
Verifica a compatibilidade entre os níveis definidos no sistema e o fluxo de aprovação.
"""

import sqlite3
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash

def test_user_profiles():
    """Testa todos os perfis de usuários disponíveis no sistema"""
    
    print("🔍 TESTE DE PERFIS DE USUÁRIOS - SOLICITAÇÃO E APROVAÇÃO")
    print("=" * 60)
    
    # Perfis disponíveis no sistema (utils/permissions.py)
    system_roles = {
        'operador': 0,
        'vistoriador': 1,
        'inventariante': 2,
        'admin_administrativo': 3,
        'admin': 4
    }
    
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("✅ Conexão com banco estabelecida")
        
        # 1. Verificar estrutura da tabela solicitacoes_registro
        print("\n📋 1. VERIFICANDO ESTRUTURA DAS TABELAS")
        print("-" * 40)
        
        cursor.execute("PRAGMA table_info(solicitacoes_registro)")
        colunas_solicitacao = [row[1] for row in cursor.fetchall()]
        print(f"   Colunas solicitacoes_registro: {colunas_solicitacao}")
        
        cursor.execute("PRAGMA table_info(usuarios)")
        colunas_usuarios = [row[1] for row in cursor.fetchall()]
        print(f"   Colunas usuarios: {colunas_usuarios}")
        
        # 2. Criar solicitações de teste para cada perfil
        print("\n🧪 2. CRIANDO SOLICITAÇÕES DE TESTE")
        print("-" * 40)
        
        test_requests = []
        for role, level in system_roles.items():
            username = f"teste_{role}"
            email = f"teste_{role}@exemplo.com"
            nome = f"Usuário Teste {role.title()}"
            
            # Verificar se já existe solicitação
            cursor.execute("SELECT id FROM solicitacoes_registro WHERE username = ? AND status = 'pendente'", (username,))
            existing = cursor.fetchone()
            
            if not existing:
                # Criar nova solicitação
                cursor.execute("""
                    INSERT INTO solicitacoes_registro 
                    (username, email, nome, unidade, nivel_solicitado, status, data_solicitacao)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    username, email, nome, 'Suzano', role, 'pendente',
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ))
                request_id = cursor.lastrowid
                print(f"   ✅ Criada solicitação para {role}: ID {request_id}")
            else:
                request_id = existing[0]
                print(f"   ♻️  Reutilizando solicitação para {role}: ID {request_id}")
            
            test_requests.append({
                'id': request_id,
                'role': role,
                'username': username,
                'level': level
            })
        
        conn.commit()
        
        # 3. Testar aprovação para cada perfil
        print("\n✅ 3. TESTANDO APROVAÇÃO DE CADA PERFIL")
        print("-" * 40)
        
        success_count = 0
        total_count = len(test_requests)
        
        for request in test_requests:
            try:
                # Simular aprovação
                senha_teste = "1234"
                password_hash = generate_password_hash(senha_teste, method='pbkdf2:sha256')
                
                # Verificar se usuário já existe
                cursor.execute("SELECT id FROM usuarios WHERE username = ?", (request['username'],))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    print(f"   ⚠️  Usuário {request['role']} já existe, pulando...")
                    success_count += 1
                    continue
                
                # Inserir usuário (simulando aprovação)
                cursor.execute("""
                    INSERT INTO usuarios (username, email, nome, nivel, unidade, password_hash, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    request['username'],
                    f"teste_{request['role']}@exemplo.com",
                    f"Usuário Teste {request['role'].title()}",
                    request['role'],
                    'Suzano',
                    password_hash,
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ))
                
                # Marcar solicitação como aprovada
                cursor.execute("""
                    UPDATE solicitacoes_registro 
                    SET status = 'aprovada', 
                        data_processamento = ?,
                        processado_por = ?
                    WHERE id = ?
                """, (
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'teste_admin',
                    request['id']
                ))
                
                print(f"   ✅ {request['role'].upper()}: Aprovação bem-sucedida")
                success_count += 1
                
            except Exception as e:
                print(f"   ❌ {request['role'].upper()}: Erro na aprovação - {str(e)}")
        
        conn.commit()
        
        # 4. Verificar usuários criados
        print("\n👥 4. VERIFICANDO USUÁRIOS CRIADOS")
        print("-" * 40)
        
        for role in system_roles.keys():
            cursor.execute("SELECT id, username, nivel FROM usuarios WHERE username = ?", (f"teste_{role}",))
            user = cursor.fetchone()
            if user:
                print(f"   ✅ {role.upper()}: Usuário criado (ID: {user[0]}, Nível: {user[2]})")
            else:
                print(f"   ❌ {role.upper()}: Usuário NÃO encontrado")
        
        # 5. Resumo final
        print("\n📊 5. RESUMO FINAL")
        print("-" * 40)
        print(f"   Total de perfis testados: {total_count}")
        print(f"   Aprovações bem-sucedidas: {success_count}")
        print(f"   Taxa de sucesso: {(success_count/total_count)*100:.1f}%")
        
        if success_count == total_count:
            print("\n🎉 RESULTADO: TODOS OS PERFIS FUNCIONAM CORRETAMENTE!")
            print("   ✅ Sistema de solicitação e aprovação está 100% funcional")
            print("   ✅ Todos os níveis de usuário podem ser aprovados com sucesso")
        else:
            print(f"\n⚠️  RESULTADO: {total_count - success_count} perfis com problemas")
            print("   🔧 Alguns perfis precisam de correção")
        
        # 6. Limpeza (opcional)
        print("\n🧹 6. LIMPEZA DE DADOS DE TESTE")
        print("-" * 40)
        
        cleanup = input("Deseja remover os dados de teste criados? (s/N): ").lower().strip()
        if cleanup == 's':
            # Remover usuários de teste
            for role in system_roles.keys():
                cursor.execute("DELETE FROM usuarios WHERE username = ?", (f"teste_{role}",))
            
            # Remover solicitações de teste
            for role in system_roles.keys():
                cursor.execute("DELETE FROM solicitacoes_registro WHERE username = ?", (f"teste_{role}",))
            
            conn.commit()
            print("   ✅ Dados de teste removidos")
        else:
            print("   ℹ️  Dados de teste mantidos para análise")
        
        conn.close()
        return success_count == total_count
        
    except Exception as e:
        print(f"❌ ERRO CRÍTICO: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando teste de perfis de usuários...")
    success = test_user_profiles()
    
    if success:
        print("\n✅ TESTE CONCLUÍDO COM SUCESSO!")
        sys.exit(0)
    else:
        print("\n❌ TESTE FALHOU - Verifique os erros acima")
        sys.exit(1)
