"""
Módulo para gerenciar as posições e validações do pátio de Suzano.
Este módulo controla onde containers podem ser posicionados baseado em suas condições (CHEIO/VAZIO).
PADRÃO: Todas as posições usam formato A01-1 (externamente) e o sistema trabalha diretamente com esse formato.
"""

import os
import logging
from typing import Dict, List, Tuple, Optional, Set

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PatioSuzano:
    def __init__(self, arquivo_posicoes: str = None):
        """
        Inicializa o gerenciador do pátio de Suzano.
        
        Args:
            arquivo_posicoes (str): Caminho para o arquivo de posições. 
                                  Se None, usa o arquivo padrão.
        """
        if arquivo_posicoes is None:
            arquivo_posicoes = os.path.join(os.path.dirname(__file__), 'posicao_suzano.txt')
        
        self.arquivo_posicoes = arquivo_posicoes
        self.posicoes_disponiveis: Dict[str, str] = {}
        self.carregar_posicoes()
    
    def carregar_posicoes(self) -> None:
        """
        Carrega as posições disponíveis do arquivo de configuração.
        O arquivo usa formato A01-1 e o sistema trabalha diretamente com esse formato.
        """
        try:
            with open(self.arquivo_posicoes, 'r', encoding='utf-8') as arquivo:
                linhas = arquivo.readlines()
                
            # Pular o cabeçalho
            for linha in linhas[1:]:
                linha = linha.strip()
                if linha and '\t' in linha:
                    posicao, condicao = linha.split('\t', 1)
                    posicao = posicao.strip()
                    condicao = condicao.strip()
                    
                    # Armazenar diretamente no formato A01-1
                    self.posicoes_disponiveis[posicao] = condicao
            
            logger.info(f"Carregadas {len(self.posicoes_disponiveis)} posições do pátio de Suzano")
            
        except FileNotFoundError:
            logger.error(f"Arquivo de posições não encontrado: {self.arquivo_posicoes}")
            raise
        except Exception as e:
            logger.error(f"Erro ao carregar posições: {e}")
            raise
    
    def decompor_posicao(self, posicao: str) -> Tuple[str, int, int]:
        """
        Decompõe uma posição em seus componentes.
        
        Args:
            posicao (str): Posição no formato A01-1
            
        Returns:
            Tuple[str, int, int]: (row, baia, altura)
            
        Example:
            A01-1 -> ('A', 1, 1) onde A=Row, 01=Baia, 1=Altura
            E20-5 -> ('E', 20, 5) onde E=Row, 20=Baia, 5=Altura
        """
        import re
        
        # Verificar se está no formato padrão A01-1
        padrao = re.match(r'^([A-E])([0-9]{2})-([1-5])$', posicao)
        if padrao:
            row = padrao.group(1)  # A-E agora representa Row
            baia = int(padrao.group(2))  # 01-20 agora representa Baia
            altura = int(padrao.group(3))  # 1-5 continua sendo Altura
            return row, baia, altura
        
        raise ValueError(f"Posição inválida: {posicao}. Formato esperado: A01-1")
    
    def validar_formato_a01_1(self, posicao: str) -> bool:
        """
        Valida se a posição está no formato correto A01-1.
        
        Args:
            posicao (str): Posição a validar
            
        Returns:
            bool: True se está no formato correto
        """
        import re
        padrao = r'^[A-E](0[1-9]|1[0-9]|20)-[1-5]$'
        return re.match(padrao, posicao) is not None
    
    def validar_posicao_existe(self, posicao: str) -> bool:
        """
        Verifica se uma posição existe no pátio.
        
        Args:
            posicao (str): Posição no formato A01-1
            
        Returns:
            bool: True se a posição existe
        """
        try:
            # Validar formato primeiro
            if not self.validar_formato_a01_1(posicao):
                return False
            
            # Verificar no arquivo
            return posicao in self.posicoes_disponiveis
        except:
            return False
    
    def validar_condicao_container(self, posicao: str, status_container: str) -> bool:
        """
        Valida se um container com determinado status pode ser colocado em uma posição.
        
        Args:
            posicao (str): Posição desejada no formato A01-1
            status_container (str): Status do container ('CHEIO' ou 'VAZIO')
            
        Returns:
            bool: True se o container pode ser posicionado
        """
        try:
            # Verificar se a posição existe
            if not self.validar_posicao_existe(posicao):
                return False
            
            # Verificar a condição
            condicao = self.posicoes_disponiveis.get(posicao)
            
            # Se a posição aceita qualquer tipo de container
            if condicao == "CHEIO / VAZIO":
                return True
            
            # Se a posição só aceita containers vazios
            if condicao == "VAZIO" and status_container == "VAZIO":
                return True
            
            # Em outros casos, não é válido
            return False
        except:
            return False
    
    def obter_posicoes_disponiveis_para_status(self, status_container: str) -> List[str]:
        """
        Retorna todas as posições disponíveis para um determinado status de container.
        
        Args:
            status_container (str): Status do container ('CHEIO' ou 'VAZIO')
            
        Returns:
            List[str]: Lista de posições no formato A01-1
        """
        posicoes = []
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            if condicao == "CHEIO / VAZIO" or (condicao == "VAZIO" and status_container == "VAZIO"):
                posicoes.append(posicao)
        
        return posicoes
    
    def obter_posicoes_por_baia(self, baia: str) -> Dict[str, str]:
        """
        Retorna todas as posições de uma baia específica.
        
        Args:
            baia (str): Letra da baia (A-E)
            
        Returns:
            Dict[str, str]: Dicionário com posições (A01-1) e suas condições
        """
        posicoes = {}
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            if posicao[0] == baia:
                posicoes[posicao] = condicao
        
        return posicoes
    
    def obter_posicoes_por_altura(self, altura: int) -> Dict[str, str]:
        """
        Retorna todas as posições de uma altura específica.
        
        Args:
            altura (int): Altura desejada (1-5)
            
        Returns:
            Dict[str, str]: Dicionário com posições (A01-1) e suas condições
        """
        posicoes = {}
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            if int(posicao.split('-')[1]) == altura:
                posicoes[posicao] = condicao
        
        return posicoes
    
    def obter_estatisticas_patio(self) -> Dict:
        """
        Retorna estatísticas do pátio.
        
        Returns:
            Dict: Estatísticas do pátio
        """
        stats = {
            'total_posicoes': len(self.posicoes_disponiveis),
            'posicoes_cheio_vazio': 0,
            'posicoes_apenas_vazio': 0,
            'baias_disponiveis': set(),
            'alturas_disponiveis': set(),
            'distribuicao_por_baia': {},
            'distribuicao_por_altura': {}
        }
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            baia, _, altura = self.decompor_posicao(posicao)
            
            if condicao == "CHEIO / VAZIO":
                stats['posicoes_cheio_vazio'] += 1
            elif condicao == "VAZIO":
                stats['posicoes_apenas_vazio'] += 1
            
            stats['baias_disponiveis'].add(baia)
            stats['alturas_disponiveis'].add(str(altura))
            
        stats['baias_disponiveis'] = sorted(list(stats['baias_disponiveis']))
        stats['alturas_disponiveis'] = sorted(list(stats['alturas_disponiveis']))
        
        return stats
    
    def sugerir_posicoes_para_container(self, status_container: str, baia_preferida: str = None, 
                                      altura_maxima: int = None) -> List[str]:
        """
        Sugere posições adequadas para um container baseado em critérios.
        
        Args:
            status_container (str): Status do container ('CHEIO' ou 'VAZIO')
            baia_preferida (str): Baia preferida (opcional)
            altura_maxima (int): Altura máxima desejada (opcional)
            
        Returns:
            List[str]: Lista de posições sugeridas no formato A01-1, ordenadas por prioridade
        """
        # Obter todas as posições disponíveis para o status do container
        posicoes_disponiveis = self.obter_posicoes_disponiveis_para_status(status_container)
        
        # Filtrar por baia preferida, se especificada
        if baia_preferida:
            posicoes_disponiveis = [p for p in posicoes_disponiveis if p[0] == baia_preferida]
        
        # Filtrar por altura máxima, se especificada
        if altura_maxima:
            posicoes_disponiveis = [p for p in posicoes_disponiveis if int(p.split('-')[1]) <= altura_maxima]
        
        # Priorizar por alguns critérios: altura (mais baixo primeiro), depois por baia alfabética
        def prioridade_posicao(posicao: str) -> Tuple[int, str, int]:
            baia, numero, altura = self.decompor_posicao(posicao)
            return (altura, baia, numero)
        
        return sorted(posicoes_disponiveis, key=prioridade_posicao)
    
    def sugerir_posicoes_40_teu_livres(self, status_container: str, db_connection, baia_preferida: str = None) -> List[str]:
        """
        🔴 LÓGICA CORRIGIDA: Sugere posições válidas para containers de 40 TEU.
        REGRA FÍSICA: Container 40ft ocupa 2 posições ímpares físicas consecutivas (ex: A01-1 e A03-1)
        POSIÇÃO LÓGICA: É representada pela posição par intermediária (ex: A02-1)
        REGRA PONTE: Container 40ft pode ser empilhado sobre dois containers 20ft adjacentes
        
        Args:
            status_container (str): Status do container (CHEIO, VAZIO, etc.)
            db_connection: Conexão com o banco de dados
            baia_preferida (str): Baia preferida (opcional)
            
        Returns:
            List[str]: Lista de posições lógicas válidas para container 40 TEU (posições pares)
        """
        posicoes_validas = []
        
        # Filtrar por baia se especificada
        baias_para_verificar = [baia_preferida] if baia_preferida else ['A', 'B', 'C', 'D', 'E']
        
        # Para cada baia, verificar posições ímpares físicas consecutivas disponíveis
        for baia in baias_para_verificar:
            for altura in range(1, 6):  # Alturas 1-5
                # Verificar pares de posições ímpares físicas consecutivas
                for baia_impar in range(1, 20, 2):  # 1, 3, 5, 7, 9, 11, 13, 15, 17, 19
                    baia_impar_seguinte = baia_impar + 2  # 3, 5, 7, 9, 11, 13, 15, 17, 19, 21
                    
                    # Verificar se a segunda posição ímpar existe (máximo 19)
                    if baia_impar_seguinte > 19:
                        continue
                    
                    # Construir posições físicas ímpares
                    posicao_fisica_1 = f"{baia}{baia_impar:02d}-{altura}"  # Ex: A01-1
                    posicao_fisica_2 = f"{baia}{baia_impar_seguinte:02d}-{altura}"  # Ex: A03-1
                    
                    # Verificar se ambas as posições físicas existem no arquivo de configuração
                    if not (self.validar_posicao_existe(posicao_fisica_1) and self.validar_posicao_existe(posicao_fisica_2)):
                        continue
                    
                    # Verificar se ambas as posições físicas são adequadas para o status
                    if not (self.validar_condicao_container(posicao_fisica_1, status_container) and 
                            self.validar_condicao_container(posicao_fisica_2, status_container)):
                        continue
                    
                    # Verificar se ambas as posições físicas estão livres
                    fisica_1_livre = not self.verificar_posicao_ocupada(posicao_fisica_1, db_connection)
                    fisica_2_livre = not self.verificar_posicao_ocupada(posicao_fisica_2, db_connection)
                    
                    if fisica_1_livre and fisica_2_livre:
                        # Calcular posição lógica (posição par intermediária)
                        baia_logica = baia_impar + 1  # Ex: A01+A03 -> A02
                        posicao_logica = f"{baia}{baia_logica:02d}-{altura}"  # Ex: A02-1
                        
                        # 🔴 REGRA PONTE: Verificar se há suporte adequado para empilhamento
                        if altura > 1:
                            # Para altura > 1, verificar se há suporte adequado
                            if self._validar_suporte_40ft_ponte(baia, baia_impar, altura, db_connection):
                                posicoes_validas.append(posicao_logica)
                        else:
                            # Para altura 1, sempre válido se as posições físicas estão livres
                            posicoes_validas.append(posicao_logica)
        
        # Priorizar por altura (mais baixo primeiro), depois por baia
        def prioridade_40_teu(posicao: str) -> Tuple[int, str, int]:
            row, numero, altura = self.decompor_posicao(posicao)
            return (altura, row, numero)
        
        return sorted(posicoes_validas, key=prioridade_40_teu)
    
    def _validar_suporte_40ft_ponte(self, row: str, baia_numero: int, altura: int, db_connection) -> bool:
        """
        Verifica se há suporte adequado para empilhamento de container 40ft sobre dois containers 20ft adjacentes.
        
        Args:
            row (str): Letra da baia
            baia_numero (int): Número da baia
            altura (int): Altura da posição
            db_connection: Conexão com o banco de dados
            
        Returns:
            bool: True se há suporte adequado
        """
        # Verificar se há containers 20ft nas posições abaixo
        posicao_abaixo_esquerda = f"{row}{baia_numero:02d}-{altura-1}"
        posicao_abaixo_direita = f"{row}{baia_numero+1:02d}-{altura-1}"
        
        # Verificar se as posições abaixo existem e estão ocupadas
        if not self.validar_posicao_existe(posicao_abaixo_esquerda) or not self.validar_posicao_existe(posicao_abaixo_direita):
            return False
        
        # Verificar se as posições abaixo estão ocupadas por containers 20ft
        cursor = db_connection.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM containers 
            WHERE posicao_atual = ? AND tamanho = '20'
        ''', (posicao_abaixo_esquerda,))
        
        count_esquerda = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM containers 
            WHERE posicao_atual = ? AND tamanho = '20'
        ''', (posicao_abaixo_direita,))
        
        count_direita = cursor.fetchone()[0]
        
        return count_esquerda > 0 and count_direita > 0
    
    def verificar_posicao_ocupada(self, posicao: str, db_connection) -> bool:
        """
        Verifica se uma posição está ocupada por algum container no banco de dados.
{{ ... }}
{{ ... }}
        
        Args:
            posicao (str): Posição a verificar no formato A01-1
            db_connection: Conexão com o banco de dados
            
        Returns:
            bool: True se a posição estiver ocupada, False caso contrário
        """
        if not db_connection:
            return False
            
        cursor = db_connection.cursor()
        cursor.execute('SELECT COUNT(*) FROM containers WHERE posicao_atual = ?', (posicao,))
        count = cursor.fetchone()[0]
        return count > 0
    
    def verificar_container_flutuante(self, posicao: str, db_connection=None) -> Dict:
        """
        Verifica se um container seria flutuante na posição especificada.
        Um container é flutuante se estiver em uma altura > 1 sem ter um container abaixo.
        
        Args:
            posicao (str): Posição a verificar
            db_connection: Conexão com o banco de dados
            
        Returns:
            Dict: Resultado da verificação
        """
        resultado = {
            'flutuante': False,
            'mensagem': '',
            'posicoes_necessarias': [],
            'posicoes_vazias': []
        }
        try:
            baia, posicao_numero, altura = self.decompor_posicao(posicao)
            
            # Um container na altura 1 nunca é flutuante
            if altura == 1:
                resultado['mensagem'] = "Container na altura 1 não é flutuante"
                return resultado
            
            # Para alturas > 1, precisamos verificar se existem containers nas posições abaixo
            posicoes_base = []
            posicoes_vazias = []
            
            for a in range(1, altura):
                pos_abaixo = f"{baia}{posicao_numero:02d}-{a}"
                posicoes_base.append(pos_abaixo)
                
                # Se não temos acesso ao banco de dados, apenas indicar que precisamos verificar
                if db_connection is None:
                    resultado['flutuante'] = True
                    resultado['mensagem'] = f"Container seria flutuante na altura {altura}. Verificar posição {pos_abaixo}"
                    continue
                
                # Se temos acesso ao banco, verificar se há um container na posição
                cursor = db_connection.cursor()
                cursor.execute('''
                    SELECT COUNT(*) FROM containers 
                    WHERE posicao_atual = ?
                ''', (pos_abaixo,))
                
                count = cursor.fetchone()[0]
                if count == 0:
                    posicoes_vazias.append(pos_abaixo)
                    resultado['flutuante'] = True
                    resultado['mensagem'] = f"Container seria flutuante na altura {altura}. Posição {pos_abaixo} está vazia"
            
            # Adicionar detalhes
            resultado['posicoes_necessarias'] = posicoes_base
            resultado['posicoes_vazias'] = posicoes_vazias
            
            if not resultado['flutuante']:
                resultado['mensagem'] = f"Container na posição {posicao} não é flutuante"
                
        except Exception as e:
            resultado['flutuante'] = True  # Por precaução
            resultado['mensagem'] = f"Erro ao verificar container flutuante: {str(e)}"
            logger.error(f"Erro ao verificar container flutuante: {e}")
            
        return resultado

    def verificar_impacto_remocao_container(self, posicao_origem: str, db_connection=None) -> Dict:
        """
        Verifica se a remoção de um container de uma posição causará containers flutuantes.
        
        Args:
            posicao_origem (str): Posição de onde o container será removido
            db_connection: Conexão com o banco de dados
            
        Returns:
            Dict: Resultado da verificação com containers que ficarão flutuantes
        """
        resultado = {
            'causara_flutuantes': False,
            'mensagem': '',
            'containers_afetados': [],
            'posicoes_afetadas': []
        }
        
        if db_connection is None:
            resultado['mensagem'] = "Conexão com banco necessária para verificar impacto"
            return resultado
        
        try:
            baia, posicao_numero, altura = self.decompor_posicao(posicao_origem)
            cursor = db_connection.cursor()
            
            # Verificar se há containers nas alturas superiores da mesma posição
            # que dependem deste container como suporte
            containers_dependentes = []
            
            for altura_superior in range(altura + 1, 6):  # Verificar alturas 2-5
                pos_superior = f"{baia}{posicao_numero:02d}-{altura_superior}"
                
                # Verificar se existe container nesta posição superior
                cursor.execute('''
                    SELECT numero FROM containers 
                    WHERE posicao_atual = ? AND status = 'no patio'
                ''', (pos_superior,))
                
                container_superior = cursor.fetchone()
                if container_superior:
                    # Verificar se este container ficará flutuante após a remoção
                    # Simular a remoção temporariamente
                    resultado_flutuante = self.verificar_container_flutuante_sem_posicao(
                        pos_superior, posicao_origem, db_connection
                    )
                    
                    if resultado_flutuante['flutuante']:
                        containers_dependentes.append({
                            'numero': container_superior[0],
                            'posicao': pos_superior,
                            'motivo': f"Ficará flutuante sem suporte em {posicao_origem}"
                        })
            
            if containers_dependentes:
                resultado['causara_flutuantes'] = True
                resultado['containers_afetados'] = containers_dependentes
                resultado['posicoes_afetadas'] = [c['posicao'] for c in containers_dependentes]
                
                containers_str = ', '.join([f"{c['numero']} ({c['posicao']})" for c in containers_dependentes])
                resultado['mensagem'] = f"Remoção de container em {posicao_origem} causará containers flutuantes: {containers_str}"
            else:
                resultado['mensagem'] = f"Remoção de container em {posicao_origem} não causará containers flutuantes"
                
        except Exception as e:
            resultado['causara_flutuantes'] = True  # Por precaução
            resultado['mensagem'] = f"Erro ao verificar impacto da remoção: {str(e)}"
            logger.error(f"Erro ao verificar impacto da remoção: {e}")
        
        return resultado
    
    def verificar_container_flutuante_sem_posicao(self, posicao: str, posicao_ignorar: str, db_connection=None) -> Dict:
        """
        Verifica se um container seria flutuante ignorando uma posição específica.
        Usado para simular a remoção de um container.
        
        Args:
            posicao (str): Posição a verificar
            posicao_ignorar (str): Posição a ignorar (simular como vazia)
            db_connection: Conexão com o banco de dados
            
        Returns:
            Dict: Resultado da verificação
        """
        resultado = {
            'flutuante': False,
            'mensagem': '',
            'posicoes_necessarias': [],
            'posicoes_vazias': []
        }
        
        try:
            baia, posicao_numero, altura = self.decompor_posicao(posicao)
            
            # Um container na altura 1 nunca é flutuante
            if altura == 1:
                resultado['mensagem'] = "Container na altura 1 não é flutuante"
                return resultado
            
            # Para alturas > 1, verificar se existem containers nas posições abaixo
            posicoes_base = []
            posicoes_vazias = []
            
            for a in range(1, altura):
                pos_abaixo = f"{baia}{posicao_numero:02d}-{a}"
                posicoes_base.append(pos_abaixo)
                
                # Se esta é a posição a ignorar, considerar como vazia
                if pos_abaixo == posicao_ignorar:
                    posicoes_vazias.append(pos_abaixo)
                    resultado['flutuante'] = True
                    resultado['mensagem'] = f"Container seria flutuante na altura {altura}. Posição {pos_abaixo} será removida"
                    continue
                
                if db_connection is None:
                    continue
                
                # Verificar se há um container na posição
                cursor = db_connection.cursor()
                cursor.execute('''
                    SELECT COUNT(*) FROM containers 
                    WHERE posicao_atual = ? AND status = 'no patio'
                ''', (pos_abaixo,))
                
                count = cursor.fetchone()[0]
                if count == 0:
                    posicoes_vazias.append(pos_abaixo)
                    resultado['flutuante'] = True
                    resultado['mensagem'] = f"Container seria flutuante na altura {altura}. Posição {pos_abaixo} está vazia"
            
            # Adicionar detalhes
            resultado['posicoes_necessarias'] = posicoes_base
            resultado['posicoes_vazias'] = posicoes_vazias
            
            if not resultado['flutuante']:
                resultado['mensagem'] = f"Container na posição {posicao} não é flutuante"
                
        except Exception as e:
            resultado['flutuante'] = True  # Por precaução
            resultado['mensagem'] = f"Erro ao verificar container flutuante: {str(e)}"
            logger.error(f"Erro ao verificar container flutuante: {e}")
            
        return resultado
    
    def validar_movimentacao(self, posicao_origem: str, posicao_destino: str, status_container: str, db_connection=None, tamanho_teu: int = 20) -> Dict:
        """
        Valida uma operação de movimentação de container considerando o impacto da remoção.
        
        Args:
            posicao_origem (str): Posição atual do container
            posicao_destino (str): Posição de destino
            status_container (str): Status do container
            db_connection: Conexão com o banco de dados
            tamanho_teu (int): Tamanho do container em TEUs
            
        Returns:
            Dict: Resultado da validação
        """
        resultado = {
            'valido': False,
            'mensagem': '',
            'detalhes': {},
            'sugestoes': []
        }
        
        try:
            # 1. Validar se a posição de destino é válida
            validacao_destino = self.validar_operacao(posicao_destino, status_container, db_connection, tamanho_teu)
            
            if not validacao_destino['valido']:
                resultado['mensagem'] = f"Posição de destino inválida: {validacao_destino['mensagem']}"
                resultado['detalhes']['erro_destino'] = validacao_destino
                return resultado
            
            # 2. Verificar se a remoção da posição de origem causará containers flutuantes
            if db_connection:
                impacto_remocao = self.verificar_impacto_remocao_container(posicao_origem, db_connection)
                
                if impacto_remocao['causara_flutuantes']:
                    resultado['mensagem'] = f"Movimentação inválida: {impacto_remocao['mensagem']}"
                    resultado['detalhes']['impacto_remocao'] = impacto_remocao
                    resultado['detalhes']['containers_afetados'] = impacto_remocao['containers_afetados']
                    
                    # Sugerir soluções
                    resultado['sugestoes'] = [
                        "Mova primeiro os containers das alturas superiores",
                        "Escolha uma posição de destino que não deixe containers flutuantes",
                        f"Containers afetados: {', '.join([c['numero'] for c in impacto_remocao['containers_afetados']])}"
                    ]
                    return resultado
            
            # 3. Se chegou até aqui, a movimentação é válida
            resultado['valido'] = True
            resultado['mensagem'] = f"Movimentação válida de {posicao_origem} para {posicao_destino}"
            resultado['detalhes']['validacao_destino'] = validacao_destino
            
            if db_connection:
                resultado['detalhes']['impacto_remocao'] = impacto_remocao
            
        except Exception as e:
            resultado['mensagem'] = f"Erro na validação de movimentação: {str(e)}"
            logger.error(f"Erro na validação de movimentação: {e}")
        
        return resultado
    
    def validar_operacao(self, posicao: str, status_container: str, db_connection=None, tamanho_teu: int = 20) -> Dict:
        """
        Valida uma operação de posicionamento de container.
        
        Args:
            posicao (str): Posição desejada no formato A01-1
            status_container (str): Status do container
            db_connection: Conexão com o banco de dados (opcional, para verificar containers flutuantes)
            tamanho_teu (int): Tamanho do container em TEUs (20 ou 40)
            
        Returns:
            Dict: Resultado da validação com detalhes
        """
        resultado = {
            'valido': False,
            'mensagem': '',
            'detalhes': {},
            'sugestoes': []
        }
        
        try:
            # Normalizar o status do container
            status_container = status_container.strip().upper()
            
            # Validar formato da posição primeiro
            if not self.validar_formato_a01_1(posicao):
                resultado['mensagem'] = f"Formato inválido: {posicao}. Use o formato A01-1 (ex: A01-1, B15-3)"
                resultado['sugestoes'] = self.sugerir_posicoes_para_container(status_container)[:5]
                return resultado
            
            # Validar se a posição existe
            if not self.validar_posicao_existe(posicao):
                resultado['mensagem'] = f"Posição {posicao} não existe no pátio de Suzano"
                resultado['sugestoes'] = self.sugerir_posicoes_para_container(status_container)[:5]
                return resultado
            
            # Validar tamanho do container (20 ou 40 TEUs) com a paridade da posição
            baia, posicao_numero, altura = self.decompor_posicao(posicao)
        
            # 🔴 LÓGICA CORRIGIDA: Para containers de 40 TEUs, verificar 2 baias consecutivas
            if tamanho_teu == 40:
                # NOVA REGRA: Container de 40 TEUs ocupa 2 baias consecutivas (N e N+1)
                if posicao_numero > 19:  # Baia 20 não pode iniciar container 40ft
                    resultado['valido'] = False
                    resultado['mensagem'] = f"Container de 40 TEUs não pode ser posicionado na baia {posicao_numero}. Baias válidas para início: 1-19"
                    resultado['sugestoes'] = self.sugerir_posicoes_40_teu_livres(status_container, db_connection)[:5]
                    return resultado
                
                baia_inicial = posicao  # Posição atual
                baia_final = f"{baia}{posicao_numero+1:02d}-{altura}"  # Próxima baia consecutiva
                
                # Verificar se a segunda baia existe
                if not self.validar_posicao_existe(baia_final):
                    resultado['valido'] = False
                    resultado['mensagem'] = f"Container de 40 TEUs em {posicao} requer posição {baia_final} que não existe"
                    resultado['sugestoes'] = self.sugerir_posicoes_40_teu_livres(status_container, db_connection)[:5]
                    return resultado
                
                posicoes_ocupadas_conflito = []
                
                if db_connection:
                    # Verificar se a posição inicial está livre
                    if self.verificar_posicao_ocupada(baia_inicial, db_connection):
                        posicoes_ocupadas_conflito.append(baia_inicial)
                    
                    # Verificar se a posição final está livre
                    if self.verificar_posicao_ocupada(baia_final, db_connection):
                        posicoes_ocupadas_conflito.append(baia_final)
                    
                    # Se há conflitos, rejeitar operação
                    if posicoes_ocupadas_conflito:
                        resultado['valido'] = False
                        conflitos_str = ', '.join(posicoes_ocupadas_conflito)
                        resultado['mensagem'] = f"Container de 40 TEUs não pode ser posicionado. Posições ocupadas: {conflitos_str}"
                        
                        # Sugerir apenas posições onde container 40 TEU pode ser colocado
                        resultado['sugestoes'] = self.sugerir_posicoes_40_teu_livres(status_container, db_connection)[:5]
                        return resultado
                    
                    # Registrar posições que serão ocupadas
                    resultado['detalhes']['posicoes_ocupadas'] = [baia_inicial, baia_final]
            
            # 🔴 LÓGICA CORRIGIDA: Para containers de 20 TEUs, verificar se a posição não está ocupada por container 40 TEU
            if tamanho_teu == 20:
                if db_connection:
                    cursor = db_connection.cursor()
                    
                    # NOVA REGRA: Container 40ft ocupa 2 baias consecutivas (N e N+1)
                    # Verificar se esta posição está sendo ocupada por algum container 40ft
                    
                    posicoes_40_teu_que_bloqueiam = []
                    
                    # Verificar se há um container 40 TEU que inicia na posição anterior (ocuparia esta posição)
                    if posicao_numero > 1:
                        pos_anterior = f"{baia}{posicao_numero-1:02d}-{altura}"
                        cursor.execute(
                            'SELECT numero, tamanho FROM containers WHERE posicao_atual = ? AND tamanho = 40',
                            (pos_anterior,)
                        )
                        container_40_anterior = cursor.fetchone()
                        if container_40_anterior:
                            # Container 40ft em posição anterior ocupa esta posição também
                            posicoes_40_teu_que_bloqueiam.append(pos_anterior)
                    
                    # Verificar se esta posição já está ocupada diretamente
                    cursor.execute(
                        'SELECT numero, tamanho FROM containers WHERE posicao_atual = ? AND tamanho = 40',
                        (posicao,)
                    )
                    container_40_atual = cursor.fetchone()
                    if container_40_atual:
                        posicoes_40_teu_que_bloqueiam.append(posicao)
                    
                    # Se há containers 40 TEU ocupando esta posição, rejeitar
                    if posicoes_40_teu_que_bloqueiam:
                        resultado['valido'] = False
                        bloqueios_str = ', '.join(posicoes_40_teu_que_bloqueiam)
                        resultado['mensagem'] = f"Posição {posicao} está ocupada por container(s) de 40 TEU iniciado(s) em: {bloqueios_str}"
                        resultado['sugestoes'] = self.sugerir_posicoes_para_container(status_container)[:5]
                        return resultado
            
            # Verificar a condição da posição
            if not self.validar_condicao_container(posicao, status_container):
                condicao = self.posicoes_disponiveis.get(posicao)
                
                if condicao == "VAZIO" and status_container == "CHEIO":
                    resultado['mensagem'] = f"Posição {posicao} só aceita containers VAZIO"
                else:
                    resultado['mensagem'] = f"Posição {posicao} não aceita containers {status_container}"
                
                # Sugerir posições válidas para esse status
                resultado['sugestoes'] = self.sugerir_posicoes_para_container(status_container)[:5]
                return resultado
            
            # Verificar se seria um container flutuante
            verificacao_flutuante = self.verificar_container_flutuante(posicao, db_connection)
            if verificacao_flutuante['flutuante']:
                resultado['valido'] = False
                resultado['mensagem'] = verificacao_flutuante['mensagem']
                resultado['detalhes']['posicoes_necessarias'] = verificacao_flutuante.get('posicoes_necessarias', [])
                resultado['detalhes']['posicoes_vazias'] = verificacao_flutuante.get('posicoes_vazias', [])
                
                # Sugerir posições na altura 1 ou onde não haja problema de container flutuante
                sugestoes = []
                for sugestao in self.sugerir_posicoes_para_container(status_container):
                    _, _, altura_sugestao = self.decompor_posicao(sugestao)
                    if altura_sugestao == 1:
                        sugestoes.append(sugestao)
                    if len(sugestoes) >= 5:
                        break
                    
                resultado['sugestoes'] = sugestoes
                return resultado
            
            # Tudo OK
            resultado['valido'] = True
            resultado['mensagem'] = f"Container {status_container} pode ser posicionado em {posicao}"
            
            # Adicionar detalhes da posição
            baia, pos_num, altura = self.decompor_posicao(posicao)
            resultado['detalhes'] = {
                'baia': baia,
                'posicao_numero': pos_num,
                'altura': altura,
                'condicao_posicao': self.posicoes_disponiveis[posicao]
            }
            
        except Exception as e:
            resultado['mensagem'] = f"Erro na validação: {str(e)}"
            logger.error(f"Erro na validação de operação: {e}")
        
        return resultado


