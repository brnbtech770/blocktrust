import QRCode from "qrcode";
import Image from "next/image";

type QRCodeProps = {
  url: string;
  size?: number;
  className?: string;
};

export default async function QRCodeImage({
  url,
  size = 200,
  className,
}: QRCodeProps) {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
  });

  return (
    <Image
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code de vérification"
      className={className}
      unoptimized
    />
  );
}
