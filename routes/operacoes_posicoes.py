from flask import Blueprint, jsonify, request
import logging
from db import get_db
from posicoes_suzano import patio_suzano

logger = logging.getLogger(__name__)

bp_posicoes_mov = Blueprint('posicoes_mov', __name__)

@bp_posicoes_mov.route('/operacoes/posicoes/movimentacao/<string:container_numero>')
def get_posicoes_para_movimentacao(container_numero):
    """Retorna posições válidas para movimentação do container informado.
    
    🔄 VERSÃO ATUALIZADA: Usa a mesma lógica robusta da API de descarga
    - Exclui posição atual do container
    - Aplica regras de bloqueio para containers 40ft
    - Valida base de apoio (containers não flutuantes)
    - Garante consistência com a API /api/posicoes/disponiveis
    """
    try:
        logger.info(f"Buscando posições para movimentação do container {container_numero}")
        
        db = get_db()
        cursor = db.cursor()

        # Obter dados do container
        cursor.execute("SELECT posicao_atual, status, unidade, tamanho FROM containers WHERE numero = ?", (container_numero,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Container não encontrado"}), 404

        posicao_atual, status_container, unidade, tamanho_container = row
        unidade = unidade or 'SUZANO'
        status_container = status_container or 'CHEIO'
        container_size = int(tamanho_container) if tamanho_container else 20

        logger.info(f"Container {container_numero}: posição atual={posicao_atual}, status={status_container}, tamanho={container_size}ft")

        if unidade.upper() != 'SUZANO':
            return jsonify({"success": False, "error": f'Unidade {unidade} não suportada'}), 400

        # 🔄 USAR A MESMA LÓGICA DA API DE DESCARGA
        # Importar funções da API de posições disponíveis
        from routes.posicoes import _pode_colocar_container, _tem_base_de_apoio
        
        # Normalizar unidade (mesmo padrão da API de descarga)
        unidade_normalizada = 'Suzano' if unidade.upper() == 'SUZANO' else unidade
        
        # Obter todas as posições do pátio
        posicoes = patio_suzano.sugerir_posicoes_para_container(status_container)
        
        # Buscar containers no pátio (mesma lógica da API de descarga)
        cursor.execute(
            'SELECT posicao_atual, tamanho FROM containers WHERE status = "no patio" AND unidade = ? AND posicao_atual IS NOT NULL',
            (unidade_normalizada,)
        )
        containers_no_patio = cursor.fetchall()
        
        # Criar dicionário de posições ocupadas com detalhes (incluindo bloqueios)
        posicoes_ocupadas_detalhadas = {}
        
        for posicao, tamanho in containers_no_patio:
            posicoes_ocupadas_detalhadas[posicao] = {
                'tamanho': tamanho,
                'status': 'ocupada'
            }
            
            # Se container 40ft, bloquear posições adjacentes
            if tamanho == '40':
                try:
                    baia_letra = posicao[0]
                    partes = posicao[1:].split('-')
                    baia_numero = int(partes[0])
                    altura = int(partes[1])
                    
                    # Container 40ft em posição par bloqueia duas posições ímpares adjacentes
                    if baia_numero % 2 == 0:
                        pos_impar_1 = f"{baia_letra}{baia_numero-1:02d}-{altura}"
                        pos_impar_2 = f"{baia_letra}{baia_numero+1:02d}-{altura}"
                        
                        posicoes_ocupadas_detalhadas[pos_impar_1] = {
                            'tamanho': '20',
                            'status': 'bloqueada',
                            'bloqueada_por': posicao
                        }
                        
                        posicoes_ocupadas_detalhadas[pos_impar_2] = {
                            'tamanho': '20',
                            'status': 'bloqueada', 
                            'bloqueada_por': posicao
                        }
                        
                        logger.debug(f"Container 40ft {posicao} bloqueia {pos_impar_1} e {pos_impar_2}")
                        
                except Exception as e:
                    logger.error(f"Erro ao processar posição de container 40ft {posicao}: {e}")
        
        logger.info(f"Encontrados {len(containers_no_patio)} containers no pátio, {len(posicoes_ocupadas_detalhadas)} posições ocupadas/bloqueadas")
        
        # Filtrar posições disponíveis aplicando todas as regras
        posicoes_disponiveis = []
        
        for posicao in posicoes:
            # Excluir posição atual do container
            if posicao == posicao_atual:
                continue
                
            # Aplicar regras de ocupação e base de apoio
            if _pode_colocar_container(posicao, container_size, posicoes_ocupadas_detalhadas):
                # Verificar regra de base de apoio para alturas > 1
                if _tem_base_de_apoio(posicao, posicoes_ocupadas_detalhadas):
                    posicoes_disponiveis.append(posicao)
        
        logger.info(f"Posições disponíveis para movimentação: {len(posicoes_disponiveis)} para container {container_size}TEU")
        
        # Formatar resposta (manter compatibilidade com frontend)
        resposta = [{"codigo": p, "descricao": p} for p in posicoes_disponiveis]

        return jsonify({
            "success": True, 
            "posicoes": resposta,
            "container_atual": {
                "numero": container_numero,
                "posicao_atual": posicao_atual,
                "tamanho": container_size
            },
            "estatisticas": {
                "containers_no_patio": len(containers_no_patio),
                "posicoes_ocupadas_bloqueadas": len(posicoes_ocupadas_detalhadas),
                "posicoes_disponiveis": len(posicoes_disponiveis)
            }
        })

    except Exception as e:
        logger.exception(f"Erro ao buscar posições para movimentação do container {container_numero}")
        return jsonify({"success": False, "error": str(e)}), 500
