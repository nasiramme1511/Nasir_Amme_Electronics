'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Store,
  MapPin,
  Receipt,
  Save,
  Shield,
  Volume2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';

export default function SettingsPage() {
  const { settings, updateSettings, addToast } = useApp();

  const [formData, setFormData] = useState(settings);
  const [activeSection, setActiveSection] = useState<'profile' | 'pos' | 'inventory'>('profile');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    addToast({
      type: 'success',
      title: 'Store Settings Saved',
      message: 'Shop preferences and receipt layout updated successfully.',
    });
  };

  const handleReset = () => {
    setFormData(settings);
    addToast({
      type: 'info',
      title: 'Changes Discarded',
      message: 'Form restored to saved values.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Shop Settings & Profile
            </h1>
            <Badge variant="accent" size="sm">
              Configuration
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Store identity, Dire Dawa location parameters, thermal receipt layout, and POS options.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Discard
          </Button>
          <Button variant="accent" size="sm" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Segmented Section Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSection('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'profile'
              ? 'bg-[#101827] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4 text-[#D9A441]" />
          <span>Store Profile & Location</span>
        </button>

        <button
          onClick={() => setActiveSection('pos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'pos'
              ? 'bg-[#101827] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4 text-[#D9A441]" />
          <span>POS & Thermal Receipt</span>
        </button>

        <button
          onClick={() => setActiveSection('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'inventory'
              ? 'bg-[#101827] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#D9A441]" />
          <span>Inventory Rules & Thresholds</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store Profile & Location */}
        {activeSection === 'profile' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#D9A441]" />
                  <div>
                    <CardTitle>Business Identification</CardTitle>
                    <CardDescription>Legal name, tax identification, and registered retail title</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Store Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Business Registration
                    </label>
                    <input
                      type="text"
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Ethiopian TIN Number
                      </label>
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                        Demo Artifact
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.tinNumber}
                      onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Simulation code only. Not a live tax registration with Ethiopian Ministry of Revenues / ERCA.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City / Region
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D9A441]" />
                  <div>
                    <CardTitle>Physical Address & Contact Numbers</CardTitle>
                    <CardDescription>Directions and direct lines for customers and vendors</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address & Kebele
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Landmark
                    </label>
                    <input
                      type="text"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Telephone (Mobile / Till)
                    </label>
                    <input
                      type="text"
                      value={formData.phonePrimary}
                      onChange={(e) => setFormData({ ...formData, phonePrimary: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 2: POS & Thermal Receipt */}
        {activeSection === 'pos' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#D9A441]" />
                  <div>
                    <CardTitle>Thermal Receipt Text Customization</CardTitle>
                    <CardDescription>
                      Information printed at top and bottom of customer thermal receipts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt Header Announcement
                  </label>
                  <textarea
                    rows={2}
                    value={formData.receiptHeader}
                    onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt Footer & Warranty Terms Notice
                  </label>
                  <textarea
                    rows={3}
                    value={formData.receiptFooter}
                    onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>POS Cashier Preferences</CardTitle>
                <CardDescription>Audio feedback and checkout rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4 text-slate-600" />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        Barcode Scanner Audio Feedback
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Play audible beep when item barcode is successfully captured
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.barcodeSound}
                    onChange={(e) => setFormData({ ...formData, barcodeSound: e.target.checked })}
                    className="rounded border-slate-300 text-[#101827] focus:ring-[#D9A441]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-slate-600" />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        Require Customer Selection on Sale
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Enforce customer association instead of defaulting to generic walk-in
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.requireCustomerOnSale}
                    onChange={(e) =>
                      setFormData({ ...formData, requireCustomerOnSale: e.target.checked })
                    }
                    className="rounded border-slate-300 text-[#101827] focus:ring-[#D9A441]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 3: Inventory Rules */}
        {activeSection === 'inventory' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D9A441]" />
                <div>
                  <CardTitle>Inventory Alerting & Thresholds</CardTitle>
                  <CardDescription>Store-wide inventory rules and SKU generation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Global Default Low Stock Threshold (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.lowStockGlobalThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowStockGlobalThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Default minimum threshold assigned to newly imported electronics accessories.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Currency Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value="ETB (Ethiopian Birr)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
            Save All Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
