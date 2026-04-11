import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────────────────────────

type ColumnType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

interface SheetColumn {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
  options?: string[]; // for select type
}

interface SheetRow {
  id: string;
  row_index: number;
  cells: Record<string, unknown>;
}

// Raw API response
interface SheetResponse {
  id: string;
  title: string;
  columns_def: SheetColumn[];
  rows: SheetRow[];
  version: number;
  [key: string]: unknown;
}

// Normalized for component use
interface Sheet {
  id: string;
  title: string;
  columns: SheetColumn[];
  rows: SheetRow[];
  version: number;
}

function normalizeSheet(raw: SheetResponse): Sheet {
  return {
    id: raw.id,
    title: raw.title,
    columns: raw.columns_def || [],
    rows: (raw.rows || []).sort((a, b) => (a.row_index ?? 0) - (b.row_index ?? 0)),
    version: raw.version,
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Texte',
  number: 'Nombre',
  date: 'Date',
  select: 'Selection',
  checkbox: 'Case a cocher',
};

const COLUMN_TYPE_ICONS: Record<ColumnType, typeof Type> = {
  text: Type,
  number: Hash,
  date: Calendar,
  select: List,
  checkbox: CheckSquare,
};

const POLL_INTERVAL = 3000;

// ─── Column Header Menu ────────────────────────────────────────────────────

function ColumnHeaderMenu({
  column,
  onRename,
  onChangeType,
  onDelete,
  onClose,
}: {
  column: SheetColumn;
  onRename: (name: string) => void;
  onChangeType: (type: ColumnType) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const handleRenameSubmit = () => {
    if (nameValue.trim() && nameValue.trim() !== column.name) {
      onRename(nameValue.trim());
    }
    setRenaming(false);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-md border border-gray-200 bg-white shadow-lg">
      {renaming ? (
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') { setRenaming(false); onClose(); }
            }}
            onBlur={handleRenameSubmit}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      ) : (
        <div className="py-1">
          <button
            onClick={() => setRenaming(true)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Renommer
          </button>
          <div className="border-t border-gray-100 my-1" />
          <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">Type</div>
          {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((t) => {
            const Icon = COLUMN_TYPE_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => { onChangeType(t); onClose(); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 ${
                  column.type === t ? 'text-blue-600 font-medium' : 'text-gray-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {COLUMN_TYPE_LABELS[t]}
              </button>
            );
          })}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer la colonne
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Cell Editor ────────────────────────────────────────────────────────────

function CellEditor({
  column,
  value,
  isSelected,
  onSelect,
  onSave,
}: {
  column: SheetColumn;
  value: unknown;
  isSelected: boolean;
  onSelect: () => void;
  onSave: (value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(value != null ? String(value) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value != null ? String(value) : '');
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    let parsed: unknown = localValue;
    if (column.type === 'number') {
      parsed = localValue === '' ? null : Number(localValue);
    } else if (column.type === 'checkbox') {
      return; // checkbox handled inline
    }
    if (parsed !== value) {
      onSave(parsed);
    }
  };

  const baseClasses = `h-8 w-full border-0 px-2 text-sm focus:outline-none ${
    isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
  }`;

  if (column.type === 'checkbox') {
    return (
      <div
        className={`flex h-8 items-center justify-center cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
        }`}
        onClick={onSelect}
      >
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onSave(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>
    );
  }

  if (!editing) {
    return (
      <div
        className={`h-8 flex items-center px-2 text-sm cursor-text ${
          isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
        } ${column.type === 'number' ? 'justify-end' : ''}`}
        onClick={() => { onSelect(); setEditing(true); }}
      >
        {value != null && value !== '' ? String(value) : <span className="text-gray-300">&mdash;</span>}
      </div>
    );
  }

  if (column.type === 'select') {
    return (
      <select
        ref={inputRef as unknown as React.Ref<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => { setLocalValue(e.target.value); }}
        onBlur={() => {
          setEditing(false);
          if (localValue !== (value != null ? String(value) : '')) {
            onSave(localValue);
          }
        }}
        className={baseClasses}
      >
        <option value="">--</option>
        {(column.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (column.type === 'date') {
    return (
      <input
        ref={inputRef}
        type="date"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
        className={baseClasses}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type={column.type === 'number' ? 'number' : 'text'}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') { setEditing(false); setLocalValue(value != null ? String(value) : ''); } }}
      className={`${baseClasses} ${column.type === 'number' ? 'text-right' : ''}`}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WorkspaceSheetPage() {
  const { slug, sheetId } = useParams<{ slug: string; sheetId: string }>();
  const navigate = useNavigate();
  const { festival } = useTenantStore();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [openMenuColId, setOpenMenuColId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const versionRef = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ─── Load sheet ──────────────────────────────────────────────────────

  const loadSheet = useCallback(async () => {
    if (!sheetId) return;
    const res = await api.get<SheetResponse>(`/workspace-sheets/${sheetId}`);
    if (res.success && res.data) {
      setSheet(normalizeSheet(res.data));
      setTitleValue(res.data.title);
      versionRef.current = res.data.version;
      setError(null);
    } else {
      setError(res.error || 'Impossible de charger la feuille');
    }
    setLoading(false);
  }, [sheetId]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  // ─── Polling ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sheetId) return;
    const interval = setInterval(async () => {
      const res = await api.get<{
        changed: boolean;
        version: number;
        columns_def?: SheetColumn[];
        rows?: SheetRow[];
      }>(
        `/workspace-sheets/${sheetId}/poll${ApiClient_qs({ version: versionRef.current })}`
      );
      if (res.success && res.data?.changed && res.data.columns_def) {
        setSheet((prev) => prev ? {
          ...prev,
          columns: res.data!.columns_def!,
          rows: (res.data!.rows || []).sort((a, b) => (a.row_index ?? 0) - (b.row_index ?? 0)),
          version: res.data!.version,
        } : prev);
        versionRef.current = res.data.version;
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [sheetId]);

  // ─── Title ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const saveTitle = async () => {
    setEditingTitle(false);
    if (!sheet || titleValue.trim() === sheet.title) return;
    await api.put(`/workspace-sheets/${sheet.id}`, { title: titleValue.trim() });
  };

  // ─── Column ops ──────────────────────────────────────────────────────

  const addColumn = async () => {
    if (!sheet) return;
    const name = `Colonne ${sheet.columns.length + 1}`;
    const res = await api.post<unknown>(`/workspace-sheets/${sheet.id}/columns`, {
      name,
      type: 'text',
    });
    if (res.success) {
      await loadSheet();
    }
  };

  const renameColumn = async (colId: string, name: string) => {
    if (!sheet) return;
    const res = await api.put<unknown>(`/workspace-sheets/${sheet.id}/columns/${colId}`, { name });
    if (res.success) {
      await loadSheet();
    }
  };

  const changeColumnType = async (colId: string, type: ColumnType) => {
    if (!sheet) return;
    const res = await api.put<unknown>(`/workspace-sheets/${sheet.id}/columns/${colId}`, { type });
    if (res.success) {
      await loadSheet();
    }
  };

  const deleteColumn = async (colId: string) => {
    if (!sheet) return;
    const res = await api.delete<unknown>(`/workspace-sheets/${sheet.id}/columns/${colId}`);
    if (res.success) {
      await loadSheet();
    }
  };

  // ─── Row ops ─────────────────────────────────────────────────────────

  const addRow = async () => {
    if (!sheet) return;
    const cells: Record<string, unknown> = {};
    sheet.columns.forEach((c) => {
      cells[c.id] = c.type === 'checkbox' ? false : '';
    });
    const res = await api.post<unknown>(`/workspace-sheets/${sheet.id}/rows`, { cells });
    if (res.success) {
      await loadSheet(); // Reload full sheet
    }
  };

  // ─── Cell save ───────────────────────────────────────────────────────

  const saveCell = async (rowId: string, colId: string, value: unknown) => {
    setSaving(true);
    const res = await api.put<unknown>(`/workspace-sheets/rows/${rowId}`, {
      cells: { [colId]: value },
    });
    if (res.success) {
      await loadSheet(); // Reload to get version bump
    }
    setSaving(false);
  };

  // ─── Close menu on outside click ─────────────────────────────────────

  useEffect(() => {
    if (!openMenuColId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-col-menu]')) {
        setOpenMenuColId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuColId]);

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-gray-600">{error || 'Feuille introuvable'}</p>
        <button
          onClick={() => navigate(`/f/${slug}/admin/workspace`)}
          className="text-sm text-blue-600 hover:underline"
        >
          Retour a l'espace de travail
        </button>
      </div>
    );
  }

  const columns = sheet.columns; // already sorted by normalizeSheet
  const rows = sheet.rows; // already sorted by row_index via normalizeSheet

  return (
    <div className="flex h-full flex-col">
      {/* ─── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <button
          onClick={() => navigate(`/f/${slug}/admin/workspace`)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {editingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(sheet.title); } }}
            className="rounded border border-gray-300 px-2 py-1 text-lg font-semibold focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {sheet.title}
          </h1>
        )}

        {saving && (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Enregistrement...
          </span>
        )}
      </div>

      {/* ─── Spreadsheet ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <table className="w-full border-collapse">
          {/* Column headers */}
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr>
              {/* Row number header */}
              <th className="w-12 border-b border-r border-gray-300 bg-gray-200 px-2 py-1.5 text-center text-xs font-medium text-gray-500">
                #
              </th>

              {columns.map((col) => {
                const Icon = COLUMN_TYPE_ICONS[col.type];
                return (
                  <th
                    key={col.id}
                    className="relative min-w-[140px] border-b border-r border-gray-300 bg-gray-100 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="flex-1 truncate text-left text-xs font-medium text-gray-700">
                        {col.name}
                      </span>
                      <button
                        data-col-menu
                        onClick={(e) => { e.stopPropagation(); setOpenMenuColId(openMenuColId === col.id ? null : col.id); }}
                        className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {openMenuColId === col.id && (
                      <div data-col-menu>
                        <ColumnHeaderMenu
                          column={col}
                          onRename={(name) => renameColumn(col.id, name)}
                          onChangeType={(type) => changeColumnType(col.id, type)}
                          onDelete={() => deleteColumn(col.id)}
                          onClose={() => setOpenMenuColId(null)}
                        />
                      </div>
                    )}
                  </th>
                );
              })}

              {/* Add column */}
              <th className="w-10 border-b border-gray-300 bg-gray-100">
                <button
                  onClick={addColumn}
                  className="flex h-full w-full items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  title="Ajouter une colonne"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.id} className="group hover:bg-blue-50/30">
                {/* Row number */}
                <td className="w-12 border-b border-r border-gray-200 bg-gray-50 px-2 py-0 text-center text-xs text-gray-400">
                  {rowIdx + 1}
                </td>

                {columns.map((col) => (
                  <td
                    key={`${row.id}-${col.id}`}
                    className="border-b border-r border-gray-200 p-0"
                  >
                    <CellEditor
                      column={col}
                      value={row.cells[col.id]}
                      isSelected={selectedCell?.rowId === row.id && selectedCell?.colId === col.id}
                      onSelect={() => setSelectedCell({ rowId: row.id, colId: col.id })}
                      onSave={(value) => saveCell(row.id, col.id, value)}
                    />
                  </td>
                ))}

                {/* Empty cell for add-column column */}
                <td className="w-10 border-b border-gray-200" />
              </tr>
            ))}

            {/* Add row */}
            <tr>
              <td
                colSpan={columns.length + 2}
                className="border-b border-gray-200 p-0"
              >
                <button
                  onClick={addRow}
                  className="flex w-full items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle ligne
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function ApiClient_qs(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}
