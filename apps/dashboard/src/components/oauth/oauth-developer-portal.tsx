"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Key,
  Search,
  Settings,
  Shield,
  Star,
  Users,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * OAuth Developer Portal
 * Following Midday's app marketplace patterns for OAuth application discovery
 */

interface OAuthApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  overview: string;
  developerName: string;
  logoUrl?: string;
  website?: string;
  installUrl?: string;
  screenshots: string[];
  category: string;
  tags: string[];
  scopes: string[];
  isVerified: boolean;
  rating: number;
  totalInstalls: number;
  lastUpdated: string;
  status: "approved" | "pending" | "rejected";
  pricing: "free" | "paid" | "freemium";
}

interface OAuthDeveloperPortalProps {
  applications: OAuthApp[];
  onInstallApp: (appId: string) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  "All",
  "Analytics",
  "Accounting",
  "CRM",
  "Marketing",
  "Productivity",
  "Communication",
  "Integration",
  "Security",
  "Reporting",
];

const SCOPE_DESCRIPTIONS = {
  "profile.read": "Access basic profile information",
  "profile.write": "Update profile information",
  "teams.read": "View team information",
  "teams.write": "Manage teams and members",
  "transactions.read": "View financial transactions",
  "transactions.write": "Create and manage transactions",
  "invoices.read": "Access invoice data",
  "invoices.write": "Create and manage invoices",
  "reports.read": "Generate financial reports",
  "files.read": "Access files and documents",
  "files.write": "Upload and manage files",
  "analytics.read": "View analytics and insights",
  "admin.read": "Full read access to all data",
  "admin.write": "Full administrative access",
};

