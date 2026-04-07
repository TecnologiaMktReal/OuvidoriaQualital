import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Carrega variáveis do .env (sobe um nível pois script está na pasta /scripts)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

def connect():
    connection = None
    try:
        # Pega a senha do .env (ou usa 'root' se não achar)
        db_pass = os.getenv('DB_PASSWORD', 'root')
        
        print("🔌 Tentando conectar em localhost:3307...")
        
        connection = mysql.connector.connect(
            host='localhost',
            database='app_db', # Nome definido no docker-compose
            user='root',
            password=db_pass,
            port=3307          # Porta externa do Docker
        )
        
        if connection.is_connected():
            info = connection.get_server_info()
            print(f"✅ SUCESSO! Conectado ao MySQL versão: {info}")
            
    except Error as e:
        print(f"❌ ERRO: {e}")
    
    finally:
        if connection and connection.is_connected():
            connection.close()
            print("🔒 Conexão fechada.")

if __name__ == '__main__':
    connect()
