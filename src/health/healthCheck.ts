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
 */
abstract class BaseHealthChecker {
  protected timeout: number;
  protected retries: number;

  constructor(timeout = 5000, retries = 2) {
    this.timeout = timeout;
    this.retries = retries;
  }

  abstract check(): Promise<HealthCheckResult>;

  /**
   * Execute health check with timeout and retry logic
   */
  public async executeWithRetry(): Promise<HealthCheckResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const startTime = Date.now();
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), this.timeout);
        });

        // Race between health check and timeout
        const result = await Promise.race([
          this.check(),
          timeoutPromise
        ]);

        result.responseTime = Date.now() - startTime;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.retries) {
          // Exponential backoff delay between retries
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    return {
      name: this.constructor.name.replace('HealthChecker', ''),
      status: 'unhealthy',
      error: lastError?.message || 'Unknown error',
      responseTime: this.timeout
    };
  }
}

/**
 * Check Notion API connectivity and response time
 */
export class NotionHealthChecker extends BaseHealthChecker {
  private apiKey: string;

  constructor(apiKey: string) {
    super(5000, 2); // 5 second timeout, 2 retries
    this.apiKey = apiKey;
  }

  async check(): Promise<HealthCheckResult> {
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

  constructor(apiKey: string) {
    super(5000, 2);
    this.apiKey = apiKey;
  }

  async check(): Promise<HealthCheckResult> {
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

  constructor(botToken: string) {
    super(5000, 2);
    this.botToken = botToken;
  }

  async check(): Promise<HealthCheckResult> {
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

  constructor(storage: any) {
    super(3000, 1); // Shorter timeout for database checks
    this.storage = storage;
  }

  async check(): Promise<HealthCheckResult> {
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

  constructor(apiKey: string) {
    super(10000, 2); // Longer timeout for AI APIs
    this.apiKey = apiKey;
  }

  async check(): Promise<HealthCheckResult> {
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
 */
export class HealthCheckManager {
  private checkers: BaseHealthChecker[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Add health checkers based on available environment variables
   */
  initializeCheckers() {
    const env = process.env;

    // Add Notion checker if API key is available
    if (env.NOTION_API_KEY) {
      this.checkers.push(new NotionHealthChecker(env.NOTION_API_KEY));
    }

    // Add Invoice Generator checker if API key is available
    if (env.INVOICE_GENERATOR_API_KEY) {
      this.checkers.push(new InvoiceGeneratorHealthChecker(env.INVOICE_GENERATOR_API_KEY));
    }

    // Add Telegram checker if bot token is available
    if (env.TELEGRAM_BOT_TOKEN) {
      this.checkers.push(new TelegramHealthChecker(env.TELEGRAM_BOT_TOKEN));
    }

    // Add Google AI checker if API key is available
    if (env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.checkers.push(new GoogleAIHealthChecker(
        env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY!
      ));
    }
  }

  /**
   * Add storage health checker (called from Mastra context)
   */
  addStorageChecker(storage: any) {
    this.checkers.push(new StorageHealthChecker(storage));
  }

  /**
   * Run all health checks in parallel and return comprehensive status
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    // Run all health checks in parallel for better performance
    const serviceResults = await Promise.all(
      this.checkers.map(checker => checker.executeWithRetry())
    );

    const systemInfo = getSystemInfo();
    
    // Determine overall health status
    const overallStatus = this.calculateOverallStatus(serviceResults);
    
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
