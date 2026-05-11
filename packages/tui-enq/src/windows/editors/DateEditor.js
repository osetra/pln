import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'
import { state } from '../../state.js'

export default class DateEditor extends Window {
    constructor() {
        super()

        this.keyHandlers = {
            /* navigation */
            'j': this.down.bind(this),
            'о': this.down.bind(this),
            'k': this.up.bind(this),
            'л': this.up.bind(this),

            'q': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },
            'й': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },

            'l': () => { this.prompt.submit()},
            'д': () => { this.prompt.submit()},

            /* help */
            '?': this.showHelp.bind(this),
        }
        this.dateProperty = null
        //state.windows.dateSelector = this
        this.openFieldSelector()
    }

    /**
     * Первый этап: выбор поля даты (без keyHandlers)
     */
    openFieldSelector() {
        if (!state.currentTask) {
            this.close()
            return
        }

        const dateFields = [
            { 
                message: '📅 Due date', 
                value: 'due',
                hint: this.#formatDateHint(state.currentTask.due)
            },
            { 
                message: '🚩 Start date', 
                value: 'start',
                hint: this.#formatDateHint(state.currentTask.start)
            },
            { 
                message: '✅ Completed date', 
                value: 'completed',
                hint: this.#formatDateHint(state.currentTask.completed)
            },
            { 
                message: '🌱 Created date', 
                value: 'created',
                hint: this.#formatDateHint(state.currentTask.created)
            }
        ]

        this.prompt = new Enquirer.Select({
            message: 'Select date field:',
            choices: dateFields.map(field => ({
                message: `${field.message} ${field.hint}`,
                value: field.value
            }))
        })

        this.prompt.run()
            .then(selectedField => {
                this.dateProperty = selectedField
                this.openDatePicker()
            })
            .catch(() => this.close())
    }

    /**
     * Второй этап: выбор даты с keyHandlers
     */
    openDatePicker() {
        if (!this.dateProperty) {
            this.close()
            return
        }

        // Получаем текущую дату или используем сегодняшнюю
        const currentDateValue = state.currentTask[this.dateProperty]
        const initialDate = currentDateValue 
            ? new Date(currentDateValue)
            : new Date()

        // Создаем кастомный DatePicker как в старом коде
        this.prompt = new DatePicker({
            message: `Select ${this.dateProperty} date:`,
            initial: initialDate
        })

        // 📌 ДОБАВЛЯЕМ KEYHANDLERS ТОЛЬКО ДЛЯ DATEPICKER
        this.keyHandlers = {
            'q': this.close.bind(this),
            'й': this.close.bind(this),

            /* navigation - делегируем DatePicker */
            'j': () => { 
                // down в DatePicker уменьшает значение
                this.prompt.value = this.prompt.increment(this.prompt.value, -1)
                this.prompt.render()
            },
            'о': () => { 
                this.prompt.value = this.prompt.increment(this.prompt.value, -1)
                this.prompt.render()
            },
            'k': () => { 
                // up в DatePicker увеличивает значение
                this.prompt.value = this.prompt.increment(this.prompt.value, 1)
                this.prompt.render()
            },
            'л': () => { 
                this.prompt.value = this.prompt.increment(this.prompt.value, 1)
                this.prompt.render()
            },
            'h': () => { 
                // left переключает на предыдущее поле
                this.prompt.activeFieldIndex = (this.prompt.activeFieldIndex - 1 + this.prompt.fields.length) % this.prompt.fields.length
                this.prompt.render()
            },
            'р': () => { 
                this.prompt.activeFieldIndex = (this.prompt.activeFieldIndex - 1 + this.prompt.fields.length) % this.prompt.fields.length
                this.prompt.render()
            },
        }

        // Настраиваем обработку клавиш для DatePicker
        const originalKeypress = this.prompt.keypress.bind(this.prompt)
        
        this.prompt.keypress = (input, key) => {
            // Вызываем обработчики из keyHandlers
            const handler = this.keyHandlers[key.raw] ?? this.keyHandlers[key.name]
            if (handler) {
                handler.call(this, key)
                return
            }
            
            // Оригинальная логика DatePicker для остальных клавиш
            if (originalKeypress) {
                return originalKeypress(input, key)
            }
        }

        this.prompt.run()
            .then(() => {
                this.onSave(this.prompt.value)
            })
            .catch(() => this.close())
    }

    /**
     * Форматирует подсказку с текущей датой
     * @param {Date|string} date 
     * @returns {string}
     */
    #formatDateHint(date) {
        if (!date) return '(not set)'
        
        const dateObj = new Date(date)
        if (isNaN(dateObj.getTime())) return '(invalid)'
        
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        };

        return dateObj.toLocaleString('ru-RU', options)
            .replace(',', '')
            .replace(/\./g, '-')
            .replace(/\s+/g, ' ');
        return `(${dateObj.toISOString().split('T')[0]})`
    }

    /**
     * @param {Date} newDate
     */
    onSave(newDate) {
        if (!state.currentTask || !this.dateProperty) {
            return this.close()
        }

        this.updateTaskProp({ [this.dateProperty]: newDate })
        return this.close()
    }

}


import enquirer from 'enquirer';
const { Prompt } = enquirer;

export class DatePicker extends Prompt {
  constructor(options = {}) {
    super(options);
    this.value = options.initial || new Date();
    this.activeFieldIndex = 0;
    this.fields = [
      { unit: 'year', start: 4, end: 8 },
      { unit: 'month', start: 9, end: 11 },
      { unit: 'day', start: 12, end: 14 },
      { unit: 'hour', start: 15, end: 17 },
      { unit: 'minute', start: 18, end: 20 }
    ];
  }

  formatDate(date) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(date);
    const weekday = weekdays[d.getDay()];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${weekday} ${year}-${month}-${day} ${hours}:${minutes}`;
  }

  increment(date, step) {
    const newDate = new Date(date);
    const field = this.fields[this.activeFieldIndex];
    switch (field.unit) {
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + step);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + step);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + step);
        break;
      case 'hour':
        newDate.setHours(newDate.getHours() + step);
        break;
      case 'minute':
        newDate.setMinutes(newDate.getMinutes() + step);
        break;
    }
    return newDate;
  }

  render() {
    this.clear();
    const formatted = this.formatDate(this.value);
    const field = this.fields[this.activeFieldIndex];
    const start = field.start;
    const end = field.end;

    let output = formatted.slice(0, start) +
      `\x1b[36m${formatted.slice(start, end)}\x1b[0m` + // cyan color
      formatted.slice(end);

    this.write(`${this.state.message}: ${output}`);
  }

  async keypress(input, key) {
    if (key.name === 'escape') {
      this.cancel();
      return;
    }
    if (key.name === 'return') {
      this.submit();
      return;
    }
    if (key.name === 'left' || key.raw === 'h' || key.raw === 'р') {
      this.activeFieldIndex = (this.activeFieldIndex - 1 + this.fields.length) % this.fields.length;
      this.render();
      return;
    }
    if (key.name === 'right' || key.raw === 'l' || key.raw === 'д') {
      this.activeFieldIndex = (this.activeFieldIndex + 1) % this.fields.length;
      this.render();
      return;
    }
    if (key.name === 'up' || key.raw === 'k' || key.raw === 'л') {
      this.value = this.increment(this.value, 1);
      this.render();
      return;
    }
    if (key.name === 'down' || key.raw === 'j' || key.raw === 'о') {
      this.value = this.increment(this.value, -1);
      this.render();
      return;
    }
    return super.keypress(input, key);
  }
}
