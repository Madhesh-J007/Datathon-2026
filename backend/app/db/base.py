from app.db.base_class import Base
from app.models.district import District
from app.models.police_station import PoliceStation
from app.models.crime_type import CrimeType
from app.models.crime_sub_type import CrimeSubType
from app.models.officer import Officer
from app.models.case_master import CaseMaster
from app.models.accused import Accused
from app.models.victim import Victim
from app.models.evidence import Evidence
from app.models.vehicle import Vehicle

# Export Base and all core models so they are discovered by database/migrations and table creation hooks
__all__ = [
    "Base",
    "District",
    "PoliceStation",
    "CrimeType",
    "CrimeSubType",
    "Officer",
    "CaseMaster",
    "Accused",
    "Victim",
    "Evidence",
    "Vehicle"
]
