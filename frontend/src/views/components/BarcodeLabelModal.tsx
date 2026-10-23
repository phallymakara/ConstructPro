import React, { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from './Modal';
import { encodeCode128 } from '../../utils/barcodeGenerator';
import type { Material } from '../../models/types';

interface BarcodeLabelModalProps {
  material: Material | null;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ material, onClose }) => {
  const barcodeValue = material?.barcode || material?.code || '';
  const binaryPattern = useMemo(() => encodeCode128(barcodeValue), [barcodeValue]);

  const handlePrint = () => {
    window.print();
  };

  if (!material) return null;

  return (
    <Modal isOpen={!!material} onClose={onClose} title="Inventory Barcode Label">
      <div className="erp-modal-body" style={{ textAlign: 'center' }}>
        {/* Printable Label Area */}
        <div
          id="printable-barcode-label"
          style={{
            border: '1px dashed var(--erp-border)',
            borderRadius: 'var(--erp-radius-sm)',
            padding: '20px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '0 auto',
            minWidth: '280px',
          }}
        >
          <div style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
            {material.category} • {material.product_type || 'Standard'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 12px 0', color: '#0f172a' }}>
            {material.name}
          </div>

          {/* SVG Barcode */}
          <div style={{ margin: '6px 0', padding: '6px 12px', backgroundColor: '#ffffff' }}>
            <svg
              width="240"
              height="70"
              viewBox={`0 0 ${binaryPattern.length * 2} 70`}
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
                    height={60}
                    fill="#000000"
                  />
                ) : null
              )}
            </svg>
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '0.15em', marginTop: '4px', color: '#1e293b' }}>
            {barcodeValue}
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
            Location: {material.storage_location || 'Warehouse Shelf'} | Unit: {material.unit}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '14px' }}>
          This barcode can be scanned using USB/Bluetooth barcode guns or camera scanning for Stock In & Stock Out.
        </p>
      </div>

      <div className="erp-modal-footer">
        <button type="button" className="erp-btn erp-btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="erp-btn erp-btn-primary" onClick={handlePrint}>
          <Printer size={14} />
          <span>Print Barcode Label</span>
        </button>
      </div>
    </Modal>
  );
};
