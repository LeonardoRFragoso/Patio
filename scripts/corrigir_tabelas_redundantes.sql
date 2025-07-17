-- Script para migrar dados de tabelas redundantes e removê-las
-- Este script deve ser executado com cuidado e após fazer backup do banco de dados

-- 1. Migrar quaisquer dados de estruturas_admin que não existam em estruturas
INSERT OR IGNORE INTO estruturas (codigo, nome, ativo, data_criacao, criado_por)
SELECT codigo, nome, ativo, data_criacao, criado_por
FROM estruturas_admin
WHERE codigo NOT IN (SELECT codigo FROM estruturas);

-- 2. Migrar quaisquer dados de avarias_admin que não existam em avarias
INSERT OR IGNORE INTO avarias (codigo, nome, ativo, data_criacao, criado_por)
SELECT codigo, nome, ativo, data_criacao, criado_por
FROM avarias_admin
WHERE codigo NOT IN (SELECT codigo FROM avarias);

-- 3. Migrar quaisquer dados de avarias_vistoria que não existam em vistorias_avarias
INSERT OR IGNORE INTO vistorias_avarias (vistoria_id, avaria_id, estrutura_id, observacoes, data_registro)
SELECT vistoria_id, avaria_id, estrutura_id, observacoes, data_registro
FROM avarias_vistoria
WHERE (vistoria_id, avaria_id, estrutura_id) NOT IN (SELECT vistoria_id, avaria_id, estrutura_id FROM vistorias_avarias);

-- 4. Após confirmar que todos os dados foram migrados corretamente, remover tabelas redundantes
DROP TABLE IF EXISTS estruturas_admin;
DROP TABLE IF EXISTS avarias_admin;
DROP TABLE IF EXISTS avarias_vistoria;

-- 5. Confirmar que as tabelas foram removidas
SELECT 'Estruturas_admin ainda existe' WHERE EXISTS (SELECT name FROM sqlite_master WHERE name='estruturas_admin');
SELECT 'Avarias_admin ainda existe' WHERE EXISTS (SELECT name FROM sqlite_master WHERE name='avarias_admin');
SELECT 'Avarias_vistoria ainda existe' WHERE EXISTS (SELECT name FROM sqlite_master WHERE name='avarias_vistoria');
