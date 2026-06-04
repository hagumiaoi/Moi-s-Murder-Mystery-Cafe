## 1. CSS Variables Foundation

- [x] 1.1 Add `:root` block at top of `App.css` with all 28 semantic variables (backgrounds, text, accent, danger, border, overlay, player-bubble, scrollbar)
- [x] 1.2 Add `--text-xs/sm/base/lg/xl` font-size variables to the `:root` block
- [x] 1.3 Verify build passes with new variables (no selection changes yet)

## 2. Replace Hardcoded Colors

- [x] 2.1 Replace all background colors in selectors with `var(--bg-*)` references
- [x] 2.2 Replace all text/foreground colors with `var(--text-*)` references
- [x] 2.3 Replace all gold accent colors with `var(--accent)` and `var(--accent-glow-*)` references
- [x] 2.4 Replace all red/danger colors with `var(--danger-*)` references
- [x] 2.5 Replace all border/divider colors with `var(--border)` / `var(--border-light)`
- [x] 2.6 Replace overlay, scrollbar, and player-bubble colors with variables
- [x] 2.7 Verify `grep '#[0-9a-fA-F]\{6\}' App.css` returns zero matches outside `:root`
- [x] 2.8 Build and verify no visual regression

## 3. Ceorl Color Integration

- [x] 3.1 Override `--ceorl-focus-color` to use `var(--accent)` in `App.css` or `main.tsx`
- [x] 3.2 Update ceorl column border to use `var(--border)` if needed

## 4. Lucide Icon Library

- [x] 4.1 Install `lucide-react` dependency in frontend
- [x] 4.2 Create icon mapping file (`layout/workspace/icons.tsx`) mapping icon name strings to Lucide components
- [x] 4.3 Update `WorkspaceColumn.icon` field type to string (kebab-case icon names)
- [x] 4.4 Update `DEFAULT_COLUMNS` in `types.ts` with kebab-case icon strings
- [x] 4.5 Update `WorkspaceDock` to render Lucide icons using the mapping instead of emoji strings
- [x] 4.6 Replace emoji in `App.tsx`: 🔄→RotateCcw, 🎮→Gamepad2, 📊→ChartBar, 👥→Users, 🕵️→Binoculars, 📅→Calendar, 🔧→Wrench, 🔥→Flame, 🔍→Search
- [x] 4.7 Replace emoji in `ChatBox.tsx`: 💬→MessageCircle
- [x] 4.8 Replace emoji in `StoryPanel.tsx`: 📖→BookOpen, 🧠→Brain
- [x] 4.9 Build and verify no emoji references remain in JSX source

## 5. Typography Scale

- [x] 5.1 Replace all `font-size: 9px` / `11px` → `var(--text-xs)` (10px)
- [x] 5.2 Replace all `font-size: 12px` / `13px` → `var(--text-sm)` (12px)
- [x] 5.3 Replace all `font-size: 14px` / `15px` → `var(--text-base)` (14px)
- [x] 5.4 Replace `font-size: 16px` → `var(--text-lg)` (16px)
- [x] 5.5 Replace `font-size: 20px` → `var(--text-xl)` (20px)
- [x] 5.6 Adjust dock and panel header spacing if needed after scale change

## 6. Verification

- [x] 6.1 Run frontend build and check CSS size reduction
- [x] 6.2 Run backend tests to ensure no API breakage
- [ ] 6.3 Visual check: compare before/after screenshots for all 5 workspace columns
- [ ] 6.4 Verify icons render consistently across Chrome and Firefox
