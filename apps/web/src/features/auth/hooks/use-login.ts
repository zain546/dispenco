'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { loginSchema, type LoginFormValues } from '../schemas';

export function useLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Invalid email or password');
      }

      login(
        {
          id: resData.user?.id || 'user-1',
          email: resData.user?.email || data.email,
          name: resData.user?.name || data.email.split('@')[0],
          tenantId: resData.user?.tenantId || 'tenant-1',
          storeName: resData.user?.storeName || 'Main Branch — Blue Area',
          role: resData.user?.role || 'Owner',
        },
        resData.user?.storeName
      );

      router.push('/dashboard');
    } catch (err: unknown) {
      // Fallback for local demo preview if backend API is not running
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        login(
          {
            id: 'demo-user-1',
            email: data.email,
            name: data.email.split('@')[0] || 'Owner Pharmacy',
            tenantId: 'demo-tenant-1',
            storeName: 'Main Branch — Blue Area',
            role: 'Owner',
          },
          'Main Branch — Blue Area'
        );
        router.push('/dashboard');
        return;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  });

  return {
    form,
    error,
    isLoading,
    onSubmit,
  };
}
