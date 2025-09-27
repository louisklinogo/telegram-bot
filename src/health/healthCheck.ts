import { Context } from 'hono';

/**
 * Health Check System for Production Monitoring
 * Following 2025 observability best practices with structured responses
 */

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
  correlationId?: string;
  attempts?: number;
  timestamp?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: HealthCheckResult[];
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
      percentUsed: number;
    };
    cpu: {
      loadAverage: number[];
    };
    process: {
      pid: number;
      uptime: number;
      nodeVersion: string;
    };
  };
}

/**
 * Base health checker class with retry logic and timeout handling
 * Integrated with Mastra's PinoLogger for structured logging and OpenTelemetry tracing
 */
abstract class BaseHealthChecker {
  protected timeout: number;
  protected retries: number;
  protected logger?: any; // Mastra logger instance
  protected tracer?: any; // OpenTelemetry tracer

  constructor(timeout = 5000, retries = 2, logger?: any, tracer?: any) {
    this.timeout = timeout;
    this.retries = retries;
    this.logger = logger;
    this.tracer = tracer;
  }

  /**
   * Generate correlation ID for request tracing
   */
  protected generateCorrelationId(): string {
    return `hc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Structured logging methods using Mastra's PinoLogger
   */
  protected logDebug(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.debug(message, { ...metadata, healthCheck: true });
    } else {
      console.debug(`[DEBUG] ${message}`, metadata);
    }
  }

  protected logInfo(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.info(message, { ...metadata, healthCheck: true });
    } else {
      console.log(`[INFO] ${message}`, metadata);
    }
  }

  protected logWarn(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.warn(message, { ...metadata, healthCheck: true });
    } else {
      console.warn(`[WARN] ${message}`, metadata);
    }
  }

  protected logError(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.error(message, { ...metadata, healthCheck: true });
    } else {
      console.error(`[ERROR] ${message}`, metadata);
    }
  }

  protected abstract checkHealth(): Promise<HealthCheckResult>;

  /**
   * Execute health check with timeout and retry logic
   * Integrated with Mastra's PinoLogger for structured logging and OpenTelemetry tracing
   */
  public async executeWithRetry(): Promise<HealthCheckResult> {
    let lastError: Error | undefined;
    const correlationId = this.generateCorrelationId();
    const componentName = this.constructor.name.replace('HealthChecker', '').toLowerCase();

    // Create OpenTelemetry span for tracing
    const span = this.tracer?.startSpan(`health_check.${componentName}`, {
      attributes: {
        'health.check.component': componentName,
        'health.check.correlation_id': correlationId,
        'health.check.timeout': this.timeout,
        'health.check.max_retries': this.retries,
        'service.name': 'cimantikos-telegram-bot',
        'operation.name': 'health_check'
      }
    });

    try {
      // Log health check start
      this.logInfo('Health check started', {
        correlationId,
        component: componentName,
        timeout: this.timeout,
        maxRetries: this.retries,
        traceId: span?.spanContext().traceId
      });

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const startTime = Date.now();
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Health check timeout after ${this.timeout}ms`)), this.timeout);
        });

        // Race between health check and timeout
        const result = await Promise.race([
          this.checkHealth(),
          timeoutPromise
        ]);

        const responseTime = Date.now() - startTime;
        result.responseTime = responseTime;
        result.correlationId = correlationId;
        result.attempts = attempt + 1;
        result.timestamp = new Date().toISOString();

        // Log successful health check
        this.logInfo('Health check successful', {
          correlationId,
          component: componentName,
          status: result.status,
          responseTime,
          attempt: attempt + 1,
          maxRetries: this.retries + 1,
          traceId: span?.spanContext().traceId
        });

        // Update span with success attributes
        span?.setAttributes({
          'health.check.status': result.status,
          'health.check.response_time_ms': responseTime,
          'health.check.attempts': attempt + 1,
          'health.check.success': true
        });
        span?.setStatus({ code: 1 }); // OK status
        span?.end();

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Log failed attempt
        this.logWarn('Health check attempt failed', {
          correlationId,
          component: componentName,
          attempt: attempt + 1,
          maxRetries: this.retries + 1,
          error: lastError.message,
          errorType: lastError.constructor.name,
          traceId: span?.spanContext().traceId
        });
        
        // Add attempt failure to span
        span?.addEvent('health_check_attempt_failed', {
          attempt: attempt + 1,
          error: lastError.message,
          errorType: lastError.constructor.name
        });
        
        if (attempt < this.retries) {
          // Exponential backoff delay between retries
          const delay = 1000 * Math.pow(2, attempt);
          
          this.logDebug('Health check retry backoff', {
            correlationId,
            component: componentName,
            nextAttempt: attempt + 2,
            delay
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Log final failure
    this.logError('Health check failed after all attempts', {
      correlationId,
      component: componentName,
      totalAttempts: this.retries + 1,
      finalError: lastError?.message || 'Unknown error',
      errorType: lastError?.constructor.name || 'Unknown',
      traceId: span?.spanContext().traceId
    });

    // Update span with failure attributes
    span?.setAttributes({
      'health.check.status': 'unhealthy',
      'health.check.attempts': this.retries + 1,
      'health.check.success': false,
      'health.check.error': lastError?.message || 'Unknown error',
      'health.check.error_type': lastError?.constructor.name || 'Unknown'
    });
    span?.recordException(lastError || new Error('Health check failed'));
    span?.setStatus({ code: 2, message: lastError?.message }); // ERROR status
    span?.end();

    return {
      name: componentName,
      status: 'unhealthy',
      error: lastError?.message || 'Unknown error',
      responseTime: this.timeout,
      correlationId,
      attempts: this.retries + 1,
      timestamp: new Date().toISOString()
    };
  } catch (spanError) {
    // Ensure span is ended even if there's an error in span handling
    span?.recordException(spanError);
    span?.setStatus({ code: 2, message: 'Span handling error' });
    span?.end();
    
    // Re-throw the original error or span error
    throw lastError || spanError;
    }
  }

}

