from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

# Enums
class FIRStatus(str, Enum):
    OPEN = "open"
    UNDER_INVESTIGATION = "under_investigation"
    CLOSED = "closed"
    COLD_CASE = "cold_case"

class EvidenceType(str, Enum):
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    PHYSICAL = "physical"
    DIGITAL = "digital"

# Many-to-Many Link Tables
class FIRCriminalLink(SQLModel, table=True):
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id", primary_key=True)
    criminal_id: Optional[int] = Field(default=None, foreign_key="criminal.id", primary_key=True)

class FIRVictimLink(SQLModel, table=True):
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id", primary_key=True)
    victim_id: Optional[int] = Field(default=None, foreign_key="victim.id", primary_key=True)

class FIRWitnessLink(SQLModel, table=True):
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id", primary_key=True)
    witness_id: Optional[int] = Field(default=None, foreign_key="witness.id", primary_key=True)

# Main Models
class PoliceStation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    location: str
    district: str
    contact_number: str
    
    officers: List["Officer"] = Relationship(back_populates="police_station")

class Officer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    badge_number: str = Field(unique=True, index=True)
    rank: str
    contact_number: str
    police_station_id: Optional[int] = Field(default=None, foreign_key="policestation.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    police_station: Optional[PoliceStation] = Relationship(back_populates="officers")
    firs: List["FIR"] = Relationship(back_populates="investigating_officer")

class CrimeCategory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    
    firs: List["FIR"] = Relationship(back_populates="category")

class Criminal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    alias: Optional[str] = None
    address: str
    phone_number: Optional[str] = None
    criminal_record: Optional[str] = None
    
    firs: List["FIR"] = Relationship(back_populates="criminals", link_model=FIRCriminalLink)

class Victim(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    address: str
    phone_number: str
    
    firs: List["FIR"] = Relationship(back_populates="victims", link_model=FIRVictimLink)

class Witness(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    address: str
    phone_number: str
    
    firs: List["FIR"] = Relationship(back_populates="witnesses", link_model=FIRWitnessLink)

class FIR(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fir_number: str = Field(unique=True, index=True)
    incident_date: datetime
    registration_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    location: str
    description: str
    status: FIRStatus = Field(default=FIRStatus.OPEN)
    
    category_id: Optional[int] = Field(default=None, foreign_key="crimecategory.id")
    officer_id: Optional[int] = Field(default=None, foreign_key="officer.id")
    
    category: Optional[CrimeCategory] = Relationship(back_populates="firs")
    investigating_officer: Optional[Officer] = Relationship(back_populates="firs")
    criminals: List[Criminal] = Relationship(back_populates="firs", link_model=FIRCriminalLink)
    victims: List[Victim] = Relationship(back_populates="firs", link_model=FIRVictimLink)
    witnesses: List[Witness] = Relationship(back_populates="firs", link_model=FIRWitnessLink)
    evidence: List["Evidence"] = Relationship(back_populates="fir")
    reports: List["InvestigationReport"] = Relationship(back_populates="fir")

class Evidence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fir_id: int = Field(foreign_key="fir.id")
    type: EvidenceType
    description: str
    file_path: Optional[str] = None
    collected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    fir: Optional[FIR] = Relationship(back_populates="evidence")

class InvestigationReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fir_id: int = Field(foreign_key="fir.id")
    report_content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    fir: Optional[FIR] = Relationship(back_populates="reports")

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    action: str
    entity_name: str
    entity_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[str] = None
