'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import {
  ShieldAlert,
  Briefcase,
  ShoppingCart,
  Boxes,
  ChevronDown,
  UserCheck,
  Check,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { RoleType } from '@/types';
import { Button } from '@/components/ui/Button';

export interface RoleConfig {
  role: RoleType;
  title: string;
  subtitle: string;
  defaultUserName: string;
  defaultEmail: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderHover: string;
  description: string;
  primaryFeatures: string[];
}

export const ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
  admin: {
    role: 'admin',
    title: 'Administrator View',
    subtitle: 'Nasir Amme • Executive & System Control',
    defaultUserName: 'Nasir Amme',
    defaultEmail: 'nasir@amme-electronics.et',
    icon: ShieldAlert,
    color: 'from-amber-500 to-amber-600 text-amber-500',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25 border-amber-500/30',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderHover: 'hover:border-amber-400',
    description: 'Executive overview of gross margins, revenue curve, stock valuation (cost vs retail), authorized staff management & system security.',
    primaryFeatures: ['Gross Margin & COGS', 'Staff Roster & RBAC', 'Sales Trend Analytics', 'Executive Audit'],
  },
  manager: {
    role: 'manager',
    title: 'Store Manager View',
    subtitle: 'Yonas Bekele • Operations & Reorders',
    defaultUserName: 'Yonas Bekele',
    defaultEmail: 'yonas@amme-electronics.et',
    icon: Briefcase,
    color: 'from-blue-500 to-blue-600 text-blue-500',
    badgeBg: 'bg-blue-500/15 dark:bg-blue-500/25 border-blue-500/30',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderHover: 'hover:border-blue-400',
    description: 'Store floor supervision, urgent low-stock reorder matrix, pending vendor purchase orders, delivery receiving & staff shifts.',
    primaryFeatures: ['Purchase Orders & POs', 'Urgent Reorders', 'Goods Inward Tracker', 'Shift Monitoring'],
  },
  cashier: {
    role: 'cashier',
    title: 'Cashier / POS View',
    subtitle: 'Tigist Alem / Hamza • Register & Tenders',
    defaultUserName: 'Tigist Alem',
    defaultEmail: 'tigist@amme-electronics.et',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-emerald-600 text-emerald-500',
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/25 border-emerald-500/30',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderHover: 'hover:border-emerald-400',
    description: 'Fast front-desk point of sale, register cash balance, Telebirr & CBE Birr tenders, customer receipts & instant reprint.',
    primaryFeatures: ['High-Speed POS Checkout', 'Cash in Drawer & Tenders', 'Telebirr & CBE Birr', 'Instant Receipt Reprint'],
  },
  stock_keeper: {
    role: 'stock_keeper',
    title: 'Stock Keeper View',
    subtitle: 'Abel Girma • Warehouse & Physical Counts',
    defaultUserName: 'Abel Girma',
    defaultEmail: 'abel@amme-electronics.et',
    icon: Boxes,
    color: 'from-purple-500 to-purple-600 text-purple-500',
    badgeBg: 'bg-purple-500/15 dark:bg-purple-500/25 border-purple-500/30',
    badgeText: 'text-purple-700 dark:text-purple-300',
    borderHover: 'hover:border-purple-400',
    description: 'Warehouse unit levels, shelf count audits, zero-stock critical shortages, stock movement ledger & barcode labeling.',
    primaryFeatures: ['Warehouse Unit Counts', 'Out-of-Stock Board', 'Physical Stock Counts', 'Stock Movements Log'],
  },
};

const PASSWORD_MAP: Record<string, string> = {
  'nasir@amme-electronics.et': 'Nasir@Admin2026!',
  'yonas@amme-electronics.et': 'Yonas@Mgr2026!',
  'tigist@amme-electronics.et': 'Tigist@Cashier2026!',
  'hamza@amme-electronics.et': 'Hamza@Cashier2026!',
  'abel@amme-electronics.et': 'Abel@Stock2026!',
};

interface DashboardRoleDropdownProps {
  currentRoleView: RoleType;
  onSelectRoleView: (role: RoleType) => void;
}

