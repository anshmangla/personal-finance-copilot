import pandas as pd
from datetime import datetime

def get_total_spend(df: pd.DataFrame) -> float:
    if df.empty or "type" not in df.columns:
        return 0.0
    debits = df[df["type"].str.lower() != "credit"]
    return float(debits["amount"].sum()) if not debits.empty else 0.0

def get_total_income(df: pd.DataFrame) -> float:
    if df.empty or "type" not in df.columns:
        return 0.0
    credits = df[df["type"].str.lower() == "credit"]
    return float(credits["amount"].sum()) if not credits.empty else 0.0

def get_category_spend(df: pd.DataFrame, category: str) -> float:
    if df.empty or "type" not in df.columns or "category" not in df.columns:
        return 0.0
    debits = df[df["type"].str.lower() != "credit"]
    result = debits[debits["category"].str.lower() == category.lower()]
    return float(result["amount"].sum()) if not result.empty else 0.0

def get_top_category(df: pd.DataFrame) -> str:
    if df.empty or "type" not in df.columns or "category" not in df.columns:
        return "None"
    debits = df[df["type"].str.lower() != "credit"]
    if debits.empty:
        return "None"
    return debits.groupby("category")["amount"].sum().idxmax()

def get_summary(
    df: pd.DataFrame,
    upcoming_reminders: list = None,
    budgets: dict = None,
    goals: list = None
) -> dict:
    if upcoming_reminders is None:
        upcoming_reminders = []
    if budgets is None:
        budgets = {}
    if goals is None:
        goals = []

    clean_df = df.copy().fillna("")
    if "date" in clean_df.columns:
        clean_df["date"] = clean_df["date"].astype(str)
        clean_df = clean_df.sort_values(by="date", ascending=False)
    if "merchant" in clean_df.columns:
        clean_df["merchant"] = clean_df["merchant"].astype(str).str.replace("\n", " ").str.strip()

    debits = clean_df[clean_df["type"].str.lower() != "credit"] if not clean_df.empty and "type" in clean_df.columns else pd.DataFrame()
    credits = clean_df[clean_df["type"].str.lower() == "credit"] if not clean_df.empty and "type" in clean_df.columns else pd.DataFrame()

    total_spend = float(debits["amount"].sum()) if not debits.empty else 0.0
    total_income = float(credits["amount"].sum()) if not credits.empty else 0.0
    balance = total_income - total_spend

    category_breakdown = debits.groupby("category")["amount"].sum().to_dict() if not debits.empty else {}

    return {
        "total_spend": total_spend,
        "total_income": total_income,
        "balance": balance,
        "category_breakdown": category_breakdown,
        "transactions": clean_df.to_dict(orient="records") if not clean_df.empty else [],
        "upcoming_reminders": upcoming_reminders,
        "budgets": budgets,
        "goals": goals
    }

def monthly_spend(df: pd.DataFrame):
    if df.empty or "date" not in df.columns:
        return pd.Series(dtype=float)
    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["date"])
    df_copy["month"] = df_copy["date"].dt.to_period("M")
    return df_copy.groupby("month")["amount"].sum()

def category_trend(df: pd.DataFrame):
    if df.empty or "date" not in df.columns or "category" not in df.columns:
        return pd.DataFrame()
    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["date"])
    df_copy["month"] = df_copy["date"].dt.to_period("M")
    return df_copy.groupby(["month", "category"])["amount"].sum().unstack().fillna(0)

def detect_spike(df: pd.DataFrame) -> str:
    monthly = monthly_spend(df)
    if len(monthly) < 2:
        return "Not enough data"

    last = monthly.iloc[-1]
    prev = monthly.iloc[-2]
    if prev == 0:
        return "Spending increased"

    change = ((last - prev) / prev) * 100
    if change > 20:
        return f"⚠️ Spending increased by {change:.1f}%"
    elif change < -20:
        return f"📉 Spending decreased by {abs(change):.1f}%"
    else:
        return "Spending is stable"

def detect_weekend_spending(df: pd.DataFrame) -> str:
    if df.empty or "date" not in df.columns:
        return "No transaction data"
    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["date"])
    df_copy["weekday"] = df_copy["date"].dt.weekday

    weekend = df_copy[df_copy["weekday"] >= 5]["amount"].sum()
    weekday = df_copy[df_copy["weekday"] < 5]["amount"].sum()

    if weekend > weekday:
        return "User overspends on weekends"
    return "No major weekend overspending"

def spending_alert(df: pd.DataFrame, budgets: dict = None) -> str:
    if budgets is None:
        budgets = {}

    if df.empty or "date" not in df.columns:
        return "Spending looks okay"

    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["date"])
    current_month = datetime.now().strftime("%Y-%m")
    current_month_df = df_copy[df_copy["date"].dt.strftime("%Y-%m") == current_month]
    debits = current_month_df[current_month_df["type"].str.lower() != "credit"] if "type" in current_month_df.columns else current_month_df

    category_spend = debits.groupby("category")["amount"].sum().to_dict() if not debits.empty and "category" in debits.columns else {}

    alerts = []
    for cat, limit in budgets.items():
        spent = category_spend.get(cat, 0.0)
        if spent > limit:
            alerts.append(f"⚠️ Over budget in {cat}: Spent ₹{spent:,.2f} (Limit: ₹{limit:,.2f})")

    if alerts:
        return "\n".join(alerts)

    total = debits["amount"].sum() if not debits.empty else 0.0
    if total > 10000 and not budgets:
        return "⚠️ You are crossing your monthly spending limit of ₹10,000"

    return "Spending looks okay"