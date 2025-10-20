export interface AuthEvent {
  event: "SignIn.Success" | "SignIn.Failed" | "SignOut" | "TokenRefresh" | "ApiKeyUsed";
  provider?: string;
  userId?: string;
  userEmail?: string;
  error?: string;
  errorCode?: string | number;
  errorType?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export async function trackAuthEvent(event: AuthEvent) {
  try {
    // Enhanced logging with structured format
    const eventData = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    
    console.log("🔐 Auth Event:", JSON.stringify(eventData, null, 2));
    
    // TODO: Integrate with OpenPanel like Midday
    // Example OpenPanel integration:
    // const client = new OpenPanel({
    //   clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!,
    //   clientSecret: process.env.OPENPANEL_SECRET_KEY!,
    // });
    // await client.track(event.event, eventData);
    
    // TODO: Store in database for audit logging
    // await storeAuditLog(eventData);
    
  } catch (error) {
    console.error("Failed to track auth event:", error);
    // Don't throw - analytics failures shouldn't break auth flow
  }
}

// Helper for common auth events
export const AuthEvents = {
  signInSuccess: (userId: string, provider?: string, metadata?: any): AuthEvent => ({
    event: "SignIn.Success",
    userId,
    provider,
    metadata,
  }),
  
  signInFailed: (error: string, provider?: string, errorCode?: string | number, errorType?: string): AuthEvent => ({
    event: "SignIn.Failed",
    error,
    provider,
    errorCode,
    errorType,
  }),
  
  apiKeyUsed: (userId: string, teamId: string, scopes: string[]): AuthEvent => ({
    event: "ApiKeyUsed",
    userId,
    metadata: { teamId, scopes },
  }),
} as const;