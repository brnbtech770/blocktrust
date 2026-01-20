export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
        <div className="text-4xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
        <p className="text-gray-600 mb-6">
          Votre compte ne dispose pas des droits nécessaires pour accéder à cette page.
        </p>
        <a
          href="/login"
          className="inline-block bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800"
        >
          Retour à la connexion
        </a>
      </div>
    </div>
  );
}
