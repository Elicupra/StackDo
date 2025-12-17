# scripts/init_db.py
import os
import sys

# 1️⃣ Añade la carpeta raíz (donde está api/)
BASE_DIR = os.path.abspath(os.path.join(__file__, '..', '..'))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# 2️⃣ Ahora sí importamos el módulo que necesitamos
from api.db import init_db

if __name__ == "__main__":
    
    try:
        init_db()
    except Exception as e:
        print("❌  Error al inicializar la base de datos:", e)
    else:    
        print("✅  Tabla 'tareas' creada (o ya existía).")
