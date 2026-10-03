import os
import io
import csv
import tempfile
from typing import Optional
from datetime import datetime
import matplotlib.pyplot as plt

from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fpdf import FPDF
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import get_db, init_db
from models import User
from auth import verify_google_token, create_access_token, get_current_user, get_user_from_header_or_query
import db_services
from agent import ask_agent, clear_agent_memory
from utils import get_summary, get_fast_summary
import ocr_service

app = FastAPI(title="Finance Copilot API")

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's a mobile app, any origin is fine, but credentials should be false for wildcard
    allow_credentials=False,
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
    amount: float = Field(..., gt=0)
    merchant: str = Field(..., max_length=255)
    category: str = Field(..., max_length=100)
    type: str = Field(default="debit", pattern="^(debit|credit)$")
    date: Optional[str] = Field(default=None, max_length=20)

class EditTransactionReq(BaseModel):
    id: str
    amount: float = Field(..., gt=0)
    merchant: str = Field(..., max_length=255)
    category: str = Field(..., max_length=100)
    type: str = Field(default="debit", pattern="^(debit|credit)$")
    date: Optional[str] = Field(default=None, max_length=20)

class SubscriptionReq(BaseModel):
    name: str = Field(..., max_length=255)
    amount: float = Field(..., gt=0)
    category: str = Field(..., max_length=100)
    billing_cycle: str = Field(..., pattern="^(monthly|yearly)$")
    next_payment_date: str = Field(..., max_length=20)

class EditSubscriptionReq(BaseModel):
    id: str
    name: str = Field(..., max_length=255)
    amount: float = Field(..., gt=0)
    category: str = Field(..., max_length=100)
    billing_cycle: str = Field(..., pattern="^(monthly|yearly)$")
    next_payment_date: str = Field(..., max_length=20)

class BudgetReq(BaseModel):
    category: str = Field(..., max_length=100)
    limit: float = Field(..., gt=0)

class GoalReq(BaseModel):
    goal: str = Field(..., max_length=500)

class ChatReq(BaseModel):
    query: str = Field(..., max_length=2000)

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
    """Development shortcut to generate a token without Google OAuth credentials.
    Disabled in production mode.
    """
    env = os.getenv("ENVIRONMENT", "development").strip().lower()
    if env == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled in production environment."
        )

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

