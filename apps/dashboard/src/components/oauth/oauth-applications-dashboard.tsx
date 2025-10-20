"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@Faworra/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Settings, 
  MoreHorizontal, 
  Copy, 
  Eye, 
  EyeOff, 
  Key, 
  Trash, 
  Edit, 
  ExternalLink,
  Shield,
  Globe,
  Users,
  BarChart3,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

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
  status: 'draft' | 'pending' | 'approved' | 'rejected';
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
  { id: 'profile.read', name: 'Profile (Read)', description: 'View basic profile information' },
  { id: 'profile.write', name: 'Profile (Write)', description: 'Update profile information' },
  { id: 'teams.read', name: 'Teams (Read)', description: 'View team information' },
  { id: 'teams.write', name: 'Teams (Write)', description: 'Manage teams' },
  { id: 'transactions.read', name: 'Transactions (Read)', description: 'View transactions' },
  { id: 'transactions.write', name: 'Transactions (Write)', description: 'Manage transactions' },
  { id: 'invoices.read', name: 'Invoices (Read)', description: 'View invoices' },
  { id: 'invoices.write', name: 'Invoices (Write)', description: 'Manage invoices' },
  { id: 'reports.read', name: 'Reports (Read)', description: 'Generate reports' },
  { id: 'files.read', name: 'Files (Read)', description: 'View files' },
  { id: 'files.write', name: 'Files (Write)', description: 'Manage files' },
  { id: 'analytics.read', name: 'Analytics (Read)', description: 'View analytics data' },
  { id: 'admin.read', name: 'Admin (Read)', description: 'Full read access' },
  { id: 'admin.write', name: 'Admin (Write)', description: 'Full administrative access' },
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
    setRevealedSecrets(prev => {
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
      setRevealedSecrets(prev => new Set(prev).add(appId));
      toast.success("Client secret regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate client secret");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">OAuth Applications</h1>
          <p className="text-muted-foreground">
            Manage third-party integrations and API access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No OAuth Applications</h3>
              <p className="text-muted-foreground">
                Create your first OAuth application to enable third-party integrations
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Application
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <Card key={app.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={app.logoUrl} alt={app.name} />
                      <AvatarFallback>
                        {app.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{app.name}</CardTitle>
                      {app.website && (
                        <a
                          href={app.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={STATUS_COLORS[app.status]}>
                      {app.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingApp(app)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegenerateSecret(app.id)}>
                          <Key className="h-4 w-4 mr-2" />
                          Regenerate Secret
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleStatus(app.id, !app.active)}
                          className={app.active ? "text-red-600" : "text-green-600"}
                        >
                          {app.active ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{app.name}" and revoke all associated tokens.
                                This action cannot be undone.
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
                  <CardDescription className="text-sm">
                    {app.description}
                  </CardDescription>
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
                  <Label className="text-xs font-medium text-muted-foreground">Client ID</Label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono truncate">
                      {app.clientId}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(app.clientId, "Client ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Client Secret */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Client Secret</Label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono">
                      {revealedSecrets.has(app.id) 
                        ? `faw_secret_${'•'.repeat(20)}` 
                        : '•'.repeat(32)
                      }
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleSecretVisibility(app.id)}
                    >
                      {revealedSecrets.has(app.id) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(`faw_secret_hidden`, "Client Secret")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Scopes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Scopes</Label>
                  <div className="flex flex-wrap gap-1">
                    {app.scopes.slice(0, 3).map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                    {app.scopes.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{app.scopes.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${app.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-muted-foreground">
                      {app.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Application Dialog */}
      {editingApp && (
        <Dialog open={true} onOpenChange={() => setEditingApp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {editingApp.name}</DialogTitle>
              <DialogDescription>
                Update your OAuth application settings
              </DialogDescription>
            </DialogHeader>
            <EditApplicationForm
              application={editingApp}
              onSubmit={(data) => {
                onUpdateApplication(editingApp.id, data);
                setEditingApp(null);
              }}
              onCancel={() => setEditingApp(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create Application Form Component
function CreateApplicationForm({ onSubmit }: { onSubmit: (data: Partial<OAuthApplication>) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    redirectUris: [""],
    scopes: [] as string[],
    isPublic: false,
  });

  const handleScopeToggle = (scopeId: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId]
    }));
  };

  const addRedirectUri = () => {
    setFormData(prev => ({
      ...prev,
      redirectUris: [...prev.redirectUris, ""]
    }));
  };

  const updateRedirectUri = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirectUris: prev.redirectUris.map((uri, i) => i === index ? value : uri)
    }));
  };

  const removeRedirectUri = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirectUris: prev.redirectUris.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...formData,
        redirectUris: formData.redirectUris.filter(uri => uri.trim() !== "")
      });
    }} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Application Name*</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="My Awesome App"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="A brief description of your application"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website URL</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          placeholder="https://myapp.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Redirect URIs*</Label>
        <div className="space-y-2">
          {formData.redirectUris.map((uri, index) => (
            <div key={index} className="flex space-x-2">
              <Input
                value={uri}
                onChange={(e) => updateRedirectUri(index, e.target.value)}
                placeholder="https://myapp.com/callback"
                required={index === 0}
              />
              {formData.redirectUris.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRedirectUri(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRedirectUri}>
          <Plus className="h-4 w-4 mr-2" />
          Add Redirect URI
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Scopes*</Label>
        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
          {AVAILABLE_SCOPES.map((scope) => (
            <div key={scope.id} className="flex items-start space-x-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.scopes.includes(scope.id)}
                onChange={() => handleScopeToggle(scope.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{scope.name}</div>
                <div className="text-xs text-muted-foreground">{scope.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isPublic"
          checked={formData.isPublic}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
        />
        <Label htmlFor="isPublic" className="text-sm">
          Public Application (PKCE required)
        </Label>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={!formData.name || formData.scopes.length === 0}>
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
  onCancel 
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
      <div className="text-sm text-muted-foreground">
        Edit form implementation would go here with pre-populated values
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(formData)}>Update Application</Button>
      </div>
    </div>
  );
}