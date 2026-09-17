import os
import uuid
import pandas as pd
from datetime import datetime

SUBSCRIPTIONS_FILE = "subscriptions.csv"

def get_subscriptions_df():
    if not os.path.exists(SUBSCRIPTIONS_FILE):
        df = pd.DataFrame(columns=["id", "name", "amount", "category", "billing_cycle", "next_payment_date"])
        df.to_csv(SUBSCRIPTIONS_FILE, index=False)
        return df

    df = pd.read_csv(SUBSCRIPTIONS_FILE)
    dirty = False
    
    # Ensure all required columns exist
    for col in ["id", "name", "amount", "category", "billing_cycle", "next_payment_date"]:
        if col not in df.columns:
            df[col] = ""
            dirty = True

    if "id" not in df.columns or df["id"].isna().any() or (df["id"] == "").any():
        mask = df["id"].isna() | (df["id"] == "")
        if mask.any():
            df.loc[mask, "id"] = [str(uuid.uuid4())[:8] for _ in range(mask.sum())]
            dirty = True

    if dirty:
        df.to_csv(SUBSCRIPTIONS_FILE, index=False)

    return df

def add_subscription(name: str, amount: float, category: str, billing_cycle: str, next_payment_date: str):
    df = get_subscriptions_df()
    new_row = {
        "id": str(uuid.uuid4())[:8],
        "name": name.strip(),
        "amount": float(amount),
        "category": category.strip(),
        "billing_cycle": billing_cycle.strip().lower(), # e.g., 'monthly', 'yearly'
        "next_payment_date": next_payment_date.strip() # YYYY-MM-DD
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_csv(SUBSCRIPTIONS_FILE, index=False)
    return new_row

def edit_subscription(sub_id: str, name: str, amount: float, category: str, billing_cycle: str, next_payment_date: str):
    df = get_subscriptions_df()
    idx = df.index[df["id"].astype(str) == str(sub_id)].tolist()
    if not idx:
        return None
    i = idx[0]
    df.at[i, "name"] = name.strip()
    df.at[i, "amount"] = float(amount)
    df.at[i, "category"] = category.strip()
    df.at[i, "billing_cycle"] = billing_cycle.strip().lower()
    df.at[i, "next_payment_date"] = next_payment_date.strip()
    df.to_csv(SUBSCRIPTIONS_FILE, index=False)
    return df.iloc[i].to_dict()

def delete_subscription(sub_id: str):
    df = get_subscriptions_df()
    before = len(df)
    df = df[df["id"].astype(str) != str(sub_id)]
    if len(df) < before:
        df.to_csv(SUBSCRIPTIONS_FILE, index=False)
        return True
    return False

def get_upcoming_reminders(days: int = 7):
    df = get_subscriptions_df()
    if df.empty:
        return []
        
    df["next_payment_date"] = pd.to_datetime(df["next_payment_date"])
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate difference in days
    df["days_until_due"] = (df["next_payment_date"] - today).dt.days
    
    # Filter for upcoming payments within 'days' limit, including past due (negative days)
    upcoming = df[(df["days_until_due"] <= days) & (df["days_until_due"] >= -30)].copy() # include up to 30 days past due
    
    # Sort by due date
    upcoming = upcoming.sort_values("days_until_due")
    
    # Format date back to string for JSON serialization
    upcoming["next_payment_date"] = upcoming["next_payment_date"].dt.strftime("%Y-%m-%d")
    
    return upcoming.to_dict(orient="records")
