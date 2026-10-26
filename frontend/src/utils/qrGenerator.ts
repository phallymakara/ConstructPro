import QRCode from 'qrcode';

/**
 * Generate an SVG string representation of a QR Code.
 */
export async function generateQrSvg(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    width: options?.width || 180,
    margin: options?.margin ?? 1,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate a PNG Data URL representation of a QR Code for canvas or img elements.
 */
export async function generateQrDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options?.width || 200,
    margin: options?.margin ?? 1,
    errorCorrectionLevel: 'M',
  });
}
