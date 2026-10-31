# classes that are replicas of actual tables in dbs
# the no of tables in db = the no of models 
# using this model only for each table you can perform CRUD

from datetime import datetime , timezone

from db import Base
from sqlalchemy import Column , DateTime , Integer , String



class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )