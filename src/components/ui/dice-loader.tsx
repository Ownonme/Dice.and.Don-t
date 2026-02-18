import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface DiceLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string | null;
  mode?: "stack" | "inline";
  text?: string;
}

export const DiceLoader = ({ className, size = "md", label = "Caricamento...", mode = "stack", text = "Don't" }: DiceLoaderProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sizePx = useMemo(() => ({ sm: 32, md: 48, lg: 64, xl: 128 }[size]), [size]);
  const textureSize = useMemo(() => ({ sm: 256, md: 384, lg: 512, xl: 768 }[size]), [size]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const GOLD = "#d7b56c";
    const DONT_FACE = 0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const safeDispose = <T extends { dispose?: () => void }>(obj: T | null | undefined) => {
      try {
        obj?.dispose?.();
      } catch {}
    };

    const makeFaceTexture = ({ faceText = "" }: { faceText?: string } = {}) => {
      const c = document.createElement("canvas");
      c.width = c.height = textureSize;
      const ctx = c.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, textureSize, textureSize);

      const A = { x: textureSize * 0.5, y: textureSize * 0.1 };
      const B = { x: textureSize * 0.12, y: textureSize * 0.86 };
      const C = { x: textureSize * 0.88, y: textureSize * 0.86 };

      ctx.strokeStyle = GOLD;
      ctx.lineWidth = Math.max(10, textureSize * 0.03);
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.closePath();
      ctx.stroke();

      const inset = textureSize * 0.07;
      const cx = (A.x + B.x + C.x) / 3;
      const cy = (A.y + B.y + C.y) / 3;
      const insetPoint = (P: { x: number; y: number }) => {
        const vx = cx - P.x;
        const vy = cy - P.y;
        const len = Math.hypot(vx, vy) || 1;
        return { x: P.x + (vx / len) * inset, y: P.y + (vy / len) * inset };
      };
      const Ai = insetPoint(A);
      const Bi = insetPoint(B);
      const Ci = insetPoint(C);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(Ai.x, Ai.y);
      ctx.lineTo(Bi.x, Bi.y);
      ctx.lineTo(Ci.x, Ci.y);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.closePath();
      ctx.fill();

      if (faceText) {
        ctx.fillStyle = GOLD;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${Math.floor(textureSize * 0.18)}px Georgia, "Times New Roman", serif`;
        ctx.fillText(faceText, textureSize * 0.5, textureSize * 0.58);
      }
      ctx.restore();

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      return tex;
    };

    const geo = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
    const pos = geo.attributes.position;
    const faceCount = pos.count / 3;

    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i += 3) {
      uvs[(i + 0) * 2 + 0] = 0.5;
      uvs[(i + 0) * 2 + 1] = 1.0;
      uvs[(i + 1) * 2 + 0] = 0.0;
      uvs[(i + 1) * 2 + 1] = 0.0;
      uvs[(i + 2) * 2 + 0] = 1.0;
      uvs[(i + 2) * 2 + 1] = 0.0;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    geo.clearGroups();
    for (let f = 0; f < faceCount; f++) geo.addGroup(f * 3, 3, f);

    const blankTex = makeFaceTexture({ faceText: "" });
    const dontTex = makeFaceTexture({ faceText: text ?? "" });
    const blankMat = new THREE.MeshBasicMaterial({ map: blankTex ?? undefined, side: THREE.DoubleSide });
    const dontMat = new THREE.MeshBasicMaterial({ map: dontTex ?? undefined, side: THREE.DoubleSide });

    const materials: THREE.Material[] = [];
    for (let f = 0; f < faceCount; f++) materials.push(f === DONT_FACE ? dontMat : blankMat);

    const solid = new THREE.Mesh(geo, materials);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 0)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(GOLD) })
    );
    edges.scale.setScalar(1.005);

    const d20 = new THREE.Group();
    d20.add(solid);
    d20.add(edges);
    scene.add(d20);

    const getFaceVerts = (g: THREE.BufferGeometry, faceIndex: number) => {
      const p = g.attributes.position as THREE.BufferAttribute;
      const i = faceIndex * 3;
      const a = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      const b = new THREE.Vector3(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1));
      const c = new THREE.Vector3(p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
      return { a, b, c };
    };

    const faceNormalLocal = (g: THREE.BufferGeometry, faceIndex: number) => {
      const { a, b, c } = getFaceVerts(g, faceIndex);
      return new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    };

    const computeDontQuat = () => {
      const n = faceNormalLocal(geo, DONT_FACE);
      const cameraDir = new THREE.Vector3(0, 0, 1);
      const q1 = new THREE.Quaternion().setFromUnitVectors(n, cameraDir);

      const { a, b, c } = getFaceVerts(geo, DONT_FACE);
      const center = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
      const upHintLocal = new THREE.Vector3().subVectors(a, center).normalize();
      const upHintWorld = upHintLocal.clone().applyQuaternion(q1);

      const worldUp = new THREE.Vector3(0, 1, 0);
      const projWorldUp = worldUp
        .clone()
        .sub(cameraDir.clone().multiplyScalar(worldUp.dot(cameraDir)))
        .normalize();

      const projUpHint = upHintWorld
        .clone()
        .sub(cameraDir.clone().multiplyScalar(upHintWorld.dot(cameraDir)))
        .normalize();

      const cross = new THREE.Vector3().crossVectors(projUpHint, projWorldUp);
      const sign = Math.sign(cross.dot(cameraDir));
      const dot = THREE.MathUtils.clamp(projUpHint.dot(projWorldUp), -1, 1);
      const angle = Math.acos(dot) * sign;

      const q2 = new THREE.Quaternion().setFromAxisAngle(cameraDir, angle);
      return q2.multiply(q1);
    };

    let dontQuat = computeDontQuat();

    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

    let rolling = false;
    let t0 = 0;
    const startQuat = new THREE.Quaternion();
    const settleStartQuat = new THREE.Quaternion();
    const endQuat = new THREE.Quaternion();
    const spinEuler = new THREE.Euler();

    const startRoll = () => {
      rolling = true;
      t0 = performance.now();
      startQuat.copy(d20.quaternion);

      const spins = 6 + Math.random() * 6;
      spinEuler.set(
        (Math.random() * 2 - 1) * Math.PI * spins,
        (Math.random() * 2 - 1) * Math.PI * spins,
        (Math.random() * 2 - 1) * Math.PI * (spins * 0.5)
      );

      dontQuat = computeDontQuat();
      endQuat.copy(dontQuat);
      settleStartQuat.copy(startQuat);
    };

    const updateRoll = (now: number) => {
      const DURATION = 1700;
      const SETTLE_AT = 0.78;
      const t = (now - t0) / DURATION;

      if (t < SETTLE_AT) {
        const u = easeOutCubic(t / SETTLE_AT);
        const qSpin = new THREE.Quaternion().setFromEuler(new THREE.Euler(spinEuler.x * u, spinEuler.y * u, spinEuler.z * u));
        d20.quaternion.copy(startQuat).multiply(qSpin);
        if (t > SETTLE_AT * 0.95) settleStartQuat.copy(d20.quaternion);
        return;
      }

      if (t <= 1) {
        const u = easeOutCubic((t - SETTLE_AT) / (1 - SETTLE_AT));
        d20.quaternion.slerpQuaternions(settleStartQuat, endQuat, u);
        return;
      }

      d20.quaternion.copy(endQuat);
      rolling = false;
      window.setTimeout(startRoll, 350);
    };

    let raf = 0;
    const renderFrame = () => {
      raf = window.requestAnimationFrame(renderFrame);
      if (rolling) updateRoll(performance.now());
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = container.clientWidth || sizePx;
      const h = container.clientHeight || sizePx;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    resize();
    startRoll();
    renderFrame();

    return () => {
      try {
        ro.disconnect();
      } catch {}
      if (raf) window.cancelAnimationFrame(raf);
      safeDispose(geo);
      safeDispose(edges.geometry as any);
      safeDispose((edges.material as any) ?? null);
      safeDispose(blankTex);
      safeDispose(dontTex);
      safeDispose(blankMat);
      safeDispose(dontMat);
      safeDispose(renderer);
      try {
        renderer.domElement.remove();
      } catch {}
    };
  }, [sizePx, textureSize, text]);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-32 h-32"
  };

  return (
    <div className={cn(mode === "inline" ? "inline-flex items-center justify-center" : "flex flex-col items-center justify-center gap-3", className)}>
      <div ref={containerRef} className={cn("relative", sizeClasses[size])} aria-hidden="true" />

      {mode === "stack" && label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
};
