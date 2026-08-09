# Уникальные встроенные шрифты тем (0.4.11) — инструкция для владельца

**Статус: код приложения ГОТОВ (CSS @font-face уже на месте с 0.4.11);
ждёт только файлы .ttf и одну правку workflow. Работает весь путь с телефона.**
Без файлов приложение не ломается: темы молча используют системные шрифты,
файловые подхватятся сами после выполнения шагов. Заменяет старый
FONT_PATCH.md (та же Comfortaa — теперь частью общего пакета тем).

## Что получит каждая тема

| Тема | Шрифт | Файл(ы) для загрузки |
|---|---|---|
| Стандарт | системный (без файла) | — |
| 🌃 Neon | **Manrope** (современный гротеск) | `manrope.ttf` |
| ⚡ Sport | **Russo One** (угловатый спортивный) | `russoone.ttf` |
| 🌿 Лес | **PT Serif** (книжные засечки) | `ptserif-regular.ttf` + `ptserif-bold.ttf` |
| 🍇 Виноград | **Comfortaa** (округлая, уже выбирали) | `comfortaa.ttf` |

Все шрифты — SIL OFL 1.1 (бесплатны, встраивание в приложение разрешено),
кириллица есть из коробки, APK вырастет примерно на ~1,5–2 МБ.

## Шаг 1. Скачать 6 файлов на телефон

Открыть каждую ссылку, на странице нажать кнопку **«Download raw file»** (или
три точки → Download). Файл может называться не так, как нужно — переименуете
на шаге 2 по таблице ниже.

1. Manrope: https://github.com/google/fonts/blob/main/ofl/manrope/Manrope%5Bwght%5D.ttf → будет `Manrope[wght].ttf` → нужен `manrope.ttf`
2. Russo One: https://github.com/google/fonts/blob/main/ofl/russoone/RussoOne-Regular.ttf → `RussoOne-Regular.ttf` → нужен `russoone.ttf`
3. PT Serif обычный: https://github.com/google/fonts/blob/main/ofl/ptserif/PTSerif-Regular.ttf → нужен `ptserif-regular.ttf`
4. PT Serif жирный: https://github.com/google/fonts/blob/main/ofl/ptserif/PTSerif-Bold.ttf → нужен `ptserif-bold.ttf`
5. Comfortaa: https://github.com/google/fonts/blob/main/ofl/comfortaa/Comfortaa%5Bwght%5D.ttf → будет `Comfortaa[wght].ttf` → нужен `comfortaa.ttf`

Если страница не открывается — резервный путь: https://fonts.google.com →
поиск «Manrope / Russo One / PT Serif / Comfortaa» → кнопка «Get font» /
«Download all», из архива взять нужные .ttf и переименовать так же.

## Шаг 2. Загрузить файлы в репозиторий (с телефона)

1. Открыть: https://github.com/Help-yourself-dvp/LifeFlow-Fitness/upload/arena/019fd0d2-lifeflow-fitness/assets/fonts
   (папка `assets/fonts` создастся сама при первой загрузке; если GitHub скажет,
   что папки нет и не даёт — сначала создайте её кнопкой Add file → Create new
   file → имя `assets/fonts/.gitkeep`, а потом upload).
2. Перетащить/выбрать все скачанные .ttf. Внимательно с ИМЕНАМИ — должны быть
   ровно: `manrope.ttf`, `russoone.ttf`, `ptserif-regular.ttf`,
   `ptserif-bold.ttf`, `comfortaa.ttf` (маленькими буквами, без скобок).
3. Commit changes (зелёная кнопка внизу) → прямо в нашу ветку.

## Шаг 3. Применить workflow с копированием шрифтов (как раньше)

1. Открыть RAW-зеркало (полный готовый файл):
   https://raw.githubusercontent.com/Help-yourself-dvp/LifeFlow-Fitness/arena/019fd0d2-lifeflow-fitness/tools/github-workflows/build.yml
   Выделить всё (долгий тап → Выделить всё) → Копировать.
2. Открыть EDIT боевого workflow:
   https://github.com/Help-yourself-dvp/LifeFlow-Fitness/edit/arena/019fd0d2-lifeflow-fitness/.github/workflows/build.yml
   Выделить всё → Вставить → Commit changes.
   (Что изменилось: одна строка копирования `assets/fonts/*.ttf` в www — без неё
   файлы останутся в репозитории, но не попадут в APK.)

## Шаг 4. Проверка

После зелёной сборки (бот создаст релиз автоматически): установить APK →
Настройки → Стиль — переключать темы: Neon станет Manrope, Sport — Russo One,
Лес — PT Serif, Виноград — Comfortaa. Ручной выбор в Настройки → Шрифт
(Стандарт/Узкий/Книжный) по-прежнему сильнее тематического — снимается одним
тапом обратно на «Стандарт».

## Если что-то пошло не так

Приложение не зависит от этих файлов: без них всё выглядит как до 0.4.11.
Ошибка возможна только в именах файлов — сверьтесь с таблицей точности имён.
Вопросы — сюда, подскажу по скриншоту.
