"""Crime-related database models."""
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, Date
from sqlalchemy.sql import func
from app.db.session import Base


class FIR(Base):
    __tablename__ = "firs"

    id = Column(Integer, primary_key=True, index=True)
    fir_number = Column(String(50), unique=True, index=True, nullable=False)
    station_id = Column(String(50), index=True, nullable=False)
    station_name = Column(String(255), nullable=False)
    district = Column(String(100), index=True, nullable=False)
    crime_type = Column(String(100), index=True, nullable=False)
    crime_subtype = Column(String(100), nullable=True)
    ipc_section = Column(String(100), nullable=True)
    bns_section = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    modus_operandi = Column(Text, nullable=True)
    date_of_occurrence = Column(DateTime(timezone=True), nullable=False)
    date_of_registration = Column(DateTime(timezone=True), server_default=func.now())
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(50), default="open")  # open, investigating, closed, chargesheeted
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    investigating_officer = Column(String(255), nullable=True)
    complainant_name = Column(String(255), nullable=True)
    complainant_user_id = Column(Integer, nullable=True, index=True)  # links FIR to citizen user
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Accused(Base):
    __tablename__ = "accused"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    alias = Column(String(255), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    id_type = Column(String(50), nullable=True)  # aadhaar, pan, driving_license
    id_number = Column(String(100), nullable=True)
    risk_score = Column(Float, default=0.0)
    is_repeat_offender = Column(Boolean, default=False)
    total_cases = Column(Integer, default=1)
    gang_id = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)
    osint_verified = Column(Boolean, default=False)  # OSINT verification status
    osint_sources = Column(Text, nullable=True)  # JSON list of OSINT sources
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Victim(Base):
    __tablename__ = "victims"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    fir_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FIRAccusedLink(Base):
    __tablename__ = "fir_accused_links"

    id = Column(Integer, primary_key=True, index=True)
    fir_id = Column(Integer, nullable=False, index=True)
    accused_id = Column(Integer, nullable=False, index=True)
    role = Column(String(50), default="primary")  # primary, accomplice, abettor


class CriminalNetwork(Base):
    __tablename__ = "criminal_networks"

    id = Column(Integer, primary_key=True, index=True)
    source_accused_id = Column(Integer, nullable=False, index=True)
    target_accused_id = Column(Integer, nullable=False, index=True)
    relationship_type = Column(String(100), nullable=False)  # co-accused, associate, gang_member
    strength = Column(Float, default=1.0)
    shared_firs = Column(Text, nullable=True)  # JSON list of FIR IDs
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    accused_id = Column(Integer, nullable=True)
    from_account = Column(String(100), nullable=False)
    to_account = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(50), nullable=False)  # upi, bank, cash, crypto
    timestamp = Column(DateTime(timezone=True), nullable=False)
    is_suspicious = Column(Boolean, default=False)
    fir_id = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
