"""
Módulo para gerenciar as posições e validações do pátio de Floriano.
Este módulo controla onde containers podem ser posicionados baseado em suas condições (CHEIO/VAZIO).
"""

import os
import logging
from typing import Dict, List, Tuple, Optional, Set

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PatioFloriano:
    def __init__(self, arquivo_posicoes: str = None):
        """
        Inicializa o gerenciador do pátio de Floriano.
        
        Args:
            arquivo_posicoes (str): Caminho para o arquivo de posições. 
                                  Se None, usa o arquivo padrão.
        """
        if arquivo_posicoes is None:
            arquivo_posicoes = os.path.join(os.path.dirname(__file__), 'posicao_floriano.txt')
        
        self.arquivo_posicoes = arquivo_posicoes
        self.posicoes_disponiveis: Dict[str, str] = {}
        self.carregar_posicoes()
    
    def carregar_posicoes(self) -> None:
        """
        Carrega as posições disponíveis do arquivo de configuração.
        """
        try:
            with open(self.arquivo_posicoes, 'r', encoding='utf-8') as arquivo:
                linhas = arquivo.readlines()
                
            # Pular o cabeçalho
            for linha in linhas[1:]:
                linha = linha.strip()
                if linha and '\t' in linha:
                    posicao_raw, condicao = linha.split('\t', 1)
                    posicao_raw = posicao_raw.strip()
                    # Converter para formato A01-1 se necessário (ex: A011 -> A01-1)
                    if '-' not in posicao_raw and len(posicao_raw) == 4:
                        posicao_convertida = f"{posicao_raw[:3]}-{posicao_raw[3]}"
                        logger.debug(f"Convertida posição {posicao_raw} -> {posicao_convertida}")
                    else:
                        posicao_convertida = posicao_raw
                    self.posicoes_disponiveis[posicao_convertida] = condicao.strip()
            
            logger.info(f"Carregadas {len(self.posicoes_disponiveis)} posições do pátio de Floriano")
            
        except FileNotFoundError:
            logger.error(f"Arquivo de posições não encontrado: {self.arquivo_posicoes}")
            # Inicializar com conjunto vazio de posições em vez de lançar exceção
            self.posicoes_disponiveis = {}
        except Exception as e:
            logger.error(f"Erro ao carregar posições: {e}")
            raise
    
    def decompor_posicao(self, posicao: str) -> Tuple[str, int, int]:
        """
        Decompõe uma posição em seus componentes.
        
        Args:
            posicao (str): Posição no formato A01-1 (Baia + Posição + Altura)
            
        Returns:
            Tuple[str, int, int]: (baia, posicao_numero, altura)
            
        Example:
            A01-1 -> ('A', 1, 1)
            E20-5 -> ('E', 20, 5)
        """
        if len(posicao) != 5 or posicao[3] != '-':
            raise ValueError(f"Posição inválida: {posicao}. Formato esperado: A01-1")
        
        baia = posicao[0]
        posicao_numero = int(posicao[1:3])
        altura = int(posicao[4])
        
        return baia, posicao_numero, altura
    
    def compor_posicao(self, baia: str, posicao_numero: int, altura: int) -> str:
        """
        Compõe uma posição a partir de seus componentes.
        
        Args:
            baia (str): Letra da baia (A-E)
            posicao_numero (int): Número da posição (1-20)
            altura (int): Altura do empilhamento (1-5)
            
        Returns:
            str: Posição no formato A01-1
        """
        return f"{baia}{posicao_numero:02d}-{altura}"
    
    def validar_posicao_existe(self, posicao: str) -> bool:
        """
        Verifica se uma posição existe no pátio.
        
        Args:
            posicao (str): Posição a verificar
            
        Returns:
            bool: True se a posição existe
        """
        return posicao in self.posicoes_disponiveis
    
    def validar_condicao_container(self, posicao: str, status_container: str) -> bool:
        """
        Valida se um container com determinado status pode ser colocado em uma posição.
        
        Args:
            posicao (str): Posição desejada (ex: A01-1)
            status_container (str): Status do container ('CHEIO' ou 'VAZIO')
            
        Returns:
            bool: True se o container pode ser posicionado
        """
        # Verificar se a posição existe
        if not self.validar_posicao_existe(posicao):
            return False
        
        # Obter a condição da posição
        condicao_posicao = self.posicoes_disponiveis[posicao]
        
        # Normalizar status do container
        status_normalizado = status_container.upper().strip()
        
        # Verificar compatibilidade
        if condicao_posicao == "CHEIO / VAZIO":
            return status_normalizado in ["CHEIO", "VAZIO"]
        elif condicao_posicao == "VAZIO":
            return status_normalizado == "VAZIO"
        else:
            # Condição desconhecida
            logger.warning(f"Condição desconhecida para posição {posicao}: {condicao_posicao}")
            return False
    
    def obter_posicoes_disponiveis_para_status(self, status_container: str) -> List[str]:
        """
        Retorna todas as posições disponíveis para um determinado status de container.
        
        Args:
            status_container (str): Status do container ('CHEIO' ou 'VAZIO')
            
        Returns:
            List[str]: Lista de posições disponíveis
        """
        posicoes_validas = []
        status_normalizado = status_container.upper().strip()
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            if self.validar_condicao_container(posicao, status_normalizado):
                posicoes_validas.append(posicao)
        
        return sorted(posicoes_validas)
    
    def obter_posicoes_por_baia(self, baia: str) -> Dict[str, str]:
        """
        Retorna todas as posições de uma baia específica.
        
        Args:
            baia (str): Letra da baia (A-E)
            
        Returns:
            Dict[str, str]: Dicionário com posições e suas condições
        """
        posicoes_baia = {}
        baia_upper = baia.upper()
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            if posicao.startswith(baia_upper):
                posicoes_baia[posicao] = condicao
        
        return posicoes_baia
    
    def obter_posicoes_por_altura(self, altura: int) -> Dict[str, str]:
        """
        Retorna todas as posições de uma altura específica.
        
        Args:
            altura (int): Altura desejada (1-5)
            
        Returns:
            Dict[str, str]: Dicionário com posições e suas condições
        """
        posicoes_altura = {}
        
        for posicao, condicao in self.posicoes_disponiveis.items():
            if posicao.endswith(str(altura)):
                posicoes_altura[posicao] = condicao
        
        return posicoes_altura
    
    def obter_estatisticas_patio(self) -> Dict[str, any]:
        """
        Retorna estatísticas do pátio.
        
        Returns:
            Dict: Estatísticas do pátio
        """
        total_posicoes = len(self.posicoes_disponiveis)
        posicoes_cheio_vazio = sum(1 for c in self.posicoes_disponiveis.values() if c == "CHEIO / VAZIO")
        posicoes_apenas_vazio = sum(1 for c in self.posicoes_disponiveis.values() if c == "VAZIO")
        
        # Contar por baia
        baias = {}
        for posicao in self.posicoes_disponiveis.keys():
            baia = posicao[0]
            baias[baia] = baias.get(baia, 0) + 1
        
        # Contar por altura
        alturas = {}
        for posicao in self.posicoes_disponiveis.keys():
            altura = posicao[3]
            alturas[altura] = alturas.get(altura, 0) + 1
        
        return {
            'total_posicoes': total_posicoes,
            'posicoes_cheio_vazio': posicoes_cheio_vazio,
            'posicoes_apenas_vazio': posicoes_apenas_vazio,
            'posicoes_por_baia': baias,
            'posicoes_por_altura': alturas,
            'baias_disponiveis': sorted(baias.keys()),
            'alturas_disponiveis': sorted(alturas.keys())
        }
    
    def sugerir_posicoes_para_container(self, status_container: str, baia_preferida: str = None, 
                                      altura_maxima: int = None) -> List[str]:
        """
        Sugere posições adequadas para um container baseado em critérios.
        
        Args:
            status_container (str): Status do container ('CHEIO' ou 'VAZIO')
            baia_preferida (str): Baia preferida (opcional)
            altura_maxima (int): Altura máxima desejada (opcional)
            
        Returns:
            List[str]: Lista de posições sugeridas, ordenadas por prioridade
        """
        posicoes_validas = self.obter_posicoes_disponiveis_para_status(status_container)
        
        # Filtrar por baia preferida
        if baia_preferida:
            baia_upper = baia_preferida.upper()
            posicoes_validas = [p for p in posicoes_validas if p.startswith(baia_upper)]
        
        # Filtrar por altura máxima
        if altura_maxima:
            posicoes_validas = [p for p in posicoes_validas if int(p[3]) <= altura_maxima]
        
        # Ordenar por prioridade (menor altura primeiro, depois por baia)
        def prioridade_posicao(posicao: str) -> Tuple[int, str, int]:
            baia, pos_num, altura = self.decompor_posicao(posicao)
            return (altura, baia, pos_num)  # Priorizar alturas menores
        
        return sorted(posicoes_validas, key=prioridade_posicao)
    
    def verificar_container_flutuante(self, posicao: str, db_connection=None) -> Dict[str, any]:
        """
        Verifica se um container seria 'flutuante' na posição especificada.
        Um container é considerado flutuante se estiver em uma altura > 1 sem ter
        containers nas alturas inferiores.
        
        Args:
            posicao (str): Posição desejada (ex: A01-1)
            db_connection: Conexão com o banco de dados (opcional)
            
        Returns:
            Dict: Resultado da verificação com detalhes
        """
        resultado = {
            'valido': True,
            'mensagem': '',
            'posicoes_necessarias': []
        }
        
        try:
            # Decompor a posição para obter baia, posição e altura
            baia, pos_num, altura = self.decompor_posicao(posicao)
            
            # Se altura é 1, não há problema de container flutuante
            if altura == 1:
                return resultado
            
            # Verificar se existem containers nas alturas inferiores
            posicoes_necessarias = []
            for h in range(1, altura):
                posicao_inferior = self.compor_posicao(baia, pos_num, h)
                posicoes_necessarias.append(posicao_inferior)
            
            resultado['posicoes_necessarias'] = posicoes_necessarias
            
            # Se não temos conexão com o banco, apenas retornamos as posições necessárias
            if db_connection is None:
                resultado['mensagem'] = f"Verificação parcial: é necessário verificar se há containers nas posições {', '.join(posicoes_necessarias)}"
                return resultado
            
            # Verificar no banco de dados se todas as posições inferiores estão ocupadas
            cursor = db_connection.cursor()
            posicoes_vazias = []
            
            for pos in posicoes_necessarias:
                cursor.execute(
                    'SELECT COUNT(*) FROM containers WHERE posicao_atual = ? AND status = "no patio"', 
                    (pos,)
                )
                count = cursor.fetchone()[0]
                if count == 0:
                    posicoes_vazias.append(pos)
            
            if posicoes_vazias:
                resultado['valido'] = False
                resultado['mensagem'] = f"Container flutuante detectado! Não há containers nas posições: {', '.join(posicoes_vazias)}"
                resultado['posicoes_vazias'] = posicoes_vazias
        
        except Exception as e:
            logger.error(f"Erro ao verificar container flutuante: {str(e)}")
            resultado['valido'] = False
            resultado['mensagem'] = f"Erro ao verificar container flutuante: {str(e)}"
        
        return resultado

    def validar_operacao(self, posicao: str, status_container: str, db_connection=None) -> Dict[str, any]:
        """
        Valida uma operação de posicionamento de container.
        
        Args:
            posicao (str): Posição desejada
            status_container (str): Status do container
            db_connection: Conexão com o banco de dados (opcional, para verificar containers flutuantes)
            
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
            # Verificar se posição existe
            if not self.validar_posicao_existe(posicao):
                resultado['mensagem'] = f"Posição {posicao} não existe no pátio de Floriano"
                resultado['sugestoes'] = self.sugerir_posicoes_para_container(status_container)[:5]
                return resultado
            
            # Verificar compatibilidade de status
            if not self.validar_condicao_container(posicao, status_container):
                condicao = self.posicoes_disponiveis[posicao]
                resultado['mensagem'] = f"Container {status_container} não pode ser posicionado em {posicao}. Condição da posição: {condicao}"
                resultado['sugestoes'] = self.sugerir_posicoes_para_container(status_container)[:5]
                return resultado
            
            # Verificar se seria um container flutuante
            if db_connection is not None:
                verificacao_flutuante = self.verificar_container_flutuante(posicao, db_connection)
                if not verificacao_flutuante['valido']:
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
patio_floriano = PatioFloriano()


def validar_posicao_container(posicao: str, status_container: str) -> bool:
    """
    Função de conveniência para validação rápida.
    
    Args:
        posicao (str): Posição desejada
        status_container (str): Status do container
        
    Returns:
        bool: True se válido
    """
    return patio_floriano.validar_condicao_container(posicao, status_container)


def obter_posicoes_disponiveis(status_container: str) -> List[str]:
    """
    Função de conveniência para obter posições disponíveis.
    
    Args:
        status_container (str): Status do container
        
    Returns:
        List[str]: Posições disponíveis
    """
    return patio_floriano.obter_posicoes_disponiveis_para_status(status_container)


if __name__ == "__main__":
    # Teste do módulo
    print("=== TESTE DO MÓDULO PÁTIO FLORIANO ===")
    
    # Estatísticas
    stats = patio_floriano.obter_estatisticas_patio()
    print(f"\n📊 Estatísticas do Pátio:")
    print(f"   Total de posições: {stats['total_posicoes']}")
    print(f"   Posições CHEIO/VAZIO: {stats['posicoes_cheio_vazio']}")
    print(f"   Posições apenas VAZIO: {stats['posicoes_apenas_vazio']}")
    print(f"   Baias: {', '.join(stats['baias_disponiveis'])}")
    print(f"   Alturas: {', '.join(stats['alturas_disponiveis'])}")
    
    # Testes de validação
    print(f"\n🧪 Testes de Validação:")
    
    testes = [
        ("A01-1", "CHEIO"),   # Deve ser válido
        ("A01-1", "VAZIO"),   # Deve ser válido
        ("C01-4", "CHEIO"),   # Deve ser inválido (apenas VAZIO)
        ("C01-4", "VAZIO"),   # Deve ser válido
        ("X999", "CHEIO"),   # Posição inexistente
    ]
    
    for posicao, status in testes:
        resultado = patio_floriano.validar_operacao(posicao, status)
        print(f"   {posicao} + {status}: {'✅' if resultado['valido'] else '❌'} - {resultado['mensagem']}")
    
    # Sugestões
    print(f"\n💡 Sugestões para container CHEIO:")
    sugestoes = patio_floriano.sugerir_posicoes_para_container("CHEIO")[:10]
    print(f"   {', '.join(sugestoes)}")
    
    print(f"\n💡 Sugestões para container VAZIO:")
    sugestoes = patio_floriano.sugerir_posicoes_para_container("VAZIO")[:10]
    print(f"   {', '.join(sugestoes)}")