export const DashboardRoleDropdown: React.FC<DashboardRoleDropdownProps> = ({
  currentRoleView,
  onSelectRoleView,
}) => {
  const { user: authUser, roles, login } = useAuth();
  const { addToast } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitchingAuth, setIsSwitchingAuth] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const listboxId = useId();
  const labelId = useId();

  const rolesList: RoleType[] = ['admin', 'manager', 'cashier', 'stock_keeper'];
  const activeConfig = ROLE_CONFIGS[currentRoleView];
  const ActiveIcon = activeConfig.icon;

  const authenticatedRole = (roles?.[0] as RoleType) || 'admin';
  const isAuthRoleMatching = authenticatedRole === currentRoleView;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for accessibility (WCAG Combobox pattern)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const idx = rolesList.indexOf(currentRoleView);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % rolesList.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + rolesList.length) % rolesList.length);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(rolesList.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < rolesList.length) {
          selectRole(rolesList[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const selectRole = (role: RoleType) => {
    onSelectRoleView(role);
    setIsOpen(false);
    triggerRef.current?.focus();
    addToast({
      title: 'Dashboard View Updated',
      message: `Now viewing ${ROLE_CONFIGS[role].title}`,
      type: 'info',
    });
  };

  const handleSwitchSession = async (role: RoleType) => {
    const config = ROLE_CONFIGS[role];
    const password = PASSWORD_MAP[config.defaultEmail];

    if (!password) {
      addToast({
        title: 'Error',
        message: 'No credentials configured for this role',
        type: 'error',
      });
      return;
    }

    setIsSwitchingAuth(true);
    try {
      const res = await login(config.defaultEmail, password);
      if (res.success) {
        onSelectRoleView(role);
        addToast({
          title: 'Session Authenticated',
          message: `Logged in as ${config.defaultUserName} (${config.title})`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'Authentication Failed',
          message: res.error || 'Failed to authenticate user',
          type: 'error',
        });
      }
    } catch {
      addToast({
        title: 'Network Error',
        message: 'Could not connect to authentication service',
        type: 'error',
      });
    } finally {
      setIsSwitchingAuth(false);
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Role Dropdown Trigger & Label */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              id={labelId}
              className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Dashboard View:</span>
            </span>
          </div>

          {/* Accessible Dropdown Combobox */}
          <div className="relative inline-block text-left w-full sm:w-auto">
            <button
              ref={triggerRef}
              type="button"
              id="role-dashboard-selector-btn"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-labelledby={labelId}
              onClick={() => setIsOpen((prev) => !prev)}
              onKeyDown={handleKeyDown}
              className="w-full sm:w-80 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 text-slate-900 dark:text-white font-bold text-sm shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-amber-500"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${activeConfig.color} text-white flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <ActiveIcon className="w-4 h-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <div className="truncate font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    {activeConfig.title}
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {activeConfig.subtitle}
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-amber-500' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Modal/Panel */}
            {isOpen && (
              <ul
                ref={listboxRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={labelId}
                tabIndex={-1}
                className="absolute left-0 mt-2 w-full sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/70"
              >
                <div className="px-4 py-2 text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Select User Role View</span>
                  <span className="text-[10px] text-amber-500 font-mono">4 Specialized Roles</span>
                </div>

                {rolesList.map((role, idx) => {
                  const cfg = ROLE_CONFIGS[role];
                  const Icon = cfg.icon;
                  const isSelected = currentRoleView === role;
                  const isFocused = focusedIndex === idx;
                  const isCurrentAuth = (roles?.[0] as RoleType) === role;

                  return (
                    <li
                      key={role}
                      id={`role-option-${role}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectRole(role)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`px-4 py-3 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/30'
                          : isFocused
                          ? 'bg-slate-50 dark:bg-slate-800/60'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${cfg.color} text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {cfg.title}
                            </span>
                            {isCurrentAuth && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                Authenticated
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            {cfg.subtitle}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                            {cfg.description}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </li>
                  );
                })}

                <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-800/40 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    Keyboard navigable: use <strong>↑</strong> <strong>↓</strong> arrows and <strong>Enter</strong> to switch views.
                  </span>
                </div>
              </ul>
            )}
          </div>
        </div>

        {/* Right: Active Session Status & 1-Click Session Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isAuthRoleMatching ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Logged in as <strong>{authUser?.fullName}</strong> ({activeConfig.role.replace('_', ' ')})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium hidden sm:inline">
                Viewing perspective preview:
              </span>
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={isSwitchingAuth}
                onClick={() => handleSwitchSession(currentRoleView)}
                leftIcon={
                  isSwitchingAuth ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )
                }
                className="w-full sm:w-auto font-black shadow-xs"
              >
                {isSwitchingAuth
                  ? 'Authenticating...'
                  : `Login as ${activeConfig.defaultUserName.split(' ')[0]}`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Role Feature Highlights & Context Strip */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
            Key Role Tools:
          </span>
          {activeConfig.primaryFeatures.map((feat) => (
            <span
              key={feat}
              className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${activeConfig.badgeBg} ${activeConfig.badgeText}`}
            >
              {feat}
            </span>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>Accessible keyboard & screen-reader optimized</span>
        </div>
      </div>
    </div>
  );
};
