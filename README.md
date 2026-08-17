# Extensions switcher (extMgr)

Chrome-расширение для быстрого управления установленными расширениями и приложениями из popup-окна браузера.

Расширение использует Manifest V3 и рассчитано на Chrome 120 и новее.

## Возможности

- просмотр установленных расширений, приложений и тем;
- включение и отключение отдельного расширения или всей группы;
- запуск Chrome Apps и открытие настроек расширения, если действие поддерживается;
- удаление расширения через стандартный диалог Chrome;
- создание и переименование пользовательских групп;
- изменение состава и порядка групп перетаскиванием;
- синхронизация групп через `chrome.storage.sync`;
- интерфейс на английском и русском языках.

Элементы, которые не входят в пользовательские группы, автоматически распределяются по вычисляемым группам: extensions, hosted apps, packaged apps, legacy packaged apps, themes и unknown.

## Технологии

- React 19;
- типизированный React Context с `useReducer`;
- TypeScript в strict mode и `@types/chrome`;
- dnd-kit и Less;
- Rspack со встроенным SWC loader;
- ESLint и Prettier;
- Storybook на Vite.

## Быстрый старт

### Требования

- Node.js 24 — версия зафиксирована в `.nvmrc`;
- npm;
- Chrome 120 или новее.

### Установка и сборка

```bash
nvm use
npm ci
npm run build
```

Готовое распакованное расширение появится в `dist/dist/`.

### Установка в браузер

1. Откройте `chrome://extensions`.
2. Включите режим разработчика.
3. Нажмите «Загрузить распакованное расширение».
4. Выберите каталог `dist/dist/`.

После изменения исходников пересоберите проект и обновите расширение на странице управления расширениями.

## Разработка

```bash
nvm use
npm run dev
```

Rspack будет следить за исходниками и пересобирать `dist/dist/`. Основные команды:

| Команда                   | Результат                                             |
| ------------------------- | ----------------------------------------------------- |
| `npm run dev`             | development-сборка с inline source map и watch mode   |
| `npm run watch`           | алиас для `npm run dev`                               |
| `npm run tsc`             | проверка TypeScript без генерации файлов              |
| `npm run lint`            | ESLint и проверка форматирования Prettier             |
| `npm run lint:fix`        | автоматическое исправление ESLint и Prettier          |
| `npm run build`           | production-сборка Rspack в `dist/dist/`               |
| `npm run storybook`       | Storybook на `http://localhost:6006`                  |
| `npm run build-storybook` | статическая сборка Storybook в `storybook-static/`    |
| `npm run compress`        | упаковка уже собранного расширения в ZIP              |
| `npm run release`         | production-сборка и архив `dist/extMgr-<version>.zip` |

Версия расширения и имя release-архива берутся из `src/manifest.json`.

Минимальная автоматическая проверка изменения исходников:

```bash
npm run tsc
npm run lint
npm run build
```

Для изменений отображения дополнительно выполняйте `npm run build-storybook`. Автоматических unit/e2e-тестов и CI-конфигурации в репозитории пока нет.

## Storybook

Stories должны быть детерминированными и не обращаться к реальному Chrome Extensions API. Общий mock `chrome.i18n` находится в `.storybook/preview.tsx`; дополнительные методы Chrome следует подменять там или локально в story.

Доступные истории:

- `Popup/Group → Enabled` — полностью включённая группа;
- `Popup/Group → PartiallyDisabled` — группа с частично отключёнными элементами.

## Текущее техническое состояние

- Манифест объявляет версию `1.5.5`, Manifest V3 и минимальный Chrome 120.
- Архитектура полностью popup-based: background page и service worker отсутствуют. Постоянные данные хранятся в `chrome.storage.sync`.
- Runtime использует React 19 и Promise-based Chrome API; типы management по-прежнему учитывают legacy Chrome Apps.
- `npm audit` всё ещё сообщает об уязвимостях в транзитивных и legacy runtime-зависимостях. Их обновление требует отдельной регрессионной работы.
- Код использует глобальный объект `chrome`; перенос на другой WebExtensions namespace потребует адаптации.

## Структура проекта

```text
.
├── .storybook/              # конфигурация и Chrome API mocks для stories
├── builder/                 # упаковка production-сборки в ZIP
├── src/
│   ├── _locales/            # локализация Chrome (en, ru)
│   ├── assets/              # Less, иконки расширения и UI
│   ├── components/          # строки группы/расширения и stories
│   ├── pages/Popup.tsx      # popup и drag-and-drop
│   ├── context/             # состояние popup, действия и Chrome API
│   ├── templates/           # HTML-шаблон popup
│   ├── tools/               # общие typed helpers
│   ├── App.tsx              # browser entry point
│   └── manifest.json        # манифест и версия расширения
├── eslint.config.mjs
├── rspack.config.js
├── tsconfig.json
└── package.json
```

### Поток данных

1. Rspack собирает TypeScript, Less и assets, копирует manifest/locales/icons и создаёт `popup.html`.
2. При открытии popup `App.tsx` монтирует React 19-приложение внутри `PopupProvider`.
3. `PopupProvider` параллельно читает группы из `chrome.storage.sync` и получает установленные элементы через `chrome.management.getAll()`.
4. Пользовательские группы выводятся первыми, остальные элементы распределяются по вычисляемым группам согласно `type`.
5. События `chrome.management` обновляют список, а изменения sync storage синхронизируют пользовательские группы.

### Модель состояния

- `PopupContext` хранит расширения, пользовательские группы и статусы операций в одном reducer.
- Действия контекста включают и удаляют расширения, редактируют группы и сериализуют записи в sync storage.
- `chromePopupServices` изолирует Promise-based Chrome API и подписки на browser events.
- Вычисляемые группы формируются из элементов, не входящих в пользовательские группы.

Пользовательские группы сохраняются в области `sync` в ключе `list`. Порядок элементов
в вычисляемых группах хранится отдельно в необязательном ключе `computedOrder`:

```json
{
  "list": [
    {
      "id": "uuid",
      "name": "Group",
      "ids": ["extension-id"]
    }
  ],
  "computedOrder": {
    "extension": ["ungrouped-extension-id", "another-ungrouped-extension-id"]
  }
}
```

Старое хранилище только с `list` остаётся совместимым: отсутствующий `computedOrder`
считается пустым. Неизвестные порядку новые элементы добавляются в конец соответствующей
вычисляемой группы.

## Разрешения

- `management` — получение списка расширений и управление ими;
- `storage` — хранение и синхронизация пользовательских групп.

Само расширение исключает свой `chrome.runtime.id` из отображаемого списка.

## Изменение проекта

- Поддерживайте strict TypeScript; не скрывайте ошибки через `any` или `@ts-ignore` без обоснования.
- Новые пользовательские строки добавляйте одновременно в обе локали и получайте через `chrome.i18n.getMessage()`.
- При изменении структуры групп сохраняйте совместимость с существующим `chrome.storage.sync` либо добавляйте миграцию.
- Для изменённых UI-состояний добавляйте или обновляйте stories.
- Версию релиза обновляйте в `src/manifest.json`; имя ZIP формируется автоматически.
- Не редактируйте и не коммитьте `dist/`, `storybook-static/` и `node_modules/`.

Правила для coding agents находятся в `AGENTS.md` и scoped-файлах внутри `src/`, `builder/` и `.storybook/`.
