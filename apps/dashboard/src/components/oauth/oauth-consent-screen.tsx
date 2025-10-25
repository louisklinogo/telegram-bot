"use client";

import { AlertTriangle, ExternalLink, Shield } from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  onAuthorize: (decision: "allow" | "deny", teamId: string, scopes: string[]) => void;
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
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const hasHighRiskScopes = selectedScopes.some((scope) => {
    const scopeInfo = SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS];
    return scopeInfo?.risk === "high" || scopeInfo?.risk === "critical";
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Application Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Avatar className="h-16 w-16">
                <AvatarImage alt={application.name} src={application.logoUrl} />
                <AvatarFallback className="font-semibold text-lg">
                  {application.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <CardTitle className="text-xl">Authorize {application.name}</CardTitle>

            <CardDescription className="text-center">
              {application.description ||
                `${application.name} wants to access your Faworra account`}
            </CardDescription>

            {application.website && (
              <div className="flex justify-center pt-2">
                <a
                  className="inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
                  href={application.website}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
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
              <CardTitle className="font-medium text-sm">Select Team</CardTitle>
              <CardDescription>Choose which team to grant access to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userTeams.map((team) => (
                <div
                  className={`flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors ${
                    selectedTeamId === team.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  <input
                    checked={selectedTeamId === team.id}
                    className="h-4 w-4"
                    name="team"
                    onChange={() => setSelectedTeamId(team.id)}
                    type="radio"
                    value={team.id}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage alt={team.name} src={team.logoUrl} />
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
            <CardTitle className="flex items-center font-medium text-sm">
              <Shield className="mr-2 h-4 w-4" />
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
                  <div className="flex items-start space-x-3" key={scope}>
                    <input
                      checked={isSelected}
                      className="mt-1"
                      onChange={() => handleScopeToggle(scope)}
                      type="checkbox"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{scope}</div>
                      <div className="text-muted-foreground text-sm">Custom permission scope</div>
                    </div>
                    <Badge className="text-xs" variant="outline">
                      Custom
                    </Badge>
                  </div>
                );
              }

              return (
                <div className="flex items-start space-x-3" key={scope}>
                  <input
                    checked={isSelected}
                    className="mt-1"
                    onChange={() => handleScopeToggle(scope)}
                    type="checkbox"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{scopeInfo.title}</div>
                    <div className="text-muted-foreground text-sm">{scopeInfo.description}</div>
                  </div>
                  <Badge className={`text-xs ${getRiskColor(scopeInfo.risk)}`} variant="outline">
                    {scopeInfo.risk}
                  </Badge>
                </div>
              );
            })}

            {hasHighRiskScopes && (
              <div className="flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div className="text-sm">
                  <div className="font-medium text-amber-800">High-risk permissions</div>
                  <div className="text-amber-700">
                    This application is requesting sensitive permissions that could access or modify
                    important data.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="space-y-2 text-center text-muted-foreground text-sm">
              <div>
                By authorizing this application, you allow it to access your Faworra account on your
                behalf with the selected permissions.
              </div>
              <div>You can revoke access at any time in your account settings.</div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            className="flex-1"
            disabled={isLoading}
            onClick={() => onAuthorize("deny", selectedTeamId, [])}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={isLoading || selectedScopes.length === 0 || !selectedTeamId}
            onClick={() => onAuthorize("allow", selectedTeamId, selectedScopes)}
          >
            {isLoading ? "Authorizing..." : "Authorize"}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-xs">
          <div>Secured by Faworra OAuth 2.0</div>
          <div className="mt-1">
            Client ID:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{application.clientId}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
