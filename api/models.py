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
    pass

class TaskUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    prioridad: Optional[int] = None
    fecha_vencimiento: Optional[date] = None

class TaskOut(TaskBase):
    id: int
    Active: int  # 1 = activo, 0 = inactivo
