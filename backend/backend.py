from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from transaction_manager import add_transaction as tm_add, edit_transaction as tm_edit, delete_transaction as tm_delete
from subscription_manager import get_subscriptions_df, add_subscription, edit_subscription, delete_subscription
from memory_manager import get_budgets, set_budget
from agent import ask_agent
from utils import load_data, get_summary

app = FastAPI()

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

class ChatReq(BaseModel):
    query: str

@app.post("/add_transaction")
async def add_transaction_endpoint(req: TransactionReq):
    new_tx = tm_add(req.amount, req.merchant, req.category, req.type, req.date)
    return {"status": "success", "message": "Transaction saved", "transaction": new_tx}

@app.put("/edit_transaction")
async def edit_transaction_endpoint(req: EditTransactionReq):
    updated = tm_edit(req.id, req.amount, req.merchant, req.category, req.type, req.date)
    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "success", "message": "Transaction updated", "transaction": updated}

@app.delete("/delete_transaction/{tx_id}")
async def delete_transaction_endpoint(tx_id: str):
    deleted = tm_delete(tx_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "success", "message": "Transaction deleted"}

@app.get("/subscriptions")
def get_subscriptions():
    df = get_subscriptions_df()
    return {"status": "success", "data": df.to_dict(orient="records")}

@app.post("/add_subscription")
async def add_subscription_endpoint(req: SubscriptionReq):
    new_sub = add_subscription(req.name, req.amount, req.category, req.billing_cycle, req.next_payment_date)
    return {"status": "success", "message": "Subscription saved", "subscription": new_sub}

@app.put("/edit_subscription")
async def edit_subscription_endpoint(req: EditSubscriptionReq):
    updated = edit_subscription(req.id, req.name, req.amount, req.category, req.billing_cycle, req.next_payment_date)
    if not updated:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "message": "Subscription updated", "subscription": updated}

@app.delete("/delete_subscription/{sub_id}")
async def delete_subscription_endpoint(sub_id: str):
    deleted = delete_subscription(sub_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "message": "Subscription deleted"}

@app.get("/summary")
def summary():
    df = load_data()
    data = get_summary(df)
    return {"status": "success", "data": data}

@app.get("/budgets")
def budgets():
    return {"status": "success", "data": get_budgets()}

@app.post("/set_budget")
async def set_budget_endpoint(req: BudgetReq):
    budgets = set_budget(req.category, req.limit)
    return {"status": "success", "message": f"Budget set for {req.category}", "data": budgets}

from fastapi.responses import FileResponse
import os
from fpdf import FPDF
from datetime import datetime

@app.get("/export/csv")
def export_csv():
    file_path = "data.csv"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Data not found")
    return FileResponse(path=file_path, filename="transactions.csv", media_type="text/csv")

@app.get("/export/pdf")
def export_pdf():
    df = load_data()
    summary = get_summary(df)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "Personal Finance Summary", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Total Spend: Rs. {summary['total_spend']:.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Total Income: Rs. {summary['total_income']:.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Net Balance: Rs. {summary['balance']:.2f}", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Category Breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 12)
    for cat, amount in summary['category_breakdown'].items():
        pdf.cell(0, 8, f"{cat}: Rs. {amount:.2f}", new_x="LMARGIN", new_y="NEXT")
        
    pdf_path = "summary_report.pdf"
    pdf.output(pdf_path)
    
    return FileResponse(path=pdf_path, filename="summary_report.pdf", media_type="application/pdf")

@app.post("/chat")
async def chat(req: ChatReq):
    response = ask_agent(req.query)
    return {"status": "success", "response": response}

@app.get("/")
def home():
    return {"status": "server running"}
