'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { signupSchema, type SignupFormValues } from '../schemas';

export function useSignup() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      storeName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate/Trigger registration action & redirect
      console.log('Signing up store:', data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account. Please try again.';
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
