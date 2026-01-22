export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: { jti: string };
  searchParams: { h?: string };
}) {
  const { jti } = params;
  const { h } = searchParams;

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://blocktrust.tech"}/api/v2/verify/${jti}${h ? `?h=${h}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  const result = await res.json();

  const isValid = result.verdict === "VALID";
  const isFraud = result.verdict === "FRAUD_ALERT";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isValid ? "#10b981" : isFraud ? "#ef4444" : "#6b7280",
        color: "white",
        fontFamily: "system-ui, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "400px",
          textAlign: "center",
          color: "#111",
        }}
      >
        {isValid && (
          <>
            <div style={{ fontSize: "60px" }}>✅</div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", marginTop: "16px" }}>
              Certificat Authentique
            </h1>
            <p style={{ color: "#666", marginTop: "8px" }}>Vérifié par BlockTrust</p>
            <div
              style={{
                marginTop: "20px",
                textAlign: "left",
                backgroundColor: "#f9f9f9",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <p>
                <strong>Entité :</strong> {result.entity?.name}
              </p>
              <p>
                <strong>Type :</strong> {result.entity?.type}
              </p>
              <p>
                <strong>Niveau :</strong> {result.entity?.validationLevel}
              </p>
            </div>
          </>
        )}
        {isFraud && (
          <>
            <div style={{ fontSize: "60px" }}>⚠️</div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "16px",
                color: "#dc2626",
              }}
            >
              ALERTE FRAUDE
            </h1>
            <p style={{ color: "#666", marginTop: "8px" }}>Ce lien a été falsifié !</p>
            <p style={{ color: "#888", marginTop: "16px", fontSize: "14px" }}>
              Ne faites pas confiance au contenu source.
            </p>
          </>
        )}
        {!isValid && !isFraud && (
          <>
            <div style={{ fontSize: "60px" }}>❓</div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", marginTop: "16px" }}>
              {result.verdict || "Erreur"}
            </h1>
            <p style={{ color: "#666", marginTop: "8px" }}>
              {result.verdict === "NOT_FOUND"
                ? "Certificat non trouvé"
                : result.verdict === "EXPIRED"
                  ? "Certificat expiré"
                  : result.verdict === "REVOKED"
                    ? "Certificat révoqué"
                    : "Une erreur est survenue"}
            </p>
          </>
        )}

        <a
          href="https://blocktrust.tech"
          style={{
            display: "block",
            marginTop: "24px",
            color: "#3b82f6",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          blocktrust.tech
        </a>
      </div>
    </div>
  );
}
