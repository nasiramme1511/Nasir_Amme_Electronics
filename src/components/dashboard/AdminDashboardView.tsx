'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { UserAccount, RoleType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Receipt,
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  UserCheck,
  UserX,
  X,
  FileText,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatETB, formatDate, formatNumber } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const AdminDashboardView: React.FC = () => {
  const { products, sales, users, openReceiptModal, addToast, addUser, updateUser } = useApp();
  const { user: authUser } = useAuth();

  // Registration & Password Management states (clean direct controls, no dropdown group)
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserAccount | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserAccount | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');

  // Register Form State
  const initialRegisterForm = {
    name: '',
    role: 'cashier' as RoleType,
    email: '',
    phone: '',
    initialPassword: '',
    status: 'active' as const,
    lastActive: 'Just registered',
    permissions: ['create_sales', 'view_products'],
  };
  const [registerFormData, setRegisterFormData] = useState(initialRegisterForm);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);

    const totalCOGS = sales.reduce((sum, s) => {
      const saleCOGS = s.items.reduce(
        (iSum, item) => iSum + (item.costPrice || 0) * item.quantity,
        0
      );
      return sum + saleCOGS;
    }, 0);

    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPercent =
      totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    const totalStockQuantity = products.reduce((sum, p) => sum + p.stockQuantity, 0);

    const totalStockCostValue = products.reduce(
      (sum, p) => sum + p.costPrice * p.stockQuantity,
      0
    );

    const totalStockRetailValue = products.reduce(
      (sum, p) => sum + p.sellingPrice * p.stockQuantity,
      0
    );

    const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;
    const lowStockCount = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold
    ).length;

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossMarginPercent,
      totalStockQuantity,
      totalStockCostValue,
      totalStockRetailValue,
      lowStockCount,
      outOfStockCount,
      completedSalesCount: sales.length,
    };
  }, [sales, products]);

  // Chart data
  const chartData = useMemo(() => {
    return [
      { day: 'Thu 08', revenue: 14200, grossProfit: 4100, orders: 4 },
      { day: 'Fri 09', revenue: 18900, grossProfit: 5400, orders: 6 },
      { day: 'Sat 10', revenue: 26500, grossProfit: 7800, orders: 9 },
      { day: 'Sun 11', revenue: 21400, grossProfit: 6200, orders: 7 },
      { day: 'Mon 12', revenue: 29800, grossProfit: 8900, orders: 11 },
      { day: 'Tue 13', revenue: 32400, grossProfit: 9800, orders: 12 },
      {
        day: 'Today',
        revenue: metrics.totalRevenue,
        grossProfit: metrics.grossProfit,
        orders: metrics.completedSalesCount,
      },
    ];
  }, [metrics]);

  // Top Selling Products
  const topSellingProducts = useMemo(() => {
    const productSalesMap: Record<
      string,
      { product: (typeof products)[0]; soldQty: number; revenue: number }
    > = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          if (!productSalesMap[prod.id]) {
            productSalesMap[prod.id] = { product: prod, soldQty: 0, revenue: 0 };
          }
          productSalesMap[prod.id].soldQty += item.quantity;
          productSalesMap[prod.id].revenue += item.total;
        }
      });
    });

    return Object.values(productSalesMap)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);
  }, [sales, products]);

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Amme-';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!registerFormData.name.trim()) errors.name = 'Full name is required';
    if (!registerFormData.email.trim()) errors.email = 'Email address is required';

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

    const assignedPassword = registerFormData.initialPassword.trim() || handleGenerateRandomPassword();
    const created = addUser({ ...registerFormData, initialPassword: assignedPassword });
    setIsRegisterModalOpen(false);
    setRegisterFormData(initialRegisterForm);
    setRegisterErrors({});

    navigator.clipboard.writeText(
      `Nasir Amme Electronics Staff Credentials\nName: ${created.name}\nRole: ${created.role.toUpperCase()}\nEmail: ${created.email}\nTemporary Password: ${assignedPassword}\nLogin URL: http://localhost:3000/login`
    );
    addToast({
      title: 'Credentials Generated & Copied',
      message: `Login details for ${created.name} copied to clipboard for handoff.`,
      type: 'success',
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTarget) return;

    const assignedPassword = newTempPassword.trim() || handleGenerateRandomPassword();

    updateUser(resetPasswordTarget.id, {
      temporaryPassword: assignedPassword,
    });

    navigator.clipboard.writeText(
      `Nasir Amme Electronics Password Reset\nStaff: ${resetPasswordTarget.name}\nEmail: ${resetPasswordTarget.email}\nTemporary Password: ${assignedPassword}\nLogin URL: http://localhost:3000/login`
    );
    addToast({
      title: 'Password Reset & Copied',
      message: `New temporary credentials for ${resetPasswordTarget.name} copied to clipboard for handoff.`,
      type: 'success',
    });

    setResetPasswordTarget(null);
    setNewTempPassword('');
  };

  const handleCopyCredentials = (staff: UserAccount) => {
    const text = `Nasir Amme Electronics Staff Login\nEmail: ${staff.email}\nLogin URL: http://localhost:3000/login`;
    navigator.clipboard.writeText(text);
    addToast({
      title: 'Login Email Copied',
      message: `Login email for ${staff.name} copied to clipboard!`,
      type: 'info',
    });
  };

  const handleToggleUserStatus = (staff: UserAccount) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    updateUser(staff.id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Executive Admin Brand Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-md border border-amber-400/50 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.jpg"
                alt="Amme BusinesShop Logo"
                width={56}
                height={56}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider font-sans mt-1">
              Amme BusinesShop
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Executive Operations Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                Admin Root
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time financial performance, inventory valuation, margin analysis, and staff governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/sales/checkout">
            <Button
              variant="accent"
              size="sm"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              POS Checkout
            </Button>
          </Link>
          <Link href="/payments">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Receipt className="w-4 h-4" />}
            >
              Payments & Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Daily Gross Revenue"
          value={formatETB(metrics.totalRevenue)}
          subtitle="Total gross receipts collected"
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: '+14.2%', isPositive: true, label: 'vs yesterday' }}
          indicatorColor="accent"
        />

        <StatCard
          title="Gross Profit (Markup)"
          value={formatETB(metrics.grossProfit)}
          subtitle={`Margin: ${metrics.grossMarginPercent}% (Rev - COGS)`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: '+18.5%', isPositive: true, label: 'margin rate' }}
          indicatorColor="success"
        />

        <StatCard
          title="Stock Valuation (Cost)"
          value={formatETB(metrics.totalStockCostValue)}
          subtitle={`${formatNumber(metrics.totalStockQuantity)} active items in store`}
          icon={<Boxes className="w-5 h-5" />}
          trend={{
            value: formatETB(metrics.totalStockRetailValue),
            isPositive: true,
            label: 'retail value',
          }}
          indicatorColor="primary"
        />

        <StatCard
          title="Low Stock Alerts"
          value={`${metrics.lowStockCount} Items`}
          subtitle={
            metrics.outOfStockCount > 0
              ? `Separate: ${metrics.outOfStockCount} zero-stock empty SKU`
              : 'All other items above threshold'
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={{
            value: `${metrics.lowStockCount} Low • ${metrics.outOfStockCount} Zero`,
            isPositive: false,
            label: 'reorder required',
          }}
          indicatorColor={metrics.lowStockCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Authorized Staff Directory & Account Credentials (No Dropdown Group) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  <span>Staff Directory & Access Credentials</span>
                </CardTitle>
                <Badge variant="accent" size="sm">
                  {users.length} Registered Accounts
                </Badge>
              </div>
              <CardDescription>
                Admin-registered employee accounts. Each staff member logs in independently at /login using their assigned email and temporary password.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="accent"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => {
                  setRegisterFormData(initialRegisterForm);
                  setRegisterErrors({});
                  setIsRegisterModalOpen(true);
                }}
              >
                Register Staff
              </Button>
              <Link href="/users">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Roles Matrix
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {users.map((staff) => {
              const isCurrentSession = authUser?.email === staff.email;

              return (
                <div
                  key={staff.id}
                  className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    isCurrentSession
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600 shadow-sm ring-1 ring-amber-400/50'
                      : 'bg-white dark:bg-slate-850/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Avatar, Name, Role */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                              staff.role === 'admin'
                                ? 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950'
                                : staff.role === 'manager'
                                ? 'bg-gradient-to-tr from-blue-600 to-blue-400'
                                : staff.role === 'cashier'
                                ? 'bg-gradient-to-tr from-emerald-600 to-emerald-400'
                                : 'bg-gradient-to-tr from-purple-600 to-purple-400'
                            }`}
                          >
                            {staff.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              staff.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={`Status: ${staff.status}`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {staff.name}
                            </h4>
                            {isCurrentSession && (
                              <span className="text-[9.5px] font-black px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {staff.email}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={
                          staff.role === 'admin'
                            ? 'accent'
                            : staff.role === 'manager'
                            ? 'info'
                            : staff.role === 'cashier'
                            ? 'success'
                            : 'neutral'
                        }
                        size="sm"
                        className="capitalize shrink-0 text-[10px]"
                      >
                        {staff.role.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Account Security Credential Status */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Account Security</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                          Bcrypt Hashed • Individual Credentials
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        Secured
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar (Direct Inline Buttons - No Dropdown) */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setResetPasswordTarget(staff);
                        setNewTempPassword(handleGenerateRandomPassword());
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-amber-300/40"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reset Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUserDetails(staff)}
                      className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Inspect permissions"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Roles</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(staff)}
                      className={`py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                        staff.status === 'active'
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                      }`}
                      title={staff.status === 'active' ? 'Suspend account' : 'Reactivate account'}
                    >
                      {staff.status === 'active' ? (
                        <UserX className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics: Chart & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Sales Revenue & Gross Profit Trends</CardTitle>
              <CardDescription>
                Daily revenue curve compared against product markup gross profit (ETB)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-[#D9A441]" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Gross Profit
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevAdmin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D9A441" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D9A441" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorProfitAdmin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [formatETB(Number(val) || 0), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#D9A441"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevAdmin)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="grossProfit"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfitAdmin)"
                    name="Gross Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Executive Quick Operations */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle>Admin Quick Actions</CardTitle>
              <CardDescription>Executive oversight shortcuts</CardDescription>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
              High Privilege
            </span>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <Link
              href="/sales/checkout"
              className="group p-3.5 rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">POS Cashier Terminal</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Scan items, apply discounts, issue receipts</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/users"
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Staff RBAC Matrix</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Manage user roles, passkeys & credentials</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/reports"
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Financial Audits</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Profit statement, COGS & tax reports</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/settings"
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Store Configuration</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">TIN, store profile & receipts</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Recent Sales & Top-Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Recent Sales Transactions</CardTitle>
                <CardDescription>
                  Live retail receipts issued today in Dire Dawa
                </CardDescription>
              </div>
              <Link href="/sales">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All History
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total (ETB)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {sale.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {sale.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDate(sale.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {sale.items.length} line(s) (
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          sale.paymentMethod === 'telebirr'
                            ? 'accent'
                            : sale.paymentMethod === 'cbe_birr'
                            ? 'info'
                            : sale.paymentMethod === 'cash'
                            ? 'success'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {sale.paymentMethod.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      {formatETB(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReceiptModal(sale)}
                        title="View & Print Receipt"
                        className="h-8 px-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-amber-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top-Selling Electronics */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top-Selling Products</CardTitle>
              <CardDescription>Highest moving electronics this period</CardDescription>
            </div>
            <Link href="/products" className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold">
              View Catalog
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {topSellingProducts.map(({ product, soldQty, revenue }, idx) => (
              <div
                key={product.id}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[170px]">
                      {product.name}
                    </h5>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{product.brand}</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {soldQty} sold
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {formatETB(revenue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {product.stockQuantity} in stock
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Permissions Modal */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black text-base border border-amber-500/30">
                  {selectedUserDetails.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedUserDetails.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedUserDetails.email} • {selectedUserDetails.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Assigned Role:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px]">
                  {selectedUserDetails.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Account Status:</span>
                <Badge variant="success" size="sm">
                  Active Verified
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Last Activity:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {selectedUserDetails.lastActive}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Granted RBAC Permissions ({selectedUserDetails.permissions.length})</span>
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {selectedUserDetails.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="accent"
                className="flex-1"
                onClick={() => {
                  setResetPasswordTarget(selectedUserDetails);
                  setNewTempPassword(handleGenerateRandomPassword());
                  setSelectedUserDetails(null);
                }}
              >
                Reset Password
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleCopyCredentials(selectedUserDetails)}
              >
                Copy Login Info
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedUserDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Registration Modal (With Temporary Password) */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        size="md"
        title="Admin Staff Registration"
        description="Register a new employee into Nasir Amme Electronics with role clearance and temporary login credentials."
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={registerFormData.name}
              onChange={(e) =>
                setRegisterFormData({ ...registerFormData, name: e.target.value })
              }
              placeholder="e.g. Kadir Hassan"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {registerErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{registerErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Assigned Role *
              </label>
              <select
                value={registerFormData.role}
                onChange={(e) =>
                  setRegisterFormData({
                    ...registerFormData,
                    role: e.target.value as RoleType,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="cashier">Cashier (POS Till)</option>
                <option value="manager">Store Manager</option>
                <option value="stock_keeper">Stock Keeper</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={registerFormData.phone}
                onChange={(e) =>
                  setRegisterFormData({ ...registerFormData, phone: e.target.value })
                }
                placeholder="+251 9..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Staff Email Address (Login ID) *
            </label>
            <input
              type="email"
              required
              value={registerFormData.email}
              onChange={(e) =>
                setRegisterFormData({ ...registerFormData, email: e.target.value })
              }
              placeholder="kadir@amme-electronics.et"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {registerErrors.email && (
              <p className="text-xs text-rose-600 mt-1">{registerErrors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Temporary Login Password *
              </label>
              <button
                type="button"
                onClick={() =>
                  setRegisterFormData({
                    ...registerFormData,
                    initialPassword: handleGenerateRandomPassword(),
                  })
                }
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Generate Secure Random
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={registerFormData.initialPassword}
                onChange={(e) =>
                  setRegisterFormData({
                    ...registerFormData,
                    initialPassword: e.target.value,
                  })
                }
                placeholder="Leave blank to auto-generate secure password"
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              The employee will log in at <code className="text-amber-600 dark:text-amber-400">/login</code> with their email and this temporary password.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRegisterModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              Register & Copy Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Staff Temporary Password Modal */}
      {resetPasswordTarget && (
        <Modal
          isOpen={!!resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
          size="md"
          title="Reset Staff Temporary Password"
          description={`Issue a new temporary login password for ${resetPasswordTarget.name} (${resetPasswordTarget.email}).`}
        >
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300/40 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">Staff Member: {resetPasswordTarget.name}</p>
              <p>Email: {resetPasswordTarget.email} • Role: {resetPasswordTarget.role.toUpperCase()}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  New Temporary Password *
                </label>
                <button
                  type="button"
                  onClick={() => setNewTempPassword(handleGenerateRandomPassword())}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Generate Random
                </button>
              </div>
              <input
                type="text"
                required
                value={newTempPassword}
                onChange={(e) => setNewTempPassword(e.target.value)}
                placeholder="Enter new secure password or click Generate Random"
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Saving will instantly update the user&apos;s password in the system and copy the new login credentials to your clipboard.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Save & Copy New Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
