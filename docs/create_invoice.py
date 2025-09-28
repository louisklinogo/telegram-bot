import os
import requests
import datetime
import argparse
import json
from dotenv import load_dotenv

def create_invoice(to, items, date=None, amount_paid=None, discount_percentage=None):
    """
    Generates an invoice PDF using the Invoice Generator API.
    """
    # Replace literal '\n' with actual newline characters
    to = to.replace('\\n', '\n')
    # Load environment variables from .env file
    load_dotenv()

    # Get API key from environment variables
    api_key = os.getenv("INVOICE_GENERATOR_API_KEY")
    if not api_key:
        raise ValueError("INVOICE_GENERATOR_API_KEY not found in .env file")

    # Use today's date if not provided
    if not date:
        date = datetime.datetime.now().strftime("%b %d, %Y")

    # Convert item names to proper case
    for item in items:
        item['name'] = item['name'].title()

    # TODO: Replace this with the public URL of your logo
    logo_url = "https://res.cloudinary.com/dk4b0brc0/image/upload/v1754602556/Logo-6_ykuaue.jpg"

    # Invoice details
    invoice_data = {
        "from": "Cimantikós Clothing Company\nWestlands Boulevard Rd,190\n+233208467699",
        "to": to,
        "logo": logo_url,
        "date": date,
        "currency": "GHS",
        "items": items,
        "terms": "Customers are required to make full payment before work commences.\n\nPayment options are as stated below:\n\nMTN MOMO: 0558413199\nCimantikos Clothing Company (Edward Osei-Agyeman)\n\nCAL Bank account no: 1400009095472\nBranch: Madina"
    }
    
    # Add discount if provided
    if discount_percentage is not None:
        invoice_data["fields"] = {
            "discounts": "%"
        }
        invoice_data["discounts"] = discount_percentage

    if amount_paid is not None:
        invoice_data["amount_paid"] = amount_paid

    # API endpoint
    url = "https://invoice-generator.com"

    # Headers
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Make the request
    try:
        response = requests.post(url, json=invoice_data, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes

        # Save the PDF
        recipient_name = to.split('\n')[0]
        # Remove invalid filename characters
        safe_recipient_name = "".join(c for c in recipient_name if c.isalnum() or c in (' ', '_')).rstrip()
        filename = f"invoice_{safe_recipient_name.replace(' ', '_').lower()}.pdf"
        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"Invoice for {recipient_name} created successfully as {filename}")

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        if 'response' in locals():
            print(f"Response content: {response.text}")

def load_invoice_data(json_file_path):
    """
    Load invoice data from a JSON file.
    """
    with open(json_file_path, 'r') as f:
        return json.load(f)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create an invoice.")
    parser.add_argument("--to", help="Recipient's details (e.g., 'John Doe\\n123 Main St').")
    parser.add_argument("--items", help='Invoice items in JSON format (e.g., \'[{"name":"Item 1","quantity":1,"unit_cost":10}]\')')
    parser.add_argument("--date", help="Invoice date (e.g., 'Aug 7, 2025'). Defaults to today.")
    parser.add_argument("--amount_paid", type=float, help="Amount paid.")
    parser.add_argument("--discount-percentage", type=float, help="Discount percentage to apply to the subtotal (e.g., 10 for 10%).")
    parser.add_argument("--json-file", help="Path to JSON file containing invoice data.")

    args = parser.parse_args()

    # If JSON file is provided, load data from it
    if args.json_file:
        try:
            invoice_data = load_invoice_data(args.json_file)
            # Use values from JSON file, but allow command line args to override
            to = args.to or invoice_data.get("to")
            items = json.loads(args.items) if args.items else invoice_data.get("items", [])
            date = args.date or invoice_data.get("date")
            amount_paid = args.amount_paid if args.amount_paid is not None else invoice_data.get("amount_paid")
            # Handle both "discount" and "discount_percentage" keys
            discount_percentage = args.discount_percentage if args.discount_percentage is not None else invoice_data.get("discount_percentage", invoice_data.get("discount"))
        except Exception as e:
            print(f"Error loading JSON file: {e}")
            exit(1)
    else:
        # Otherwise, use command line arguments
        if not args.to or not args.items:
            print("Error: Either --json-file or both --to and --items must be provided.")
            exit(1)
        
        to = args.to
        try:
            items = json.loads(args.items)
        except json.JSONDecodeError:
            print("Error: Invalid JSON format for items.")
            exit(1)
        date = args.date
        amount_paid = args.amount_paid
        discount_percentage = args.discount_percentage

    create_invoice(to, items, date, amount_paid, discount_percentage)