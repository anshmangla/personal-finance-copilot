import os
import pandas as pd
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain.tools import tool

from utils import (
    detect_spike,
    load_data,
    get_total_spend,
    get_category_spend,
    get_top_category,
    get_summary,
    monthly_spend,
    detect_weekend_spending,
    spending_alert
)
from memory_manager import add_habit, add_goal

load_dotenv()

df_init = load_data()
habit = detect_weekend_spending(df_init)
add_habit(habit)

# ---------------- TOOLS ---------------- #

@tool
def total_spend_tool(input_text: str = ""):
    """Returns total money spent"""
    df = load_data()
    return str(get_total_spend(df))


@tool
def category_spend_tool(category: str):
    """Returns total spend for a category like Food, Shopping, Bills"""
    df = load_data()
    return str(get_category_spend(df, category))


@tool
def top_category_tool(input_text: str = ""):
    """Returns highest spending category"""
    df = load_data()
    return str(get_top_category(df))


@tool
def summary_tool(input_text: str = ""):
    """Returns full finance summary"""
    df = load_data()
    return str(get_summary(df))


@tool
def insight_tool(input_text: str = ""):
    """Generates financial insights"""
    df = load_data()
    monthly = monthly_spend(df)
    spike = detect_spike(df)
    categories = get_summary(df)["category_breakdown"]

    return f"""
Monthly Spend: {monthly.to_dict()}

Category Breakdown:
{categories}

Trend Insight:
{spike}
"""


@tool
def recommendation_tool(input_text: str = ""):
    """Provides spending recommendations"""
    df = load_data()
    categories = get_summary(df)["category_breakdown"]
    total = sum(categories.values())

    advice = []

    for cat, val in categories.items():
        percent = (val / total) * 100

        if percent > 40:
            advice.append(
                f"You spend a lot on {cat} ({percent:.1f}%). Try reducing it."
            )

    if not advice:
        advice.append("Your spending looks balanced.")

    return "\n".join(advice)

@tool
def merchant_spend_tool(merchant: str):
    """Returns total money spent on a specific merchant, store, service, or person (e.g., DMRC, Swiggy, Uber, Amazon, Zomato)."""
    df = load_data()
    debits = df[df["type"].str.lower() != "credit"]
    matches = debits[debits["merchant"].str.lower().str.contains(merchant.lower().strip(), na=False)]
    if matches.empty:
        return f"No expenses found for merchant '{merchant}'."
    total = float(matches["amount"].sum())
    count = len(matches)
    return f"Total spent on {merchant}: Rs. {total:.2f} across {count} transaction(s)."

@tool
def search_transactions_tool(query: str):
    """Searches transactions matching a keyword in merchant or category."""
    df = load_data()
    q = query.lower().strip()
    matches = df[
        df["merchant"].str.lower().str.contains(q, na=False) |
        df["category"].str.lower().str.contains(q, na=False)
    ]
    if matches.empty:
        return f"No transactions found matching '{query}'."
    records = matches[["date", "amount", "merchant", "category", "type"]].to_dict(orient="records")
    return str(records)

@tool
def income_tool(input_text: str = ""):
    """Returns total money received or credited (income)."""
    df = load_data()
    credits = df[df["type"].str.lower() == "credit"]
    total = float(credits["amount"].sum()) if not credits.empty else 0.0
    return f"Total income / money received: Rs. {total:.2f}"

@tool
def monthly_summary_tool(month: str = ""):
    """Returns month-wise spending, income, and balance for each month or a specific month (e.g. 'April', '2026-04', 'September')."""
    df = load_data()
    df["date"] = pd.to_datetime(df["date"])
    df["month_str"] = df["date"].dt.strftime("%Y-%m")
    debits = df[df["type"].str.lower() != "credit"]
    credits = df[df["type"].str.lower() == "credit"]

    all_months = sorted(df["month_str"].unique(), reverse=True)
    summary = []
    for m in all_months:
        m_deb = float(debits[debits["month_str"] == m]["amount"].sum()) if not debits.empty else 0.0
        m_cred = float(credits[credits["month_str"] == m]["amount"].sum()) if not credits.empty else 0.0
        m_bal = m_cred - m_deb
        summary.append(f"Month {m}: Total Spent = Rs. {m_deb:.2f}, Income = Rs. {m_cred:.2f}, Net Balance = Rs. {m_bal:.2f}")

    return "\n".join(summary)

@tool
def add_goal_tool(goal: str):
    """Adds a financial goal"""
    add_goal(goal)
    return f"Goal added: {goal}"

@tool
def subscriptions_tool(input_text: str = ""):
    """Returns active subscriptions and upcoming bills"""
    from subscription_manager import get_subscriptions_df, get_upcoming_reminders
    df = get_subscriptions_df()
    if df.empty:
        return "No active subscriptions."
    reminders = get_upcoming_reminders(14) # next 14 days
    return f"Subscriptions: {df.to_dict(orient='records')}\nUpcoming in 14 days: {reminders}"

@tool
def check_budget_tool(input_text: str = ""):
    """Returns the user's category budgets and checks if they are overspending in the current month."""
    from utils import load_data, spending_alert
    from memory_manager import get_budgets
    df = load_data()
    budgets = get_budgets()
    if not budgets:
        return "No budgets set yet."
    alerts = spending_alert(df)
    return f"Budgets: {budgets}\nStatus: {alerts}"

# ---------------- TOOL LIST ---------------- #

tools = [
    total_spend_tool,
    category_spend_tool,
    merchant_spend_tool,
    search_transactions_tool,
    income_tool,
    monthly_summary_tool,
    top_category_tool,
    summary_tool,
    insight_tool,
    recommendation_tool,
    add_goal_tool,
    subscriptions_tool,
    check_budget_tool
]

# ---------------- LLM ---------------- #

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0
)

from langgraph.prebuilt import create_react_agent

SYSTEM_PROMPT = """You are a helpful and intelligent Personal Finance Assistant.
Key Rules:
1. CURRENCY: All amounts are in Indian Rupees (Rs. / ₹). ALWAYS format monetary amounts with the ₹ symbol (e.g., ₹500, ₹1,200.00). NEVER use dollar signs ($) or mention USD.
2. MERCHANT LOOKUP: When the user asks how much they spent on a specific merchant, brand, person, or store (like DMRC, Swiggy, Uber, Amazon, Zomato, etc.), use the `merchant_spend_tool`.
3. CATEGORY LOOKUP: When the user asks about general categories (Food, Shopping, Transport, Bills, etc.), use `category_spend_tool`.
4. Be direct, helpful, and polite.
"""

# ---------------- AGENT ---------------- #

agent_executor = create_react_agent(llm, tools=tools, prompt=SYSTEM_PROMPT)

# ---------------- ASK FUNCTION ---------------- #

def ask_agent(query: str):
    response = agent_executor.invoke({"messages": [("user", query)]})
    return response["messages"][-1].content