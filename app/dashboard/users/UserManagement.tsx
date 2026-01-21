"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  status: string;
  plan: string;
  createdAt: string;
}

export default function UserManagement({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (userId: string, newStatus: string) => {
    setLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });

      if (res.ok) {
        setUsers(
          users.map((user) => (user.id === userId ? { ...user, status: newStatus } : user))
        );
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
    setLoading(null);
  };

  const pendingUsers = users.filter((user) => user.status === "PENDING");
  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const suspendedUsers = users.filter((user) => user.status === "SUSPENDED");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-yellow-400 mb-4">
          En attente de validation ({pendingUsers.length})
        </h2>
        {pendingUsers.length === 0 ? (
          <p className="text-gray-400">Aucune demande en attente</p>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Nom</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Entreprise</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Date</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-700">
                    <td className="px-4 py-3 text-white">{user.name}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3 text-gray-300">{user.company || "-"}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(user.id, "ACTIVE")}
                          disabled={loading === user.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {loading === user.id ? "..." : "Valider"}
                        </button>
                        <button
                          onClick={() => updateStatus(user.id, "SUSPENDED")}
                          disabled={loading === user.id}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-green-400 mb-4">
          Utilisateurs actifs ({activeUsers.length})
        </h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-gray-300">Nom</th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">Email</th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">Plan</th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr key={user.id} className="border-t border-gray-700">
                  <td className="px-4 py-3 text-white">{user.name}</td>
                  <td className="px-4 py-3 text-gray-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded">
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateStatus(user.id, "SUSPENDED")}
                      disabled={loading === user.id}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Suspendre
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {suspendedUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            Utilisateurs suspendus ({suspendedUsers.length})
          </h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Nom</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Plan</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suspendedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-700">
                    <td className="px-4 py-3 text-white">{user.name}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded">
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateStatus(user.id, "ACTIVE")}
                        disabled={loading === user.id}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Réactiver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
