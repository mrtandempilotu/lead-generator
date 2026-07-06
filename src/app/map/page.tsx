"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const GermanyMap = dynamic(() => import("@/components/GermanyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
      Harita yükleniyor...
    </div>
  ),
});

interface LeadRow {
  id: string;
  name: string;
  category: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
}

const CITY_COORDS: Record<string, [number, number]> = {
  Berlin: [52.52, 13.405],
  München: [48.1351, 11.582],
  Hamburg: [53.5511, 9.9937],
  Köln: [50.9375, 6.9603],
  Frankfurt: [50.1109, 8.6821],
  Stuttgart: [48.7758, 9.1829],
  Düsseldorf: [51.2277, 6.7735],
  Dortmund: [51.5136, 7.4653],
  Essen: [51.4556, 7.0116],
  Leipzig: [51.3397, 12.3731],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default function MapPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Bilinmeyen bir hata oluştu.");
          return;
        }
        setLeads(data.leads);
      } catch {
        setError("Lead'ler yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const center = city ? CITY_COORDS[city] ?? null : null;

  const filteredLeads = useMemo(() => {
    if (!center) return leads;
    return leads.filter((l) => {
      if (typeof l.lat !== "number" || typeof l.lng !== "number") return false;
      return haversineKm(center[0], center[1], l.lat, l.lng) <= radiusKm;
    });
  }, [leads, center, radiusKm]);

  const withCoords = leads.filter(
    (l) => typeof l.lat === "number" && typeof l.lng === "number"
  ).length;

  return (
    <main className="mx-auto flex max-w-6xl flex-col px-6 py-12">
      <header className="mb-6 animate-fade-in-up">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Harita
        </h1>
        <p className="mt-2 text-zinc-400">
          Kayıtlı lead&apos;leri Almanya haritasında görün, bir şehir merkezi
          ve yarıçap seçerek yakınlardaki firmaları filtreleyin. ({withCoords}
          /{leads.length} lead&apos;de konum bilgisi var.)
        </p>
      </header>

      <div className="glass-card mb-4 flex flex-wrap items-center gap-3 animate-fade-in-up rounded-2xl p-4">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
        >
          <option value="">Tüm Almanya</option>
          {Object.keys(CITY_COORDS).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {city && (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Yarıçap (km)
            <input
              type="number"
              min={5}
              max={300}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white outline-none focus:border-indigo-400"
            />
          </label>
        )}
        {city && (
          <span className="text-xs text-zinc-500">
            {filteredLeads.length} firma bu yarıçapta
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-zinc-400">Yükleniyor...</p>}
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="glass-card h-[600px] animate-fade-in-up overflow-hidden rounded-2xl">
          <GermanyMap
            leads={filteredLeads}
            center={center}
            radiusKm={city ? radiusKm : null}
          />
        </div>
      )}
    </main>
  );
}
