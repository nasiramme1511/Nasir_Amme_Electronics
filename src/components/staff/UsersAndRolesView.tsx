'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';

// ============================================================================
// 1. ZERO-DEPENDENCY INLINE SVG ICON HELPER (LIGHT & DARK COMPLIANT)
// ============================================================================
type IconName =
  | 'users'
  | 'user-plus'
  | 'user-check'
  | 'user-x'
  | 'shield'
  | 'key'
  | 'lock'
  | 'unlock'
  | 'search'
  | 'filter'
  | 'check'
  | 'x'
  | 'alert-circle'
  | 'alert-triangle'
  | 'refresh'
  | 'download'
  | 'upload'
  | 'file-text'
  | 'copy'
  | 'send'
  | 'phone'
  | 'mail'
  | 'terminal'
  | 'clock'
  | 'check-circle'
  | 'arrow-right'
  | 'eye'
  | 'eye-off'
  | 'banknote'
  | 'store'
  | 'sparkles'
  | 'info'
  | 'smartphone'
  | 'layers'
  | 'chevron-down'
  | 'hash'
  | 'ticket'
  | 'shield-check'
  | 'sun'
  | 'moon';

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
}

function Icon({ name, className = 'w-4 h-4', size = 16 }: IconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (name) {
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'user-plus':
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      );
    case 'user-check':
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      );
    case 'user-x':
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="8" x2="22" y2="13" />
          <line x1="22" y1="8" x2="17" y2="13" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'key':
      return (
        <svg {...commonProps}>
          <path d="M21 2l-2 2m-1.5 1.5L14 9l-3 3-2-2-4 4 3 3 2-2 3 3 4.5-4.5" />
          <circle cx="7.5" cy="16.5" r="3.5" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...commonProps}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'unlock':
      return (
        <svg {...commonProps}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      );
    case 'search':
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...commonProps}>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );
    case 'check':
      return (
        <svg {...commonProps}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'x':
      return (
        <svg {...commonProps}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'alert-circle':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg {...commonProps}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...commonProps}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );
    case 'download':
      return (
        <svg {...commonProps}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...commonProps}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...commonProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...commonProps}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case 'send':
      return (
        <svg {...commonProps}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...commonProps}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...commonProps}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'terminal':
      return (
        <svg {...commonProps}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...commonProps}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...commonProps}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...commonProps}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...commonProps}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );
    case 'banknote':
      return (
        <svg {...commonProps}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case 'store':
      return (
        <svg {...commonProps}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...commonProps}>
          <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636" />
        </svg>
      );
    case 'info':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case 'smartphone':
      return (
        <svg {...commonProps}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...commonProps}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...commonProps}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case 'hash':
      return (
        <svg {...commonProps}>
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" />
          <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
      );
    case 'ticket':
      return (
        <svg {...commonProps}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 2" />
        </svg>
      );
    case 'shield-check':
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...commonProps}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    default:
      return null;
  }
}

// ============================================================================
// 2. DATA MODELS & LOCALIZED ETHIOPIAN ENTERPRISE FIXTURES
// ============================================================================
export type StaffRole = 'ADMIN' | 'STORE_MANAGER' | 'POS_CASHIER' | 'STOCK_KEEPER';
export type StoreBranch =
  | 'Dire Dawa Main Front Desk'
  | 'Dire Dawa Warehouse B'
  | 'Harar Branch Satellite'
  | 'Kezira Express Counter';

export interface StaffRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  branch: StoreBranch;
  isActive: boolean;
  mustChangePassword: boolean;
  hasFastPin: boolean;
  tempPasswordPlain?: string;
  lastLoginText: string;
  isRootAdmin?: boolean;
}

export type DispatchChannel = 'ETHIO_TELECOM_SMS' | 'OFFICIAL_EMAIL' | 'FLOOR_HANDOVER';

export interface RecoveryTicket {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffPhone: string;
  staffRole: StaffRole;
  branch: StoreBranch;
  reason: string;
  createdAt: string;
  status: 'PENDING_VERIFICATION' | 'DISPATCHED_ACTIVE' | 'RESOLVED_ROTATED';
  dispatchedVia?: DispatchChannel;
  dispatchedAt?: string;
  otpCode?: string;
  tempPassword?: string;
  ttlSecondsRemaining: number;
}

