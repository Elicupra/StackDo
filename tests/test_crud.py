import pytest
from fastapi import HTTPException
from sqlmodel import Session, select
from api import crud
from api.models import ProjectCreate, TaskCreate, TaskUpdate
import api.db as db


def test_project_crud(db_engine):
    project_id = crud.create_project(ProjectCreate(name='Proyecto A', description='Desc'))
    projects = crud.list_projects()

    assert len(projects) == 1
    assert projects[0].id == project_id

    project = crud.get_project(project_id)
    assert project is not None
    assert project.name == 'Proyecto A'


def test_task_crud_flow(db_engine):
    project_id = crud.create_project(ProjectCreate(name='Proyecto B', description=None))
    with Session(db_engine) as session:
        user = session.exec(select(db.User)).first()
        user_id = user.id

    task_id = crud.create_task(
        TaskCreate(
            titulo='Tarea 1',
            descripcion='Desc',
            estado='pendiente',
            prioridad=2,
            fecha_vencimiento=None,
            project_id=project_id,
            user_id=user_id
        )
    )

    task = crud.get_task(task_id)
    assert task is not None
    assert task.titulo == 'Tarea 1'
    assert task.project_id == project_id
    assert task.user_id == user_id

    tasks = crud.list_active_tasks(project_id=project_id)
    assert len(tasks) == 1

    updated = crud.update_task(task_id, TaskUpdate(estado='en_progreso', prioridad=4))
    assert updated is True

    task_after_update = crud.get_task(task_id)
    assert task_after_update is not None
    assert task_after_update.estado == 'en_progreso'
    assert task_after_update.prioridad == 4

    deleted = crud.soft_delete(task_id)
    assert deleted is True
    assert crud.get_task(task_id) is None


def test_create_task_with_invalid_project(db_engine):
    with pytest.raises(HTTPException):
        crud.create_task(
            TaskCreate(
                titulo='Tarea sin proyecto',
                descripcion=None,
                estado='pendiente',
                prioridad=1,
                fecha_vencimiento=None,
                project_id=999
            )
        )


def test_update_task_with_empty_payload(db_engine):
    project_id = crud.create_project(ProjectCreate(name='Proyecto C', description=None))
    task_id = crud.create_task(
        TaskCreate(
            titulo='Tarea 2',
            descripcion=None,
            estado='pendiente',
            prioridad=1,
            fecha_vencimiento=None,
            project_id=project_id
        )
    )

    updated = crud.update_task(task_id, TaskUpdate())
    assert updated is False
