"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Shield, AlertTriangle } from "lucide-react";

/**
 * OAuth Consent Screen Component
 * Following Midday's exact consent screen patterns and design
 */

interface OAuthApplication {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  clientId: string;
  scopes: string[];
  redirectUri: string;
  state?: string;
}

interface OAuthConsentScreenProps {
  application: OAuthApplication;
  userTeams: Array<{
    id: string;
    name: string;
    logoUrl?: string;
  }>;
  onAuthorize: (decision: 'allow' | 'deny', teamId: string, scopes: string[]) => void;
  isLoading?: boolean;
}

// Scope descriptions following Midday's patterns
const SCOPE_DESCRIPTIONS = {
  // Basic user information
  "profile.read": {
    title: "View your profile",
    description: "Access your basic profile information including name and email",
    risk: "low" as const,
  },
  "profile.write": {
    title: "Update your profile",
    description: "Modify your profile information and settings",
    risk: "medium" as const,
  },
  
  // Team information
  "teams.read": {
    title: "View your teams",
    description: "Access information about teams you're a member of",
    risk: "low" as const,
  },
  "teams.write": {
    title: "Manage your teams", 
    description: "Create, update, and manage team settings and members",
    risk: "high" as const,
  },
  
  // Business data
  "transactions.read": {
    title: "View transactions",
    description: "Access your financial transactions and records",
    risk: "medium" as const,
  },
  "transactions.write": {
    title: "Manage transactions",
    description: "Create, update, and delete financial transactions",
    risk: "high" as const,
  },
  "invoices.read": {
    title: "View invoices",
    description: "Access your invoices and billing information",
    risk: "medium" as const,
  },
  "invoices.write": {
    title: "Manage invoices",
    description: "Create, update, and manage invoices and billing",
    risk: "high" as const,
  },
  "reports.read": {
    title: "Generate reports",
    description: "Create and view financial reports and analytics",
    risk: "medium" as const,
  },
  
  // Files and attachments
  "files.read": {
    title: "View files",
    description: "Access uploaded files and attachments",
    risk: "low" as const,
  },
  "files.write": {
    title: "Manage files", 
    description: "Upload, modify, and delete files and attachments",
    risk: "medium" as const,
  },
  
  // Admin and analytics
  "analytics.read": {
    title: "View analytics",
    description: "Access detailed analytics and usage data",
    risk: "medium" as const,
  },
  "admin.read": {
    title: "Full read access",
    description: "Complete read access to all team data and settings",
    risk: "high" as const,
  },
  "admin.write": {
    title: "Full administrative access",
    description: "Complete administrative control over team data and settings",
    risk: "critical" as const,
  },
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function OAuthConsentScreen({
  application,
  userTeams,
  onAuthorize,
  isLoading = false,
}: OAuthConsentScreenProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeams[0]?.id || "");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(application.scopes);

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const hasHighRiskScopes = selectedScopes.some(scope => {
    const scopeInfo = SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS];
    return scopeInfo?.risk === "high" || scopeInfo?.risk === "critical";
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Application Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={application.logoUrl} alt={application.name} />
                <AvatarFallback className="text-lg font-semibold">
                  {application.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <CardTitle className="text-xl">
              Authorize {application.name}
            </CardTitle>
            
            <CardDescription className="text-center">
              {application.description || `${application.name} wants to access your Faworra account`}
            </CardDescription>

            {application.website && (
              <div className="flex justify-center pt-2">
                <a
                  href={application.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit website
                </a>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Team Selection */}
        {userTeams.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Select Team</CardTitle>
              <CardDescription>
                Choose which team to grant access to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userTeams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTeamId === team.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  <input
                    type="radio"
                    name="team"
                    value={team.id}
                    checked={selectedTeamId === team.id}
                    onChange={() => setSelectedTeamId(team.id)}
                    className="h-4 w-4"
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={team.logoUrl} alt={team.name} />
                    <AvatarFallback className="text-xs">
                      {team.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{team.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Requested Permissions
            </CardTitle>
            <CardDescription>
              This application is requesting the following permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.scopes.map((scope) => {
              const scopeInfo = SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS];
              const isSelected = selectedScopes.includes(scope);
              
              if (!scopeInfo) {
                return (
                  <div key={scope} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleScopeToggle(scope)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{scope}</div>
                      <div className="text-sm text-muted-foreground">
                        Custom permission scope
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  </div>
                );
              }

              return (
                <div key={scope} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleScopeToggle(scope)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{scopeInfo.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {scopeInfo.description}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getRiskColor(scopeInfo.risk)}`}
                  >
                    {scopeInfo.risk}
                  </Badge>
                </div>
              );
            })}

            {hasHighRiskScopes && (
              <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-amber-800">High-risk permissions</div>
                  <div className="text-amber-700">
                    This application is requesting sensitive permissions that could access or modify important data.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <div>
                By authorizing this application, you allow it to access your Faworra account 
                on your behalf with the selected permissions.
              </div>
              <div>
                You can revoke access at any time in your account settings.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onAuthorize('deny', selectedTeamId, [])}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => onAuthorize('allow', selectedTeamId, selectedScopes)}
            disabled={isLoading || selectedScopes.length === 0 || !selectedTeamId}
          >
            {isLoading ? "Authorizing..." : "Authorize"}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <div>Secured by Faworra OAuth 2.0</div>
          <div className="mt-1">
            Client ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">
              {application.clientId}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}