# api/models.py
from pydantic import BaseModel, Field, validator
from datetime import date
from typing import Optional

class TaskBase(BaseModel):
    titulo: str = Field(..., max_length=200)
    descripcion: Optional[str] = None
    # pydantic v2 removed `regex` in favor of `pattern`
    estado: str = Field(..., pattern=r'^(pendiente|en_progreso|completada)$')
    prioridad: int = Field(..., ge=1, le=5)
    fecha_vencimiento: Optional[date] = None

class TaskCreate(TaskBase):
    project_id: int | None = None

class TaskUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    prioridad: Optional[int] = None
    fecha_vencimiento: Optional[date] = None
    project_id: Optional[int] = None

class TaskOut(TaskBase):
    id: int
    active: bool
    project_id: int | None = None


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
