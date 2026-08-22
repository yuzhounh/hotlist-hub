'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-provider';

function displayName(name: string | null | undefined, email: string | null | undefined) {
  const value = name?.trim() || email?.split('@')[0] || '用户';
  return value.length > 16 ? `${value.slice(0, 16)}…` : value;
}

export function AuthButton() {
  const { user, ready, configured, signingIn, signInWithGoogle, signOutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!configured) return null;

  if (!ready) {
    return <button className="auth-button" type="button" disabled>登录加载中</button>;
  }

  if (!user) {
    return (
      <button className="auth-button" type="button" onClick={() => void signInWithGoogle()} disabled={signingIn}>
        {signingIn ? '登录中…' : 'Google 登录'}
      </button>
    );
  }

  const name = displayName(user.displayName, user.email);

  return (
    <div className="auth-menu-wrap" ref={rootRef}>
      <button
        className="auth-menu-trigger"
        type="button"
        aria-label={`账户：${name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {user.photoURL ? (
          // Firebase supplies arbitrary remote avatar hosts, so a native image is intentional here.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="auth-avatar" src={user.photoURL} alt="" width={40} height={40} />
        ) : (
          <span className="auth-avatar auth-avatar-fallback">{name.slice(0, 1)}</span>
        )}
      </button>
      {open && (
        <div className="auth-menu" role="menu">
          <div className="auth-menu-head">
            {user.photoURL ? (
              // Firebase supplies arbitrary remote avatar hosts, so a native image is intentional here.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="auth-avatar" src={user.photoURL} alt="" width={40} height={40} />
            ) : (
              <span className="auth-avatar auth-avatar-fallback">{name.slice(0, 1)}</span>
            )}
            <div className="auth-menu-meta">
              <strong>{name}</strong>
              {user.email && <small>{user.email}</small>}
            </div>
          </div>
          <button className="auth-menu-logout" type="button" role="menuitem" onClick={() => { setOpen(false); void signOutUser(); }}>
            退出
          </button>
        </div>
      )}
    </div>
  );
}
