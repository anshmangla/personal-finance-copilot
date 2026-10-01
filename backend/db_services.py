import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import pandas as pd
from sqlalchemy.orm import Session

from models import Transaction, Subscription, Budget, Goal, Habit

# ---------------- TRANSACTIONS ---------------- #

def get_transactions_df(db: Session, user_id: str) -> pd.DataFrame:
    """Returns all transactions for a user as a Pandas DataFrame."""
    txs = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    if not txs:
        return pd.DataFrame(columns=["id", "date", "amount", "merchant", "category", "type"])
    
    data = [
        {
            "id": t.id,
            "date": t.date,
            "amount": float(t.amount),
            "merchant": t.merchant,
            "category": t.category,
            "type": t.type,
        }
        for t in txs
    ]
    return pd.DataFrame(data)

def add_transaction(
    db: Session,
    user_id: str,
    amount: float,
    merchant: str,
    category: str,
    tx_type: str = "debit",
    date: Optional[str] = None
) -> dict:
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    tx = Transaction(
        id=str(uuid.uuid4())[:8],
        user_id=user_id,
        amount=amount,
        merchant=merchant.strip(),
        category=category,
        type=tx_type.lower(),
        date=date
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {
        "id": tx.id,
        "date": tx.date,
        "amount": tx.amount,
        "merchant": tx.merchant,
        "category": tx.category,
        "type": tx.type
    }

def edit_transaction(
    db: Session,
    user_id: str,
    tx_id: str,
    amount: float,
    merchant: str,
    category: str,
    tx_type: str = "debit",
    date: Optional[str] = None
) -> Optional[dict]:
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == user_id
    ).first()
    if not tx:
        return None

    tx.amount = amount
    tx.merchant = merchant.strip()
    tx.category = category
    tx.type = tx_type.lower()
    if date:
        tx.date = date

    db.commit()
    db.refresh(tx)
    return {
        "id": tx.id,
        "date": tx.date,
        "amount": tx.amount,
        "merchant": tx.merchant,
        "category": tx.category,
        "type": tx.type
    }

def delete_transaction(db: Session, user_id: str, tx_id: str) -> bool:
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == user_id
    ).first()
    if not tx:
        return False
    db.delete(tx)
    db.commit()
    return True


# ---------------- SUBSCRIPTIONS ---------------- #

def get_subscriptions_df(db: Session, user_id: str) -> pd.DataFrame:
    subs = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    if not subs:
        return pd.DataFrame(columns=["id", "name", "amount", "category", "billing_cycle", "next_payment_date"])
    
    data = [
        {
            "id": s.id,
            "name": s.name,
            "amount": float(s.amount),
            "category": s.category,
            "billing_cycle": s.billing_cycle,
            "next_payment_date": s.next_payment_date
        }
        for s in subs
    ]
    return pd.DataFrame(data)

def add_subscription(
    db: Session,
    user_id: str,
    name: str,
    amount: float,
    category: str,
    billing_cycle: str,
    next_payment_date: str
) -> dict:
    sub = Subscription(
        id=str(uuid.uuid4())[:8],
        user_id=user_id,
        name=name.strip(),
        amount=amount,
        category=category,
        billing_cycle=billing_cycle,
        next_payment_date=next_payment_date
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "name": sub.name,
        "amount": sub.amount,
        "category": sub.category,
        "billing_cycle": sub.billing_cycle,
        "next_payment_date": sub.next_payment_date
    }

def edit_subscription(
    db: Session,
    user_id: str,
    sub_id: str,
    name: str,
    amount: float,
    category: str,
    billing_cycle: str,
    next_payment_date: str
) -> Optional[dict]:
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.user_id == user_id
    ).first()
    if not sub:
        return None

    sub.name = name.strip()
    sub.amount = amount
    sub.category = category
    sub.billing_cycle = billing_cycle
    sub.next_payment_date = next_payment_date

    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "name": sub.name,
        "amount": sub.amount,
        "category": sub.category,
        "billing_cycle": sub.billing_cycle,
        "next_payment_date": sub.next_payment_date
    }

def delete_subscription(db: Session, user_id: str, sub_id: str) -> bool:
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.user_id == user_id
    ).first()
    if not sub:
        return False
    db.delete(sub)
    db.commit()
    return True

def get_upcoming_reminders(db: Session, user_id: str, days_ahead: int = 14) -> List[dict]:
    df = get_subscriptions_df(db, user_id)
    if df.empty or "next_payment_date" not in df.columns:
        return []
    
    today = datetime.now().date()
    target_date = today + timedelta(days=days_ahead)
    
    reminders = []
    for _, row in df.iterrows():
        try:
            due_date = datetime.strptime(str(row["next_payment_date"]).strip(), "%Y-%m-%d").date()
            if today - timedelta(days=30) <= due_date <= target_date:
                reminders.append({
                    "name": row["name"],
                    "amount": float(row["amount"]),
                    "due_date": str(due_date),
                    "days_remaining": (due_date - today).days,
                    "category": row.get("category", "Bills")
                })
        except Exception:
            continue
            
    reminders.sort(key=lambda x: x["days_remaining"])
    return reminders


# ---------------- BUDGETS & GOALS ---------------- #

def get_budgets(db: Session, user_id: str) -> Dict[str, float]:
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    return {b.category: float(b.limit_amount) for b in budgets}

def set_budget(db: Session, user_id: str, category: str, limit: float) -> Dict[str, float]:
    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category == category
    ).first()
    if budget:
        budget.limit_amount = limit
    else:
        budget = Budget(user_id=user_id, category=category, limit_amount=limit)
        db.add(budget)
    db.commit()
    return get_budgets(db, user_id)

def get_goals(db: Session, user_id: str) -> List[dict]:
    goals = db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.asc()).all()
    return [{"id": g.id, "goal_text": g.goal_text, "is_completed": g.is_completed} for g in goals]

def add_goal(db: Session, user_id: str, goal_text: str) -> dict:
    goal = Goal(user_id=user_id, goal_text=goal_text.strip())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"id": goal.id, "goal_text": goal.goal_text, "is_completed": goal.is_completed}

def delete_goal(db: Session, user_id: str, goal_id: int) -> bool:
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == user_id
    ).first()
    if not goal:
        return False
    db.delete(goal)
    db.commit()
    return True

def get_habits(db: Session, user_id: str) -> List[str]:
    habits = db.query(Habit).filter(Habit.user_id == user_id).all()
    return [h.habit_text for h in habits]

def add_habit(db: Session, user_id: str, habit_text: str):
    habit = Habit(user_id=user_id, habit_text=habit_text.strip())
    db.add(habit)
    db.commit()
