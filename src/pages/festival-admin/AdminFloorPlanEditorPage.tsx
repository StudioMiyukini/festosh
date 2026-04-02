import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  MousePointer2,
  Square,
  Type,
  Image as ImageIcon,
  Grid3X3,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  ZoomIn,
  ZoomOut,
  Move,
  Copy,
  Settings,
  AlertCircle,
  Check,
  ChevronRight,
  X,
  Undo2,
  Redo2,
  Upload,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { FloorPlan } from '@/types/venue';
import type { BoothLocation } from '@/types/exhibitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanElement {
  id: string;
  type: 'booth' | 'wall' | 'label' | 'decoration' | 'zone';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  opacity: number;
  isLocked: boolean;
  isVisible: boolean;
  layer: number;
  // Wall-specific (polyline points, absolute coords)
  points?: { x: number; y: number }[];
  strokeWidth?: number;
  // Booth-specific
  boothId?: string; // linked to BoothLocation
  boothCode?: string;
  priceCents?: number;
  zone?: string;
}

interface CanvasState {
  elements: PlanElement[];
  version: number;
}

type Tool = 'select' | 'booth' | 'wall' | 'label' | 'decoration' | 'pan';

interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
  mode: 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | string; // string for 'vertex-N'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const MIN_ELEMENT_SIZE = 20;

const BOOTH_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#6366F1', // indigo
];

