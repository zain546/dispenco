import { LegalPage } from '@/components/marketing/legal-page';
import { legalDocuments } from '@/components/marketing/legal-content';
import { publicPageMetadata } from '@/components/marketing/public-page';

export const metadata = publicPageMetadata(
  legalDocuments.terms.title,
  legalDocuments.terms.description,
  '/terms',
);

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
