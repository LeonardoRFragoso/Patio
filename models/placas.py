"""
Modelo para gerenciamento de placas de caminhão
Substitui a dependência da planilha SharePoint/OneDrive
"""

import sqlite3
import logging
from datetime import datetime
from typing import List, Dict, Optional
from flask import g
from utils.db import get_db_connection

logger = logging.getLogger(__name__)

class PlacasModel:
    """Modelo para operações CRUD de placas de caminhão"""
    
    @staticmethod
    def criar_tabela():
        """Cria a tabela de placas se não existir"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS placas_caminhao (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    placa VARCHAR(10) NOT NULL UNIQUE,
                    ativa BOOLEAN DEFAULT 1,
                    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                    usuario_criacao VARCHAR(50),
                    observacoes TEXT
                )
            ''')
            
            # Criar índices para performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_placas_placa ON placas_caminhao(placa)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_placas_ativa ON placas_caminhao(ativa)')
            
            conn.commit()
            logger.info("Tabela placas_caminhao criada/verificada com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao criar tabela placas_caminhao: {e}")
            return False
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def listar_placas(apenas_ativas: bool = True) -> List[Dict]:
        """Lista todas as placas do banco"""
        conn = None
        try:
            conn = get_db_connection()
            if not conn:
                logger.error("Não foi possível obter conexão com o banco")
                return []
                
            cursor = conn.cursor()
            
            if apenas_ativas:
                cursor.execute('''
                    SELECT id, placa, ativa, data_criacao, data_atualizacao, 
                           usuario_criacao, observacoes
                    FROM placas_caminhao 
                    WHERE ativa = 1 
                    ORDER BY placa
                ''')
            else:
                cursor.execute('''
                    SELECT id, placa, ativa, data_criacao, data_atualizacao, 
                           usuario_criacao, observacoes
                    FROM placas_caminhao 
                    ORDER BY placa
                ''')
            
            placas = []
            rows = cursor.fetchall()
            for row in rows:
                placas.append({
                    'id': row[0],
                    'placa': row[1],
                    'ativa': bool(row[2]),
                    'data_criacao': row[3],
                    'data_atualizacao': row[4],
                    'usuario_criacao': row[5],
                    'observacoes': row[6]
                })
            
            logger.info(f"Listadas {len(placas)} placas do banco")
            return placas
            
        except Exception as e:
            logger.error(f"Erro ao listar placas: {e}")
            return []
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    @staticmethod
    def obter_placas_simples(apenas_ativas: bool = True) -> List[str]:
        """Retorna lista simples de placas (apenas strings) para comboboxes"""
        try:
            placas_completas = PlacasModel.listar_placas(apenas_ativas)
            return [placa['placa'] for placa in placas_completas]
        except Exception as e:
            logger.error(f"Erro ao obter placas simples: {e}")
            return []
    
    @staticmethod
    def adicionar_placa(placa: str, usuario_criacao: str = None, observacoes: str = None) -> Dict:
        """Adiciona uma nova placa"""
        try:
            # Normalizar placa
            placa_normalizada = placa.upper().strip()
            
            # Validar formato básico
            if not placa_normalizada or len(placa_normalizada) < 7:
                return {
                    'success': False,
                    'error': 'Placa deve ter pelo menos 7 caracteres'
                }
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Verificar se já existe
            cursor.execute('SELECT id FROM placas_caminhao WHERE placa = ?', (placa_normalizada,))
            if cursor.fetchone():
                return {
                    'success': False,
                    'error': f'Placa {placa_normalizada} já existe no sistema'
                }
            
            # Inserir nova placa
            cursor.execute('''
                INSERT INTO placas_caminhao (placa, usuario_criacao, observacoes)
                VALUES (?, ?, ?)
            ''', (placa_normalizada, usuario_criacao, observacoes))
            
            placa_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"Placa {placa_normalizada} adicionada com ID {placa_id}")
            return {
                'success': True,
                'id': placa_id,
                'placa': placa_normalizada,
                'message': f'Placa {placa_normalizada} adicionada com sucesso'
            }
            
        except sqlite3.IntegrityError as e:
            logger.error(f"Erro de integridade ao adicionar placa {placa}: {e}")
            return {
                'success': False,
                'error': f'Placa {placa} já existe no sistema'
            }
        except Exception as e:
            logger.error(f"Erro ao adicionar placa {placa}: {e}")
            return {
                'success': False,
                'error': f'Erro interno ao adicionar placa: {str(e)}'
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def editar_placa(placa_id: int, nova_placa: str = None, ativa: bool = None, 
                     observacoes: str = None, usuario_edicao: str = None) -> Dict:
        """Edita uma placa existente"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Verificar se placa existe
            cursor.execute('SELECT placa FROM placas_caminhao WHERE id = ?', (placa_id,))
            placa_atual = cursor.fetchone()
            if not placa_atual:
                return {
                    'success': False,
                    'error': f'Placa com ID {placa_id} não encontrada'
                }
            
            # Preparar campos para atualização
            campos_update = []
            valores = []
            
            if nova_placa:
                nova_placa_normalizada = nova_placa.upper().strip()
                # Verificar se nova placa já existe (exceto a atual)
                cursor.execute('SELECT id FROM placas_caminhao WHERE placa = ? AND id != ?', 
                             (nova_placa_normalizada, placa_id))
                if cursor.fetchone():
                    return {
                        'success': False,
                        'error': f'Placa {nova_placa_normalizada} já existe no sistema'
                    }
                campos_update.append('placa = ?')
                valores.append(nova_placa_normalizada)
            
            if ativa is not None:
                campos_update.append('ativa = ?')
                valores.append(1 if ativa else 0)
            
            if observacoes is not None:
                campos_update.append('observacoes = ?')
                valores.append(observacoes)
            
            # Sempre atualizar data_atualizacao
            campos_update.append('data_atualizacao = CURRENT_TIMESTAMP')
            
            if not campos_update:
                return {
                    'success': False,
                    'error': 'Nenhum campo fornecido para atualização'
                }
            
            # Executar update
            valores.append(placa_id)
            query = f'UPDATE placas_caminhao SET {", ".join(campos_update)} WHERE id = ?'
            cursor.execute(query, valores)
            conn.commit()
            
            logger.info(f"Placa ID {placa_id} editada com sucesso")
            return {
                'success': True,
                'id': placa_id,
                'message': f'Placa editada com sucesso'
            }
            
        except sqlite3.IntegrityError as e:
            logger.error(f"Erro de integridade ao editar placa {placa_id}: {e}")
            return {
                'success': False,
                'error': 'Placa já existe no sistema'
            }
        except Exception as e:
            logger.error(f"Erro ao editar placa {placa_id}: {e}")
            return {
                'success': False,
                'error': f'Erro interno ao editar placa: {str(e)}'
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def excluir_placa(placa_id: int, exclusao_logica: bool = True) -> Dict:
        """Exclui uma placa (lógica ou física)"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Verificar se placa existe
            cursor.execute('SELECT placa FROM placas_caminhao WHERE id = ?', (placa_id,))
            placa_atual = cursor.fetchone()
            if not placa_atual:
                return {
                    'success': False,
                    'error': f'Placa com ID {placa_id} não encontrada'
                }
            
            if exclusao_logica:
                # Exclusão lógica - marcar como inativa
                cursor.execute('''
                    UPDATE placas_caminhao 
                    SET ativa = 0, data_atualizacao = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ''', (placa_id,))
                action = 'desativada'
            else:
                # Exclusão física - remover do banco
                cursor.execute('DELETE FROM placas_caminhao WHERE id = ?', (placa_id,))
                action = 'excluída'
            
            conn.commit()
            
            logger.info(f"Placa {placa_atual[0]} (ID {placa_id}) {action} com sucesso")
            return {
                'success': True,
                'id': placa_id,
                'placa': placa_atual[0],
                'message': f'Placa {placa_atual[0]} {action} com sucesso'
            }
            
        except Exception as e:
            logger.error(f"Erro ao excluir placa {placa_id}: {e}")
            return {
                'success': False,
                'error': f'Erro interno ao excluir placa: {str(e)}'
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def buscar_placas(termo: str, apenas_ativas: bool = True) -> List[Dict]:
        """Busca placas por termo"""
        try:
            if not termo or len(termo.strip()) == 0:
                return PlacasModel.listar_placas(apenas_ativas)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            termo_busca = f"%{termo.upper().strip()}%"
            
            if apenas_ativas:
                cursor.execute('''
                    SELECT id, placa, ativa, data_criacao, data_atualizacao, 
                           usuario_criacao, observacoes
                    FROM placas_caminhao 
                    WHERE ativa = 1 AND placa LIKE ?
                    ORDER BY placa
                ''', (termo_busca,))
            else:
                cursor.execute('''
                    SELECT id, placa, ativa, data_criacao, data_atualizacao, 
                           usuario_criacao, observacoes
                    FROM placas_caminhao 
                    WHERE placa LIKE ?
                    ORDER BY placa
                ''', (termo_busca,))
            
            placas = []
            for row in cursor.fetchall():
                placas.append({
                    'id': row[0],
                    'placa': row[1],
                    'ativa': bool(row[2]),
                    'data_criacao': row[3],
                    'data_atualizacao': row[4],
                    'usuario_criacao': row[5],
                    'observacoes': row[6]
                })
            
            logger.info(f"Encontradas {len(placas)} placas para termo '{termo}'")
            return placas
            
        except Exception as e:
            logger.error(f"Erro ao buscar placas com termo '{termo}': {e}")
            return []
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def popular_placas_iniciais(placas_lista: List[str], usuario_criacao: str = "sistema") -> Dict:
        """Popula a tabela com placas iniciais"""
        conn = None
        try:
            conn = get_db_connection()
            if not conn:
                logger.error("Não foi possível obter conexão com o banco")
                return {
                    'success': False,
                    'error': 'Erro de conexão com o banco de dados'
                }
                
            cursor = conn.cursor()
            
            placas_adicionadas = 0
            placas_existentes = 0
            erros = []
            
            for placa in placas_lista:
                placa_normalizada = placa.upper().strip()
                if not placa_normalizada:
                    continue
                
                try:
                    # Verificar se já existe
                    cursor.execute('SELECT id FROM placas_caminhao WHERE placa = ?', (placa_normalizada,))
                    if cursor.fetchone():
                        placas_existentes += 1
                        continue
                    
                    # Inserir nova placa
                    cursor.execute('''
                        INSERT INTO placas_caminhao (placa, usuario_criacao, observacoes)
                        VALUES (?, ?, ?)
                    ''', (placa_normalizada, usuario_criacao, "Carga inicial do sistema"))
                    
                    placas_adicionadas += 1
                    
                except Exception as e:
                    erros.append(f"Erro ao adicionar {placa_normalizada}: {str(e)}")
                    logger.error(f"Erro ao adicionar placa {placa_normalizada}: {e}")
            
            conn.commit()
            
            logger.info(f"Carga inicial: {placas_adicionadas} placas adicionadas, {placas_existentes} já existiam")
            
            return {
                'success': True,
                'placas_adicionadas': placas_adicionadas,
                'placas_existentes': placas_existentes,
                'erros': erros,
                'message': f'Carga inicial concluída: {placas_adicionadas} placas adicionadas'
            }
            
        except Exception as e:
            logger.error(f"Erro na carga inicial de placas: {e}")
            return {
                'success': False,
                'error': f'Erro na carga inicial: {str(e)}'
            }
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass

    @staticmethod
    def inicializar_sistema_placas() -> bool:
        """Inicializa o sistema de placas: cria tabela e popula com dados iniciais"""
        try:
            # Criar tabela se não existir
            if not PlacasModel.criar_tabela():
                logger.error("Falha ao criar tabela de placas")
                return False
            
            logger.info("Tabela de placas criada/verificada com sucesso")
        
            # Verificar se já existem placas usando conexão direta
            try:
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute('SELECT COUNT(*) FROM placas_caminhao WHERE ativa = 1')
                    count = cursor.fetchone()[0]
                    conn.close()
                    
                    if count > 0:
                        logger.info(f"Tabela de placas já possui {count} registros")
                        return True
                else:
                    logger.warning("Não foi possível verificar placas existentes")
            except Exception as e:
                logger.warning(f"Erro ao verificar placas existentes: {e}")
        
            # Lista inicial de placas fornecida pelo usuário
            placas_iniciais = [
                "KQT6E31", "KQT7I64", "KQT8135", "KRK7C54", "KWY6E98", "LMQ1A43", "LMQ1A44", "LSE5H21",
                "LSH9C07", "KQT7871", "KXI9J79", "LRR8356", "JAO1G36", "JAO4F80", "JAO4G00", "JAO4G10",
                "JBA0I16", "JBA0I32", "JBA2F21", "JBA2F27", "JBA5H79", "JBC1E81", "JBC2D91", "JBK3B37",
                "RJN8I27", "RJN8I28", "RJN8I29", "RJP8J23", "JAO4F88", "JAP3C64", "JBC2D69", "JAO1G92",
                "JAO4F68", "JAO8A89", "JAO8B20", "JAU2A47", "JAU2B83", "JAU2C51", "JAU2C90", "JAU2C99",
                "JBA0I39", "JBC1E43", "JBC1E63", "JBC1E64", "JBC1E87", "JBJ6D81", "JBK2I70", "JBK3B39",
                "JBL5E23", "JBL8A24", "JBW6A74", "JBW8I84", "JBW8J63", "KYD2D32", "LRC4083", "LRC4085",
                "LRC4A84", "LTP8C79", "LTP8C80", "MTS0D17", "LUA1B19", "LUL7D19", "MFG4A67", "MTS0316",
                "RIY0G44", "RJW7E16", "RKB0J06", "RKT8B97", "KRT4H22", "KRT4H23", "KRU9865", "KRU9866",
                "KYQ9730", "KZC7621", "LMV1A92", "LMY0A46", "LNL9D00", "LSU6301", "LSW9G84", "LSW9G85",
                "LTA7G95", "LTI3193", "LTI3194", "LTI3B92", "LTN7F55", "LTN7F56", "LTR9C07", "LTR9C08",
                "LUJ7G89", "LUJ7G90", "LUP8D66", "LHS9C07", "KSM7151", "QPN1G62", "RJT9A35", "LLL3B19",
                "ESU6B64", "ODQ5J19", "KWQ4387", "ODN6D60"
            ]
            
            # Remover duplicatas mantendo ordem
            placas_unicas = []
            for placa in placas_iniciais:
                if placa not in placas_unicas:
                    placas_unicas.append(placa)
            
            # Fazer carga inicial
            resultado = PlacasModel.popular_placas_iniciais(placas_unicas)
            
            if resultado['success']:
                logger.info(f"Inicialização de placas concluída: {resultado['placas_adicionadas']} placas carregadas")
                return True
            else:
                logger.error(f"Erro na carga inicial: {resultado.get('error', 'Erro desconhecido')}")
                return False
                
        except Exception as e:
            logger.error(f"Erro na inicialização de placas: Erro na carga inicial: {e}")
            return False


# Função de inicialização global para compatibilidade
def inicializar_placas():
    """Função de inicialização global para compatibilidade"""
    return PlacasModel.inicializar_sistema_placas()
