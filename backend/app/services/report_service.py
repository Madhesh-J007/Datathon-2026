from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.report_job import ReportJob
from app.models.case_master import CaseMaster
from app.models.user import User
from app.tasks.report_tasks import generate_pdf_report_task
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter

def create_report_job(db: Session, case_input: str | int, current_user: User) -> ReportJob:
    """
    Creates a pending report job for the officer, supporting search by Case Master ID or Case No.
    """
    case_query = db.query(CaseMaster)
    
    input_str = str(case_input).strip()
    if input_str.isdigit():
        case_id_val = int(input_str)
        case_query = case_query.filter(or_(CaseMaster.CaseMasterID == case_id_val, CaseMaster.CaseNo == input_str, CaseMaster.CaseNo.ilike(f"%{input_str}%")))
    else:
        case_query = case_query.filter(CaseMaster.CaseNo.ilike(f"%{input_str}%"))

    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    case = case_query.first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case matching '{case_input}' was not found or access denied."
        )

    report_job = ReportJob(
        CaseMasterID=case.CaseMasterID,
        Status="pending",
        CreatedBy=current_user.UserID
    )
    db.add(report_job)
    db.commit()
    db.refresh(report_job)

    try:
        generate_pdf_report_task(report_job.ReportJobID)
    except Exception as exc:
        logger.error(f"Failed to compile PDF report: {exc}")
        report_job.Status = "failed"
        db.commit()

    db.refresh(report_job)
    return report_job

def get_report_job(db: Session, report_job_id: int, current_user: User) -> ReportJob:
    """
    Retrieves the status of a specific report job, verifying row-level access permissions.
    """
    report_job = db.query(ReportJob).filter(ReportJob.ReportJobID == report_job_id).first()
    if not report_job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report job not found.")
    
    # Verify user owns the job or has access to target case
    if report_job.CreatedBy and report_job.CreatedBy != current_user.UserID and current_user.Role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. This report was requested by another officer.")

    case_query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == report_job.CaseMasterID)
    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    if not case_query.first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to case dossier report.")
    
    return report_job

def get_report_history(db: Session, current_user: User) -> list[ReportJob]:
    """
    Retrieves history of generated report jobs compiled within the officer's jurisdiction scope.
    """
    query = db.query(ReportJob).join(CaseMaster)
    query = apply_jurisdiction_filter(query, db, current_user, model_class=CaseMaster)
    return query.order_by(ReportJob.CompiledAt.desc()).all()
