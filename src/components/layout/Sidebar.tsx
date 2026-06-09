'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingDecisions, setPendingDecisions] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(0);

  useEffect(() => {
    // Fetch badge counts
    fetch('/api/decisions')
      .then((r) => r.json())
      .then((data) => {
        const pending = (data.decisions || []).filter(
          (d: { status: string }) => d.status === 'pending'
        ).length;
        setPendingDecisions(pending);
      })
      .catch(() => {});

    fetch('/api/alerts')
      .then((r) => r.json())
      .then((data) => {
        const urgent = (data.alerts || []).filter(
          (a: { urgency: string; resolved: number }) =>
            (a.urgency === 'critical' || a.urgency === 'high') && !a.resolved
        ).length;
        setCriticalAlerts(urgent);
      })
      .catch(() => {});
  }, []);

  const navItems: NavItem[] = [
    { href: '/', label: 'Command Brief', icon: '🏠' },
    { href: '/money', label: 'Money Radar', icon: '💰' },
    { href: '/decisions', label: 'Decision Inbox', icon: '📥', badge: pendingDecisions },
    { href: '/projects', label: 'Project Radar', icon: '📊' },
    { href: '/subscriptions', label: 'Subscription Audit', icon: '🔧' },
    { href: '/alerts', label: 'Alerts Center', icon: '🔔', badge: criticalAlerts },
    { href: '/brief', label: 'Daily Brief', icon: '📋' },
  ];

  return (
    <nav
      className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r"
      style={{
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        zIndex: 50,
      }}
    >
      {/* Logo / Brand */}
      <div
        className="px-4 py-5 border-b"
        style={{ borderColor: '#30363d' }}
      >
        <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#d29922' }}>
          JKRLZ LLC
        </div>
        <div className="text-lg font-bold mt-1" style={{ color: '#e6edf3' }}>
          Personal XO
        </div>
        <div className="text-xs mt-1" style={{ color: '#8b949e' }}>
          Command Center v1
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-md mb-1 transition-colors"
              style={{
                backgroundColor: isActive ? 'rgba(88,166,255,0.12)' : 'transparent',
                color: isActive ? '#58a6ff' : '#8b949e',
                borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: item.href === '/alerts' ? '#f85149' : '#e3b341',
                    color: '#0d1117',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: '#30363d' }}>
        <div className="text-xs" style={{ color: '#8b949e' }}>
          Offline • localhost:3000
        </div>
        <div className="text-xs mt-1" style={{ color: '#30363d' }}>
          No external APIs
        </div>
      </div>
    </nav>
  );
}
