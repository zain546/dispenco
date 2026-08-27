'use client';

import Link from 'next/link';
import { Pill, Store, Mail, Lock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header Branding */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Pill className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          Dispenco Portal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your pharmacy account & workspace
        </p>
      </div>

      {/* Signup Card Container */}
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Enter details to setup your pharmacy store & workspace
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Store Name Input */}
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Store className="h-4 w-4" />
                </div>
                <Input
                  id="storeName"
                  type="text"
                  required
                  placeholder="Al-Shifa Pharmacy"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="owner@pharmacy.com"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              asChild
              className="w-full h-11"
            >
              <Link href="/dashboard" className="flex items-center justify-center gap-2">
                <span>Create Account & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Dispenco Portal &bull; Secure Authentication
      </p>
    </div>
  );
}
