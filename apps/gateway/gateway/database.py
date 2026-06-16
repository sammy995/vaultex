"""User database — SQLite in development, managed Postgres in production.

DB6 remediation
---------------
SQLite is a single-writer, single-file store that cannot run HA or survive
concurrent multi-process writes. It caps the system at exactly one instance
(incompatible with N+1 / multi-AZ HA every bank requires).

To switch to Postgres set the ``DATABASE_URL`` env var to a standard
``postgresql+psycopg2://`` connection string. SQLite remains the default so
local dev and CI stay zero-friction.

⛔ Halt-point (tenant-isolation + HA topology):
    - RLS (Row-Level Security): once multi-tenancy is enforced at the DB layer,
      add a ``tenant_id`` column to ``users``, enable ``ALTER TABLE users ENABLE
      ROW LEVEL SECURITY``, and create per-role policies. Confirm the exact
      predicate design with the founder before applying — wrong RLS is worse
      than no RLS (false sense of isolation).
    - HA/RPO/RTO: the recommended topology is Postgres 16+ with streaming
      replication (primary + 1 synchronous standby), automated failover via
      Patroni or a managed service (AWS RDS Multi-AZ, Supabase, Neon),
      continuous WAL archiving to S3 for point-in-time recovery, and a
      documented runbook. Confirm targets with the founder before deployment.
    - For horizontal gateway scaling wire a PgBouncer connection pool in front
      of Postgres and set pool_mode=transaction.
"""

import os
from pathlib import Path

from sqlalchemy import Column, DateTime, String, create_engine, func, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# DB6: If DATABASE_URL is set, use it (Postgres in production).
# Otherwise fall back to SQLite on the local /data volume (development/CI).
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    DB_PATH = Path(os.getenv("DB_PATH", "/data/users.db"))
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{DB_PATH}",
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="junior_analyst")
    created_at = Column(DateTime, server_default=func.now())
    # ⛔ Halt-point: add tenant_id here + RLS policy when multi-tenancy lands.
    # tenant_id = Column(String, nullable=False, default="default", index=True)


def init_db() -> None:
    """Create all tables if they don't exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
