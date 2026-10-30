import { useEffect, useRef } from "react";
import * as THREE from "three";

const SHEET_COUNT = 14;
const PARTICLE_COUNT = 420;

// Screen areas (normalised -1..1) where sheets may float without covering the hero text.
const WIDE_ZONES = [
  { weight: 0.5, x: [0.12, 0.95], y: [-0.9, 0.9] },
  { weight: 0.2, x: [-0.95, 0.05], y: [0.78, 0.95] },
  { weight: 0.2, x: [-0.95, 0.05], y: [-0.95, -0.82] },
  { weight: 0.1, x: [-1.02, -0.9], y: [-0.7, 0.7] },
];
const NARROW_ZONES = [
  { weight: 0.5, x: [-1.08, -0.92], y: [-0.9, 0.9] },
  { weight: 0.5, x: [0.92, 1.08], y: [-0.9, 0.9] },
];

function pickZone(zones, roll) {
  let total = 0;
  for (const zone of zones) {
    total += zone.weight;
    if (roll <= total) {
      return zone;
    }
  }
  return zones[zones.length - 1];
}

const lerp = (range, t) => range[0] + (range[1] - range[0]) * t;

/** Floating paper sheets and a soft particle field behind the landing hero. */
export default function HeroScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      // No WebGL: the hero still looks fine without the scene.
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const light = new THREE.DirectionalLight(0xffffff, 1.4);
    light.position.set(4, 6, 8);
    scene.add(light);

    // Paper sheets: a white page, a blue outline and a few "text lines".
    const sheetGeometry = new THREE.PlaneGeometry(1, 1.32);
    const edgeGeometry = new THREE.EdgesGeometry(sheetGeometry);
    const lineGeometry = new THREE.PlaneGeometry(0.62, 0.05);
    const sheetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.35 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.8 });
    const ruleMaterial = new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.7 });

    const sheets = [];
    for (let index = 0; index < SHEET_COUNT; index += 1) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(sheetGeometry, sheetMaterial));
      group.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

      const rule = new THREE.Mesh(lineGeometry, ruleMaterial);
      rule.scale.set(1.3, 0.5, 1);
      rule.position.set(0, 0.38, 0.001);
      group.add(rule);
      for (let line = 0; line < 4; line += 1) {
        const text = new THREE.Mesh(lineGeometry, lineMaterial);
        text.scale.x = line === 3 ? 0.6 : 1;
        text.position.set(line === 3 ? -0.12 : 0, 0.18 - line * 0.15, 0.001);
        group.add(text);
      }

      // The actual position depends on the screen size and is set in placeSheets().
      group.position.z = -2 - Math.random() * 6;
      group.rotation.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.6);
      const scale = 0.7 + Math.random() * 0.6;
      group.scale.setScalar(scale);
      group.userData = {
        baseY: 0,
        zoneRoll: Math.random(),
        u: Math.random(),
        v: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.35,
        spin: (Math.random() - 0.5) * 0.25,
      };
      scene.add(group);
      sheets.push(group);
    }

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 26;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[index * 3 + 2] = -Math.random() * 12;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x2563eb,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    function handlePointerMove(event) {
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
    }

    function resize() {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) {
        return;
      }
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      // On narrow screens pull back so the sheets do not crowd the text.
      camera.position.z = clientWidth < 700 ? 16 : 12;
      camera.updateProjectionMatrix();
      placeSheets(clientWidth < 900 ? NARROW_ZONES : WIDE_ZONES);
    }

    function placeSheets(zones) {
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      sheets.forEach((sheet) => {
        const { zoneRoll, u, v } = sheet.userData;
        const zone = pickZone(zones, zoneRoll);
        const distance = camera.position.z - sheet.position.z;
        const halfHeight = distance * Math.tan(halfFov);
        sheet.position.x = lerp(zone.x, u) * halfHeight * camera.aspect;
        sheet.userData.baseY = lerp(zone.y, v) * halfHeight;
        sheet.position.y = sheet.userData.baseY;
      });
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let visible = true;

    function renderFrame() {
      const elapsed = clock.getElapsedTime();
      sheets.forEach((sheet) => {
        const { baseY, phase, speed, spin } = sheet.userData;
        sheet.position.y = baseY + Math.sin(elapsed * speed + phase) * 0.35;
        sheet.rotation.y += spin * 0.01;
        sheet.rotation.x = Math.sin(elapsed * speed * 0.6 + phase) * 0.25;
      });
      particles.rotation.y = elapsed * 0.015;
      camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.8 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -4);
      renderer.render(scene, camera);
    }

    function loop() {
      frameId = 0;
      if (!visible || document.hidden) {
        return;
      }
      renderFrame();
      frameId = requestAnimationFrame(loop);
    }

    function start() {
      if (!reduceMotion && !frameId) {
        frameId = requestAnimationFrame(loop);
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) {
        renderFrame();
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        start();
      }
    });
    intersectionObserver.observe(container);

    function handleVisibilityChange() {
      if (!document.hidden) {
        start();
      }
    }

    resize();
    renderFrame();
    start();
    if (!reduceMotion) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      [sheetGeometry, edgeGeometry, lineGeometry, particleGeometry].forEach((item) => item.dispose());
      [sheetMaterial, edgeMaterial, lineMaterial, ruleMaterial, particleMaterial].forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="landing-scene" aria-hidden="true" />;
}