@app.post("/scan_receipt")
@limiter.limit("5/minute")
async def scan_receipt(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    content_type = file.content_type or ""
    filename = (file.filename or "").lower()
    is_image = content_type.startswith("image/") or any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp"])
    if not is_image and content_type != "application/octet-stream":
        raise HTTPException(status_code=400, detail=f"File must be an image. Received content-type: {file.content_type}")
        
    try:
        # Prevent OOM by strictly limiting file size to 5MB chunk by chunk
        file_bytes = b""
        MAX_FILE_SIZE = 5 * 1024 * 1024
        
        while chunk := await file.read(1024 * 1024):  # read 1MB at a time
            file_bytes += chunk
            if len(file_bytes) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
                
        parsed_data = ocr_service.scan_receipt_image(file_bytes)
        return {
            "status": "success",
            "data": parsed_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"OCR Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/pay_subscription/{sub_id}")
def pay_subscription_endpoint(
    sub_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = db_services.mark_subscription_paid(db, current_user.id, sub_id)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {
        "status": "success",
        "message": f"Subscription '{result['subscription']['name']}' marked as paid.",
        "data": result
    }


# ---------------- SUMMARY & BUDGETS & GOALS ---------------- #

@app.get("/summary")
def summary(
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    txs = db_services.get_transactions(db, current_user.id, month=month)
    available_months = db_services.get_available_months(db, current_user.id)
    upcoming_reminders = db_services.get_upcoming_reminders(db, current_user.id)
    budgets = db_services.get_budgets(db, current_user.id)
    goals = [g["goal_text"] for g in db_services.get_goals(db, current_user.id)]

    data = get_fast_summary(
        txs,
        upcoming_reminders=upcoming_reminders,
        budgets=budgets,
        goals=goals
    )
    data["available_months"] = available_months
    return {"status": "success", "data": data}

@app.get("/budgets")
def budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"status": "success", "data": db_services.get_budgets(db, current_user.id)}

@app.get("/months")
def get_months(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {"status": "success", "data": db_services.get_available_months(db, current_user.id)}

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

@app.get("/export/excel")
def export_excel(
    month: Optional[str] = None,
    current_user: User = Depends(get_user_from_header_or_query),
    db: Session = Depends(get_db)
):
    df = db_services.get_transactions_df(db, current_user.id, month=month)
    
    # Sanitize dataframe to prevent CSV/Excel Formula Injection
    def sanitize_val(val):
        if isinstance(val, str) and val and val[0] in ('=', '+', '-', '@', '\t', '\r'):
            return "'" + val
        return val
        
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(sanitize_val)
        
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Sheet 1: Dashboard
        summary_data = get_summary(df)
        summary_df = pd.DataFrame({
            "Metric": ["Total Spend", "Total Income", "Net Balance"],
            "Amount": [summary_data.get("total_spend", 0), summary_data.get("total_income", 0), summary_data.get("balance", 0)]
        })
        summary_df.to_excel(writer, sheet_name="Dashboard", index=False)
        
        # Sheet 2: Transactions
        df.to_excel(writer, sheet_name="Transactions", index=False)
        
        
        
        
        

    excel_bytes = output.getvalue()
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="finance_export.xlsx"'}
    )

@app.get("/export/pdf")
def export_pdf(
    month: Optional[str] = None,
    current_user: User = Depends(get_user_from_header_or_query),
    db: Session = Depends(get_db)
):
    df = db_services.get_transactions_df(db, current_user.id, month=month)
    summary_data = get_summary(df)

    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(0, 51, 102)
    period_str = f" ({month})" if month else ""
    pdf.cell(0, 10, f"Financial Statement{period_str}: {current_user.name or current_user.email}", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Metrics Grid
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(0, 102, 204)
    
    pdf.cell(63, 10, "Total Income", border=1, align="C", fill=True)
    pdf.cell(63, 10, "Total Spend", border=1, align="C", fill=True)
    pdf.cell(63, 10, "Net Balance", border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(0, 0, 0)
    pdf.set_fill_color(245, 245, 245)
    
    pdf.cell(63, 10, f"Rs. {summary_data.get('total_income', 0):,.2f}", border=1, align="C", fill=True)
    pdf.cell(63, 10, f"Rs. {summary_data.get('total_spend', 0):,.2f}", border=1, align="C", fill=True)
    pdf.cell(63, 10, f"Rs. {summary_data.get('balance', 0):,.2f}", border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # Chart Generation
    if summary_data.get("category_breakdown"):
        with tempfile.TemporaryDirectory() as tmpdir:
            labels = list(summary_data["category_breakdown"].keys())
            sizes = list(summary_data["category_breakdown"].values())
            
            fig, ax = plt.subplots(figsize=(5, 3))
            ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140)
            ax.axis('equal')
            
            chart_path = os.path.join(tmpdir, "chart.png")
            plt.savefig(chart_path, bbox_inches='tight')
            plt.close(fig)
            
            pdf.image(chart_path, w=120, x=45)
            pdf.ln(5)

    # Transactions Table
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(0, 51, 102)
    pdf.cell(0, 10, "Recent Transactions", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(0, 51, 102)
    
    pdf.cell(30, 8, "Date", border=1, fill=True)
    pdf.cell(70, 8, "Merchant", border=1, fill=True)
    pdf.cell(40, 8, "Category", border=1, fill=True)
    pdf.cell(50, 8, "Amount", border=1, align="R", fill=True, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(0, 0, 0)
    
    txs = summary_data.get("transactions", [])
    for i, tx in enumerate(txs[:100]): # Max 100 in PDF
        fill = (i % 2 == 0)
        if fill:
            pdf.set_fill_color(245, 245, 245)
        else:
            pdf.set_fill_color(255, 255, 255)
            
        pdf.cell(30, 8, str(tx.get("date", "")), border=1, fill=fill)
        pdf.cell(70, 8, str(tx.get("merchant", ""))[:30], border=1, fill=fill)
        pdf.cell(40, 8, str(tx.get("category", ""))[:20], border=1, fill=fill)
        amount = tx.get("amount", 0)
        prefix = "+" if str(tx.get("type", "")).lower() == "credit" else "-"
        pdf.cell(50, 8, f"{prefix} Rs. {amount:,.2f}", border=1, align="R", fill=fill, new_x="LMARGIN", new_y="NEXT")
        
    pdf_bytes = pdf.output()
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="summary_report.pdf"'}
    )

# ---------------- CHAT WITH AI AGENT ---------------- #

@app.get("/chat/history")
def get_chat_history_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db_services.get_chat_history(db, current_user.id)
    return {"status": "success", "data": history}

@app.delete("/chat/history")
def clear_chat_history_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_services.clear_chat_history(db, current_user.id)
    clear_agent_memory(current_user.id)
    return {"status": "success", "message": "Chat history and memory cleared."}

@app.post("/chat")
@limiter.limit("15/minute")
def chat(
    request: Request,
    req: ChatReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Persist user message to PostgreSQL
    db_services.save_chat_message(db, current_user.id, role="user", content=req.query)

    # 2. Query LangGraph ReAct agent with memory
    response = ask_agent(req.query, user_id=current_user.id)

    # 3. Persist assistant response to PostgreSQL
    db_services.save_chat_message(db, current_user.id, role="assistant", content=response)

    return {"status": "success", "response": response}

@app.get("/")
def home():
    return {"status": "server running", "version": "2.0-postgres"}
