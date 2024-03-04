import * as React from 'react';
import Link from 'next/link';
import { auth } from '@/auth';
import Image from 'next/image';
import { LoginButton } from '@/components/login-button'
import { UserMenu } from '@/components/user-menu';
import { SidebarMobile } from './sidebar-mobile';
import { SidebarToggle } from './sidebar-toggle';
import { ChatHistory } from './chat-history';
import { IconSeparator } from '@/components/ui/icons';
import logo from '../public/meshiagre-logo-transparent.png'

async function UserOrLogin() {
  const session = await auth();
  return (
    <div className="flex items-center space-x-2">
      {session?.user ? (
        <UserMenu user={session.user} />
      ) : (
        <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center py-10">
        <LoginButton />
      </div>
      )}
    </div>
  );
}

async function HeaderContent() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center space-x-2">
        {session?.user ? (
          <>
            <SidebarMobile>
              <ChatHistory userId={session.user.id} />
            </SidebarMobile>
            <SidebarToggle />
            <IconSeparator className="size-6 text-muted-foreground/50" />
          </>
        ) : ''}
        <Link href="/">
        <img
          src={logo.src}
          alt="Logo"
          width={32}
          height={32}
          className="h-8"
        />
        </Link>
      </div>
      <UserOrLogin />
    </header>
  );
}

export function Header() {
  return (
    <React.Suspense fallback={<header className="h-16" />}>
      <HeaderContent />
    </React.Suspense>
  );
}