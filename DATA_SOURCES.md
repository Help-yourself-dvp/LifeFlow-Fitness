# Источники пищевых данных и лицензии

FitFlow работает офлайн: приложение **не отправляет** список съеденных продуктов
на внешние серверы и не выполняет запросы к источникам во время работы.

Встроенная база содержит усреднённую энергетическую ценность. Значения нужны для
ориентира, а не для медицинского назначения: у конкретного бренда, рецепта,
жирности и способа приготовления калорийность может отличаться.

## 1. USDA FoodData Central / SR Legacy

Часть обычных продуктов в дополнении базы версии 0.1.7 сверена по USDA FoodData
Central и Standard Reference Legacy (SR Legacy): бобовые, растительные продукты,
крупы, фрукты, овощи, рыба и масла.

- FoodData Central: <https://fdc.nal.usda.gov/>
- Страница загрузок: <https://fdc.nal.usda.gov/download-datasets/>
- SR Legacy: <https://catalog.data.gov/dataset/usda-national-nutrient-database-for-standard-reference-legacy-release>

Данные USDA FoodData Central опубликованы как public domain. В исходном коде
такие добавленные записи помечены свойством `source: 'USDA FDC SR Legacy'`.

## 2. Open Food Facts

Часть усреднённых записей для упакованных и готовых продуктов в дополнении базы
версии 0.1.7 отмечена как `source: 'Open Food Facts (ODbL)'`:
протеиновые продукты, растительный йогурт, гранола, рисовые хлебцы, комбуча,
энергетики и некоторые готовые блюда.

- Open Food Facts: <https://world.openfoodfacts.org/>
- Лицензия Open Database License 1.0: <https://opendatacommons.org/licenses/odbl/1-0/>

Уведомление об атрибуции Open Food Facts:

> This record contains information from Open Food Facts (https://en.openfoodfacts.org), which is made available here under the Open Database License (https://opendatacommons.org/licenses/odbl/1-0).

При распространении производной базы данных, созданной на основе записей Open
Food Facts, необходимо сохранять атрибуцию и соблюдать условия ODbL,
включая share-alike для производной базы.

## Что именно хранит FitFlow

FitFlow не копирует фотографии, штрихкоды, составы или полные каталоги источников.
В приложении хранятся только локальные русские названия, усреднённая калорийность
на 100 г (либо на штуку) и метка источника у новых записей. Это сохраняет
небольшой размер APK и позволяет работать без Интернета.
