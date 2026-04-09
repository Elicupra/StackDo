import os
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Iterable

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt
from sqlmodel import select

from .db import get_session, User, UserProject

ROLE_SUPERADMIN = "SuperAdmin"
ROLE_ITADMIN = "ITAdmin"
ROLE_ADMIN = "AdminProyecto"
ROLE_COORD = "CoordinadorProyecto"
ROLE_USER = "Usuario"

VALID_ROLES = {ROLE_SUPERADMIN, ROLE_ITADMIN, ROLE_ADMIN, ROLE_COORD, ROLE_USER}

AUTH_ENABLED = os.getenv("AUTH_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))


def normalize_role(role: Optional[str]) -> str:
    if role in VALID_ROLES:
        return role
    if not role:
        return ROLE_USER
    legacy = role.strip().lower()
    if legacy in {"admin", "administrador", "administrador de proyecto"}:
        return ROLE_ADMIN
    if legacy in {"coordinador", "coordinador proyecto", "coordinador de proyecto"}:
        return ROLE_COORD
    if legacy in {"user", "usuario"}:
        return ROLE_USER
    if legacy in {"superadmin", "super admin"}:
        return ROLE_SUPERADMIN
    if legacy in {"itadmin", "it admin", "rol it", "it"}:
        return ROLE_ITADMIN
    return ROLE_USER


def hash_password(password: str, salt_hex: Optional[str] = None) -> tuple[str, str]:
    if salt_hex:
        salt = bytes.fromhex(salt_hex)
    else:
        salt = secrets.token_bytes(16)
        salt_hex = salt.hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return digest.hex(), salt_hex


def verify_password(password: str, salt_hex: str, expected_hash: str) -> bool:
    calculated, _ = hash_password(password, salt_hex)
    return secrets.compare_digest(calculated, expected_hash)


def create_access_token(user: User) -> str:
    now_ts = int(time.time())
    payload = {
        "sub": str(user.id),
        "role": normalize_role(user.rol),
        "iat": now_ts,
        "exp": now_ts + (JWT_EXPIRE_MINUTES * 60),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> User:
    with get_session() as session:
        if AUTH_ENABLED:
            if not authorization or not authorization.startswith("Bearer "):
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token requerido")
            token = authorization.split(" ", 1)[1].strip()
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                user_id = int(payload.get("sub"))
            except (JWTError, ValueError, TypeError):
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalido")
        else:
            if not x_user_id:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-User-Id requerido")
            try:
                user_id = int(x_user_id)
            except ValueError:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-User-Id invalido")

        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado")
        return user


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Optional[User]:
    if AUTH_ENABLED:
        return get_current_user(authorization=authorization, x_user_id=x_user_id)
    if not x_user_id:
        return None
    return get_current_user(authorization=authorization, x_user_id=x_user_id)


def get_allowed_project_ids(user: User) -> Optional[list[int]]:
    role = normalize_role(user.rol)
    if role == ROLE_SUPERADMIN:
        return None
    with get_session() as session:
        results = session.exec(
            select(UserProject.project_id).where(UserProject.user_id == user.id)
        ).all()
        return list(results)


def ensure_project_access(user: User, project_id: int) -> None:
    allowed = get_allowed_project_ids(user)
    if allowed is None:
        return
    if project_id not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sin acceso a este proyecto")


def require_roles(user: User, allowed_roles: Iterable[str]) -> None:
    role = normalize_role(user.rol)
    if role not in set(allowed_roles):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")


def can_export(user: User) -> bool:
    role = normalize_role(user.rol)
    return role in {ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_COORD}


def can_access_dashboard(user: User) -> bool:
    role = normalize_role(user.rol)
    return role in {ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_COORD}


def can_access_admin_console(user: User) -> bool:
    role = normalize_role(user.rol)
    return role in {ROLE_SUPERADMIN, ROLE_ITADMIN}


def is_project_admin(user: User) -> bool:
    role = normalize_role(user.rol)
    return role in {ROLE_SUPERADMIN, ROLE_ADMIN}