/**
 * Check Notion API connectivity and response time
 */
export class NotionHealthChecker extends BaseHealthChecker {
  private apiKey: string;

  constructor(apiKey: string, logger?: any, tracer?: any) {
    super(5000, 2, logger, tracer); // 5 second timeout, 2 retries
    this.apiKey = apiKey;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });

      const isHealthy = response.ok;
      
      return {
        name: 'notion',
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          statusCode: response.status,
          statusText: response.statusText,
          endpoint: 'https://api.notion.com/v1/users/me'
        }
      };
    } catch (error) {
      return {
        name: 'notion',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Notion API error'
      };
    }
  }
}

/**
 * Check Invoice Generator API connectivity and response time
 */
export class InvoiceGeneratorHealthChecker extends BaseHealthChecker {
  private apiKey: string;

  constructor(apiKey: string, logger?: any, tracer?: any) {
    super(5000, 2, logger, tracer);
    this.apiKey = apiKey;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      // Test endpoint - using a minimal request to check API health
      const response = await fetch('https://invoice-generator.com/developers', {
        method: 'HEAD', // HEAD request to minimize data transfer
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const isHealthy = response.ok || response.status === 405; // 405 Method Not Allowed is acceptable for HEAD
      
      return {
        name: 'invoiceGenerator',
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          statusCode: response.status,
          statusText: response.statusText,
          endpoint: 'https://invoice-generator.com'
        }
      };
    } catch (error) {
      return {
        name: 'invoiceGenerator',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Invoice Generator API error'
      };
    }
  }
}

/**
 * Check Telegram Bot API connectivity
 */
export class TelegramHealthChecker extends BaseHealthChecker {
  private botToken: string;

