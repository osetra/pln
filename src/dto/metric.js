/**
 * DTO для одной метрики аналитики задач.
 * Зачем: единый формат вывода через consolePrinter.printAnalitics.
 */
export default class Metric {
  /**
   * @param {string} label - отображаемое имя
   * @param {string} name - техническое имя
   * @param {any} value - значение метрики
   */
  constructor(label, name, value) {
    this.label = label
    this.name = name
    this.value = value
  }
}
