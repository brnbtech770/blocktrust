import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BLOCKTRUST — Verified · Secure · On-Chain · Polygon Mainnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const badgeData = await fetch(
    new URL("./og-badge-hex.png", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1f3c 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          // @ts-expect-error ImageResponse accepts ArrayBuffer for src
          src={badgeData}
          alt="BLOCKTRUST"
          width={680}
          height={630}
          style={{
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
