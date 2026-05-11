# pln

Лёгкий таск-менеджер поверх CalDAV — CLI, TUI и Web на Node.js.

> [English version](./README.en.md)

## Что это

`pln` (от *plan*) — однопользовательский трекер задач, хранящий данные в CalDAV-календаре. Сейчас проверено только с [Radicale](https://radicale.org/).

Интерфейсы: **CLI** · **TUI** · **Web** (Quasar(vue), опционально).

## Стек

Node.js (ESM), pnpm workspaces, `@vue/reactivity`, `@tanstack/query-core`, `chalk`, `treeify`, собственный CalDAV-клиент (RFC 4791 / VTODO).

## Установка

Нужен CalDAV-сервер — проще всего поднять локальный [Radicale](https://radicale.org/v3.html#tutorial).

```bash
git clone https://github.com/osetra/pln.git
cd pln
pnpm install
cp config.example.json config.json
./pln config # ✏️ [ отредактировать login, password, todoUrl ]
./pln # вывести все задачи
```

## Примеры

```bash
./pln help

./pln -c PROJECT -o -L
./pln -c PROJECT -o -L tui # интерактивный режим

# ├─[P] 🚗 сделать машину #PROJECT
# │  ├─ - поменять масло
# │  │  ├─[*] купить масло 5w30 #DAY
# │  │  ├─ - найти сервис рядом
# │  │  ╰─ - записаться #звонить
# │  ╰─ - заменить колодки
# │     ╰─ - заказать запчасти
# │        ╰─[.] проверить совместимость #LATER
# ├─[P] 🏢 уборка в офисе #PROJECT
# │  ├─[*] купить швабру #DAY
# │  ├─ - помыть окна
# │  ╰─ - разобрать кладовку
# ╰─[P] 🎁 купить подарок #PROJECT
#    ├─[*] выбрать вариант #DAY
#    ╰─ - заказать доставку
#
# ⤓ 9 | ∑ ₫ 0 | ∑ h 0 | #LATER 1 | #звонить 1 | #DAY 3

# консольное редактирование
./pln add -t "написать письмо" -c DAY
./pln edit -u abc1 --x                 # закрыть как выполненную
```

Полная справка — [`doc/help/cli-usage.md`](./doc/help/cli-usage.md).

## Лицензия

[MIT](./LICENSE)
