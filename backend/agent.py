import os
from contextvars import ContextVar
import pandas as pd
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from database import SessionLocal
import db_services
from utils import (
    detect_spike,
    get_total_spend,
    get_category_spend,
    get_top_category,
    get_summary,
    monthly_spend,
    spending_alert
)

load_dotenv()

# Thread-safe ContextVar to store current authenticated user_id
current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")

def _get_df() -> pd.DataFrame:
    uid = current_user_id.get()
    if uid:
        db = SessionLocal()
        try:
            return db_services.get_transactions_df(db, uid)
        finally:
            db.close()
    from transaction_manager import get_df
    return get_df()

def _get_budgets() -> dict:
    uid = current_user_id.get()
    if uid:
        db = SessionLocal()
        try:
            return db_services.get_budgets(db, uid)
        finally:
            db.close()
    from memory_manager import get_budgets
    return get_budgets()

# ---------------- TOOLS ---------------- #

@tool
def total_spend_tool(input_text: str = ""):
    """Returns total money spent"""
    df = _get_df()
    return f"Rs. {get_total_spend(df):.2f}"

@tool
def category_spend_tool(category: str):
    """Returns total spend for a category like Food, Shopping, Bills"""
    df = _get_df()
    return f"Rs. {get_category_spend(df, category):.2f}"

@tool
def top_category_tool(input_text: str = ""):
    """Returns highest spending category"""
    df = _get_df()
    return str(get_top_category(df))

@tool
def summary_tool(input_text: str = ""):
    """Returns full finance summary"""
    df = _get_df()
    budgets = _get_budgets()
    return str(get_summary(df, budgets=budgets))

@tool
def insight_tool(input_text: str = ""):
    """Generates financial insights and trends"""
    df = _get_df()
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
    df = _get_df()
    categories = get_summary(df)["category_breakdown"]
    total = sum(categories.values()) if categories else 0.0

    if total == 0:
        return "No spending data available to generate recommendations."

    advice = []
    for cat, val in categories.items():
        percent = (val / total) * 100
        if percent > 40:
            advice.append(f"You spend a lot on {cat} ({percent:.1f}% of total). Try reducing it.")

    if not advice:
        advice.append("Your spending looks balanced across categories.")

    return "\n".join(advice)

@tool
def merchant_spend_tool(merchant: str):
    """Returns total money spent on a specific merchant, store, service, or person (e.g., DMRC, Swiggy, Uber, Amazon, Zomato)."""
    df = _get_df()
    if df.empty or "merchant" not in df.columns:
        return f"No expenses found for merchant '{merchant}'."

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
    df = _get_df()
    if df.empty:
        return f"No transactions found matching '{query}'."

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
    df = _get_df()
    credits = df[df["type"].str.lower() == "credit"] if not df.empty and "type" in df.columns else pd.DataFrame()
    total = float(credits["amount"].sum()) if not credits.empty else 0.0
    return f"Total income / money received: Rs. {total:.2f}"

@tool
def monthly_summary_tool(month: str = ""):
    """Returns month-wise spending, income, and balance for each month."""
    df = _get_df()
    if df.empty or "date" not in df.columns:
        return "No monthly data available."

    df_copy = df.copy()
    df_copy["date"] = pd.to_datetime(df_copy["date"])
    df_copy["month_str"] = df_copy["date"].dt.strftime("%Y-%m")
    debits = df_copy[df_copy["type"].str.lower() != "credit"]
    credits = df_copy[df_copy["type"].str.lower() == "credit"]

    all_months = sorted(df_copy["month_str"].unique(), reverse=True)
    summary = []
    for m in all_months:
        m_deb = float(debits[debits["month_str"] == m]["amount"].sum()) if not debits.empty else 0.0
        m_cred = float(credits[credits["month_str"] == m]["amount"].sum()) if not credits.empty else 0.0
        m_bal = m_cred - m_deb
        summary.append(f"Month {m}: Total Spent = Rs. {m_deb:.2f}, Income = Rs. {m_cred:.2f}, Net Balance = Rs. {m_bal:.2f}")

    return "\n".join(summary)

