#!/usr/bin/env python3
"""
Script para corrigir a estrutura da tabela solicitacoes_registro
Adiciona a coluna nivel_solicitado que está faltando
"""

import sqlite3
import os

def fix_solicitacoes_registro_table():
    print("🔧 CORRIGINDO ESTRUTURA DA TABELA SOLICITACOES_REGISTRO")
    print("=" * 60)
    
    # Verificar se o banco existe
    if not os.path.exists('database.db'):
        print("❌ Arquivo database.db não encontrado!")
        return False
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar estrutura atual da tabela
        print("\n📋 Estrutura atual da tabela solicitacoes_registro:")
        cursor.execute("PRAGMA table_info(solicitacoes_registro)")
        columns = cursor.fetchall()
        
        existing_columns = [col[1] for col in columns]
        print(f"Colunas existentes: {existing_columns}")
        
        # Verificar se a coluna nivel_solicitado já existe
        if 'nivel_solicitado' in existing_columns:
            print("✅ Coluna 'nivel_solicitado' já existe na tabela!")
            return True
        
        # Adicionar a coluna nivel_solicitado
        print("\n🔨 Adicionando coluna 'nivel_solicitado'...")
        cursor.execute("""
            ALTER TABLE solicitacoes_registro 
            ADD COLUMN nivel_solicitado TEXT
        """)
        
        # Verificar se a adição foi bem-sucedida
        cursor.execute("PRAGMA table_info(solicitacoes_registro)")
        columns_after = cursor.fetchall()
        new_columns = [col[1] for col in columns_after]
        
        print(f"Colunas após correção: {new_columns}")
        
        if 'nivel_solicitado' in new_columns:
            print("✅ Coluna 'nivel_solicitado' adicionada com sucesso!")
            
            # Commit das mudanças
            conn.commit()
            print("✅ Mudanças salvas no banco de dados!")
            
            return True
        else:
            print("❌ Erro: Coluna não foi adicionada corretamente!")
            return False
            
    except sqlite3.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False
    finally:
        if conn:
            conn.close()

def verify_registration_fields():
    """Verifica se todos os campos necessários para o registro existem"""
    print("\n🔍 VERIFICANDO COMPATIBILIDADE COM FORMULÁRIO DE REGISTRO")
    print("=" * 60)
    
    # Campos esperados pelo formulário de registro
    expected_fields = [
        'id',
        'nome',
        'username', 
        'email',
        'setor',
        'justificativa',
        'data_solicitacao',
        'status',
        'processado_por',
        'data_processamento',
        'unidade',
        'motivo_rejeicao',
        'nivel_solicitado'  # Campo que estava faltando
    ]
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(solicitacoes_registro)")
        columns = cursor.fetchall()
        existing_fields = [col[1] for col in columns]
        
        print("📋 Campos esperados pelo formulário:")
        for field in expected_fields:
            if field in existing_fields:
                print(f"   ✅ {field}")
            else:
                print(f"   ❌ {field} (FALTANDO)")
        
        missing_fields = [field for field in expected_fields if field not in existing_fields]
        
        if not missing_fields:
            print("\n🎉 Todos os campos necessários estão presentes!")
            return True
        else:
            print(f"\n⚠️  Campos faltantes: {missing_fields}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao verificar campos: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🚀 INICIANDO CORREÇÃO DA TABELA SOLICITACOES_REGISTRO")
    print("=" * 60)
    
    # Corrigir a estrutura da tabela
    success = fix_solicitacoes_registro_table()
    
    if success:
        # Verificar compatibilidade com o formulário
        verify_registration_fields()
        print("\n🎯 CORREÇÃO CONCLUÍDA!")
        print("Agora você pode tentar registrar um novo usuário.")
    else:
        print("\n❌ CORREÇÃO FALHOU!")
        print("Verifique os erros acima e tente novamente.")
