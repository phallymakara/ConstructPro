import { COMPANY_LOGO_BASE64 } from '../assets/logoBase64';
import type { Project, Quotation, ProjectTask } from '../models/types';

export interface ProjectPersonnelItem {
  name: string;
  role: string;
  scope: string;
}

/**
 * Helper to format project ID cleanly without truncation
 */
export const formatShortId = (num?: string): string => {
  if (!num) return '-';
  return num;
};

/**
 * Helper to format date cleanly as YYYY-MM-DD without timestamp T00:00:00
 */
export const formatDateOnly = (d?: string): string => {
  if (!d) return '-';
  const clean = String(d).trim();
  if (clean.includes('T')) {
    return clean.split('T')[0];
  }
  return clean;
};

/**
 * Generate HTML string for Project Specification & Dispatch Report
 * - Clean paper layout without background cards/containers
 * - Simple neutral text colors for all labels, table headers, and rows
 * - Logo branding color preserved in top company header
 * - Technical compliance section removed as requested
 */
export const generateProjectExportBody = (
  proj: Project,
  customerName: string,
  personnel: ProjectPersonnelItem[],
  materials: any[]
): string => {
  const shortId = formatShortId(proj.project_number);
  const printDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return `
    <div style="font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px 24px; width: 100%; max-width: 210mm; margin: 0 auto; box-sizing: border-box; background: #ffffff;">
      
      <!-- Company Header with Logo -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img 
            src="${COMPANY_LOGO_BASE64}" 
            alt="វឌ្ឍនា HOME SERVICES" 
            style="width: 70px; height: 70px; object-fit: contain; border-radius: 4px; display: block;" 
          />
          <div>
            <div style="font-size: 19px; font-weight: 700; color: #dc2626; line-height: 1.2;">
              វឌ្ឍនា HOME SERVICES
            </div>
            <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px; margin-top: 2px;">
              VADDHANA HOME SERVICES
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              ផលិត និងតម្លើងទ្វារ បង្អួច និងសម្ភារៈសំណង់គេហដ្ឋាន • Manufacturing & Installation
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
              Phnom Penh, Cambodia • Tel: (+855) 012 345 678 / 098 765 432 • info@vaddhana.com
            </div>
          </div>
        </div>

        <!-- Project & Customer Summary in Top Right Header -->
        <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.6;">
          <div><span style="color: #64748b;">Project:</span> <strong style="color: #0f172a;">${proj.project_name || '-'}</strong> <span style="color: #64748b;">(${shortId})</span></div>
          <div><span style="color: #64748b;">Customer:</span> <strong style="color: #0f172a;">${customerName}</strong></div>
          <div><span style="color: #64748b;">Location:</span> <strong style="color: #0f172a;">${proj.location || '-'}</strong></div>
          <div><span style="color: #64748b;">Date:</span> <strong style="color: #0f172a;">${printDate}</strong></div>
        </div>
      </div>


      <!-- Section 1: Assigned Work & Personnel -->
      <div style="margin-top: 18px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #dc2626; padding-bottom: 4px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 0; text-transform: uppercase; letter-spacing: 0.3px;">
          1. Assigned Work & Technical Personnel (បុគ្គលិកបច្ចេកទេស និងវិសាលភាពការងារ)
        </h2>
        <span style="font-size: 11px; color: #dc2626; font-weight: 600;">${personnel.length} Assigned</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11.5px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1.5px solid #cbd5e1;">
            <th style="padding: 7px 6px; width: 5%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">#</th>
            <th style="padding: 7px 8px; width: 25%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Personnel Name</th>
            <th style="padding: 7px 8px; width: 25%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Role / Position</th>
            <th style="padding: 7px 8px; width: 33%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Scope of Responsibility</th>
            <th style="padding: 7px 6px; width: 12%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            personnel.length > 0
              ? personnel
                  .map(
                    (p, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 7px 6px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
              <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">${p.name}</td>
              <td style="padding: 7px 8px; color: #334155;">${p.role}</td>
              <td style="padding: 7px 8px; color: #475569; font-size: 11px;">${p.scope}</td>
              <td style="padding: 7px 6px; text-align: center; color: #16a34a; font-weight: 600; font-size: 10.5px;">Assigned</td>
            </tr>
          `
                  )
                  .join('')
              : `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8;">
                No personnel assigned yet.
              </td>
            </tr>
          `
          }
        </tbody>
      </table>

      <!-- Section 2: Bill of Materials -->
      <div style="margin-top: 18px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #dc2626; padding-bottom: 4px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 0; text-transform: uppercase; letter-spacing: 0.3px;">
          2. Bill of Materials & Items (បញ្ជីសម្ភារៈ និងឧបករណ៍បច្ចេកទេស)
        </h2>
        <span style="font-size: 11px; color: #dc2626; font-weight: 600;">${materials.length} Items</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 11.5px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1.5px solid #cbd5e1;">
            <th style="padding: 7px 6px; width: 6%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">#</th>
            <th style="padding: 7px 8px; width: 56%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Material Description</th>
            <th style="padding: 7px 8px; width: 22%; text-align: right; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Required Qty</th>
            <th style="padding: 7px 6px; width: 16%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            materials.length > 0
              ? materials
                  .map(
                    (m, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 7px 6px; text-align: center; color: #64748b; font-weight: 400;">${idx + 1}</td>
              <td style="padding: 7px 8px; font-weight: 400; color: #0f172a;">${m.material_name || m.name || '-'}</td>
              <td style="padding: 7px 8px; text-align: right; font-weight: 400; color: #0f172a;">${m.required_qty ?? '-'}</td>
              <td style="padding: 7px 6px; text-align: center; color: #0f172a; font-weight: 400; font-size: 10.5px;">${m.status || 'Ready'}</td>
            </tr>
          `
                  )
                  .join('')
              : `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8;">
                No materials assigned yet.
              </td>
            </tr>
          `
          }
        </tbody>
      </table>

      <!-- Sign-off & Verification -->
      <div style="margin-top: 36px; display: flex; justify-content: space-between; gap: 24px; font-size: 11.5px; page-break-inside: avoid;">
        <div style="border-top: 1px solid #94a3b8; width: 30%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Prepared by:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">Site Supervisor / Lead</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 85%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>

        <div style="border-top: 1px solid #94a3b8; width: 30%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Verified & Approved by:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">Project Manager / QC</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 85%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>

        <div style="border-top: 1px solid #94a3b8; width: 30%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Customer Acceptance:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">Customer / Site Liaison</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 85%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Export Project specification to PDF using browser print iframe
 */
export const exportProjectToPDF = (
  proj: Project,
  customerName: string,
  personnel: ProjectPersonnelItem[],
  materials: any[]
): void => {
  const bodyContent = generateProjectExportBody(proj, customerName, personnel, materials);
  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${proj.project_name || 'Project'} - Specification (វឌ្ឍនា Home Services)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 210mm 297mm;
            margin: 10mm 12mm;
          }
          @media print {
            body { margin: 0; padding: 0; width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 300);
  }
};

/**
 * Export Project specification to Microsoft Word document
 */
export const exportProjectToWord = (
  proj: Project,
  customerName: string,
  personnel: ProjectPersonnelItem[],
  materials: any[]
): void => {
  const bodyContent = generateProjectExportBody(proj, customerName, personnel, materials);
  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${proj.project_name || 'Project'} - Export</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 210mm 297mm;
            margin: 15mm 15mm 15mm 15mm;
            mso-page-orientation: portrait;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          body { font-family: 'Kantumruy Pro', 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; width: 210mm; margin: 0 auto; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          th { border-bottom: 2px solid #cbd5e1; color: #1e293b; padding: 6px 8px; text-align: left; font-size: 10pt; font-weight: bold; }
          td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${bodyContent}
        </div>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${(proj.project_name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_specification.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generate HTML string for Quotation & Cost Estimate Report
 * - Simple neutral text colors
 * - No background containers
 */
export const generateQuotationExportBody = (
  quote: Quotation,
  customerName: string
): string => {
  const printDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const validUntilDate = quote.valid_until
    ? new Date(quote.valid_until).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '30 Days from issue';

  return `
    <div style="font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 24px; max-width: 820px; margin: 0 auto; box-sizing: border-box; background: #ffffff;">
      
      <!-- Company Header with Logo -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img 
            src="${COMPANY_LOGO_BASE64}" 
            alt="វឌ្ឍនា HOME SERVICES" 
            style="width: 70px; height: 70px; object-fit: contain; border-radius: 4px; display: block;" 
          />
          <div>
            <div style="font-size: 19px; font-weight: 700; color: #dc2626; line-height: 1.2;">
              វឌ្ឍនា HOME SERVICES
            </div>
            <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px; margin-top: 2px;">
              VADDHANA HOME SERVICES
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              ផលិត និងតម្លើងទ្វារ បង្អួច និងសម្ភារៈសំណង់គេហដ្ឋាន • Manufacturing & Installation
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
              Phnom Penh, Cambodia • Tel: (+855) 012 345 678 / 098 765 432 • info@vaddhana.com
            </div>
          </div>
        </div>

        <!-- Customer Info in Top Right Header -->
        <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.6;">
          <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
            Customer Information
          </div>
          <div><span style="color: #64748b;">Customer:</span> <strong style="color: #0f172a;">${customerName}</strong></div>
        </div>
      </div>

      <!-- Document Title & Reference Info (Positioned below the logo) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            PRICE QUOTATION
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 600; margin-top: 1px;">
            តារាងតម្លៃ និងការប៉ាន់ស្មានចំណាយ
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569;">
          <div><span style="color: #64748b;">Quote #:</span> <strong style="color: #0f172a;">${quote.quotation_number}</strong></div>
          <div><span style="color: #64748b;">Date:</span> <strong style="color: #0f172a;">${printDate}</strong></div>
          <div><span style="color: #64748b;">Valid Until:</span> <strong style="color: #0f172a;">${validUntilDate}</strong></div>
        </div>
      </div>

      <!-- Overview: Simple Rows & Columns (No Container Background) -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 11.5px;">
        <tbody>
          <tr>
            <td style="padding: 6px 4px; width: 17%; font-weight: 600; color: #475569; white-space: nowrap; border-bottom: 1px solid #f1f5f9;">Scope of Work:</td>
            <td style="padding: 6px 8px; width: 33%; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Window & House Materials Installation</td>
            <td style="padding: 6px 4px; width: 17%; font-weight: 600; color: #475569; white-space: nowrap; border-bottom: 1px solid #f1f5f9;">Payment Terms:</td>
            <td style="padding: 6px 8px; width: 33%; color: #0f172a; border-bottom: 1px solid #f1f5f9;">50% Deposit / 50% Upon Handover</td>
          </tr>
        </tbody>
      </table>

      <!-- Cost Breakdown Table -->
      <div style="margin-top: 18px; margin-bottom: 6px; border-bottom: 1.5px solid #dc2626; padding-bottom: 4px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 0; text-transform: uppercase; letter-spacing: 0.3px;">
          Cost Breakdown & Estimation (ការវិភាគ និងប៉ាន់ស្មានតម្លៃ)
        </h2>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11.5px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1.5px solid #cbd5e1;">
            <th style="padding: 7px 6px; width: 6%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">#</th>
            <th style="padding: 7px 8px; width: 64%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Description</th>
            <th style="padding: 7px 8px; width: 30%; text-align: right; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Amount (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 7px 6px; text-align: center; color: #64748b; font-weight: 600;">1</td>
            <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">Direct Materials & Hardware (Aluminium, Glass, Accessories)</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: 600; color: #0f172a;">$${Number(quote.material_cost || 0).toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 7px 6px; text-align: center; color: #64748b; font-weight: 600;">2</td>
            <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">Labor & Workshop Fabrication</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: 600; color: #0f172a;">$${Number(quote.labor_cost || 0).toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 7px 6px; text-align: center; color: #64748b; font-weight: 600;">3</td>
            <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">Transport, Delivery & Site Logistics</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: 600; color: #0f172a;">$${Number(quote.transport_cost || 0).toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 7px 6px; text-align: center; color: #64748b; font-weight: 600;">4</td>
            <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">On-site Installation & Weatherproofing</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: 600; color: #0f172a;">$${Number(quote.installation_cost || 0).toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 7px 8px; text-align: right; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Subtotal:</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">$${Number(quote.subtotal || 0).toLocaleString()}</td>
          </tr>
          ${
            quote.discount_amount > 0
              ? `
          <tr>
            <td colspan="2" style="padding: 7px 8px; text-align: right; color: #475569; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Discount:</td>
            <td style="padding: 7px 8px; text-align: right; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">-$${Number(quote.discount_amount).toLocaleString()}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td colspan="2" style="padding: 7px 8px; text-align: right; color: #64748b; border-bottom: 1px solid #e2e8f0;">Tax (${quote.tax_percent}%):</td>
            <td style="padding: 7px 8px; text-align: right; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">$${((quote.subtotal - (quote.discount_amount || 0)) * ((quote.tax_percent || 0) / 100)).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px; border-bottom: 2px solid #0f172a;">Grand Total:</td>
            <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px; border-bottom: 2px solid #0f172a;">$${Number(quote.total_amount || 0).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Signatures -->
      <div style="margin-top: 36px; display: flex; justify-content: space-between; gap: 30px; font-size: 11.5px; page-break-inside: avoid;">
        <div style="border-top: 1px solid #94a3b8; width: 45%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Authorized Signature:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">វឌ្ឍនា HOME SERVICES Management</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 70%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Stamp</div>
        </div>

        <div style="border-top: 1px solid #94a3b8; width: 45%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Customer Acceptance:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">I accept this quotation and authorize work to proceed</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 70%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 36px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <div>វឌ្ឍនា HOME SERVICES • ConstructPro Quotation Module</div>
        <div>Printed: ${printDate}</div>
      </div>
    </div>
  `;
};

/**
 * Export Quotation to PDF using browser print iframe
 */
export const exportQuotationToPDF = (
  quote: Quotation,
  customerName: string
): void => {
  const bodyContent = generateQuotationExportBody(quote, customerName);
  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Quotation ${quote.quotation_number} - វឌ្ឍនា Home Services</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 210mm 297mm;
            margin: 10mm 12mm;
          }
          @media print {
            body { margin: 0; padding: 0; width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 300);
  }
};

/**
 * Generate HTML string for Project Schedule & Timeline Report
 * - Matches the exact company branding & header as generateProjectExportBody
 * - Clean paper layout without unnecessary containers
 * - Full table of main tasks and subtasks with dates, progress, status, and descriptions
 * - Sign-off & verification blocks
 */
export const generateScheduleExportBody = (
  proj: Project,
  customerName: string,
  tasks: ProjectTask[]
): string => {
  const shortId = formatShortId(proj.project_number);
  const printDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return `
    <div style="font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px 24px; width: 100%; max-width: 210mm; margin: 0 auto; box-sizing: border-box; background: #ffffff;">
      
      <!-- Company Header with Logo -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img 
            src="${COMPANY_LOGO_BASE64}" 
            alt="វឌ្ឍនា HOME SERVICES" 
            style="width: 70px; height: 70px; object-fit: contain; border-radius: 4px; display: block;" 
          />
          <div>
            <div style="font-size: 19px; font-weight: 700; color: #dc2626; line-height: 1.2;">
              វឌ្ឍនា HOME SERVICES
            </div>
            <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px; margin-top: 2px;">
              VADDHANA HOME SERVICES
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              ផលិត និងតម្លើងទ្វារ បង្អួច និងសម្ភារៈសំណង់គេហដ្ឋាន • Manufacturing & Installation
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
              Phnom Penh, Cambodia • Tel: (+855) 012 345 678 / 098 765 432 • info@vaddhana.com
            </div>
          </div>
        </div>

        <!-- Project & Customer Summary in Top Right Header -->
        <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.6;">
          <div><span style="color: #64748b;">Project:</span> <strong style="color: #0f172a;">${proj.project_name || '-'}</strong> <span style="color: #64748b;">(${shortId})</span></div>
          <div><span style="color: #64748b;">Customer:</span> <strong style="color: #0f172a;">${customerName}</strong></div>
          <div><span style="color: #64748b;">Location:</span> <strong style="color: #0f172a;">${proj.location || '-'}</strong></div>
          <div><span style="color: #64748b;">Date:</span> <strong style="color: #0f172a;">${printDate}</strong></div>
        </div>
      </div>

      <!-- Tasks and Milestones Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1.5px solid #dc2626;">
            <th style="padding: 7px 6px; width: 6%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">WBS</th>
            <th style="padding: 7px 8px; width: 34%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Task / Milestone Name</th>
            <th style="padding: 7px 8px; width: 14%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Start Date</th>
            <th style="padding: 7px 8px; width: 14%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Est. End Date</th>
            <th style="padding: 7px 6px; width: 10%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Progress</th>
            <th style="padding: 7px 6px; width: 10%; text-align: center; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Status</th>
            <th style="padding: 7px 8px; width: 12%; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${
            tasks.length > 0
              ? tasks
                  .map((t, idx) => {
                    const mainRow = `
                      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                        <td style="padding: 7px 6px; text-align: center; font-weight: 700; color: #0f172a;">${idx + 1}</td>
                        <td style="padding: 7px 8px; font-weight: 700; color: #0f172a;">${t.name}</td>
                        <td style="padding: 7px 8px; color: #334155;">${formatDateOnly(t.start_date)}</td>
                        <td style="padding: 7px 8px; color: #334155;">${formatDateOnly(t.est_end_date || t.end_date)}</td>
                        <td style="padding: 7px 6px; text-align: center; font-weight: 700; color: #0f172a;">-</td>
                        <td style="padding: 7px 6px; text-align: center;">
                          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 600; background: #e2e8f0; color: #1e293b;">
                            ${t.status}
                          </span>
                        </td>
                        <td style="padding: 7px 8px; color: #64748b; font-size: 10px;">${t.description || '-'}</td>
                      </tr>
                    `;
                    const subRows = (t.subtasks || []).map((st: any, sIdx: number) => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 5px 6px; text-align: center; color: #64748b; font-size: 10px;">${idx + 1}.${sIdx + 1}</td>
                        <td style="padding: 5px 8px 5px 24px; color: #334155;">${st.title}</td>
                        <td style="padding: 5px 8px; color: #64748b; font-size: 10.5px;">${formatDateOnly(st.start_date || t.start_date)}</td>
                        <td style="padding: 5px 8px; color: #64748b; font-size: 10.5px;">${formatDateOnly(st.est_end_date || t.est_end_date || t.end_date)}</td>
                        <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: ${st.progress === 100 ? '#059669' : '#0284c7'};">
                          ${st.progress || 0}%
                        </td>
                        <td style="padding: 5px 6px; text-align: center; font-size: 10px; color: #64748b;">
                          ${st.progress === 100 ? 'Completed' : st.progress > 0 ? 'In Progress' : 'Pending'}
                        </td>
                        <td style="padding: 5px 8px; color: #94a3b8; font-size: 9.5px;">${st.description || '-'}</td>
                      </tr>
                    `).join('');
                    return mainRow + subRows;
                  })
                  .join('')
              : `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td colspan="7" style="padding: 12px; text-align: center; color: #94a3b8;">
                    No tasks or milestones scheduled yet.
                  </td>
                </tr>
              `
          }
        </tbody>
      </table>

      <!-- Sign-off & Verification -->
      <div style="margin-top: 36px; display: flex; justify-content: space-between; gap: 24px; font-size: 11.5px; page-break-inside: avoid;">
        <div style="border-top: 1px solid #94a3b8; width: 30%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Prepared by:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">Site Supervisor / Lead</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 85%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>

        <div style="border-top: 1px solid #94a3b8; width: 30%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Verified & Approved by:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">Project Manager / QC</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 85%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>

        <div style="border-top: 1px solid #94a3b8; width: 30%; padding-top: 8px;">
          <div><strong style="color: #0f172a;">Customer Acceptance:</strong></div>
          <div style="font-size: 10.5px; color: #64748b;">Customer / Site Liaison</div>
          <div style="margin-top: 36px; border-bottom: 1px dashed #cbd5e1; width: 85%;"></div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">Signature & Date</div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Export Project Schedule to PDF using browser print iframe
 */
export const exportScheduleToPDF = (
  proj: Project,
  customerName: string,
  tasks: ProjectTask[]
): void => {
  const bodyContent = generateScheduleExportBody(proj, customerName, tasks);
  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${proj.project_name || 'Project'} - Schedule & Timeline (វឌ្ឍនា Home Services)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 210mm 297mm;
            margin: 10mm 12mm;
          }
          @media print {
            body { margin: 0; padding: 0; width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 300);
  }
};

/**
 * Export Project Schedule to Microsoft Word document
 */
export const exportScheduleToWord = (
  proj: Project,
  customerName: string,
  tasks: ProjectTask[]
): void => {
  const bodyContent = generateScheduleExportBody(proj, customerName, tasks);
  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${proj.project_name || 'Project'} - Schedule & Timeline</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 210mm 297mm;
            margin: 15mm 15mm 15mm 15mm;
            mso-page-orientation: portrait;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          body { font-family: 'Kantumruy Pro', 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; width: 210mm; margin: 0 auto; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          th { border-bottom: 2px solid #cbd5e1; color: #1e293b; padding: 6px 8px; text-align: left; font-size: 10pt; font-weight: bold; }
          td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${bodyContent}
        </div>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${(proj.project_name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_schedule_timeline.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Open formatted document report in a full browser tab for normal PDF viewing & printing
 */
export const viewDocumentInNewTab = (title: string, bodyContent: string): void => {
  const win = window.open('', '_blank');
  if (!win) return;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: 'Kantumruy Pro', 'Siemreap', 'Khmer OS Siemreap', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
          }
          .pdf-viewer-bar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background-color: #0f172a;
            color: #ffffff;
            padding: 10px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 1px solid #1e293b;
          }
          .pdf-viewer-title {
            font-size: 13.5px;
            font-weight: 600;
            color: #f8fafc;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .pdf-viewer-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }
          .pdf-btn {
            background-color: #0284c7;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 12.5px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.15s ease;
          }
          .pdf-btn:hover {
            background-color: #0369a1;
          }
          .pdf-btn-secondary {
            background-color: #334155;
            color: #f8fafc;
          }
          .pdf-btn-secondary:hover {
            background-color: #475569;
          }
          .pdf-page-container {
            width: 210mm;
            max-width: 100%;
            min-height: 297mm;
            margin: 24px auto;
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            box-sizing: border-box;
          }
          @media print {
            .no-print { display: none !important; }
            @page {
              size: 210mm 297mm;
              margin: 10mm 12mm;
            }
            body { background: #ffffff !important; padding: 0 !important; margin: 0 auto !important; width: 210mm !important; }
            .pdf-page-container {
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              border-radius: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="pdf-viewer-bar no-print">
          <div class="pdf-viewer-title">
            📄 ${title}
          </div>
          <div class="pdf-viewer-actions">
            <button type="button" class="pdf-btn" onclick="window.print()">
              🖨️ Print / Save as PDF
            </button>
            <button type="button" class="pdf-btn pdf-btn-secondary" onclick="window.close()">
              ✕ Close
            </button>
          </div>
        </div>

        <div class="pdf-page-container">
          ${bodyContent}
        </div>
      </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
};
