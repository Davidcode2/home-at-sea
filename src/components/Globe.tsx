import { useEffect, useRef, useMemo } from "react";
import GlobeGL from "react-globe.gl";
import * as THREE from "three";

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface GlobeProps {
  stops: Stop[];
  routeColor?: string;
}

const CLOUDS_IMG_URL =
  "https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png";

export default function Globe({ stops, routeColor = "#C5A572" }: GlobeProps) {
  const globeRef = useRef<any>(null);

  const arcsData = useMemo(() => {
    const arcs = [];
    for (let i = 0; i < stops.length - 1; i++) {
      arcs.push({
        startLat: stops[i].lat,
        startLng: stops[i].lng,
        endLat: stops[i + 1].lat,
        endLng: stops[i + 1].lng,
      });
    }
    if (stops.length > 2) {
      arcs.push({
        startLat: stops[stops.length - 1].lat,
        startLng: stops[stops.length - 1].lng,
        endLat: stops[0].lat,
        endLng: stops[0].lng,
      });
    }
    return arcs;
  }, [stops]);

  const labelsData = useMemo(
    () => stops.map((s) => ({ lat: s.lat, lng: s.lng, text: s.name })),
    [stops]
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = false;

    // Add clouds
    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {
      const globeRadius = globe.getGlobeRadius();
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * 1.004, 75, 75),
        new THREE.MeshPhongMaterial({
          map: cloudsTexture,
          transparent: true,
        })
      );
      globe.scene().add(clouds);

      (function rotateClouds() {
        clouds.rotation.y += -0.006 * (Math.PI / 180);
        requestAnimationFrame(rotateClouds);
      })();
    });
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GlobeGL
        ref={globeRef}
        animateIn={false}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
        arcsData={arcsData}
        arcColor={() => routeColor}
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize={1.2}
        labelDotRadius={0.4}
        labelColor={() => routeColor}
        labelResolution={2}
        labelAltitude={0.01}
      />
    </div>
  );
}
