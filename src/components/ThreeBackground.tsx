import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const ThreeBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const particleCount = prefersReducedMotion ? 20 : isMobile ? 35 : 75;
    const maxDistance = isMobile ? 45 : 65;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf0f7ff, 0.0035);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.z = 180;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    container.appendChild(renderer.domElement);

    // 2. Geometry: Particles
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    const spreadX = isMobile ? 160 : 260;
    const spreadY = isMobile ? 120 : 180;
    const spreadZ = 120;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;

      const speed = prefersReducedMotion ? 0.02 : (0.1 + Math.random() * 0.15) * (isMobile ? 0.6 : 1);
      velocities.push({
        x: (Math.random() - 0.5) * speed,
        y: (Math.random() - 0.5) * speed,
        z: (Math.random() - 0.5) * speed * 0.5,
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Material
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x0284c7, // Civic blue / sky cyan
      size: isMobile ? 2.8 : 3.5,
      transparent: true,
      opacity: 0.65,
      blending: THREE.NormalBlending,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMaterial);
    scene.add(particleSystem);

    // 3. Network connection lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
    });

    // Allocate max possible lines buffer
    const maxLineSegments = isMobile ? 120 : 350;
    const linePositions = new Float32Array(maxLineSegments * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineSegments = new THREE.LineSegments(lineGeo, lineMaterial);
    scene.add(lineSegments);

    // 4. Subtle slowly rotating decorative geometric ring
    let torusMesh: THREE.Mesh | null = null;
    if (!isMobile) {
      const torusGeo = new THREE.TorusGeometry(85, 0.4, 8, 48);
      const torusMat = new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.28,
        wireframe: true,
      });
      torusMesh = new THREE.Mesh(torusGeo, torusMat);
      torusMesh.position.set(40, -20, -50);
      scene.add(torusMesh);
    }

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animationFrameId: number;
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      if (!prefersReducedMotion) {

        // Update particle positions
        const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          posArray[i3] += velocities[i].x;
          posArray[i3 + 1] += velocities[i].y;
          posArray[i3 + 2] += velocities[i].z;

          // Wrap edges
          if (posArray[i3] > spreadX / 2) posArray[i3] = -spreadX / 2;
          if (posArray[i3] < -spreadX / 2) posArray[i3] = spreadX / 2;
          if (posArray[i3 + 1] > spreadY / 2) posArray[i3] = -spreadY / 2;
          if (posArray[i3 + 1] < -spreadY / 2) posArray[i3] = spreadY / 2;
          if (posArray[i3 + 2] > spreadZ / 2) posArray[i3] = -spreadZ / 2;
          if (posArray[i3 + 2] < -spreadZ / 2) posArray[i3] = spreadZ / 2;
        }
        posAttr.needsUpdate = true;

        // Update connecting lines
        let lineVertexCount = 0;
        const lineAttr = lineGeo.getAttribute('position') as THREE.BufferAttribute;
        const lineArray = lineAttr.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          for (let j = i + 1; j < particleCount; j++) {
            const dx = posArray[i * 3] - posArray[j * 3];
            const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
            const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < maxDistance && lineVertexCount < maxLineSegments * 2) {
              const baseIndex = lineVertexCount * 3;
              lineArray[baseIndex] = posArray[i * 3];
              lineArray[baseIndex + 1] = posArray[i * 3 + 1];
              lineArray[baseIndex + 2] = posArray[i * 3 + 2];

              lineArray[baseIndex + 3] = posArray[j * 3];
              lineArray[baseIndex + 4] = posArray[j * 3 + 1];
              lineArray[baseIndex + 5] = posArray[j * 3 + 2];

              lineVertexCount += 2;
            }
          }
        }
        lineGeo.setDrawRange(0, lineVertexCount);
        lineAttr.needsUpdate = true;

        if (torusMesh) {
          torusMesh.rotation.x += 0.001;
          torusMesh.rotation.y += 0.0015;
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      particleGeo.dispose();
      particleMaterial.dispose();
      lineGeo.dispose();
      lineMaterial.dispose();
      if (torusMesh) {
        torusMesh.geometry.dispose();
        (torusMesh.material as THREE.Material).dispose();
      }
      renderer.dispose();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
};
