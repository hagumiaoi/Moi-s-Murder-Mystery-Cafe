import { useState, useCallback, useMemo } from "react";
import type { WorkspaceColumn } from "./types";
import { DEFAULT_COLUMNS } from "./types";

type ManifestWorkspaceColumn = Omit<Partial<WorkspaceColumn>, "width"> & { width?: string };

export function useWorkspaceLayout(manifestColumns?: ManifestWorkspaceColumn[]) {
  const columns = useMemo<WorkspaceColumn[]>(() => {
    if (!manifestColumns || manifestColumns.length === 0) return DEFAULT_COLUMNS;
    return manifestColumns.map(
      (col): WorkspaceColumn => ({
        id: col.id ?? "",
        type: col.type ?? "",
        width: (col.width as WorkspaceColumn["width"]) ?? "1/4",
        title: col.title ?? col.type ?? "",
        icon: col.icon ?? "search",
        filter: col.filter,
        sections: col.sections,
        config: col.config,
      }),
    );
  }, [manifestColumns]);

  const [activeIndex, setActiveIndex] = useState(0);

  const focusColumn = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return { columns, activeIndex, setActiveIndex, focusColumn };
}
