import sqlite3
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def verificar_container_no_banco():
    """
    Verifica diretamente no banco de dados os dados do container TESTE123456
    """
    try:
        # Conectar ao banco de dados
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Verificar se o container existe na tabela containers
        logger.info("Verificando container TESTE123456 na tabela containers...")
        cursor.execute("SELECT * FROM containers WHERE numero = ?", ("TESTE123456",))
        container_data = cursor.fetchone()
        
        if container_data:
            logger.info(f"Container encontrado na tabela containers: {container_data}")
        else:
            logger.warning("Container TESTE123456 não encontrado na tabela containers")
        
        # Verificar se o container existe na tabela vistorias
        logger.info("Verificando container TESTE123456 na tabela vistorias...")
        cursor.execute("""
            SELECT v.*, c.status, c.unidade 
            FROM vistorias v 
            LEFT JOIN containers c ON v.container_numero = c.numero
            WHERE v.container_numero = ?
        """, ("TESTE123456",))
        vistoria_data = cursor.fetchone()
        
        if vistoria_data:
            logger.info(f"Container encontrado na tabela vistorias: {vistoria_data}")
            
            # Verificar especificamente os campos vagao e placa
            cursor.execute("SELECT container_numero, vagao, placa FROM vistorias WHERE container_numero = ?", ("TESTE123456",))
            transporte_data = cursor.fetchone()
            
            if transporte_data:
                logger.info(f"Dados de transporte: container={transporte_data[0]}, vagao='{transporte_data[1]}', placa='{transporte_data[2]}'")
                
                # Verificar se o modo de transporte está definido
                if transporte_data[1] and transporte_data[1].strip():
                    logger.info("Modo de transporte: FERROVIÁRIO (tem vagão)")
                elif transporte_data[2] and transporte_data[2].strip():
                    logger.info("Modo de transporte: RODOVIÁRIO (tem placa)")
                else:
                    logger.error("ERRO: Modo de transporte INDEFINIDO (não tem vagão nem placa)")
            else:
                logger.warning("Dados de transporte não encontrados")
        else:
            logger.warning("Container TESTE123456 não encontrado na tabela vistorias")
        
        # Verificar a consulta que a rota está usando
        logger.info("Simulando a consulta da rota listar_containers_vistoriados...")
        cursor.execute("""
            SELECT c.numero, v.iso_container, v.capacidade, v.tara, v.data_vistoria, v.vagao, v.placa
            FROM containers c
            JOIN vistorias v ON c.numero = v.container_numero
            WHERE c.status = 'vistoriado' AND c.numero = ?
        """, ("TESTE123456",))
        
        route_data = cursor.fetchone()
        if route_data:
            logger.info(f"Dados retornados pela consulta da rota: {route_data}")
            logger.info(f"Vagão: '{route_data[5]}', Placa: '{route_data[6]}'")
            
            # Verificar se o modo de transporte está definido
            if route_data[5] and route_data[5].strip():
                logger.info("Modo de transporte pela rota: FERROVIÁRIO (tem vagão)")
            elif route_data[6] and route_data[6].strip():
                logger.info("Modo de transporte pela rota: RODOVIÁRIO (tem placa)")
            else:
                logger.error("ERRO: Modo de transporte pela rota: INDEFINIDO (não tem vagão nem placa)")
        else:
            logger.warning("Container TESTE123456 não retornado pela consulta da rota")
        
        # Verificar se o container está na unidade correta
        cursor.execute("SELECT unidade FROM containers WHERE numero = ?", ("TESTE123456",))
        unidade_data = cursor.fetchone()
        
        if unidade_data:
            logger.info(f"Unidade do container: {unidade_data[0]}")
        else:
            logger.warning("Não foi possível determinar a unidade do container")
        
    except Exception as e:
        logger.error(f"Erro ao verificar container no banco: {str(e)}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    verificar_container_no_banco()
