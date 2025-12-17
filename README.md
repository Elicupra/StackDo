# crea la tabla antes de arrancar
python -m api.db init   # (añade una función _init_ en db.py)
uvicorn api.main:app --reload
# OJO
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="ui", html=True), name="static")

Con esto debe arrancar la pagina