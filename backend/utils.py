import pandas as pd
from datetime import datetime
from transaction_manager import get_df

def load_data():
    return get_df()

def get_total_spend(df):
    debits = df[df["type"].str.lower() != "credit"]
    return float(debits["amount"].sum())

def get_total_income(df):
    credits = df[df["type"].str.lower() == "credit"]
    return float(credits["amount"].sum())

def get_category_spend(df, category: str):
    debits = df[df["type"].str.lower() != "credit"]
    result = debits[debits["category"].str.lower() == category.lower()]
    return float(result["amount"].sum()) if not result.empty else 0.0

def get_top_category(df):
    debits = df[df["type"].str.lower() != "credit"]
    if debits.empty:
        return "None"
    return debits.groupby("category")["amount"].sum().idxmax()

def get_summary(df):
    clean_df = df.copy().fillna("")
    if "date" in clean_df.columns:
        clean_df["date"] = clean_df["date"].astype(str)
        clean_df = clean_df.sort_values(by="date", ascending=False)
    if "merchant" in clean_df.columns:
        clean_df["merchant"] = clean_df["merchant"].astype(str).str.replace("\n", " ").str.strip()

    debits = clean_df[clean_df["type"].str.lower() != "credit"]
    credits = clean_df[clean_df["type"].str.lower() == "credit"]
    total_spend = float(debits["amount"].sum()) if not debits.empty else 0.0
    total_income = float(credits["amount"].sum()) if not credits.empty else 0.0
    balance = total_income - total_spend

    category_breakdown = debits.groupby("category")["amount"].sum().to_dict() if not debits.empty else {}

    from subscription_manager import get_upcoming_reminders
    from memory_manager import get_budgets
    upcoming_reminders = get_upcoming_reminders()
    budgets = get_budgets()

    return {
        "total_spend": total_spend,
        "total_income": total_income,
        "balance": balance,
        "category_breakdown": category_breakdown,
        "transactions": clean_df.to_dict(orient="records"),
        "upcoming_reminders": upcoming_reminders,
        "budgets": budgets
    }

def monthly_spend(df):
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    return df.groupby("month")["amount"].sum()

def category_trend(df):
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    return df.groupby(["month", "category"])["amount"].sum().unstack().fillna(0)

def detect_spike(df):
    monthly = monthly_spend(df)

    if len(monthly) < 2:
        return "Not enough data"

    last = monthly.iloc[-1]
    prev = monthly.iloc[-2]

    change = ((last - prev) / prev) * 100

    if change > 20:
        return f"⚠️ Spending increased by {change:.1f}%"
    elif change < -20:
        return f"📉 Spending decreased by {abs(change):.1f}%"
    else:
        return "Spending is stable"

def detect_weekend_spending(df):

    df["date"] = pd.to_datetime(df["date"])

    df["weekday"] = df["date"].dt.weekday

    weekend = df[df["weekday"] >= 5]["amount"].sum()
    weekday = df[df["weekday"] < 5]["amount"].sum()

    if weekend > weekday:
        return "User overspends on weekends"

    return "No major weekend overspending"

def spending_alert(df):
    from memory_manager import get_budgets
    budgets = get_budgets()
    
    # Get current month spend per category
    df["date"] = pd.to_datetime(df["date"])
    current_month = datetime.now().strftime("%Y-%m")
    current_month_df = df[df["date"].dt.strftime("%Y-%m") == current_month]
    debits = current_month_df[current_month_df["type"].str.lower() != "credit"]
    
    category_spend = debits.groupby("category")["amount"].sum().to_dict()
    
    alerts = []
    for cat, limit in budgets.items():
        spent = category_spend.get(cat, 0.0)
        if spent > limit:
            alerts.append(f"⚠️ Over budget in {cat}: Spent ₹{spent} (Limit: ₹{limit})")
    
    if alerts:
        return "\n".join(alerts)
        
    total = df["amount"].sum()
    if total > 10000 and not budgets:
        return "⚠️ You are crossing your monthly spending limit of ₹10,000"

    return "Spending looks okay"