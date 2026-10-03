import pandas as pd
import io

df = pd.DataFrame({'date': ['2026-10-01'], 'amount': [100.0], 'merchant': ['Test'], 'category': ['Food'], 'type': ['debit']})

def sanitize_val(val):
    if isinstance(val, str) and val and val[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + val
    return val

for col in df.select_dtypes(include=['object']).columns:
    df[col] = df[col].apply(sanitize_val)

output = io.BytesIO()
with pd.ExcelWriter(output, engine='openpyxl') as writer:
    summary_data = {'total_spend': 100.0, 'total_income': 0.0, 'balance': -100.0}
    summary_df = pd.DataFrame({
        'Metric': ['Total Spend', 'Total Income', 'Net Balance'],
        'Amount': [summary_data.get('total_spend', 0), summary_data.get('total_income', 0), summary_data.get('balance', 0)]
    })
    summary_df.to_excel(writer, sheet_name='Dashboard', index=False)
    df.to_excel(writer, sheet_name='Transactions', index=False)

print('Success')
