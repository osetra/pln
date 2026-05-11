Точка входа: `src/controllers/tui/tui.js` → `new TaskPicker()`

**Window System** (`src/controllers/tui/windows/Window/`):
- Базовый класс `Window extends NavigationController`
- Окна хранятся в `state.activeWindows[]` (стек)
- `new SomeWindow()` → `super()` → `freezeOtherWindows()` → текущее окно замораживается
- `this.close()` → закрывает текущее, `unfreeze()` предыдущего
- `this.updateTaskProp({ prop: value })` — обновляет задачу (или все выделенные) и сохраняет через EditCommand

**TUI-состояние** (`src/controllers/tui/state.js`):
- `state.tasks` — setter вызывает `analizator.analize()` и `consolePrinter.print()`
- `state.currentTask` — текущая задача под курсором
- `state.selectedTasks[]` — выделенные задачи для массовых операций
- `state.currentFilter` — применяет фронтенд-фильтрацию

**Окна TUI** в `src/controllers/tui/windows/`:
- `TaskPicker/` — главное окно со списком задач; handlers разбиты по папкам: editing/, navigation/, selection/, filters/, tasks/, system/
- `editors/` — редакторы отдельных полей (Summary, Status, Date, Categories, Priority, Parent)
- `Timeline/` — временная шкала задач
- `SearchWindow.js`, `DeleteModal.js`, `TaskForm.js`, `Report.js`

- Добавить новое TUI-окно: @/doc/architecture/window-system.md
