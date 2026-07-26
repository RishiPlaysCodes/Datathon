"""User and AuditLog models."""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float
from sqlalchemy.sql import func
from app.db.session import Base


class PoliceStation(Base):
    """Master data for Karnataka police stations."""
    __tablename__ = "police_stations"

    id = Column(Integer, primary_key=True, index=True)
    station_code = Column(String(20), unique=True, index=True, nullable=False)
    station_name = Column(String(255), nullable=False)
    zone = Column(String(50), nullable=False)  # South, East, West, North, Central, etc.
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_number = Column(String(20), nullable=True)
    officer_count = Column(Integer, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="investigator")
    station_id = Column(String(50), nullable=True)  # station_code from police_stations
    badge_number = Column(String(50), nullable=True)
    rank = Column(String(50), nullable=True)  # Constable/ASI/SI/Inspector/DSP/SP
    assigned_zone = Column(String(50), nullable=True)  # auto-populated from station
    language = Column(String(5), nullable=True, default="en")  # en, hi, kn
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    username = Column(String(100), nullable=False)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    query_text = Column(Text, nullable=True)
    risk_level = Column(String(20), default="low")  # low, medium, high
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    previous_hash = Column(String(64), nullable=True)
    entry_hash = Column(String(64), nullable=False)


class ConversationHistory(Base):
    __tablename__ = "conversation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    session_id = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
