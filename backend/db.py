from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base , sessionmaker

DATABASE_URL = "sqlite:///./database.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
    future=True
)

SessionLocal = sessionmaker(
    autoflush=False,
    autocommit=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()