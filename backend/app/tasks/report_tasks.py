import logging
from datetime import datetime, timezone
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.case_master import CaseMaster
from app.models.report_job import ReportJob

logger = logging.getLogger("ksp_backend")

@celery_app.task(name="app.tasks.report_tasks.generate_pdf_report_task")
def generate_pdf_report_task(report_job_id: int):
    """
    Generates a structured analytical case report dossier using WeasyPrint,
    saves the PDF bytes directly in the database, and marks the status as completed.
    """
    db = SessionLocal()
    try:
        report_job = db.query(ReportJob).filter(ReportJob.ReportJobID == report_job_id).first()
        if not report_job:
            logger.error(f"Report job #{report_job_id} not found in database.")
            return

        case = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == report_job.CaseMasterID).first()
        if not case:
            logger.error(f"Case #{report_job.CaseMasterID} not found for report job #{report_job_id}.")
            report_job.Status = "failed"
            db.commit()
            return

        logger.info(f"Generating PDF for Case ID: {case.CaseMasterID}...")

        # Construct a clean, professional HTML dossier
        accused_rows = "".join([
            f"<tr><td>{a.AccusedName or 'N/A'}</td><td>{a.Age or 'N/A'}</td><td>{a.Sex or 'N/A'}</td><td>{a.CurrentStatus or 'N/A'}</td></tr>"
            for a in case.accused_list
        ])
        
        evidence_rows = "".join([
            f"<tr><td>{e.EvidenceType or 'N/A'}</td><td>{e.Description or 'N/A'}</td><td>{e.CollectedDate.strftime('%Y-%m-%d') if e.CollectedDate else 'N/A'}</td></tr>"
            for e in case.evidence_items
        ])

        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }}
                h1 {{ font-size: 24px; color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 20px; }}
                h2 {{ font-size: 16px; color: #1e3a8a; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }}
                .meta-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
                .meta-table th, .meta-table td {{ border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }}
                .meta-table th {{ bg-color: #f8fafc; font-weight: bold; width: 30%; }}
                .facts {{ background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; font-size: 12px; margin-bottom: 25px; }}
                table.data-table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                table.data-table th, table.data-table td {{ border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 11px; }}
                table.data-table th {{ background: #f1f5f9; font-weight: bold; }}
            </style>
        </head>
        <body>
            <h1>KARNATAKA STATE POLICE — CASE DOSSIER</h1>
            <table class="meta-table">
                <tr><th>Case Number</th><td>{case.CaseNo or "N/A"}</td></tr>
                <tr><th>Date of Registration</th><td>{case.CrimeRegisteredDate.strftime('%Y-%m-%d %H:%M:%S') if case.CrimeRegisteredDate else "N/A"}</td></tr>
                <tr><th>AI Risk Score</th><td>{f"{case.AIRiskScore:.2f}" if case.AIRiskScore else "N/A"}</td></tr>
                <tr><th>Investigation Priority</th><td>{case.InvestigationPriority or "N/A"}</td></tr>
            </table>

            <h2>Incident Brief Facts</h2>
            <div class="facts">
                {case.BriefFacts or "No details recorded."}
            </div>

            <h2>Accused Profiles</h2>
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Age</th><th>Sex</th><th>Current Status</th></tr>
                </thead>
                <tbody>
                    {accused_rows or '<tr><td colspan="4" style="text-align:center;">No accused listed.</td></tr>'}
                </tbody>
            </table>

            <h2>Collected Evidence Logs</h2>
            <table class="data-table">
                <thead>
                    <tr><th>Type</th><th>Description</th><th>Collected Date</th></tr>
                </thead>
                <tbody>
                    {evidence_rows or '<tr><td colspan="3" style="text-align:center;">No evidence items registered.</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
        """
        
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        report_job.PDFBytes = pdf_bytes
        report_job.Status = "completed"
        # Generate link path dynamically
        report_job.PDFUrl = f"/api/v1/reports/jobs/{report_job_id}/download"
        db.commit()
        logger.info(f"Successfully generated PDF for Case ID: {case.CaseMasterID}")

    except Exception as e:
        logger.error(f"Error in generate_pdf_report_task: {e}", exc_info=True)
        if 'report_job' in locals() and report_job:
            report_job.Status = "failed"
            db.commit()
    finally:
        db.close()
