import QRCode from "qrcode";

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
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code de vérification"
      className={className}
    />
  );
}
