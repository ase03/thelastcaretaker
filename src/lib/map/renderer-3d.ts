import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { worldToScene, sceneToWorld, gridStep, distanceLabel, LIMIT, type POI } from './coordinates';
import { heightColor } from './appearance';
import type { Frame } from './renderer';
export function createMap3D(host: HTMLElement, update: (f: Frame) => void, cursor: (p: {
    x: number;
    y: number;
} | null) => void) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor('#090f1d');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 1, .001, 1e7), controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.zoomToCursor = true;
    controls.dampingFactor = .12;
    controls.minDistance = .05;
    controls.maxDistance = 1e7;
    controls.maxPolarAngle = Math.PI * .48;
    const origin = { x: 0, y: 0, z: 0 };
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x293f58 }), stemMaterial = new THREE.LineBasicMaterial({ color: 0x397781, transparent: true, opacity: .65 }), pointMaterial = new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true });
    // Round GPU points; the DOM hit target and label use the same projected centre.
    pointMaterial.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;'); };
    const grid = new THREE.LineSegments(new THREE.BufferGeometry(), gridMaterial), stems = new THREE.LineSegments(new THREE.BufferGeometry(), stemMaterial), points = new THREE.Points(new THREE.BufferGeometry(), pointMaterial);
    scene.add(grid, stems, points);
    let pois: POI[] = [], selected: string | undefined, hovered: string | undefined, visible = true, dirty = true, disposed = false, raf = 0;
    let width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const changed = () => { dirty = true; };
    controls.addEventListener('change', changed);
    const resize = new ResizeObserver(() => { width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; });
    resize.observe(host);
    function replace(object: THREE.LineSegments | THREE.Points, vertices: number[], colors?: number[]) { object.geometry.dispose(); object.geometry = new THREE.BufferGeometry(); object.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); if (colors)
        object.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); }
    function overview() { const bounds = new THREE.Box3(); for (const p of pois)
        bounds.expandByPoint(new THREE.Vector3(p.world.x / 100, (p.world.z ?? 0) / 100, p.world.y / 100)); const centre = pois.length ? bounds.getCenter(new THREE.Vector3()) : new THREE.Vector3(), size = pois.length ? bounds.getSize(new THREE.Vector3()) : new THREE.Vector3(20000, 0, 20000); origin.x = centre.x * 100; origin.y = centre.z * 100; origin.z = centre.y * 100; controls.target.set(0, 0, 0); const distance = Math.max(100, Math.max(size.x, size.y, size.z) * 1.8 / Math.min(1, width / height)); camera.position.set(distance * .35, distance * .75, distance * .8); controls.update(); dirty = true; }
    function draw() {
        if (disposed)
            return;
        raf = requestAnimationFrame(draw);
        controls.update();
        if (!dirty)
            return;
        dirty = false;
        // Rebase on the CPU before Float32 buffers; move camera and target together.
        const excess = new THREE.Vector3();
        for (const [axis, key] of [['x', 'x'], ['y', 'z'], ['z', 'y']] as const) {
            const world = origin[key] + controls.target[axis] * 100;
            excess[axis] = (world - Math.max(-LIMIT, Math.min(LIMIT, world))) / 100;
        }
        controls.target.sub(excess);
        camera.position.sub(excess);
        const shift = controls.target.clone();
        origin.x += shift.x * 100;
        origin.y += shift.z * 100;
        origin.z += shift.y * 100;
        camera.position.sub(shift);
        controls.target.sub(shift);
        const distance = camera.position.distanceTo(controls.target);
        camera.near = Math.max(.00001, distance / 10000);
        camera.far = Math.max(1000, distance * 100);
        camera.updateProjectionMatrix();
        camera.lookAt(controls.target);
        camera.updateMatrixWorld();
        const span = distance * 100 * 2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * width / height, step = gridStep(span, width), extent = Math.max(step * 10, span * 1.5), v: number[] = [], baseY = -origin.z / 100;
        for (let x = Math.ceil((origin.x - extent) / step) * step; x <= origin.x + extent; x += step) {
            const sx = (x - origin.x) / 100;
            v.push(sx, baseY, -extent / 100, sx, baseY, extent / 100);
        }
        for (let y = Math.ceil((origin.y - extent) / step) * step; y <= origin.y + extent; y += step) {
            const sz = (y - origin.y) / 100;
            v.push(-extent / 100, baseY, sz, extent / 100, baseY, sz);
        }
        replace(grid, v);
        const positions: number[] = [], colors: number[] = [], vertical: number[] = [], markers: Frame['markers'] = [];
        for (const poi of pois) {
            const s = worldToScene(poi.world, origin), position = new THREE.Vector3(s.x, s.y ?? baseY, s.z), color = new THREE.Color(poi.id === selected ? 0xffd66c : poi.id === hovered ? 0xa5f7ff : heightColor(poi.world.z));
            positions.push(position.x, position.y, position.z);
            colors.push(color.r, color.g, color.b);
            if (poi.world.z !== null && poi.world.z !== 0)
                vertical.push(position.x, baseY, position.z, position.x, position.y, position.z);
            const projected = position.clone().project(camera);
            if (projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1)
                markers.push({ poi, x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 });
        }
        replace(points, positions, colors);
        replace(stems, vertical);
        points.visible = stems.visible = visible;
        renderer.render(scene, camera);
        update({ markers, labels: [], step: distanceLabel(step), span, cx: origin.x, cy: origin.y, fps: 0 });
    }
    const pointer = (e: PointerEvent) => { const r = host.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / width * 2 - 1, 1 - (e.clientY - r.top) / height * 2), camera); const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), origin.z / 100), new THREE.Vector3()); if (hit) {
        const p = sceneToWorld({ x: hit.x, y: hit.y, z: hit.z }, origin);
        cursor({ x: p.x, y: p.y });
    }
    else
        cursor(null); };
    const leave = () => cursor(null);
    // Labels stay clickable; route their wheel events through the same controls
    // as the canvas, preserving the cursor position and trackpad modifiers.
    const overlayWheel = (event: WheelEvent) => {
        if (!(event.target instanceof Element) || !event.target.closest('.marker')) return;
        event.preventDefault();
        event.stopPropagation();
        renderer.domElement.dispatchEvent(new WheelEvent('wheel', {
            bubbles: true, cancelable: true,
            clientX: event.clientX, clientY: event.clientY,
            deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ,
            deltaMode: event.deltaMode,
            ctrlKey: event.ctrlKey, shiftKey: event.shiftKey,
            altKey: event.altKey, metaKey: event.metaKey
        }));
    };
    host.addEventListener('wheel', overlayWheel, { passive: false });
    host.addEventListener('pointermove', pointer);
    host.addEventListener('pointerleave', leave);
    overview();
    draw();
    return { setPOIs(p: POI[]) { pois = p; overview(); }, overview, focus(p: POI) { const s = worldToScene(p.world, origin), target = new THREE.Vector3(s.x, s.y ?? -origin.z / 100, s.z), offset = camera.position.clone().sub(controls.target); controls.target.copy(target); camera.position.copy(target).add(offset); controls.update(); dirty = true; }, zoom(factor: number) { const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor); offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length()))); camera.position.copy(controls.target).add(offset); controls.update(); dirty = true; }, setAppearance(id: string | undefined, hover: string | undefined, show: boolean) { selected = id; hovered = hover; visible = show; dirty = true; }, dispose() { disposed = true; cancelAnimationFrame(raf); resize.disconnect(); controls.removeEventListener('change', changed); controls.dispose(); host.removeEventListener('wheel', overlayWheel); host.removeEventListener('pointermove', pointer); host.removeEventListener('pointerleave', leave); for (const object of [grid, stems, points])
            object.geometry.dispose(); gridMaterial.dispose(); stemMaterial.dispose(); pointMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); } };
}
