# VOICE_PAUSE_PATCH — терпимость голосового ввода к паузам

**Статус: ЖДЁТ ПРИМЕНЕНИЯ ⏳** (нативный слой; build.yml меняет только пользователь на GitHub)

## Что лечит

Претензия пользователя к «Голосу 2.0»: системный распознаватель обрывает
прослушивание на малейшей паузе — диктовать приходится быстро и без остановок.

## Механика

У `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` есть параметры тишины:
- `EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS` — минимальная длительность сессии
  (не завершит прослушивание раньше этого времени, даже если вы молчите);
- `EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS` — сколько полной тишины
  считается концом фразы (сейчас системный дефолт ~0.5–0.7 с — отсюда обрывы);
- `EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS` — «мягкий»
  порог возможного конца.

Ставим: сессия не короче 4 с, конец фразы — после 1.6 с полной тишины.
Говорить станет можно со вдумчивыми паузами, как при живом разговоре.
Параметры носят рекомендательный характер: на отдельных устройствах
распознаватель может их округлить — это нормально, хуже не станет.

## Что НЕ вошло (честно)

Потоковые частичные результаты (текст на экране по ходу речи) через
`ACTION_RECOGNIZE_SPEECH` **недоступны технически** — для них нужен переход
на `SpeechRecognizer` API с колбэком `onPartialResults`. Это следующая
ступень, если голос вернётся в приоритет. Зафиксировано в POSTPONED.md (P6).

## Как применить (2 минуты, на GitHub)

1. Открыть `.github/workflows/build.yml` в ветке `arena/019fd0d2-lifeflow-fitness` → Edit.
2. Найти блок (он один):

```java
                                  intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                                  intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU");
                                  intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
                                  intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Расскажите о воде, еде и активности");
```

3. Заменить на:

```java
                                  intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                                  intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU");
                                  intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
                                  // VOICE_PAUSE_PATCH: говорить можно со вдумчивыми паузами.
                                  // Сессия не короче 4 с; конец фразы — после 1.6 с тишины
                                  // (раньше системный дефолт ~0.5 с обрывал на каждой паузе).
                                  intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 4000L);
                                  intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1600L);
                                  intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1600L);
                                  intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Расскажите о воде, еде и активности");
```

4. Commit changes в ту же ветку → сборка пойдёт сама.
5. Проверка: 🎤 → сказать фразу с паузами по 1–2 секунды («выпил стакан воды…
   и съел тарелку куриного супа») — распознаватель не должен закрываться
   на первой паузе. Откат — удалить три строки `EXTRA_SPEECH_INPUT_*`.
