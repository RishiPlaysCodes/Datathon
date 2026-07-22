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
    complainant_phone = Column(String(20), nullable=True)
    complainant_email = Column(String(255), nullable=True)
    complainant_address = Column(Text, nullable=True)
    complainant_aadhaar = Column(String(12), nullable=True)
    preferred_contact_time = Column(String(20), nullable=True)  # morning/afternoon/evening/anytime
    safe_to_call = Column(Boolean, default=True)
    complainant_user_id = Column(Integer, nullable=True, index=True)  # links FIR to citizen user
    # Suspect information (from complainant)
    suspect_name = Column(String(255), nullable=True)
    suspect_description = Column(Text, nullable=True)
    suspect_count = Column(String(20), nullable=True)  # 1, 2-3, 4+, unknown
    suspect_relationship = Column(String(100), nullable=True)
    weapon_used = Column(String(100), nullable=True)
    # Financial loss
    financial_loss = Column(Boolean, default=False)
    loss_amount = Column(Float, nullable=True)
    loss_type = Column(String(50), nullable=True)  # cash, bank_transfer, upi, crypto, goods
    transaction_id = Column(String(255), nullable=True)
    # AI vs User selections
    ai_crime_suggestion = Column(String(100), nullable=True)
    user_crime_selection = Column(String(100), nullable=True)
    ai_law_suggestion = Column(Text, nullable=True)  # JSON
    user_law_selection = Column(Text, nullable=True)  # JSON
    ai_confidence = Column(Float, nullable=True)
    # Zone/station
    zone = Column(String(50), nullable=True)  # South, East, West, North, Central
    police_station_code = Column(String(20), nullable=True, index=True)
    # AI Report
    ai_report_generated = Column(Boolean, default=False)
    ai_report_content = Column(Text, nullable=True)  # JSON
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


class PublicComplaint(Base):
    """Public-facing complaint submitted without login. Becomes visible publicly after 7 days if unresolved."""
    __tablename__ = "public_complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_number = Column(String(50), unique=True, index=True, nullable=False)
    # Complainant details
    complainant_name = Column(String(255), nullable=False)
    complainant_phone = Column(String(20), nullable=True)
    complainant_email = Column(String(255), nullable=True)
    complainant_address = Column(Text, nullable=True)
    complainant_aadhaar = Column(String(12), nullable=True)
    preferred_contact_time = Column(String(20), nullable=True)
    safe_to_call = Column(Boolean, default=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    # Crime details
    description = Column(Text, nullable=False)
    user_crime_type = Column(String(100), nullable=True)  # user's manual selection
    user_law_sections = Column(Text, nullable=True)  # JSON: user's manual selection
    # AI-classified fields
    ai_crime_type = Column(String(100), nullable=True)
    ai_law_sections = Column(Text, nullable=True)  # JSON list
    ai_severity = Column(String(20), default="medium")
    ai_confidence = Column(Float, default=0.0)
    law_violated = Column(Boolean, default=True)
    # Suspect information
    suspect_name = Column(String(255), nullable=True)
    suspect_description = Column(Text, nullable=True)
    suspect_count = Column(String(20), nullable=True)
    suspect_relationship = Column(String(100), nullable=True)
    suspect_phone = Column(String(20), nullable=True)
    suspect_address = Column(Text, nullable=True)
    weapon_used = Column(String(100), nullable=True)
    cctv_available = Column(Boolean, nullable=True)
    # Financial loss
    financial_loss = Column(Boolean, default=False)
    loss_amount = Column(Float, nullable=True)
    loss_type = Column(String(50), nullable=True)
    bank_details = Column(Text, nullable=True)
    transaction_id = Column(String(255), nullable=True)
    reported_to_bank = Column(Boolean, nullable=True)
    # Status and visibility
    status = Column(String(50), default="pending")  # pending, under_review, resolved, escalated
    is_public = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    # Location
    location_name = Column(String(255), nullable=True)
    district = Column(String(100), nullable=True)
    zone = Column(String(50), nullable=True)
    police_station_code = Column(String(20), nullable=True)
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