  constructor(botToken: string, logger?: any, tracer?: any) {
    super(5000, 2, logger, tracer);
    this.botToken = botToken;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`, {
        method: 'GET',
      });

      const data = await response.json();
      const isHealthy = response.ok && data.ok;
      
      return {
        name: 'telegram',
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          statusCode: response.status,
          botUsername: data.result?.username,
          botId: data.result?.id,
          endpoint: 'https://api.telegram.org/bot*/getMe'
        }
      };
    } catch (error) {
      return {
        name: 'telegram',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Telegram API error'
      };
    }
  }
}

/**
 * Check database/storage connectivity
 */
export class StorageHealthChecker extends BaseHealthChecker {
  private storage: any; // MastraStorage type from Mastra

  constructor(storage: any, logger?: any, tracer?: any) {
    super(3000, 1, logger, tracer); // Shorter timeout for database checks
    this.storage = storage;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    if (!this.storage) {
      return {
        name: 'storage',
        status: 'unhealthy',
        error: 'No storage configured'
      };
    }

    try {
      // Test storage connectivity by attempting to list workflows
      // This is a safe read-only operation that tests database connectivity
      await this.storage.listWorkflowSnapshots?.() || Promise.resolve();
      
      return {
        name: 'storage',
        status: 'healthy',
        details: {
          type: this.storage.constructor.name,
          connected: true
        }
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Storage connection failed'
      };
    }
  }
}

/**
 * Check Google AI/LLM API connectivity
 */
export class GoogleAIHealthChecker extends BaseHealthChecker {
  private apiKey: string;

  constructor(apiKey: string, logger?: any, tracer?: any) {
    super(10000, 2, logger, tracer); // Longer timeout for AI APIs
    this.apiKey = apiKey;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      // Use the models list endpoint to check API health
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`, {
        method: 'GET',
      });

      const isHealthy = response.ok;
      
      return {
        name: 'googleAI',
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          statusCode: response.status,
          statusText: response.statusText,
          endpoint: 'https://generativelanguage.googleapis.com'
        }
      };
    } catch (error) {
      return {
        name: 'googleAI',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Google AI API error'
      };
    }
  }
}

/**
 * Check Mastra agents connectivity and responsiveness
 */
export class AgentHealthChecker extends BaseHealthChecker {
  private mastraInstance: any;
  private agentName: string;

