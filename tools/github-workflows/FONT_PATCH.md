# Необязательный патч: свой шрифт для темы «Ягода» (Comfortaa)

**Статус: НЕ ПРИМЕНЁН — на усмотрение пользователя.**
Применять так же, как IME_KEYBOARD_PATCH.md / BACK_BUTTON_PATCH.md (ручная правка `build.yml` на GitHub + добавление файлов).

## Зачем

Обсуждение 0.3.19: «Ягода» получила WB-стиль цветов, но шрифт остался системным
(Android WebView даёт надёжно только Roboto/Roboto Condensed — их уже играют
Стандарт и ⚡ Sport). Свой шрифт = только локальный файл (offline-first
сохраняется, никаких сетевых запросов). Выбран **Comfortaa** — округлый и
дружелюбный, идеально под «ягодный» характер. Лицензия — SIL OFL 1.1
(бесплатно, встраивание в приложение разрешено; при применении патча занести
в PROJECT.md, раздел 15).

## Шаг 1. Скачать 2 файла шрифта

С любого устройства (например, с https://fonts.google.com/specimen/Comfortaa
или напрямую с github.com/google/fonts — папка `ofl/comfortaa/`):

- `Comfortaa-Medium.ttf` (вес 500)
- `Comfortaa-Bold.ttf` (вес 700)

Поддержка кириллицы у Comfortaa есть из коробки.

## Шаг 2. Положить файлы в репозиторий

На GitHub: Add file → Upload files, положить оба файла в папку
`assets/fonts/` ветки `arena/019fd0d2-lifeflow-fitness`:
`assets/fonts/Comfortaa-Medium.ttf`, `assets/fonts/Comfortaa-Bold.ttf`.

## Шаг 3. Добавить копирование в build.yml

В `.github/workflows/build.yml` (в этой же ветке, кнопка ✏️ на GitHub)
найти блок копирования web-файлов:

```yaml
          cp index.html www/
          cp style.css www/
          cp app.js www/
          cp food-db.js www/ 2>/dev/null || true
          cp manifest.json www/ 2>/dev/null || true
          cp icon.png www/ 2>/dev/null || true
```

и ДОБАВИТЬ строку после `cp app.js www/`:

```yaml
          mkdir -p www/assets/fonts && cp assets/fonts/*.ttf www/assets/fonts/ 2>/dev/null || true
```

## Шаг 4. Включить @font-face в style.css

В `style.css` уже с переписи 0.3.19 найти комментарий-якорь:

```
/* 🍇 Ягода — «маркетплейс»-характер (0.3.19,
```

и ВСТАВИТЬ ПЕРЕД этим комментарием блок (раскомментировав содержимое):

```css
/* Comfortaa — локальный файл (оффлайн), только если применён FONT_PATCH.
   Если файла нет в APK — правило молча игнорируется, fallback: системный. */
@font-face {
  font-family: 'Comfortaa';
  src: url('assets/fonts/Comfortaa-Medium.ttf') format('truetype');
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'Comfortaa';
  src: url('assets/fonts/Comfortaa-Bold.ttf') format('truetype');
  font-weight: 700;
  font-display: swap;
}
html[data-palette="berry"] body,
html[data-palette="berry"] button,
html[data-palette="berry"] input {
  font-family: 'Comfortaa', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
```

(`body` покрывает почти всё: в приложении `font-family: inherit` у
формовых элементов; отдельные svg-подписи осознанно остаются системными.)

## Шаг 5. Лицензия

При применении — дописать строку в таблицу PROJECT.md, раздел 15
(«шрифты и иконки»): Comfortaa, SIL OFL 1.1, © Johan Aakerlund —
файл лицензии OFL.txt допустимо приложить рядом в `assets/fonts/`.

## Проверка

После сборки: Настройки → Оформление → 🍇 Ягода — весь текст должен стать
округлым «жвачным»; остальные палитры не меняются. Откат: удалить строку
из build.yml (шрифтовые файлы можно оставить — без cp они не попадут в APK).
