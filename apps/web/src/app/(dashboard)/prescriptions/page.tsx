import React from 'react';
import { PrescriptionsManager } from '@/features/prescriptions/components/prescriptions-manager';

export const metadata = {
  title: 'Prescriptions & Compliance - Dispenco',
  description: 'Manage doctor prescriptions, clinical directions, and controlled medicine schedules',
};

export default function PrescriptionsPage() {
  return <PrescriptionsManager />;
}