export function OAuthDeveloperPortal({
  applications,
  onInstallApp,
  isLoading = false,
}: OAuthDeveloperPortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedApp, setSelectedApp] = useState<OAuthApp | null>(null);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.developerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || app.category === selectedCategory;
    return matchesSearch && matchesCategory && app.status === "approved";
  });

  const featuredApps = applications
    .filter((app) => app.status === "approved" && app.rating >= 4.5 && app.totalInstalls > 100)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="container mx-auto px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h1 className="font-bold text-4xl">Faworra Developer Portal</h1>
            <p className="text-muted-foreground text-xl">
              Discover integrations that extend Faworra's capabilities. Connect your favorite tools
              and automate your financial workflows.
            </p>
            <div className="flex items-center justify-center space-x-4 pt-4">
              <Button size="lg">
                <Code2 className="mr-2 h-5 w-5" />
                Browse Integrations
              </Button>
              <Button size="lg" variant="outline">
                <BookOpen className="mr-2 h-5 w-5" />
                Developer Docs
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Featured Apps */}
        {featuredApps.length > 0 && (
          <section className="mb-12">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-2xl">Featured Integrations</h2>
                <p className="text-muted-foreground">Popular and highly-rated applications</p>
              </div>
              <Button variant="outline">View All</Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredApps.map((app) => (
                <Card
                  className="group cursor-pointer transition-shadow hover:shadow-lg"
                  key={app.id}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage alt={app.name} src={app.logoUrl} />
                          <AvatarFallback>{app.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">{app.name}</CardTitle>
                            {app.isVerified && (
                              <Badge className="text-xs" variant="secondary">
                                <Check className="mr-1 h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm">{app.developerName}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{app.pricing}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="line-clamp-2 text-muted-foreground text-sm">{app.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{app.rating}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Download className="h-4 w-4" />
                        <span>{app.totalInstalls.toLocaleString()} installs</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button className="flex-1" onClick={() => setSelectedApp(app)} size="sm">
                        View Details
                      </Button>
                      <Button onClick={() => onInstallApp(app.id)} size="sm" variant="outline">
                        Install
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search integrations..."
              value={searchQuery}
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {CATEGORIES.map((category) => (
              <Button
                className="whitespace-nowrap"
                key={category}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                variant={selectedCategory === category ? "default" : "outline"}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <Card className="group transition-shadow hover:shadow-lg" key={app.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage alt={app.name} src={app.logoUrl} />
                      <AvatarFallback>{app.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base">{app.name}</CardTitle>
                        {app.isVerified && <Check className="h-4 w-4 text-green-600" />}
                      </div>
                      <p className="text-muted-foreground text-xs">{app.developerName}</p>
                    </div>
                  </div>
                  <Badge className="text-xs" variant="outline">
                    {app.category}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="line-clamp-2 text-muted-foreground text-sm">{app.description}</p>

                <div className="flex flex-wrap gap-1">
                  {app.tags.slice(0, 3).map((tag) => (
                    <Badge className="text-xs" key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {app.tags.length > 3 && (
                    <Badge className="text-xs" variant="outline">
                      +{app.tags.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{app.rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {app.totalInstalls.toLocaleString()} installs
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Button
                    className="flex-1"
                    onClick={() => setSelectedApp(app)}
                    size="sm"
                    variant="outline"
                  >
                    Details
                  </Button>
                  <Button onClick={() => onInstallApp(app.id)} size="sm">
                    Install
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-lg">No integrations found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse different categories
            </p>
          </div>
        )}

        {/* App Detail Modal */}
        {selectedApp && (
          <Dialog onOpenChange={() => setSelectedApp(null)} open={true}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage alt={selectedApp.name} src={selectedApp.logoUrl} />
                    <AvatarFallback className="text-lg">
                      {selectedApp.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <h2 className="font-bold text-2xl">{selectedApp.name}</h2>
                      {selectedApp.isVerified && (
                        <Badge variant="secondary">
                          <Check className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                      <Badge variant="outline">{selectedApp.pricing}</Badge>
                    </div>
                    <p className="mb-3 text-muted-foreground">{selectedApp.developerName}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedApp.rating}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Download className="h-4 w-4" />
                        <span>{selectedApp.totalInstalls.toLocaleString()} installs</span>
                      </div>
                      {selectedApp.website && (
                        <a
                          className="flex items-center space-x-1 text-blue-600 hover:underline"
                          href={selectedApp.website}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => onInstallApp(selectedApp.id)}>Install Integration</Button>
                </div>

                <Tabs className="w-full" defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
                    <TabsTrigger value="developer">Developer</TabsTrigger>
                  </TabsList>

                  <TabsContent className="space-y-4" value="overview">
                    <div>
                      <h3 className="mb-2 font-semibold">Description</h3>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {selectedApp.overview}
                      </p>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold">Category & Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{selectedApp.category}</Badge>
                        {selectedApp.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent className="space-y-4" value="permissions">
                    <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950/20">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                            Permission Overview
                          </h4>
                          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                            This application requests access to the following data and capabilities.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedApp.scopes.map((scope) => (
                        <div
                          className="flex items-start space-x-3 rounded-lg border p-3"
                          key={scope}
                        >
                          <Shield className="mt-0.5 h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{scope}</div>
                            <div className="mt-1 text-muted-foreground text-xs">
                              {SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS] ||
                                "Access to specific functionality"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent className="space-y-4" value="screenshots">
                    {selectedApp.screenshots.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {selectedApp.screenshots.map((screenshot, index) => (
                          <div className="overflow-hidden rounded-lg border" key={index}>
                            <img
                              alt={`${selectedApp.name} screenshot ${index + 1}`}
                              className="h-48 w-full object-cover"
                              src={screenshot}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        No screenshots available
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent className="space-y-4" value="developer">
                    <div>
                      <h3 className="mb-2 font-semibold">Developer Information</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Developer:</span>
                          <span className="font-medium">{selectedApp.developerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Updated:</span>
                          <span>{new Date(selectedApp.lastUpdated).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{selectedApp.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pricing Model:</span>
                          <span className="capitalize">{selectedApp.pricing}</span>
                        </div>
                      </div>
                    </div>

                    {selectedApp.website && (
                      <div>
                        <h3 className="mb-2 font-semibold">Links</h3>
                        <div className="space-y-2">
                          <a
                            className="inline-flex items-center space-x-2 text-blue-600 text-sm hover:underline"
                            href={selectedApp.website}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Visit Website</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Developer Resources Section */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-12">
          <div className="mb-8 text-center">
            <h2 className="mb-2 font-bold text-2xl">Build Your Own Integration</h2>
            <p className="text-muted-foreground">
              Create custom integrations with Faworra's OAuth 2.0 API
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 font-semibold">Documentation</h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Complete API reference and integration guides
                </p>
                <Button size="sm" variant="outline">
                  View Docs <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Code2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 font-semibold">Code Examples</h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Sample code in multiple programming languages
                </p>
                <Button size="sm" variant="outline">
                  Browse Examples <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-2 font-semibold">Developer Console</h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Manage your OAuth applications and API keys
                </p>
                <Button size="sm" variant="outline">
                  Open Console <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
