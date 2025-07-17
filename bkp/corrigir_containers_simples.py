#!/usr/bin/env python3
"""
Script simplificado para corrigir containers de 40 TEU instáveis
Move containers para posições seguras sem registrar operações complexas
"""

import sqlite3
import sys
import os
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from posicoes_suzano import patio_suzano

def corrigir_containers_instaveis():
    """Corrigir containers instáveis de forma simples"""
    
    print("🏗️  CORRETOR SIMPLES DE CONTAINERS INSTÁVEIS")
    print("="*50)
    
    # Conectar ao banco
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    try:
        # Buscar containers de 40 TEU em altura > 1
        cursor.execute("""
            SELECT numero, posicao_atual, tamanho
            FROM containers 
            WHERE tamanho = '40' AND (
                posicao_atual LIKE '%-2' OR 
                posicao_atual LIKE '%-3' OR 
                posicao_atual LIKE '%-4' OR 
                posicao_atual LIKE '%-5'
            )
            ORDER BY posicao_atual
        """)
        
        containers_40_teu = cursor.fetchall()
        containers_instaveis = []
        
        print(f"🔍 Analisando {len(containers_40_teu)} containers de 40 TEU em altura > 1...")
        
        # Detectar containers instáveis
        for container in containers_40_teu:
            numero, posicao_atual, tamanho = container
            
            try:
                row, baia, altura = patio_suzano.decompor_posicao(posicao_atual)
            except:
                print(f"⚠️  Posição inválida para {numero}: {posicao_atual}")
                continue
            
            # Verificar suporte
            altura_abaixo = altura - 1
            posicao_suporte1 = f"{row}{baia:02d}-{altura_abaixo}"
            posicao_suporte2 = f"{row}{baia+1:02d}-{altura_abaixo}"
            
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
                    'altura': altura
                })
                
                print(f"⚠️  {numero} ({posicao_atual}) - Instável")
        
        if not containers_instaveis:
            print("✅ Nenhum container instável encontrado!")
            return
        
        print(f"\n🔧 Corrigindo {len(containers_instaveis)} containers instáveis...")
        
        containers_corrigidos = 0
        
        # Corrigir cada container
        for container in containers_instaveis:
            numero = container['numero']
            posicao_atual = container['posicao']
            
            print(f"\n📦 Processando {numero} ({posicao_atual})...")
            
            # Encontrar posições seguras (altura 1)
            posicoes_seguras = []
            
            # Buscar posições livres na altura 1
            for row in ['A', 'B', 'C', 'D', 'E']:
                for baia in range(2, 21, 2):  # Apenas baias pares para 40 TEU
                    posicao_teste = f"{row}{baia:02d}-1"
                    
                    # Verificar se está livre
                    cursor.execute("SELECT numero FROM containers WHERE posicao_atual = ?", (posicao_teste,))
                    if not cursor.fetchone():
                        # Verificar se a posição adjacente também está livre
                        posicao_adjacente = f"{row}{baia+1:02d}-1"
                        cursor.execute("SELECT numero FROM containers WHERE posicao_atual = ?", (posicao_adjacente,))
                        if not cursor.fetchone():
                            posicoes_seguras.append(posicao_teste)
                            if len(posicoes_seguras) >= 3:  # Limitar a 3 opções
                                break
                if len(posicoes_seguras) >= 3:
                    break
            
            if posicoes_seguras:
                nova_posicao = posicoes_seguras[0]
                
                # Mover container (apenas atualizar posição)
                cursor.execute("""
                    UPDATE containers 
                    SET posicao_atual = ?, 
                        ultima_atualizacao = ?
                    WHERE numero = ?
                """, (
                    nova_posicao,
                    datetime.now().isoformat(),
                    numero
                ))
                
                print(f"✅ {numero}: {posicao_atual} → {nova_posicao}")
                containers_corrigidos += 1
            else:
                print(f"❌ Nenhuma posição segura encontrada para {numero}")
        
        # Commit das mudanças
        conn.commit()
        
        print(f"\n" + "="*60)
        print("📊 RELATÓRIO FINAL")
        print("="*60)
        print(f"✅ Containers corrigidos: {containers_corrigidos}")
        print(f"❌ Containers não corrigidos: {len(containers_instaveis) - containers_corrigidos}")
        print(f"🎯 Taxa de sucesso: {containers_corrigidos}/{len(containers_instaveis)} containers")
        
        if containers_corrigidos > 0:
            print(f"\n🔄 Recarregue a visualização 3D para ver as mudanças!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    corrigir_containers_instaveis()
