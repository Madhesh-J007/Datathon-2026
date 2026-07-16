import csv
import os
from datetime import datetime
from sqlalchemy.orm import Session
import logging

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

logger = logging.getLogger("ksp_backend")

# --- Generic Seeding Helper ---
def seed_table(db: Session, model_class, csv_filename, mapper_func):
    """
    Checks if a table already contains rows. If not, reads the specified CSV
    file from the database mount, parses rows with the mapper, and bulk-saves to DB.
    """
    if db.query(model_class).first() is not None:
        logger.info(f"Table '{model_class.__tablename__}' is already seeded.")
        return

    csv_path = f"/database/seeds/data/{csv_filename}"
    if not os.path.exists(csv_path):
        logger.warning(f"Seed file not found at {csv_path}. Skipping.")
        return

    logger.info(f"Seeding '{model_class.__tablename__}' from {csv_path}...")
    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            objects_to_insert = []
            for row in reader:
                obj = mapper_func(row)
                if obj:
                    objects_to_insert.append(obj)

            db.bulk_save_objects(objects_to_insert)
            db.commit()
            logger.info(f"Successfully seeded {len(objects_to_insert)} records into '{model_class.__tablename__}'!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding '{model_class.__tablename__}': {e}")


# --- CSV Mappers ---

def map_district(row):
    return District(
        DistrictID=int(row['DistrictID']),
        DistrictName=row['DistrictName'],
        StateID=int(row['StateID']),
        Active=int(row['Active'])
    )

def map_police_station(row):
    parent = row.get('ParentUnit')
    return PoliceStation(
        UnitID=int(row['UnitID']),
        UnitName=row['UnitName'],
        TypeID=int(row['TypeID']),
        ParentUnit=int(float(parent.strip())) if parent and parent.strip() and parent != 'nan' else None,
        StateID=int(row['StateID']),
        DistrictID=int(row['DistrictID']),
        Active=int(row['Active'])
    )

def map_crime_type(row):
    return CrimeType(
        CrimeHeadID=int(row['CrimeHeadID']),
        CrimeGroupName=row['CrimeGroupName'],
        Active=int(row['Active'])
    )

def map_crime_sub_type(row):
    return CrimeSubType(
        CrimeSubHeadID=int(row['CrimeSubHeadID']),
        CrimeHeadID=int(row['CrimeHeadID']),
        CrimeHeadName=row['CrimeHeadName'],
        SeqID=int(row['SeqID'])
    )

def map_officer(row):
    yos = row.get('YearsOfService')
    cases = row.get('AssignedCaseCount')
    return Officer(
        OfficerID=int(row['OfficerID']),
        PoliceStationID=int(row['PoliceStationID']),
        DistrictID=int(row['DistrictID']),
        Name=row['Name'],
        Gender=row['Gender'],
        Rank=row['Rank'],
        BadgeNumber=row['BadgeNumber'],
        YearsOfService=int(float(yos.strip())) if yos and yos.strip() and yos != 'nan' else 0,
        AssignedCaseCount=int(float(cases.strip())) if cases and cases.strip() and cases != 'nan' else 0
    )

