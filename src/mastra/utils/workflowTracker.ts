/**
 * Simple Workflow Status Tracker
 * 
 * Provides lightweight tracking for workflow execution without external dependencies.
 * Uses in-memory storage suitable for single-instance applications.
 */

interface WorkflowStatus {
  id: string;
  type: 'invoice' | 'measurement';
  userId: string;
  chatId: number;
  status: 'started' | 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

class WorkflowTracker {
  private workflows = new Map<string, WorkflowStatus>();
  
  /**
   * Start tracking a workflow
   */
  startWorkflow(params: {
    id: string;
    type: 'invoice' | 'measurement';
    userId: string;
    chatId: number;
    metadata?: Record<string, any>;
  }): WorkflowStatus {
    const workflow: WorkflowStatus = {
      ...params,
      status: 'started',
      startTime: new Date(),
    };
    
    this.workflows.set(params.id, workflow);
    console.log(`🚀 Workflow started: ${params.type} for user ${params.userId} (${params.id})`);
    
    return workflow;
  }
  
  /**
   * Update workflow status
   */
  updateWorkflow(id: string, updates: Partial<Pick<WorkflowStatus, 'status' | 'error' | 'metadata'>>) {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      console.warn(`Workflow ${id} not found for update`);
      return null;
    }
    
    Object.assign(workflow, updates);
    
    if (updates.status === 'completed' || updates.status === 'failed') {
      workflow.endTime = new Date();
      const duration = workflow.endTime.getTime() - workflow.startTime.getTime();
      console.log(`✅ Workflow ${updates.status}: ${workflow.type} for user ${workflow.userId} (${duration}ms)`);
    }
    
    this.workflows.set(id, workflow);
    return workflow;
  }
  
  /**
   * Get workflow status
   */
  getWorkflow(id: string): WorkflowStatus | null {
    return this.workflows.get(id) || null;
  }
  
  /**
   * Get all workflows for a user
   */
  getUserWorkflows(userId: string): WorkflowStatus[] {
    return Array.from(this.workflows.values()).filter(w => w.userId === userId);
  }
  
  /**
   * Clean up completed workflows older than specified time
   */
  cleanup(olderThanMinutes: number = 60) {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    let cleaned = 0;
    
    for (const [id, workflow] of this.workflows.entries()) {
      if (workflow.endTime && workflow.endTime < cutoffTime) {
        this.workflows.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old workflow records`);
    }
  }
  
  /**
   * Generate a workflow ID
   */
  generateWorkflowId(type: string, userId: string): string {
    return `${type}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global instance
export const workflowTracker = new WorkflowTracker();

// Auto-cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    workflowTracker.cleanup();
  }, 30 * 60 * 1000);
}