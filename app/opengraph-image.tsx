import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BLOCKTRUST — Certification d'identité numérique ancrée sur Polygon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const stats = [
    { label: "99,9%", sub: "disponibilité" },
    { label: "256-bit", sub: "encryption" },
    { label: "Polygon", sub: "blockchain" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a1628",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #13243f 0%, #0a1628 50%, #06101f 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "rgba(0,212,255,0.12)",
                border: "2px solid #00d4ff",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00d4ff",
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "1px",
              }}
            >
              BT
            </div>
            <span
              style={{
                color: "#00d4ff",
                fontSize: "30px",
                fontWeight: 800,
                letterSpacing: "5px",
              }}
            >
              BLOCKTRUST
            </span>
          </div>

          <div
            style={{
              color: "#ffffff",
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Certifiez votre
          </div>
          <div
            style={{
              color: "#00d4ff",
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            identité digitale
          </div>

          <div
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "22px",
              marginTop: "12px",
            }}
          >
            Signatures ES256 · Ancrage Polygon · QR rotatif
          </div>

          <div
            style={{
              display: "flex",
              gap: "36px",
              marginTop: "28px",
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span
                  style={{
                    color: "#00d4ff",
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: "14px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: "300px",
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "240px",
              height: "240px",
              background: "linear-gradient(135deg, #13243f, #060d1a)",
              border: "3px solid #BDA76B",
              borderRadius: "28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow: "0 0 60px rgba(0,212,255,0.25)",
            }}
          >
            <div
              style={{
                width: "92px",
                height: "92px",
                background: "rgba(0,212,255,0.15)",
                border: "3px solid #00d4ff",
                borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E8D08A",
                fontSize: "44px",
                fontWeight: 900,
                boxShadow: "inset 0 0 24px rgba(0,168,204,0.45)",
              }}
            >
              ✓
            </div>
            <div
              style={{
                color: "#BDA76B",
                fontSize: "16px",
                letterSpacing: "4px",
                fontWeight: 800,
              }}
            >
              BLOCKTRUST
            </div>
            <div
              style={{
                color: "rgba(0,212,255,0.55)",
                fontSize: "10px",
                letterSpacing: "3px",
              }}
            >
              VERIFIED · SECURE · ON-CHAIN
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
