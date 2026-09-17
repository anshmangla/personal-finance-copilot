from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from transaction_manager import add_transaction as tm_add, edit_transaction as tm_edit, delete_transaction as tm_delete
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

@app.get("/summary")
def summary():
    df = load_data()
    data = get_summary(df)
    return {"status": "success", "data": data}

@app.post("/chat")
async def chat(req: ChatReq):
    response = ask_agent(req.query)
    return {"status": "success", "response": response}

@app.get("/")
def home():
    return {"status": "server running"}
