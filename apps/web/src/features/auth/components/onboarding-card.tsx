'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Store, MapPin, Rocket, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import { onboardingSchema, type OnboardingFormData } from '../schemas';
import { storesApi } from '@/lib/stores-api';
import { AuthHeader } from './auth-header';
import { AuthFooter } from './auth-footer';

export function OnboardingCard() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      storeName: '',
      address: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await storesApi.createStore({
        name: values.storeName,
        address: values.address || undefined,
      });

      if (user) {
        login(
          {
            ...user,
            storeName: res.data.name,
          },
          res.data.name
        );
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_NETWORK') {
        if (user) {
          login(
            {
              ...user,
              storeName: values.storeName,
            },
            values.storeName
          );
        }
        router.push('/dashboard');
        return;
      }

      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to create pharmacy store');

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="w-full max-w-md space-y-6">
      <AuthHeader subtitle="Set up your pharmacy store workspace" />

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <span>Welcome to Dispenco! 👋</span>
          </CardTitle>
          <CardDescription>
            Let&apos;s create your first pharmacy store location to get started.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Pharmacy / Store Name *</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Store className="h-4 w-4" />
                </div>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="e.g. Al-Shifa Pharmacy"
                  className="pl-9"
                  {...register('storeName')}
                />
              </div>
              {errors.storeName && (
                <p className="text-xs text-destructive mt-1">{errors.storeName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Store Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
                <Input
                  id="address"
                  type="text"
                  placeholder="e.g. Blue Area, Islamabad"
                  className="pl-9"
                  {...register('address')}
                />
              </div>
              {errors.address && (
                <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Setting Up Workspace...</span>
                </>
              ) : (
                <>
                  <span>Launch Workspace</span>
                  <Rocket className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AuthFooter />
    </div>
  );
}
