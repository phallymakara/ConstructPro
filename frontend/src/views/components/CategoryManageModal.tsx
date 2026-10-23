import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, FolderTree } from 'lucide-react';
import { Modal } from './Modal';
import type { ProductCategory, ProductCategoryFormData } from '../../models/types';

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  onCreateCategory: (data: ProductCategoryFormData) => Promise<boolean>;
  onUpdateCategory: (id: number, data: ProductCategoryFormData) => Promise<boolean>;
  onDeleteCategory: (id: number) => Promise<boolean>;
  actionLoading?: boolean;
}

export const CategoryManageModal: React.FC<CategoryManageModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  actionLoading = false,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setFormError('Category name is required.');
      return;
    }

    const success = await onCreateCategory({
      name: trimmed,
      description: newCatDesc.trim() || undefined,
    });

    if (success) {
      setNewCatName('');
      setNewCatDesc('');
      setFormError(null);
    } else {
      setFormError('Failed to create category or category already exists.');
    }
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setInlineError(null);
  };

  const handleSaveEdit = async (id: number) => {
    setInlineError(null);
    const trimmed = editName.trim();
    if (!trimmed) {
      setInlineError('Name is required.');
      return;
    }

    const success = await onUpdateCategory(id, {
      name: trimmed,
      description: editDesc.trim() || undefined,
    });

    if (success) {
      setEditingId(null);
      setEditName('');
      setEditDesc('');
    } else {
      setInlineError('Failed to update category.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDesc('');
    setInlineError(null);
  };

  const handleDelete = async (cat: ProductCategory) => {
    if (cat.product_count && cat.product_count > 0) {
      alert(`Cannot delete category "${cat.name}" because it contains ${cat.product_count} products.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      await onDeleteCategory(cat.id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Inventory Categories"
      maxWidth="750px"
    >
      <div className="erp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Create New Category Form */}
        <form onSubmit={handleCreate} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                className="erp-input"
                placeholder="Category Name"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                style={{
                  width: '100%',
                  borderColor: formError ? 'var(--erp-text-error)' : undefined,
                  fontSize: '13.5px',
                }}
              />
              {formError && (
                <div style={{ color: 'var(--erp-text-error)', fontSize: '11.5px', marginTop: '3px' }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ flex: 1.3 }}>
              <input
                type="text"
                className="erp-input"
                placeholder="Description"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                style={{ width: '100%', fontSize: '13.5px' }}
              />
            </div>

            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
              style={{ gap: '6px', height: '36px', padding: '0 20px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Existing Categories Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--erp-text-muted)' }}>
            Existing Categories ({categories.length})
          </div>

          <div className="erp-table-container" style={{ margin: 0, maxHeight: '340px', overflowY: 'auto' }}>
            <table className="erp-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Category Name</th>
                  <th style={{ width: '42%' }}>Description</th>
                  <th style={{ width: '11%', textAlign: 'center' }}>Products</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--erp-text-muted)', padding: '24px' }}>
                      No categories defined yet.
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => {
                    const isEditing = editingId === cat.id;
                    return (
                      <tr key={cat.id}>
                        <td>
                          {isEditing ? (
                            <div>
                              <input
                                type="text"
                                className="erp-input"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12.5px',
                                  borderColor: inlineError ? 'var(--erp-text-error)' : undefined,
                                }}
                                autoFocus
                              />
                              {inlineError && (
                                <div style={{ color: 'var(--erp-text-error)', fontSize: '11px', marginTop: '2px' }}>
                                  {inlineError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--erp-text-main)' }}>
                              {cat.name}
                            </span>
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="erp-input"
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              placeholder="Description"
                              style={{ padding: '4px 8px', fontSize: '12.5px' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--erp-text-muted)', fontSize: '12.5px' }}>
                              {cat.description || '-'}
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              padding: '2px 8px',
                              borderRadius: 'var(--erp-radius-sm)',
                              backgroundColor: 'var(--erp-surface-hover)',
                              color: 'var(--erp-text-main)',
                              fontWeight: 600,
                            }}
                          >
                            {cat.product_count || 0}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn-secondary erp-btn-sm"
                                  style={{ padding: '3px 6px', color: '#15803d' }}
                                  onClick={() => handleSaveEdit(cat.id)}
                                  title="Save"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn-secondary erp-btn-sm"
                                  style={{ padding: '3px 6px' }}
                                  onClick={handleCancelEdit}
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn-secondary erp-btn-sm"
                                  style={{ padding: '3px 6px' }}
                                  onClick={() => handleStartEdit(cat)}
                                  title="Edit / Rename Category"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn-secondary erp-btn-sm"
                                  style={{
                                    padding: '3px 6px',
                                    color: (cat.product_count || 0) > 0 ? '#9ca3af' : '#b91c1c',
                                  }}
                                  disabled={(cat.product_count || 0) > 0}
                                  onClick={() => handleDelete(cat)}
                                  title={
                                    (cat.product_count || 0) > 0
                                      ? 'Cannot delete category containing products'
                                      : 'Delete Category'
                                  }
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="erp-modal-footer">
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};
