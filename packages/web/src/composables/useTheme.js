import { ref } from 'vue'
import { setCssVar } from 'quasar'

const isDark = ref(localStorage.getItem('pln-dark') !== 'false')
const accentColor = ref(localStorage.getItem('pln-accent') || '#1976d2')

/**
 * Управление темой приложения (dark/light, акцентный цвет)
 * @returns {{ isDark, accentColor, toggleDark, setAccent, initTheme }}
 */
export function useTheme() {
  /**
   * Переключает dark/light режим
   * @param {object} $q - инстанс Quasar
   */
  function toggleDark($q) {
    isDark.value = !isDark.value
    localStorage.setItem('pln-dark', isDark.value)
    $q.dark.set(isDark.value)
  }

  /**
   * Устанавливает акцентный цвет
   * @param {string} hex - цвет в формате hex
   */
  function setAccent(hex) {
    accentColor.value = hex
    localStorage.setItem('pln-accent', hex)
    setCssVar('primary', hex)
  }

  /**
   * Инициализирует тему из localStorage
   * @param {object} $q - инстанс Quasar
   */
  function initTheme($q) {
    $q.dark.set(isDark.value)
    setCssVar('primary', accentColor.value)
  }

  return { isDark, accentColor, toggleDark, setAccent, initTheme }
}
