from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.officer import Officer
from app.models.case_master import CaseMaster
from app.models.task_delegation import TaskDelegation, TaskTimelineEvent
from app.schemas.task_delegation import TaskCreate, TaskStatusUpdate, TaskDelegationOut, TaskTimelineEventOut

router = APIRouter()

def build_task_out(db: Session, task: TaskDelegation) -> TaskDelegationOut:
    by_user = db.query(User).filter(User.UserID == task.AssignedByUserID).first()
    to_user = db.query(User).filter(User.UserID == task.AssignedToUserID).first()
    
    by_officer = db.query(Officer).filter(Officer.OfficerID == by_user.OfficerID).first() if by_user and by_user.OfficerID else None
    to_officer = db.query(Officer).filter(Officer.OfficerID == to_user.OfficerID).first() if to_user and to_user.OfficerID else None
    
    case_obj = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == task.CaseMasterID).first() if task.CaseMasterID else None

    timeline_outs = []
    for ev in task.timeline_events:
        ev_user = db.query(User).filter(User.UserID == ev.UpdatedByUserID).first()
        timeline_outs.append(TaskTimelineEventOut(
            EventID=ev.EventID,
            TaskID=ev.TaskID,
            Status=ev.Status,
            Note=ev.Note,
            UpdatedByUserID=ev.UpdatedByUserID,
            UpdatedByUsername=ev_user.Username if ev_user else "System",
            Timestamp=ev.Timestamp
        ))

    return TaskDelegationOut(
        TaskID=task.TaskID,
        Title=task.Title,
        Description=task.Description,
        CaseMasterID=task.CaseMasterID,
        CaseNo=case_obj.CaseNo if case_obj else None,
        AssignedByUserID=task.AssignedByUserID,
        AssignedByUsername=by_user.Username if by_user else "Superior Officer",
        AssignedByRank=by_officer.Rank if by_officer else "Senior Command",
        AssignedToUserID=task.AssignedToUserID,
        AssignedToUsername=to_user.Username if to_user else "Assigned Officer",
        AssignedToRank=to_officer.Rank if to_officer else "Officer",
        DistrictID=task.DistrictID,
        UnitID=task.UnitID,
        Priority=task.Priority,
        Status=task.Status,
        DueDate=task.DueDate,
        CreatedAt=task.CreatedAt,
        UpdatedAt=task.UpdatedAt,
        timeline_events=timeline_outs
    )


@router.post("/", response_model=TaskDelegationOut, status_code=status.HTTP_201_CREATED, summary="Appoint Task to Subordinate Officer")
def appoint_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Superior officer appoints a new task for a subordinate officer.
    """
    new_task = TaskDelegation(
        Title=task_in.Title,
        Description=task_in.Description,
        CaseMasterID=task_in.CaseMasterID,
        AssignedByUserID=current_user.UserID,
        AssignedToUserID=task_in.AssignedToUserID,
        DistrictID=task_in.DistrictID,
        UnitID=task_in.UnitID,
        Priority=task_in.Priority,
        Status="Assigned",
        DueDate=task_in.DueDate
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Initial timeline event
    init_event = TaskTimelineEvent(
        TaskID=new_task.TaskID,
        Status="Assigned",
        Note=f"Task appointed by {current_user.Username}",
        UpdatedByUserID=current_user.UserID
    )
    db.add(init_event)
    db.commit()
    db.refresh(new_task)

    return build_task_out(db, new_task)


@router.get("/assigned-by-me", response_model=List[TaskDelegationOut], summary="Get Tasks Appointed By Me")
def get_tasks_assigned_by_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves all tasks appointed by the current superior officer.
    """
    tasks = db.query(TaskDelegation).filter(TaskDelegation.AssignedByUserID == current_user.UserID).order_by(TaskDelegation.CreatedAt.desc()).all()
    return [build_task_out(db, t) for t in tasks]


@router.get("/assigned-to-me", response_model=List[TaskDelegationOut], summary="Get My Assigned Tasks")
def get_tasks_assigned_to_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves all tasks assigned to the current officer for execution.
    """
    tasks = db.query(TaskDelegation).filter(TaskDelegation.AssignedToUserID == current_user.UserID).order_by(TaskDelegation.CreatedAt.desc()).all()
    return [build_task_out(db, t) for t in tasks]


@router.put("/{task_id}/status", response_model=TaskDelegationOut, summary="Update Task Execution Status")
def update_task_status(
    task_id: int,
    status_in: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Updates the task status (e.g. In Progress, Evidence Collected, Completed) and appends a step to the timeline.
    """
    task = db.query(TaskDelegation).filter(TaskDelegation.TaskID == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.Status = status_in.Status
    db.commit()

    # Append timeline event
    ev = TaskTimelineEvent(
        TaskID=task.TaskID,
        Status=status_in.Status,
        Note=status_in.Note or f"Status updated to {status_in.Status}",
        UpdatedByUserID=current_user.UserID
    )
    db.add(ev)
    db.commit()
    db.refresh(task)

    return build_task_out(db, task)


@router.get("/subordinate-officers", summary="List Available Officers for Task Assignment")
def get_subordinate_officers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves list of officers available for assignment.
    """
    users = db.query(User).filter(User.UserID != current_user.UserID, User.IsActive == True).all()
    officers_list = []
    for u in users:
        off = db.query(Officer).filter(Officer.OfficerID == u.OfficerID).first() if u.OfficerID else None
        officers_list.append({
            "UserID": u.UserID,
            "Username": u.Username,
            "RoleName": u.role.RoleName if u.role else "Officer",
            "Rank": off.Rank if off else "KSP Officer",
            "BadgeNumber": off.BadgeNumber if off else "N/A"
        })
    return officers_list
