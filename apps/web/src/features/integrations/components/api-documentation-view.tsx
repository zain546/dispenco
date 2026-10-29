'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Code,
  Terminal,
  Send,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
  Shield,
  Layers,
  Database,
  FileText,
  DollarSign,
  Truck,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiKeyItem } from '@dispenco/types';
import { integrationsApi } from '../services/integrations-api';

interface ApiDocumentationViewProps {
  apiKeys: ApiKeyItem[];
}

const ENDPOINTS_CATALOG = [
  {
    path: '/ping',
    method: 'GET',
    title: 'Ping & Verification',
    scope: 'Any valid API key',
    icon: CheckCircle2,
    description: 'Verify your API credentials, retrieve tenant identifier, and check system latency.',
  },
  {
    path: '/inventory',
    method: 'GET',
    title: 'Product Catalog & Stock Balances',
    scope: 'public:inventory:read',
    icon: Database,
    description: 'Query master pharmacy medicines, categories, barcode lookups, and store stock totals.',
  },
  {
    path: '/inventory/batches',
    method: 'GET',
    title: 'Batches & Expiry (FEFO)',
    scope: 'public:inventory:read',
    icon: Layers,
    description: 'Inspect active medicine batches, expiry timelines, and wholesale/retail prices.',
  },
  {
    path: '/sales',
    method: 'GET',
    title: 'Sales & Receipts',
    scope: 'public:sales:read',
    icon: FileText,
    description: 'Retrieve customer checkout sales, line item breakdowns, discounts, and payment methods.',
  },
  {
    path: '/sales/ledger',
    method: 'GET',
    title: 'Accounting Ledger (QuickBooks / Xero)',
    scope: 'public:sales:read',
    icon: DollarSign,
    description: 'Export double-entry journal lines (debits/credits) pre-formatted for accounting software import.',
  },
  {
    path: '/reports/summary',
    method: 'GET',
    title: 'Financial Summaries & Metrics',
    scope: 'public:reports:read',
    icon: Zap,
    description: 'Aggregate gross/net sales, tax revenue, average ticket size, and store comparisons.',
  },
  {
    path: '/suppliers',
    method: 'GET',
    title: 'Suppliers & Vendors',
    scope: 'public:suppliers:read',
    icon: Truck,
    description: 'Access pharmaceutical vendor list, lead times, contact details, and open purchase orders.',
  },
];

