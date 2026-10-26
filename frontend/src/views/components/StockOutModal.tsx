import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Camera,
  CameraOff,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from './Modal';
import jsQR from 'jsqr';
import type { Material, Project, StockMovementBatchPayload } from '../../models/types';

export interface PicklistItem {
  material: Material;
  take_qty: number;
}

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  projects: Project[];
  onBatchStockMovement: (payload: StockMovementBatchPayload) => Promise<boolean>;
  actionLoading: boolean;
  initialScannedItem?: Material | null;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({
  isOpen,
  onClose,
  materials,
  projects,
  onBatchStockMovement,
  actionLoading,
  initialScannedItem = null,
}) => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [picklist, setPicklist] = useState<PicklistItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [recipientWorker, setRecipientWorker] = useState<string>('');
  const [dispatchPurpose, setDispatchPurpose] = useState<string>('Fabrication (ការកែច្នៃ/ដំឡើង)');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or reset modal
  useEffect(() => {
    if (isOpen) {
      setBarcodeInput('');
      setRecipientWorker('');
      setDispatchNotes('');
      setSelectedProjectId('');
      setErrorMessage(null);
      setSuccessStatus(null);
      if (initialScannedItem) {
        setPicklist([
          {
            material: initialScannedItem,
            take_qty: 1,
          },
        ]);
      } else {
        setPicklist([]);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      stopCamera();
    }
  }, [isOpen, initialScannedItem]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access requires a secure connection (HTTPS).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      let barcodeDetector: any = null;
      if ('BarcodeDetector' in window) {
        try {
          barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
          });
        } catch {
          barcodeDetector = null;
        }
      }

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        let detectedCode = '';

        // 1. Native BarcodeDetector
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detectedCode = barcodes[0].rawValue;
            }
          } catch {}
        }

        // 2. jsQR canvas fallback
        if (!detectedCode && ctx && videoRef.current.videoWidth > 0) {
          try {
            const w = videoRef.current.videoWidth;
            const h = videoRef.current.videoHeight;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (decoded && decoded.data) {
              detectedCode = decoded.data;
            }
          } catch {}
        }

        if (detectedCode) {
          const now = Date.now();
          // Debounce same item scan within 1.5 seconds
          if (
            detectedCode === lastScannedRef.current.code &&
            now - lastScannedRef.current.time < 1500
          ) {
            return;
          }
          lastScannedRef.current = { code: detectedCode, time: now };
          handleScannedCode(detectedCode);
        }
      }, 350);
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access device camera.');
      setIsCameraActive(false);
    }
  };

  const extractCode = (raw: string): string => {
    let val = raw.trim();
    if (val.includes('?') || val.startsWith('http://') || val.startsWith('https://')) {
      try {
        const url = new URL(val, window.location.origin);
        const param =
          url.searchParams.get('picklist') ||
          url.searchParams.get('stockout') ||
          url.searchParams.get('scan') ||
          url.searchParams.get('code') ||
          url.searchParams.get('barcode');
        if (param) return param.trim();
      } catch {}
    }
    return val;
  };

  const handleScannedCode = (rawInput: string) => {
    const code = extractCode(rawInput);
    if (!code) return;

    const term = code.toLowerCase();
    const matched = materials.find(
      m =>
        (m.barcode && m.barcode.toLowerCase() === term) ||
        m.code.toLowerCase() === term
    );

    if (!matched) {
      setErrorMessage(`No product found matching code "${code}".`);
      return;
    }

    setErrorMessage(null);
    setBarcodeInput('');

    // Add or increment in picklist
    setPicklist(prev => {
      const idx = prev.findIndex(item => item.material.id === matched.id);
      if (idx >= 0) {
        const currentQty = prev[idx].take_qty;
        const maxAvail = matched.current_stock || 0;
        const nextQty = Math.min(currentQty + 1, maxAvail);
        const updated = [...prev];
        updated[idx] = { ...updated[idx], take_qty: nextQty };
        return updated;
      } else {
        return [...prev, { material: matched, take_qty: 1 }];
      }
    });
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleScannedCode(barcodeInput);
  };

  const updateQuantity = (materialId: number, delta: number) => {
    setPicklist(prev =>
      prev
        .map(item => {
          if (item.material.id !== materialId) return item;
          const maxAvail = item.material.current_stock || 0;
          const newQty = Math.max(1, Math.min(item.take_qty + delta, maxAvail));
          return { ...item, take_qty: newQty };
        })
        .filter(item => item.take_qty > 0)
    );
  };

  const setExactQuantity = (materialId: number, val: number) => {
    setPicklist(prev =>
      prev.map(item => {
        if (item.material.id !== materialId) return item;
        const maxAvail = item.material.current_stock || 0;
        const newQty = Math.max(1, Math.min(val || 1, maxAvail));
        return { ...item, take_qty: newQty };
      })
    );
  };

  const removeItem = (materialId: number) => {
    setPicklist(prev => prev.filter(item => item.material.id !== materialId));
  };

  const handleConfirmBatch = async () => {
    if (picklist.length === 0) {
      setErrorMessage('Please scan or add at least one item to the picklist.');
      return;
    }

    // Validate quantities
    for (const item of picklist) {
      const available = item.material.current_stock || 0;
      if (item.take_qty > available) {
        setErrorMessage(
          `Cannot deduct ${item.take_qty} ${item.material.unit} of "${item.material.name}". Only ${available} available.`
        );
        return;
      }
    }

    setErrorMessage(null);

    const payload: StockMovementBatchPayload = {
      movement_type: 'Stock Out',
      project_id: selectedProjectId !== '' ? Number(selectedProjectId) : null,
      recipient_worker: recipientWorker.trim() || undefined,
      reference_note: [dispatchPurpose, dispatchNotes.trim()].filter(Boolean).join(' - '),
      items: picklist.map(p => ({
        material_id: p.material.id,
        quantity: p.take_qty,
        unit_cost: p.material.unit_cost || 0,
      })),
    };

    const success = await onBatchStockMovement(payload);
    if (success) {
      setSuccessStatus(`Successfully dispatched ${picklist.length} item(s) from warehouse.`);
      setPicklist([]);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Take Materials / Stock Out (ដកសម្ភារៈចេញពីឃ្លាំង)"
    >
      <div className="erp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Success Alert */}
        {successStatus && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: 'var(--erp-radius-sm)',
              color: '#065f46',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successStatus}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid var(--erp-border-error)',
              borderRadius: 'var(--erp-radius-sm)',
              color: 'var(--erp-text-error)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Top Scanner / Barcode Input Bar */}
        <form onSubmit={handleManualAdd} style={{ display: 'flex', gap: '8px' }}>
          <div className="erp-input-group" style={{ flex: 1 }}>
            <ScanLine className="erp-input-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Barcode or Item Code"
              className="erp-input erp-input-with-icon"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <button
            type="submit"
            className="erp-btn erp-btn-secondary"
            disabled={!barcodeInput.trim()}
            style={{ flexShrink: 0 }}
          >
            <span>Add</span>
          </button>
          <button
            type="button"
            className={`erp-btn ${isCameraActive ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
            onClick={() => (isCameraActive ? stopCamera() : startCamera())}
            title="Toggle Camera Scanner"
            style={{ gap: '6px', flexShrink: 0 }}
          >
            {isCameraActive ? <CameraOff size={15} /> : <Camera size={15} />}
            <span>Camera</span>
          </button>
        </form>

        {/* Camera Viewfinder */}
        {isCameraActive && (
          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--erp-radius-sm)',
              overflow: 'hidden',
              backgroundColor: '#000000',
              textAlign: 'center',
            }}
          >
            <video
              ref={videoRef}
              style={{ width: '100%', height: '170px', objectFit: 'cover' }}
              muted
              playsInline
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '2px solid rgba(16, 185, 129, 0.7)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '60px',
                  border: '2px dashed #10b981',
                  borderRadius: '4px',
                }}
              />
            </div>
            {cameraError && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  right: 6,
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  color: '#f87171',
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                {cameraError}
              </div>
            )}
          </div>
        )}

        {/* Allocation & Purpose Details Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--erp-border)',
            borderRadius: 'var(--erp-radius-sm)',
            padding: '10px 12px',
          }}
        >
          <div className="erp-form-group" style={{ margin: 0 }}>
            <label className="erp-form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>
              Assign to Project / Job
            </label>
            <select
              className="erp-input"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
              style={{ height: '34px', fontSize: '13px' }}
            >
              <option value="">General Stock Out (No Project)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.project_number || `#${p.id}`})
                </option>
              ))}
            </select>
          </div>

          <div className="erp-form-group" style={{ margin: 0 }}>
            <label className="erp-form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>
              Recipient Worker / Staff (អ្នកដកសម្ភារៈ)
            </label>
            <input
              type="text"
              placeholder="Recipient Name"
              className="erp-input"
              value={recipientWorker}
              onChange={e => setRecipientWorker(e.target.value)}
              style={{ height: '34px', fontSize: '13px' }}
            />
          </div>

          <div className="erp-form-group" style={{ margin: 0 }}>
            <label className="erp-form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>
              Dispatch Purpose
            </label>
            <select
              className="erp-input"
              value={dispatchPurpose}
              onChange={e => setDispatchPurpose(e.target.value)}
              style={{ height: '34px', fontSize: '13px' }}
            >
              <option value="Fabrication (ការកែច្នៃ/ដំឡើង)">Fabrication (ការកែច្នៃ/ដំឡើង)</option>
              <option value="Site Installation (ដំឡើងនៅការដ្ឋាន)">Site Installation (ដំឡើងនៅការដ្ឋាន)</option>
              <option value="Sample / Mockup (គំរូ)">Sample / Mockup (គំរូ)</option>
              <option value="Wastage / Scrap (ខូចខាត)">Wastage / Scrap (ខូចខាត)</option>
            </select>
          </div>

          <div className="erp-form-group" style={{ margin: 0 }}>
            <label className="erp-form-label" style={{ fontSize: '12.5px', marginBottom: '3px' }}>
              Reference / Note
            </label>
            <input
              type="text"
              placeholder="Dispatch Notes"
              className="erp-input"
              value={dispatchNotes}
              onChange={e => setDispatchNotes(e.target.value)}
              style={{ height: '34px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Dispatch Items Picklist Section */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
              Dispatch Items Picklist ({picklist.length})
            </span>
            {picklist.length > 0 && (
              <button
                type="button"
                onClick={() => setPicklist([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--erp-text-error)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div
            style={{
              border: '1px solid var(--erp-border)',
              borderRadius: 'var(--erp-radius-sm)',
              overflow: 'hidden',
              maxHeight: '230px',
              overflowY: 'auto',
            }}
          >
            {picklist.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '13.5px' }}>
                No items in picklist. Scan a QR code or type an Item Code to add.
              </div>
            ) : (
              <table className="erp-table" style={{ margin: 0, fontSize: '13.5px' }}>
                <thead>
                  <tr>
                    <th style={{ fontWeight: 400 }}>Item Code</th>
                    <th style={{ fontWeight: 400 }}>Product Name</th>
                    <th style={{ fontWeight: 400 }}>Location</th>
                    <th style={{ textAlign: 'right', fontWeight: 400 }}>Available</th>
                    <th style={{ textAlign: 'center', width: '130px', fontWeight: 400 }}>Take Qty</th>
                    <th style={{ fontWeight: 400 }}>Unit</th>
                    <th style={{ textAlign: 'center', width: '40px', fontWeight: 400 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {picklist.map(item => {
                    const maxAvail = item.material.current_stock || 0;
                    return (
                      <tr key={item.material.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--erp-text-main)' }}>
                          {item.material.code}
                        </td>
                        <td style={{ color: 'var(--erp-text-main)' }}>
                          {item.material.name}
                        </td>
                        <td style={{ color: 'var(--erp-text-muted)', whiteSpace: 'nowrap' }}>
                          {item.material.storage_location || '—'}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {maxAvail}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              border: '1px solid var(--erp-border)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.material.id, -1)}
                              style={{
                                width: '26px',
                                height: '26px',
                                border: 'none',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Minus size={11} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={maxAvail}
                              value={item.take_qty}
                              onChange={e =>
                                setExactQuantity(item.material.id, parseInt(e.target.value, 10))
                              }
                              style={{
                                width: '42px',
                                height: '26px',
                                border: 'none',
                                textAlign: 'center',
                                fontSize: '13px',
                                outline: 'none',
                                fontWeight: 500,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.material.id, 1)}
                              disabled={item.take_qty >= maxAvail}
                              style={{
                                width: '26px',
                                height: '26px',
                                border: 'none',
                                background: '#f8fafc',
                                cursor: item.take_qty >= maxAvail ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: item.take_qty >= maxAvail ? 0.4 : 1,
                              }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        <td style={{ color: 'var(--erp-text-muted)' }}>
                          {item.material.unit}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeItem(item.material.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--erp-text-error)',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Remove from picklist"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="erp-modal-footer">
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="erp-btn erp-btn-primary"
          onClick={handleConfirmBatch}
          disabled={picklist.length === 0 || actionLoading}
          style={{ gap: '6px' }}
        >
          <span>Confirm Stock Out (បញ្ជាក់ការដក)</span>
          {picklist.length > 0 && <span>({picklist.length})</span>}
        </button>
      </div>
    </Modal>
  );
};
