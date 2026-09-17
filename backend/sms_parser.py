# import re
# import pandas as pd
# from datetime import datetime
# from dotenv import load_dotenv
# load_dotenv()

# from langchain_groq import ChatGroq

# llm = ChatGroq(
#     model="llama-3.1-8b-instant",
#     temperature=0
# )

# # ---------------- CATEGORY ---------------- #

# def categorize_merchant(merchant):

#     prompt = f"""
# Classify this merchant into one category:

# Food
# Shopping
# Transport
# Bills
# Entertainment
# Travel
# Other

# Merchant: {merchant}

# Return only category name.
# """

#     return llm.invoke(prompt).content.strip()


# # ---------------- SAVE ---------------- #

# def save_transaction(amount, merchant, category):

#     new_row = {
#         "date": datetime.now().strftime("%Y-%m-%d"),
#         "amount": amount,
#         "merchant": merchant,
#         "category": category
#     }

#     df = pd.read_csv("data.csv")

#     df = pd.concat([df, pd.DataFrame([new_row])])

#     df.to_csv("data.csv", index=False)


# # ---------------- MAIN PARSER ---------------- #

# def process_sms(message):

#     amount_pattern = r'₹\s?(\d+)'
#     merchant_pattern = r'at\s([A-Za-z0-9]+)'

#     amount_match = re.search(amount_pattern, message)
#     merchant_match = re.search(merchant_pattern, message)

#     amount = int(amount_match.group(1)) if amount_match else 0
#     merchant = merchant_match.group(1) if merchant_match else "Unknown"

#     category = categorize_merchant(merchant)

#     save_transaction(amount, merchant, category)

#     return {
#         "amount": amount,
#         "merchant": merchant,
#         "category": category
#     }

import re
import pandas as pd

from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from langchain_groq import ChatGroq

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0
)

# ---------------- CATEGORY ---------------- #

def categorize_transaction(message):

    prompt = f"""
Classify this banking transaction into ONE category:

Food
Shopping
Transport
Bills
Entertainment
Transfer
Travel
Other

SMS:
{message}

Return ONLY category name.
"""

    return llm.invoke(prompt).content.strip()


# ---------------- DUPLICATE CHECK ---------------- #

def transaction_exists(df, amount, merchant):

    existing = df[
        (df["amount"] == amount) &
        (df["merchant"] == merchant)
    ]

    return len(existing) > 0


# ---------------- SAVE ---------------- #

def save_transaction(amount, merchant, category):

    df = pd.read_csv("data.csv")

    if transaction_exists(df, amount, merchant):

        print("Duplicate transaction skipped")

        return

    new_row = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "amount": amount,
        "merchant": merchant,
        "category": category
    }

    df = pd.concat([df, pd.DataFrame([new_row])])

    df.to_csv("data.csv", index=False)

    print("Transaction saved")


# ---------------- MAIN PARSER ---------------- #

def process_sms(message, sender):

    print("SMS:", message)

    # -------- AMOUNT -------- #

    amount_pattern = r'Rs\.?(\d+(?:\.\d+)?)'

    amount_match = re.search(amount_pattern, message)

    amount = float(amount_match.group(1)) if amount_match else 0

    # -------- MERCHANT / RECEIVER -------- #

    merchant_pattern = r'To\s([A-Za-z\s]+?)\n'

    merchant_match = re.search(merchant_pattern, message)

    merchant = merchant_match.group(1).strip() if merchant_match else sender

    # -------- CATEGORY -------- #

    category = categorize_transaction(message)

    # -------- SAVE -------- #

    save_transaction(amount, merchant, category)

    return {
        "amount": amount,
        "merchant": merchant,
        "category": category
    }