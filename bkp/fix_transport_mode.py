"""
Script para corrigir o problema de modo de transporte indefinido na operação de descarga.

Este script modifica a função registrar_vistoria para capturar e salvar informações
de modo de transporte (vagão ou placa) durante o processo de vistoria.

Problema: Quando um container é vistoriado, o sistema não captura informações sobre
o modo de transporte (ferroviário ou rodoviário), o que causa erro "Modo de transporte indefinido"
quando o operador tenta processar o container para descarga.

Solução: Modificar a função registrar_vistoria para capturar e salvar os campos vagao e placa,
e atualizar o HTML do formulário de vistoria para incluir esses campos.
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from utils.db import get_db
import os
import json
from datetime import datetime

def check_and_fix_transport_mode():
    """
    Verifica se há containers vistoriados sem modo de transporte definido
    e permite ao usuário definir o modo de transporte para esses containers.
    """
    try:
        # Conectar ao banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # 1. Verificar se as colunas vagao e placa existem na tabela vistorias
        try:
            cursor.execute("SELECT vagao FROM vistorias LIMIT 1")
        except Exception:
            print("Adicionando coluna 'vagao' à tabela vistorias...")
            cursor.execute("ALTER TABLE vistorias ADD COLUMN vagao TEXT")
        
        try:
            cursor.execute("SELECT placa FROM vistorias LIMIT 1")
        except Exception:
            print("Adicionando coluna 'placa' à tabela vistorias...")
            cursor.execute("ALTER TABLE vistorias ADD COLUMN placa TEXT")
        
        # 2. Buscar containers vistoriados sem modo de transporte definido
        cursor.execute("""
            SELECT c.numero, v.id as vistoria_id
            FROM containers c
            JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.status = 'vistoriado'
            AND (v.vagao IS NULL OR v.vagao = '')
            AND (v.placa IS NULL OR v.placa = '')
        """)
        
        containers_sem_modo = cursor.fetchall()
        
        if not containers_sem_modo:
            print("Não foram encontrados containers vistoriados sem modo de transporte definido.")
            return
        
        print(f"Encontrados {len(containers_sem_modo)} containers sem modo de transporte definido:")
        
        # 3. Para cada container, permitir ao usuário definir o modo de transporte
        for container in containers_sem_modo:
            container_numero = container[0]
            vistoria_id = container[1]
            
            print(f"\nContainer: {container_numero}")
            modo = input("Modo de transporte (1=Ferroviário, 2=Rodoviário): ")
            
            if modo == "1":
                vagao = input("Número do vagão: ")
                cursor.execute("""
                    UPDATE vistorias
                    SET vagao = ?
                    WHERE id = ?
                """, (vagao, vistoria_id))
                print(f"Container {container_numero} atualizado para modo ferroviário, vagão: {vagao}")
            
            elif modo == "2":
                placa = input("Placa do caminhão: ")
                cursor.execute("""
                    UPDATE vistorias
                    SET placa = ?
                    WHERE id = ?
                """, (placa, vistoria_id))
                print(f"Container {container_numero} atualizado para modo rodoviário, placa: {placa}")
            
            else:
                print("Opção inválida, container não atualizado.")
        
        # 4. Commit das alterações
        db.commit()
        print("\nAtualizações concluídas com sucesso!")
        
    except Exception as e:
        print(f"Erro ao verificar/corrigir modos de transporte: {str(e)}")
    finally:
        if 'db' in locals():
            db.close()

def update_vistoriador_template():
    """
    Instruções para atualizar o template HTML do vistoriador para incluir campos de modo de transporte.
    """
    print("""
INSTRUÇÕES PARA ATUALIZAR O TEMPLATE HTML:

1. Abra o arquivo backend/templates/auth/dashboard_vistoriador.html
2. Localize a seção do formulário de vistoria (geralmente dentro de um modal com id="modalVistoria")
3. Adicione os seguintes campos antes do campo de observações:

<div class="row mb-3">
  <div class="col-md-6">
    <div class="form-group">
      <label for="modo_transporte" class="form-label">Modo de Transporte</label>
      <select class="form-select" id="modo_transporte" name="modo_transporte">
        <option value="">Selecione...</option>
        <option value="ferroviaria">Ferroviário</option>
        <option value="rodoviaria">Rodoviário</option>
      </select>
    </div>
  </div>
</div>

<div class="row mb-3" id="campo_vagao" style="display: none;">
  <div class="col-md-6">
    <div class="form-group">
      <label for="vagao" class="form-label">Número do Vagão</label>
      <input type="text" class="form-control" id="vagao" name="vagao" placeholder="Número do vagão">
    </div>
  </div>
</div>

<div class="row mb-3" id="campo_placa" style="display: none;">
  <div class="col-md-6">
    <div class="form-group">
      <label for="placa" class="form-label">Placa do Caminhão</label>
      <input type="text" class="form-control" id="placa" name="placa" placeholder="Placa do caminhão">
    </div>
  </div>
</div>

4. Adicione o seguinte JavaScript ao final do arquivo (dentro da tag <script>):

// Mostrar/ocultar campos de vagão/placa com base no modo de transporte selecionado
document.getElementById('modo_transporte').addEventListener('change', function() {
  const campoVagao = document.getElementById('campo_vagao');
  const campoPlaca = document.getElementById('campo_placa');
  
  if (this.value === 'ferroviaria') {
    campoVagao.style.display = 'block';
    campoPlaca.style.display = 'none';
    document.getElementById('placa').value = '';
  } else if (this.value === 'rodoviaria') {
    campoVagao.style.display = 'none';
    campoPlaca.style.display = 'block';
    document.getElementById('vagao').value = '';
  } else {
    campoVagao.style.display = 'none';
    campoPlaca.style.display = 'none';
    document.getElementById('vagao').value = '';
    document.getElementById('placa').value = '';
  }
});
    """)

def update_vistoriador_route():
    """
    Instruções para atualizar a rota registrar_vistoria para processar os campos de modo de transporte.
    """
    print("""
INSTRUÇÕES PARA ATUALIZAR A ROTA registrar_vistoria:

1. Abra o arquivo backend/routes/vistoriador.py
2. Localize a função registrar_vistoria()
3. Adicione os seguintes campos à extração de dados do formulário (após a linha que obtém o armador):

        # Obter informações de modo de transporte
        modo_transporte = request.form.get('modo_transporte', '').strip()
        vagao = request.form.get('vagao', '').strip().upper() if modo_transporte == 'ferroviaria' else ''
        placa = request.form.get('placa', '').strip().upper() if modo_transporte == 'rodoviaria' else ''

4. Modifique a query de inserção na tabela vistorias para incluir os novos campos:

        cursor.execute('''
            INSERT INTO vistorias (
                container_numero, status, iso_container, tipo_container, tamanho,
                capacidade, tara, lacre, armador, tipo_operacao, condicao,
                observacoes, usuario_id, unidade, data_vistoria, vagao, placa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            container_numero, status, iso_container, tipo_container, tamanho,
            capacidade, tara, lacre, armador, tipo_operacao, condicao,
            observacoes, usuario_id, unidade, data_vistoria, vagao, placa
        ))
    """)

if __name__ == "__main__":
    print("=== Ferramenta de Correção de Modo de Transporte ===")
    print("1. Verificar e corrigir containers sem modo de transporte")
    print("2. Mostrar instruções para atualizar o template HTML")
    print("3. Mostrar instruções para atualizar a rota registrar_vistoria")
    print("4. Sair")
    
    opcao = input("\nEscolha uma opção: ")
    
    if opcao == "1":
        check_and_fix_transport_mode()
    elif opcao == "2":
        update_vistoriador_template()
    elif opcao == "3":
        update_vistoriador_route()
    else:
        print("Saindo...")
