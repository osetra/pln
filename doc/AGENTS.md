- This file provides guidance to ai-agents when working with code in this repository.

- к каждой функции прописывать jsdoc, коротко, в нём обязательно: "зачем эта функция", все "@param", при наличии "@returns"
- после завершения выполнения плана проверь, не нужно ли внести изменения в документацию.
- периодически спрашивай юзера: не пора ли сверить `doc/help/cli-usage.md` с актуальным кодом (флаги, команды, фильтры).
- порядок внедрения нового: cli -> tui -> web
- любая новая фича сначала реализуется в `src/services/<feature>.js` (вся логика над tasks/caldav/cache), CLI/TUI/web затем тонкими обёртками вызывают сервис

## Что это
Лёгкий таск-менеджер на nodejs.
- [[CLI]], [[TUI]], [[WEB]]
- CalDAV для хранения задач
  + Radicale
- минимум зависимостей
- quasar web-frontend

## Тестовые cli-команды
```bash
./pln -t test       # получить задачи, содержащие test в summary
./pln -t test tui   # + запустить tui

./pln add -t test310  # добавить задачу с текстом test310
```
Фронтенд просим посмотреть юзера. В соседнем терминале всегда работает dev режим vite.

## Архитектура
- проект разделён на:
  - основную часть: `cli`, `tui`, `services`, `caldav`
  - `web` (npm workspace) - дополнение, использующее `services` и `config` из core
  
- импорт-алиасы `package.json`:
  - `"#src/*": "./src/*",`
    `"#tui/*": "./src/controllers/tui/*"`
- импорт-алиасы `package.json` для `web`:
  - `"#core/*": "../src/*"`

- `src/services/` общая логика для приложения: для `cli/`, `tui/`, `web/`, 
  - только через неё должны осуществляться операции с tasks и events
  
### Стиль
- `<script>` писать перед `<template>` во Vue-компонентах

### принципы написания дальнейшего кода
- `types.d.ts` файл для типов
- предпочтение меньшего уровня вложенности
- index.js
  - jdsdoc в `index.js` описывает что и зачем в текущей папке
  - `./pln` (или `pnpm start`) в корне проекта запускает CLI, `pnpm dev` — режим с инспектором
  - `index.js` - как можно более тонкий файл. В идеале по ним пробежавшись можно осознать структуру проекта.
  - не в каждой папке, например в паттерне команда (каждай файл самостоятельно выполняется - не надо)
- используем [[npm - aliases imports]] для упрощения рефакторинга в будущем
- отступ 2
- import внешних библиотек в самом верху, ниже - наружные (снаружи текущей папки), самые нижние - на этом уровне и в подпапках
- файлы как можно как можно короче

### Основные слои
- **`src/controllers/cli/`** — парсит `process.argv`, запускает команды
- **`src/commands/`** — конкретные команды (list, add, edit, delete, tui); CommandFactory создаёт нужный класс по `CommandParams`
- **`src/dto/`** — Task, Filter, CommandParams, TaskParams
- **`src/external/caldav/`** — CalDAVClient с Reader/Creator/Updater/Deleter; QueryBuilder строит XML-запросы, ResponseParser разбирает XML-ответы
- **`src/cache/`** — кеш задач:
  - `cache-manager.js` — Map<uid, Task> + JSON-файл (cli/tui), один write на батч
  - `query-client.js` — @tanstack/query-core для tui (fetch+invalidate, R-key refresh).
    Web использует @tanstack/vue-query (см. `web/src/main.js`)
- **`src/utils/analizator.js`** — постобработка задач после чтения (вычисляет поля для отображения)
- **`src/printer/console-printer.js`** — рендеринг дерева задач через chalk+treeify
- **`src/config/config.js`** — конфиг из `config.json` в корне (login, password, todoUrl); в браузере обрезает todoUrl до pathname


## Соглашения
- `.archive/` папки — устаревший код, не трогать, не читать без необходимости
- Версионирование в именах файлов (`_v1`, `_v2`) — архивные варианты
- Русскоязычные комментарии и документация
