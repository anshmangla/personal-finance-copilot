import base64
import os
import json
from groq import Groq

def scan_receipt_image(file_bytes: bytes) -> dict:
    """
    Sends the receipt image to Groq's Vision model to extract structured data.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    
    prompt = """
    Analyze this receipt image and extract the following information.
    Return ONLY a valid JSON object (no markdown formatting, no backticks, no introductory text).
    
    Keys to extract:
    - "merchant": The name of the store/merchant. (string, capitalize the first letter)
    - "amount": The total amount paid. (float, strictly the number without currency symbols)
    - "date": The date of the transaction in "YYYY-MM-DD" format. (string)
    - "category": The most appropriate category for this expense (e.g., "Food", "Shopping", "Transport", "Bills", "Health", "Entertainment", "Other"). (string)
    
    Example output format:
    {
      "merchant": "Starbucks",
      "amount": 450.50,
      "date": "2023-10-15",
      "category": "Food"
    }
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        model="llama-3.2-11b-vision-preview",
        temperature=0.1,
    )
    
    response_text = chat_completion.choices[0].message.content.strip()
    
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
        
    try:
        data = json.loads(response_text.strip())
        return data
    except json.JSONDecodeError:
        raise ValueError(f"Failed to parse OCR response as JSON. Raw output: {response_text}")
