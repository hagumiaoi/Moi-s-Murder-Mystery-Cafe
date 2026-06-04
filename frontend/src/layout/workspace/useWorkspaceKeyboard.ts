import { useEffect } from "react";

export function useWorkspaceKeyboard(
  activeIndex: number,
  columnCount: number,
  focusColumn: (index: number) => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        focusColumn(Math.min(activeIndex + 1, columnCount - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusColumn(Math.max(activeIndex - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, columnCount, focusColumn]);
}
