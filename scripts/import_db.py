import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Carrega variáveis
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

def import_sql_file():
    connection = None
    cursor = None
    try:
        # Configurações
        sql_file_path = os.path.join(os.path.dirname(__file__), '..', 'backup_estrutura.sql')
        db_pass = os.getenv('DB_PASSWORD', 'root')
        db_name = 'app_db'

        print(f"📂 Lendo arquivo: {sql_file_path}...")
        
        # Lê o arquivo SQL
        with open(sql_file_path, 'r', encoding='utf-8') as file:
            sql_script = file.read()

        print("🔌 Conectando ao Banco Docker (Porta 3307)...")
        connection = mysql.connector.connect(
            host='localhost',
            database=db_name,
            user='root',
            password=db_pass,
            port=3307
        )

        if connection.is_connected():
            cursor = connection.cursor()
            
            # 1. Desativa verificação de Chaves Estrangeiras (evita erro de ordem)
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            print("🚀 Iniciando importação manual (comando por comando)...")

            # 2. Divide o arquivo pelo caractere ';' e executa um por um
            commands = sql_script.split(';')
            
            count = 0
            for command in commands:
                # Limpa espaços e pular comandos vazios
                cleaned_command = command.strip()
                if cleaned_command:
                    try:
                        cursor.execute(cleaned_command)
                        count += 1
                    except Error as e_cmd:
                        # Ignora erros simples de "tabela já existe" ou linhas vazias
                        print(f"⚠️ Aviso no comando {count}: {e_cmd}")

            # 3. Reativa verificação de Chaves Estrangeiras
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            
            connection.commit()
            print(f"✅ Sucesso! {count} comandos SQL executados.")

            # Verificação final
            print("\n📋 Tabelas no banco agora:")
            cursor.execute("SHOW TABLES;")
            tables = cursor.fetchall()
            for (table,) in tables:
                print(f"   - {table}")

    except FileNotFoundError:
        print(f"❌ ERRO: Arquivo '{sql_file_path}' não encontrado.")
    except Error as e:
        print(f"❌ ERRO GERAL: {e}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("\n🔒 Conexão encerrada.")

if __name__ == '__main__':
    import_sql_file()
