from flask import Blueprint, jsonify, request, session
import logging
from posicoes_suzano import patio_suzano
from db import get_db

logger = logging.getLogger(__name__)

posicoes_bp = Blueprint('posicoes', __name__)

@posicoes_bp.route('/disponiveis', methods=['GET'])
def get_posicoes_disponiveis():
    """
    Retorna as posições disponíveis para um container com determinado status
    Parâmetros:
    - status_container: CHEIO ou VAZIO (default: CHEIO)
    - unidade: unidade do pátio (default: FLORIANO)
    - container_size: tamanho do container em TEU (20 ou 40, default: 20)
    """
    try:
        status_container = request.args.get('status', 'CHEIO')
        unidade = request.args.get('unidade', 'FLORIANO')
        container_size = int(request.args.get('container_size', 20))
        
        logger.info(f"Buscando posições disponíveis: status={status_container}, unidade={unidade}, tamanho={container_size}TEU")
        
        # Verificar unidade suportada
        if unidade.upper() == 'SUZANO':
            # Obter posições disponíveis do pátio Suzano
            posicoes = patio_suzano.sugerir_posicoes_para_container(status_container)
        else:
            return jsonify({
                'success': False,
                'error': f'Unidade {unidade} não suportada para busca de posições, apenas Suzano'
            }), 400
        
        # Obter conexão com o banco de dados
        db = get_db()
        cursor = db.cursor()
        
        # Buscar containers no pátio com informações detalhadas
        # Normalizar unidade para o formato correto do banco (Suzano)
        unidade_normalizada = 'Suzano' if unidade.upper() == 'SUZANO' else unidade
        
        cursor.execute(
            'SELECT posicao_atual, tamanho FROM containers WHERE status = "no patio" AND unidade = ? AND posicao_atual IS NOT NULL',
            (unidade_normalizada,)
        )
        containers_no_patio = cursor.fetchall()
        
        # Criar mapa de posições ocupadas considerando containers de 40ft
        posicoes_ocupadas_detalhadas = {}
        for posicao, tamanho in containers_no_patio:
            if posicao:
                posicoes_ocupadas_detalhadas[posicao] = tamanho
                
                # Se container é de 40ft, ele ocupa 2 posições ímpares adjacentes
                # Regra: Container 40ft em posição par (ex: A14-1) ocupa as posições ímpares A13-1 e A15-1
                if tamanho and '40' in str(tamanho):
                    try:
                        # Decompor posição (A14-1 -> A, 14, 1)
                        baia_letra = posicao[0]
                        partes = posicao[1:].split('-')
                        baia_numero = int(partes[0])
                        altura = int(partes[1])
                        
                        # Container 40ft em posição par ocupa as duas posições ímpares adjacentes
                        if baia_numero % 2 == 0:  # Posição par (A02, A04, A06, etc.)
                            # Bloquear posição ímpar anterior (N-1) e posterior (N+1)
                            posicao_anterior = f"{baia_letra}{baia_numero-1:02d}-{altura}"  # A13-1
                            posicao_posterior = f"{baia_letra}{baia_numero+1:02d}-{altura}"  # A15-1
                            
                            posicoes_ocupadas_detalhadas[posicao_anterior] = f"{tamanho}_ocupada_por_40ft_anterior"
                            posicoes_ocupadas_detalhadas[posicao_posterior] = f"{tamanho}_ocupada_por_40ft_posterior"
                            
                            logger.info(f"Container 40ft {posicao} ocupa posições ímpares {posicao_anterior} e {posicao_posterior}")
                        else:
                            logger.warning(f"Container 40ft {posicao} está em posição ímpar - isso não deveria acontecer")
                        
                    except Exception as e:
                        logger.error(f"Erro ao processar posição de container 40ft {posicao}: {e}")
        
        logger.info(f"Encontrados {len(posicoes_ocupadas_detalhadas)} containers no pátio")
        
        # Filtrar posições disponíveis considerando regras de ocupação e base de apoio
        posicoes_disponiveis = []
        
        for posicao in posicoes:
            if _pode_colocar_container(posicao, container_size, posicoes_ocupadas_detalhadas):
                # Verificar regra de base de apoio para alturas > 1
                if _tem_base_de_apoio(posicao, posicoes_ocupadas_detalhadas):
                    posicoes_disponiveis.append(posicao)
        
        logger.info(f"Posições disponíveis após validação: {len(posicoes_disponiveis)} para container {container_size}TEU")
        
        # Ordenar posições por baia, posição e altura
        # Formato da posição: A01-1 (baia A, posição 01, altura 1)
        def ordenar_posicao(p):
            # Extrair componentes da posição no formato A01-1
            baia = p[0]  # Primeira letra (A, B, C, etc)
            partes = p[1:].split('-')  # Separar pelo hífen
            posicao_num = int(partes[0])  # Número da posição (01, 02, etc)
            altura = int(partes[1])  # Altura (1, 2, etc)
            return (baia, posicao_num, altura)
            
        posicoes_ordenadas = sorted(posicoes_disponiveis, key=ordenar_posicao)
        
        # Agrupar posições por baia e posição
        posicoes_agrupadas = {}
        for posicao in posicoes_ordenadas:
            # Extrair baia e posição no formato A01-1
            partes = posicao.split('-')
            baia_pos = partes[0]  # Ex: A01
            altura = int(partes[1])  # Ex: 1
            
            if baia_pos not in posicoes_agrupadas:
                posicoes_agrupadas[baia_pos] = []
                
            posicoes_agrupadas[baia_pos].append({
                'posicao_completa': posicao,
                'altura': altura
            })
        
        # Converter para formato de resposta
        resultado = []
        for baia_pos, alturas in posicoes_agrupadas.items():
            # Ordenar por altura (começando pela altura 1)
            alturas_ordenadas = sorted(alturas, key=lambda a: a['altura'])
            
            # Adicionar TODAS as alturas disponíveis para cada posição
            for altura_info in alturas_ordenadas:
                resultado.append({
                    'baia_posicao': baia_pos,
                    'posicao_completa': altura_info['posicao_completa'],
                    'altura': altura_info['altura'],
                    'label': f"{baia_pos}-{altura_info['altura']}"
                })
        
        return jsonify({
            'success': True,
            'posicoes': resultado,
            'total_posicoes': len(resultado),
            'container_size': container_size,
            'containers_no_patio': len(posicoes_ocupadas_detalhadas)
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar posições disponíveis: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro ao buscar posições disponíveis: {str(e)}'
        }), 500


