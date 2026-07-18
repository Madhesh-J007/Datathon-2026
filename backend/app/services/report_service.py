from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.report_job import ReportJob
from app.models.case_master import CaseMaster
from app.models.user import User
from app.tasks.report_tasks import generate_pdf_report_task
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter

def create_report_job(db: Session, case_id: int, current_user: User) -> ReportJob:
    """
    Creates a pending report job, triggers the Celery worker task, and returns the job.
    """
    case_query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id)
    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    case = case_query.first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or access denied.")

    report_job = ReportJob(
        CaseMasterID=case_id,
        Status="pending"
    )
    db.add(report_job)
    db.commit()
    db.refresh(report_job)

    try:
        generate_pdf_report_task.delay(report_job.ReportJobID)
    except Exception as exc:
        report_job.Status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Celery task runner is offline or unreachable."
        ) from exc

    return report_job

def get_report_job(db: Session, report_job_id: int, current_user: User) -> ReportJob:
    """
    Retrieves the status of a specific report job, verifying row-level access permissions.
    """
    report_job = db.query(ReportJob).filter(ReportJob.ReportJobID == report_job_id).first()
    if not report_job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report job not found.")
    
    # Verify user has access to target case
    case_query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == report_job.CaseMasterID)
    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    if not case_query.first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to case dossier report.")
    
    return report_job

def get_report_history(db: Session, current_user: User) -> list[ReportJob]:
    """
    Retrieves history of generated report jobs whitelisted within the active officer's jurisdiction.
    """
    query = db.query(ReportJob).join(CaseMaster)
    query = apply_jurisdiction_filter(query, db, current_user, model_class=CaseMaster)
    return query.order_by(ReportJob.CompiledAt.desc()).all()
