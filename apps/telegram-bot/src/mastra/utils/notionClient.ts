/**
 * Simplified NotionClient for workflow operations
 * Focuses on core business databases only
 */

import type { Client, Measurement, Order } from "@cimantikos/domain";

export class NotionClient {
  private notionApiKey: string;
  private clientsDbId: string;

  constructor() {
    this.notionApiKey = process.env.NOTION_API_KEY!;
    this.clientsDbId = process.env.NOTION_CLIENTS_DB_ID!;
  }

  async queryClientRecords(filters: { name?: string }, limit = 10): Promise<Client[]> {
    const headers = {
      Authorization: `Bearer ${this.notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };

    const searchData: any = {
      page_size: limit,
    };

    if (filters.name) {
      searchData.filter = {
        property: "Name",
        title: { contains: filters.name },
      };
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${this.clientsDbId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify(searchData),
    });

    if (!response.ok) {
      throw new Error(`Failed to query clients: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.map((result: any) => ({
      id: result.id,
      name: result.properties.Name?.title?.[0]?.text?.content || "",
      phone: result.properties.Phone?.phone_number || undefined,
      email: result.properties.Email?.email || undefined,
      address: result.properties.Address?.rich_text?.[0]?.text?.content || undefined,
      date: result.properties.Date?.date?.start || undefined,
      url: result.url,
      created_time: result.created_time,
    }));
  }

  async createClientRecord(clientData: {
    name: string;
    phone_number?: string;
    referral_source?: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const headers = {
      Authorization: `Bearer ${this.notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };

    const createData = {
      parent: { database_id: this.clientsDbId },
      properties: {
        Name: {
          title: [{ text: { content: clientData.name } }],
        },
        ...(clientData.phone_number && {
          Phone: { phone_number: clientData.phone_number },
        }),
        Date: {
          date: { start: new Date().toISOString().split("T")[0] },
        },
      },
    };

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers,
      body: JSON.stringify(createData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create client: ${response.statusText}`);
    }

    const result = await response.json();
    return { id: result.id };
  }
}
