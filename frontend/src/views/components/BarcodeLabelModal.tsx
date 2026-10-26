import React, { useMemo, useState, useEffect } from 'react';
import { Printer, QrCode as QrIcon, Barcode as BarcodeIcon } from 'lucide-react';
import { Modal } from './Modal';
import { encodeCode128 } from '../../utils/barcodeGenerator';
import { generateQrSvg } from '../../utils/qrGenerator';
import type { Material } from '../../models/types';

interface BarcodeLabelModalProps {
  material: Material | null;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ material, onClose }) => {
  const [labelFormat, setLabelFormat] = useState<'qr' | 'barcode' | 'both'>('qr');
  const [qrSvg, setQrSvg] = useState<string>('');

  const barcodeValue = material?.barcode || material?.code || '';
  const qrActionUrl = useMemo(() => {
    if (!barcodeValue) return '';
    let origin = window.location.origin;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      origin = `${window.location.protocol}//192.168.15.206:${window.location.port || '5174'}`;
    }
    return `${origin}/inventory?picklist=${encodeURIComponent(barcodeValue)}`;
  }, [barcodeValue]);
  const binaryPattern = useMemo(() => encodeCode128(barcodeValue), [barcodeValue]);

  useEffect(() => {
    if (qrActionUrl) {
      generateQrSvg(qrActionUrl, { width: 160, margin: 1 })
        .then(svg => setQrSvg(svg))
        .catch(() => setQrSvg(''));
    }
  }, [qrActionUrl]);

  const handlePrint = () => {
    window.print();
  };

  if (!material) return null;

  return (
    <Modal isOpen={!!material} onClose={onClose} title="Inventory Label">
      <div className="erp-modal-body" style={{ textAlign: 'center' }}>
        {/* Format Selector: QR Code / 1D Barcode / Both */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="erp-segmented-control">
            <button
              type="button"
              className={`erp-segmented-btn ${labelFormat === 'qr' ? 'active' : ''}`}
              onClick={() => setLabelFormat('qr')}
            >
              <QrIcon size={13} />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              className={`erp-segmented-btn ${labelFormat === 'barcode' ? 'active' : ''}`}
              onClick={() => setLabelFormat('barcode')}
            >
              <BarcodeIcon size={13} />
              <span>1D Barcode</span>
            </button>
            <button
              type="button"
              className={`erp-segmented-btn ${labelFormat === 'both' ? 'active' : ''}`}
              onClick={() => setLabelFormat('both')}
            >
              <span>Both</span>
            </button>
          </div>
        </div>

        {/* Printable Label (Clean, Minimal, No extra text) */}
        <div
          id="printable-barcode-label"
          style={{
            border: '1px dashed var(--erp-border)',
            borderRadius: 'var(--erp-radius-sm)',
            padding: '18px 24px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '0 auto',
            minWidth: '280px',
            maxWidth: '340px',
          }}
        >
          {/* Product Name */}
          <div style={{ fontSize: '15px', color: '#0f172a', marginBottom: '8px' }}>
            {material.name}
          </div>

          {/* QR Code */}
          {(labelFormat === 'qr' || labelFormat === 'both') && qrSvg && (
            <div
              style={{
                margin: '6px 0',
                padding: '4px',
                backgroundColor: '#ffffff',
                display: 'flex',
                justifyContent: 'center',
              }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}

          {/* 1D Barcode */}
          {(labelFormat === 'barcode' || labelFormat === 'both') && (
            <div style={{ margin: '6px 0', padding: '6px 10px', backgroundColor: '#ffffff' }}>
              <svg
                width="240"
                height="56"
                viewBox={`0 0 ${binaryPattern.length * 2} 56`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
              >
                {binaryPattern.split('').map((bit, idx) =>
                  bit === '1' ? (
                    <rect
                      key={idx}
                      x={idx * 2}
                      y={0}
                      width={2}
                      height={46}
                      fill="#000000"
                    />
                  ) : null
                )}
              </svg>
            </div>
          )}

          {/* Code value */}
          <div
            style={{
              fontSize: '14.5px',
              letterSpacing: '0.12em',
              marginTop: '4px',
              color: '#1e293b',
            }}
          >
            {barcodeValue}
          </div>

          {/* Coordinate only */}
          {material.storage_location && (
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
              {material.storage_location}
            </div>
          )}
        </div>
      </div>

      <div className="erp-modal-footer">
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="erp-btn erp-btn-primary" onClick={handlePrint} style={{ gap: '6px' }}>
          <Printer size={14} />
          <span>Print Label</span>
        </button>
      </div>
    </Modal>
  );
};
