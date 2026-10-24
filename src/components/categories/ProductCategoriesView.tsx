"use client";

import React, { useState } from "react";
import {
  FolderTree,
  Plus,
  Zap,
  Cable,
  Headphones,
  BatteryCharging,
  Speaker,
  Shield,
  ArrowUpRight,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  Save,
  AlertCircle
} from "lucide-react";
import { CategorySchema, CategoryInput } from "@/lib/validations/category";

export interface CategoryMaster {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  productCount: number;
  inventoryValuationETB: number;
  posVisible: boolean;
  displayOrder: number;
}

const INITIAL_CATEGORIES_DATA: CategoryMaster[] = [
  {
    id: "cat-01",
    name: "Chargers & Power Adapters",
    slug: "chargers-power",
    description: "Fast wall chargers, GaN desktop chargers, car chargers, and multi-port plugs",
    iconName: "Zap",
    productCount: 4,
    inventoryValuationETB: 70600.0,
    posVisible: true,
    displayOrder: 1,
  },
  {
    id: "cat-02",
    name: "Cables & Interconnects",
    slug: "cables-interconnects",
    description: "Braided Type-C, Lightning, Micro USB, HDMI, and OTG data cables",
    iconName: "Cable",
    productCount: 3,
    inventoryValuationETB: 21510.0,
    posVisible: true,
    displayOrder: 2,
  },
  {
    id: "cat-03",
    name: "Audio & Wireless Earbuds",
    slug: "audio-earbuds",
    description: "TWS earbuds, noise-canceling headphones, and wired earphones",
    iconName: "Headphones",
    productCount: 4,
    inventoryValuationETB: 93350.0,
    posVisible: true,
    displayOrder: 3,
  },
  {
    id: "cat-04",
    name: "Power Banks & Batteries",
    slug: "powerbanks-batteries",
    description: "High-capacity external battery packs, magnetic wireless power banks",
    iconName: "BatteryCharging",
    productCount: 3,
    inventoryValuationETB: 76300.0,
    posVisible: true,
    displayOrder: 4,
  },
  {
    id: "cat-05",
    name: "Bluetooth Speakers",
    slug: "bluetooth-speakers",
    description: "Portable waterproof speakers, desktop sound systems, and party soundboxes",
    iconName: "Speaker",
    productCount: 2,
    inventoryValuationETB: 67200.0,
    posVisible: true,
    displayOrder: 5,
  },
  {
    id: "cat-06",
    name: "Screen Protectors & Cases",
    slug: "protection-cases",
    description: "9H tempered glass, privacy screens, shockproof bumpers, and silicone cases",
    iconName: "Shield",
    productCount: 4,
    inventoryValuationETB: 24620.0,
    posVisible: true,
    displayOrder: 6,
  },
];

const AVAILABLE_ICONS = [
  { name: "FolderTree", label: "General Folder", icon: FolderTree },
  { name: "Zap", label: "Chargers & Power", icon: Zap },
  { name: "Cable", label: "Cables & Adapters", icon: Cable },
  { name: "Headphones", label: "Audio & Earbuds", icon: Headphones },
  { name: "BatteryCharging", label: "Power Banks", icon: BatteryCharging },
  { name: "Speaker", label: "Bluetooth Speakers", icon: Speaker },
  { name: "Shield", label: "Protection & Cases", icon: Shield },
];

