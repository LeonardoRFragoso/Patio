#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para testar o cliente SharePoint após as correções
"""

import os
import sys
import logging
import traceback

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger('test_sharepoint_client')

def main():
    """Função principal para testar o cliente SharePoint"""
    try:
        logger.info("Iniciando teste do cliente SharePoint...")
        
        # Adicionar o diretório atual ao path para importar os módulos
        sys.path.append(os.path.abspath(os.path.dirname(__file__)))
        
        # Importar o cliente SharePoint
        from backend.utils.sharepoint_client import get_sharepoint_client
        
        logger.info("Obtendo instância do cliente SharePoint...")
        client = get_sharepoint_client()
        
        # Verificar status do cache antes de forçar atualização
        cache_status = client.get_cache_status()
        logger.info(f"Status do cache antes da atualização: {cache_status}")
        
        logger.info("Forçando atualização do cache de placas...")
        placas = client.get_placas_list(force_refresh=True)
        
        if placas:
            logger.info(f"Sucesso! Encontradas {len(placas)} placas.")
            logger.info(f"Primeiras 10 placas: {', '.join(placas[:10])}")
        else:
            logger.warning("Nenhuma placa encontrada.")
        
        # Verificar status do cache após atualização
        cache_status = client.get_cache_status()
        logger.info(f"Status do cache após atualização: {cache_status}")
        
        return 0
    except Exception as e:
        logger.error(f"Erro durante o teste: {e}")
        logger.error(traceback.format_exc())
        return 1

if __name__ == "__main__":
    sys.exit(main())
