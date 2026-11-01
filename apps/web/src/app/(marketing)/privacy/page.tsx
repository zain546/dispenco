import { LegalPage } from '@/components/marketing/legal-page';
import { legalDocuments } from '@/components/marketing/legal-content';
import { publicPageMetadata } from '@/components/marketing/public-page';

export const metadata = publicPageMetadata(
  legalDocuments.privacy.title,
  legalDocuments.privacy.description,
  '/privacy',
);

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
