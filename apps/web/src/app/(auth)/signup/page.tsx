'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Create your pharmacy account
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started with Dispenco management in seconds.
        </p>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name</Label>
          <Input id="storeName" type="text" placeholder="Al-Shifa Pharmacy" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="owner@pharmacy.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>

        <Button asChild className="w-full mt-2">
          <Link href="/dashboard">Create Account & Go to Dashboard</Link>
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-2">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
