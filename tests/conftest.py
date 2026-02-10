import os
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parents[1]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

os.environ.setdefault('DB_USER', 'test')
os.environ.setdefault('DB_PASSWORD', 'test')
os.environ.setdefault('DB_HOST', 'localhost')
os.environ.setdefault('DB_PORT', '5432')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('DB_SCHEMA', '')
os.environ.setdefault('SCHEMA', '')

import pytest
from sqlmodel import SQLModel, create_engine, Session
import api.db as db


@pytest.fixture()
def db_engine(tmp_path, monkeypatch):
    db_path = tmp_path / 'stackdo_test.db'
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    monkeypatch.setattr(db, 'engine', engine, raising=True)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            db.User(
                id_usuario='user-001',
                nombre='Ana',
                primer_apellido='Lopez',
                segundo_apellido=None,
                sexo='M',
                edad=30,
                correo_electronico='ana@example.com',
                rol='admin'
            )
        )
        session.commit()
    yield engine
