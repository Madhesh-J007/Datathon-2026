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
from app.models.user import User
from app.core.security import hash_password
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission

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
        BriefFacts=row['BriefFacts'],
        InvestigationPriority="High" if row.get('RiskLabel') == "High" else ("Low" if row.get('RiskLabel') == "Low" else "Medium"),
        AIRiskScore=0.85 if row.get('RiskLabel') == "High" else (0.25 if row.get('RiskLabel') == "Low" else 0.55)
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


def seed_officers(db: Session):
    """
    Seeds the officer table from Officer.csv. Also generates placeholder officer records
    for IDs 586 through 3205 to satisfy foreign key references in CaseMaster.csv.
    """
    if db.query(Officer).first() is not None:
        logger.info("Table 'officer' is already seeded.")
        return

    csv_path = "/database/seeds/data/Officer.csv"
    if not os.path.exists(csv_path):
        logger.warning(f"Seed file not found at {csv_path}. Skipping.")
        return

    # Query a valid police station and district to use as fallbacks for placeholders
    first_ps = db.query(PoliceStation).first()
    if not first_ps:
        logger.error("Cannot seed officers: police_station table is empty!")
        return

    default_ps_id = first_ps.UnitID
    default_district_id = first_ps.DistrictID

    logger.info(f"Seeding 'officer' from {csv_path}...")
    try:
        objects_to_insert = []
        existing_ids = set()
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                obj = map_officer(row)
                if obj:
                    objects_to_insert.append(obj)
                    existing_ids.add(obj.OfficerID)

        # Generate placeholders for referenced IDs in CaseMaster up to 3205
        placeholders_count = 0
        for officer_id in range(1, 3205):
            if officer_id not in existing_ids:
                placeholder = Officer(
                    OfficerID=officer_id,
                    PoliceStationID=default_ps_id,
                    DistrictID=default_district_id,
                    Name=f"Placeholder Officer #{officer_id}",
                    Gender="Male",
                    Rank="Sub-Inspector",
                    BadgeNumber=f"P-{officer_id}",
                    YearsOfService=5,
                    AssignedCaseCount=0
                )
                objects_to_insert.append(placeholder)
                placeholders_count += 1

        db.bulk_save_objects(objects_to_insert)
        db.commit()
        logger.info(f"Successfully seeded {len(objects_to_insert)} officers ({placeholders_count} placeholders)!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding 'officer': {e}")


def seed_roles_and_permissions(db: Session):
    """
    Seeds core RBAC roles, permissions, and grants permissions to roles.
    """
    if db.query(Role).first() is not None:
        logger.info("Table 'roles' is already seeded.")
        return

    logger.info("Seeding roles and permissions...")
    try:
        # 1. Create Roles
        admin_role = Role(RoleName="Admin", Description="Super Administrator with full statewide scope and access.")
        scrb_role = Role(RoleName="SCRB_Officer", Description="State Crime Records Bureau officer with statewide read scope.")
        sho_role = Role(RoleName="SHO", Description="Station House Officer scoped to police station jurisdiction.")
        constable_role = Role(RoleName="Constable", Description="Beat constable scoped to police station jurisdiction.")

        db.add_all([admin_role, scrb_role, sho_role, constable_role])
        db.flush()  # Flush to populate RoleIDs

        # 2. Create Permissions
        permissions = {
            "cases:read": Permission(PermissionCode="cases:read", Description="Allow reading case file registries."),
            "cases:create": Permission(PermissionCode="cases:create", Description="Allow registering new crime cases."),
            "cases:update": Permission(PermissionCode="cases:update", Description="Allow updating existing crime cases."),
            "cases:delete": Permission(PermissionCode="cases:delete", Description="Allow soft deleting crime cases."),
            "cases:annotate": Permission(PermissionCode="cases:annotate", Description="Allow writing case journal annotations."),
            "users:manage": Permission(PermissionCode="users:manage", Description="Allow managing user accounts, roles, and boundaries.")
        }
        db.add_all(permissions.values())
        db.flush()

        # 3. Grant Permissions to Roles
        # SCRB_Officer gets read permission
        db.add(RolePermission(RoleID=scrb_role.RoleID, PermissionID=permissions["cases:read"].PermissionID))
        
        # SHO gets read, create, update, annotate
        db.add_all([
            RolePermission(RoleID=sho_role.RoleID, PermissionID=permissions["cases:read"].PermissionID),
            RolePermission(RoleID=sho_role.RoleID, PermissionID=permissions["cases:create"].PermissionID),
            RolePermission(RoleID=sho_role.RoleID, PermissionID=permissions["cases:update"].PermissionID),
            RolePermission(RoleID=sho_role.RoleID, PermissionID=permissions["cases:annotate"].PermissionID),
        ])

        # Constable gets read, annotate
        db.add_all([
            RolePermission(RoleID=constable_role.RoleID, PermissionID=permissions["cases:read"].PermissionID),
            RolePermission(RoleID=constable_role.RoleID, PermissionID=permissions["cases:annotate"].PermissionID),
        ])

        db.commit()
        logger.info("Successfully seeded roles, permissions, and role-permission junctions!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding roles and permissions: {e}")


