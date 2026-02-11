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
    comentario: Optional[str] = Field(default=None, max_length=1000)

class TaskCreate(TaskBase):
    project_id: int | None = None
    user_id: int | None = None

class TaskUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    prioridad: Optional[int] = None
    fecha_vencimiento: Optional[date] = None
    project_id: Optional[int] = None
    user_id: Optional[int] = None
    comentario: Optional[str] = Field(default=None, max_length=1000)

class TaskOut(TaskBase):
    id: int
    active: bool
    project_id: int | None = None
    user_id: int | None = None
    fecha_creacion: date


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, max_length=20)
    logo: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    logo: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, max_length=20)
    logo: Optional[str] = None


class UserOut(BaseModel):
    id: int
    id_usuario: str
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    sexo: Optional[str] = None
    edad: Optional[int] = None
    correo_electronico: Optional[str] = None
    rol: Optional[str] = None


class UserCreate(BaseModel):
    id_usuario: str = Field(..., max_length=255)
    nombre: str = Field(..., max_length=255)
    primer_apellido: str = Field(..., max_length=255)
    segundo_apellido: Optional[str] = Field(default=None, max_length=255)
    sexo: Optional[str] = Field(default=None, max_length=1)
    edad: Optional[int] = None
    correo_electronico: Optional[str] = Field(default=None, max_length=255)
    rol: Optional[str] = Field(default=None, max_length=255)
