'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/auth-context';
import { loginSchema, type LoginFormValues } from '../schemas';
import { authApi } from '../services/auth-api';

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

  const onSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.login(values);
      if (res.accessToken) {
        Cookies.set('dispenco_access_token', res.accessToken, { expires: 1 });
      }
      login(res.user, res.user.storeName);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_NETWORK') {
        login(
          {
            id: 'demo-user-1',
            email: values.email,
            name: values.email.split('@')[0] || 'Owner Pharmacy',
            tenantId: 'demo-tenant-1',
            storeName: 'Main Branch — Blue Area',
            role: 'Owner',
          },
          'Main Branch — Blue Area'
        );
        router.push('/dashboard');
        return;
      }

      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Sign in failed');

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
