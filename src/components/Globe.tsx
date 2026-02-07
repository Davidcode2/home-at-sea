import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
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

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function greatCirclePoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 32
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t).normalize().multiplyScalar(1.02);
    points.push(point);
  }
  return points;
}

// Simplified continent outlines as lat/lng polygon vertices
// Each continent is an array of [lat, lng] pairs forming a closed polygon
const CONTINENT_OUTLINES: [number, number][][] = [
  // North America
  [
    [60, -140], [65, -168], [72, -162], [71, -155], [62, -148],
    [60, -140], [68, -135], [72, -120], [70, -95], [65, -85],
    [62, -78], [55, -65], [47, -53], [44, -60], [42, -66],
    [30, -82], [25, -80], [25, -90], [28, -96], [26, -98],
    [20, -105], [15, -92], [15, -87], [18, -88], [21, -87],
    [21, -90], [30, -115], [32, -117], [38, -122], [48, -124],
    [55, -133], [57, -136], [60, -140],
  ],
  // South America
  [
    [12, -70], [10, -62], [7, -52], [2, -50], [-5, -35],
    [-10, -37], [-15, -39], [-22, -41], [-28, -49], [-33, -53],
    [-40, -62], [-46, -66], [-52, -70], [-55, -68], [-55, -64],
    [-50, -73], [-42, -73], [-35, -72], [-27, -70], [-18, -70],
    [-15, -75], [-5, -80], [0, -78], [5, -77], [10, -72],
    [12, -70],
  ],
  // Europe
  [
    [36, -9], [38, -7], [43, -1], [43, 3], [46, 2],
    [48, -5], [49, -1], [51, 2], [53, 5], [54, 8],
    [57, 10], [58, 12], [56, 14], [55, 13], [54, 10],
    [54, 14], [55, 21], [60, 25], [64, 28], [68, 28],
    [70, 25], [70, 30], [60, 30], [56, 26], [52, 22],
    [48, 17], [46, 15], [44, 13], [42, 15], [40, 18],
    [38, 24], [36, 28], [41, 30], [42, 28], [41, 26],
    [38, 24], [36, 22], [35, 25], [36, 28],
    [40, 26], [39, 20], [38, 16], [37, 15],
    [36, 14], [38, 12], [41, 9], [44, 8],
    [43, 6], [42, 3], [40, 0], [37, -2], [36, -5], [36, -9],
  ],
  // Africa
  [
    [37, -1], [37, 10], [33, 12], [30, 10], [30, 32],
    [22, 36], [15, 42], [12, 44], [10, 50], [2, 45],
    [-1, 42], [-10, 40], [-15, 40], [-25, 35], [-34, 26],
    [-34, 18], [-30, 17], [-22, 14], [-17, 12], [-12, 14],
    [-6, 12], [0, 10], [5, 3], [5, -4], [7, -8],
    [4, -8], [5, -2], [6, 2], [10, -10],
    [12, -17], [15, -17], [20, -16], [25, -15],
    [28, -13], [32, -5], [35, -2], [37, -1],
  ],
  // Asia
  [
    [42, 28], [45, 40], [40, 45], [38, 48], [40, 52],
    [38, 56], [25, 57], [22, 60], [25, 65], [28, 68],
    [35, 72], [37, 76], [30, 78], [22, 72], [20, 75],
    [8, 77], [6, 80], [15, 80], [20, 88], [22, 90],
    [27, 88], [28, 97], [20, 100], [10, 99], [5, 103],
    [1, 104], [6, 110], [20, 110], [22, 114],
    [30, 122], [35, 129], [38, 130],
    [40, 132], [43, 132], [45, 142], [50, 143],
    [52, 140], [55, 135], [60, 143], [62, 150],
    [65, 170], [68, 180], [72, 180], [73, 140],
    [72, 130], [70, 90], [68, 68], [65, 60],
    [60, 55], [55, 50], [50, 40], [45, 35],
    [42, 28],
  ],
  // Australia
  [
    [-12, 130], [-14, 127], [-15, 124], [-22, 114],
    [-28, 114], [-32, 116], [-35, 118], [-35, 138],
    [-38, 146], [-38, 148], [-33, 152], [-28, 153],
    [-24, 150], [-20, 148], [-16, 146], [-14, 142],
    [-12, 136], [-12, 130],
  ],
  // Greenland
  [
    [60, -45], [65, -40], [70, -22], [76, -18],
    [80, -20], [82, -30], [82, -50], [78, -68],
    [73, -58], [68, -50], [62, -50], [60, -45],
  ],
];

