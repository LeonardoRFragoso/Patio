import requests
import json
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fazer_login():
    """
    Faz login no sistema e retorna a sessão
    """
    try:
        # URL de login
        login_url = "http://localhost:8505/auth/login"
        
        # Credenciais
        credenciais = {
            "username": "teste_vistoriador",
            "password": "Teste@123"
        }
        
        logger.info(f"Tentando login com usuário: {credenciais['username']}")
        
        # Criar uma sessão para manter cookies
        session = requests.Session()
        
        # Fazer login
        response = session.post(login_url, json=credenciais)
        
        # Verificar se o login foi bem-sucedido
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    logger.info("Login realizado com sucesso!")
                    logger.info(f"Cookies da sessão: {session.cookies.get_dict()}")
                    return session
                else:
                    logger.error(f"Erro no login: {data.get('error', 'Erro desconhecido')}")
                    return None
            except json.JSONDecodeError:
                logger.error("Resposta de login não é um JSON válido")
                logger.error(f"Resposta: {response.text}")
                return None
        else:
            logger.error(f"Erro no login: {response.status_code}")
            logger.error(f"Resposta: {response.text}")
            return None
    
    except Exception as e:
        logger.error(f"Erro ao fazer login: {str(e)}")
        return None

def test_containers_vistoriados():
    """
    Testa a rota de containers vistoriados para verificar se os dados estão corretos
    """
    try:
        # Fazer login para obter uma sessão autenticada
        session = fazer_login()
        
        if not session:
            logger.error("Não foi possível fazer login")
            return
        
        # URL da API
        url = "http://localhost:8505/operacoes/containers/vistoriados"
        
        # Fazer a requisição com a sessão autenticada
        logger.info(f"Fazendo requisição para {url} com sessão autenticada")
        response = session.get(url)
        
        # Mostrar a resposta bruta primeiro
        logger.info(f"Status code: {response.status_code}")
        logger.info(f"Resposta bruta: {response.text[:500]}..." if len(response.text) > 500 else f"Resposta bruta: {response.text}")
        
        # Verificar se a requisição foi bem-sucedida
        if response.status_code == 200:
            try:
                data = response.json()
                logger.info(f"Resposta recebida com sucesso: {response.status_code}")
                
                if data.get('success'):
                    containers = data.get('data', [])
                    logger.info(f"Total de containers retornados: {len(containers)}")
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao decodificar JSON: {str(e)}")
                logger.error(f"Conteúdo da resposta: {response.text[:1000]}")
                return
                
                # Verificar se há containers
                if containers:
                    # Procurar pelo container TESTE123456
                    teste_container = None
                    for container in containers:
                        logger.info(f"Container: {container['numero']}")
                        logger.info(f"  - ISO: {container.get('iso_container', 'N/A')}")
                        logger.info(f"  - Vagão: '{container.get('vagao', 'N/A')}'")
                        logger.info(f"  - Placa: '{container.get('placa', 'N/A')}'")
                        logger.info(f"  - Modo Transporte: {container.get('modo_transporte', 'N/A')}")
                        
                        if container['numero'] == 'TESTE123456':
                            teste_container = container
                    
                    # Verificar detalhes do container TESTE123456
                    if teste_container:
                        logger.info("\n=== DETALHES DO CONTAINER TESTE123456 ===")
                        logger.info(f"Container completo: {json.dumps(teste_container, indent=2)}")
                        logger.info(f"Vagão: '{teste_container.get('vagao', 'N/A')}'")
                        logger.info(f"Placa: '{teste_container.get('placa', 'N/A')}'")
                        logger.info(f"Modo Transporte: {teste_container.get('modo_transporte', 'N/A')}")
                        
                        # Verificar se o modo de transporte está correto
                        if teste_container.get('vagao') and teste_container.get('vagao').strip():
                            if teste_container.get('modo_transporte') != 'ferroviaria':
                                logger.error("ERRO: Container tem vagão mas modo não é ferroviário!")
                        elif teste_container.get('placa') and teste_container.get('placa').strip():
                            if teste_container.get('modo_transporte') != 'rodoviaria':
                                logger.error("ERRO: Container tem placa mas modo não é rodoviário!")
                        else:
                            logger.error("ERRO: Container não tem vagão nem placa!")
                    else:
                        logger.warning("Container TESTE123456 não encontrado na lista!")
                else:
                    logger.warning("Nenhum container retornado pela API")
            else:
                logger.error(f"Erro na resposta da API: {data.get('error', 'Erro desconhecido')}")
        else:
            logger.error(f"Erro na requisição: {response.status_code}")
            logger.error(f"Resposta: {response.text}")
    
    except Exception as e:
        logger.error(f"Erro ao testar a rota: {str(e)}")

if __name__ == "__main__":
    test_containers_vistoriados()
