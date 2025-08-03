#!/usr/bin/env python3
"""
Script para aprovar solicitação de registro pendente e criar usuário
Contorna o problema do dashboard administrativo
"""

import sqlite3
import hashlib
from datetime import datetime
import getpass

def hash_password(password):
    """Gera hash da senha usando SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def aprovar_solicitacao():
    """Aprova a solicitação pendente do LeoFragoso"""
    try:
        # Conectar ao banco
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        print("=== SCRIPT DE APROVAÇÃO DE USUÁRIO ===\n")
        
        # Verificar solicitações pendentes
        cursor.execute('SELECT * FROM solicitacoes_registro WHERE status = ?', ('pendente',))
        solicitacoes = cursor.fetchall()
        
        if not solicitacoes:
            print("❌ Nenhuma solicitação pendente encontrada!")
            return
        
        print("📋 Solicitações pendentes encontradas:")
        for i, sol in enumerate(solicitacoes):
            print(f"{i+1}. ID: {sol[0]} | Nome: {sol[1]} | Username: {sol[2]} | Email: {sol[3]}")
        
        # Selecionar solicitação
        if len(solicitacoes) == 1:
            solicitacao = solicitacoes[0]
            print(f"\n✅ Selecionando automaticamente: {solicitacao[1]} ({solicitacao[2]})")
        else:
            try:
                escolha = int(input(f"\nEscolha a solicitação (1-{len(solicitacoes)}): ")) - 1
                solicitacao = solicitacoes[escolha]
            except (ValueError, IndexError):
                print("❌ Escolha inválida!")
                return
        
        # Dados da solicitação
        sol_id, nome, username, email, setor, justificativa, data_sol, status, proc_por, data_proc, unidade, motivo_rej = solicitacao
        
        print(f"\n📝 Dados da solicitação:")
        print(f"   Nome: {nome}")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Setor: {setor}")
        print(f"   Unidade: {unidade}")
        print(f"   Data: {data_sol}")
        
        # Verificar se usuário já existe
        cursor.execute('SELECT username FROM usuarios WHERE username = ?', (username,))
        if cursor.fetchone():
            print(f"❌ Usuário '{username}' já existe no sistema!")
            return
        
        # Definir senha
        print(f"\n🔐 Definir senha para o usuário '{username}':")
        senha = getpass.getpass("Digite a senha: ")
        if not senha:
            print("❌ Senha não pode estar vazia!")
            return
        
        confirma_senha = getpass.getpass("Confirme a senha: ")
        if senha != confirma_senha:
            print("❌ Senhas não coincidem!")
            return
        
        # Definir nível de acesso
        print(f"\n👤 Definir nível de acesso:")
        print("1. user (Usuário comum)")
        print("2. operador (Operador)")
        print("3. inventariante (Inventariante)")
        print("4. vistoriador (Vistoriador)")
        print("5. admin (Administrador)")
        
        try:
            nivel_escolha = int(input("Escolha o nível (1-5): "))
            niveis = {1: 'user', 2: 'operador', 3: 'inventariante', 4: 'vistoriador', 5: 'admin'}
            nivel = niveis.get(nivel_escolha, 'user')
        except ValueError:
            nivel = 'user'
            print("⚠️  Usando nível padrão: user")
        
        # Criar usuário
        password_hash = hash_password(senha)
        data_agora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.execute('''
            INSERT INTO usuarios (username, email, password_hash, nome, nivel, unidade, created_at, senha_temporaria, primeiro_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
        ''', (username, email, password_hash, nome, nivel, unidade, data_agora))
        
        # Atualizar solicitação como aprovada
        cursor.execute('''
            UPDATE solicitacoes_registro 
            SET status = 'aprovada', processado_por = 'Script Admin', data_processamento = ?
            WHERE id = ?
        ''', (data_agora, sol_id))
        
        # Confirmar alterações
        conn.commit()
        
        print(f"\n✅ USUÁRIO CRIADO COM SUCESSO!")
        print(f"   Username: {username}")
        print(f"   Nome: {nome}")
        print(f"   Email: {email}")
        print(f"   Nível: {nivel}")
        print(f"   Unidade: {unidade}")
        print(f"   Data de criação: {data_agora}")
        print(f"\n🔑 O usuário pode fazer login com:")
        print(f"   Username: {username}")
        print(f"   Senha: [a senha que você definiu]")
        
        print(f"\n📝 Solicitação #{sol_id} marcada como aprovada.")
        
    except Exception as e:
        print(f"❌ Erro ao aprovar solicitação: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    aprovar_solicitacao()