def map_case_master(row):
    def parse_dt(dt_str):
        if not dt_str or dt_str.strip() == '' or dt_str == 'nan':
            return None
        try:
            return datetime.strptime(dt_str.strip(), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                return datetime.strptime(dt_str.strip(), "%Y-%m-%d")
            except ValueError:
                return None

    def parse_d(d_str):
        if not d_str or d_str.strip() == '' or d_str == 'nan':
            return None
        try:
            return datetime.strptime(d_str.strip(), "%Y-%m-%d").date()
        except ValueError:
            try:
                return datetime.strptime(d_str.strip(), "%Y-%m-%d %H:%M:%S").date()
            except ValueError:
                return None

    def parse_int(val):
        if not val or val.strip() == '' or val == 'nan':
            return None
        try:
            return int(float(val.strip()))
        except ValueError:
            return None

    def parse_float(val):
        if not val or val.strip() == '' or val == 'nan':
            return 0.0
        try:
            return float(val.strip())
        except ValueError:
            return 0.0

    return CaseMaster(
        CaseMasterID=int(row['CaseMasterID']),
        CrimeNo=int(row['CrimeNo']),
        CaseNo=row['CaseNo'],
        CrimeRegisteredDate=parse_d(row['CrimeRegisteredDate']),
        PolicePersonID=parse_int(row['PolicePersonID']),
        PoliceStationID=parse_int(row['PoliceStationID']),
        CaseCategoryID=parse_int(row['CaseCategoryID']),
        GravityOffenceID=parse_int(row['GravityOffenceID']),
        CrimeMajorHeadID=parse_int(row['CrimeMajorHeadID']),
        CrimeMinorHeadID=parse_int(row['CrimeMinorHeadID']),
        CaseStatusID=parse_int(row['CaseStatusID']),
        CourtID=parse_int(row['CourtID']),
        IncidentFromDate=parse_dt(row['IncidentFromDate']),
        IncidentToDate=parse_dt(row['IncidentToDate']),
        InfoReceivedPSDate=parse_dt(row['InfoReceivedPSDate']),
        latitude=parse_float(row['latitude']),
        longitude=parse_float(row['longitude']),
        BriefFacts=row['BriefFacts']
    )

def map_accused(row):
    def parse_int(val):
        if not val or val.strip() == '' or val == 'nan':
            return None
        try:
            return int(float(val.strip()))
        except ValueError:
            return None

    return Accused(
        AccusedMasterID=int(row['AccusedMasterID']),
        CaseMasterID=int(row['CaseMasterID']),
        AccusedName=row['AccusedName'],
        AgeYear=parse_int(row['AgeYear']),
        GenderID=parse_int(row['GenderID']),
        PersonID=parse_int(row['PersonID']),
        Occupation=row['Occupation'],
        Address=row['Address'],
        CriminalProfileID=parse_int(row['CriminalProfileID']),
        GangID=parse_int(row['GangID']),
        IsRepeatOffender=parse_int(row['IsRepeatOffender'])
    )

def map_victim(row):
    def parse_int(val):
        if not val or val.strip() == '' or val == 'nan':
            return None
        try:
            return int(float(val.strip()))
        except ValueError:
            return None

    return Victim(
        VictimMasterID=int(row['VictimMasterID']),
        CaseMasterID=int(row['CaseMasterID']),
        VictimName=row['VictimName'],
        AgeYear=parse_int(row['AgeYear']),
        GenderID=parse_int(row['GenderID']),
        VictimPolice=parse_int(row['VictimPolice']),
        Occupation=row['Occupation'],
        Address=row['Address'],
        InjurySeverity=row['InjurySeverity'],
        RelationshipToAccused=row['RelationshipToAccused'],
        VictimProfileID=parse_int(row['VictimProfileID']),
        IsRepeatVictim=parse_int(row['IsRepeatVictim'])
    )

def map_evidence(row):
    def parse_dt(dt_str):
        if not dt_str or dt_str.strip() == '' or dt_str == 'nan':
            return None
        try:
            return datetime.strptime(dt_str.strip(), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                return datetime.strptime(dt_str.strip(), "%Y-%m-%d")
            except ValueError:
                return None

    return Evidence(
        EvidenceID=int(row['EvidenceID']),
        CaseMasterID=int(row['CaseMasterID']),
        EvidenceType=row['EvidenceType'],
        Description=row['Description'],
        CollectionDate=parse_dt(row['CollectionDate'])
    )

def map_vehicle(row):
    return Vehicle(
        VehicleID=int(row['VehicleID']),
        CaseMasterID=int(row['CaseMasterID']),
        RegistrationNumber=row['RegistrationNumber'],
        VehicleType=row['VehicleType'],
        Make=row['Make'],
        Model=row['Model'],
        Color=row['Color'],
        InvolvementRole=row['InvolvementRole']
    )


# --- Orchestrated Seeding Pipeline ---

def seed_database(db: Session):
    """
    Executes the seeding pipeline in strict topological order to respect foreign key constraints.
    """
    # 1. Independent Master Tables
    seed_table(db, District, "District.csv", map_district)
    seed_table(db, CrimeType, "CrimeType.csv", map_crime_type)
    
    # 2. Level 1 Dependencies
    seed_table(db, PoliceStation, "PoliceStation.csv", map_police_station)
    seed_table(db, CrimeSubType, "CrimeSubType.csv", map_crime_sub_type)
    
    # 3. Level 2 Dependencies (Officer depends on PS & District)
    seed_table(db, Officer, "Officer.csv", map_officer)
    
    # 4. CaseMaster (Core Entity)
    seed_table(db, CaseMaster, "CaseMaster.csv", map_case_master)
    
    # 5. Child Entities dependent on CaseMaster
    seed_table(db, Accused, "Accused.csv", map_accused)
    seed_table(db, Victim, "Victim.csv", map_victim)
    seed_table(db, Evidence, "Evidence.csv", map_evidence)
    seed_table(db, Vehicle, "Vehicle.csv", map_vehicle)
