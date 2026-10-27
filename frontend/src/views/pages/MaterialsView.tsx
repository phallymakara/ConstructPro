import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  QrCode as QrIcon,
  SlidersHorizontal,
  FolderTree,
  MoreHorizontal,
  Package,
  Layers,
  MapPin,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Droplet,
  Upload,
} from 'lucide-react';
import { useMaterialsController } from '../../controllers/useMaterialsController';
import { Modal } from '../components/Modal';
import { BarcodeMovementModal } from '../components/BarcodeMovementModal';
import { BarcodeLabelModal } from '../components/BarcodeLabelModal';
import { CategoryManageModal } from '../components/CategoryManageModal';
import { StockOutModal } from '../components/StockOutModal';
import type { Material, MaterialFormData } from '../../models/types';

export const MaterialsView: React.FC = () => {
  const {
    materials,
    allMaterials,
    categories,
    categoryFilter,
    productTypeFilter,
    existingCategories,
    existingProductTypes,
    searchQuery,
    showLowStockOnly,
    isLoading,
    actionLoading,
    errorMessage,
    isCategoryModalOpen,
    isCreateModalOpen,
    editingMaterial,
    isStockAdjustmentModalOpen,
    selectedMaterialForAdjust,
    isBarcodeMovementModalOpen,
    isStockOutModalOpen,
    selectedMaterialForBarcodeLabel,
    projects,
    setCategoryFilter,
    setProductTypeFilter,
    setSearchQuery,
    setShowLowStockOnly,
    setIsCategoryModalOpen,
    setIsCreateModalOpen,
    setEditingMaterial,
    setIsStockAdjustmentModalOpen,
    setSelectedMaterialForAdjust,
    setIsBarcodeMovementModalOpen,
    setIsStockOutModalOpen,
    setSelectedMaterialForBarcodeLabel,
    createCategory,
    updateCategory,
    deleteCategory,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    adjustStock,
    recordStockMovement,
    batchStockMovement,
    findMaterialByBarcode,
  } = useMaterialsController();



  // Active three-dot action dropdown ID
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // View mode: card vs table
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    try {
      return (localStorage.getItem('materials_view_mode') as 'card' | 'table') || 'card';
    } catch {
      return 'card';
    }
  });

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('materials_view_mode', mode);
    } catch {}
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Summary operational metrics
  const lowStockCount = useMemo(() => {
    return allMaterials.filter(m => (m.current_stock || 0) <= (m.minimum_stock || 0)).length;
  }, [allMaterials]);

  // Direct stockout from mobile camera URL parameter (?picklist=... or ?stockout=...)
  const [urlStockoutMaterial, setUrlStockoutMaterial] = useState<Material | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetCode =
      params.get('picklist') ||
      params.get('stockout') ||
      params.get('scan') ||
      params.get('code');
    if (targetCode && materials.length > 0) {
      const trimmed = targetCode.trim().toLowerCase();
      const matched = materials.find(
        m =>
          (m.barcode && m.barcode.toLowerCase() === trimmed) ||
          m.code.toLowerCase() === trimmed
      );
      if (matched) {
        setUrlStockoutMaterial(matched);
        setIsStockOutModalOpen(true);
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {}
      }
    }
  }, [materials, setIsStockOutModalOpen]);

  // New / Edit Product Form State
  const [formData, setFormData] = useState<MaterialFormData>({
    code: '',
    name: '',
    barcode: '',
    category: 'ដែក',
    product_type: 'Standard',
    unit: 'm',
    unit_cost: 0,
    current_stock: 0,
    minimum_stock: 0,
    storage_location: '',
    notes: '',
    image_url: '',
  });

  // Structured warehouse location state (Row, Bay, Level)
  const [warehouseLoc, setWarehouseLoc] = useState({
    row: '',
    bay: '',
    level: '',
  });

  const handleWarehouseLocChange = (field: 'row' | 'bay' | 'level', val: string) => {
    const updated = { ...warehouseLoc, [field]: val };
    setWarehouseLoc(updated);
    const r = updated.row.trim().toLowerCase().replace(/^r/i, '');
    const b = updated.bay.trim().toLowerCase().replace(/^b/i, '');
    const l = updated.level.trim().toLowerCase().replace(/^l/i, '');
    const parts: string[] = [];
    if (r) parts.push(`r${r}`);
    if (b) parts.push(`b${b}`);
    if (l) parts.push(`l${l}`);
    setFormData(prev => ({
      ...prev,
      storage_location: parts.join('-'),
    }));
  };

  // Quick Manual Adjust Form State
  const [adjustData, setAdjustData] = useState<{
    movementType: string;
    quantity: number;
    projectId: number | '';
    notes: string;
  }>({
    movementType: 'Stock In',
    quantity: 1,
    projectId: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});


  const generateItemCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `WH-${randomSuffix}`;
  };

  const generateBarcode = (codeVal?: string) => {
    const cleanCode = (codeVal || 'WH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const rnd = Math.floor(100 + Math.random() * 900);
    return `BAR-${cleanCode}-${rnd}`;
  };

  const handleOpenCreateModal = (defaultCategory?: string) => {
    setFormErrors({});
    const initialCategory = defaultCategory || '';
    const autoCode = generateItemCode();
    const autoBarcode = generateBarcode(autoCode);

    setWarehouseLoc({ row: '', bay: '', level: '' });
    setFormData({
      code: autoCode,
      name: '',
      barcode: autoBarcode,
      category: initialCategory,
      product_type: '',
      unit: 'm',
      unit_cost: '' as any,
      current_stock: '' as any,
      minimum_stock: '' as any,
      storage_location: '',
      notes: '',
      image_url: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (mat: Material) => {
    setFormErrors({});
    const parsedLoc = parseWarehouseLocation(mat.storage_location);
    setWarehouseLoc({
      row: parsedLoc.row,
      bay: parsedLoc.bay,
      level: parsedLoc.level,
    });
    setFormData({
      code: mat.code,
      name: mat.name,
      barcode: mat.barcode || mat.code,
      category: mat.category,
      product_type: mat.product_type || 'Standard',
      unit: mat.unit,
      unit_cost: mat.unit_cost,
      current_stock: mat.current_stock,
      minimum_stock: mat.minimum_stock,
      storage_location: mat.storage_location || '',
      notes: mat.notes || '',
      image_url: mat.image_url || '',
    });
    setEditingMaterial(mat);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Product code is required';
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.category.trim()) errors.category = 'Category is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, formData);
    } else {
      await createMaterial(formData);
    }
  };

  const handleOpenQuickAdjust = (mat: Material) => {
    setSelectedMaterialForAdjust(mat);
    setAdjustData({
      movementType: 'Stock In',
      quantity: 1,
      projectId: '',
      notes: '',
    });
    setIsStockAdjustmentModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustData.quantity <= 0) {
      setFormErrors({ quantity: 'Quantity must be greater than 0' });
      return;
    }
    setFormErrors({});
    const proj = projects.find(p => p.id === adjustData.projectId);
    const noteText = proj ? `Project: ${proj.project_number ? `[${proj.project_number}] ` : ''}${proj.project_name}` : adjustData.notes || `Stock ${adjustData.movementType}`;
    await adjustStock(
      adjustData.movementType,
      adjustData.quantity,
      noteText,
      adjustData.projectId ? Number(adjustData.projectId) : undefined
    );
  };

  const parseWarehouseLocation = (locStr?: string) => {
    if (!locStr || !locStr.trim()) {
      return { row: '', bay: '', level: '', code: '' };
    }
    const text = locStr.trim().toLowerCase();

    // Match r01-b01-l01 or r01_b01_l01
    const rblMatch = text.match(/r([a-z0-9]+)[-_]b([a-z0-9]+)[-_]l([a-z0-9]+)/i);
    if (rblMatch) {
      return {
        row: rblMatch[1],
        bay: rblMatch[2],
        level: rblMatch[3],
        code: `r${rblMatch[1]}-b${rblMatch[2]}-l${rblMatch[3]}`,
      };
    }

    // Match verbose text: Row 01, Bay 01, Level 01 or Row A-01, Bay 01, Level 02
    const rowMatch = text.match(/(?:row|r)\s*[:#-]?\s*([a-z0-9]+)/i);
    const bayMatch = text.match(/(?:bay|b|rack)\s*[:#-]?\s*([a-z0-9]+)/i);
    const levelMatch = text.match(/(?:level|lvl|l)\s*[:#-]?\s*([a-z0-9]+)/i);

    if (rowMatch || bayMatch || levelMatch) {
      const r = rowMatch ? rowMatch[1] : '';
      const b = bayMatch ? bayMatch[1] : '';
      const l = levelMatch ? levelMatch[1] : '';
      const parts: string[] = [];
      if (r) parts.push(`r${r}`);
      if (b) parts.push(`b${b}`);
      if (l) parts.push(`l${l}`);
      return {
        row: r,
        bay: b,
        level: l,
        code: parts.join('-'),
      };
    }

    return { row: '', bay: '', level: '', code: text };
  };

  const renderMaterialRow = (item: Material, showCategory: boolean = true) => {
    const isLow = (item.current_stock || 0) <= (item.minimum_stock || 0);
    const parsedLoc = parseWarehouseLocation(item.storage_location);
    const bufferMax = Math.max((item.minimum_stock || 1) * 2, item.current_stock || 1);
    const bufferPct = Math.min(100, Math.round(((item.current_stock || 0) / bufferMax) * 100));

    return (
      <tr key={item.id}>
        {/* Product Image Thumbnail */}
        <td style={{ width: '56px', padding: '6px 8px', textAlign: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '6px',
              backgroundColor: 'var(--erp-surface-subtle, #f8fafc)',
              border: '1px solid var(--erp-border)',
              overflow: 'hidden',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.erp-row-img-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div
              className="erp-row-img-fallback"
              style={{
                width: '100%',
                height: '100%',
                display: item.image_url ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-text-muted)',
              }}
            >
              <Package size={18} strokeWidth={1.5} />
            </div>
          </div>
        </td>

        {/* Material Name */}
        <td>
          <span style={{ color: 'var(--erp-text-main)', fontSize: '14px', fontWeight: 400 }}>
            {item.name}
          </span>
        </td>

        {/* Code */}
        <td style={{ width: '130px', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: 'var(--erp-mono-font, monospace)', fontSize: '12.5px', color: 'var(--erp-text-muted)' }}>
            {item.code}
          </span>
        </td>

        {/* Category & Product Type */}
        {showCategory && (
          <td style={{ width: '150px', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', color: 'var(--erp-text-main)' }}>
                {item.category}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                {item.product_type || 'Standard'}
              </span>
            </div>
          </td>
        )}

        {/* Storage Location */}
        <td style={{ width: '130px', whiteSpace: 'nowrap' }}>
          {parsedLoc.code ? (
            <span style={{ fontSize: '13.5px', color: 'var(--erp-text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} color="var(--erp-text-muted)" />
              <span>{parsedLoc.code}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--erp-text-light)', fontSize: '13px' }}>—</span>
          )}
        </td>

        {/* Stock Level & Buffer Depletion */}
        <td style={{ width: '180px', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span
                style={{
                  fontSize: '14.5px',
                  fontWeight: 500,
                  color: isLow ? 'var(--erp-text-error)' : 'var(--erp-text-main)',
                }}
              >
                {item.current_stock.toLocaleString()} {item.unit}
              </span>
              <span style={{ fontSize: '11.5px', color: isLow ? 'var(--erp-text-error)' : 'var(--erp-text-muted)' }}>
                {isLow ? `Low (min ${item.minimum_stock})` : `Min: ${item.minimum_stock}`}
              </span>
            </div>
            {/* Visual Buffer Bar */}
            <div
              style={{
                width: '100%',
                height: '3px',
                backgroundColor: 'var(--erp-border)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${bufferPct}%`,
                  height: '100%',
                  backgroundColor: isLow ? '#ef4444' : '#10b981',
                  borderRadius: '2px',
                }}
              />
            </div>
          </div>
        </td>

        {/* Unit Cost */}
        <td style={{ width: '110px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '14.5px', color: 'var(--erp-text-main)' }}>
            ${(item.unit_cost || 0).toFixed(2)}
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', marginLeft: '3px' }}>
            /{item.unit}
          </span>
        </td>

        {/* Action (Three-Dot Dropdown) */}
        <td style={{ width: '80px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div className="erp-dropdown-container">
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={e => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === item.id ? null : item.id);
              }}
              title="Actions"
              aria-label="Actions"
            >
              <MoreHorizontal size={15} />
            </button>

            {openMenuId === item.id && (
              <div className="erp-dropdown-menu" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="erp-dropdown-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    handleOpenQuickAdjust(item);
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>Stock In / Out</span>
                </button>
                <button
                  type="button"
                  className="erp-dropdown-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    setSelectedMaterialForBarcodeLabel(item);
                  }}
                >
                  <QrIcon size={13} />
                  <span>Print Barcode Label</span>
                </button>
                <button
                  type="button"
                  className="erp-dropdown-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    handleOpenEditModal(item);
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit Product</span>
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--erp-border)', margin: '4px 0' }} />
                <button
                  type="button"
                  className="erp-dropdown-item"
                  style={{ color: 'var(--erp-text-error)' }}
                  onClick={() => {
                    setOpenMenuId(null);
                    if (window.confirm(`Delete product "${item.name}"?`)) {
                      deleteMaterial(item.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Product</span>
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderMaterialCard = (item: Material) => {
    const isLow = (item.current_stock || 0) <= (item.minimum_stock || 0);
    const parsedLoc = parseWarehouseLocation(item.storage_location);
    const bufferMax = Math.max((item.minimum_stock || 1) * 2, item.current_stock || 1);
    const bufferPct = Math.min(100, Math.round(((item.current_stock || 0) / bufferMax) * 100));

    return (
      <div
        key={item.id}
        className="erp-kpi-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--erp-radius-card, 8px)',
          border: '1px solid var(--erp-border)',
          backgroundColor: 'var(--erp-surface)',
          padding: 0,
          gap: 0,
          boxShadow: 'none',
          position: 'relative',
          minHeight: '230px',
          justifyContent: 'space-between',
          zIndex: openMenuId === item.id ? 25 : 1,
        }}
      >
        {/* 1. Image Container */}
        <div
          style={{
            width: '100%',
            height: '125px',
            backgroundColor: 'var(--erp-surface-subtle, #f8fafc)',
            position: 'relative',
            borderBottom: '1px solid var(--erp-border)',
            overflow: 'hidden',
            borderTopLeftRadius: 'calc(var(--erp-radius-card, 8px) - 1px)',
            borderTopRightRadius: 'calc(var(--erp-radius-card, 8px) - 1px)',
          }}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                (e.currentTarget as HTMLElement).style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.erp-img-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }
              }}
            />
          ) : null}

          {/* Fallback Graphic (shown if no image_url or on error) */}
          <div
            className="erp-img-fallback"
            style={{
              width: '100%',
              height: '100%',
              display: item.image_url ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              background: (item.category || '').includes('កញ្ចក់') || (item.category || '').toLowerCase().includes('glass')
                ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #f0f9ff 100%)'
                : (item.category || '').includes('កាវ') || (item.category || '').toLowerCase().includes('seal')
                ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fef9c3 100%)'
                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
                color: (item.category || '').includes('កញ្ចក់') || (item.category || '').toLowerCase().includes('glass')
                  ? '#0369a1'
                  : (item.category || '').includes('កាវ') || (item.category || '').toLowerCase().includes('seal')
                  ? '#b45309'
                  : '#475569',
              }}
            >
              {(item.category || '').includes('កញ្ចក់') || (item.category || '').toLowerCase().includes('glass') ? (
                <Layers size={26} strokeWidth={1.5} />
              ) : (item.category || '').includes('កាវ') || (item.category || '').toLowerCase().includes('seal') ? (
                <Droplet size={26} strokeWidth={1.5} />
              ) : (
                <Package size={26} strokeWidth={1.5} />
              )}
              <span style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                {item.product_type || item.category || 'Warehouse Item'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Card Content Body */}
        <div style={{ padding: '8px 11px', display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' }}>
          {/* Name & Code */}
          <div>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 400,
                color: 'var(--erp-text-main)',
                lineHeight: 1.25,
                marginBottom: '1px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}
              title={item.name}
            >
              {item.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--erp-mono-font, monospace)',
                fontSize: '12px',
                color: 'var(--erp-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={item.code}
            >
              {item.code}
            </div>
          </div>

          {/* Location */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--erp-text-muted)',
              overflow: 'hidden',
            }}
          >
            <MapPin size={13} color="var(--erp-text-muted)" style={{ flexShrink: 0 }} />
            <span
              style={{
                color: parsedLoc.code ? 'var(--erp-text-main)' : 'var(--erp-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={parsedLoc.code ? `Warehouse location: ${parsedLoc.code}` : 'No storage location set'}
            >
              {parsedLoc.code ? parsedLoc.code : 'No location'}
            </span>
          </div>

          {/* Stock & Buffer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: isLow ? 'var(--erp-text-error)' : 'var(--erp-text-main)' }}>
                {item.current_stock.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400 }}>{item.unit}</span>
              </span>
              <span style={{ fontSize: '11.5px', color: isLow ? 'var(--erp-text-error)' : 'var(--erp-text-muted)' }}>
                {isLow ? `Low (min ${item.minimum_stock})` : `Min: ${item.minimum_stock}`}
              </span>
            </div>

            {/* Visual Buffer Bar */}
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'var(--erp-border)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${bufferPct}%`,
                  height: '100%',
                  backgroundColor: isLow ? '#ef4444' : '#10b981',
                  borderRadius: '2px',
                }}
              />
            </div>
          </div>

          {/* Price & Action Button Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '5px',
              borderTop: '1px solid var(--erp-border)',
              marginTop: 'auto',
            }}
          >
            <div>
              <span style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                ${(item.unit_cost || 0).toFixed(2)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginLeft: '2px' }}>
                /{item.unit}
              </span>
            </div>

            {/* Action Dropdown */}
            <div className="erp-dropdown-container">
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-sm"
                style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={e => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === item.id ? null : item.id);
                }}
                title="Actions"
                aria-label="Actions"
              >
                <MoreHorizontal size={15} />
              </button>

              {openMenuId === item.id && (
                <div
                  className="erp-dropdown-menu"
                  style={{ right: 0, bottom: '100%', top: 'auto', marginBottom: '4px' }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="erp-dropdown-item"
                    onClick={() => {
                      setOpenMenuId(null);
                      handleOpenQuickAdjust(item);
                    }}
                  >
                    <SlidersHorizontal size={13} />
                    <span>Stock In / Out</span>
                  </button>
                  <button
                    type="button"
                    className="erp-dropdown-item"
                    onClick={() => {
                      setOpenMenuId(null);
                      setSelectedMaterialForBarcodeLabel(item);
                    }}
                  >
                    <QrIcon size={13} />
                    <span>Print Barcode Label</span>
                  </button>
                  <button
                    type="button"
                    className="erp-dropdown-item"
                    onClick={() => {
                      setOpenMenuId(null);
                      handleOpenEditModal(item);
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Edit Product</span>
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--erp-border)', margin: '4px 0' }} />
                  <button
                    type="button"
                    className="erp-dropdown-item"
                    style={{ color: 'var(--erp-text-error)' }}
                    onClick={() => {
                      setOpenMenuId(null);
                      if (window.confirm(`Delete product "${item.name}"?`)) {
                        deleteMaterial(item.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Product</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="erp-content" style={{ animation: 'erpFadeIn 0.2s ease-out', gap: '6px', padding: '6px 10px' }}>
      {/* Top Action Bar */}
      <div
        className="erp-action-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '8px',
          padding: '6px 10px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {/* Search Box */}
          <div className="erp-input-group" style={{ width: '350px', flexShrink: 0 }}>
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search materials..."
              className="erp-input erp-input-with-icon"
              style={{ width: '100%', height: '35px', fontSize: '13.5px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="erp-select"
            style={{ width: '160px', flexShrink: 0, height: '35px', fontSize: '13px', padding: '0 10px' }}
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setProductTypeFilter('All');
            }}
          >
            <option value="All">All Categories</option>
            {existingCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Product Type Filter */}
          <select
            className="erp-select"
            style={{ width: '150px', flexShrink: 0, height: '35px', fontSize: '13px', padding: '0 10px' }}
            value={productTypeFilter}
            onChange={e => setProductTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            {existingProductTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Stock Level / Low Stock Filter */}
          <select
            className="erp-select"
            style={{ width: '145px', flexShrink: 0, height: '35px', fontSize: '13px', padding: '0 10px' }}
            value={showLowStockOnly ? 'low_stock' : 'all'}
            onChange={e => setShowLowStockOnly(e.target.value === 'low_stock')}
          >
            <option value="all">All Stock</option>
            <option value="low_stock">Low Stock ({lowStockCount})</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'inline-flex', borderRadius: '4px', border: '1px solid var(--erp-border)', overflow: 'hidden' }}>
            <button
              type="button"
              style={{
                height: '35px',
                padding: '0 11px',
                border: 'none',
                backgroundColor: viewMode === 'card' ? 'var(--erp-primary)' : 'var(--erp-surface)',
                color: viewMode === 'card' ? '#ffffff' : 'var(--erp-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12.5px',
                fontWeight: viewMode === 'card' ? 600 : 400,
              }}
              onClick={() => handleViewModeChange('card')}
              title="Card View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              style={{
                height: '35px',
                padding: '0 11px',
                border: 'none',
                borderLeft: '1px solid var(--erp-border)',
                backgroundColor: viewMode === 'table' ? 'var(--erp-primary)' : 'var(--erp-surface)',
                color: viewMode === 'table' ? '#ffffff' : 'var(--erp-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12.5px',
                fontWeight: viewMode === 'table' ? 600 : 400,
              }}
              onClick={() => handleViewModeChange('table')}
              title="Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>

          {/* Categories Button */}
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => setIsCategoryModalOpen(true)}
            style={{ height: '35px', padding: '0 11px', gap: '5px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
            title="Manage Categories"
          >
            <FolderTree size={14} />
            <span>Categories</span>
          </button>

          {/* Add Product Button */}
          <button
            type="button"
            className="erp-btn erp-btn-primary"
            onClick={() => handleOpenCreateModal()}
            style={{ height: '35px', padding: '0 12px', gap: '5px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
            title="Add Product"
          >
            <Plus size={14} />
            <span>Product</span>
          </button>
        </div>
      </div>

      {/* Clean Uncontained Error Message */}
      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px', padding: '0 4px', marginBottom: '4px' }}>
          {errorMessage}
        </div>
      )}

      {/* Main View Area */}
      {isLoading ? (
        <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
          Loading warehouse catalog...
        </div>
      ) : materials.length === 0 ? (
        <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
          <div>No warehouse products found matching your search.</div>
          {showLowStockOnly && (
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              style={{ marginTop: '10px' }}
              onClick={() => setShowLowStockOnly(false)}
            >
              Clear Low Stock Filter
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        /* Card View with Dedicated Native Scroll Container */
        <div
          className="erp-materials-cards-container"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '6px',
            paddingBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))',
              gap: '10px',
              paddingTop: '2px',
              paddingBottom: '12px',
            }}
          >
            {materials.map(item => renderMaterialCard(item))}
          </div>
        </div>
      ) : (
        /* Unified Table Container with Native Vertical & Horizontal Scroll and Sticky Header */
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: '56px', textAlign: 'center', fontWeight: 400 }}>Image</th>
                <th style={{ fontWeight: 400 }}>Material</th>
                <th style={{ width: '130px', fontWeight: 400 }}>Code</th>
                <th style={{ width: '150px', fontWeight: 400 }}>Category & Type</th>
                <th style={{ width: '130px', fontWeight: 400 }}>Location</th>
                <th style={{ width: '180px', fontWeight: 400 }}>Stock & Buffer</th>
                <th style={{ width: '110px', textAlign: 'right', fontWeight: 400 }}>Price</th>
                <th style={{ width: '80px', textAlign: 'right', fontWeight: 400 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(item => renderMaterialRow(item, true))}
            </tbody>
          </table>
        </div>
      )}

      {/* Barcode Movement Scanner Modal */}
      <BarcodeMovementModal
        isOpen={isBarcodeMovementModalOpen}
        onClose={() => {
          setIsBarcodeMovementModalOpen(false);
          setUrlStockoutMaterial(null);
        }}
        findMaterialByBarcode={findMaterialByBarcode}
        recordStockMovement={recordStockMovement}
        actionLoading={actionLoading}
        initialMaterial={urlStockoutMaterial}
        initialMode="Stock Out"
      />

      {/* Take Materials Batch Picklist Modal */}
      <StockOutModal
        isOpen={isStockOutModalOpen}
        onClose={() => {
          setIsStockOutModalOpen(false);
          setUrlStockoutMaterial(null);
        }}
        materials={materials}
        projects={projects}
        onBatchStockMovement={batchStockMovement}
        actionLoading={actionLoading}
        initialScannedItem={urlStockoutMaterial}
      />

      {/* Barcode / QR Label Modal */}
      <BarcodeLabelModal
        material={selectedMaterialForBarcodeLabel}
        onClose={() => setSelectedMaterialForBarcodeLabel(null)}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isCreateModalOpen || !!editingMaterial}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMaterial(null);
        }}
        title={editingMaterial ? `Edit Product: ${editingMaterial.name}` : 'Add Product'}
        maxWidth="620px"
      >
        <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="erp-modal-body" style={{ maxHeight: 'calc(88vh - 120px)', overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Item Code *</label>
                <input
                  type="text"
                  placeholder="Item Code"
                  className={`erp-input ${formErrors.code ? 'erp-input-error' : ''}`}
                  value={formData.code}
                  onChange={e => {
                    setFormData({ ...formData, code: e.target.value });
                    if (formErrors.code) setFormErrors({ ...formErrors, code: '' });
                  }}
                />
                {formErrors.code && (
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                    {formErrors.code}
                  </span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Barcode</label>
                <input
                  type="text"
                  placeholder="Barcode"
                  className="erp-input"
                  value={formData.barcode || ''}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Product Name *</label>
              <input
                type="text"
                placeholder="Product Name"
                className={`erp-input ${formErrors.name ? 'erp-input-error' : ''}`}
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
              />
              {formErrors.name && (
                <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                  {formErrors.name}
                </span>
              )}
            </div>

            {/* Category & Product Type with Custom On-the-Fly support */}
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Category *</label>
                <input
                  type="text"
                  list="inventory-categories-list"
                  placeholder="Category"
                  className={`erp-input ${formErrors.category ? 'erp-input-error' : ''}`}
                  value={formData.category}
                  onChange={e => {
                    setFormData({ ...formData, category: e.target.value });
                    if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                  }}
                />
                <datalist id="inventory-categories-list">
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {formErrors.category && (
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                    {formErrors.category}
                  </span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Product Type</label>
                <input
                  type="text"
                  list="inventory-types-list"
                  placeholder="Product Type"
                  className="erp-input"
                  value={formData.product_type || ''}
                  onChange={e => setFormData({ ...formData, product_type: e.target.value })}
                />
                <datalist id="inventory-types-list">
                  {existingProductTypes.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Unit of Measure</label>
                <select
                  className="erp-select"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="m">Meters (m)</option>
                  <option value="sq_m">Square Meters (sq_m)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="set">Sets (set)</option>
                  <option value="roll">Rolls (roll)</option>
                  <option value="box">Boxes (box)</option>
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  className="erp-input"
                  value={formData.unit_cost ?? ''}
                  onChange={e => setFormData({ ...formData, unit_cost: e.target.value === '' ? ('' as any) : (parseFloat(e.target.value) || 0) })}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">
                  {editingMaterial ? 'Current Stock' : 'Initial Stock'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={editingMaterial ? 'Current Stock' : 'Initial Stock'}
                  className="erp-input"
                  value={formData.current_stock ?? ''}
                  onChange={e => setFormData({ ...formData, current_stock: e.target.value === '' ? ('' as any) : (parseFloat(e.target.value) || 0) })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Minimum Stock</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Minimum Stock"
                  className="erp-input"
                  value={formData.minimum_stock ?? ''}
                  onChange={e => setFormData({ ...formData, minimum_stock: e.target.value === '' ? ('' as any) : (parseFloat(e.target.value) || 0) })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Warehouse Storage</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <input
                    type="text"
                    placeholder="Row"
                    className="erp-input"
                    value={warehouseLoc.row}
                    onChange={e => handleWarehouseLocChange('row', e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Bay"
                    className="erp-input"
                    value={warehouseLoc.bay}
                    onChange={e => handleWarehouseLocChange('bay', e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Level"
                    className="erp-input"
                    value={warehouseLoc.level}
                    onChange={e => handleWarehouseLocChange('level', e.target.value)}
                  />
                </div>
              </div>
              {formData.storage_location && (
                <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '4px', display: 'block' }}>
                  Location Code: {formData.storage_location}
                </span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Product Image</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Image URL (e.g. /products/frosted_glass.jpg or https://...)"
                    className="erp-input"
                    style={{ flex: 1 }}
                    value={formData.image_url || ''}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  />
                  <label
                    className="erp-btn erp-btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      height: '35px',
                      whiteSpace: 'nowrap',
                      padding: '0 10px',
                      fontSize: '12.5px',
                      margin: 0,
                    }}
                  >
                    <Upload size={13} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (ev.target?.result) {
                              setFormData({ ...formData, image_url: ev.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {formData.image_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--erp-border)',
                        backgroundColor: 'var(--erp-surface-subtle)',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={formData.image_url}
                        alt="Product Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="erp-btn erp-btn-secondary erp-btn-sm"
                      style={{ fontSize: '12px', height: '28px', color: 'var(--erp-text-error)' }}
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Notes / Specs</label>
              <textarea
                rows={2}
                placeholder="Notes"
                className="erp-input"
                style={{ height: 'auto', resize: 'vertical' }}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingMaterial(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingMaterial ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={isStockAdjustmentModalOpen}
        onClose={() => {
          setIsStockAdjustmentModalOpen(false);
          setSelectedMaterialForAdjust(null);
        }}
        title={`Adjust Stock: ${selectedMaterialForAdjust?.name || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="erp-modal-body" style={{ maxHeight: 'calc(88vh - 120px)', overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="erp-form-group">
              <label className="erp-form-label">Movement Type *</label>
              <select
                className="erp-select"
                value={adjustData.movementType}
                onChange={e => setAdjustData({ ...adjustData, movementType: e.target.value })}
              >
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
                <option value="Direct Adjustment">Direct Adjustment</option>
                <option value="Return Stock">Return Stock</option>
              </select>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">
                {adjustData.movementType === 'Direct Adjustment' ? 'New Exact Stock Level' : 'Quantity'} *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                className={`erp-input ${formErrors.quantity ? 'erp-input-error' : ''}`}
                value={adjustData.quantity}
                onChange={e => {
                  setAdjustData({ ...adjustData, quantity: parseFloat(e.target.value) || 0 });
                  if (formErrors.quantity) setFormErrors({ ...formErrors, quantity: '' });
                }}
              />
              {formErrors.quantity && (
                <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                  {formErrors.quantity}
                </span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Project</label>
              <select
                className="erp-select"
                value={adjustData.projectId}
                onChange={e => setAdjustData({ ...adjustData, projectId: e.target.value ? Number(e.target.value) : '' })}
              >
                <option value="">Select Project</option>
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.project_name || (proj as any).name || `Project #${proj.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsStockAdjustmentModalOpen(false);
                setSelectedMaterialForAdjust(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        actionLoading={actionLoading}
      />

    </div>
  );
};
