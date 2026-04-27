import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BLOCKTRUST — Certification d'identité numérique ancrée sur Polygon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITE_URL = "https://blocktrust.tech";

export default function OGImage() {
  const badgeUrl = `${SITE_URL}/badge-og.svg`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 80px",
          background:
            "linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1f3c 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* COLONNE GAUCHE */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                marginRight: "18px",
                background: "rgba(0,212,255,0.12)",
                border: "2px solid #00d4ff",
                borderRadius: "12px",
                color: "#00d4ff",
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              BT
            </div>
            <div
              style={{
                display: "flex",
                color: "#00d4ff",
                fontSize: "34px",
                fontWeight: 800,
                letterSpacing: "6px",
              }}
            >
              BLOCKTRUST
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: "54px",
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Protégez chaque
          </div>
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: "54px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginTop: "4px",
            }}
          >
            interaction de votre
          </div>
          <div
            style={{
              display: "flex",
              color: "#00d4ff",
              fontSize: "54px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginTop: "4px",
            }}
          >
            écosystème digital
          </div>

          {/* Sous-titre */}
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.65)",
              fontSize: "22px",
              marginTop: "24px",
            }}
          >
            Signatures ES256 · Ancrage Polygon · QR rotatif anti-fraude
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              marginTop: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: "44px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#00d4ff",
                  fontSize: "24px",
                  fontWeight: 800,
                }}
              >
                ES256
              </div>
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  marginTop: "4px",
                }}
              >
                CRYPTOGRAPHIE
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: "44px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#00d4ff",
                  fontSize: "24px",
                  fontWeight: 800,
                }}
              >
                256-bit
              </div>
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  marginTop: "4px",
                }}
              >
                ENCRYPTION
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#00d4ff",
                  fontSize: "24px",
                  fontWeight: 800,
                }}
              >
                Polygon
              </div>
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  marginTop: "4px",
                }}
              >
                BLOCKCHAIN
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE — Badge SVG (image fixe) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "40px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgeUrl}
            alt="BlockTrust Badge"
            width={380}
            height={380}
            style={{ display: "block" }}
          />

          {/* Pill Polygon Mainnet */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "16px",
              padding: "8px 18px",
              background: "rgba(189,167,107,0.15)",
              border: "1px solid rgba(189,167,107,0.5)",
              borderRadius: "20px",
              color: "#E8D08A",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            POLYGON MAINNET
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
