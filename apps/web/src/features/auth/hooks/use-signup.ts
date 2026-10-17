'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/auth-context';
import { signupSchema, type SignupFormData } from '../schemas';
import { authApi } from '../services/auth-api';
import { getErrorMessage } from '@/lib/errors';

export function useSignup() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.signup(values);
      if (res.accessToken) {
        Cookies.set('dispenco_access_token', res.accessToken, { expires: 1 });
      }
      login(res.user, res.user.storeName || undefined);
      
      if (!res.user.storeName) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
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
