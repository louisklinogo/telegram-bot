# Notion Database Reference

This file contains essential information about the Notion databases used in this project for easy reference.

## CRM - Clients

*   **Database ID**: `242d63b0-1370-8068-b932-c47d1f9801d3`
*   **Database URL**: `https://www.notion.so/242d63b013708068b932c47d1f9801d3`
*   **Properties**:
    *   `Name` (title)
    *   `Phone Number` (phone_number)
    *   `Email` (email)
    *   `Segment` (select)
    *   `Source` (select)
    *   `First Contact Date` (date)
    *   `Last Contact` (date)
    *   `Preferred Styles` (multi_select)
    *   `Measurements` (text)
    *   `Orders` (text)
    *   `Notes` (text)
    *   `Days Since Last Contact` (number)
    *   `Image` (file)

## Finances

*   **Database ID**: `242d63b0-1370-8053-9bb5-ea86bed278bd`
*   **Database URL**: `https://www.notion.so/242d63b0137080539bb5ea86bed278bd`
*   **Properties**:
    *   `Entry Name` (title)
    *   `Amount` (number)
    *   `Date` (date)
    *   `Type` (select: Income, Expense, Transfer, Refund, Investment)
    *   `Category` (select: Fabric, Tailor Fee, Transport, Sale, Supplies, Rent, Utilities, Renovation, Salary)
    *   `Payment Method` (select: Cash, Mobile Money (Momo), Bank Transfer, Debit Card, Credit Card, Check)
    *   `Linked Order` (relation)
    *   `Notes` (text)
    *   `Receipt/File` (text)

## Orders

*   **Database ID**: `242d63b0-1370-80f7-89b4-e58193b9e7c7`
*   **Database URL**: `https://www.notion.so/242d63b0137080f789b4e58193b9e7c7`
*   **Properties**:
    *   `Order ID` (title)
    *   `Client` (relation to "CRM - Clients")
    *   `Date` (date)
    *   `Status` (select: New, In Progress, Complete, Delivered)
    *   `Items` (text)
    *   `Quantity` (number)
    *   `Total Price` (number)
    *   `Paid?` (checkbox)
    *   `Delivery Date` (date)
    *   `Invoice/File` (url)
    *   `Follow-up Required` (checkbox)
    *   `Notes` (text)

## Measurements Vault

*   **Database ID**: `242d63b0-1370-80ef-a2ff-d923121c40c5`
*   **Database URL**: `https://www.notion.so/242d63b0137080efa2ffd923121c40c5`
*   **Properties**:
    *   `Measurement Name` (title)
    *   `Client` (relation to "CRM - Clients")
    *   `Date Taken` (date)
    *   `Chest (CH)` (text)
    *   `Shoulder (SH)` (text)
    *   `Sleeve Length (SL)` (text)
    *   `Top Length (LT)` (text)
    *   `Waist (WT)` (text)
    *   `Hip (HP)` (text)
    *   `Lap (LP)` (text)
    *   `Trouser Length (LT)` (text)
    *   `Ankle Round (RD)` (text)
    *   `Bicep Round (RD)` (text)
    *   `Calf (CF)` (text)
    *   `Neck (NK)` (text)
    *   `Stomach (ST)` (text)
    *   `Measurement File` (file)
    *   `Notes` (text)
*   **Note on RD Values**: When two "RD" values are provided, the first is for "Bicep Round (RD)" and the second is for "Ankle Round (RD)". If only one "RD" value is given, it should be recorded as "Bicep Round (RD)". Same goes for "LT". Now also we should have some sort of data validation to also help the aganet validate emasurements so we can uphold data intergrity like the neck of a human cannot be higher than a certain number in inches etc. now some measurements too can have dual entries like LT: 31/37
## API Usage Insights

When creating new pages in a Notion database via the API, the `properties` must be structured in a specific way. Here are the key takeaways from adding the last order:

*   **Date Properties**: Date values must be sent as an object with a `start` key. For example: `"date:Date:start": "YYYY-MM-DD"`.
*   **Relation Properties**: To link to another page, you must provide a JSON array containing the full URL of the page you're linking to. For example: `"Client": "[\"https://www.notion.so/PAGE_ID\"]"`.
*   **Checkbox Properties**: Checkboxes should be set using the special strings `__YES__` for checked and `__NO__` for unchecked.
*   **Order ID**: The `Order ID` should be incremented from the last order in the database.