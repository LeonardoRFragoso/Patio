#!/usr/bin/env python3
"""
Script para corrigir o banco de dados e criar as tabelas necessárias
Inclui criação do usuário admin_adm com as credenciais corretas
"""
import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash

# Configurações
DB_FILE = 'database.db'

def create_database_tables():
    """Cria todas as tabelas necessárias no banco de dados"""
    print("🔧 Criando tabelas do banco de dados...")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Criar tabela de usuários
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nivel TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login TEXT,
        ultima_atualizacao TEXT,
        nome TEXT,
        unidade TEXT DEFAULT 'Rio de Janeiro',
        setor TEXT,
        ativo INTEGER DEFAULT 1
    )
    ''')
    
    # Criar tabela de containers
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS containers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'no patio',
        posicao_atual TEXT,
        data_criacao TEXT NOT NULL,
        ultima_atualizacao TEXT NOT NULL,
        tamanho TEXT,
        armador TEXT,
        tipo_container TEXT,
        booking TEXT,
        capacidade TEXT,
        tara TEXT
    )
    ''')
    
    # Criar tabela de operações
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS operacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        modo TEXT,
        container_id INTEGER NOT NULL,
        posicao TEXT NOT NULL,
        placa TEXT,
        vagao TEXT,
        data_operacao TEXT NOT NULL,
        usuario_id INTEGER NOT NULL,
        observacoes TEXT,
        posicao_anterior TEXT,
        resultado_vistoria TEXT,
        FOREIGN KEY(container_id) REFERENCES containers(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
    ''')
    
    # Criar tabela de vistorias
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS vistorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        container_id INTEGER NOT NULL,
        data_vistoria TEXT NOT NULL,
        lacre TEXT,
        condicao TEXT,
        observacoes_gerais TEXT,
        tipo_operacao TEXT,
        placa TEXT,
        vagao TEXT,
        iso_container TEXT,
        usuario_id INTEGER,
        FOREIGN KEY(container_id) REFERENCES containers(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
    ''')
    
    # Criar tabela de logs de atividades
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS log_atividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_hora TEXT NOT NULL,
        usuario TEXT NOT NULL,
        nivel TEXT NOT NULL,
        acao TEXT NOT NULL,
        descricao TEXT
    )
    ''')
    
    # Criar tabela de tentativas de login (para controle de força bruta)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        attempts INTEGER DEFAULT 1,
        timestamp TEXT NOT NULL,
        blocked_until TEXT
    )
    ''')
    
    # Criar tabela de solicitações de registro
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS solicitacoes_registro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        setor TEXT,
        unidade TEXT,
        justificativa TEXT,
        data_solicitacao TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        processado_por TEXT,
        data_processamento TEXT
    )
    ''')
    
    # Criar tabela de solicitações de senha
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS solicitacoes_senha (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        data_solicitacao TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        processado_por TEXT,
        data_processamento TEXT,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Tabelas criadas com sucesso!")

def create_admin_users():
    """Cria os usuários administrativos necessários"""
    print("👤 Criando usuários administrativos...")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Lista de usuários administrativos
    admin_users = [
        {
            'username': 'admin_adm',
            'email': 'admin_adm@exemplo.com',
            'password': 'admin_adm',  # Senha igual ao username conforme informado
            'nivel': 'admin_administrativo',
            'nome': 'Administrador Administrativo',
            'unidade': 'Rio de Janeiro',
            'setor': 'Administrativo'
        },
        {
            'username': 'admin',
            'email': 'admin@exemplo.com',
            'password': 'Admin@123',
            'nivel': 'admin',
            'nome': 'Administrador Geral',
            'unidade': 'Rio de Janeiro',
            'setor': 'TI'
        }
    ]
    
    for user_data in admin_users:
        try:
            # Verificar se usuário já existe
            cursor.execute("SELECT id FROM usuarios WHERE username = ?", (user_data['username'],))
            if cursor.fetchone():
                print(f"⚠️  Usuário '{user_data['username']}' já existe. Atualizando senha...")
                
                # Atualizar apenas a senha
                password_hash = generate_password_hash(user_data['password'])
                cursor.execute("""
                    UPDATE usuarios 
                    SET password_hash = ?, ultima_atualizacao = ?
                    WHERE username = ?
                """, (password_hash, created_at, user_data['username']))
            else:
                # Criar novo usuário
                password_hash = generate_password_hash(user_data['password'])
                cursor.execute('''
                INSERT INTO usuarios (username, email, password_hash, nivel, created_at, nome, unidade, setor, ativo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                ''', (
                    user_data['username'],
                    user_data['email'],
                    password_hash,
                    user_data['nivel'],
                    created_at,
                    user_data['nome'],
                    user_data['unidade'],
                    user_data['setor']
                ))
                
                print(f"✅ Usuário '{user_data['username']}' criado com sucesso!")
            
            # Registrar nos logs
            cursor.execute('''
            INSERT INTO log_atividades (data_hora, usuario, nivel, acao, descricao)
            VALUES (?, ?, ?, ?, ?)
            ''', (created_at, 'sistema', 'admin', 'INICIALIZAÇÃO', f'Usuário {user_data["username"]} configurado'))
            
            print(f"   📧 Email: {user_data['email']}")
            print(f"   🔑 Senha: {user_data['password']}")
            print(f"   👤 Nível: {user_data['nivel']}")
            print()
            
        except sqlite3.IntegrityError as e:
            print(f"❌ Erro ao criar usuário '{user_data['username']}': {e}")
    
    conn.commit()
    conn.close()

def verify_database():
    """Verifica se o banco foi criado corretamente"""
    print("🔍 Verificando banco de dados...")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Verificar tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    expected_tables = ['usuarios', 'containers', 'operacoes', 'vistorias', 'log_atividades', 'login_attempts']
    
    print(f"📋 Tabelas encontradas: {len(tables)}")
    for table in tables:
        print(f"   ✅ {table}")
    
    missing_tables = [t for t in expected_tables if t not in tables]
    if missing_tables:
        print(f"❌ Tabelas faltantes: {missing_tables}")
    
    # Verificar usuários
    cursor.execute("SELECT username, nivel, ativo FROM usuarios")
    users = cursor.fetchall()
    
    print(f"\n👥 Usuários cadastrados: {len(users)}")
    for username, nivel, ativo in users:
        status = "✅ Ativo" if ativo == 1 else "❌ Inativo"
        print(f"   {username} ({nivel}) - {status}")
    
    conn.close()
    print("\n🎉 Verificação concluída!")

def main():
    """Função principal"""
    print("=== CORREÇÃO DO BANCO DE DADOS ===")
    print(f"Arquivo do banco: {DB_FILE}")
    print()
    
    # Verificar se o arquivo já existe
    if os.path.exists(DB_FILE):
        print(f"⚠️  O arquivo {DB_FILE} já existe.")
        response = input("Deseja recriar as tabelas? (s/n): ")
        if response.lower() != 's':
            print("Operação cancelada.")
            return
        
        # Fazer backup
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"{DB_FILE}.backup_{timestamp}"
        os.rename(DB_FILE, backup_file)
        print(f"📦 Backup criado: {backup_file}")
    
    try:
        # Criar tabelas
        create_database_tables()
        
        # Criar usuários administrativos
        create_admin_users()
        
        # Verificar resultado
        verify_database()
        
        print("✅ SUCESSO: Banco de dados corrigido!")
        print()
        print("🔑 CREDENCIAIS DE LOGIN:")
        print("   Usuário: admin_adm")
        print("   Senha: admin_adm")
        print("   Aba: Admin (terceira aba)")
        print()
        print("💡 Agora você pode fazer login no sistema!")
        
    except Exception as e:
        print(f"❌ ERRO: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
