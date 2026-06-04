import { useState, useCallback } from "react";
import type { WorkspaceColumn } from "./types";
import { DEFAULT_COLUMNS } from "./types";

export function useWorkspaceLayout() {
  const [columns] = useState<WorkspaceColumn[]>(DEFAULT_COLUMNS);
  const [activeIndex, setActiveIndex] = useState(0);

  const focusColumn = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return { columns, activeIndex, setActiveIndex, focusColumn };
}
