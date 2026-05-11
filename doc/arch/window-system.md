# Window System

> 22.02.2026

## Использование

### Файл нового окна

```javascript
import Enquirer from 'enquirer'
import { Window } from '#tui/windows/Window/index.js'
import { state } from '#tui/state.js'

export default class MyEditor extends Window {
    constructor() {
        super()           // автоматически замораживает предыдущее окно
        this.open()
    }

    open() {
        this.prompt = new Enquirer.Input({
            message: 'Введите значение:',
            initial: state.currentTask?.someProp || ''
        })

        this.prompt.run()
            .then(value => {
                this.onSave(value)
                this.close()
            })
            .catch(() => this.close())
    }

    onSave(value) {
        this.updateTaskProp({ someProp: value })
    }
}
```

#### Обработчики клавиш

```javascript
export default {
    keys: ['k', 'л'],
    description: 'Моя команда',
    action() {
        // действие
    }
}
```

Добавь в `handlers/index.js`:
```javascript
import myCommand from './myCommand.js'

export const keyHandlers = {
    ...myCommand,
}
```

### Открыть новое окно

Просто создай экземпляр класса:

```javascript
new SummaryEditor()    // SummaryEditor::constructor вызывает super() → freeze() → open()
new DateEditor()
new StatusEditor()
```

Окно само заморозит текущее (через `super()` в конструкторе).

### Закрыть текущее окно

```javascript
this.close()           // Window::close() автоматически разморозит предыдущее
```

## Под капотом

### freeze() / unfreeze()

- **freeze()** — останавливает prompt (`this.#prompt.stop()`), окно "замораживается" и не реагирует на ввод
- **unfreeze()** — перерисовывает окно (`console.clear() + this.open()`)

### Стек окон

Окна хранятся в `state.activeWindows[]`:

```
new TaskPicker()     → activeWindows = [TaskPicker]
new SummaryEditor()  → TaskPicker.freeze(), activeWindows = [TaskPicker, SummaryEditor]
new DateEditor()     → SummaryEditor.freeze(), activeWindows = [TaskPicker, SummaryEditor, DateEditor]

DateEditor.close()   → pop(), SummaryEditor.unfreeze()
SummaryEditor.close()→ pop(), TaskPicker.unfreeze()
TaskPicker.close()  → exit
```

### freezeOtherWindows()

Вызывается в конструкторе Window:

```javascript
freezeOtherWindows() {
    state.activeWindows.forEach(aw => {
        if (aw && aw !== this) aw.freeze()
    })
}
```

### updateTaskProp()

Универсальный метод для массового обновления задач:

```javascript
this.updateTaskProp({ status: 'done' })
```

Работает с:
- одной задачей (`state.currentTask`)
- массово выделенными задачами (`state.selectedTasks`)