export default function ProductCategoriesView() {
  const [categories, setCategories] = useState<CategoryMaster[]>(INITIAL_CATEGORIES_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryMaster | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("FolderTree");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [posVisible, setPosVisible] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Derived financial metrics
  const totalValuation = categories.reduce((sum, c) => sum + c.inventoryValuationETB, 0);
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case "Zap":
        return <Zap className="w-5 h-5 text-amber-400" />;
      case "Cable":
        return <Cable className="w-5 h-5 text-blue-400" />;
      case "Headphones":
        return <Headphones className="w-5 h-5 text-purple-400" />;
      case "BatteryCharging":
        return <BatteryCharging className="w-5 h-5 text-emerald-400" />;
      case "Speaker":
        return <Speaker className="w-5 h-5 text-rose-400" />;
      case "Shield":
        return <Shield className="w-5 h-5 text-cyan-400" />;
      default:
        return <FolderTree className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleOpenModal = (cat?: CategoryMaster) => {
    setFormErrors({});
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setSlug(cat.slug);
      setDescription(cat.description);
      setIconName(cat.iconName || "FolderTree");
      setDisplayOrder(cat.displayOrder ?? 0);
      setPosVisible(cat.posVisible);
    } else {
      setEditingCategory(null);
      setName("");
      setSlug("");
      setDescription("");
      setIconName("FolderTree");
      setDisplayOrder(categories.length + 1);
      setPosVisible(true);
    }
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  };

  const handleTogglePosVisibility = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, posVisible: !c.posVisible } : c))
    );
  };

  const handleDeleteCategory = (id: string, catName: string) => {
    if (window.confirm(`Are you sure you want to remove the category "${catName}"?`)) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CategoryInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      iconName,
      posVisible,
      displayOrder: Number(displayOrder) || 0,
    };

    const parseResult = CategorySchema.safeParse(payload);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((err) => {
        const fieldName = err.path[0]?.toString() || "form";
        fieldErrors[fieldName] = err.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    const validated = parseResult.data;

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                name: validated.name,
                slug: validated.slug,
                description: validated.description || "",
                iconName: validated.iconName,
                posVisible: validated.posVisible,
                displayOrder: validated.displayOrder,
              }
            : c
        )
      );
    } else {
      const newCategory: CategoryMaster = {
        id: `cat-${Date.now()}`,
        name: validated.name,
        slug: validated.slug,
        description: validated.description || "",
        iconName: validated.iconName,
        productCount: 0,
        inventoryValuationETB: 0,
        posVisible: validated.posVisible,
        displayOrder: validated.displayOrder,
      };
      setCategories((prev) => [...prev, newCategory]);
    }

    setIsModalOpen(false);
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Product Categories & Taxonomy
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize catalog hierarchy, manage POS quick-filter groupings, and monitor category valuations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Category
        </button>
      </div>

      {/* Aggregate Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400">Total Catalog Groups</div>
          <div className="mt-1 text-2xl font-bold font-mono text-white">{categories.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Mapped to POS Quick Navigation</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400">Active SKUs Classified</div>
          <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">{totalProducts} SKUs</div>
          <div className="mt-1 text-[11px] text-slate-500">Across {categories.length} departments</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400">Cumulative Stock Valuation</div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
            {totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
            <span className="text-xs font-sans text-slate-400">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Wholesale cost basis evaluation</div>
        </div>
      </div>

      {/* Filter and Quick Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search categories or slugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs font-mono text-slate-400">
          Showing {filteredCategories.length} Categories
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-5 flex flex-col justify-between transition-colors shadow-sm"
          >
            <div>
              {/* Card Header: Icon, Slug, Visibility */}
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  {getCategoryIcon(cat.iconName)}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePosVisibility(cat.id)}
                    title={cat.posVisible ? "Visible on POS register" : "Hidden from POS register"}
                    className={`p-1.5 rounded transition-colors cursor-pointer ${
                      cat.posVisible
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : "text-slate-500 hover:bg-slate-800"
                    }`}
                  >
                    {cat.posVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(cat)}
                    className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-white tracking-tight">{cat.name}</h3>
                <span className="font-mono text-[10px] text-indigo-400">/{cat.slug}</span>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {cat.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Metrics & Footer */}
            <div className="mt-5 pt-3 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Products</span>
                  <span className="font-bold text-slate-200">{cat.productCount} SKUs</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Inventory Asset</span>
                  <span className="font-bold text-emerald-400">
                    {cat.inventoryValuationETB.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-800/50">
                <span className="text-[10px] text-slate-500 font-mono">
                  Order Index: #{cat.displayOrder}
                </span>
                <a
                  href={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 group"
                >
                  View Catalog
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
              <h2 className="text-sm font-semibold text-white">
                {editingCategory ? "Edit Category Parameters" : "Create New Product Category"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Category Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Wireless Chargers & Docks"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 ${
                    formErrors.name
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-800 focus:ring-indigo-500"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">URL & POS Filter Slug *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2 font-mono text-slate-100 focus:outline-none focus:ring-1 ${
                    formErrors.slug
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-800 focus:ring-indigo-500"
                  }`}
                />
                {formErrors.slug && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.slug}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300">Category Icon</label>
                  <select
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {AVAILABLE_ICONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Operational Description</label>
                <textarea
                  rows={2}
                  placeholder="Summarize product types included for cashier reference..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-100 focus:outline-none focus:ring-1 resize-none ${
                    formErrors.description
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-800 focus:ring-indigo-500"
                  }`}
                />
                {formErrors.description && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="posVisibility"
                  checked={posVisible}
                  onChange={(e) => setPosVisible(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="posVisibility" className="text-slate-300 cursor-pointer">
                  Enable category filter chip on POS Cashier Terminal
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
