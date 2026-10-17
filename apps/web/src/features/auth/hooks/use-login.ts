'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/auth-context';
import { loginSchema, type LoginFormValues } from '../schemas';
import { authApi } from '../services/auth-api';
import { getErrorMessage } from '@/lib/errors';

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
      // Never fabricate a session on failure — surface the real reason
      // (including "Unable to reach the server" for network errors).
      setError(getErrorMessage(err, 'Sign in failed. Please try again.'));
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
