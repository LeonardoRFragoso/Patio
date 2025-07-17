from posicoes_suzano import PatioSuzano
import sqlite3

patio = PatioSuzano()
db = sqlite3.connect('database.db')

print('TESTE 1: Container flutuante A05-3')
resultado = patio.validar_operacao('A05-3', 'descarga', db, tamanho_teu=20)
print('Valido:', resultado['valido'])
print('Mensagem:', resultado['mensagem'])
print()

print('TESTE 2: Container 40 TEU em baia impar A03-1')
resultado = patio.validar_operacao('A03-1', 'descarga', db, tamanho_teu=40)
print('Valido:', resultado['valido'])
print('Mensagem:', resultado['mensagem'])
print()

print('TESTE 3: Posicao valida C06-1')
resultado = patio.validar_operacao('C06-1', 'descarga', db, tamanho_teu=20)
print('Valido:', resultado['valido'])
print('Mensagem:', resultado['mensagem'])

db.close()
