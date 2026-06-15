"""User CRUD operations — password hashing and authentication."""
from uuid import uuid4

import bcrypt
from sqlalchemy.orm import Session

from gateway.database import User

VALID_ROLES = frozenset({"junior_analyst", "senior_analyst", "vp_risk", "admin"})


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    role: str = "junior_analyst",
) -> User:
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role '{role}'. Must be one of {sorted(VALID_ROLES)}")
    user = User(
        id=str(uuid4()),
        username=username.strip(),
        email=email.strip().lower(),
        hashed_password=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username.strip()).first()


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user