const ELEMENT_DEFAULTS: Record<string, Partial<PlanElement>> = {
  booth: { width: 80, height: 60, color: '#3B82F6', opacity: 0.85 },
  wall: { width: 200, height: 8, color: '#374151', opacity: 1 },
  label: { width: 120, height: 30, color: 'transparent', opacity: 1 },
  decoration: { width: 60, height: 60, color: '#D1D5DB', opacity: 0.6 },
  zone: { width: 300, height: 200, color: '#FEF3C7', opacity: 0.3 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return crypto.randomUUID();
}

function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminFloorPlanEditorPage() {
  const navigate = useNavigate();
  const { festival, activeEdition } = useTenantStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Data state
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [boothLocations, setBoothLocations] = useState<BoothLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Canvas state
  const [elements, setElements] = useState<PlanElement[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [drawState, setDrawState] = useState<{ startX: number; startY: number; current: PlanElement } | null>(null);
  // Polyline drawing for walls: accumulates points via clicks, double-click or Escape to finish
  const [polylinePoints, setPolylinePoints] = useState<{ x: number; y: number }[]>([]);
  const [polylineCursor, setPolylineCursor] = useState<{ x: number; y: number } | null>(null);

  // View state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // UI state
  const [showProperties, setShowProperties] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  // History for undo/redo
  const [history, setHistory] = useState<PlanElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null;
  const selectedPlan = floorPlans.find((p) => p.id === selectedPlanId) ?? null;

  // -------------------------------------------------------------------------
  // Load data
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!activeEdition?.id) return;

    setLoading(true);
    Promise.all([
      api.get<FloorPlan[]>(`/floor-plans/edition/${activeEdition.id}`),
      api.get<BoothLocation[]>(`/exhibitors/edition/${activeEdition.id}/locations`),
    ]).then(([plansRes, boothsRes]) => {
      const plans = plansRes.success && plansRes.data ? plansRes.data : [];
      const booths = boothsRes.success && boothsRes.data ? boothsRes.data : [];
      setFloorPlans(plans);
      setBoothLocations(booths);
      if (plans.length > 0) {
        loadPlan(plans[0], booths);
      }
      setLoading(false);
    });
  }, [activeEdition?.id]);

  const loadPlan = useCallback((plan: FloorPlan, booths: BoothLocation[]) => {
    setSelectedPlanId(plan.id);
    setCanvasWidth(plan.width_px || CANVAS_WIDTH);
    setCanvasHeight(plan.height_px || CANVAS_HEIGHT);
    setGridSize(plan.grid_size || 20);
    setBackgroundUrl(plan.background_url || '');

    // Load elements from canvas_data
    let loadedElements: PlanElement[] = [];
    if (plan.canvas_data && typeof plan.canvas_data === 'object') {
      const cd = plan.canvas_data as unknown as CanvasState;
      if (Array.isArray(cd.elements)) {
        loadedElements = cd.elements;
      }
    }

    setElements(loadedElements);
    setHistory([loadedElements]);
    setHistoryIndex(0);
    setSelectedElementId(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // -------------------------------------------------------------------------
  // History management
  // -------------------------------------------------------------------------

  const pushHistory = useCallback((newElements: PlanElement[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, newElements];
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 50));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex]);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex]);
  }, [history, historyIndex]);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const savePlan = useCallback(async () => {
    if (!selectedPlanId) return;
    setSaving(true);

    const canvasData: CanvasState = {
      elements,
      version: (selectedPlan?.version ?? 0) + 1,
    };

    // Save canvas data
    await api.put(`/floor-plans/${selectedPlanId}/canvas`, {
      canvas_data: canvasData,
    });

    // Save background URL if changed
    if (backgroundUrl !== (selectedPlan?.background_url || '')) {
      await api.put(`/floor-plans/${selectedPlanId}`, {
        background_url: backgroundUrl || null,
        grid_size: gridSize,
      });
    }

    // Sync booth locations from booth elements
    const boothElements = elements.filter((e) => e.type === 'booth');

    for (const el of boothElements) {
      const planPosition = {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        floor_plan_id: selectedPlanId,
      };

      if (el.boothId) {
        // Update existing booth location
        await api.put(`/exhibitors/locations/${el.boothId}`, {
          code: el.boothCode || el.label || 'A1',
          zone: el.zone || null,
          price_cents: el.priceCents || 0,
          plan_position: planPosition,
        });
      } else {
        // Create new booth location
        const res = await api.post<BoothLocation>(
          `/exhibitors/edition/${activeEdition!.id}/locations`,
          {
            code: el.boothCode || el.label || `B${boothElements.indexOf(el) + 1}`,
            zone: el.zone || null,
            price_cents: el.priceCents || 0,
            plan_position: planPosition,
          }
        );
        if (res.success && res.data) {
          // Link element to the new booth location
          setElements((prev) =>
            prev.map((e) => (e.id === el.id ? { ...e, boothId: res.data!.id } : e))
          );
        }
      }
    }

    // Delete booth locations that no longer have an element
    const elementBoothIds = new Set(boothElements.map((e) => e.boothId).filter(Boolean));
    for (const booth of boothLocations) {
      const pos = booth.plan_position as { floor_plan_id?: string } | null;
      if (pos?.floor_plan_id === selectedPlanId && !elementBoothIds.has(booth.id)) {
        await api.delete(`/exhibitors/locations/${booth.id}`);
      }
    }

    // Refresh booth locations
    const boothsRes = await api.get<BoothLocation[]>(
      `/exhibitors/edition/${activeEdition!.id}/locations`
    );
    if (boothsRes.success && boothsRes.data) {
      setBoothLocations(boothsRes.data);
    }

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }, [selectedPlanId, elements, backgroundUrl, gridSize, selectedPlan, activeEdition, boothLocations]);

  // -------------------------------------------------------------------------
  // Create new plan
  // -------------------------------------------------------------------------

  const createPlan = async () => {
    if (!newPlanName.trim() || !activeEdition?.id) return;

    const res = await api.post<FloorPlan>(`/floor-plans/edition/${activeEdition.id}`, {
      name: newPlanName.trim(),
      width_px: CANVAS_WIDTH,
      height_px: CANVAS_HEIGHT,
      grid_size: 20,
    });

    if (res.success && res.data) {
      setFloorPlans((prev) => [...prev, res.data!]);
      loadPlan(res.data, boothLocations);
      setShowCreateDialog(false);
      setNewPlanName('');
    }
  };

  const deletePlan = async () => {
    if (!selectedPlanId) return;
    await api.delete(`/floor-plans/${selectedPlanId}`);
    setFloorPlans((prev) => prev.filter((p) => p.id !== selectedPlanId));
    const remaining = floorPlans.filter((p) => p.id !== selectedPlanId);
    if (remaining.length > 0) {
      loadPlan(remaining[0], boothLocations);
    } else {
      setSelectedPlanId(null);
      setElements([]);
    }
  };

  // -------------------------------------------------------------------------
  // SVG coordinate helpers
  // -------------------------------------------------------------------------

  const getSvgPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - panOffset.x) / zoom;
      const y = (clientY - rect.top - panOffset.y) / zoom;
      return { x, y };
    },
    [zoom, panOffset]
  );

  // -------------------------------------------------------------------------
  // Element operations
  // -------------------------------------------------------------------------

  const updateElement = useCallback((id: string, updates: Partial<PlanElement>) => {
    setElements((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      return next;
    });
  }, []);

  const addElement = useCallback(
    (type: PlanElement['type'], x: number, y: number, extraProps?: Partial<PlanElement>) => {
      const defaults = ELEMENT_DEFAULTS[type] || {};
      const snappedX = snapToGrid(x, gridSize);
      const snappedY = snapToGrid(y, gridSize);
      const maxLayer = elements.reduce((max, e) => Math.max(max, e.layer), 0);
      const boothCount = elements.filter((e) => e.type === 'booth').length;

      const newEl: PlanElement = {
        id: uid(),
        type,
        x: snappedX,
        y: snappedY,
        width: defaults.width ?? 80,
        height: defaults.height ?? 60,
        rotation: 0,
        label: type === 'booth' ? `B${boothCount + 1}` : '',
        color: type === 'booth'
          ? BOOTH_COLORS[boothCount % BOOTH_COLORS.length]
          : defaults.color ?? '#666',
        opacity: defaults.opacity ?? 1,
        isLocked: false,
        isVisible: true,
        layer: maxLayer + 1,
        boothCode: type === 'booth' ? `B${boothCount + 1}` : undefined,
        priceCents: type === 'booth' ? 0 : undefined,
        ...extraProps,
      };

      const next = [...elements, newEl];
      setElements(next);
      pushHistory(next);
      setSelectedElementId(newEl.id);
      return newEl;
    },
    [elements, gridSize, pushHistory]
  );

  const deleteElement = useCallback(
    (id: string) => {
      const next = elements.filter((e) => e.id !== id);
      setElements(next);
      pushHistory(next);
      if (selectedElementId === id) setSelectedElementId(null);
    },
    [elements, selectedElementId, pushHistory]
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      addElement(el.type, el.x + 20, el.y + 20, {
        ...el,
        id: uid(),
        boothId: undefined, // Don't link to same booth
        label: el.type === 'booth' ? `${el.label}_copie` : el.label,
        boothCode: el.type === 'booth' ? `${el.boothCode}_copie` : undefined,
      });
    },
    [elements, addElement]
  );

  // -------------------------------------------------------------------------
  // Mouse handlers — SVG canvas
  // -------------------------------------------------------------------------

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
        // Middle click or pan tool → start pan
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      const point = getSvgPoint(e.clientX, e.clientY);

      // Wall tool — polyline mode: each click adds a point
      if (activeTool === 'wall') {
        const snappedX = snapToGrid(point.x, gridSize);
        const snappedY = snapToGrid(point.y, gridSize);
        setPolylinePoints((prev) => [...prev, { x: snappedX, y: snappedY }]);
        return;
      }

      // Other drawing tools (booth, label, decoration, zone)
      if (activeTool !== 'select' && activeTool !== 'pan') {
        const snappedX = snapToGrid(point.x, gridSize);
        const snappedY = snapToGrid(point.y, gridSize);
        const defaults = ELEMENT_DEFAULTS[activeTool] || {};
        const newEl: PlanElement = {
          id: uid(),
          type: activeTool as PlanElement['type'],
          x: snappedX,
          y: snappedY,
          width: defaults.width ?? 80,
          height: defaults.height ?? 60,
          rotation: 0,
          label: '',
          color: defaults.color ?? '#666',
          opacity: defaults.opacity ?? 1,
          isLocked: false,
          isVisible: true,
          layer: elements.reduce((m, el) => Math.max(m, el.layer), 0) + 1,
        };

        if (activeTool === 'booth') {
          const boothCount = elements.filter((el) => el.type === 'booth').length;
          newEl.label = `B${boothCount + 1}`;
          newEl.boothCode = newEl.label;
          newEl.priceCents = 0;
          newEl.color = BOOTH_COLORS[boothCount % BOOTH_COLORS.length];
        }

        setDrawState({
          startX: snappedX,
          startY: snappedY,
          current: newEl,
        });
        return;
      }

      // Select tool — check if clicking on empty space
      // Elements handle their own mousedown for selection
      setSelectedElementId(null);
    },
    [activeTool, getSvgPoint, gridSize, elements, panOffset]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Panning
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      // Polyline cursor tracking for wall tool
      if (activeTool === 'wall') {
        if (polylinePoints.length > 0) {
          const point = getSvgPoint(e.clientX, e.clientY);
          setPolylineCursor({ x: snapToGrid(point.x, gridSize), y: snapToGrid(point.y, gridSize) });
        }
        return;
      }

      // Drawing
      if (drawState) {
        const point = getSvgPoint(e.clientX, e.clientY);
        const snappedX = snapToGrid(point.x, gridSize);
        const snappedY = snapToGrid(point.y, gridSize);

        const x = Math.min(drawState.startX, snappedX);
        const y = Math.min(drawState.startY, snappedY);
        const width = Math.max(MIN_ELEMENT_SIZE, Math.abs(snappedX - drawState.startX));
        const height = Math.max(MIN_ELEMENT_SIZE, Math.abs(snappedY - drawState.startY));

        setDrawState((prev) =>
          prev ? { ...prev, current: { ...prev.current, x, y, width, height } } : null
        );
        return;
      }

      // Dragging element
      if (dragState) {
        const point = getSvgPoint(e.clientX, e.clientY);
        const dx = point.x - dragState.startX;
        const dy = point.y - dragState.startY;

        // Vertex drag for walls
        if (dragState.mode.startsWith('vertex-')) {
          const el = elements.find((el) => el.id === dragState.elementId);
          if (!el || !el.points || el.isLocked) return;
          const vertexIdx = parseInt(dragState.mode.split('-')[1]);
          const newPts = el.points.map((p, i) =>
            i === vertexIdx
              ? { x: snapToGrid(dragState.elementStartX + dx, gridSize), y: snapToGrid(dragState.elementStartY + dy, gridSize) }
              : p
          );
          // Recompute bounding box
          const xs = newPts.map((p) => p.x);
          const ys = newPts.map((p) => p.y);
          updateElement(dragState.elementId, {
            points: newPts,
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(Math.max(...xs) - Math.min(...xs), 1),
            height: Math.max(Math.max(...ys) - Math.min(...ys), 1),
          });
          return;
        }

        if (dragState.mode === 'move') {
          const el = elements.find((el) => el.id === dragState.elementId);
          if (!el || el.isLocked) return;

          // Wall move: translate all points
          if (el.type === 'wall' && el.points) {
            const sdx = snapToGrid(dx, gridSize);
            const sdy = snapToGrid(dy, gridSize);
            // Only move if delta changed
            const actualDx = sdx - (el.x - dragState.elementStartX);
            const actualDy = sdy - (el.y - dragState.elementStartY);
            if (actualDx === 0 && actualDy === 0) return;
            const newPts = el.points.map((p) => ({
              x: p.x + actualDx,
              y: p.y + actualDy,
            }));
            const xs = newPts.map((p) => p.x);
            const ys = newPts.map((p) => p.y);
            updateElement(dragState.elementId, {
              points: newPts,
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(Math.max(...xs) - Math.min(...xs), 1),
              height: Math.max(Math.max(...ys) - Math.min(...ys), 1),
            });
            return;
          }

          const newX = snapToGrid(dragState.elementStartX + dx, gridSize);
          const newY = snapToGrid(dragState.elementStartY + dy, gridSize);
          updateElement(dragState.elementId, {
            x: clamp(newX, 0, canvasWidth - el.width),
            y: clamp(newY, 0, canvasHeight - el.height),
          });
        } else {
          // Resize
          const el = elements.find((el) => el.id === dragState.elementId);
          if (!el || el.isLocked) return;

          let newX = el.x;
          let newY = el.y;
          let newW = el.width;
          let newH = el.height;

          if (dragState.mode === 'resize-br') {
            newW = snapToGrid(Math.max(MIN_ELEMENT_SIZE, dragState.elementStartX + dx), gridSize);
            newH = snapToGrid(Math.max(MIN_ELEMENT_SIZE, dragState.elementStartY + dy), gridSize);
          } else if (dragState.mode === 'resize-bl') {
            const rawW = dragState.elementStartX - dx;
            newW = snapToGrid(Math.max(MIN_ELEMENT_SIZE, rawW), gridSize);
            newX = snapToGrid(el.x + el.width - newW, gridSize);
            newH = snapToGrid(Math.max(MIN_ELEMENT_SIZE, dragState.elementStartY + dy), gridSize);
          } else if (dragState.mode === 'resize-tr') {
            newW = snapToGrid(Math.max(MIN_ELEMENT_SIZE, dragState.elementStartX + dx), gridSize);
            const rawH = dragState.elementStartY - dy;
            newH = snapToGrid(Math.max(MIN_ELEMENT_SIZE, rawH), gridSize);
            newY = snapToGrid(el.y + el.height - newH, gridSize);
          } else if (dragState.mode === 'resize-tl') {
            const rawW = dragState.elementStartX - dx;
            const rawH = dragState.elementStartY - dy;
            newW = snapToGrid(Math.max(MIN_ELEMENT_SIZE, rawW), gridSize);
            newH = snapToGrid(Math.max(MIN_ELEMENT_SIZE, rawH), gridSize);
            newX = snapToGrid(el.x + el.width - newW, gridSize);
            newY = snapToGrid(el.y + el.height - newH, gridSize);
          }

          updateElement(dragState.elementId, {
            x: newX,
            y: newY,
            width: newW,
            height: newH,
          });
        }
      }
    },
    [isPanning, panStart, drawState, dragState, getSvgPoint, gridSize, elements, canvasWidth, canvasHeight, updateElement]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (drawState) {
      const el = drawState.current;
      if (el.width >= MIN_ELEMENT_SIZE && el.height >= MIN_ELEMENT_SIZE) {
        const next = [...elements, el];
        setElements(next);
        pushHistory(next);
        setSelectedElementId(el.id);
      }
      setDrawState(null);
      setActiveTool('select');
      return;
    }

    if (dragState) {
      pushHistory(elements);
      setDragState(null);
    }
  }, [isPanning, drawState, dragState, elements, pushHistory]);

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation();
      if (activeTool !== 'select') return;

      const el = elements.find((el) => el.id === elementId);
      if (!el || el.isLocked) {
        setSelectedElementId(elementId);
        return;
      }

      setSelectedElementId(elementId);

      const point = getSvgPoint(e.clientX, e.clientY);
      setDragState({
        elementId,
        startX: point.x,
        startY: point.y,
        elementStartX: el.x,
        elementStartY: el.y,
        mode: 'move',
      });
    },
    [activeTool, elements, getSvgPoint]
  );

  const handleResizeHandleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string, corner: DragState['mode']) => {
      e.stopPropagation();
      const el = elements.find((el) => el.id === elementId);
      if (!el || el.isLocked) return;

      setSelectedElementId(elementId);
      const point = getSvgPoint(e.clientX, e.clientY);

      setDragState({
        elementId,
        startX: point.x,
        startY: point.y,
        elementStartX: el.width,
        elementStartY: el.height,
        mode: corner,
      });
    },
    [elements, getSvgPoint]
  );

  // -------------------------------------------------------------------------
  // Finalize wall polyline
  // -------------------------------------------------------------------------

  const finalizeWall = useCallback(() => {
    if (polylinePoints.length < 2) {
      setPolylinePoints([]);
      setPolylineCursor(null);
      return;
    }

    // Compute bounding box for x,y,width,height (used for selection hit area)
    const xs = polylinePoints.map((p) => p.x);
    const ys = polylinePoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const wallEl: PlanElement = {
      id: uid(),
      type: 'wall',
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      rotation: 0,
      label: '',
      color: '#374151',
      opacity: 1,
      isLocked: false,
      isVisible: true,
      layer: elements.reduce((m, el) => Math.max(m, el.layer), 0) + 1,
      points: polylinePoints,
      strokeWidth: 4,
    };

    const next = [...elements, wallEl];
    setElements(next);
    pushHistory(next);
    setSelectedElementId(wallEl.id);
    setPolylinePoints([]);
    setPolylineCursor(null);
  }, [polylinePoints, elements, pushHistory]);

  const handleCanvasDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && polylinePoints.length >= 2) {
      finalizeWall();
    }
  }, [activeTool, polylinePoints, finalizeWall]);

  // -------------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------------

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => clamp(prev + delta, 0.2, 3));
    },
    []
  );

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) deleteElement(selectedElementId);
      }
      if (e.key === 'Escape') {
        if (polylinePoints.length >= 2) {
          finalizeWall();
        } else if (polylinePoints.length > 0) {
          setPolylinePoints([]);
          setPolylineCursor(null);
        } else {
          setSelectedElementId(null);
          setActiveTool('select');
        }
      }
      if (e.key === 'Enter' && polylinePoints.length >= 2) {
        e.preventDefault();
        finalizeWall();
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (selectedElementId) duplicateElement(selectedElementId);
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        savePlan();
      }
      if (e.key === 'v') setActiveTool('select');
      if (e.key === 'b') setActiveTool('booth');
      if (e.key === 'w') setActiveTool('wall');
      if (e.key === 't') setActiveTool('label');
      if (e.key === 'h') setActiveTool('pan');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, deleteElement, undo, redo, duplicateElement, savePlan, polylinePoints, finalizeWall]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderElement = (el: PlanElement) => {
    if (!el.isVisible) return null;
    const isSelected = el.id === selectedElementId;

    // Wall elements use polyline rendering
    if (el.type === 'wall' && el.points && el.points.length >= 2) {
      const pointsStr = el.points.map((p) => `${p.x},${p.y}`).join(' ');
      return (
        <g key={el.id}>
          {/* Invisible fat hit area for easier selection */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke="transparent"
            strokeWidth={(el.strokeWidth ?? 4) + 10}
            strokeLinecap="round"
            strokeLinejoin="round"
            cursor={el.isLocked ? 'default' : 'pointer'}
            onMouseDown={(e) => handleElementMouseDown(e, el.id)}
          />
          {/* Visible wall line */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke={el.color}
            strokeWidth={el.strokeWidth ?? 4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={el.opacity}
            pointerEvents="none"
          />
          {/* Selection highlight */}
          {isSelected && (
            <>
              <polyline
                points={pointsStr}
                fill="none"
                stroke="#2563EB"
                strokeWidth={(el.strokeWidth ?? 4) + 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.4}
                pointerEvents="none"
              />
              {/* Vertex handles */}
              {el.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={4 / zoom}
                  fill="#2563EB"
                  stroke="#fff"
                  strokeWidth={1 / zoom}
                  cursor="move"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                    // Start vertex drag
                    const svgPt = getSvgPoint(e.clientX, e.clientY);
                    setDragState({
                      elementId: el.id,
                      startX: svgPt.x,
                      startY: svgPt.y,
                      elementStartX: p.x,
                      elementStartY: p.y,
                      mode: `vertex-${i}` as DragState['mode'],
                    });
                  }}
                />
              ))}
            </>
          )}
        </g>
      );
    }

    // All other elements: rect-based rendering
    return (
      <g key={el.id} transform={`translate(${el.x}, ${el.y})${el.rotation ? ` rotate(${el.rotation} ${el.width / 2} ${el.height / 2})` : ''}`}>
        {/* Main shape */}
        <rect
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          fill={el.color === 'transparent' ? 'none' : el.color}
          opacity={el.opacity}
          stroke={isSelected ? '#2563EB' : (el.type === 'booth' ? 'rgba(0,0,0,0.2)' : 'none')}
          strokeWidth={isSelected ? 2 / zoom : (el.type === 'booth' ? 1 : 0)}
          strokeDasharray={isSelected ? `${4 / zoom}` : 'none'}
          rx={el.type === 'booth' ? 4 : (el.type === 'decoration' ? 8 : 0)}
          cursor={el.isLocked ? 'default' : 'move'}
          onMouseDown={(e) => handleElementMouseDown(e, el.id)}
          className="transition-opacity"
        />

        {/* Label */}
        {el.label && (
          <text
            x={el.width / 2}
            y={el.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(el.width / (el.label.length * 0.7), el.height * 0.4, 14)}
            fontWeight={el.type === 'booth' ? '600' : '400'}
            fill={el.type === 'label' ? '#111' : '#fff'}
            pointerEvents="none"
            style={{ userSelect: 'none' }}
          >
            {el.label}
          </text>
        )}

        {/* Booth price hint */}
        {el.type === 'booth' && el.priceCents !== undefined && el.priceCents > 0 && (
          <text
            x={el.width / 2}
            y={el.height / 2 + Math.min(el.height * 0.25, 12)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(10, el.height * 0.2)}
            fill="rgba(255,255,255,0.8)"
            pointerEvents="none"
            style={{ userSelect: 'none' }}
          >
            {(el.priceCents / 100).toFixed(0)}€
          </text>
        )}

        {/* Selection handles */}
        {isSelected && !el.isLocked && (
          <>
            {(['resize-tl', 'resize-tr', 'resize-bl', 'resize-br'] as const).map((corner) => {
              const cx = corner.includes('r') ? el.width : 0;
              const cy = corner.includes('b') ? el.height : 0;
              return (
                <rect
                  key={corner}
                  x={cx - 4 / zoom}
                  y={cy - 4 / zoom}
                  width={8 / zoom}
                  height={8 / zoom}
                  fill="#2563EB"
                  stroke="#fff"
                  strokeWidth={1 / zoom}
                  cursor={corner.includes('tl') || corner.includes('br') ? 'nwse-resize' : 'nesw-resize'}
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, el.id, corner)}
                />
              );
            })}
          </>
        )}
      </g>
    );
  };

  const renderGrid = () => {
    if (!showGrid || gridSize <= 0) return null;
    const lines = [];
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      lines.push(
        <line
          key={`v${x}`}
          x1={x} y1={0} x2={x} y2={canvasHeight}
          stroke="#e5e7eb"
          strokeWidth={0.5 / zoom}
        />
      );
    }
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      lines.push(
        <line
          key={`h${y}`}
          x1={0} y1={y} x2={canvasWidth} y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.5 / zoom}
        />
      );
    }
    return <g>{lines}</g>;
  };

  // -------------------------------------------------------------------------
  // Loading / No edition
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeEdition) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Aucune edition active. Creez d'abord une edition.</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h2 className="text-sm font-semibold text-foreground">Editeur de plan</h2>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Plan selector */}
        {floorPlans.length > 0 && (
          <select
            value={selectedPlanId ?? ''}
            onChange={(e) => {
              const plan = floorPlans.find((p) => p.id === e.target.value);
              if (plan) loadPlan(plan, boothLocations);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            {floorPlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setShowCreateDialog(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Nouveau plan"
        >
          <Plus className="h-4 w-4" />
        </button>

        {selectedPlanId && (
          <button
            onClick={deletePlan}
            className="rounded-md p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer ce plan"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="flex-1" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={historyIndex <= 0} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30" title="Annuler (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-30" title="Retablir (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Zoom */}
        <button onClick={() => setZoom((z) => clamp(z - 0.1, 0.2, 3))} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[40px] text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => clamp(z + 0.1, 0.2, 3))} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Save */}
        <button
          onClick={savePlan}
          disabled={saving || !selectedPlanId}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            saveSuccess
              ? 'bg-green-500 text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          } disabled:opacity-50`}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? 'Sauvegarde...' : saveSuccess ? 'Sauvegarde!' : 'Sauvegarder'}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar — tools */}
        <div className="flex w-12 flex-col items-center gap-1 border-r border-border bg-card py-2">
          {([
            { tool: 'select' as Tool, icon: MousePointer2, label: 'Selection (V)', key: 'v' },
            { tool: 'booth' as Tool, icon: Square, label: 'Stand (B)', key: 'b' },
            { tool: 'wall' as Tool, icon: () => <div className="h-0.5 w-4 bg-current" />, label: 'Mur (W)', key: 'w' },
            { tool: 'label' as Tool, icon: Type, label: 'Texte (T)', key: 't' },
            { tool: 'decoration' as Tool, icon: () => <div className="h-3.5 w-3.5 rounded-full border-2 border-current" />, label: 'Decoration', key: '' },
            { tool: 'pan' as Tool, icon: Move, label: 'Deplacer (H)', key: 'h' },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tool}
                onClick={() => {
                  if (activeTool === 'wall' && polylinePoints.length >= 2) finalizeWall();
                  else if (activeTool === 'wall') { setPolylinePoints([]); setPolylineCursor(null); }
                  setActiveTool(item.tool);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  activeTool === item.tool
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}

          <div className="my-1 h-px w-6 bg-border" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              showGrid ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
            title="Grille"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-900"
          style={{ cursor: activeTool === 'pan' || isPanning ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }}
        >
          {!selectedPlanId ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Layers className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun plan. Creez votre premier plan.</p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Creer un plan
              </button>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              onWheel={handleWheel}
              className="select-none"
            >
              <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
                {/* Canvas background */}
                <rect
                  x={0} y={0}
                  width={canvasWidth} height={canvasHeight}
                  fill="white"
                  stroke="#d1d5db"
                  strokeWidth={1 / zoom}
                />

                {/* Background image */}
                {backgroundUrl && (
                  <image
                    href={backgroundUrl}
                    x={0} y={0}
                    width={canvasWidth} height={canvasHeight}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}

                {/* Grid */}
                {renderGrid()}

                {/* Elements sorted by layer */}
                {[...elements]
                  .sort((a, b) => a.layer - b.layer)
                  .map(renderElement)}

                {/* Drawing preview (rect-based tools) */}
                {drawState && (
                  <rect
                    x={drawState.current.x}
                    y={drawState.current.y}
                    width={drawState.current.width}
                    height={drawState.current.height}
                    fill={drawState.current.color === 'transparent' ? 'none' : drawState.current.color}
                    opacity={0.5}
                    stroke="#2563EB"
                    strokeWidth={1 / zoom}
                    strokeDasharray={`${4 / zoom}`}
                    rx={drawState.current.type === 'booth' ? 4 : 0}
                  />
                )}

                {/* Wall polyline preview */}
                {polylinePoints.length > 0 && (
                  <g>
                    <polyline
                      points={[...polylinePoints, ...(polylineCursor ? [polylineCursor] : [])]
                        .map((p) => `${p.x},${p.y}`)
                        .join(' ')}
                      fill="none"
                      stroke="#374151"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.7}
                    />
                    {/* Cursor line (dashed) */}
                    {polylineCursor && polylinePoints.length > 0 && (
                      <line
                        x1={polylinePoints[polylinePoints.length - 1].x}
                        y1={polylinePoints[polylinePoints.length - 1].y}
                        x2={polylineCursor.x}
                        y2={polylineCursor.y}
                        stroke="#2563EB"
                        strokeWidth={2}
                        strokeDasharray={`${4 / zoom}`}
                        opacity={0.6}
                      />
                    )}
                    {/* Point handles */}
                    {polylinePoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={4 / zoom}
                        fill={i === 0 ? '#10B981' : '#2563EB'}
                        stroke="#fff"
                        strokeWidth={1.5 / zoom}
                      />
                    ))}
                  </g>
                )}
              </g>
            </svg>
          )}
        </div>

        {/* Right panel — Properties */}
        {showProperties && selectedPlanId && (
          <div className="w-72 overflow-y-auto border-l border-border bg-card">
            {/* Background image section */}
            <div className="border-b border-border p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                Image de fond
              </h3>
              <input
                type="text"
                value={backgroundUrl}
                onChange={(e) => setBackgroundUrl(e.target.value)}
                placeholder="URL de l'image..."
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Taille du canvas: {canvasWidth}x{canvasHeight}px
              </p>
            </div>

            {/* Grid settings */}
            <div className="border-b border-border p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Grid3X3 className="h-3.5 w-3.5" />
                Grille
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground">Taille:</label>
                <input
                  type="number"
                  value={gridSize}
                  onChange={(e) => setGridSize(Math.max(0, Number(e.target.value)))}
                  className="w-16 rounded-md border border-border bg-background px-2 py-0.5 text-xs"
                  min={0}
                  max={100}
                  step={5}
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>

            {/* Selected element properties */}
            {selectedElement ? (
              <div className="p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground">
                    {selectedElement.type === 'booth' ? 'Stand' : selectedElement.type === 'wall' ? 'Mur' : selectedElement.type === 'label' ? 'Texte' : 'Element'}
                  </h3>
                  <div className="flex gap-1">
                    <button onClick={() => updateElement(selectedElement.id, { isLocked: !selectedElement.isLocked })} className="rounded p-1 text-muted-foreground hover:bg-accent" title={selectedElement.isLocked ? 'Deverrouiller' : 'Verrouiller'}>
                      {selectedElement.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </button>
                    <button onClick={() => updateElement(selectedElement.id, { isVisible: !selectedElement.isVisible })} className="rounded p-1 text-muted-foreground hover:bg-accent">
                      {selectedElement.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button onClick={() => duplicateElement(selectedElement.id)} className="rounded p-1 text-muted-foreground hover:bg-accent" title="Dupliquer (Ctrl+D)">
                      <Copy className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteElement(selectedElement.id)} className="rounded p-1 text-destructive/70 hover:bg-destructive/10" title="Supprimer">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Label */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Libelle</label>
                    <input
                      type="text"
                      value={selectedElement.label}
                      onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">X</label>
                      <input
                        type="number"
                        value={selectedElement.x}
                        onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Y</label>
                      <input
                        type="number"
                        value={selectedElement.y}
                        onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Largeur</label>
                      <input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) => updateElement(selectedElement.id, { width: Math.max(MIN_ELEMENT_SIZE, Number(e.target.value)) })}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                        min={MIN_ELEMENT_SIZE}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Hauteur</label>
                      <input
                        type="number"
                        value={selectedElement.height}
                        onChange={(e) => updateElement(selectedElement.id, { height: Math.max(MIN_ELEMENT_SIZE, Number(e.target.value)) })}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                        min={MIN_ELEMENT_SIZE}
                      />
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Couleur</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.color === 'transparent' ? '#ffffff' : selectedElement.color}
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="h-7 w-7 cursor-pointer rounded border border-border"
                      />
                      <input
                        type="text"
                        value={selectedElement.color}
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Opacite: {Math.round(selectedElement.opacity * 100)}%</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedElement.opacity}
                      onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Wall-specific fields */}
                  {selectedElement.type === 'wall' && (
                    <div className="mt-3 space-y-2 rounded-md border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 p-2">
                      <h4 className="text-[10px] font-semibold text-foreground">Proprietes du mur</h4>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">Epaisseur: {selectedElement.strokeWidth ?? 4}px</label>
                        <input
                          type="range"
                          min={1}
                          max={20}
                          step={1}
                          value={selectedElement.strokeWidth ?? 4}
                          onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedElement.points?.length ?? 0} points
                      </p>
                    </div>
                  )}

                  {/* Booth-specific fields */}
                  {selectedElement.type === 'booth' && (
                    <div className="mt-3 space-y-2 rounded-md border border-primary/20 bg-primary/5 p-2">
                      <h4 className="text-[10px] font-semibold text-primary">Proprietes du stand</h4>

                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">Code stand</label>
                        <input
                          type="text"
                          value={selectedElement.boothCode ?? ''}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              boothCode: e.target.value,
                              label: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                          placeholder="A1"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">Zone</label>
                        <input
                          type="text"
                          value={selectedElement.zone ?? ''}
                          onChange={(e) => updateElement(selectedElement.id, { zone: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                          placeholder="Hall A"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">Prix (euros)</label>
                        <input
                          type="number"
                          value={((selectedElement.priceCents ?? 0) / 100).toFixed(2)}
                          onChange={(e) => updateElement(selectedElement.id, { priceCents: Math.round(Number(e.target.value) * 100) })}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                          min={0}
                          step={0.5}
                        />
                      </div>

                      {selectedElement.boothId && (
                        <p className="text-[10px] text-muted-foreground">
                          Lie a l'emplacement: {selectedElement.boothId.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick color picker for booths */}
                  {selectedElement.type === 'booth' && (
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Couleur rapide</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {BOOTH_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateElement(selectedElement.id, { color: c })}
                            className={`h-5 w-5 rounded border-2 transition-transform hover:scale-110 ${
                              selectedElement.color === c ? 'border-foreground scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3">
                <p className="text-xs text-muted-foreground">
                  Selectionnez un element pour modifier ses proprietes, ou utilisez les outils pour en ajouter.
                </p>

                {/* Elements list */}
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold text-foreground">
                    Elements ({elements.length})
                  </h3>
                  <div className="space-y-0.5">
                    {[...elements]
                      .sort((a, b) => b.layer - a.layer)
                      .map((el) => (
                        <button
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent ${
                            selectedElementId === el.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: el.color === 'transparent' ? '#e5e7eb' : el.color }}
                          />
                          <span className="flex-1 truncate">
                            {el.label || el.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {el.type === 'booth' ? 'Stand' : el.type === 'wall' ? 'Mur' : el.type === 'label' ? 'Texte' : el.type}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground">
                  <p>Stands: {elements.filter((e) => e.type === 'booth').length}</p>
                  <p>Elements: {elements.length}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create plan dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Nouveau plan</h3>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="Nom du plan (ex: Hall Principal)"
              className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createPlan()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCreateDialog(false); setNewPlanName(''); }}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                onClick={createPlan}
                disabled={!newPlanName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="flex items-center gap-4 border-t border-border bg-card px-4 py-1 text-[10px] text-muted-foreground">
        <span>Outil: {activeTool === 'select' ? 'Selection' : activeTool === 'booth' ? 'Stand' : activeTool === 'wall' ? 'Mur' : activeTool === 'label' ? 'Texte' : activeTool === 'decoration' ? 'Decoration' : 'Deplacer'}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Grille: {gridSize}px</span>
        {selectedElement && <span>Selection: {selectedElement.label || selectedElement.type}</span>}
        <div className="flex-1" />
        {activeTool === 'wall' && polylinePoints.length > 0 ? (
          <span className="text-primary font-medium">Cliquez pour ajouter des points | Double-clic ou Entree pour terminer | Echap pour annuler</span>
        ) : activeTool === 'wall' ? (
          <span>Cliquez pour placer le premier point du mur</span>
        ) : (
          <span>Ctrl+S: Sauvegarder | Suppr: Supprimer | Ctrl+Z/Y: Annuler/Retablir | Ctrl+D: Dupliquer</span>
        )}
      </div>
    </div>
  );
}
