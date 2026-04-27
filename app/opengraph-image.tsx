import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BLOCKTRUST — Certification d'identité numérique ancrée sur Polygon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1f3c 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Halo décoratif cyan en haut à droite */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Halo décoratif gold en bas à gauche */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            background:
              "radial-gradient(circle, rgba(189,167,107,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* COLONNE GAUCHE */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
            zIndex: 1,
          }}
        >
          {/* Logo BLOCKTRUST */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "rgba(0,212,255,0.1)",
                border: "2px solid #00d4ff",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(0,212,255,0.3)",
              }}
            >
              <span
                style={{
                  color: "#00d4ff",
                  fontSize: "22px",
                  fontWeight: "bold",
                }}
              >
                BT
              </span>
            </div>
            <span
              style={{
                color: "#00d4ff",
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "6px",
              }}
            >
              BLOCKTRUST
            </span>
          </div>

          {/* Headline principal */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: "52px",
                fontWeight: "bold",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}
            >
              Protégez chaque
            </span>
            <span
              style={{
                color: "#ffffff",
                fontSize: "52px",
                fontWeight: "bold",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}
            >
              interaction de votre
            </span>
            <span
              style={{
                color: "#00d4ff",
                fontSize: "52px",
                fontWeight: "bold",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}
            >
              écosystème digital
            </span>
          </div>

          {/* Sous-titre */}
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "20px",
              lineHeight: "1.4",
            }}
          >
            Signatures ES256 · Ancrage Polygon · QR rotatif anti-fraude
          </span>

          {/* Stats row */}
          <div
            style={{ display: "flex", gap: "40px", marginTop: "8px" }}
          >
            {[
              { value: "99,9%", label: "Disponibilité" },
              { value: "256-bit", label: "Encryption" },
              { value: "Polygon", label: "Blockchain" },
            ].map((stat) => (
              <div
                key={stat.value}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    color: "#00d4ff",
                    fontSize: "22px",
                    fontWeight: "bold",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "13px",
                    letterSpacing: "1px",
                  }}
                >
                  {stat.label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE — Badge hexagonal premium */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "320px",
            height: "320px",
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
            marginLeft: "60px",
          }}
        >
          {/* Halo externe */}
          <div
            style={{
              position: "absolute",
              width: "300px",
              height: "300px",
              background:
                "radial-gradient(circle, rgba(0,212,255,0.2) 0%, transparent 70%)",
              borderRadius: "50%",
              display: "flex",
            }}
          />

          {/* Hexagone principal */}
          <div
            style={{
              width: "240px",
              height: "240px",
              background:
                "linear-gradient(135deg, #0d1f3c 0%, #060d1a 100%)",
              border: "3px solid #BDA76B",
              borderRadius: "30px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow:
                "0 0 60px rgba(0,212,255,0.25), inset 0 0 40px rgba(0,212,255,0.05)",
              position: "relative",
            }}
          >
            {/* Lignes circuit décoratives */}
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                right: "20px",
                height: "1px",
                background: "rgba(0,212,255,0.2)",
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                left: "20px",
                right: "20px",
                height: "1px",
                background: "rgba(0,212,255,0.2)",
                display: "flex",
              }}
            />

            {/* Bouclier central */}
            <div
              style={{
                width: "90px",
                height: "90px",
                background: "rgba(0,212,255,0.15)",
                border: "3px solid #00d4ff",
                borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 30px rgba(0,212,255,0.4)",
              }}
            >
              <span
                style={{
                  color: "#E8D08A",
                  fontSize: "38px",
                  fontWeight: "bold",
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
            </div>

            {/* Texte BLOCKTRUST */}
            <span
              style={{
                color: "#BDA76B",
                fontSize: "13px",
                fontWeight: "bold",
                letterSpacing: "4px",
              }}
            >
              BLOCKTRUST
            </span>

            {/* Texte VERIFIED */}
            <span
              style={{
                color: "rgba(0,212,255,0.6)",
                fontSize: "8px",
                letterSpacing: "2px",
              }}
            >
              VERIFIED · SECURE · ON-CHAIN
            </span>

            {/* Badge Polygon */}
            <div
              style={{
                background: "rgba(189,167,107,0.15)",
                border: "1px solid rgba(189,167,107,0.4)",
                borderRadius: "20px",
                padding: "4px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  color: "#BDA76B",
                  fontSize: "10px",
                  letterSpacing: "1px",
                }}
              >
                ⛓ POLYGON MAINNET
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
