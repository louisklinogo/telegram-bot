import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { registerApiRoute } from '@mastra/core/server';
import { telegramInvoiceAgent } from './agents/telegramInvoiceAgent';
import { invoiceWorkflow } from './workflows/invoiceWorkflow';
import { measurementWorkflow } from './workflows/measurementWorkflow';
import { HealthCheckManager, createHealthResponse } from '../health/healthCheck';

// Initialize health check manager following 2025 observability patterns
const healthManager = new HealthCheckManager();
healthManager.initializeCheckers();

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
    },
    // Add comprehensive health check API routes following Mastra documentation patterns
    apiRoutes: [
      // Comprehensive health check endpoint for monitoring systems
      registerApiRoute('/health', {
        method: 'GET',
        handler: async (c) => {
          const mastraInstance = c.get('mastra');
          
          // Add storage checker using Mastra's documented getStorage() method
          const storage = mastraInstance.getStorage();
          if (storage) {
            healthManager.addStorageChecker(storage);
          }
          
          const health = await healthManager.checkHealth();
          return createHealthResponse(c, health);
        },
      }),
      
      // Simple liveness probe endpoint (for Kubernetes/Docker health checks)
      registerApiRoute('/health/live', {
        method: 'GET',
        handler: async (c) => {
          const simpleHealth = await healthManager.getSimpleHealth();
          
          c.header('Content-Type', 'application/json');
          c.header('Cache-Control', 'no-cache');
          
          const httpStatus = simpleHealth.status === 'ok' ? 200 : 503;
          c.status(httpStatus);
          
          return c.json({
            status: simpleHealth.status,
            timestamp: simpleHealth.timestamp,
            service: 'cimantikos-telegram-bot'
          });
        },
      }),
      
      // Readiness probe endpoint (for load balancer health checks)
      registerApiRoute('/health/ready', {
        method: 'GET',
        handler: async (c) => {
          const mastraInstance = c.get('mastra');
          
          try {
            // Check that all required components are ready
            const agents = mastraInstance.getAgents();
            const workflows = mastraInstance.getWorkflows();
            const storage = mastraInstance.getStorage();
            const logger = mastraInstance.getLogger();
            
            const isReady = Object.keys(agents).length > 0 && 
                           Object.keys(workflows).length > 0 && 
                           storage !== undefined && 
                           logger !== undefined;
            
            c.header('Content-Type', 'application/json');
            c.header('Cache-Control', 'no-cache');
            
            const httpStatus = isReady ? 200 : 503;
            c.status(httpStatus);
            
            return c.json({
              status: isReady ? 'ready' : 'not-ready',
              timestamp: new Date().toISOString(),
              components: {
                agents: Object.keys(agents).length,
                workflows: Object.keys(workflows).length,
                storage: storage ? 'configured' : 'missing',
                logger: logger ? 'configured' : 'missing'
              }
            });
          } catch (error) {
            c.status(503);
            return c.json({
              status: 'not-ready',
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        },
      }),
      
      // Health check metrics endpoint (for Prometheus/monitoring)
      registerApiRoute('/health/metrics', {
        method: 'GET',
        handler: async (c) => {
          const mastraInstance = c.get('mastra');
          const storage = mastraInstance.getStorage();
          
          if (storage) {
            healthManager.addStorageChecker(storage);
          }
          
          const health = await healthManager.checkHealth();
          
          c.header('Content-Type', 'application/json');
          c.header('Cache-Control', 'no-cache');
          
          // Extract metrics for monitoring systems
          const metrics = {
            timestamp: health.timestamp,
            uptime_seconds: health.uptime,
            version: health.version,
            environment: health.environment,
            overall_status: health.status,
            service_count: health.services.length,
            healthy_services: health.services.filter(s => s.status === 'healthy').length,
            degraded_services: health.services.filter(s => s.status === 'degraded').length,
            unhealthy_services: health.services.filter(s => s.status === 'unhealthy').length,
            memory_used_bytes: health.system.memory.used,
            memory_total_bytes: health.system.memory.total,
            memory_percent_used: health.system.memory.percentUsed,
            heap_used_bytes: health.system.memory.heapUsed,
            heap_total_bytes: health.system.memory.heapTotal,
            process_uptime_seconds: health.system.process.uptime,
            cpu_load_average: health.system.cpu.loadAverage,
            services: health.services.reduce((acc, service) => {
              acc[service.name] = {
                status: service.status,
                response_time_ms: service.responseTime || 0,
                error: service.error || null
              };
              return acc;
            }, {} as Record<string, any>)
          };
          
          return c.json(metrics);
        },
      })
    ]
  }
});
