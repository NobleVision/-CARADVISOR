import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "./gsap";
import { HeroStaticFallback } from "./HeroStaticFallback";
import { buildCarPointCloud } from "./three/buildCarPointCloud";
import { PARTICLE_FRAGMENT, PARTICLE_VERTEX } from "./three/particleShaders";

export type ParticleCarSceneHandle = {
  /** 0..1 hero scroll progress — drives the particle dispersal. */
  setScroll(progress: number): void;
};

type ParticleCarSceneProps = {
  /** Called once after the first rendered frame (e.g. to ScrollTrigger.refresh()). */
  onReady?: () => void;
};

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * ~14k champagne-gold particles assemble from a scattered field into a
 * fastback silhouette, idle with a shimmer, parallax with the pointer, and
 * disperse as the user scrolls into the story. Plain three.js (no fiber),
 * fully disposed on unmount; degrades to the static fallback when WebGL is
 * unavailable, the context is lost, or the user prefers reduced motion.
 */
const ParticleCarScene = forwardRef<ParticleCarSceneHandle, ParticleCarSceneProps>(
  function ParticleCarScene({ onReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const uniformsRef = useRef<{ uScroll: { value: number } } | null>(null);
    const reducedMotion = usePrefersReducedMotion();
    const [failed, setFailed] = useState(false);
    const [supported] = useState(webglAvailable);

    useImperativeHandle(
      ref,
      () => ({
        setScroll(progress: number) {
          if (uniformsRef.current) uniformsRef.current.uScroll.value = progress;
        },
      }),
      [],
    );

    const active = supported && !failed && !reducedMotion;

    useEffect(() => {
      if (!active) return;
      const container = containerRef.current;
      if (!container) return;

      // ── Scene graph ──
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
      camera.position.set(0, 0.15, 6.2);

      const { positions, scatter, rand } = buildCarPointCloud(14000);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
      geometry.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const uniforms = {
        uProgress: { value: 0 },
        uScroll: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 11 },
        uPixelRatio: { value: pixelRatio },
      };
      uniformsRef.current = uniforms;

      const material = new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geometry, material);
      const group = new THREE.Group();
      group.add(points);
      group.position.y = -0.65; // car spans y 0..1.31 — optically center it
      const baseRotX = 0.07;
      const baseRotY = -0.55; // three-quarter view
      group.rotation.set(baseRotX, baseRotY, 0);
      scene.add(group);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(pixelRatio);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";

      const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(container);

      // ── Assembly tween ──
      const assemble = gsap.to(uniforms.uProgress, {
        value: 1,
        duration: 2.4,
        ease: "power3.out",
        delay: 0.25,
      });

      // ── Pointer parallax (window-level: the canvas never takes pointer events) ──
      const target = { x: 0, y: 0 };
      const current = { x: 0, y: 0 };
      const onPointerMove = (e: PointerEvent) => {
        target.x = e.clientX / window.innerWidth - 0.5;
        target.y = e.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      // ── Render loop, paused off-screen and on hidden tabs ──
      const clock = new THREE.Clock();
      let elapsed = 0;
      let raf = 0;
      let inView = true;
      let pageVisible = document.visibilityState === "visible";
      let readyFired = false;

      const renderFrame = () => {
        raf = 0;
        if (!(inView && pageVisible)) return;
        const delta = Math.min(clock.getDelta(), 0.05);
        elapsed += delta;
        uniforms.uTime.value = elapsed;

        current.x += (target.x - current.x) * 0.05;
        current.y += (target.y - current.y) * 0.05;
        group.rotation.y = baseRotY + current.x * 0.24 + Math.sin(elapsed * 0.15) * 0.04;
        group.rotation.x = baseRotX + current.y * 0.12;

        renderer.render(scene, camera);
        if (!readyFired) {
          readyFired = true;
          onReady?.();
        }
        raf = requestAnimationFrame(renderFrame);
      };
      const wake = () => {
        if (!raf && inView && pageVisible) {
          clock.getDelta(); // swallow the pause gap
          raf = requestAnimationFrame(renderFrame);
        }
      };

      const io = new IntersectionObserver(
        (entries) => {
          inView = entries.some((e) => e.isIntersecting);
          wake();
        },
        { rootMargin: "80px" },
      );
      io.observe(container);
      const onVisibility = () => {
        pageVisible = document.visibilityState === "visible";
        wake();
      };
      document.addEventListener("visibilitychange", onVisibility);

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setFailed(true);
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);

      wake();

      return () => {
        if (raf) cancelAnimationFrame(raf);
        assemble.kill();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        uniformsRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    if (!active) return <HeroStaticFallback />;

    return (
      <div ref={containerRef} className="absolute inset-0">
        {/* Champagne glow bed under the particles */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 45% at 50% 45%, oklch(0.82 0.09 85 / 0.10), transparent 70%)",
          }}
        />
      </div>
    );
  },
);

export default ParticleCarScene;
