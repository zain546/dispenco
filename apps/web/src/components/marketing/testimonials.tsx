import { CircleUserRound, Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { marketingConfig } from './config';
import { SectionHeading } from './shared';

export function Testimonials() {
  return (
    <section
      aria-label="Illustrative pharmacy perspectives"
      className="marketing-section border-y bg-muted/30 px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Designed around real working days"
          title="Less friction, from shelf to counter."
          description="The everyday needs behind Dispenco. These illustrative perspectives are placeholders, not customer testimonials."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {marketingConfig.testimonials.map((item) => (
            <Card
              key={item.context}
              className="marketing-card flex flex-col p-6 shadow-none sm:p-8 md:p-6 lg:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <Quote className="size-5 text-primary dark:text-foreground" aria-hidden="true" />
                <Badge variant="outline" className="text-xs">
                  Placeholder quote
                </Badge>
              </div>
              <blockquote className="mb-8 text-lg leading-relaxed font-medium tracking-tight">
                {item.quote}
              </blockquote>
              <div className="mt-auto flex items-center gap-3 border-t pt-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted/30 text-muted-foreground">
                  <CircleUserRound className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium">{item.role}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.context}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
