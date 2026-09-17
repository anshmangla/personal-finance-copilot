import os
import uuid
import pandas as pd
from datetime import datetime

DATA_FILE = "data.csv"

def get_df():
    if not os.path.exists(DATA_FILE):
        df = pd.DataFrame(columns=["id", "date", "amount", "merchant", "category", "type"])
        df.to_csv(DATA_FILE, index=False)
        return df

    df = pd.read_csv(DATA_FILE)
    dirty = False
    if "id" not in df.columns:
        df["id"] = [str(uuid.uuid4())[:8] for _ in range(len(df))]
        dirty = True
    else:
        mask = df["id"].isna() | (df["id"] == "")
        if mask.any():
            df.loc[mask, "id"] = [str(uuid.uuid4())[:8] for _ in range(mask.sum())]
            dirty = True

    if "type" not in df.columns:
        df["type"] = "debit"
        dirty = True
    else:
        df["type"] = df["type"].fillna("debit")

    if dirty:
        df.to_csv(DATA_FILE, index=False)

    return df

def add_transaction(amount: float, merchant: str, category: str, tx_type: str = "debit", date: str = None):
    df = get_df()
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    new_row = {
        "id": str(uuid.uuid4())[:8],
        "date": date,
        "amount": float(amount),
        "merchant": merchant.strip(),
        "category": category.strip(),
        "type": tx_type.strip().lower()
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_csv(DATA_FILE, index=False)
    return new_row

def edit_transaction(tx_id: str, amount: float, merchant: str, category: str, tx_type: str = "debit", date: str = None):
    df = get_df()
    idx = df.index[df["id"].astype(str) == str(tx_id)].tolist()
    if not idx:
        return None
    i = idx[0]
    df.at[i, "amount"] = float(amount)
    df.at[i, "merchant"] = merchant.strip()
    df.at[i, "category"] = category.strip()
    df.at[i, "type"] = tx_type.strip().lower()
    if date:
        df.at[i, "date"] = date.strip()
    df.to_csv(DATA_FILE, index=False)
    return df.iloc[i].to_dict()

def delete_transaction(tx_id: str):
    df = get_df()
    before = len(df)
    df = df[df["id"].astype(str) != str(tx_id)]
    if len(df) < before:
        df.to_csv(DATA_FILE, index=False)
        return True
    return False
