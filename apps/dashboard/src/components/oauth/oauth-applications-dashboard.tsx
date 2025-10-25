"use client";

import { Label } from "@Faworra/ui/label";
import {
  BarChart3,
  Calendar,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  MoreHorizontal,
  Plus,
  Settings,
  Shield,
  Trash,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/**
 * OAuth Applications Management Dashboard
 * Following Midday's developer portal patterns for OAuth app management
 */

interface OAuthApplication {
  id: string;
  name: string;
  slug: string;
  description?: string;
  overview?: string;
  developerName?: string;
  logoUrl?: string;
  website?: string;
  installUrl?: string;
  screenshots: string[];
  redirectUris: string[];
  clientId: string;
  scopes: string[];
  isPublic: boolean;
  active: boolean;
  status: "draft" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  // Statistics
  totalAuthorizations?: number;
  activeTokens?: number;
  lastUsed?: string;
}

interface OAuthApplicationsDashboardProps {
  applications: OAuthApplication[];
  onCreateApplication: (data: Partial<OAuthApplication>) => void;
  onUpdateApplication: (id: string, data: Partial<OAuthApplication>) => void;
  onDeleteApplication: (id: string) => void;
  onRegenerateSecret: (id: string) => Promise<{ clientSecret: string }>;
  onToggleStatus: (id: string, active: boolean) => void;
  isLoading?: boolean;
}

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const AVAILABLE_SCOPES = [
  { id: "profile.read", name: "Profile (Read)", description: "View basic profile information" },
  { id: "profile.write", name: "Profile (Write)", description: "Update profile information" },
  { id: "teams.read", name: "Teams (Read)", description: "View team information" },
  { id: "teams.write", name: "Teams (Write)", description: "Manage teams" },
  { id: "transactions.read", name: "Transactions (Read)", description: "View transactions" },
  { id: "transactions.write", name: "Transactions (Write)", description: "Manage transactions" },
  { id: "invoices.read", name: "Invoices (Read)", description: "View invoices" },
  { id: "invoices.write", name: "Invoices (Write)", description: "Manage invoices" },
  { id: "reports.read", name: "Reports (Read)", description: "Generate reports" },
  { id: "files.read", name: "Files (Read)", description: "View files" },
  { id: "files.write", name: "Files (Write)", description: "Manage files" },
  { id: "analytics.read", name: "Analytics (Read)", description: "View analytics data" },
  { id: "admin.read", name: "Admin (Read)", description: "Full read access" },
  { id: "admin.write", name: "Admin (Write)", description: "Full administrative access" },
];

export function OAuthApplicationsDashboard({
  applications,
  onCreateApplication,
  onUpdateApplication,
  onDeleteApplication,
  onRegenerateSecret,
  onToggleStatus,
  isLoading = false,
}: OAuthApplicationsDashboardProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<OAuthApplication | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleSecretVisibility = (appId: string) => {
    setRevealedSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  const handleRegenerateSecret = async (appId: string) => {
    try {
      const { clientSecret } = await onRegenerateSecret(appId);
      setRevealedSecrets((prev) => new Set(prev).add(appId));
      toast.success("Client secret regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate client secret");
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">OAuth Applications</h1>
          <p className="text-muted-foreground">Manage third-party integrations and API access</p>
        </div>
        <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create OAuth Application</DialogTitle>
              <DialogDescription>
                Create a new OAuth application to enable third-party integrations
              </DialogDescription>
            </DialogHeader>
            <CreateApplicationForm
              onSubmit={(data) => {
                onCreateApplication(data);
                setShowCreateDialog(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Applications Grid */}
      {applications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No OAuth Applications</h3>
              <p className="text-muted-foreground">
                Create your first OAuth application to enable third-party integrations
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Application
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <Card className="relative" key={app.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage alt={app.name} src={app.logoUrl} />
                      <AvatarFallback>{app.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{app.name}</CardTitle>
                      {app.website && (
                        <a
                          className="inline-flex items-center text-muted-foreground text-xs hover:text-foreground"
                          href={app.website}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={STATUS_COLORS[app.status]}>{app.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingApp(app)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegenerateSecret(app.id)}>
                          <Key className="mr-2 h-4 w-4" />
                          Regenerate Secret
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={app.active ? "text-red-600" : "text-green-600"}
                          onClick={() => onToggleStatus(app.id, !app.active)}
                        >
                          {app.active ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-red-600"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{app.name}" and revoke all associated
                                tokens. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => onDeleteApplication(app.id)}
                              >
                                Delete Application
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {app.description && (
                  <CardDescription className="text-sm">{app.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Authorizations:</span>
                    <span className="font-medium">{app.totalAuthorizations || 0}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Active tokens:</span>
                    <span className="font-medium">{app.activeTokens || 0}</span>
                  </div>
                </div>

                {/* Client ID */}
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">Client ID</Label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                      {app.clientId}
                    </code>
                    <Button
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(app.clientId, "Client ID")}
                      size="sm"
                      variant="ghost"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Client Secret */}
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">Client Secret</Label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs">
                      {revealedSecrets.has(app.id)
                        ? `faw_secret_${"•".repeat(20)}`
                        : "•".repeat(32)}
                    </code>
                    <Button
                      className="h-8 w-8 p-0"
                      onClick={() => toggleSecretVisibility(app.id)}
                      size="sm"
                      variant="ghost"
                    >
                      {revealedSecrets.has(app.id) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard("faw_secret_hidden", "Client Secret")}
                      size="sm"
                      variant="ghost"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Scopes */}
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs">Scopes</Label>
                  <div className="flex flex-wrap gap-1">
                    {app.scopes.slice(0, 3).map((scope) => (
                      <Badge className="text-xs" key={scope} variant="secondary">
                        {scope}
                      </Badge>
                    ))}
                    {app.scopes.length > 3 && (
                      <Badge className="text-xs" variant="outline">
                        +{app.scopes.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${app.active ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-muted-foreground">
                      {app.active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Application Dialog */}
      {editingApp && (
        <Dialog onOpenChange={() => setEditingApp(null)} open={true}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {editingApp.name}</DialogTitle>
              <DialogDescription>Update your OAuth application settings</DialogDescription>
            </DialogHeader>
            <EditApplicationForm
              application={editingApp}
              onCancel={() => setEditingApp(null)}
              onSubmit={(data) => {
                onUpdateApplication(editingApp.id, data);
                setEditingApp(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create Application Form Component
function CreateApplicationForm({
  onSubmit,
}: {
  onSubmit: (data: Partial<OAuthApplication>) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    redirectUris: [""],
    scopes: [] as string[],
    isPublic: false,
  });

  const handleScopeToggle = (scopeId: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  };

  const addRedirectUri = () => {
    setFormData((prev) => ({
      ...prev,
      redirectUris: [...prev.redirectUris, ""],
    }));
  };

  const updateRedirectUri = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      redirectUris: prev.redirectUris.map((uri, i) => (i === index ? value : uri)),
    }));
  };

  const removeRedirectUri = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      redirectUris: prev.redirectUris.filter((_, i) => i !== index),
    }));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...formData,
          redirectUris: formData.redirectUris.filter((uri) => uri.trim() !== ""),
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Application Name*</Label>
        <Input
          id="name"
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="My Awesome App"
          required
          value={formData.name}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="A brief description of your application"
          rows={3}
          value={formData.description}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website URL</Label>
        <Input
          id="website"
          onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
          placeholder="https://myapp.com"
          type="url"
          value={formData.website}
        />
      </div>

      <div className="space-y-2">
        <Label>Redirect URIs*</Label>
        <div className="space-y-2">
          {formData.redirectUris.map((uri, index) => (
            <div className="flex space-x-2" key={index}>
              <Input
                onChange={(e) => updateRedirectUri(index, e.target.value)}
                placeholder="https://myapp.com/callback"
                required={index === 0}
                value={uri}
              />
              {formData.redirectUris.length > 1 && (
                <Button
                  onClick={() => removeRedirectUri(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button onClick={addRedirectUri} size="sm" type="button" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Redirect URI
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Scopes*</Label>
        <div className="grid max-h-64 grid-cols-1 gap-3 overflow-y-auto">
          {AVAILABLE_SCOPES.map((scope) => (
            <div className="flex items-start space-x-3 rounded-lg border p-3" key={scope.id}>
              <input
                checked={formData.scopes.includes(scope.id)}
                className="mt-1"
                onChange={() => handleScopeToggle(scope.id)}
                type="checkbox"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{scope.name}</div>
                <div className="text-muted-foreground text-xs">{scope.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isPublic}
          id="isPublic"
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPublic: checked }))}
        />
        <Label className="text-sm" htmlFor="isPublic">
          Public Application (PKCE required)
        </Label>
      </div>

      <div className="flex justify-end space-x-3">
        <Button disabled={!formData.name || formData.scopes.length === 0} type="submit">
          Create Application
        </Button>
      </div>
    </form>
  );
}

// Edit Application Form Component
function EditApplicationForm({
  application,
  onSubmit,
  onCancel,
}: {
  application: OAuthApplication;
  onSubmit: (data: Partial<OAuthApplication>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: application.name,
    description: application.description || "",
    website: application.website || "",
    redirectUris: application.redirectUris,
    scopes: application.scopes,
    isPublic: application.isPublic,
    active: application.active,
  });

  // Similar form implementation as CreateApplicationForm but with edit-specific logic
  // Implementation details similar to create form...

  return (
    <div className="space-y-6">
      {/* Form fields similar to create form */}
      <div className="text-muted-foreground text-sm">
        Edit form implementation would go here with pre-populated values
      </div>

      <div className="flex justify-end space-x-3">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button onClick={() => onSubmit(formData)}>Update Application</Button>
      </div>
    </div>
  );
}
