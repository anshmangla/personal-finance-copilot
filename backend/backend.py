import os
import io
import csv
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fpdf import FPDF

from database import get_db, init_db
from models import User
from auth import verify_google_token, create_access_token, get_current_user, get_user_from_header_or_query
import db_services
from agent import ask_agent
from utils import get_summary

app = FastAPI(title="Finance Copilot API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# ---------------- REQUEST MODELS ---------------- #

class GoogleAuthReq(BaseModel):
    id_token: str

class DevLoginReq(BaseModel):
    email: Optional[str] = "test@financecopilot.com"
    name: Optional[str] = "Test User"

class TransactionReq(BaseModel):
    amount: float
    merchant: str
    category: str
    type: str = "debit"
    date: Optional[str] = None

class EditTransactionReq(BaseModel):
    id: str
    amount: float
    merchant: str
    category: str
    type: str = "debit"
    date: Optional[str] = None

class SubscriptionReq(BaseModel):
    name: str
    amount: float
    category: str
    billing_cycle: str
    next_payment_date: str

class EditSubscriptionReq(BaseModel):
    id: str
    name: str
    amount: float
    category: str
    billing_cycle: str
    next_payment_date: str

class BudgetReq(BaseModel):
    category: str
    limit: float

class GoalReq(BaseModel):
    goal: str

class ChatReq(BaseModel):
    query: str

# ---------------- AUTH ENDPOINTS ---------------- #

@app.post("/auth/google")
def google_auth(req: GoogleAuthReq, db: Session = Depends(get_db)):
    profile = verify_google_token(req.id_token)
    email = profile["email"]
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=profile.get("name"),
            picture=profile.get("picture")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name or picture if changed
        if profile.get("name"):
            user.name = profile["name"]
        if profile.get("picture"):
            user.picture = profile["picture"]
        db.commit()

    token = create_access_token(data={"sub": user.id, "email": user.email})
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    }

@app.post("/auth/dev_login")
def dev_login(req: DevLoginReq, db: Session = Depends(get_db)):
    """Development shortcut to generate a token without Google OAuth credentials."""
    email = req.email or "test@financecopilot.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=req.name or "Test User")
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": user.id, "email": user.email})
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    }

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "status": "success",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "picture": current_user.picture
        }
    }

# ---------------- TRANSACTIONS ---------------- #

@app.post("/add_transaction")
def add_transaction_endpoint(
    req: TransactionReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_tx = db_services.add_transaction(
        db, current_user.id, req.amount, req.merchant, req.category, req.type, req.date
    )
    return {"status": "success", "message": "Transaction saved", "transaction": new_tx}

@app.put("/edit_transaction")
def edit_transaction_endpoint(
    req: EditTransactionReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = db_services.edit_transaction(
        db, current_user.id, req.id, req.amount, req.merchant, req.category, req.type, req.date
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "success", "message": "Transaction updated", "transaction": updated}

@app.delete("/delete_transaction/{tx_id}")
def delete_transaction_endpoint(
    tx_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = db_services.delete_transaction(db, current_user.id, tx_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "success", "message": "Transaction deleted"}

# ---------------- SUBSCRIPTIONS ---------------- #

@app.get("/subscriptions")
def get_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    df = db_services.get_subscriptions_df(db, current_user.id)
    return {"status": "success", "data": df.to_dict(orient="records")}

@app.post("/add_subscription")
def add_subscription_endpoint(
    req: SubscriptionReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_sub = db_services.add_subscription(
        db, current_user.id, req.name, req.amount, req.category, req.billing_cycle, req.next_payment_date
    )
    return {"status": "success", "message": "Subscription saved", "subscription": new_sub}

@app.put("/edit_subscription")
def edit_subscription_endpoint(
    req: EditSubscriptionReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = db_services.edit_subscription(
        db, current_user.id, req.id, req.name, req.amount, req.category, req.billing_cycle, req.next_payment_date
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "message": "Subscription updated", "subscription": updated}

@app.delete("/delete_subscription/{sub_id}")
def delete_subscription_endpoint(
    sub_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = db_services.delete_subscription(db, current_user.id, sub_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "message": "Subscription deleted"}

# ---------------- SUMMARY & BUDGETS & GOALS ---------------- #

@app.get("/summary")
def summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    df = db_services.get_transactions_df(db, current_user.id)
    upcoming_reminders = db_services.get_upcoming_reminders(db, current_user.id)
    budgets = db_services.get_budgets(db, current_user.id)
    goals = [g["goal_text"] for g in db_services.get_goals(db, current_user.id)]

    data = get_summary(
        df,
        upcoming_reminders=upcoming_reminders,
        budgets=budgets,
        goals=goals
    )
    return {"status": "success", "data": data}

@app.get("/budgets")
def budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"status": "success", "data": db_services.get_budgets(db, current_user.id)}

@app.post("/set_budget")
def set_budget_endpoint(
    req: BudgetReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    b = db_services.set_budget(db, current_user.id, req.category, req.limit)
    return {"status": "success", "message": f"Budget set for {req.category}", "data": b}

@app.get("/goals")
def goals_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals_list = [g["goal_text"] for g in db_services.get_goals(db, current_user.id)]
    return {"status": "success", "data": goals_list}

@app.post("/add_goal")
def add_goal_endpoint(
    req: GoalReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    g = db_services.add_goal(db, current_user.id, req.goal)
    goals_list = [item["goal_text"] for item in db_services.get_goals(db, current_user.id)]
    return {"status": "success", "message": "Goal added", "data": goals_list}

@app.delete("/delete_goal/{index}")
def delete_goal_endpoint(
    index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db_services.get_goals(db, current_user.id)
    if index < 0 or index >= len(goals):
        raise HTTPException(status_code=404, detail="Goal not found")
    goal_id = goals[index]["id"]
    db_services.delete_goal(db, current_user.id, goal_id)
    updated_goals = [item["goal_text"] for item in db_services.get_goals(db, current_user.id)]
    return {"status": "success", "message": "Goal deleted", "data": updated_goals}

# ---------------- EXPORT ---------------- #

@app.get("/export/csv")
def export_csv(
    current_user: User = Depends(get_user_from_header_or_query),
    db: Session = Depends(get_db)
):
    df = db_services.get_transactions_df(db, current_user.id)
    output = io.StringIO()
    df.to_csv(output, index=False)
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="transactions.csv"'}
    )

@app.get("/export/pdf")
def export_pdf(
    current_user: User = Depends(get_user_from_header_or_query),
    db: Session = Depends(get_db)
):
    df = db_services.get_transactions_df(db, current_user.id)
    summary_data = get_summary(df)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, f"Personal Finance Summary - {current_user.name or current_user.email}", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Total Spend: Rs. {summary_data['total_spend']:.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Total Income: Rs. {summary_data['total_income']:.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Net Balance: Rs. {summary_data['balance']:.2f}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(10)
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Category Breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 12)
    for cat, amount in summary_data["category_breakdown"].items():
        pdf.cell(0, 8, f"{cat}: Rs. {amount:.2f}", new_x="LMARGIN", new_y="NEXT")

    pdf_bytes = pdf.output()
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="summary_report.pdf"'}
    )

# ---------------- CHAT WITH AI AGENT ---------------- #

@app.post("/chat")
def chat(
    req: ChatReq,
    current_user: User = Depends(get_current_user)
):
    response = ask_agent(req.query, user_id=current_user.id)
    return {"status": "success", "response": response}

@app.get("/")
def home():
    return {"status": "server running", "version": "2.0-postgres"}