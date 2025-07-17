#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para debugar a funcionalidade de Consulta Status
Verifica se os dados estão sendo buscados corretamente do banco
"""

import sqlite3
import json
from datetime import datetime

def conectar_banco():
    """Conecta ao banco de dados"""
    try:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row  # Para acessar colunas por nome
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        return None

def verificar_containers():
    """Verifica containers disponíveis no banco"""
    conn = conectar_banco()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO CONTAINERS NO BANCO:")
        print("=" * 50)
        
        # Buscar todos os containers
        cursor.execute("""
            SELECT id, numero, status, posicao_atual, unidade, data_criacao, 
                   tipo_container, tamanho, capacidade, tara, armador, booking
            FROM containers 
            ORDER BY data_criacao DESC 
            LIMIT 10
        """)
        
        containers = cursor.fetchall()
        
        if containers:
            print(f"✅ Encontrados {len(containers)} containers:")
            for container in containers:
                print(f"  📦 {container['numero']} - Status: {container['status']} - Posição: {container['posicao_atual']}")
                print(f"      Unidade: {container['unidade']} - Tipo: {container['tipo_container']} - Tamanho: {container['tamanho']}")
                print(f"      Armador: {container['armador']} - Booking: {container['booking']}")
                print()
        else:
            print("⚠️ Nenhum container encontrado na tabela containers")
            
    except Exception as e:
        print(f"❌ Erro ao verificar containers: {e}")
    finally:
        conn.close()

def verificar_vistorias():
    """Verifica vistorias disponíveis no banco"""
    conn = conectar_banco()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO VISTORIAS NO BANCO:")
        print("=" * 50)
        
        # Buscar todas as vistorias
        cursor.execute("""
            SELECT id, container_numero, data_vistoria, status, condicao, 
                   tipo_container, tamanho, capacidade, tara, armador, 
                   iso_container, lacre, placa, vagao, observacoes_gerais
            FROM vistorias 
            ORDER BY data_vistoria DESC 
            LIMIT 10
        """)
        
        vistorias = cursor.fetchall()
        
        if vistorias:
            print(f"✅ Encontradas {len(vistorias)} vistorias:")
            for vistoria in vistorias:
                print(f"  🔍 Container: {vistoria['container_numero']} - Data: {vistoria['data_vistoria']}")
                print(f"      Status: {vistoria['status']} - Condição: {vistoria['condicao']}")
                print(f"      Tipo: {vistoria['tipo_container']} - Tamanho: {vistoria['tamanho']}")
                print(f"      Armador: {vistoria['armador']} - ISO: {vistoria['iso_container']}")
                print(f"      Placa: {vistoria['placa']} - Vagão: {vistoria['vagao']}")
                print()
        else:
            print("⚠️ Nenhuma vistoria encontrada na tabela vistorias")
            
    except Exception as e:
        print(f"❌ Erro ao verificar vistorias: {e}")
    finally:
        conn.close()

def verificar_operacoes():
    """Verifica operações disponíveis no banco"""
    conn = conectar_banco()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO OPERAÇÕES NO BANCO:")
        print("=" * 50)
        
        # Buscar todas as operações
        cursor.execute("""
            SELECT o.id, o.container_id, c.numero as container_numero, 
                   o.tipo, o.modo, o.posicao, o.placa, o.vagao, 
                   o.data_operacao, o.observacoes
            FROM operacoes o
            LEFT JOIN containers c ON o.container_id = c.id
            ORDER BY o.data_operacao DESC 
            LIMIT 10
        """)
        
        operacoes = cursor.fetchall()
        
        if operacoes:
            print(f"✅ Encontradas {len(operacoes)} operações:")
            for operacao in operacoes:
                print(f"  🚛 Container: {operacao['container_numero']} - Tipo: {operacao['tipo']}")
                print(f"      Modo: {operacao['modo']} - Posição: {operacao['posicao']}")
                print(f"      Data: {operacao['data_operacao']} - Placa: {operacao['placa']}")
                print()
        else:
            print("⚠️ Nenhuma operação encontrada na tabela operacoes")
            
    except Exception as e:
        print(f"❌ Erro ao verificar operações: {e}")
    finally:
        conn.close()

def simular_busca_container(numero_container):
    """Simula a busca de um container específico como faz a API"""
    conn = conectar_banco()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print(f"🔍 SIMULANDO BUSCA DO CONTAINER: {numero_container}")
        print("=" * 60)
        
        # Buscar o container (simulando a query da API)
        cursor.execute("""
            SELECT id, numero, status, posicao_atual, unidade, data_criacao, ultima_atualizacao,
                   tipo_container, tamanho, capacidade, tara, armador, booking
            FROM containers
            WHERE numero = ?
        """, (numero_container.upper(),))
        
        container = cursor.fetchone()
        
        if not container:
            print(f"❌ Container {numero_container} não encontrado")
            return
        
        print("✅ DADOS DO CONTAINER:")
        container_info = dict(container)
        for key, value in container_info.items():
            print(f"  {key}: {value}")
        
        # Buscar operações do container
        cursor.execute("""
            SELECT tipo, modo, posicao, placa, vagao, data_operacao, observacoes
            FROM operacoes
            WHERE container_id = ?
            ORDER BY data_operacao DESC
        """, (container['id'],))
        
        operacoes = cursor.fetchall()
        
        print(f"\n✅ OPERAÇÕES DO CONTAINER ({len(operacoes)} encontradas):")
        for i, op in enumerate(operacoes, 1):
            print(f"  {i}. Tipo: {op['tipo']} - Modo: {op['modo']}")
            print(f"     Posição: {op['posicao']} - Data: {op['data_operacao']}")
            if op['placa']:
                print(f"     Placa: {op['placa']}")
            if op['vagao']:
                print(f"     Vagão: {op['vagao']}")
            print()
        
        # Buscar vistorias do container
        cursor.execute("""
            SELECT * FROM vistorias WHERE container_numero = ? ORDER BY data_vistoria DESC
        """, (container['numero'],))
        
        vistorias = cursor.fetchall()
        
        print(f"✅ VISTORIAS DO CONTAINER ({len(vistorias)} encontradas):")
        for i, vistoria in enumerate(vistorias, 1):
            vistoria_dict = dict(vistoria)
            print(f"  {i}. Data: {vistoria_dict['data_vistoria']} - Status: {vistoria_dict['status']}")
            print(f"     Condição: {vistoria_dict['condicao']} - Tipo: {vistoria_dict['tipo_container']}")
            print(f"     Armador: {vistoria_dict['armador']} - ISO: {vistoria_dict['iso_container']}")
            print()
        
        # Buscar última vistoria (como faz a API)
        cursor.execute("""
            SELECT v.*
            FROM vistorias v
            WHERE v.container_numero = ?
            ORDER BY datetime(v.data_vistoria) DESC
            LIMIT 1
        """, (container['numero'],))
        
        ultima_vistoria = cursor.fetchone()
        
        if ultima_vistoria:
            print("✅ ÚLTIMA VISTORIA (dados que sobrescrevem o container):")
            vist_dict = dict(ultima_vistoria)
            campos_relevantes = ['armador', 'tamanho', 'capacidade', 'tara', 'status', 
                               'iso_container', 'lacre', 'observacoes_gerais', 'condicao', 
                               'placa', 'vagao', 'data_vistoria']
            
            for campo in campos_relevantes:
                if campo in vist_dict and vist_dict[campo]:
                    print(f"  {campo}: {vist_dict[campo]}")
        
        print("\n" + "=" * 60)
        print("✅ SIMULAÇÃO CONCLUÍDA")
            
    except Exception as e:
        print(f"❌ Erro ao simular busca: {e}")
    finally:
        conn.close()

def main():
    """Função principal"""
    print("🚀 INICIANDO DEBUG DA CONSULTA STATUS")
    print("=" * 60)
    
    # Verificar dados no banco
    verificar_containers()
    print()
    verificar_vistorias()
    print()
    verificar_operacoes()
    print()
    
    # Testar com containers específicos que têm dados completos
    containers_teste = ['TESTE1234544S', 'TESTE123', 'TESTE']
    
    for numero_teste in containers_teste:
        print(f"🧪 TESTANDO COM CONTAINER: {numero_teste}")
        print()
        simular_busca_container(numero_teste)
        print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
