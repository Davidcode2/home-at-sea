import { useEffect, useRef, useMemo, useState, useCallback } from "react";
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

/* Route color palette - gold variations for visibility on globe */
const ROUTE_COLORS = [
  "#D4B896", // --color-route-pale: bright gold for dark backgrounds
  "#E5C07B", // --color-route-bright: vivid gold
  "#D4AF37", // --color-route-vivid: classic gold
  "#C5A572", // --color-route-primary: warm gold
  "#B8944F", // --color-route-deep: deeper gold
];

const LABEL_COLOR = "#D4B896"; // Pale gold for labels (high contrast)

export default function Globe({ stops, routeColor }: GlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setSize((prev) =>
        prev.width !== width || prev.height !== height
          ? { width, height }
          : prev
      );
    }
  }, []);

  useEffect(() => {
    measureContainer();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measureContainer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureContainer]);

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

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Move camera closer so globe fills more of the container
    globe.pointOfView({ altitude: 1.7 }, 0);

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = false;

    // Block wheel events on the canvas to fully prevent zoom
    const renderer = globe.renderer();
    const canvas = renderer.domElement;
    canvas.addEventListener("wheel", (e: Event) => e.preventDefault(), { passive: false });

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
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {size.width > 0 && size.height > 0 && <GlobeGL
        ref={globeRef}
        width={size.width}
        height={size.height}
        animateIn={false}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
        arcsData={arcsData}
        arcColor={(d: object, i: number) => routeColor || ROUTE_COLORS[i % ROUTE_COLORS.length]}
        arcAltitude={0.1}
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
        labelColor={() => LABEL_COLOR}
        labelResolution={2}
        labelAltitude={0.01}
        onGlobeReady={handleGlobeReady}
        onZoom={() => { }}
      />}
    </div>
  );
}
