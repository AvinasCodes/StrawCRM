import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function HeroScene() {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) { setWebglSupported(false); return; }
    } catch { setWebglSupported(false); return; }

    const container = mountRef.current;
    if (!container) return;

    let width = Math.max(container.clientWidth || 0, 200);
    let height = Math.max(container.clientHeight || 0, 200);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    /* ── Torus ring 1 — electric blue ── */
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.018, 16, 160),
      new THREE.MeshBasicMaterial({ color: 0x2385ff, transparent: true, opacity: 0.65 })
    );
    ring1.position.set(0, 0, -1.5);
    ring1.rotation.set(0.2, 0.2, 0);
    group.add(ring1);

    /* ── Torus ring 2 — cyan ── */
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.012, 12, 160),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 })
    );
    ring2.position.set(0, 0, -1.4);
    ring2.rotation.set(1.25, 0, 0);
    group.add(ring2);

    /* ── Floating icosahedra ── */
    const ico1 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshStandardMaterial({ color: 0x0b63f6, emissive: 0x0b63f6, emissiveIntensity: 1.5, metalness: 0.5, roughness: 0.2 })
    );
    ico1.position.set(2.8, 1.6, -0.6);
    group.add(ico1);

    const ico2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 1),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.2 })
    );
    ico2.position.set(-2.8, -1.3, -0.4);
    group.add(ico2);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const pl1 = new THREE.PointLight(0x0b63f6, 18, 20);
    pl1.position.set(4, 3, 5);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x22d3ee, 9, 20);
    pl2.position.set(-4, -2, 2);
    scene.add(pl2);

    /* ── Mouse parallax ── */
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    const onMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.07;
      targetY = -(e.clientY / window.innerHeight - 0.5) * 0.035;
    };
    window.addEventListener('mousemove', onMove);

    /* ── Animation ── */
    let reqId;
    let isDisposed = false;
    const startTime = performance.now();

    const animate = () => {
      if (isDisposed) return;
      reqId = requestAnimationFrame(animate);
      if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return;

      const t = (performance.now() - startTime) * 0.001;

      // Smooth mouse follow
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, currentX, 0.04);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, currentY, 0.04);

      // Floating icosahedra bob
      ico1.position.y = 1.6 + Math.sin(t * 1.2) * 0.12;
      ico1.rotation.x += 0.01;
      ico1.rotation.y += 0.007;

      ico2.position.y = -1.3 + Math.sin(t * 0.9 + 1) * 0.15;
      ico2.rotation.x += 0.008;
      ico2.rotation.z += 0.012;

      // Slow ring drift
      ring2.rotation.z += 0.0015;

      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ── */
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposed || !container) return;
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 10 && h > 10) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMove);
      if (renderer.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  if (!webglSupported) return <div className="w-full h-full" />;

  return <div ref={mountRef} className="w-full h-full" aria-label="StrawCRM 3D orbit scene" />;
}
