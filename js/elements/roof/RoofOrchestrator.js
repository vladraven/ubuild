import * as THREE from "three";
function assertContext(context) {
  if (!context || typeof context !== "object")
    throw new TypeError("Element context is required");
  if (!context.geometry?.roof) throw new TypeError("Roof geometry is required");
  if (!context.panelGeometry?.roof)
    throw new TypeError("Roof panel geometry is required");
  if (!context.materials) throw new TypeError("Material system is required");
}
function resolveMaterial(context) {
  if (typeof context.materials.get === "function")
    return context.materials.get(
      "roofMetal",
      context.colors?.roof,
      context.textures?.roofPanel,
    );
  if (context.materials.roofMetal) return context.materials.roofMetal;
  if (context.materials.roof) return context.materials.roof;
  throw new Error("Roof material is not available");
}
function createPlaneGeometry(corners) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(corners.flatMap((p) => [p.x, p.y, p.z]));
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
function createPanelMesh(panel, material) {
  if (!Array.isArray(panel.corners) || panel.corners.length !== 4)
    throw new Error("Roof panel requires four corners");
  const mesh = new THREE.Mesh(createPlaneGeometry(panel.corners), material);
  mesh.userData.element = "roof";
  mesh.userData.panelIndex = panel.index;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function createPlaneGroup(planeId, panels, material) {
  const group = new THREE.Group();
  group.name = `roof-${planeId}`;
  for (const panel of panels) group.add(createPanelMesh(panel, material));
  return group;
}
function createObject(context) {
  assertContext(context);
  const root = new THREE.Group();
  root.name = "roof";
  const material = resolveMaterial(context);
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
  for (const [planeId, panels] of Object.entries(context.panelGeometry.roof)) {
    if (Array.isArray(panels) && panels.length)
      root.add(createPlaneGroup(planeId, panels, material));
  }
  return root;
}
function disposeObject(object) {
  if (!object) return;
  for (const child of [...object.children]) disposeObject(child);
  object.geometry?.dispose();
  object.removeFromParent();
}
function updateObject(object, context) {
  assertContext(context);
  if (!object) return createObject(context);
  for (const child of [...object.children]) disposeObject(child);
  object.clear();
  const material = resolveMaterial(context);
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
  for (const [planeId, panels] of Object.entries(context.panelGeometry.roof)) {
    if (Array.isArray(panels) && panels.length)
      object.add(createPlaneGroup(planeId, panels, material));
  }
  return object;
}
export const RoofOrchestrator = Object.freeze({
  id: "roof",
  create(context) {
    return createObject(context);
  },
  update(object, context) {
    return updateObject(object, context);
  },
  dispose(object) {
    disposeObject(object);
  },
});
