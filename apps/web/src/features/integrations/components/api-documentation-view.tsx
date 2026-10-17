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
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Playground state
  const [testEndpoint, setTestEndpoint] = useState('/ping');
  const [testKey, setTestKey] = useState(apiKeys[0]?.keyPrefix ? '' : '');
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<any | null>(null);

  const activeKeyPlaceholder = apiKeys[0]?.keyPrefix || 'dsp_live_••••••••••••';

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
    <div className="space-y-8">
      {/* Overview Card */}
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Code className="size-5" />
            <CardTitle className="text-lg">Public API Architecture</CardTitle>
          </div>
          <CardDescription>
            Dispenco exposes a clean, rate-limited REST API designed for automated synchronization with accounting software (QuickBooks, Xero), distributor ERPs, and warehouse systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Shield className="size-4 text-success" />
                <span>Authentication</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pass your key in the <code className="text-foreground bg-muted px-1 py-0.5 rounded font-mono text-micro">x-api-key</code> HTTP header or as a Bearer token.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Zap className="size-4 text-warning" />
                <span>Rate Limiting</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sliding-window rate limits (default 60 req/min). Inspect <code className="text-foreground bg-muted px-1 py-0.5 rounded font-mono text-micro">X-RateLimit-*</code> response headers.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Database className="size-4 text-info" />
                <span>Tenant Isolation</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All requests are cryptographically verified and scoped exclusively to your pharmacy&apos;s data boundary.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs: Quickstart vs Endpoints vs Live Sandbox */}
      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="quickstart">Quickstart</TabsTrigger>
          <TabsTrigger value="sandbox">Live Sandbox</TabsTrigger>
        </TabsList>

        {/* Tab 1: Endpoints Reference */}
        <TabsContent value="endpoints" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {ENDPOINTS_CATALOG.map((ep) => {
              const Icon = ep.icon;
              return (
                <div
                  key={ep.path}
                  className="p-4 rounded-xl border border-border/70 bg-card hover:border-border transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                          <span>{ep.title}</span>
                          <Badge variant="outline" className="font-mono text-micro bg-muted/30">
                            {ep.scope}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pt-0.5">
                          {ep.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="font-mono text-micro bg-success/15 text-success border-success/30 font-semibold">
                        {ep.method}
                      </Badge>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border">
                        /public/v1{ep.path}
                      </code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Quickstart Code Snippets */}
        <TabsContent value="quickstart" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Sample Integration Code</CardTitle>
                  <CardDescription>
                    Copy and run ready-to-use snippets in your preferred language.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedLanguage}
                    onValueChange={(val: any) => setSelectedLanguage(val)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs font-mono">
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
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleCopyCode}
                  >
                    {copiedSnippet ? (
                      <>
                        <Check className="size-3 text-success" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-border/40 select-all">
                {getSampleCode()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Interactive Sandbox */}
        <TabsContent value="sandbox" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Terminal className="size-5" />
                <CardTitle className="text-base">Interactive API Console</CardTitle>
              </div>
              <CardDescription>
                Test your integration keys live in your browser and inspect response payloads and rate-limit headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="font-mono text-xs"
                  />
                  <p className="text-micro text-muted-foreground">
                    Paste the key you saved during generation.
                  </p>
                </div>

                {/* Endpoint Select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Endpoint to Test</Label>
                  <Select value={testEndpoint} onValueChange={setTestEndpoint}>
                    <SelectTrigger className="font-mono text-xs">
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
                  <p className="text-micro text-muted-foreground">
                    Target URL: <code className="font-mono">/api/v1/public/v1{testEndpoint}</code>
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleRunPlaygroundTest}
                  disabled={isLoadingTest}
                  className="gap-2 font-medium"
                >
                  {isLoadingTest ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Executing Request...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Send Live Request
                    </>
                  )}
                </Button>
              </div>

              {/* Response Panel */}
              {testResponse && (
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Response Status:</span>
                      <Badge
                        variant={
                          testResponse.status >= 200 && testResponse.status < 300
                            ? 'default'
                            : 'destructive'
                        }
                        className="font-mono"
                      >
                        {testResponse.status} {testResponse.statusText}
                      </Badge>
                      <span className="text-muted-foreground">
                        Time: {testResponse.durationMs}ms
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-micro text-muted-foreground">
                      <span>Limit: {testResponse.headers['x-ratelimit-limit']}</span>
                      <span>•</span>
                      <span>Remaining: {testResponse.headers['x-ratelimit-remaining']}</span>
                    </div>
                  </div>

                  <pre className="p-4 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-border/40 select-all">
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