@tool
def add_goal_tool(goal: str):
    """Adds a financial goal for the user."""
    uid = current_user_id.get()
    if uid:
        db = SessionLocal()
        try:
            res = db_services.add_goal(db, uid, goal)
            return f"Goal added: {res['goal_text']}"
        finally:
            db.close()
    from memory_manager import add_goal
    add_goal(goal)
    return f"Goal added: {goal}"

@tool
def subscriptions_tool(input_text: str = ""):
    """Returns active subscriptions and upcoming bills due in the next 14 days."""
    uid = current_user_id.get()
    if uid:
        db = SessionLocal()
        try:
            df = db_services.get_subscriptions_df(db, uid)
            if df.empty:
                return "No active subscriptions."
            reminders = db_services.get_upcoming_reminders(db, uid, 14)
            return f"Subscriptions: {df.to_dict(orient='records')}\nUpcoming in 14 days: {reminders}"
        finally:
            db.close()
    from subscription_manager import get_subscriptions_df, get_upcoming_reminders
    df = get_subscriptions_df()
    if df.empty:
        return "No active subscriptions."
    reminders = get_upcoming_reminders(14)
    return f"Subscriptions: {df.to_dict(orient='records')}\nUpcoming in 14 days: {reminders}"

@tool
def check_budget_tool(input_text: str = ""):
    """Returns user's category budgets and alerts if overspending."""
    df = _get_df()
    budgets = _get_budgets()
    if not budgets:
        return "No category budgets set yet."
    alerts = spending_alert(df, budgets=budgets)
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

SYSTEM_PROMPT = """You are a helpful and intelligent Personal Finance Assistant.
Key Rules:
1. CURRENCY: All amounts are in Indian Rupees (Rs. / ₹). ALWAYS format monetary amounts with the ₹ symbol (e.g., ₹500, ₹1,200.00). NEVER use dollar signs ($) or mention USD.
2. MERCHANT LOOKUP: When the user asks how much they spent on a specific merchant, brand, person, or store (like DMRC, Swiggy, Uber, Amazon, Zomato, etc.), use the `merchant_spend_tool`.
3. CATEGORY LOOKUP: When the user asks about general categories (Food, Shopping, Transport, Bills, etc.), use `category_spend_tool`.
4. Be direct, helpful, and polite.
"""

checkpointer = MemorySaver()

agent_executor = create_react_agent(
    llm,
    tools=tools,
    prompt=SYSTEM_PROMPT,
    checkpointer=checkpointer
)

# ---------------- ASK FUNCTION ---------------- #

def ask_agent(query: str, user_id: str = "") -> str:
    token = current_user_id.set(user_id)
    try:
        thread_id = user_id if user_id else "default_session"
        config = {"configurable": {"thread_id": thread_id}}

        # If this thread has no active checkpoint in memory (e.g. after server restart),
        # restore recent conversation turns from the database
        if user_id:
            try:
                state = checkpointer.get_tuple(config)
                if state is None:
                    db = SessionLocal()
                    try:
                        past_msgs = db_services.get_chat_history(db, user_id, limit=10)
                        if past_msgs:
                            seed_messages = []
                            for m in past_msgs:
                                role = "user" if m["role"] == "user" else "assistant"
                                seed_messages.append((role, m["content"]))
                            if seed_messages:
                                agent_executor.invoke({"messages": seed_messages}, config=config)
                    finally:
                        db.close()
            except Exception as e:
                print(f"Error seeding chat memory: {e}")

        response = agent_executor.invoke({"messages": [("user", query)]}, config=config)
        return response["messages"][-1].content
    finally:
        current_user_id.reset(token)

def clear_agent_memory(user_id: str = ""):
    thread_id = user_id if user_id else "default_session"
    try:
        checkpointer.delete_thread(thread_id)
    except Exception as e:
        print(f"Error clearing agent thread {thread_id}: {e}")