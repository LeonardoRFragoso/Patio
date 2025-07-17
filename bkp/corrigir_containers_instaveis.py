#!/usr/bin/env python3
"""
Script para corrigir containers de 40 TEU com suporte inadequado
Identifica e reposiciona containers instáveis para posições seguras
"""

import sqlite3
import sys
import os
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import patio_suzano

class CorretorContainersInstaveis:
    def __init__(self, db_path='database.db'):
        self.db_path = db_path
        self.containers_corrigidos = []
        self.containers_problematicos = []
        
    def conectar_db(self):
        """Conectar ao banco de dados"""
        return sqlite3.connect(self.db_path)
    
    def detectar_containers_instaveis(self):
        """Detectar containers 40 TEU com suporte inadequado"""
        conn = self.conectar_db()
        cursor = conn.cursor()
        
        # Buscar todos os containers de 40 TEU
        cursor.execute("""
            SELECT numero, posicao_atual, tamanho
            FROM containers 
            WHERE tamanho = '40' AND posicao_atual LIKE '%-2' OR posicao_atual LIKE '%-3' OR posicao_atual LIKE '%-4' OR posicao_atual LIKE '%-5'
            ORDER BY posicao_atual
        """)
        
        containers_40_teu = cursor.fetchall()
        containers_instaveis = []
        
        print(f"🔍 Analisando {len(containers_40_teu)} containers de 40 TEU em altura > 1...")
        
        for container in containers_40_teu:
            numero, posicao_atual, tamanho = container
            
            # Decompor posição (ex: A01-2 -> row=A, baia=1, altura=2)
            try:
                row, baia, altura = patio_suzano.decompor_posicao(posicao_atual)
            except:
                print(f"⚠️  Posição inválida para {numero}: {posicao_atual}")
                continue
            
            # Verificar se tem suporte adequado (2 containers abaixo)
            altura_abaixo = altura - 1
            posicao_suporte1 = f"{row}{baia:02d}-{altura_abaixo}"
            posicao_suporte2 = f"{row}{baia+1:02d}-{altura_abaixo}"
            
            # Verificar se existem containers nas posições de suporte
            cursor.execute("SELECT numero FROM containers WHERE posicao_atual = ?", (posicao_suporte1,))
            suporte1 = cursor.fetchone()
            
            cursor.execute("SELECT numero FROM containers WHERE posicao_atual = ?", (posicao_suporte2,))
            suporte2 = cursor.fetchone()
            
            if not (suporte1 and suporte2):
                containers_instaveis.append({
                    'numero': numero,
                    'posicao': posicao_atual,
                    'baia': baia,
                    'linha': linha,
                    'altura': altura,
                    'suporte1': suporte1[0] if suporte1 else None,
                    'suporte2': suporte2[0] if suporte2 else None
                })
                
                print(f"⚠️  {numero} ({posicao_atual}) - Suporte inadequado:")
                print(f"   Suporte 1 ({posicao_suporte1}): {'✅ ' + suporte1[0] if suporte1 else '❌ FALTANDO'}")
                print(f"   Suporte 2 ({posicao_suporte2}): {'✅ ' + suporte2[0] if suporte2 else '❌ FALTANDO'}")
        
        conn.close()
        return containers_instaveis
    
    def encontrar_posicao_segura(self, container_numero, tamanho_teu=40):
        """Encontrar uma posição segura para o container"""
        conn = self.conectar_db()
        
        # Usar a função de sugestões existente
        posicoes_sugeridas = patio_suzano.sugerir_posicoes_40_teu_livres('CHEIO', conn)[:10]
        
        # Filtrar posições que realmente estão livres
        posicoes_validas = []
        cursor = conn.cursor()
        
        for posicao in posicoes_sugeridas:
            # Verificar se a posição está realmente livre
            cursor.execute("SELECT numero FROM containers WHERE posicao_atual = ?", (posicao,))
            if not cursor.fetchone():
                # Validar se é uma posição adequada para 40 TEU
                resultado = patio_suzano.validar_operacao(posicao, 'CHEIO', conn, tamanho_teu)
                if resultado['valido']:
                    posicoes_validas.append(posicao)
        
        conn.close()
        return posicoes_validas[:5]  # Retornar até 5 opções
    
    def mover_container(self, numero, posicao_origem, posicao_destino, modo='automatico'):
        """Mover container para nova posição"""
        conn = self.conectar_db()
        cursor = conn.cursor()
        
        try:
            # Buscar ID do container
            cursor.execute("SELECT id FROM containers WHERE numero = ?", (numero,))
            container_row = cursor.fetchone()
            if not container_row:
                print(f"❌ Container {numero} não encontrado no banco")
                return False
            
            container_id = container_row[0]
            
            # Atualizar posição do container
            cursor.execute("""
                UPDATE containers 
                SET posicao_atual = ?, 
                    ultima_atualizacao = ?
                WHERE numero = ?
            """, (
                posicao_destino,
                datetime.now().isoformat(),
                numero
            ))
            
            # Buscar qualquer usuário existente para usar como sistema
            cursor.execute("SELECT id FROM usuarios LIMIT 1")
            usuario_existente = cursor.fetchone()
            if usuario_existente:
                usuario_id = usuario_existente[0]
            else:
                # Se não há usuários, criar um com todos os campos obrigatórios
                cursor.execute("""
                    INSERT INTO usuarios (
                        username, email, password_hash, nivel, nome, unidade, 
                        created_at, senha_temporaria, primeiro_login
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    'sistema', 'sistema@patio.com', 'hash_sistema', 'admin', 
                    'Sistema Automático', 'Suzano', datetime.now().isoformat(), 0, 0
                ))
                usuario_id = cursor.lastrowid
            
            # Registrar operação de movimentação
            cursor.execute("""
                INSERT INTO operacoes (
                    tipo, modo, container_id, posicao, posicao_anterior,
                    data_operacao, usuario_id, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                'movimentacao', 'automatico', container_id, posicao_destino, posicao_origem,
                datetime.now().isoformat(), usuario_id,
                f'Correção automática - container {numero} instável movido para posição segura ({modo})'
            ))
            
            conn.commit()
            print(f"✅ {numero}: {posicao_origem} → {posicao_destino}")
            return True
            
        except Exception as e:
            print(f"❌ Erro ao mover {numero}: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def corrigir_automaticamente(self):
        """Corrigir automaticamente todos os containers instáveis"""
        containers_instaveis = self.detectar_containers_instaveis()
        
        if not containers_instaveis:
            print("✅ Nenhum container instável encontrado!")
            return
        
        print(f"\n🔧 Iniciando correção automática de {len(containers_instaveis)} containers...")
        
        for container in containers_instaveis:
            numero = container['numero']
            posicao_atual = container['posicao']
            
            print(f"\n📦 Processando {numero} ({posicao_atual})...")
            
            # Encontrar posições seguras
            posicoes_seguras = self.encontrar_posicao_segura(numero)
            
            if posicoes_seguras:
                nova_posicao = posicoes_seguras[0]  # Usar a primeira opção
                
                if self.mover_container(numero, posicao_atual, nova_posicao, 'automatico'):
                    self.containers_corrigidos.append({
                        'numero': numero,
                        'origem': posicao_atual,
                        'destino': nova_posicao
                    })
                else:
                    self.containers_problematicos.append(numero)
            else:
                print(f"❌ Nenhuma posição segura encontrada para {numero}")
                self.containers_problematicos.append(numero)
    
    def corrigir_interativamente(self):
        """Corrigir containers com interação do usuário"""
        containers_instaveis = self.detectar_containers_instaveis()
        
        if not containers_instaveis:
            print("✅ Nenhum container instável encontrado!")
            return
        
        print(f"\n🔧 Correção interativa de {len(containers_instaveis)} containers...")
        
        for i, container in enumerate(containers_instaveis, 1):
            numero = container['numero']
            posicao_atual = container['posicao']
            
            print(f"\n📦 Container {i}/{len(containers_instaveis)}: {numero} ({posicao_atual})")
            print(f"   Problema: Suporte inadequado na altura {container['altura']}")
            
            # Encontrar posições seguras
            posicoes_seguras = self.encontrar_posicao_segura(numero)
            
            if posicoes_seguras:
                print("   Posições seguras disponíveis:")
                for j, pos in enumerate(posicoes_seguras, 1):
                    print(f"   {j}. {pos}")
                
                while True:
                    escolha = input(f"   Escolha uma posição (1-{len(posicoes_seguras)}) ou 's' para pular: ").strip()
                    
                    if escolha.lower() == 's':
                        print("   ⏭️  Container pulado")
                        break
                    
                    try:
                        idx = int(escolha) - 1
                        if 0 <= idx < len(posicoes_seguras):
                            nova_posicao = posicoes_seguras[idx]
                            
                            if self.mover_container(numero, posicao_atual, nova_posicao, 'interativo'):
                                self.containers_corrigidos.append({
                                    'numero': numero,
                                    'origem': posicao_atual,
                                    'destino': nova_posicao
                                })
                            else:
                                self.containers_problematicos.append(numero)
                            break
                        else:
                            print("   ❌ Opção inválida")
                    except ValueError:
                        print("   ❌ Digite um número válido")
            else:
                print("   ❌ Nenhuma posição segura disponível")
                self.containers_problematicos.append(numero)
    
    def relatorio_final(self):
        """Gerar relatório final da correção"""
        print("\n" + "="*60)
        print("📊 RELATÓRIO FINAL DA CORREÇÃO")
        print("="*60)
        
        print(f"✅ Containers corrigidos: {len(self.containers_corrigidos)}")
        for container in self.containers_corrigidos:
            print(f"   {container['numero']}: {container['origem']} → {container['destino']}")
        
        if self.containers_problematicos:
            print(f"\n❌ Containers com problemas: {len(self.containers_problematicos)}")
            for numero in self.containers_problematicos:
                print(f"   {numero}")
        
        print(f"\n🎯 Taxa de sucesso: {len(self.containers_corrigidos)}/{len(self.containers_corrigidos) + len(self.containers_problematicos)} containers")

def main():
    print("🏗️  CORRETOR DE CONTAINERS INSTÁVEIS")
    print("="*50)
    
    corretor = CorretorContainersInstaveis()
    
    # Detectar problemas primeiro
    containers_instaveis = corretor.detectar_containers_instaveis()
    
    if not containers_instaveis:
        print("✅ Nenhum container instável encontrado!")
        return
    
    print(f"\n⚠️  Encontrados {len(containers_instaveis)} containers instáveis")
    
    while True:
        print("\nOpções:")
        print("1. Correção automática (recomendado)")
        print("2. Correção interativa")
        print("3. Apenas detectar (não corrigir)")
        print("4. Sair")
        
        escolha = input("\nEscolha uma opção (1-4): ").strip()
        
        if escolha == '1':
            corretor.corrigir_automaticamente()
            corretor.relatorio_final()
            break
        elif escolha == '2':
            corretor.corrigir_interativamente()
            corretor.relatorio_final()
            break
        elif escolha == '3':
            print("✅ Detecção concluída. Nenhuma correção realizada.")
            break
        elif escolha == '4':
            print("👋 Saindo...")
            break
        else:
            print("❌ Opção inválida")

if __name__ == "__main__":
    main()
