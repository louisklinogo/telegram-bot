"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  ExternalLink, 
  Shield, 
  Key, 
  Code2, 
  BookOpen, 
  Zap,
  Star,
  Download,
  Globe,
  Users,
  BarChart3,
  Check,
  AlertCircle,
  ArrowRight,
  GitBranch,
  Database,
  FileText,
  Settings
} from "lucide-react";
import { toast } from "sonner";

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
  status: 'approved' | 'pending' | 'rejected';
  pricing: 'free' | 'paid' | 'freemium';
}

interface OAuthDeveloperPortalProps {
  applications: OAuthApp[];
  onInstallApp: (appId: string) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  'All',
  'Analytics', 
  'Accounting',
  'CRM',
  'Marketing',
  'Productivity',
  'Communication',
  'Integration',
  'Security',
  'Reporting'
];

const SCOPE_DESCRIPTIONS = {
  'profile.read': 'Access basic profile information',
  'profile.write': 'Update profile information',
  'teams.read': 'View team information',
  'teams.write': 'Manage teams and members',
  'transactions.read': 'View financial transactions',
  'transactions.write': 'Create and manage transactions',
  'invoices.read': 'Access invoice data',
  'invoices.write': 'Create and manage invoices',
  'reports.read': 'Generate financial reports',
  'files.read': 'Access files and documents',
  'files.write': 'Upload and manage files',
  'analytics.read': 'View analytics and insights',
  'admin.read': 'Full read access to all data',
  'admin.write': 'Full administrative access'
};

export function OAuthDeveloperPortal({
  applications,
  onInstallApp,
  isLoading = false,
}: OAuthDeveloperPortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedApp, setSelectedApp] = useState<OAuthApp | null>(null);

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.developerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || app.category === selectedCategory;
    return matchesSearch && matchesCategory && app.status === 'approved';
  });

  const featuredApps = applications.filter(app => 
    app.status === 'approved' && app.rating >= 4.5 && app.totalInstalls > 100
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold">
              Faworra Developer Portal
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover integrations that extend Faworra's capabilities. 
              Connect your favorite tools and automate your financial workflows.
            </p>
            <div className="flex items-center justify-center space-x-4 pt-4">
              <Button size="lg">
                <Code2 className="h-5 w-5 mr-2" />
                Browse Integrations
              </Button>
              <Button variant="outline" size="lg">
                <BookOpen className="h-5 w-5 mr-2" />
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Featured Integrations</h2>
                <p className="text-muted-foreground">Popular and highly-rated applications</p>
              </div>
              <Button variant="outline">View All</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredApps.map((app) => (
                <Card key={app.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={app.logoUrl} alt={app.name} />
                          <AvatarFallback>{app.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">{app.name}</CardTitle>
                            {app.isVerified && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{app.developerName}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{app.pricing}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.description}
                    </p>
                    
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
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedApp(app)}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onInstallApp(app.id)}
                      >
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
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <Card key={app.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={app.logoUrl} alt={app.name} />
                      <AvatarFallback>{app.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base">{app.name}</CardTitle>
                        {app.isVerified && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{app.developerName}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{app.category}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {app.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {app.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {app.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
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
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedApp(app)}
                  >
                    Details
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => onInstallApp(app.id)}
                  >
                    Install
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No integrations found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse different categories
            </p>
          </div>
        )}

        {/* App Detail Modal */}
        {selectedApp && (
          <Dialog open={true} onOpenChange={() => setSelectedApp(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedApp.logoUrl} alt={selectedApp.name} />
                    <AvatarFallback className="text-lg">
                      {selectedApp.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h2 className="text-2xl font-bold">{selectedApp.name}</h2>
                      {selectedApp.isVerified && (
                        <Badge variant="secondary">
                          <Check className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      <Badge variant="outline">{selectedApp.pricing}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{selectedApp.developerName}</p>
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
                          href={selectedApp.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => onInstallApp(selectedApp.id)}>
                    Install Integration
                  </Button>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
                    <TabsTrigger value="developer">Developer</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedApp.overview}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">Category & Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{selectedApp.category}</Badge>
                        {selectedApp.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="permissions" className="space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                            Permission Overview
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            This application requests access to the following data and capabilities.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedApp.scopes.map((scope) => (
                        <div key={scope} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{scope}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS] || 
                               'Access to specific functionality'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="screenshots" className="space-y-4">
                    {selectedApp.screenshots.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedApp.screenshots.map((screenshot, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <img 
                              src={screenshot} 
                              alt={`${selectedApp.name} screenshot ${index + 1}`}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No screenshots available
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="developer" className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Developer Information</h3>
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
                        <h3 className="font-semibold mb-2">Links</h3>
                        <div className="space-y-2">
                          <a
                            href={selectedApp.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-blue-600 hover:underline text-sm"
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Build Your Own Integration</h2>
            <p className="text-muted-foreground">
              Create custom integrations with Faworra's OAuth 2.0 API
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Documentation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete API reference and integration guides
                </p>
                <Button variant="outline" size="sm">
                  View Docs <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Code2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Code Examples</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sample code in multiple programming languages
                </p>
                <Button variant="outline" size="sm">
                  Browse Examples <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Developer Console</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your OAuth applications and API keys
                </p>
                <Button variant="outline" size="sm">
                  Open Console <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
