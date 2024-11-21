// Map.ts

import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export const MapUI: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const position: LatLngExpression = [0, 0];

  return (
    <div id="map-ui-container">
      <MapContainer
        center={position}
        zoom={0}
        minZoom={0}
        maxZoom={16}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer url={apiUrl + "/tiles/{x}/{y}/{z}.png"} />
        <Marker position={position}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
