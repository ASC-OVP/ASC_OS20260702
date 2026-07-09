# Task Workspace Merge Guide

## Scope

This change set focuses on the Tasks workspace UI only. It does not intentionally change API routes, Prisma schema, auth, permissions, server actions, or database behavior.

## Main Files

- `features/tasks/components/TaskWorkspace.tsx`
- `features/tasks/components/TaskBoardDropdownFilters.tsx`
- `features/tasks/components/ChecklistAutoSubmit.tsx`
- `features/tasks/components/QuickTaskInput.tsx`

## UI Changes To Preserve During Merge

- The Tasks page uses a two-column admin workspace:
  - Left column: summary stats, then assignee task board.
  - Right column: quick task input, then completed-assignee ranking.
- Summary stats should remain five cards:
  - Today total tasks
  - Today completed tasks
  - Remaining tasks
  - Today assignee count
  - Average progress
- The task board period control is no longer a date range input.
  - Default mode is `today`.
  - `period=all` shows all tasks.
  - The UI exposes only `All`, `Today`, and reset controls.
- Search and dropdown filters should preserve the selected period mode.
- Checklist rows should visually live inside a distinct checklist area.
- Checked checklist items should be sorted below open items and display as completed.
- The right ranking panel is based on completed count, not incomplete count.
- Korean labels must be stored as real UTF-8 text, not escaped or mojibake placeholder text.

## Behavioral Notes

- Filtering remains query-param based.
- `period=all` is the only period query param that should be serialized.
- Absence of `period` means today's work only.
- Existing task creation and quick input submission paths should remain unchanged.
- Existing checklist auto-submit behavior should remain unchanged except for visual/sorting presentation.

## Merge Checklist

1. Keep task API routes, server actions, Prisma models, and auth logic unchanged.
2. When resolving conflicts in `TaskWorkspace.tsx`, preserve the `period: "today" | "all"` control state.
3. Ensure `TaskBoardDropdownFilters.tsx` keeps `period=all` when changing status/scope/sort/class filters.
4. Verify quick input title renders as Korean text: `빠른 업무 입력`.
5. Verify no visible Korean text appears as placeholder question marks, unicode escape text, or mojibake.
6. Run:
   - `npx.cmd tsc --noEmit`
   - `npm.cmd run lint`
7. Smoke-check `/tasks` in the browser:
   - Today/All toggles work.
   - Search keeps the chosen period.
   - Dropdown filters keep the chosen period.
   - Completed ranking shows assignees ordered by completed count.

## Known Validation

Before this commit, the workspace passed:

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