# Instância global para uso na aplicação
patio_suzano = PatioSuzano()


def validar_posicao_container(posicao: str, status_container: str) -> bool:
    """
    Função de conveniência para validação rápida.
    
    Args:
        posicao (str): Posição desejada no formato A01-1
        status_container (str): Status do container
        
    Returns:
        bool: True se válido
    """
    return patio_suzano.validar_condicao_container(posicao, status_container)


def obter_posicoes_disponiveis(status_container: str) -> List[str]:
    """
    Função de conveniência para obter posições disponíveis.
    
    Args:
        status_container (str): Status do container
        
    Returns:
        List[str]: Posições disponíveis no formato A01-1
    """
    return patio_suzano.obter_posicoes_disponiveis_para_status(status_container)


if __name__ == "__main__":
    # Teste do módulo
    print("=== TESTE DO MÓDULO PÁTIO SUZANO ===")
    print("🔧 Sistema configurado para usar padrão A01-1")
    
    # Estatísticas
    stats = patio_suzano.obter_estatisticas_patio()
    print(f"\n📊 Estatísticas do Pátio:")
    print(f"   Total de posições: {stats['total_posicoes']}")
    print(f"   Posições CHEIO/VAZIO: {stats['posicoes_cheio_vazio']}")
    print(f"   Posições apenas VAZIO: {stats['posicoes_apenas_vazio']}")
    print(f"   Baias: {', '.join(stats['baias_disponiveis'])}")
    print(f"   Alturas: {', '.join(stats['alturas_disponiveis'])}")
    
    # Testes de validação com formato A01-1
    print(f"\n🧪 Testes de Validação (formato A01-1):")
    
    testes = [
        ("A01-1", "CHEIO"),   # Deve ser válido
        ("A01-1", "VAZIO"),   # Deve ser válido
        ("B05-2", "CHEIO"),   # Teste posição específica
        ("A12-1", "CHEIO"),   # Teste da posição do erro original
        ("X99-9", "CHEIO"),   # Posição inexistente
    ]
    
    for posicao, status in testes:
        resultado = patio_suzano.validar_operacao(posicao, status)
        print(f"   {posicao} + {status}: {'✅' if resultado['valido'] else '❌'} - {resultado['mensagem']}")
    
    # Sugestões
    print(f"\n💡 Sugestões para container CHEIO (formato A01-1):")
    sugestoes = patio_suzano.sugerir_posicoes_para_container("CHEIO")[:10]
    print(f"   {', '.join(sugestoes)}")
    
    print(f"\n💡 Sugestões para container VAZIO (formato A01-1):")
    sugestoes = patio_suzano.sugerir_posicoes_para_container("VAZIO")[:10]
    print(f"   {', '.join(sugestoes)}")
    
    # Teste específico do erro original
    print(f"\n🔍 Teste específico da posição A12-1:")
    resultado = patio_suzano.validar_operacao("A12-1", "CHEIO")
    print(f"   Resultado: {'✅' if resultado['valido'] else '❌'}")
    print(f"   Mensagem: {resultado['mensagem']}")
    if resultado['sugestoes']:
        print(f"   Sugestões: {', '.join(resultado['sugestoes'][:3])}")