export function ApiDocumentationView({ apiKeys }: ApiDocumentationViewProps) {
  const [activeDocTab, setActiveDocTab] = useState<'endpoints' | 'quickstart' | 'sandbox'>('endpoints');
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedEndpointPath, setCopiedEndpointPath] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Playground state
  const [testEndpoint, setTestEndpoint] = useState('/ping');
  const [testKey, setTestKey] = useState(apiKeys[0]?.keyPrefix ? '' : '');
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<any | null>(null);

  const getSampleCode = () => {
    const keyToUse = testKey.trim() || 'dsp_live_YOUR_API_KEY_HERE';
    const baseUrl = 'http://localhost:4000/api/v1/public/v1';

    if (selectedLanguage === 'curl') {
      return `# Retrieve store inventory balances
curl -X GET "${baseUrl}/inventory?limit=25" \\
  -H "x-api-key: ${keyToUse}" \\
  -H "Accept: application/json"`;
    }

    if (selectedLanguage === 'javascript') {
      return `// Node.js (fetch)
async function fetchInventory() {
  const response = await fetch('${baseUrl}/inventory?limit=25', {
    headers: {
      'x-api-key': '${keyToUse}',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(\`API request failed with status: \${response.status}\`);
  }

  const data = await response.json();
  console.log('Total medicines retrieved:', data.items.length);
  return data;
}

fetchInventory().catch(console.error);`;
    }

    return `# Python (requests)
import requests

API_KEY = "${keyToUse}"
BASE_URL = "${baseUrl}"

headers = {
    "x-api-key": API_KEY,
    "Accept": "application/json"
}

response = requests.get(f"{BASE_URL}/inventory", headers=headers, params={"limit": 25})

if response.status_code == 200:
    data = response.json()
    print(f"Total medicines: {len(data['items'])}")
else:
    print(f"Error {response.status_code}: {response.text}")`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getSampleCode());
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
      toast.success('Code snippet copied to clipboard');
    } catch {
      toast.error('Failed to copy snippet');
    }
  };

  const handleCopyEndpoint = async (path: string) => {
    const fullUrl = `http://localhost:4000/api/v1/public/v1${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedEndpointPath(path);
      setTimeout(() => setCopiedEndpointPath(null), 2000);
      toast.success('Endpoint URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleTestInSandbox = (path: string) => {
    setTestEndpoint(path);
    setActiveDocTab('sandbox');
  };

  const handleCopyResponse = async () => {
    if (!testResponse) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(testResponse.data, null, 2));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
      toast.success('Response JSON copied to clipboard');
    } catch {
      toast.error('Failed to copy response');
    }
  };

  const handleRunPlaygroundTest = async () => {
    if (!testKey.trim()) {
      toast.error('Please enter or paste your API key to test this request');
      return;
    }

    setIsLoadingTest(true);
    setTestResponse(null);
    try {
      const res = await integrationsApi.testPublicEndpoint(testEndpoint, testKey);
      setTestResponse(res);
      if (res.status >= 200 && res.status < 300) {
        toast.success(`Request successful (${res.status} ${res.statusText})`);
      } else {
        toast.warning(`Response status: ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      toast.error('Playground request failed');
    } finally {
      setIsLoadingTest(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Banner: Compact & Responsive */}
      <Card className="border border-border/80 sm:border-primary/20 bg-muted/20 sm:bg-linear-to-r sm:from-primary/5 sm:via-primary/10 sm:to-background shadow-xs overflow-hidden">
        <CardContent className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs ring-2 sm:ring-4 ring-primary/5">
              <Code className="size-4.5 sm:size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-foreground leading-tight">
                  Public REST Developer Portal
                </h3>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/25 text-[10px] sm:text-micro font-semibold px-1.5 py-0"
                >
                  Rate-Limited v1
                </Badge>
              </div>
              <p className="text-micro sm:text-xs text-muted-foreground mt-0.5 leading-relaxed hidden sm:block max-w-2xl">
                Dispenco exposes a clean, authenticated REST API designed for automated synchronization with accounting software (QuickBooks, Xero), distributor ERPs, and warehouse systems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1 sm:pt-0 border-t sm:border-t-0 border-border/30 text-micro">
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium">
              <Shield className="size-3 text-success" />
              <span>x-api-key Auth</span>
            </Badge>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium">
              <Zap className="size-3 text-warning" />
              <span>60 req/min</span>
            </Badge>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium">
              <Database className="size-3 text-info" />
              <span>Tenant-Isolated</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs: Endpoints vs Quickstart vs Live Sandbox */}
      <Tabs
        value={activeDocTab}
        onValueChange={(val: any) => setActiveDocTab(val)}
        className="space-y-4"
      >
        <div className="border-b border-border/80 pb-2">
          <TabsList className="grid grid-cols-3 w-full sm:max-w-md h-9 p-1 bg-muted/60 rounded-xl border border-border/60">
            <TabsTrigger
              value="endpoints"
              className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Layers className="size-3.5" />
              <span>Endpoints</span>
            </TabsTrigger>
            <TabsTrigger
              value="quickstart"
              className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Code className="size-3.5" />
              <span>Quickstart</span>
            </TabsTrigger>
            <TabsTrigger
              value="sandbox"
              className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Terminal className="size-3.5" />
              <span>Live Console</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Endpoints Reference */}
        <TabsContent value="endpoints" className="space-y-2.5 sm:space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {ENDPOINTS_CATALOG.map((ep) => {
              const Icon = ep.icon;
              const isCopied = copiedEndpointPath === ep.path;

              return (
                <div
                  key={ep.path}
                  className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card hover:border-border transition-all space-y-2.5 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {ep.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-micro bg-muted/40 text-muted-foreground border-border/80"
                          >
                            {ep.scope}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pt-0.5 leading-relaxed">
                          {ep.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-micro bg-success/15 text-success border-success/30 font-bold px-1.5 py-0.5"
                        >
                          {ep.method}
                        </Badge>
                        <code className="text-micro sm:text-xs font-mono bg-muted/80 px-2 py-0.5 rounded border border-border/60 text-foreground select-all">
                          /public/v1{ep.path}
                        </code>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyEndpoint(ep.path)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy full endpoint URL"
                        >
                          {isCopied ? (
                            <Check className="size-3 text-success" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          <span className="sr-only">Copy URL</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestInSandbox(ep.path)}
                          className="h-7 px-2 text-micro font-semibold gap-1 text-primary hover:text-primary cursor-pointer shadow-2xs"
                          title="Test in Interactive Console"
                        >
                          <Terminal className="size-3" />
                          <span className="hidden xs:inline">Test</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Quickstart Code Snippets */}
        <TabsContent value="quickstart" className="space-y-4">
          <Card className="border-border/80 shadow-2xs overflow-hidden">
            <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Sample Integration Code
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Copy and run ready-to-use snippets in your preferred language.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Select
                    value={selectedLanguage}
                    onValueChange={(val: any) => setSelectedLanguage(val)}
                  >
                    <SelectTrigger className="w-36 h-8.5 text-xs font-mono bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curl">cURL (CLI)</SelectItem>
                      <SelectItem value="javascript">JavaScript / Node</SelectItem>
                      <SelectItem value="python">Python 3</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8.5 px-3 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                    onClick={handleCopyCode}
                  >
                    {copiedSnippet ? (
                      <>
                        <Check className="size-3 text-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-primary" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-4 bg-zinc-950 text-zinc-100 dark:bg-zinc-950 rounded-b-xl text-xs font-mono overflow-x-auto leading-relaxed select-all">
                {getSampleCode()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Interactive Sandbox */}
        <TabsContent value="sandbox" className="space-y-4">
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2 text-primary">
                <Terminal className="size-4.5" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Interactive API Console
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Test your integration keys live in your browser and inspect response payloads and rate-limit headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Key Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="sandbox-key" className="text-xs font-semibold">
                    API Secret Key
                  </Label>
                  <Input
                    id="sandbox-key"
                    type="password"
                    placeholder="dsp_live_••••••••••••••••••••••••"
                    value={testKey}
                    onChange={(e) => setTestKey(e.target.value)}
                    className="font-mono text-xs h-9 bg-muted/20"
                  />
                  <p className="text-micro text-muted-foreground">
                    Paste the key you saved during generation.
                  </p>
                </div>

                {/* Endpoint Select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Endpoint to Test</Label>
                  <Select value={testEndpoint} onValueChange={setTestEndpoint}>
                    <SelectTrigger className="font-mono text-xs h-9 bg-muted/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/ping">GET /public/v1/ping</SelectItem>
                      <SelectItem value="/inventory">GET /public/v1/inventory</SelectItem>
                      <SelectItem value="/inventory/batches">GET /public/v1/inventory/batches</SelectItem>
                      <SelectItem value="/sales">GET /public/v1/sales</SelectItem>
                      <SelectItem value="/sales/ledger">GET /public/v1/sales/ledger</SelectItem>
                      <SelectItem value="/reports/summary">GET /public/v1/reports/summary</SelectItem>
                      <SelectItem value="/suppliers">GET /public/v1/suppliers</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-micro text-muted-foreground truncate">
                    Target URL: <code className="font-mono">/api/v1/public/v1{testEndpoint}</code>
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleRunPlaygroundTest}
                  disabled={isLoadingTest}
                  className="w-full sm:w-auto h-9 gap-2 font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer"
                >
                  {isLoadingTest ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Executing Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Send Live Request</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Response Panel */}
              {testResponse && (
                <div className="space-y-2.5 pt-3 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">Status:</span>
                      <Badge
                        variant={
                          testResponse.status >= 200 && testResponse.status < 300
                            ? 'default'
                            : 'destructive'
                        }
                        className="font-mono text-micro font-bold px-2 py-0.5"
                      >
                        {testResponse.status} {testResponse.statusText}
                      </Badge>
                      <span className="text-muted-foreground text-micro">
                        {testResponse.durationMs}ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 font-mono text-micro text-muted-foreground">
                      <span>Limit: {testResponse.headers?.['x-ratelimit-limit'] ?? '60'}</span>
                      <span>•</span>
                      <span>Remaining: {testResponse.headers?.['x-ratelimit-remaining'] ?? '--'}</span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyResponse}
                        className="h-6 px-2 text-micro gap-1 text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                      >
                        {copiedResponse ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>JSON</span>
                      </Button>
                    </div>
                  </div>

                  <pre className="p-3.5 sm:p-4 bg-zinc-950 text-zinc-100 dark:bg-zinc-950 rounded-xl text-xs font-mono max-h-96 overflow-y-auto overflow-x-auto leading-relaxed border border-border/40 select-all">
                    {JSON.stringify(testResponse.data, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
