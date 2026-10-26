import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Camera,
  CameraOff,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Modal } from './Modal';
import jsQR from 'jsqr';
import type { Material } from '../../models/types';

interface BarcodeMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  findMaterialByBarcode: (barcodeOrCode: string) => Promise<Material | null>;
  recordStockMovement: (
    materialId: number,
    movementType: string,
    quantity: number,
    notes?: string
  ) => Promise<boolean>;
  actionLoading: boolean;
  initialMaterial?: Material | null;
  initialMode?: 'Stock In' | 'Stock Out';
}

export const BarcodeMovementModal: React.FC<BarcodeMovementModalProps> = ({
  isOpen,
  onClose,
  findMaterialByBarcode,
  recordStockMovement,
  actionLoading,
  initialMaterial = null,
  initialMode = 'Stock Out',
}) => {
  const [movementMode, setMovementMode] = useState<'Stock In' | 'Stock Out'>('Stock In');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [continuousScan, setContinuousScan] = useState<boolean>(true);

  // Camera scanning state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Autofocus input on open or change
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialMaterial) {
        setScannedMaterial(initialMaterial);
        setBarcodeInput(initialMaterial.barcode || initialMaterial.code);
        setMovementMode(initialMode);
      } else {
        setBarcodeInput('');
        setScannedMaterial(null);
        setMovementMode('Stock In');
      }
      setQuantity(1);
      setReferenceNote('');
      setErrorMessage(null);
      setSuccessStatus(null);
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    } else {
      stopCamera();
    }
  }, [isOpen, initialMaterial, initialMode]);

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
        throw new Error('Camera access requires a secure connection (HTTPS). Please ensure you are opening the HTTPS link.');
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

      // Hidden canvas for frame decoding (supports iOS Safari & all mobile devices)
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
        if (!videoRef.current || videoRef.current.readyState < 2) {
          return;
        }

        // 1. Try native BarcodeDetector if available
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              handleCodeDetected(barcodes[0].rawValue);
              return;
            }
          } catch {}
        }

        // 2. jsQR canvas fallback (works reliably on iOS and Android)
        if (ctx && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
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
              handleCodeDetected(decoded.data);
              return;
            }
          } catch {}
        }
      }, 350);
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access device camera.');
      setIsCameraActive(false);
    }
  };

  const extractCode = (input: string): string => {
    let val = input.trim();
    if (val.includes('?') || val.startsWith('http://') || val.startsWith('https://')) {
      try {
        const url = new URL(val, window.location.origin);
        const param = url.searchParams.get('stockout') || url.searchParams.get('scan') || url.searchParams.get('code') || url.searchParams.get('barcode');
        if (param) return param.trim();
      } catch {}
    }
    return val;
  };

  const handleCodeDetected = (code: string) => {
    const cleanCode = extractCode(code);
    setBarcodeInput(cleanCode);
    lookupBarcode(cleanCode);
    stopCamera();
  };

  const lookupBarcode = async (codeToLookup: string) => {
    const trimmed = extractCode(codeToLookup);
    if (!trimmed) return;

    setIsSearching(true);
    setErrorMessage(null);
    setSuccessStatus(null);

    const found = await findMaterialByBarcode(trimmed);
    setIsSearching(false);

    if (found) {
      setScannedMaterial(found);
      setQuantity(1);
    } else {
      setScannedMaterial(null);
      setErrorMessage(`No product found with barcode or code "${trimmed}".`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupBarcode(barcodeInput);
    }
  };

  const handleConfirmMovement = async () => {
    if (!scannedMaterial) return;
    if (quantity <= 0) {
      setErrorMessage('Quantity must be greater than 0.');
      return;
    }

    if (movementMode === 'Stock Out' && quantity > scannedMaterial.current_stock) {
      setErrorMessage(
        `Insufficient physical stock. Available: ${scannedMaterial.current_stock} ${scannedMaterial.unit}`
      );
      return;
    }

    setErrorMessage(null);
    const success = await recordStockMovement(
      scannedMaterial.id,
      movementMode,
      quantity,
      referenceNote || `Barcode ${movementMode}`
    );

    if (success) {
      const movedItemName = scannedMaterial.name;
      const movedQty = quantity;
      const movedUnit = scannedMaterial.unit;

      setSuccessStatus(`${movementMode} recorded: ${movedQty} ${movedUnit} of "${movedItemName}".`);

      if (continuousScan) {
        // Reset for next scan
        setBarcodeInput('');
        setScannedMaterial(null);
        setQuantity(1);
        setReferenceNote('');
        setTimeout(() => {
          barcodeInputRef.current?.focus();
        }, 100);
      } else {
        onClose();
      }
    }
  };

  const projectedStock = scannedMaterial
    ? movementMode === 'Stock In'
      ? scannedMaterial.current_stock + quantity
      : Math.max(0, scannedMaterial.current_stock - quantity)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Barcode Stock Movement">
      <div className="erp-modal-body">
        {/* Top Segmented Mode: Stock In vs Stock Out */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className="erp-btn"
            style={{
              flex: 1,
              height: '38px',
              backgroundColor: movementMode === 'Stock In' ? '#15803d' : 'var(--erp-surface-hover)',
              color: movementMode === 'Stock In' ? '#ffffff' : 'var(--erp-text-main)',
              border: '1px solid var(--erp-border)',
              fontWeight: 600,
              gap: '6px',
            }}
            onClick={() => {
              setMovementMode('Stock In');
              setErrorMessage(null);
            }}
          >
            <ArrowDownLeft size={16} />
            <span>Stock In (Intake / Add)</span>
          </button>

          <button
            type="button"
            className="erp-btn"
            style={{
              flex: 1,
              height: '38px',
              backgroundColor: movementMode === 'Stock Out' ? '#b45309' : 'var(--erp-surface-hover)',
              color: movementMode === 'Stock Out' ? '#ffffff' : 'var(--erp-text-main)',
              border: '1px solid var(--erp-border)',
              fontWeight: 600,
              gap: '6px',
            }}
            onClick={() => {
              setMovementMode('Stock Out');
              setErrorMessage(null);
            }}
          >
            <ArrowUpRight size={16} />
            <span>Stock Out (Dispatch / Deduct)</span>
          </button>
        </div>

        {/* Barcode Scanner Input Row */}
        <div className="erp-form-group">
          <label className="erp-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Scan Barcode or Item Code</span>
            <span style={{ fontSize: '11px', color: 'var(--erp-text-muted)', fontWeight: 400 }}>
              Hardware USB/Bluetooth scanner ready
            </span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="erp-input-group" style={{ flex: 1 }}>
              <ScanLine className="erp-input-icon" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Barcode or Item Code"
                className="erp-input erp-input-with-icon"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => lookupBarcode(barcodeInput)}
              disabled={!barcodeInput.trim() || isSearching}
              style={{ flexShrink: 0 }}
            >
              {isSearching ? 'Looking up...' : 'Lookup'}
            </button>

            <button
              type="button"
              className={`erp-btn ${isCameraActive ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
              onClick={() => (isCameraActive ? stopCamera() : startCamera())}
              title="Camera Scanner"
              style={{ flexShrink: 0 }}
            >
              {isCameraActive ? <CameraOff size={15} /> : <Camera size={15} />}
            </button>
          </div>
        </div>

        {/* Live Camera Viewfinder */}
        {isCameraActive && (
          <div
            style={{
              position: 'relative',
              margin: '12px 0',
              borderRadius: 'var(--erp-radius-sm)',
              overflow: 'hidden',
              backgroundColor: '#000000',
              textAlign: 'center',
            }}
          >
            <video
              ref={videoRef}
              style={{ width: '100%', height: '180px', objectFit: 'cover' }}
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
                  width: '75%',
                  height: '40px',
                  border: '2px dashed #10b981',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                left: 0,
                right: 0,
                fontSize: '11px',
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              Point camera at barcode
            </div>
          </div>
        )}

        {cameraError && (
          <div style={{ color: 'var(--erp-text-error)', fontSize: '11.5px', marginBottom: '8px' }}>
            {cameraError}
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div style={{ color: 'var(--erp-text-error)', fontSize: '12.5px', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successStatus && (
          <div style={{ color: '#15803d', fontSize: '12.5px', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} />
            <span>{successStatus}</span>
          </div>
        )}

        {/* Matched Product Details Card */}
        {scannedMaterial && (
          <div
            style={{
              marginTop: '12px',
              padding: '14px',
              border: '1px solid var(--erp-border)',
              borderRadius: 'var(--erp-radius-card)',
              backgroundColor: 'var(--erp-surface-hover)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={15} style={{ color: 'var(--erp-primary)' }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                    {scannedMaterial.name}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
                  Code: <strong style={{ fontFamily: 'monospace' }}>{scannedMaterial.code}</strong> • Barcode: <strong style={{ fontFamily: 'monospace' }}>{scannedMaterial.barcode || scannedMaterial.code}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="erp-badge erp-badge-draft">
                  {scannedMaterial.category} / {scannedMaterial.product_type || 'Standard'}
                </span>
                <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', marginTop: '4px' }}>
                  {scannedMaterial.storage_location || 'Warehouse'}
                </div>
              </div>
            </div>

            {/* Movement Quantity & Stock Delta Preview */}
            <div
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--erp-border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div>
                <label className="erp-form-label">
                  {movementMode === 'Stock In' ? 'Quantity to Add' : 'Quantity to Deduct'} *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    className="erp-input"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseFloat(e.target.value) || 0))}
                    style={{ width: '100px', fontWeight: 700 }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="erp-btn erp-btn-secondary erp-btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setQuantity(prev => prev + 1)}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      className="erp-btn erp-btn-secondary erp-btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setQuantity(prev => prev + 5)}
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      className="erp-btn erp-btn-secondary erp-btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setQuantity(prev => prev + 10)}
                    >
                      +10
                    </button>
                  </div>
                </div>
              </div>

              {/* Stock Delta Live Preview */}
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--erp-surface)',
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-sm)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--erp-text-muted)' }}>Projected Stock Level</div>
                <div style={{ fontSize: '14.5px', fontWeight: 700, marginTop: '2px' }}>
                  <span>{scannedMaterial.current_stock}</span>
                  <span style={{ margin: '0 6px', color: 'var(--erp-text-muted)' }}>&rarr;</span>
                  <span style={{ color: movementMode === 'Stock In' ? '#15803d' : '#b45309' }}>
                    {projectedStock} {scannedMaterial.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Reference Note */}
            <div style={{ marginTop: '12px' }}>
              <label className="erp-form-label">Reference / Note (Optional)</label>
              <input
                type="text"
                placeholder="Reference Note"
                className="erp-input"
                value={referenceNote}
                onChange={e => setReferenceNote(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Continuous Scanning Toggle */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={continuousScan}
              onChange={e => setContinuousScan(e.target.checked)}
            />
            <span>Keep scanner active for continuous multi-item intake/dispatch</span>
          </label>

          {scannedMaterial && (
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              onClick={() => {
                setScannedMaterial(null);
                setBarcodeInput('');
                barcodeInputRef.current?.focus();
              }}
              style={{ gap: '4px', fontSize: '11.5px' }}
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="erp-modal-footer">
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose} disabled={actionLoading}>
          Close
        </button>

        <button
          type="button"
          className="erp-btn"
          style={{
            backgroundColor: movementMode === 'Stock In' ? '#15803d' : '#b45309',
            color: '#ffffff',
            border: 'none',
          }}
          disabled={!scannedMaterial || actionLoading}
          onClick={handleConfirmMovement}
        >
          {actionLoading ? 'Processing...' : `Confirm ${movementMode}`}
        </button>
      </div>
    </Modal>
  );
};
