from flask import Blueprint, jsonify
import logging
from db import get_db
from posicoes_suzano import patio_suzano

logger = logging.getLogger(__name__)

bp_posicoes_mov = Blueprint('posicoes_mov', __name__)

@bp_posicoes_mov.route('/operacoes/posicoes/movimentacao/<string:container_numero>')
def get_posicoes_para_movimentacao(container_numero):
    """Retorna posições válidas para movimentação do container informado.

    - Exclui posição atual do container
    - Filtra posições já ocupadas
    - Aplica regras de segurança de altura já implementadas em patio_suzano
    """
    try:
        db = get_db()
        cur = db.cursor()

        # Obter dados do container
        cur.execute("SELECT posicao_atual, status, unidade, tamanho FROM containers WHERE numero = ?", (container_numero,))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Container não encontrado"}), 404

        posicao_atual, status_container, unidade, tamanho_teu = row
        unidade = unidade or 'SUZANO'

        if unidade.upper() != 'SUZANO':
            return jsonify({"success": False, "error": f'Unidade {unidade} não suportada'}), 400

        # Sugerir posições levando em conta TEU e status
        try:
            teu = int(tamanho_teu or 20)
        except ValueError:
            teu = 20

        try:
            if teu == 40:
                posicoes_sugeridas = patio_suzano.sugerir_posicoes_40_teu_livres(status_container or 'CHEIO', db_connection=db)
            else:
                posicoes_sugeridas = patio_suzano.sugerir_posicoes_para_container(status_container or 'CHEIO')
        except Exception as e:
            logger.error(f'Erro ao obter sugestões de posições: {e}')
            posicoes_sugeridas = []

        # Posições já ocupadas
        cur.execute('SELECT posicao_atual FROM containers WHERE status = "no patio" AND unidade = ?', (unidade,))
        ocupadas = {r[0] for r in cur.fetchall() if r[0]}

        # Filtrar por ocupação e excluir posição atual
        posicoes_validas = [p for p in posicoes_sugeridas if p not in ocupadas and p != posicao_atual]

        # Formatar resposta
        resposta = [{"codigo": p, "descricao": p} for p in posicoes_validas]

        return jsonify({"success": True, "posicoes": resposta})

    except Exception as e:
        logger.exception("Erro ao buscar posições para movimentação")
        return jsonify({"success": False, "error": str(e)}), 500
