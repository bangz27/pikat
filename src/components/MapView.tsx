import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { AddressPoint, LatLng } from '../domain/types';
import { layerOf } from '../domain/layers';
import { formatAddress, STATUS_LABEL } from '../domain/labels';
import type { TileProviderConfig } from '../config/tiles';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../config/tiles';

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(kind: string): L.DivIcon {
  let icon = iconCache.get(kind);
  if (!icon) {
    icon = L.divIcon({ className: '', html: `<span class="pin pin-${kind}"></span>`, iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -20] });
    iconCache.set(kind, icon);
  }
  return icon;
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ target }: { target: { pos: LatLng; zoom: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.pos.lat, target.pos.lng], Math.max(map.getZoom(), target.zoom), { duration: 0.8 });
  }, [target, map]);
  return null;
}

function LocateButton({ onLocated, onError }: { onLocated: (p: LatLng) => void; onError: (msg: string) => void }) {
  const map = useMap();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  const locate = () => {
    if (!('geolocation' in navigator)) return onError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.flyTo([p.lat, p.lng], 17);
        onLocated(p);
      },
      (err) => onError(err.code === err.PERMISSION_DENIED ? 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง' : 'ระบุตำแหน่งไม่สำเร็จ'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <button ref={ref} className="map-fab locate" onClick={locate} aria-label="ตำแหน่งของฉัน" title="ตำแหน่งของฉัน">
      ◎
    </button>
  );
}

function ResizeWatcher({ dep }: { dep: unknown }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [dep, map]);
  return null;
}

interface Props {
  tiles: TileProviderConfig;
  showBase: boolean;
  points: AddressPoint[];
  selectedId: string | null;
  picked: LatLng | null;
  flyTarget: { pos: LatLng; zoom: number; key: number } | null;
  layoutKey: unknown;
  onMapClick: (p: LatLng) => void;
  onSelectPoint: (p: AddressPoint) => void;
  onLocated: (p: LatLng) => void;
  onError: (msg: string) => void;
}

export function MapView(props: Props) {
  const { tiles, showBase, points, selectedId, picked, flyTarget, layoutKey, onMapClick, onSelectPoint, onLocated, onError } = props;
  const markers = useMemo(
    () =>
      points.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={pinIcon(`${layerOf(p)}${p.id === selectedId ? ' pin-selected' : ''}`)}
          eventHandlers={{ click: () => onSelectPoint(p) }}
        >
          <Popup>
            <strong>{formatAddress(p)}</strong>
            <br />
            {p.landmark && <>จุดสังเกต: {p.landmark}<br /></>}
            {STATUS_LABEL[p.verification_status]} · {p.source ?? 'ไม่ระบุแหล่ง'}
            <br />
            <small>{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</small>
          </Popup>
        </Marker>
      )),
    [points, selectedId, onSelectPoint],
  );

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="map" zoomControl worldCopyJump>
      {showBase && <TileLayer url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />}
      <ClickHandler onClick={onMapClick} />
      <FlyTo target={flyTarget} />
      <ResizeWatcher dep={layoutKey} />
      {markers}
      {picked && (
        <Marker position={[picked.lat, picked.lng]} icon={pinIcon('picked')} interactive={false} />
      )}
      <LocateButton onLocated={onLocated} onError={onError} />
    </MapContainer>
  );
}