function ContinentMesh({ outline }: { outline: [number, number][] }) {
  const geometry = useMemo(() => {
    const vertices: number[] = [];
    const center = latLngToVector3(
      outline.reduce((s, p) => s + p[0], 0) / outline.length,
      outline.reduce((s, p) => s + p[1], 0) / outline.length,
      1.02
    );

    // Fan triangulation from centroid
    for (let i = 0; i < outline.length - 1; i++) {
      const a = latLngToVector3(outline[i][0], outline[i][1], 1.02);
      const b = latLngToVector3(outline[i + 1][0], outline[i + 1][1], 1.02);
      vertices.push(center.x, center.y, center.z);
      vertices.push(a.x, a.y, a.z);
      vertices.push(b.x, b.y, b.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, [outline]);

  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial
        color="#5b9e6f"
        flatShading={true}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Earth() {
  return (
    <group>
      {/* Ocean sphere */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshLambertMaterial color="#4a90b8" transparent opacity={0.6} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.04, 48, 48]} />
        <meshBasicMaterial color="#87ceeb" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
      {/* Continents */}
      {CONTINENT_OUTLINES.map((outline, i) => (
        <ContinentMesh key={i} outline={outline} />
      ))}
    </group>
  );
}

function DestinationMarker({ stop, color }: { stop: Stop; color: string }) {
  const pos = latLngToVector3(stop.lat, stop.lng, 1.02);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={pos}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[hovered ? 0.03 : 0.02, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Pulse ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.025, 0.035, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {hovered && (
        <Text
          position={[0, 0.06, 0]}
          fontSize={0.035}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.003}
          outlineColor="#000000"
        >
          {stop.name}
        </Text>
      )}
    </group>
  );
}

function RouteLine({ stops, color }: { stops: Stop[]; color: string }) {
  const routePoints = useMemo(() => {
    const allPoints: THREE.Vector3[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const start = latLngToVector3(stops[i].lat, stops[i].lng, 1.02);
      const end = latLngToVector3(stops[i + 1].lat, stops[i + 1].lng, 1.02);
      allPoints.push(...greatCirclePoints(start, end, 32));
    }
    // Close the loop
    if (stops.length > 2) {
      const start = latLngToVector3(stops[stops.length - 1].lat, stops[stops.length - 1].lng, 1.02);
      const end = latLngToVector3(stops[0].lat, stops[0].lng, 1.02);
      allPoints.push(...greatCirclePoints(start, end, 32));
    }
    return allPoints;
  }, [stops]);

  if (routePoints.length === 0) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={routePoints.length}
          array={new Float32Array(routePoints.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.6} linewidth={2} />
    </line>
  );
}

function Scene({ stops, routeColor }: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#87ceeb" />
      <group ref={groupRef}>
        <Earth />
        <RouteLine stops={stops} color={routeColor || "#C5A572"} />
        {stops.map((stop, i) => (
          <DestinationMarker key={i} stop={stop} color={routeColor || "#C5A572"} />
        ))}
      </group>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minDistance={2.5}
        maxDistance={2.5}
        autoRotate={false}
      />
    </>
  );
}

export default function Globe({ stops, routeColor = "#C5A572" }: GlobeProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene stops={stops} routeColor={routeColor} />
      </Canvas>
    </div>
  );
}
