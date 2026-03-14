import uuid
from datetime import datetime
from typing import Any, List, Optional

import sqlalchemy.dialects.postgresql as pg
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Text, func
from sqlmodel import Column, Field, Relationship, SQLModel


class Credentials(SQLModel, table=True):
    __tablename__ = "credentials"  # pyright: ignore

    id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID(as_uuid=True),
            primary_key=True,
            default=uuid.uuid4,
            nullable=False,
            index=True,
        )
    )
    title: str = Field(index=True)
    user_id: str = Field(index=True)
    credential_type: str
    encrypted_data: str
    extra: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column("metadata", JSON)
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        )
    )
    # --- soft delete ---
    is_deleted: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false", index=True),
    )
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    def __repr__(self) -> str:
        return f"<Credentials {self.credential_type} user={self.user_id}>"


class Workflow(SQLModel, table=True):
    __tablename__ = "workflows"  # pyright: ignore

    id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID(as_uuid=True),
            primary_key=True,
            default=uuid.uuid4,
            nullable=False,
            index=True,
        )
    )
    user_id: str = Field(index=True)
    title: str
    description: Optional[str] = Field(default=None)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        )
    )
    # --- soft delete ---
    is_deleted: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false", index=True),
    )
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    jobs: List["Job"] = Relationship(back_populates="workflow")

    def __repr__(self) -> str:
        return f"<Workflow {self.id} title={self.title}>"


class Job(SQLModel, table=True):
    __tablename__ = "jobs"  # pyright: ignore

    id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID(as_uuid=True),
            primary_key=True,
            default=uuid.uuid4,
            nullable=False,
            index=True,
        )
    )
    title: str
    type: str  # facility_setup, users_create, service_units
    description: Optional[str] = Field(default=None)
    user_id: str = Field(index=True)
    error: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    workflow_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID(as_uuid=True),
            ForeignKey("workflows.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    credential_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID(as_uuid=True),
            ForeignKey("credentials.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        )
    )
    status: str = Field(default="pending", index=True)
    extra: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column("metadata", JSON)
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        )
    )
    # --- soft delete ---
    is_deleted: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false", index=True),
    )
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    workflow: Optional["Workflow"] = Relationship(back_populates="jobs")

    def __repr__(self) -> str:
        return f"<Job {self.id} status={self.status} workflow={self.workflow_id}>"
