import os
import sys
import sqlite3
import json
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Caminho do banco de dados
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def verificar_container_no_banco(container_numero):
    """Verifica os dados do container diretamente no banco de dados"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Consulta similar à usada na rota /operacoes/containers/vistoriados
        query = """
        SELECT 
            c.numero, 
            v.iso_container, 
            v.capacidade, 
            v.tara, 
            v.data_vistoria,
            v.vagao,
            v.placa
        FROM containers c
        JOIN vistorias v ON c.numero = v.container_numero
        WHERE c.status = 'vistoriado'
        AND c.numero = ?
        """
        
        cursor.execute(query, (container_numero,))
        result = cursor.fetchone()
        
        if result:
            container_data = {
                "numero": result[0],
                "iso_container": result[1],
                "capacidade": result[2],
                "tara": result[3],
                "data_vistoria": result[4],
                "vagao": result[5] or "",
                "placa": result[6] or ""
            }
            logger.info(f"✅ Container {container_numero} encontrado no banco")
            logger.info(f"📦 Dados: {json.dumps(container_data, indent=2)}")
            return container_data
        else:
            logger.error(f"❌ Container {container_numero} não encontrado no banco")
            return None
    except Exception as e:
        logger.error(f"❌ Erro ao consultar banco de dados: {e}")
        return None
    finally:
        if conn:
            conn.close()

def simular_deteccao_modo_transporte(container_data):
    """Simula a lógica do frontend para detecção do modo de transporte"""
    if not container_data:
        logger.error("❌ Não é possível detectar modo de transporte: dados do container não disponíveis")
        return None
    
    # Lógica do frontend (função configurarFormularioDescargaUnico)
    modo_transporte = 'indefinido'
    if container_data.get('vagao') and container_data['vagao'].strip():
        modo_transporte = 'ferroviaria'
        logger.info(f"🚂 Modo ferroviário detectado - vagão: '{container_data['vagao']}'")
    elif container_data.get('placa') and container_data['placa'].strip():
        modo_transporte = 'rodoviaria'
        logger.info(f"🚚 Modo rodoviário detectado - placa: '{container_data['placa']}'")
    else:
        logger.warning(f"⚠️ Modo indefinido - vagão: '{container_data.get('vagao', '')}', placa: '{container_data.get('placa', '')}'")
    
    return modo_transporte

def simular_iniciar_descarga_container(container_numero, container_data, modo_transporte):
    """Simula a função iniciarDescargaContainer do frontend"""
    logger.info(f"🔄 Simulando iniciarDescargaContainer para {container_numero}")
    
    # Simular a lógica da função iniciarDescargaContainer
    modo_transporte_efetivo = modo_transporte
    
    if modo_transporte_efetivo == 'indefinido':
        # Tentar detectar novamente baseado nos dados
        if container_data.get('vagao') and container_data['vagao'].strip():
            modo_transporte_efetivo = 'ferroviaria'
            logger.info(f"🔄 Reatribuição: Modo ferroviário detectado - vagão: '{container_data['vagao']}'")
        elif container_data.get('placa') and container_data['placa'].strip():
            modo_transporte_efetivo = 'rodoviaria'
            logger.info(f"🔄 Reatribuição: Modo rodoviário detectado - placa: '{container_data['placa']}'")
    
    if modo_transporte_efetivo == 'indefinido':
        logger.error(f"❌ ERRO: Modo de transporte indefinido para {container_numero}")
        return False
    else:
        logger.info(f"✅ Modo de transporte efetivo: {modo_transporte_efetivo}")
        return True

def testar_container(container_numero):
    """Testa o fluxo completo para um container específico"""
    logger.info(f"🧪 INICIANDO TESTE PARA CONTAINER {container_numero}")
    
    # 1. Buscar dados do container no banco
    container_data = verificar_container_no_banco(container_numero)
    if not container_data:
        return False
    
    # 2. Simular detecção de modo de transporte (configurarFormularioDescargaUnico)
    modo_transporte = simular_deteccao_modo_transporte(container_data)
    
    # 3. Simular iniciarDescargaContainer
    resultado = simular_iniciar_descarga_container(container_numero, container_data, modo_transporte)
    
    # 4. Verificar resultado
    if resultado:
        logger.info(f"✅ TESTE PASSOU: Container {container_numero} processado com sucesso")
    else:
        logger.error(f"❌ TESTE FALHOU: Container {container_numero} não pôde ser processado")
    
    return resultado

if __name__ == "__main__":
    # Testar o container problemático
    container_teste = "TESTE123456"
    logger.info(f"🚀 Iniciando teste para o container {container_teste}")
    
    resultado = testar_container(container_teste)
    
    if resultado:
        logger.info("✅ TESTE CONCLUÍDO COM SUCESSO")
        sys.exit(0)
    else:
        logger.error("❌ TESTE FALHOU")
        sys.exit(1)
