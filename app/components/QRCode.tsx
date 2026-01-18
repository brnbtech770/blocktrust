"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QRCodeProps = {
  url: string;
  size?: number;
  className?: string;
};

export default function QRCodeImage({ url, size = 200, className }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: size, margin: 2 })
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) {
    return <div className="bg-gray-200 animate-pulse rounded" style={{ width: size, height: size }} />;
  }

  return <img src={dataUrl} width={size} height={size} alt="QR code de vérification" className={className} />;
}
