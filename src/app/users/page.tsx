'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { UserAccount, RoleType } from '@/types';
import {
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Mail,
  Phone,
  Clock,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface UserFormData {
  name: string;
  role: RoleType;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  lastActive: string;
  permissions: string[];
}

export default function UsersPage() {
  const { users, addUser, updateUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const initialForm: UserFormData = {
    name: '',
    role: 'cashier',
    email: '',
    phone: '',
    status: 'active',
    lastActive: 'Just now',
    permissions: ['create_sales', 'view_products'],
  };
  const [formData, setFormData] = useState<UserFormData>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Roles Definition Matrix
  const rolesPermissionsMatrix = [
    { permission: 'POS Sales & Cashier Checkout', admin: true, manager: true, cashier: true, stock_keeper: false },
    { permission: 'Reprint Thermal Receipts', admin: true, manager: true, cashier: true, stock_keeper: false },
    { permission: 'Process Customer Returns & Refunds', admin: true, manager: true, cashier: true, stock_keeper: false },
    { permission: 'Add & Edit Product Catalog', admin: true, manager: true, cashier: false, stock_keeper: false },
    { permission: 'Receive Supplier Goods into Stock', admin: true, manager: true, cashier: false, stock_keeper: true },
    { permission: 'Conduct Physical Stock Counts & Audits', admin: true, manager: true, cashier: false, stock_keeper: true },
    { permission: 'View Profit Margins & Sales Analytics', admin: true, manager: true, cashier: false, stock_keeper: false },
    { permission: 'Modify Shop Settings & Address', admin: true, manager: false, cashier: false, stock_keeper: false },
    { permission: 'Manage Staff Accounts & Credentials', admin: true, manager: false, cashier: false, stock_keeper: false },
  ];

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData(initialForm);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastActive: user.lastActive,
      permissions: user.permissions,
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.email.trim()) errors.email = 'Email is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser(formData);
    }

    setIsAddEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Users & Access Roles
            </h1>
            <Badge variant="accent" size="sm">
              {users.length} Staff Members
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Store access permissions, cashier logins, and operational privileges for Nasir Amme Electronics.
          </p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">Dire Dawa Branch Staff Directory</span>
        </div>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#101827] text-[#D9A441] font-bold text-sm flex items-center justify-center shadow-xs">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      user.role === 'admin'
                        ? 'accent'
                        : user.role === 'manager'
                        ? 'info'
                        : user.role === 'cashier'
                        ? 'success'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {user.role.toUpperCase()}
                  </Badge>

                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit User"
                    aria-label={`Edit ${user.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">{user.name}</h3>
              <div className="space-y-1.5 mt-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Active {user.lastActive}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Staff
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#D9A441]" />
            <div>
              <CardTitle>Role Permissions Matrix</CardTitle>
              <CardDescription>
                Preset authorization boundaries across POS checkout, inventory, and management
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">System Capability</th>
                <th className="py-3 px-4 text-center">Admin (Owner)</th>
                <th className="py-3 px-4 text-center">Store Manager</th>
                <th className="py-3 px-4 text-center">Cashier</th>
                <th className="py-3 px-4 text-center">Stock Keeper</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rolesPermissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-medium text-slate-900">{row.permission}</td>
                  <td className="py-3 px-4 text-center">
                    {row.admin ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.manager ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.cashier ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.stock_keeper ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        size="md"
        title={editingUser ? 'Edit Staff Account' : 'Register New Staff Member'}
        description="Assign operational role and contact information for Nasir Amme Electronics team."
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Yonas Bekele"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as RoleType })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Store Manager</option>
                <option value="stock_keeper">Stock Keeper</option>
                <option value="admin">Administrator / Owner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 9..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {formErrors.phone && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.phone}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Staff Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="staff@amme-electronics.et"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {formErrors.email && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.email}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingUser ? 'Save Account' : 'Register Staff'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