def _pode_colocar_container(posicao, container_size, posicoes_ocupadas):
    """
    Verifica se um container pode ser colocado em uma posição específica.
    
    Args:
        posicao (str): Posição no formato A01-1
        container_size (int): Tamanho do container (20 ou 40)
        posicoes_ocupadas (dict): Mapa de posições ocupadas {posicao: tamanho}
        
    Returns:
        bool: True se o container pode ser colocado
    """
    try:
        # Verificar se a posição já está ocupada
        if posicao in posicoes_ocupadas:
            return False
        
        # Decompor posição (A01-1 -> A, 01, 1)
        baia_letra = posicao[0]  # A, B, C, D, E
        partes = posicao[1:].split('-')
        baia_numero = int(partes[0])  # 01-20
        altura = int(partes[1])  # 1-5
        
        if container_size == 20:
            # Container 20ft: apenas verificar se a posição não está ocupada
            # Também verificar se não há container 40ft que ocupe esta posição
            return _posicao_livre_para_20ft(baia_letra, baia_numero, altura, posicoes_ocupadas)
            
        elif container_size == 40:
            # Container 40ft: precisa de 2 posições consecutivas (N e N+1)
            return _posicao_livre_para_40ft(baia_letra, baia_numero, altura, posicoes_ocupadas)
            
        return False
        
    except Exception as e:
        logger.error(f"Erro ao validar posição {posicao}: {e}")
        return False


def _posicao_livre_para_20ft(baia_letra, baia_numero, altura, posicoes_ocupadas):
    """
    Verifica se uma posição está livre para container 20ft.
    
    Args:
        baia_letra (str): Letra da baia (A-E)
        baia_numero (int): Número da baia (1-20)
        altura (int): Altura (1-5)
        posicoes_ocupadas (dict): Posições ocupadas
        
    Returns:
        bool: True se livre para 20ft
    """
    posicao_atual = f"{baia_letra}{baia_numero:02d}-{altura}"
    
    # Verificar se a posição está ocupada
    if posicao_atual in posicoes_ocupadas:
        return False
    
    # Verificar se há container 40ft na posição anterior que ocupe esta posição
    if baia_numero > 1:
        posicao_anterior = f"{baia_letra}{baia_numero-1:02d}-{altura}"
        if posicao_anterior in posicoes_ocupadas:
            tamanho_anterior = posicoes_ocupadas[posicao_anterior]
            if tamanho_anterior and '40' in str(tamanho_anterior):
                # Container 40ft na posição anterior ocupa esta posição
                return False
    
    return True