def seed_users(db: Session):
    """
    Seeds and permanently updates default officer user accounts.
    """
    from app.models.officer import Officer

    admin_role = db.query(Role).filter(Role.RoleName == "Admin").first()
    scrb_role = db.query(Role).filter(Role.RoleName == "SCRB_Officer").first()
    sho_role = db.query(Role).filter(Role.RoleName == "SHO").first()
    constable_role = db.query(Role).filter(Role.RoleName == "Constable").first()
    ext_role = db.query(Role).filter(Role.RoleName == "ExternalAgencyOfficer").first()

    preset_users = [
        ("ksp_admin", "change_me", "admin@ksp.gov.in", admin_role.RoleID if admin_role else 1, "System Administrator"),
        ("Bharathvaj", "change_me", "bharathvaj@ksp.gov.in", scrb_role.RoleID if scrb_role else 2, "DGP — Director General of Police"),
        ("ramesh", "change_me", "ramesh@ksp.gov.in", scrb_role.RoleID if scrb_role else 2, "SP — Superintendent of Police"),
        ("dysp_officer", "change_me", "dysp@ksp.gov.in", scrb_role.RoleID if scrb_role else 2, "DySP — Deputy Superintendent of Police"),
        ("pi_officer", "change_me", "pi@ksp.gov.in", sho_role.RoleID if sho_role else 3, "PI — Police Inspector"),
        ("sho_officer", "change_me", "si@ksp.gov.in", sho_role.RoleID if sho_role else 3, "PSI — Sub Inspector of Police"),
        ("constable_officer", "change_me", "asi@ksp.gov.in", constable_role.RoleID if constable_role else 4, "ASI — Assistant Sub Inspector"),
        ("suda", "change_me", "suda@ksp.gov.in", constable_role.RoleID if constable_role else 4, "PC — Police Constable"),
        ("cbi_sp_verma", "cbi@password2026", "verma@cbi.gov.in", ext_role.RoleID if ext_role else 5, "SP — Central Bureau of Investigation"),
        ("fsl_dna_sunita", "fsl@password2026", "sunita@fsl.gov.in", ext_role.RoleID if ext_role else 5, "FSL — Forensic Science Specialist"),
        ("ed_jd_hegde", "ed@password2026", "hegde@ed.gov.in", ext_role.RoleID if ext_role else 5, "JD — Enforcement Directorate"),
    ]

    logger.info("Seeding and syncing preset officer user accounts...")
    try:
        for username, password, email, role_id, rank_title in preset_users:
            # Create or update Officer record
            badge_code = f"KSP-{username.upper()[:6]}"
            off = db.query(Officer).filter(Officer.Name == username).first()
            if not off:
                off = Officer(BadgeNumber=badge_code, Name=username, Rank=rank_title, AssignedCaseCount=0)
                db.add(off)
                db.commit()
                db.refresh(off)
            else:
                off.Rank = rank_title
                db.commit()

            # Create or permanently update User record
            u = db.query(User).filter(User.Username.ilike(username)).first()
            if not u:
                u = User(
                    Username=username,
                    PasswordHash=hash_password(password),
                    Email=email,
                    OfficerID=off.OfficerID if off else None,
                    RoleID=role_id,
                    IsActive=True
                )
                db.add(u)
            else:
                u.PasswordHash = hash_password(password)
                u.Email = email
                u.RoleID = role_id
                if off:
                    u.OfficerID = off.OfficerID
                u.IsActive = True
        db.commit()
        logger.info("Successfully seeded and permanently updated preset officer user accounts!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding user accounts: {e}")

