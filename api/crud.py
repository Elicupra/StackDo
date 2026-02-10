# api/crud.py
from typing import List, Optional
from sqlmodel import select
from fastapi import HTTPException, status
from .db import get_session, Tarea, Project, User
from .models import TaskCreate, TaskUpdate, TaskOut, ProjectCreate, ProjectOut, UserOut, UserCreate

# ── TASKS CRUD ---------------------------

def create_task(t: TaskCreate) -> int:
    """Crea una tarea y devuelve su ID. Valida proyecto y usuario."""
    with get_session() as session:
        # Si hay project_id, verificar que el proyecto exista
        if t.project_id is not None:
            project = session.get(Project, t.project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proyecto no encontrado"
                )

        user_id = t.user_id
        if user_id is None:
            user = session.exec(select(User).order_by(User.id)).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado"
                )
            user_id = user.id
        else:
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado"
                )
        
        # Convertimos el esquema Pydantic a Modelo SQLModel
        task_data = t.model_dump()
        task_data["user_id"] = user_id
        db_task = Tarea.model_validate(task_data)
        session.add(db_task)
        session.commit()
        session.refresh(db_task)
        return db_task.id

def get_task(id: int) -> TaskOut | None:
    with get_session() as session:
        # Buscamos por ID y que esté activa
        statement = select(Tarea).where(Tarea.id == id, Tarea.active == True)
        db_task = session.exec(statement).first()
        
        if not db_task:
            return None
        # Convertimos a TaskOut
        return TaskOut(**db_task.model_dump())

def list_active_tasks(project_id: int | None = None) -> List[TaskOut]:
    with get_session() as session:
        statement = select(Tarea).where(Tarea.active == True)
        if project_id is not None:
            statement = statement.where(Tarea.project_id == project_id)
            
        results = session.exec(statement).all()
        return [TaskOut(**task.model_dump()) for task in results]

def soft_delete(id: int) -> bool:
    """Marca la fila como “inactiva”. Devuelve True si se afectó 1 registro."""
    with get_session() as session:
        statement = select(Tarea).where(Tarea.id == id, Tarea.active == True)
        db_task = session.exec(statement).first()
        if not db_task:
            return False
        
        db_task.active = False
        session.add(db_task)
        session.commit()
        return True

def update_task(id: int, t: TaskUpdate) -> bool:
    """Actualiza los campos que el cliente envíe."""
    with get_session() as session:
        statement = select(Tarea).where(Tarea.id == id, Tarea.active == True)
        db_task = session.exec(statement).first()
        if not db_task:
            return False
        
        # Actualizamos solo los campos enviados (exclude_unset=True)
        task_data = t.model_dump(exclude_unset=True)
        if not task_data:
            return False # Nada que actualizar
            
        if "user_id" in task_data and task_data["user_id"] is not None:
            user = session.get(User, task_data["user_id"])
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado"
                )

        for key, value in task_data.items():
            setattr(db_task, key, value)
            
        session.add(db_task)
        session.commit()
        return True


# ── PROJECTS CRUD ----------------

def create_project(p: ProjectCreate) -> int:
    with get_session() as session:
        db_project = Project.model_validate(p)
        session.add(db_project)
        session.commit()
        session.refresh(db_project)
        return db_project.id

def list_projects() -> List[ProjectOut]:
    with get_session() as session:
        statement = select(Project)
        results = session.exec(statement).all()
        return [ProjectOut(**p.model_dump()) for p in results]

def get_project(id: int) -> ProjectOut | None:
    with get_session() as session:
        db_project = session.get(Project, id)
        if not db_project:
            return None
        return ProjectOut(**db_project.model_dump())


def list_users() -> List[UserOut]:
    with get_session() as session:
        statement = select(User).order_by(User.id)
        results = session.exec(statement).all()
        return [UserOut(**u.model_dump()) for u in results]


def create_user(u: UserCreate) -> int:
    with get_session() as session:
        db_user = User.model_validate(u)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user.id