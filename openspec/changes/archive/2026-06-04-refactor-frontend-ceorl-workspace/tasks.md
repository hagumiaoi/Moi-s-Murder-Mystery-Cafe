## 1. Vendor CEORL

- [x] 1.1 Copy ceorl components, hooks, types, and CSS into `frontend/src/layout/ceorl`
- [x] 1.2 Add source attribution and keep MIT license note for vendored ceorl source
- [x] 1.3 Export `CeorlShell`, `CeorlColumn`, `CeorlStack`, and related types from the local layout module

## 2. CEORL Validation (Phase 0)

- [x] 2.1 Render CeorlShell with 6 static placeholder columns in a blank route
- [x] 2.2 Verify horizontal scroll, `focusColumn`, and `activeIndex` behavior works
- [x] 2.3 Verify ceorl CSS does not conflict with existing App.css dark theme
- [x] 2.4 Confirm keyboard navigation does not intercept input/textarea focus

## 3. Workspace Foundation

- [x] 3.1 Add workspace column types with icon field and default 6-column configuration
- [x] 3.2 Implement `useWorkspaceLayout` for active index and column list state
- [x] 3.3 Implement `WorkspaceShell` using `CeorlShell`
- [x] 3.4 Render static placeholder columns (all 6) to verify layout before moving existing UI

## 4. Bottom Focus Navigation

- [x] 4.1 Implement `WorkspaceDock` at the bottom of the app shell
- [x] 4.2 Render one dock item per workspace column with title and icon
- [x] 4.3 Highlight the active column in the dock
- [x] 4.4 Wire dock clicks to `setActiveIndex` and `CeorlShellHandle.focusColumn`
- [x] 4.5 Add keyboard navigation without intercepting input/textarea/contenteditable focus

## 5. Feature Columns

- [x] 5.1 Move NPC, location, and accusation controls into `InvestigationColumn`
- [x] 5.2 Move current chat history, streaming reply, and composer into `InterrogationColumn`
- [x] 5.3 Move story log and streaming story display into `StoryLogColumn`
- [x] 5.4 Move clues, timeline, and people summary into `DossierColumn`
- [x] 5.5 Add placeholder content for `DebugColumn` (prompt debug toggle + raw output)

## 6. State Boundary Cleanup

- [x] 6.1 Extract API calls into a dedicated `features/useGameController` hook
- [x] 6.2 Stream parsing encapsulated in `useGameController`
- [x] 6.3 Game action orchestration extracted into `useGameController`
- [x] 6.4 Selectors (NPC messages, clues, timeline) rendered inline with state
- [x] 6.5 `App.tsx` reduced to workspace shell composition and controller wiring

## 7. Verification

- [x] 7.1 Run frontend build
- [x] 7.2 Run backend tests to ensure API compatibility remains intact
- [x] 7.3 Manually verify chat, stream, search, accuse, reset, and undo/resend flows
- [x] 7.4 Manually verify dock click focus, active highlight, and keyboard navigation behavior
