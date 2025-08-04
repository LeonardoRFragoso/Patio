#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
from datetime import datetime

def get_db_connection():
    """Conectar ao banco de dados"""
    return sqlite3.connect('database.db')

def add_missing_columns():
    """Adicionar colunas faltantes na tabela usuarios"""
    print("🔧 ADICIONANDO COLUNAS FALTANTES NA TABELA USUARIOS")
    print("=" * 60)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Verificar colunas existentes
        cursor.execute("PRAGMA table_info(usuarios)")
        columns = cursor.fetchall()
        existing_columns = [col[1] for col in columns]
        
        print(f"📋 Colunas existentes: {existing_columns}")
        
        # Adicionar coluna 'setor' se não existir
        if 'setor' not in existing_columns:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN setor TEXT")
            print("✅ Coluna 'setor' adicionada")
        else:
            print("✅ Coluna 'setor' já existe")
        
        # Adicionar coluna 'ativo' se não existir
        if 'ativo' not in existing_columns:
            cursor.execute("ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1")
            print("✅ Coluna 'ativo' adicionada")
        else:
            print("✅ Coluna 'ativo' já existe")
        
        db.commit()
        return True
        
    except Exception as e:
        print(f"❌ Erro ao adicionar colunas: {e}")
        return False
    finally:
        db.close()

def create_login_attempts_table():
    """Criar tabela login_attempts se não existir"""
    print("\n🔧 CRIANDO TABELA LOGIN_ATTEMPTS")
    print("=" * 60)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Verificar se tabela já existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'")
        table_exists = cursor.fetchone()
        
        if table_exists:
            print("✅ Tabela login_attempts já existe")
            return True
        
        # Criar tabela login_attempts
        cursor.execute("""
            CREATE TABLE login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                success INTEGER DEFAULT 0,
                user_agent TEXT
            )
        """)
        
        print("✅ Tabela login_attempts criada com sucesso")
        
        # Criar índice para otimização
        cursor.execute("""
            CREATE INDEX idx_login_attempts_username ON login_attempts(username)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_login_attempts_time ON login_attempts(attempt_time)
        """)
        
        print("✅ Índices criados para otimização")
        
        db.commit()
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")
        return False
    finally:
        db.close()

def update_existing_users():
    """Atualizar usuários existentes com valores padrão"""
    print("\n🔄 ATUALIZANDO USUÁRIOS EXISTENTES")
    print("=" * 60)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Atualizar usuários sem setor definido
        cursor.execute("UPDATE usuarios SET setor = 'Não informado' WHERE setor IS NULL OR setor = ''")
        setor_updated = cursor.rowcount
        
        # Atualizar usuários sem status ativo definido
        cursor.execute("UPDATE usuarios SET ativo = 1 WHERE ativo IS NULL")
        ativo_updated = cursor.rowcount
        
        db.commit()
        
        print(f"✅ {setor_updated} usuários atualizados com setor padrão")
        print(f"✅ {ativo_updated} usuários atualizados com status ativo")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao atualizar usuários: {e}")
        return False
    finally:
        db.close()

def validate_database_structure():
    """Validar estrutura final do banco"""
    print("\n✅ VALIDANDO ESTRUTURA FINAL")
    print("=" * 60)
    
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Verificar tabela usuarios
        cursor.execute("PRAGMA table_info(usuarios)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        required_columns = ['id', 'username', 'email', 'password_hash', 'nivel', 'nome', 'unidade', 'setor', 'ativo']
        missing_columns = [col for col in required_columns if col not in column_names]
        
        if missing_columns:
            print(f"❌ Colunas ainda faltantes: {missing_columns}")
            return False
        else:
            print("✅ Tabela usuarios possui todas as colunas necessárias")
        
        # Verificar tabela login_attempts
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'")
        login_table = cursor.fetchone()
        
        if login_table:
            print("✅ Tabela login_attempts existe")
        else:
            print("❌ Tabela login_attempts não encontrada")
            return False
        
        # Mostrar estatísticas
        cursor.execute("SELECT COUNT(*) FROM usuarios")
        total_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM usuarios WHERE ativo = 1")
        active_users = cursor.fetchone()[0]
        
        print(f"\n📊 ESTATÍSTICAS:")
        print(f"   • Total de usuários: {total_users}")
        print(f"   • Usuários ativos: {active_users}")
        print(f"   • Usuários inativos: {total_users - active_users}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro na validação: {e}")
        return False
    finally:
        db.close()

def main():
    """Função principal"""
    print("🔧 CORREÇÃO DA ESTRUTURA DO BANCO DE DADOS")
    print("=" * 80)
    print(f"📅 Executado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    success = True
    
    # 1. Adicionar colunas faltantes
    if not add_missing_columns():
        success = False
    
    # 2. Criar tabela login_attempts
    if not create_login_attempts_table():
        success = False
    
    # 3. Atualizar usuários existentes
    if not update_existing_users():
        success = False
    
    # 4. Validar estrutura final
    if not validate_database_structure():
        success = False
    
    print("\n" + "=" * 80)
    
    if success:
        print("🎉 ESTRUTURA DO BANCO CORRIGIDA COM SUCESSO!")
        print("✅ Todas as colunas e tabelas necessárias estão presentes")
        print("✅ Usuários existentes atualizados com valores padrão")
        print("✅ Sistema pronto para uso")
    else:
        print("❌ FALHA NA CORREÇÃO DA ESTRUTURA")
        print("⚠️  Verificar erros acima e tentar novamente")
    
    return success

if __name__ == "__main__":
    main()