  constructor(mastraInstance: any, agentName: string, logger?: any, tracer?: any) {
    super(8000, 2, logger, tracer); // 8 second timeout for agent responses
    this.mastraInstance = mastraInstance;
    this.agentName = agentName;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const agent = this.mastraInstance.getAgent(this.agentName);
      
      if (!agent) {
        return {
          name: 'agent',
          status: 'unhealthy',
          error: `Agent '${this.agentName}' not found`,
          details: {
            agentName: this.agentName,
            available: false
          }
        };
      }

      // Test agent with a simple ping message
      const startTime = Date.now();
      const response = await agent.generate({
        messages: [{ role: 'user', content: 'health check ping' }],
        // Add timeout to prevent hanging
        maxTokens: 10
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = !!response && typeof response.text === 'string';
      
      return {
        name: 'agent',
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          agentName: this.agentName,
          available: true,
          responseLength: response?.text?.length || 0,
          responseTime,
          modelProvider: agent.model?.provider || 'unknown'
        }
      };
    } catch (error) {
      return {
        name: 'agent',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Agent health check failed',
        details: {
          agentName: this.agentName,
          available: false,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * Check Mastra workflows system health
 */
export class WorkflowHealthChecker extends BaseHealthChecker {
  private mastraInstance: any;
  private workflowName: string;

  constructor(mastraInstance: any, workflowName: string, logger?: any, tracer?: any) {
    super(5000, 2, logger, tracer); // 5 second timeout for workflow checks
    this.mastraInstance = mastraInstance;
    this.workflowName = workflowName;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const workflow = this.mastraInstance.getWorkflow(this.workflowName);
      
      if (!workflow) {
        return {
          name: 'workflow',
          status: 'unhealthy',
          error: `Workflow '${this.workflowName}' not found`,
          details: {
            workflowName: this.workflowName,
            available: false
          }
        };
      }

      // Test workflow system without executing a full workflow
      // Just validate that the workflow can be instantiated
      const canCreateRun = typeof workflow.createRunAsync === 'function';
      
      return {
        name: 'workflow',
        status: canCreateRun ? 'healthy' : 'degraded',
        details: {
          workflowName: this.workflowName,
          available: true,
          canCreateRun,
          stepCount: workflow.steps?.length || 0
        }
      };
    } catch (error) {
      return {
        name: 'workflow',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Workflow health check failed',
        details: {
          workflowName: this.workflowName,
          available: false,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * Check Mastra memory system health
 */
export class MemoryHealthChecker extends BaseHealthChecker {
  private mastraInstance: any;

  constructor(mastraInstance: any, logger?: any, tracer?: any) {
    super(3000, 2, logger, tracer); // 3 second timeout for memory checks
    this.mastraInstance = mastraInstance;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const storage = this.mastraInstance.getStorage();
      
      if (!storage) {
        return {
          name: 'memory',
          status: 'degraded',
          error: 'No storage configured for memory system',
          details: {
            storageAvailable: false
          }
        };
      }

      // Test memory operations by checking threads
      // This is a safe read operation that tests memory connectivity
      const testResourceId = 'health-check-test';
      await storage.getThreads?.({ resourceId: testResourceId }) || Promise.resolve([]);
      
      return {
        name: 'memory',
        status: 'healthy',
        details: {
          storageAvailable: true,
          storageType: storage.constructor.name,
          memoryOperational: true
        }
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Memory system health check failed',
        details: {
          storageAvailable: true,
          memoryOperational: false,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * Get system memory and CPU information
 */
export function getSystemInfo() {
  const memoryUsage = process.memoryUsage();
  const totalMemory = require('os').totalmem();
  const freeMemory = require('os').freemem();
  const loadAverage = require('os').loadavg();

  return {
    memory: {
      used: totalMemory - freeMemory,
      free: freeMemory,
      total: totalMemory,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      percentUsed: Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
    },
    cpu: {
      loadAverage
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version
    }
  };
}

/**
 * Main health check orchestrator
 * Runs all health checks in parallel for optimal performance
 * Integrated with Mastra's PinoLogger for structured logging
 */
export class HealthCheckManager {
  private checkers: BaseHealthChecker[] = [];
  private startTime: number;
  private logger?: any;
  private tracer?: any;

  constructor(logger?: any, tracer?: any) {
    this.startTime = Date.now();
    this.logger = logger;
    this.tracer = tracer;
  }

  /**
   * Add health checkers based on available environment variables
   * Pass Mastra logger to each checker for structured logging
   */
  initializeCheckers() {
    const env = process.env;

    // Log initialization start
    this.logInfo('Initializing health checkers', {
      availableKeys: {
        notion: !!env.NOTION_API_KEY,
        invoiceGenerator: !!env.INVOICE_GENERATOR_API_KEY,
        telegram: !!env.TELEGRAM_BOT_TOKEN,
        googleAI: !!(env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY)
      }
    });

    // Add Notion checker if API key is available
    if (env.NOTION_API_KEY) {
      this.checkers.push(new NotionHealthChecker(env.NOTION_API_KEY, this.logger, this.tracer));
      this.logInfo('Added Notion health checker');
    }

    // Add Invoice Generator checker if API key is available
    if (env.INVOICE_GENERATOR_API_KEY) {
      this.checkers.push(new InvoiceGeneratorHealthChecker(env.INVOICE_GENERATOR_API_KEY, this.logger, this.tracer));
      this.logInfo('Added Invoice Generator health checker');
    }

    // Add Telegram checker if bot token is available
    if (env.TELEGRAM_BOT_TOKEN) {
      this.checkers.push(new TelegramHealthChecker(env.TELEGRAM_BOT_TOKEN, this.logger, this.tracer));
      this.logInfo('Added Telegram health checker');
    }

    // Add Google AI checker if API key is available
    if (env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.checkers.push(new GoogleAIHealthChecker(
        env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY!,
        this.logger,
        this.tracer
      ));
      this.logInfo('Added Google AI health checker');
    }

    this.logInfo('Health checker initialization complete', {
      totalCheckers: this.checkers.length
    });
  }

  /**
   * Add storage health checker (called from Mastra context)
   */
  addStorageChecker(storage: any) {
    this.checkers.push(new StorageHealthChecker(storage, this.logger, this.tracer));
    this.logInfo('Added storage health checker', {
      storageType: storage?.constructor.name || 'unknown'
    });
  }

  /**
   * Add Mastra-specific component health checkers
   */
  addMastraCheckers(mastraInstance: any) {
    this.logInfo('Adding Mastra-specific health checkers');

    // Add agent health checkers for registered agents
    const agents = mastraInstance.getAgents();
    Object.keys(agents).forEach(agentName => {
      this.checkers.push(new AgentHealthChecker(mastraInstance, agentName, this.logger, this.tracer));
      this.logInfo('Added agent health checker', { agentName });
    });

    // Add workflow health checkers for registered workflows  
    const workflows = mastraInstance.getWorkflows();
    Object.keys(workflows).forEach(workflowName => {
      this.checkers.push(new WorkflowHealthChecker(mastraInstance, workflowName, this.logger, this.tracer));
      this.logInfo('Added workflow health checker', { workflowName });
    });

    // Add memory system health checker
    this.checkers.push(new MemoryHealthChecker(mastraInstance, this.logger, this.tracer));
    this.logInfo('Added memory health checker');

    this.logInfo('Mastra-specific health checkers added', {
      agentCheckers: Object.keys(agents).length,
      workflowCheckers: Object.keys(workflows).length,
      memoryChecker: 1
    });
  }

  /**
   * Run all health checks in parallel and return comprehensive status
   * With structured logging and performance metrics
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const healthCheckCorrelationId = `hc-mgr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logInfo('Starting comprehensive health check', {
      correlationId: healthCheckCorrelationId,
      checkerCount: this.checkers.length
    });

    // Run all health checks in parallel for better performance
    const serviceResults = await Promise.all(
      this.checkers.map(checker => checker.executeWithRetry())
    );

    const systemInfo = getSystemInfo();
    const executionTime = Date.now() - startTime;
    
    // Determine overall health status
    const overallStatus = this.calculateOverallStatus(serviceResults);
    
    // Log health check completion with summary
    this.logInfo('Health check completed', {
      correlationId: healthCheckCorrelationId,
      overallStatus,
      executionTime,
      serviceCount: serviceResults.length,
      healthyServices: serviceResults.filter(s => s.status === 'healthy').length,
      degradedServices: serviceResults.filter(s => s.status === 'degraded').length,
      unhealthyServices: serviceResults.filter(s => s.status === 'unhealthy').length,
      memoryUsage: systemInfo.memory.percentUsed
    });
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: serviceResults,
      system: systemInfo
    };
  }

  /**
   * Structured logging methods using Mastra's PinoLogger
   */
  private logInfo(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.info(message, { ...metadata, healthCheckManager: true });
    } else {
      console.log(`[INFO] [HealthManager] ${message}`, metadata);
    }
  }

  private logWarn(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.warn(message, { ...metadata, healthCheckManager: true });
    } else {
      console.warn(`[WARN] [HealthManager] ${message}`, metadata);
    }
  }

  private logError(message: string, metadata?: any): void {
    if (this.logger) {
      this.logger.error(message, { ...metadata, healthCheckManager: true });
    } else {
      console.error(`[ERROR] [HealthManager] ${message}`, metadata);
    }
  }

  /**
   * Calculate overall health status based on individual service statuses
   */
  private calculateOverallStatus(services: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.length === 0) return 'healthy';

    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    // If more than half of services are unhealthy, overall status is unhealthy
    if (unhealthyCount > services.length / 2) {
      return 'unhealthy';
    }

    // If any services are unhealthy or degraded, overall status is degraded
    if (unhealthyCount > 0 || degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get a simplified health status for liveness probes
   */
  async getSimpleHealth(): Promise<{ status: 'ok' | 'error', timestamp: string }> {
    try {
      const health = await this.checkHealth();
      return {
        status: health.status === 'unhealthy' ? 'error' : 'ok',
        timestamp: health.timestamp
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Create health check response with appropriate HTTP status codes
 * Following 2025 observability standards
 */
export function createHealthResponse(c: Context, health: HealthStatus) {
  // Add standard health check headers
  c.header('Content-Type', 'application/json');
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('X-Health-Status', health.status);
  c.header('X-Health-Timestamp', health.timestamp);

  // Set HTTP status based on health status with proper type casting
  if (health.status === 'degraded') {
    c.status(200); // Still operational, but with warnings
  } else if (health.status === 'unhealthy') {
    c.status(503); // Service Unavailable
  } else {
    c.status(200); // Healthy
  }
  
  return c.json(health);
}
