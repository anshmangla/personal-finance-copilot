"""
One-time script to migrate legacy data.csv, subscriptions.csv, and memory.json into PostgreSQL.
Usage: python migrate_csv_to_db.py <user_email>
"""
import sys
import os
import json
import pandas as pd
from database import SessionLocal, init_db
from models import User, Transaction, Subscription, Budget, Goal, Habit

def migrate_for_user(email: str):
    init_db()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Creating user {email}...")
            user = User(email=email, name=email.split("@")[0])
            db.add(user)
            db.commit()
            db.refresh(user)

        user_id = user.id
        print(f"Migrating records for user {email} (ID: {user_id})...")

        # 1. Transactions (data.csv)
        if os.path.exists("data.csv"):
            df = pd.read_csv("data.csv")
            tx_count = 0
            for _, row in df.iterrows():
                tx_id = str(row.get("id")) if pd.notna(row.get("id")) else None
                existing = db.query(Transaction).filter(Transaction.id == tx_id).first() if tx_id else None
                if not existing and pd.notna(row.get("amount")):
                    tx = Transaction(
                        id=tx_id,
                        user_id=user_id,
                        amount=float(row["amount"]),
                        merchant=str(row.get("merchant", "Unknown")),
                        category=str(row.get("category", "Other")),
                        type=str(row.get("type", "debit")).lower(),
                        date=str(row.get("date", "2026-01-01"))
                    )
                    db.add(tx)
                    tx_count += 1
            db.commit()
            print(f"Migrated {tx_count} transactions.")

        # 2. Subscriptions (subscriptions.csv)
        if os.path.exists("subscriptions.csv"):
            df_s = pd.read_csv("subscriptions.csv")
            sub_count = 0
            for _, row in df_s.iterrows():
                sub_id = str(row.get("id")) if pd.notna(row.get("id")) else None
                existing = db.query(Subscription).filter(Subscription.id == sub_id).first() if sub_id else None
                if not existing and pd.notna(row.get("name")):
                    sub = Subscription(
                        id=sub_id,
                        user_id=user_id,
                        name=str(row["name"]),
                        amount=float(row.get("amount", 0)),
                        category=str(row.get("category", "Bills")),
                        billing_cycle=str(row.get("billing_cycle", "monthly")),
                        next_payment_date=str(row.get("next_payment_date", "2026-10-01"))
                    )
                    db.add(sub)
                    sub_count += 1
            db.commit()
            print(f"Migrated {sub_count} subscriptions.")

        # 3. Memory (memory.json)
        if os.path.exists("memory.json"):
            with open("memory.json", "r") as f:
                data = json.load(f)
            
            # Budgets
            budgets = data.get("budgets", {})
            for cat, limit in budgets.items():
                existing = db.query(Budget).filter(Budget.user_id == user_id, Budget.category == cat).first()
                if not existing:
                    db.add(Budget(user_id=user_id, category=cat, limit_amount=float(limit)))
            
            # Goals
            goals = data.get("goals", [])
            for g in goals:
                existing = db.query(Goal).filter(Goal.user_id == user_id, Goal.goal_text == str(g)).first()
                if not existing:
                    db.add(Goal(user_id=user_id, goal_text=str(g)))

            # Habits
            habits = data.get("habits", [])
            for h in set(habits):
                existing = db.query(Habit).filter(Habit.user_id == user_id, Habit.habit_text == str(h)).first()
                if not existing:
                    db.add(Habit(user_id=user_id, habit_text=str(h)))

            db.commit()
            print("Migrated budgets, goals, and habits.")

        print("Migration completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_csv_to_db.py <user_email>")
        sys.exit(1)
    migrate_for_user(sys.argv[1].strip())
