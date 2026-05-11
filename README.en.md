# pln

Lightweight task manager over CalDAV — CLI, TUI and Web on Node.js.

> [Русская версия](./README.md)

## What is it

`pln` (short for *plan*) is a single-user task tracker that stores tasks in a CalDAV calendar. So far only tested with [Radicale](https://radicale.org/).

Interfaces: **CLI** · **TUI** · **Web** (Quasar(vue), optional).

## Stack

Node.js (ESM), pnpm workspaces, `@vue/reactivity`, `@tanstack/query-core`, `chalk`, `treeify`, hand-rolled CalDAV client (RFC 4791 / VTODO).

## Install

You need a CalDAV server — the easiest path is a local [Radicale](https://radicale.org/v3.html#tutorial).

```bash
git clone https://github.com/osetra/pln.git
cd pln
pnpm install
cp config.example.json config.json
./pln config # ✏️ [ edit login, password, todoUrl ]
./pln # show all tasks
```

## Examples

```bash
./pln help

./pln -c PROJECT -o -L
./pln -c PROJECT -o -L tui # interactive mode

# ├─[P] 🚗 fix the car #PROJECT
# │  ├─ - change the oil
# │  │  ├─[*] buy 5w30 oil #DAY
# │  │  ├─ - find a nearby service
# │  │  ╰─ - book an appointment #call
# │  ╰─ - replace brake pads
# │     ╰─ - order parts
# │        ╰─[.] check compatibility #LATER
# ├─[P] 🏢 tidy up the office #PROJECT
# │  ├─[*] buy a mop #DAY
# │  ├─ - wash the windows
# │  ╰─ - sort out the closet
# ╰─[P] 🎁 buy a gift #PROJECT
#    ├─[*] pick an option #DAY
#    ╰─ - order delivery
#
# ⤓ 9 | ∑ ₫ 0 | ∑ h 0 | #LATER 1 | #call 1 | #DAY 3

# editing from the console
./pln add -t "send email" -c DAY
./pln edit -u abc1 --x                 # mark as completed
```

Full flag reference — [`doc/help/cli-usage.md`](./doc/help/cli-usage.md).

## License

[MIT](./LICENSE)
