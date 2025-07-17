#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script para testar o download do arquivo do SharePoint
"""

import os
import sys
import logging
import requests
import time
from datetime import datetime

# Configurar logging para console e arquivo
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('test_download.log', mode='w', encoding='utf-8')
    ]
)

logger = logging.getLogger('test_download')

def download_file(url):
    """Baixa o arquivo da URL fornecida com tratamento robusto de erros"""
    max_retries = 3
    retry_delay = 2  # segundos
    
    for attempt in range(1, max_retries + 1):
        try:
            # Usar headers mais completos para simular um navegador real
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, */*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
            
            logger.info(f"Tentativa {attempt}/{max_retries}: Iniciando download do arquivo: {url}")
            
            # Adicionar parâmetros para evitar cache
            timestamp = int(time.time() * 1000)
            url_with_nocache = f"{url}&_={timestamp}" if '?' in url else f"{url}?_={timestamp}"
            
            response = requests.get(url_with_nocache, headers=headers, timeout=60, allow_redirects=True)
            response.raise_for_status()
            
            # Verificar informações da resposta
            content_type = response.headers.get('Content-Type', '')
            content_length = len(response.content)
            logger.info(f"Download concluído. Content-Type: {content_type}, Tamanho: {content_length} bytes")
            
            # Verificar se o conteúdo parece ser HTML (possível página de erro ou redirecionamento)
            if content_type.startswith('text/html') or (len(response.content) > 10 and response.content[:10].decode('utf-8', errors='ignore').strip().startswith('<')):
                logger.warning(f"O servidor retornou HTML em vez de um arquivo Excel. Tentativa {attempt}/{max_retries}")
                if attempt < max_retries:
                    logger.info(f"Aguardando {retry_delay} segundos antes da próxima tentativa...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Aumentar o tempo de espera entre tentativas
                    continue
                else:
                    logger.error("Todas as tentativas falharam. O servidor continua retornando HTML.")
                    # Salvar o HTML para diagnóstico
                    try:
                        with open('download_error.html', 'wb') as f:
                            f.write(response.content)
                        logger.info("Conteúdo HTML salvo em 'download_error.html' para diagnóstico")
                    except Exception as save_err:
                        logger.error(f"Não foi possível salvar o HTML para diagnóstico: {save_err}")
                    return None
            
            # Verificar se o arquivo parece ser um arquivo Excel válido (começa com PK - assinatura ZIP)
            if not response.content.startswith(b'PK'):
                logger.warning(f"O conteúdo baixado não parece ser um arquivo Excel válido. Tentativa {attempt}/{max_retries}")
                if attempt < max_retries:
                    logger.info(f"Aguardando {retry_delay} segundos antes da próxima tentativa...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    logger.error("Todas as tentativas falharam. O conteúdo não é um arquivo Excel válido.")
                    # Salvar o conteúdo para diagnóstico
                    try:
                        with open('invalid_excel.bin', 'wb') as f:
                            f.write(response.content)
                        logger.info("Conteúdo inválido salvo em 'invalid_excel.bin' para diagnóstico")
                    except Exception as save_err:
                        logger.error(f"Não foi possível salvar o conteúdo para diagnóstico: {save_err}")
                    return None
            
            # Se chegou aqui, o download foi bem-sucedido
            # Salvar o arquivo para verificação
            try:
                with open('downloaded_excel.xlsx', 'wb') as f:
                    f.write(response.content)
                logger.info("Arquivo Excel salvo como 'downloaded_excel.xlsx'")
            except Exception as save_err:
                logger.error(f"Não foi possível salvar o arquivo Excel: {save_err}")
            
            return response.content
            
        except requests.RequestException as e:
            logger.error(f"Erro ao baixar arquivo (tentativa {attempt}/{max_retries}): {e}")
            if attempt < max_retries:
                logger.info(f"Aguardando {retry_delay} segundos antes da próxima tentativa...")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                logger.error("Todas as tentativas de download falharam.")
                return None
    
    return None  # Não deveria chegar aqui, mas por segurança

def main():
    """Função principal para testar o download do arquivo do SharePoint"""
    try:
        logger.info("Iniciando teste de download do arquivo do SharePoint...")
        
        # URL atualizada do OneDrive conforme fornecida pelo usuário
        base_url = "https://ictsi-my.sharepoint.com/:x:/p/leonardo_fragoso_itracker/EV8B0yiu9txKjo3I45WIYXkBK9u7ye7q9YF7bMb1E81fOA"
        
        # Garantir que estamos usando o parâmetro download=1 em vez de e=7tWqt3
        if "?" in base_url:
            # Remover qualquer parâmetro existente e adicionar download=1
            url = base_url.split("?")[0] + "?download=1"
        else:
            url = base_url + "?download=1"
        
        logger.info(f"URL de download: {url}")
        
        # Tentar baixar o arquivo
        content = download_file(url)
        
        if content:
            logger.info(f"Download bem-sucedido! Tamanho do arquivo: {len(content)} bytes")
            
            # Verificar se é um arquivo ZIP válido
            if content.startswith(b'PK'):
                logger.info("O arquivo é um arquivo ZIP válido (começa com PK)")
                
                # Tentar abrir como um arquivo ZIP
                import zipfile
                import io
                try:
                    with zipfile.ZipFile(io.BytesIO(content)) as zip_file:
                        logger.info(f"Conteúdo do arquivo ZIP: {zip_file.namelist()}")
                except zipfile.BadZipFile:
                    logger.error("O arquivo não é um arquivo ZIP válido, apesar de começar com PK")
            else:
                logger.error("O arquivo não é um arquivo ZIP válido (não começa com PK)")
                # Mostrar os primeiros bytes do arquivo
                logger.info(f"Primeiros 20 bytes do arquivo: {content[:20]}")
        else:
            logger.error("Falha ao baixar o arquivo")
        
        return 0
    except Exception as e:
        logger.error(f"Erro durante o teste: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return 1

if __name__ == "__main__":
    sys.exit(main())
