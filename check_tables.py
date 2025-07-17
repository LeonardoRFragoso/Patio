import sqlite3
import os

print(f"Working directory: {os.getcwd()}")
print(f"Database file exists: {os.path.exists('database.db')}")

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("\nTables in the database:")
for table in tables:
    print(f"- {table[0]}")
    
    # For each table, get column information
    cursor.execute(f"PRAGMA table_info({table[0]})")
    columns = cursor.fetchall()
    print(f"  Columns in {table[0]}:")
    for col in columns:
        print(f"    {col[1]} ({col[2]})")
    print("")

conn.close()