def reset_db_sequences(db: Session):
    """
    Resets PostgreSQL auto-increment sequences to MAX(id) + 1 to prevent IntegrityErrors
    after bulk seeding with explicit IDs.
    """
    logger.info("Resetting database auto-increment sequences...")
    # Dictionary mapping sequence name to (table, column)
    seqs = {
        "district_DistrictID_seq": ("district", "DistrictID"),
        "crime_type_CrimeHeadID_seq": ("crime_type", "CrimeHeadID"),
        "roles_RoleID_seq": ("roles", "RoleID"),
        "permissions_PermissionID_seq": ("permissions", "PermissionID"),
        "unit_type_UnitTypeID_seq": ("unit_type", "UnitTypeID"),
        "case_category_CaseCategoryID_seq": ("case_category", "CaseCategoryID"),
        "gravity_offence_GravityOffenceID_seq": ("gravity_offence", "GravityOffenceID"),
        "case_status_master_CaseStatusID_seq": ("case_status_master", "CaseStatusID"),
        "act_ActCode_seq": ("act", "ActCode"),
        "police_station_UnitID_seq": ("police_station", "UnitID"),
        "crime_sub_type_CrimeSubHeadID_seq": ("crime_sub_type", "CrimeSubHeadID"),
        "section_SectionID_seq": ("section", "SectionID"),
        "officer_OfficerID_seq": ("officer", "OfficerID"),
        "users_UserID_seq": ("users", "UserID"),
        "case_master_CaseMasterID_seq": ("case_master", "CaseMasterID"),
        "user_jurisdictions_UserJurisdictionID_seq": ("user_jurisdictions", "UserJurisdictionID"),
        "criminal_relationships_RelationshipID_seq": ("criminal_relationships", "RelationshipID"),
        "audit_log_AuditLogID_seq": ("audit_log", "AuditLogID"),
        "accused_AccusedMasterID_seq": ("accused", "AccusedMasterID"),
        "victim_VictimMasterID_seq": ("victim", "VictimMasterID"),
        "evidence_EvidenceID_seq": ("evidence", "EvidenceID"),
        "vehicle_VehicleID_seq": ("vehicle", "VehicleID"),
        "witness_WitnessMasterID_seq": ("witness", "WitnessMasterID"),
        "case_assignments_CaseAssignmentID_seq": ("case_assignments", "CaseAssignmentID"),
        "case_annotations_AnnotationID_seq": ("case_annotations", "AnnotationID"),
        "case_embedding_EmbeddingID_seq": ("case_embedding", "EmbeddingID")
    }
    
    from sqlalchemy import text
    try:
        for seq, (table, col) in seqs.items():
            max_val_query = db.execute(text(f'SELECT MAX("{col}") FROM "{table}"'))
            max_val = max_val_query.scalar()
            if max_val is not None:
                db.execute(text(f'SELECT setval(\'"{seq}"\', {max_val}, true)'))
        db.commit()
        logger.info("Successfully reset all auto-increment sequences!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting sequences: {e}")


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
    seed_officers(db)
    
    # 4. CaseMaster (Core Entity)
    seed_table(db, CaseMaster, "CaseMaster.csv", map_case_master)
    
    # 5. Child Entities dependent on CaseMaster
    seed_table(db, Accused, "Accused.csv", map_accused)
    seed_table(db, Victim, "Victim.csv", map_victim)
    seed_table(db, Evidence, "Evidence.csv", map_evidence)
    seed_table(db, Vehicle, "Vehicle.csv", map_vehicle)
    
    # 6. Default Roles & Identity Seeding
    seed_roles_and_permissions(db)
    seed_users(db)

    # 7. Sync Auto-increment Sequences
    reset_db_sequences(db)
