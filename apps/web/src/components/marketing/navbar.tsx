'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { marketingConfig, navigation } from './config';
import { Wordmark } from './shared';

export function Navbar() {
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b',
        scrolled
          ? 'border-border bg-background/80 backdrop-blur-lg'
          : 'border-transparent bg-background/95',
      )}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Wordmark />
        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="marketing-nav-link rounded-md py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle color theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="marketing-icon-button text-muted-foreground"
          >
            <Sun className="hidden size-4 dark:block" aria-hidden="true" />
            <Moon className="size-4 dark:hidden" aria-hidden="true" />
          </Button>
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost" size="sm" className="marketing-action">
              <Link prefetch={false} href={user ? '/dashboard' : '/login'}>
                {user ? 'Go to dashboard' : 'Log in'}
                {user && <ArrowUpRight className="size-4" aria-hidden="true" />}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="marketing-action marketing-action-primary h-10 px-4 shadow-none"
            >
              <Link prefetch={false} href={marketingConfig.trialHref}>
                Start free trial
              </Link>
            </Button>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className="marketing-icon-button lg:hidden"
                variant="ghost"
                size="icon-sm"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="marketing-shell gap-6">
              <SheetHeader className="border-b pb-6">
                <SheetTitle className="text-lg">Explore Dispenco</SheetTitle>
                <SheetDescription>Less paperwork. More pharmacy.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-6" aria-label="Mobile navigation">
                {navigation.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="marketing-menu-link rounded-lg px-3 py-3 text-base hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 p-6">
                <SheetClose asChild>
                  <Button asChild variant="outline" className="marketing-action">
                    <Link prefetch={false} href={user ? '/dashboard' : '/login'}>
                      {user ? 'Go to dashboard' : 'Log in'}
                    </Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="marketing-action marketing-action-primary shadow-none">
                    <Link prefetch={false} href={marketingConfig.trialHref}>
                      Start free trial
                    </Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
