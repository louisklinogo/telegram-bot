import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { telegramInvoiceAgent } from './agents/telegramInvoiceAgent';
import { invoiceWorkflow } from './workflows/invoiceWorkflow';
import { measurementWorkflow } from './workflows/measurementWorkflow';

// Create Mastra instance with proper configuration
export const mastra = new Mastra({
  agents: {
    telegramInvoiceAgent,
  },
  workflows: {
    invoiceWorkflow,
    measurementWorkflow,
  },
  storage: new LibSQLStore({
    url: 'file:./mastra-data.db'
  }),
  // TODO: Add vector store configuration when needed for semantic recall
  // vectors: {
  //   globalVectorStore
  // },
  logger: new PinoLogger({ 
    name: 'Cimantikos-Bot', 
    level: 'info' 
  }),
  server: {
    port: 4111,
    host: '0.0.0.0',
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-client-type'],
      exposeHeaders: ['Content-Length', 'X-Requested-With'],
      credentials: false
    }
  }
});
