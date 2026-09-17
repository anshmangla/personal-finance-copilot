import streamlit as st
from utils import load_data, get_total_spend, get_category_spend, spending_alert
from agent import ask_agent

df = load_data()

st.title("💸 Personal Finance Copilot")

# ---- Dashboard ----
st.header("📊 Overview")

st.metric("Total Spend", f"₹{get_total_spend(df)}")
st.bar_chart(df.groupby("category")["amount"].sum())

st.header("📊 Insights & Recommendations")

if st.button("Generate Insights"):
    st.write(ask_agent("Give me financial insights"))

if st.button("Get Recommendations"):
    st.write(ask_agent("How can I improve my spending?"))

st.warning(spending_alert(df))
# ---- Chat ----
st.header("💬 AI Finance Assistant")

query = st.text_input("Ask anything about your finances...")

if query:
    response = ask_agent(query)
    st.write(response)