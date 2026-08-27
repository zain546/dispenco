import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Reports & Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sales reports, revenue trends, and top-selling product summaries.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <BarChart3 className="size-10 text-muted-foreground/60" />
          <p className="text-sm">
            Reports module placeholder — ready for sales aggregation & charts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
