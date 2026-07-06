"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Load marker icons from the CDN instead of bundling local image assets —
// avoids bundler-specific static asset quirks with Leaflet's default icons.
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface MapLead {
  id: string;
  name: string;
  category: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
}

function RecenterMap({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 11);
    }
  }, [center, map]);
  return null;
}

export default function GermanyMap({
  leads,
  center,
  radiusKm,
}: {
  leads: MapLead[];
  center: [number, number] | null;
  radiusKm: number | null;
}) {
  const validLeads = leads.filter(
    (l): l is MapLead & { lat: number; lng: number } =>
      typeof l.lat === "number" && typeof l.lng === "number"
  );

  return (
    <MapContainer
      center={[51.1657, 10.4515]}
      zoom={6}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />
      {center && radiusKm && (
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#6366f1", fillOpacity: 0.08 }}
        />
      )}
      <MarkerClusterGroup chunkedLoading>
        {validLeads.map((lead) => (
          <Marker key={lead.id} position={[lead.lat, lead.lng]}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>{lead.name}</strong>
                <br />
                {lead.category || "—"}
                <br />
                {lead.email || "—"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
