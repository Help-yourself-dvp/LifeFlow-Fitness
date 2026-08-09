# Локальный ИИ — нативный патч build.yml (статус: ВКЛЮЧЁН В ГОТОВЫЙ ФАЙЛ-ЗАМЕНУ 📦)

**С 0.3.33 блоки искать не нужно:** зеркало `tools/github-workflows/build.yml`
уже содержит все правки (шаги «Установка зависимостей», «минимальный SDK»
и инъекцию R8 8.5.35 для чтения Java-21 байткода, 0.3.37).
Берите полный файл по RAW-ссылке (см. ответ ассистента / PROJECT.md §14, 0.3.33)
и замените `.github/workflows/build.yml` в ветке `arena/019fd0d2-lifeflow-fitness`
целиком. Ниже — документация: что именно будет добавлено, ограничения, проверка.

**Что даёт:** нейросеть Gemma прямо на устройстве (LiteRT-LM, полный офлайн,
без ключей). В приложении: Настройки → ИИ-помощник → «Gemma на устройстве»
→ выбор скачанного файла `.litertlm` → чат нутрициолога отвечает локально.

**Почему патчем:** build.yml меняет только пользователь (правило проекта).
Изменения — точечные правки в `.github/workflows/build.yml` на GitHub
(кнопка ✏️ → Commit changes в ту же ветку `arena/019fd0d2-lifeflow-fitness`).

Сам плагин уже лежит в репозитории: `plugins/fitflow-local-ai/`
(Kotlin + LiteRT-LM 0.12.0, Apache-2.0). Патч только подключает его к сборке.

---

## Правка 1 — подключить плагин к установке пакетов

Найти шаг **Install Capacitor** (строка ~59, команда `npm install`):

```yaml
      - name: Install Capacitor
        run: |
          npm init -y
          npm install @capacitor/core@5.7.0 @capacitor/cli@5.7.0 @capacitor/android@5.7.0 @capacitor/local-notifications@5.0.7 @capacitor/browser@5.2.0
```

Дописать в КОНЕЦ команды `npm install` путь к плагину (одна строка-дополнение):

```yaml
          npm install @capacitor/core@5.7.0 @capacitor/cli@5.7.0 @capacitor/android@5.7.0 @capacitor/local-notifications@5.0.7 @capacitor/browser@5.2.0 ./plugins/fitflow-local-ai
```

## Правка 2 — minSdk 24 (требование LiteRT-LM)

Найти шаг **Init Android** и сразу после строки с `compileSdkVersion`
добавить ещё один `sed` (якорь показан контекстом «было → стало»):

```yaml
      - name: Init Android
        run: |
          npx cap init "FitFlow" "com.fitflow.app" --web-dir www
          npx cap add android
          sed -i 's/targetSdkVersion = .*/targetSdkVersion = 34/g' android/variables.gradle
          sed -i 's/compileSdkVersion = .*/compileSdkVersion = 34/g' android/variables.gradle
          sed -i 's/minSdkVersion = .*/minSdkVersion = 24/g' android/variables.gradle
```

(добавилась ПОСЛЕДНЯЯ строка — остальное без изменений).

**Честно про minSdk 24 (Android 7.0):** LiteRT-LM без этого не работает.
Устройства на Android 5.x–6.x обновлённый APK примет, но пункт нейросети
покажет «модуль недоступен» — остальное приложение работает как раньше
(проверка версии встроена и в плагин, и в JS).

## Правка 3 (0.3.37) — R8 8.5.35: чтение Java-21 байткода

Корень из прочитанного лога сборки 0.3.36: `litertlm-android:0.12.0` собран
под **Java 21** (class file major 65), а D8 внутри шаблонного AGP 8.2.1 читает
максимум Java 20 — сборка падала на dexing с «Unsupported class file major
version 65» (то же у error_prone_annotations 2.41.0). Лечение — официальный
механизм Google: оверрайд R8/D8 новее встроенного через buildscript-classpath
корневого `android/build.gradle` (одна строка после classpath AGP;
сам AGP не трогаем — риск минимален):

```gradle
classpath 'com.android.tools:r8:8.5.35'
```

В готовом файле-замене это делает маленький python-блок шага **Init Android**
(сразу после sed minSdk): ищет строку AGP-classpath и вставляет R8 после неё.
Якорь проверяется — если структура шаблона вдруг изменится, сборка остановится
честной ошибкой, а не соберётся без патча.

---

## После коммита

1. CI сам соберёт сборку (~2 минуты), релиз появится в Releases.
2. В приложении: Настройки → ✨ ИИ-помощник → включить → режим
   «Gemma на устройстве» → «📁 Выбрать файл модели (.litertlm)» → указать
   скачанный файл (напр. Gemma 3 1B или Gemma 4 E2B из репозиториев
   `litert-community/*-litert-lm` на Hugging Face).
3. Файл скопируется в приватную папку приложения, загрузится в память
   (первая загрузка — десятки секунд), дальше чат отвечает офлайн.

## Чего патч НЕ делает (осознанно)

- **Не скачивает модель.** GGUF не подходит — нужен формат `.litertlm`
  (репозитории `*-litert-lm`). Кнопка «Скачать автоматически» в приложении
  объясняет, где взять файл (у Hugging Face на модель действует лицензия
  Gemma Terms of Use — принять её при скачивании нужно вручную, это честно).
- **CPU-backend.** GPU (OpenCL) требует манифестных `uses-native-library` и
  живёт не на всех чипах — пойдёт отдельной итерацией после подтверждения
  стабильности CPU-пути. На CPU 1B-модель отвечает медленно, но работает.
- **Размер APK вырастет** примерно на 30–60 МБ (нативные библиотеки
  рантайма). Сама модель (0.7–4 ГБ) в APK НЕ входит — лежит файлом
  пользователя.

---

## Правка 4 (0.4.3): CAMERA_CHOOSER_PATCH — пункт «Камера» в выборе фото

Уже включена в готовый файл-замену (`tools/github-workflows/build.yml`), ничего
делать отдельно не нужно — примените файл целиком, как обычно.

**Зачем.** Системный выбор изображения Android WebView показывает пункт
«Камера» только если в AndroidManifest объявлено
`<uses-permission android:name="android.permission.CAMERA"/>` (и uses-feature
camera не required). Без него тот же диалог сразу открывал галерею — снять
фото на месте было нельзя (полевой баг на 0.4.2 после открытия галереи).
**Проверка:** sed вставляет оба тега перед `<application` в генерируемом шаблоне
манифеста; пользователь при первом выборе «Камера» увидит системный запрос
разрешения — это ожидаемо, после разрешения пункт работает постоянно.