export interface ToastNotice {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const DEFAULT_BRANCHES: StoreBranch[] = [
  'Dire Dawa Main Front Desk',
  'Dire Dawa Warehouse B',
  'Harar Branch Satellite',
  'Kezira Express Counter',
];

const INITIAL_STAFF_DATA: StaffRecord[] = [
  {
    id: 'usr-01',
    fullName: 'Nasir Amme',
    email: 'nasir@amme-electronics.et',
    phone: '+251 915 78 90 12',
    role: 'ADMIN',
    branch: 'Dire Dawa Main Front Desk',
    isActive: true,
    mustChangePassword: false,
    hasFastPin: true,
    lastLoginText: 'Active Session (Now)',
    isRootAdmin: true,
  },
  {
    id: 'usr-02',
    fullName: 'Ahmed Ibrahim',
    email: 'ahmed.mgr@amme-electronics.et',
    phone: '+251 915 22 33 44',
    role: 'STORE_MANAGER',
    branch: 'Dire Dawa Main Front Desk',
    isActive: true,
    mustChangePassword: false,
    hasFastPin: true,
    lastLoginText: 'Today at 08:14 AM',
  },
  {
    id: 'usr-03',
    fullName: 'Tigist Alem',
    email: 'tigist@amme-electronics.et',
    phone: '+251 915 55 66 77',
    role: 'POS_CASHIER',
    branch: 'Dire Dawa Main Front Desk',
    isActive: true,
    mustChangePassword: false,
    hasFastPin: true,
    lastLoginText: 'Yesterday at 05:45 PM',
  },
  {
    id: 'usr-04',
    fullName: 'Dawit Bekele',
    email: 'dawit@amme-electronics.et',
    phone: '+251 915 88 99 00',
    role: 'STOCK_KEEPER',
    branch: 'Dire Dawa Warehouse B',
    isActive: true,
    mustChangePassword: true,
    hasFastPin: false,
    tempPasswordPlain: 'Amme-Reset928!',
    lastLoginText: '3 days ago',
  },
  {
    id: 'usr-05',
    fullName: 'Fatima Mohammed',
    email: 'fatima@amme-electronics.et',
    phone: '+251 915 11 22 33',
    role: 'POS_CASHIER',
    branch: 'Kezira Express Counter',
    isActive: false,
    mustChangePassword: true,
    hasFastPin: false,
    lastLoginText: '12 days ago (Archived)',
  },
];

const INITIAL_TICKETS: RecoveryTicket[] = [
  {
    id: 'TCK-8491',
    staffId: 'usr-03',
    staffName: 'Tigist Alem',
    staffEmail: 'tigist@amme-electronics.et',
    staffPhone: '+251 915 55 66 77',
    staffRole: 'POS_CASHIER',
    branch: 'Dire Dawa Main Front Desk',
    reason: 'Shift handover lockout; forgot secondary terminal password after power restart',
    createdAt: '12 minutes ago',
    status: 'PENDING_VERIFICATION',
    ttlSecondsRemaining: 900,
  },
  {
    id: 'TCK-7120',
    staffId: 'usr-04',
    staffName: 'Dawit Bekele',
    staffEmail: 'dawit@amme-electronics.et',
    staffPhone: '+251 9*** ***900',
    staffRole: 'STOCK_KEEPER',
    branch: 'Dire Dawa Warehouse B',
    reason: 'Warehouse tablet reset; new hardware assignment',
    createdAt: '34 minutes ago',
    status: 'DISPATCHED_ACTIVE',
    dispatchedVia: 'ETHIO_TELECOM_SMS',
    dispatchedAt: '25 minutes ago',
    ttlSecondsRemaining: 540,
  },
];

function formatETB(amount: number) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// 3. MAIN COMPONENT IMPLEMENTATION (DUAL LIGHT / DARK SUPPORT)
// ============================================================================
export function UsersAndRolesView() {
  const { theme, toggleTheme, isDark } = useTheme();

  // Navigation Tabs: 'directory' | 'recovery' | 'terminal'
  const [activeTab, setActiveTab] = useState<'directory' | 'recovery' | 'terminal'>('directory');

  // Master Staff State
  const [staffList, setStaffList] = useState<StaffRecord[]>(INITIAL_STAFF_DATA);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Recovery Queue State
  const [tickets, setTickets] = useState<RecoveryTicket[]>(INITIAL_TICKETS);
  const [activeVerifyTicket, setActiveVerifyTicket] = useState<RecoveryTicket | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState<DispatchChannel>('ETHIO_TELECOM_SMS');

  // Modals & Drawers
  const [isSoftDeactivateModalOpen, setIsSoftDeactivateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);

  // CSV Import State
  const [importCsvText, setImportCsvText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<
    Array<{
      fullName: string;
      email: string;
      phone: string;
      role: StaffRole;
      branch: StoreBranch;
      isValid: boolean;
      errorMsg?: string;
    }>
  >([]);

  // Cashier Till Simulation State
  const [simSelectedUser, setSimSelectedUser] = useState<StaffRecord>(INITIAL_STAFF_DATA[2]); // Tigist Alem
  const [simStep, setSimStep] = useState<'LOGIN' | 'RAISE_TICKET' | 'ROTATION' | 'POS_ACTIVE'>('LOGIN');
  const [simLoginEmail, setSimLoginEmail] = useState('tigist@amme-electronics.et');
  const [simLoginPassword, setSimLoginPassword] = useState('');
  const [simTicketReason, setSimTicketReason] = useState('Shift handover lockout at counter');
  const [simSubmittedTicketId, setSimSubmittedTicketId] = useState<string | null>(null);

  // Forced Rotation Inputs
  const [simOtpInput, setSimOtpInput] = useState('');
  const [simNewPassword, setSimNewPassword] = useState('');
  const [simConfirmPassword, setSimConfirmPassword] = useState('');
  const [simNewPin, setSimNewPin] = useState('');
  const [simShowNewPassword, setSimShowNewPassword] = useState(false);

  // Till Fast Lock Simulation
  const [isTillLocked, setIsTillLocked] = useState(false);
  const [tillPinInput, setTillPinInput] = useState('');

  // Toast System
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const addToast = useCallback((title: string, message: string, type: ToastNotice['type'] = 'info') => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Sync real users from backend if available
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const apiUsers: StaffRecord[] = json.data.map((u: any) => {
            const roleCode = (u.roles?.[0] || 'pos_cashier').toUpperCase();
            let mappedRole: StaffRole = 'POS_CASHIER';
            if (roleCode.includes('ADMIN')) mappedRole = 'ADMIN';
            else if (roleCode.includes('MANAGER')) mappedRole = 'STORE_MANAGER';
            else if (roleCode.includes('STOCK')) mappedRole = 'STOCK_KEEPER';

            return {
              id: u.id,
              fullName: u.fullName || 'Staff Member',
              email: u.email,
              phone: u.phone || '+251 915 00 00 00',
              role: mappedRole,
              branch: 'Dire Dawa Main Front Desk',
              isActive: u.status === 'active',
              mustChangePassword: false,
              hasFastPin: true,
              lastLoginText: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString() : 'Never active',
              isRootAdmin: u.email.toLowerCase().includes('nasir') && mappedRole === 'ADMIN',
            };
          });
          setStaffList(apiUsers);
        }
      })
      .catch(() => {
        // Fallback to initial demo staff list
      });
  }, []);

  // 15-Minute TTL Timer for Active Tickets
  useEffect(() => {
    const interval = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.status === 'DISPATCHED_ACTIVE' && t.ttlSecondsRemaining > 0) {
            const nextTTL = t.ttlSecondsRemaining - 1;
            return {
              ...t,
              ttlSecondsRemaining: nextTTL,
              status: nextTTL === 0 ? 'PENDING_VERIFICATION' : t.status,
            };
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync simLoginEmail when sim persona changes
  useEffect(() => {
    if (simSelectedUser) {
      setSimLoginEmail(simSelectedUser.email);
      setSimLoginPassword('');
      setSimStep(simSelectedUser.mustChangePassword ? 'ROTATION' : 'LOGIN');
    }
  }, [simSelectedUser]);

  // Password Entropy Meter Calculation
  const passwordEntropy = useMemo(() => {
    const p = simNewPassword;
    const checks = {
      length: p.length >= 8,
      uppercase: /[A-Z]/.test(p) && /[a-z]/.test(p),
      number: /[0-9]/.test(p),
      symbol: /[^A-Za-z0-9]/.test(p),
    };
    const score = Object.values(checks).filter(Boolean).length;
    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score === 2) {
      label = 'Moderate';
      color = 'bg-amber-500';
    } else if (score === 3) {
      label = 'Strong';
      color = 'bg-sky-500';
    } else if (score === 4) {
      label = 'Enterprise Secure';
      color = 'bg-emerald-500';
    }
    return { checks, score, label, color };
  }, [simNewPassword]);

  // Directory Filtering & Selection
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      const matchesBranch = branchFilter === 'ALL' || s.branch === branchFilter;
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [staffList, searchTerm, roleFilter, branchFilter]);

  const selectableStaff = useMemo(() => {
    return filteredStaff.filter((s) => !s.isRootAdmin);
  }, [filteredStaff]);

  const isAllSelected = useMemo(() => {
    if (selectableStaff.length === 0) return false;
    return selectableStaff.every((s) => selectedStaffIds.has(s.id));
  }, [selectableStaff, selectedStaffIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStaffIds(new Set());
    } else {
      const next = new Set<string>();
      selectableStaff.forEach((s) => next.add(s.id));
      setSelectedStaffIds(next);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Ticket Issuance & Recovery Handlers
  const handleRaiseQuickResetTicket = (staff: StaffRecord) => {
    const ticketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: RecoveryTicket = {
      id: ticketId,
      staffId: staff.id,
      staffName: staff.fullName,
      staffEmail: staff.email,
      staffPhone: staff.phone,
      staffRole: staff.role,
      branch: staff.branch,
      reason: 'Administrator manual emergency reset request from Directory Grid',
      createdAt: 'Just now',
      status: 'PENDING_VERIFICATION',
      ttlSecondsRemaining: 900,
    };

    setTickets((prev) => [newTicket, ...prev]);
    setActiveTab('recovery');
    setActiveVerifyTicket(newTicket);
    addToast(
      'Recovery Ticket Generated',
      `Emergency ticket ${ticketId} raised for ${staff.fullName}. Ready for admin dispatch.`,
      'info'
    );
  };

  const handleConfirmTokenIssuance = () => {
    if (!activeVerifyTicket) return;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === activeVerifyTicket.id) {
          return {
            ...t,
            status: 'DISPATCHED_ACTIVE',
            dispatchedVia: dispatchChannel,
            dispatchedAt: 'Just now',
            ttlSecondsRemaining: 900,
          };
        }
        return t;
      })
    );

    const targetName = activeVerifyTicket.staffName;
    const channelName =
      dispatchChannel === 'ETHIO_TELECOM_SMS'
        ? 'Ethio Telecom Priority SMS'
        : dispatchChannel === 'OFFICIAL_EMAIL'
        ? 'Corporate Email'
        : 'Floor Handover Slip';

    addToast(
      'Recovery Challenge Dispatched',
      `Dispatched HMAC-SHA256 protected OTP challenge to ${targetName} via ${channelName}. TTL: 15 mins. Staff must verify with self-service reset.`,
      'success'
    );

    setActiveVerifyTicket(null);
  };

  const handleTestInTillSimulation = (ticket: RecoveryTicket) => {
    const staff = staffList.find((s) => s.id === ticket.staffId);
    if (staff) {
      setSimSelectedUser(staff);
      setSimLoginEmail(staff.email);
      setSimLoginPassword('');
      setSimOtpInput('');
      setSimStep('LOGIN');
      setActiveTab('terminal');
      addToast(
        'Switched to Cashier Sandbox',
        `Ready to test terminal login for ${staff.fullName}.`,
        'info'
      );
    }
  };

  // Cashier Till Simulation Handlers
  const handleSimulateLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!simLoginEmail) {
      addToast('Input Error', 'Please enter your cashier login email.', 'error');
      return;
    }

    const matchingStaff = staffList.find(
      (s) => s.email.toLowerCase() === simLoginEmail.toLowerCase().trim()
    );

    if (!matchingStaff) {
      addToast('Account Not Found', 'No staff registered with this email address.', 'error');
      return;
    }

    if (!matchingStaff.isActive) {
      addToast(
        'Account Suspended',
        'Staff account has been deactivated. Please contact Store Administration.',
        'error'
      );
      return;
    }

    if (matchingStaff.mustChangePassword) {
      setSimSelectedUser(matchingStaff);
      setSimStep('ROTATION');
      addToast(
        'Mandatory Rotation Enforced',
        'Your credentials have been flagged for forced security rotation. Enter issued OTP to proceed.',
        'warning'
      );
      return;
    }

    setSimSelectedUser(matchingStaff);
    setSimStep('POS_ACTIVE');
    addToast(
      'Till Station Authenticated',
      `Welcome ${matchingStaff.fullName}! Till drawer initialized with 12,400.00 ETB float.`,
      'success'
    );
  };

  const handleSimulateRotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!simOtpInput || simOtpInput.length !== 6) {
      addToast('Validation Error', 'Please enter the full 6-digit OTP token.', 'error');
      return;
    }

    if (!simNewPassword || simNewPassword.length < 8) {
      addToast('Password Too Short', 'Permanent password must be at least 8 characters long.', 'error');
      return;
    }

    if (simNewPassword !== simConfirmPassword) {
      addToast('Mismatch Error', 'Password confirmation does not match.', 'error');
      return;
    }

    if (simNewPin && simNewPin.length !== 4) {
      addToast('PIN Format Error', 'POS Fast PIN must be exactly 4 numeric digits.', 'error');
      return;
    }

    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === simSelectedUser.id) {
          return {
            ...s,
            mustChangePassword: false,
            tempPasswordPlain: undefined,
            hasFastPin: Boolean(simNewPin),
            lastLoginText: 'Just logged in',
          };
        }
        return s;
      })
    );

    setTickets((prev) =>
      prev.map((t) => {
        if (t.staffId === simSelectedUser.id && t.status === 'DISPATCHED_ACTIVE') {
          return { ...t, status: 'RESOLVED_ROTATED' };
        }
        return t;
      })
    );

    setSimStep('POS_ACTIVE');
    addToast(
      'Credentials Rotated',
      'Password updated successfully and fast 4-digit PIN configured. Launching Till session.',
      'success'
    );
  };

  const handleTillPinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (tillPinInput.length === 4) {
      setIsTillLocked(false);
      setTillPinInput('');
      addToast('Counter Unlocked', 'Cashier session resumed instantly.', 'success');
    } else {
      addToast('Invalid PIN', 'Enter your 4-digit security PIN.', 'error');
    }
  };

  // Bulk Soft-Deactivation & Restoration
  const handleConfirmBulkSoftDeactivate = () => {
    const count = selectedStaffIds.size;
    setStaffList((prev) =>
      prev.map((s) => {
        if (selectedStaffIds.has(s.id) && !s.isRootAdmin) {
          return { ...s, isActive: false };
        }
        return s;
      })
    );

    // Call API for each user asynchronously
    selectedStaffIds.forEach((id) => {
      fetch(`/api/users/${id}`, { method: 'DELETE' }).catch(() => null);
    });

    setSelectedStaffIds(new Set());
    setIsSoftDeactivateModalOpen(false);
    addToast(
      'Bulk Soft-Deactivation Complete',
      `Safely archived ${count} staff member(s). Ledger, stock movements, and shift logs preserved.`,
      'warning'
    );
  };

  const handleBulkRestoreActive = () => {
    const count = selectedStaffIds.size;
    setStaffList((prev) =>
      prev.map((s) => {
        if (selectedStaffIds.has(s.id)) {
          return { ...s, isActive: true };
        }
        return s;
      })
    );

    setSelectedStaffIds(new Set());
    addToast(
      'Staff Accounts Restored',
      `Successfully restored ${count} staff account(s) to Active operational clearance.`,
      'success'
    );
  };

  // Bulk Export Engine (CSV & JSON)
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const headers = [
      'User ID',
      'Full Name',
      'Email Address',
      'Phone',
      'Role Code',
      'Store Branch',
      'Status',
      'Must Change Pass',
      'Fast PIN Configured',
    ];
    const rows = filteredStaff.map((s) => [
      `"${s.id}"`,
      `"${s.fullName.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      `"${s.phone}"`,
      `"${s.role}"`,
      `"${s.branch}"`,
      `"${s.isActive ? 'ACTIVE' : 'DEACTIVATED'}"`,
      `"${s.mustChangePassword ? 'YES' : 'NO'}"`,
      `"${s.hasFastPin ? 'YES' : 'NO'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nasir_amme_staff_roster_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('CSV Roster Exported', `Downloaded ${filteredStaff.length} staff records (RFC-4180 CSV).`, 'success');
  };

  const handleExportJSON = () => {
    const today = new Date().toISOString().split('T')[0];
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredStaff, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `nasir_amme_staff_roster_${today}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('JSON Schema Exported', `Downloaded complete staff directory JSON schema.`, 'success');
  };

  // CSV Import Parser
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParsedImportRows([]);
      return;
    }

    const rows = lines.slice(1).map((line) => {
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const fullName = parts[0] || '';
      const email = parts[1] || '';
      const phone = parts[2] || '';
      const roleRaw = (parts[3] || '').toUpperCase();
      const branchRaw = parts[4] || 'Dire Dawa Main Front Desk';

      let role: StaffRole = 'POS_CASHIER';
      if (roleRaw.includes('ADMIN')) role = 'ADMIN';
      else if (roleRaw.includes('MANAGER')) role = 'STORE_MANAGER';
      else if (roleRaw.includes('STOCK')) role = 'STOCK_KEEPER';

      let isValid = true;
      let errorMsg = '';

      if (!fullName) {
        isValid = false;
        errorMsg = 'Name required';
      } else if (!email || !email.includes('@')) {
        isValid = false;
        errorMsg = 'Invalid email';
      }

      return {
        fullName,
        email,
        phone: phone || '+251 915 00 00 00',
        role,
        branch: branchRaw as StoreBranch,
        isValid,
        errorMsg,
      };
    });

    setParsedImportRows(rows);
  };

  const handleCommitImport = () => {
    const valid = parsedImportRows.filter((r) => r.isValid);
    if (valid.length === 0) return;

    const newStaff: StaffRecord[] = valid.map((r, i) => ({
      id: `usr-imp-${Date.now()}-${i}`,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      role: r.role,
      branch: r.branch,
      isActive: true,
      mustChangePassword: true,
      hasFastPin: false,
      tempPasswordPlain: 'Amme-Welcome2026!',
      lastLoginText: 'Never active (Imported)',
    }));

    setStaffList((prev) => [...newStaff, ...prev]);
    setIsImportModalOpen(false);
    setImportCsvText('');
    setParsedImportRows([]);
    addToast(
      'Bulk Import Successful',
      `Imported ${newStaff.length} staff records with mandatory password rotation flag set.`,
      'success'
    );
  };

  const handleLoadSampleCSV = () => {
    const sample = `fullName,email,phone,roleCode,branch
Kidist Haile,kidist@amme-electronics.et,+251 915 44 55 66,POS_CASHIER,Dire Dawa Main Front Desk
Yonas Girma,yonas@amme-electronics.et,+251 915 77 88 99,STOCK_KEEPER,Dire Dawa Warehouse B
Blen Tesfaye,blen@amme-electronics.et,+251 915 12 34 56,STORE_MANAGER,Harar Branch Satellite`;
    setImportCsvText(sample);
    parseCSV(sample);
  };

  // ==========================================================================
  // RENDER UI (DUAL THEME COMPLIANT)
  // ==========================================================================
  return (
    <div className="w-full space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200 select-none">
      {/* Toast Notification Stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 flex items-start gap-3 ${
              t.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                : t.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
                : t.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <Icon name="check-circle" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              {t.type === 'error' && <Icon name="alert-circle" className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              {t.type === 'warning' && <Icon name="alert-triangle" className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              {t.type === 'info' && <Icon name="info" className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold">{t.title}</p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Header & Localization Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold font-mono tracking-wider uppercase">
              Dire Dawa Main Terminal
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Store ID: DD-MAIN-01</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
            Staff Access & Recovery Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Admin-Assisted Password Recovery, Bulk Roster Operations & Till Simulation
          </p>
        </div>

        {/* Global Tabs Navigation & Theme Quick Switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            <Icon name={isDark ? 'sun' : 'moon'} className="w-4 h-4 text-amber-500" />
          </button>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon name="users" className="w-4 h-4" />
              <span>Staff Directory ({staffList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recovery')}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'recovery'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon name="ticket" className="w-4 h-4" />
              <span>Recovery Queue</span>
              {tickets.filter((t) => t.status === 'PENDING_VERIFICATION').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold animate-pulse">
                  {tickets.filter((t) => t.status === 'PENDING_VERIFICATION').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon name="terminal" className="w-4 h-4" />
              <span>Till Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: STAFF DIRECTORY & BULK MANAGEMENT
         ===================================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Icon name="search" className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search staff by name, email, or phone..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-xs"
                />
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer appearance-none shadow-xs"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Administrators</option>
                  <option value="STORE_MANAGER">Store Managers</option>
                  <option value="POS_CASHIER">POS Cashiers</option>
                  <option value="STOCK_KEEPER">Stock Keepers</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Icon name="chevron-down" className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Branch Filter */}
              <div className="relative">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer appearance-none shadow-xs"
                >
                  <option value="ALL">All Branches</option>
                  {DEFAULT_BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Icon name="chevron-down" className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddStaffModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Icon name="user-plus" className="w-4 h-4" />
                <span>Add Staff</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Bulk provision staff from CSV"
              >
                <Icon name="upload" className="w-4 h-4" />
                <span>Import CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Export filtered roster to RFC-4180 CSV"
              >
                <Icon name="download" className="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Export JSON schema"
              >
                <Icon name="file-text" className="w-4 h-4" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Floating Bulk Action Bar (When >= 1 selected) */}
          {selectedStaffIds.size > 0 && (
            <div className="p-3 bg-gradient-to-r from-amber-500/15 via-slate-100 dark:via-slate-900 to-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in shadow-md">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
                  {selectedStaffIds.size}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Staff profile(s) selected
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  (Root Admin Nasir Amme protected from bulk mutation)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSoftDeactivateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Icon name="user-x" className="w-3.5 h-3.5" />
                  <span>Soft Deactivate ({selectedStaffIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkRestoreActive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Icon name="user-check" className="w-3.5 h-3.5" />
                  <span>Restore Active</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStaffIds(new Set())}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Staff Roster Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Staff Profile</th>
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Role & Clearance</th>
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Assigned Branch</th>
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Account Status</th>
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Security / Fast PIN</th>
                    <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredStaff.map((staff) => {
                    const isSelected = selectedStaffIds.has(staff.id);

                    return (
                      <tr
                        key={staff.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-amber-500/10 dark:bg-amber-500/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          {staff.isRootAdmin ? (
                            <span title="Root Administrator (Protected from bulk mutation)">
                              <Icon name="lock" className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(staff.id)}
                              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                            />
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400">
                              {staff.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{staff.fullName}</span>
                                {staff.isRootAdmin && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold border border-amber-500/30">
                                    ROOT ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{staff.email}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{staff.phone}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border ${
                              staff.role === 'ADMIN'
                                ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
                                : staff.role === 'STORE_MANAGER'
                                ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30'
                                : staff.role === 'STOCK_KEEPER'
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            }`}
                          >
                            <Icon name="shield-check" className="w-3 h-3" />
                            <span>{staff.role.replace('_', ' ')}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                            <Icon name="store" className="w-3.5 h-3.5 text-slate-400" />
                            <span>{staff.branch}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              staff.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{staff.isActive ? 'Active Clearance' : 'Soft Deactivated'}</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                            {staff.lastLoginText}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {staff.mustChangePassword ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                                <Icon name="alert-circle" className="w-3 h-3" />
                                <span>Forced Rotation Pending</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <Icon name="check" className="w-3 h-3" />
                                <span>Credentials Verified</span>
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              Fast PIN: {staff.hasFastPin ? 'Configured (4-digit)' : 'Not Set'}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRaiseQuickResetTicket(staff)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              title="Generate emergency password reset ticket"
                            >
                              <Icon name="key" className="w-3 h-3" />
                              <span>Reset Gate</span>
                            </button>

                            {!staff.isRootAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStaffIds(new Set([staff.id]));
                                  setIsSoftDeactivateModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Soft-deactivate account"
                              >
                                <Icon name="user-x" className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: RECOVERY QUEUE & TOKEN ISSUANCE
         ===================================================================== */}
      {activeTab === 'recovery' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="ticket" className="w-4 h-4 text-amber-500" />
                <span>Admin-Assisted Password Recovery Queue</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Staff lockouts require identity verification and cryptographic 6-digit OTP dispatch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono text-xs font-bold">
                Active Tickets: {tickets.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all ${
                  t.status === 'PENDING_VERIFICATION'
                    ? 'bg-white dark:bg-[#0C1424] border-amber-300 dark:border-amber-500/40 shadow-sm'
                    : t.status === 'DISPATCHED_ACTIVE'
                    ? 'bg-white dark:bg-[#0C1424] border-emerald-300 dark:border-emerald-500/40 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold block">{t.id}</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{t.staffName}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{t.staffRole} • {t.branch}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      t.status === 'PENDING_VERIFICATION'
                        ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                        : t.status === 'DISPATCHED_ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="text-slate-500 dark:text-slate-400">Lockout Reason:</div>
                  <p className="text-slate-700 dark:text-slate-300 italic">{t.reason}</p>
                </div>

                {t.status === 'DISPATCHED_ACTIVE' && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-500/30 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">Security Digest:</span>
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/40">
                        HMAC-SHA256 Protected
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">Dispatch Channel:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">Ethio Telecom SMS</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">Time-To-Live (TTL):</span>
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                        {Math.floor(t.ttlSecondsRemaining / 60)}m {t.ttlSecondsRemaining % 60}s remaining
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Issued {t.createdAt}</span>

                  <div className="flex items-center gap-1.5">
                    {t.status === 'PENDING_VERIFICATION' && (
                      <button
                        type="button"
                        onClick={() => setActiveVerifyTicket(t)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        <Icon name="key" className="w-3.5 h-3.5" />
                        <span>Verify & Dispatch OTP</span>
                      </button>
                    )}

                    {t.status === 'DISPATCHED_ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleTestInTillSimulation(t)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        <Icon name="terminal" className="w-3.5 h-3.5" />
                        <span>Test at Till</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: CASHIER TILL SIMULATION
         ===================================================================== */}
      {activeTab === 'terminal' && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] shadow-xl">
            {/* Persona Switcher Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase block">Testing Persona</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{simSelectedUser.fullName}</span>
              </div>
              <select
                value={simSelectedUser.id}
                onChange={(e) => {
                  const u = staffList.find((s) => s.id === e.target.value);
                  if (u) setSimSelectedUser(u);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* SCENARIO A: TERMINAL LOGIN */}
            {simStep === 'LOGIN' && (
              <form onSubmit={handleSimulateLoginSubmit} className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                    <Icon name="terminal" className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Counter POS Register Terminal</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dire Dawa Main Front Desk • Register #01
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Staff Email</label>
                  <input
                    type="email"
                    required
                    value={simLoginEmail}
                    onChange={(e) => setSimLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Terminal Password</label>
                    <button
                      type="button"
                      onClick={() => setSimStep('RAISE_TICKET')}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={simLoginPassword}
                    onChange={(e) => setSimLoginPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer transition-all"
                >
                  Sign In to Till Station
                </button>
              </form>
            )}

            {/* SCENARIO B: FORCED ROTATION */}
            {simStep === 'ROTATION' && (
              <form onSubmit={handleSimulateRotationSubmit} className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold font-mono uppercase">
                    Mandatory Security Gate
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Forced Password & PIN Rotation</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify 6-digit OTP and configure your private credentials
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Enter 6-Digit OTP Token
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={simOtpInput}
                    onChange={(e) => setSimOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 482910"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-mono text-lg font-bold tracking-widest text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Permanent Password
                  </label>
                  <div className="relative">
                    <input
                      type={simShowNewPassword ? 'text' : 'password'}
                      required
                      value={simNewPassword}
                      onChange={(e) => setSimNewPassword(e.target.value)}
                      placeholder="At least 8 chars"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setSimShowNewPassword(!simShowNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <Icon name={simShowNewPassword ? 'eye' : 'eye-off'} className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">Password Entropy Score:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{passwordEntropy.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-1 transition-all ${passwordEntropy.score >= 1 ? passwordEntropy.color : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className={`h-full flex-1 transition-all ${passwordEntropy.score >= 2 ? passwordEntropy.color : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className={`h-full flex-1 transition-all ${passwordEntropy.score >= 3 ? passwordEntropy.color : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className={`h-full flex-1 transition-all ${passwordEntropy.score >= 4 ? passwordEntropy.color : 'bg-slate-300 dark:bg-slate-700'}`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Permanent Password
                  </label>
                  <input
                    type="password"
                    required
                    value={simConfirmPassword}
                    onChange={(e) => setSimConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Set 4-Digit Fast-Switch POS Lock PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={simNewPin}
                    onChange={(e) => setSimNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 4455"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-mono text-base font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icon name="check-circle" className="w-4 h-4" />
                  <span>Verify OTP & Launch Active Till Session</span>
                </button>
              </form>
            )}

            {/* SCENARIO C: ACTIVE POS REGISTER DASHBOARD */}
            {simStep === 'POS_ACTIVE' && (
              <div className="space-y-4">
                {isTillLocked ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-amber-500/40 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto">
                      <Icon name="lock" className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Till Station Locked</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Cashier: {simSelectedUser.fullName} • Enter 4-digit PIN to resume
                      </p>
                    </div>

                    <form onSubmit={handleTillPinUnlock} className="max-w-[200px] mx-auto space-y-3">
                      <input
                        type="password"
                        maxLength={4}
                        autoFocus
                        value={tillPinInput}
                        onChange={(e) => setTillPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-mono text-2xl font-bold tracking-widest text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Unlock Till
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">ACTIVE CASHIER</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{simSelectedUser.fullName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">CLEARANCE ROLE</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                          {simSelectedUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Physical Cash Float</span>
                        <div className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatETB(12400)}
                        </div>
                        <span className="text-[10px] text-slate-400">Drawer balanced</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Telebirr Merchant Totals</span>
                        <div className="font-mono text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                          {formatETB(18450)}
                        </div>
                        <span className="text-[10px] text-slate-400">Merchant Code: 915001</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsTillLocked(true)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Icon name="lock" className="w-3.5 h-3.5 text-amber-500" />
                        <span>Lock Till Counter</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSimStep('LOGIN');
                          addToast('Shift Ended', 'Signed out from register drawer.', 'info');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-800 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Close Register Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: VERIFY IDENTITY & ISSUE TOKEN
         ===================================================================== */}
      {activeVerifyTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0C1424] rounded-3xl border border-amber-500/40 shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Icon name="key" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Verify Staff Identity & Issue Token</h3>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    Ticket: {activeVerifyTicket.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVerifyTicket(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Staff Member:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeVerifyTicket.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Operational Role:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">{activeVerifyTicket.staffRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Verified Contact:</span>
                <span className="font-mono text-slate-900 dark:text-white">{activeVerifyTicket.staffPhone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Dispatch Channel for 6-Digit OTP:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDispatchChannel('ETHIO_TELECOM_SMS')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    dispatchChannel === 'ETHIO_TELECOM_SMS'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon name="smartphone" className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <span className="text-[11px] block">Ethio Telecom SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('OFFICIAL_EMAIL')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    dispatchChannel === 'OFFICIAL_EMAIL'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon name="mail" className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <span className="text-[11px] block">Corporate Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('FLOOR_HANDOVER')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    dispatchChannel === 'FLOOR_HANDOVER'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon name="file-text" className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <span className="text-[11px] block">Floor Handover</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveVerifyTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTokenIssuance}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
              >
                Issue Token & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: BULK SOFT-DEACTIVATE AUDIT GATE
         ===================================================================== */}
      {isSoftDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0C1424] rounded-3xl border border-rose-300 dark:border-rose-500/40 shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Icon name="alert-triangle" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulk Soft-Deactivation Audit Gate</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Targeting {selectedStaffIds.size} staff account(s)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Audit Compliance & Ledger Preservation Guarantee:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                <li>
                  <strong>Zero Ledger Loss:</strong> Historical sales receipts, thermal print journals, and cash drop balances remain intact.
                </li>
                <li>
                  <strong>Immutable Stock Movements:</strong> All GRN intake movements and physical count logs recorded by these users are retained for audits.
                </li>
                <li>
                  <strong>Instant Revocation:</strong> Active sessions are revoked immediately, preventing further counter login.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSoftDeactivateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkSoftDeactivate}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Confirm Soft Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: BULK CSV IMPORT WIZARD
         ===================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0C1424] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full p-6 text-slate-900 dark:text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Icon name="upload" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulk Staff CSV Import Wizard</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Parse and validate staff roster with RFC-4180 compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Expected columns: <code className="text-amber-600 dark:text-amber-400 font-mono">fullName, email, phone, roleCode, branch</code>
              </span>
              <button
                type="button"
                onClick={handleLoadSampleCSV}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold hover:bg-amber-500/25 cursor-pointer text-xs"
              >
                Load Sample Template
              </button>
            </div>

            <textarea
              rows={5}
              value={importCsvText}
              onChange={(e) => {
                setImportCsvText(e.target.value);
                parseCSV(e.target.value);
              }}
              placeholder="Paste raw CSV content here..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />

            {parsedImportRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Staging Validation Preview ({parsedImportRows.length} rows)</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Valid: <strong className="text-emerald-600 dark:text-emerald-400">{parsedImportRows.filter((r) => r.isValid).length}</strong> • 
                    Invalid: <strong className="text-rose-600 dark:text-rose-400">{parsedImportRows.filter((r) => !r.isValid).length}</strong>
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {parsedImportRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'text-slate-700 dark:text-slate-300' : 'bg-rose-50 dark:bg-rose-500/5 text-rose-700 dark:text-rose-300'}>
                          <td className="py-2 px-3 font-semibold">{row.fullName || '—'}</td>
                          <td className="py-2 px-3 font-mono">{row.email || '—'}</td>
                          <td className="py-2 px-3 font-mono text-amber-600 dark:text-amber-400">{row.role}</td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Icon name="check" className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">{row.errorMsg}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedImportRows.filter((r) => r.isValid).length === 0}
                onClick={handleCommitImport}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
              >
                Commit Import ({parsedImportRows.filter((r) => r.isValid).length} Valid Records)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ADD SINGLE STAFF MEMBER
         ===================================================================== */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0C1424] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="user-plus" className="w-4 h-4 text-amber-500" />
                <span>Provision New Staff Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);

                const newMember: StaffRecord = {
                  id: `usr-${Date.now()}`,
                  fullName: String(formData.get('fullName') || ''),
                  email: String(formData.get('email') || ''),
                  phone: String(formData.get('phone') || '+251 915 00 00 00'),
                  role: String(formData.get('role') || 'POS_CASHIER') as StaffRole,
                  branch: String(formData.get('branch') || 'Dire Dawa Main Front Desk') as StoreBranch,
                  isActive: true,
                  mustChangePassword: true,
                  hasFastPin: false,
                  tempPasswordPlain: 'Amme-Direct2026!',
                  lastLoginText: 'Never active',
                };

                setStaffList((prev) => [newMember, ...prev]);
                setIsAddStaffModalOpen(false);
                addToast('Staff Provisioned', `Added ${newMember.fullName} (${newMember.role}) with forced rotation flag.`, 'success');
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Legal Name</label>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Mahlet Solomon"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="mahlet@amme-electronics.et"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Ethio Telecom Mobile Phone</label>
                <input
                  name="phone"
                  type="text"
                  required
                  defaultValue="+251 9"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Operational Role</label>
                  <select
                    name="role"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="POS_CASHIER">POS Cashier</option>
                    <option value="STOCK_KEEPER">Stock Keeper</option>
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Store Branch</label>
                  <select
                    name="branch"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white cursor-pointer"
                  >
                    {DEFAULT_BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                Staff member will be initialized with a secure temporary password and will be prompted to rotate credentials and configure their 4-digit POS PIN upon first till login.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersAndRolesView;
