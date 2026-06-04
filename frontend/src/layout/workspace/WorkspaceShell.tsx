import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import { CeorlShell, type CeorlShellHandle, type ColumnDescriptor } from "../ceorl";
import type { WorkspaceColumn } from "./types";

interface WorkspaceShellProps {
  columns: WorkspaceColumn[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  renderColumn: (column: WorkspaceColumn, index: number) => ReactNode;
}

export const WorkspaceShell = forwardRef<CeorlShellHandle, WorkspaceShellProps>(
  function WorkspaceShell({ columns, activeIndex, onIndexChange, renderColumn }, ref) {
    const innerRef = useRef<CeorlShellHandle>(null);

    useImperativeHandle(ref, () => ({
      focusColumn: (i: number) => innerRef.current?.focusColumn(i),
      getColumns: () => innerRef.current?.getColumns() ?? [],
      get scrollElement() { return innerRef.current?.scrollElement ?? null; },
    }));

    const descriptors: ColumnDescriptor[] = columns.map((col, i) => ({
      id: col.id,
      width: col.width,
      content: renderColumn(col, i),
    }));

    return (
      <CeorlShell
        ref={innerRef}
        activeIndex={activeIndex}
        onIndexChange={onIndexChange}
        columns={descriptors}
        style={{ height: "100%" }}
      />
    );
  },
);

export type { CeorlShellHandle };