def _posicao_livre_para_40ft(baia_letra, baia_numero, altura, posicoes_ocupadas):
    """
    Verifica se uma posição está livre para container 40ft.
    Container 40ft precisa de 2 posições consecutivas: N e N+1
    
    Args:
        baia_letra (str): Letra da baia (A-E)
        baia_numero (int): Número da baia (1-20)
        altura (int): Altura (1-5)
        posicoes_ocupadas (dict): Posições ocupadas
        
    Returns:
        bool: True se livre para 40ft
    """
    # Container 40ft não pode começar na posição 20 (não há posição 21)
    if baia_numero >= 20:
        return False
    
    posicao_atual = f"{baia_letra}{baia_numero:02d}-{altura}"
    posicao_seguinte = f"{baia_letra}{baia_numero+1:02d}-{altura}"
    
    # Ambas as posições devem estar livres
    if posicao_atual in posicoes_ocupadas or posicao_seguinte in posicoes_ocupadas:
        return False
    
    return True


def _tem_base_de_apoio(posicao, posicoes_ocupadas):
    """
    Verifica se uma posição tem base de apoio (container na altura imediatamente inferior).
    Regra física: containers não podem flutuar sem base de apoio.
    
    Considera tanto posições diretamente ocupadas quanto posições bloqueadas por containers de 40ft.
    
    Args:
        posicao (str): Posição no formato A01-1
        posicoes_ocupadas (dict): Posições ocupadas (inclui posições bloqueadas)
        
    Returns:
        bool: True se tem base de apoio ou é altura 1
    """
    try:
        # Decompor posição (A01-2 -> A, 01, 2)
        baia_letra = posicao[0]
        partes = posicao[1:].split('-')
        baia_numero = int(partes[0])
        altura = int(partes[1])
        
        # Altura 1 sempre tem base (chão)
        if altura == 1:
            return True
        
        # Para alturas > 1, verificar se há base na altura imediatamente inferior
        altura_inferior = altura - 1
        posicao_base = f"{baia_letra}{baia_numero:02d}-{altura_inferior}"
        
        # Verificar se a posição base está ocupada ou bloqueada
        # (posicoes_ocupadas já inclui posições bloqueadas por containers de 40ft)
        tem_base = posicao_base in posicoes_ocupadas
        
        if tem_base:
            logger.debug(f"Posição {posicao} tem base de apoio em {posicao_base}")
        else:
            # Verificar se há container de 40ft que cria base física na posição
            tem_base_40ft = _verifica_base_container_40ft(baia_letra, baia_numero, altura_inferior, posicoes_ocupadas)
            if tem_base_40ft:
                logger.debug(f"Posição {posicao} tem base de apoio via container 40ft")
                tem_base = True
            else:
                logger.debug(f"Posição {posicao} não tem base de apoio (falta container em {posicao_base})")
        
        return tem_base
        
    except Exception as e:
        logger.error(f"Erro ao verificar base de apoio para {posicao}: {e}")
        return False


def _verifica_base_container_40ft(baia_letra, baia_numero, altura, posicoes_ocupadas):
    """
    Verifica se há um container de 40ft que cria base física para a posição.
    
    Container de 40ft em posição par bloqueia duas posições ímpares adjacentes,
    criando base física para essas posições.
    
    Args:
        baia_letra (str): Letra da baia (A-E)
        baia_numero (int): Número da baia (ímpar)
        altura (int): Altura da base
        posicoes_ocupadas (dict): Posições ocupadas
        
    Returns:
        bool: True se há container 40ft criando base física
    """
    try:
        # Se a baia é ímpar, verificar se há container 40ft na baia par adjacente
        if baia_numero % 2 == 1:  # Baia ímpar
            # Container 40ft pode estar na baia par anterior ou posterior
            baias_40ft_possiveis = []
            
            # Baia par anterior (ex: A02 para A01/A03)
            if baia_numero > 1:
                baia_par_anterior = baia_numero - 1
                baias_40ft_possiveis.append(baia_par_anterior)
            
            # Baia par posterior (ex: A04 para A03/A05)
            if baia_numero < 20:
                baia_par_posterior = baia_numero + 1
                baias_40ft_possiveis.append(baia_par_posterior)
            
            # Verificar se há container 40ft em alguma dessas baias pares
            for baia_par in baias_40ft_possiveis:
                posicao_40ft = f"{baia_letra}{baia_par:02d}-{altura}"
                if posicao_40ft in posicoes_ocupadas:
                    container_info = posicoes_ocupadas[posicao_40ft]
                    if isinstance(container_info, dict) and container_info.get('tamanho') == '40':
                        logger.debug(f"Container 40ft em {posicao_40ft} cria base para baia {baia_numero}")
                        return True
        
        return False
        
    except Exception as e:
        logger.error(f"Erro ao verificar base 40ft para {baia_letra}{baia_numero:02d}-{altura}: {e}")
        return False
