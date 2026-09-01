package com.fitflow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

/* 0.9.24: три оформления пункта 5 (капля / бенто / кольца). Классический
   строчный виджет не трогаем. Ring / Rings / Dial / Tiles убраны.

   Рисуем картинкой: на minSdk 26 из RemoteViews нельзя менять цвет
   ProgressBar и нельзя вставить свою View. Canvas + setImageViewBitmap.
   Кнопки — overlay поверх карточки (не отдельный непрозрачный ряд):
   так карточка занимает весь виджет и обои просвечивают целиком. */
abstract class FitFlowWidgetCanvasProvider extends AppWidgetProvider {

    static final int COLOR_WATER = 0xFF00A0A6;
    static final int COLOR_FOOD = 0xFFFF9E3D;
    static final int COLOR_STEPS = 0xFF5B8DEF;
    static final int COLOR_ACTIVITY = 0xFF63C387;
    static final int COLOR_TRACK = 0xFFD7E7E6;
    static final int COLOR_TEXT = 0xFF002021;
    static final int COLOR_MUTED = 0xFF4A6363;

    private static final int MAX_BITMAP_PX = 1200;

    abstract int requestCodeBase();

    /* Хук: назначить действия «плиткам» показателей. По умолчанию ничего. */
    void configureSlotActions(Context context, RemoteViews views,
                              FitFlowWidgetData data) { }

    abstract void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData data);

    /* 0.9.35: расширенная версия — нужна «плиткам» (контекст для своих
       PNG-значков и доля заполнения для анимации капли). По умолчанию
       делегирует в старую, чтобы остальные виджеты не трогать. */
    void drawWidget(Context context, Canvas canvas, int width, int height,
                    float density, FitFlowWidgetData data, float pct) {
        drawWidget(canvas, width, height, density, data);
    }

    /* Какие overlay-кнопки видны у этого оформления. */
    abstract void configureButtons(RemoteViews views);

    /* 0.9.33: у «колец» набор кнопок зависит от состава виджета, поэтому
       им нужны данные. По умолчанию — прежнее поведение без данных. */
    void configureButtons(RemoteViews views, FitFlowWidgetData data) {
        configureButtons(views);
    }

    /* 0.9.47 (п.9 владельца): разметка оформления объявляется в каждом
       провайдером обязательно. Прежнее значение по умолчанию (общая карточка
       с настоящими кнопками) существовало только ради «капли», а она убрана —
       оставь мы его, новый виджет молча получил бы чужую разметку. */
    abstract int layoutRes();

    /* Буферы кадров анимации: живут между кадрами, чтобы не выделять
       память заново. Их ДВА и они чередуются: картинку, только что
       отданную лаунчеру, трогать нельзя — он может ещё читать её, и
       правка «на лету» дала бы разрывы. Пока рисуем в один, второй
       догорает на экране. Сбрасываются сами при смене размера. */
    private static final Bitmap[] sAnimBuffers = new Bitmap[2];
    private static int sAnimBufferIdx;

    static final Class<?>[] CANVAS_PROVIDERS = {
        FitFlowWidgetNeonProvider.class,
        /* 0.9.34: светлый вариант «колец» — отдельный провайдер, иначе он
           не обновится по кнопке воды и в полночь. */
        FitFlowWidgetNeonLightProvider.class,
        /* 0.9.35: плитки — светлый основной и тёмный дополнительный. */
        FitFlowWidgetTilesProvider.class,
        FitFlowWidgetTilesDarkProvider.class
    };

    static void updateAllCanvas(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (Class<?> cls : CANVAS_PROVIDERS) {
            try {
                ComponentName component = new ComponentName(context, cls);
                int[] ids = manager.getAppWidgetIds(component);
                if (ids == null || ids.length == 0) continue;
                FitFlowWidgetCanvasProvider provider =
                    (FitFlowWidgetCanvasProvider) cls.newInstance();
                for (int id : ids) provider.render(context, manager, id);
            } catch (Exception e) {
                // Один сломавшийся вариант не должен мешать остальным обновиться.
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
        try { FitFlowWidgetProvider.updateAll(context); } catch (Exception e) { }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context, manager, id);
    }

    /* 0.9.35: доля заполнения для анимации. -1 = «рисуй по реальным
       данным». Переопределяет только «плитки». */
    float animPct() { return -1f; }

    void render(Context context, AppWidgetManager manager, int id) {
        render(context, manager, id, -1f);
    }

    void render(Context context, AppWidgetManager manager, int id, float pct) {
        try {
            FitFlowWidgetPaint.ensureFont(context);
            FitFlowWidgetPaint.ensureDropShape(context);
            FitFlowWidgetData data = FitFlowWidgetData.load(context);
            float density = context.getResources().getDisplayMetrics().density;
            if (density <= 0) density = 2f;

            Bundle options = manager.getAppWidgetOptions(id);
            int maxWidthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 250);
            int maxHeightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 150);
            if (maxWidthDp <= 0) maxWidthDp = 250;
            if (maxHeightDp <= 0) maxHeightDp = 150;

            int width = clampPx(Math.round(maxWidthDp * density));
            int height = clampPx(Math.round(maxHeightDp * density));

            /* 0.9.37: во время анимации (pct >= 0) переиспользуем один
               буфер вместо выделения нового на каждый кадр. Аллокация
               картинки 4x2 — это мегабайты и работа сборщика мусора
               12+ раз подряд; именно она делала доливание рывками.
               Вне анимации поведение прежнее: свежий bitmap. */
            Bitmap bitmap = null;
            if (pct >= 0f) {
                sAnimBufferIdx ^= 1;
                Bitmap reuse = sAnimBuffers[sAnimBufferIdx];
                if (reuse != null && !reuse.isRecycled()
                        && reuse.getWidth() == width && reuse.getHeight() == height) {
                    reuse.eraseColor(0);
                    bitmap = reuse;
                }
            }
            if (bitmap == null) {
                bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                if (pct >= 0f) sAnimBuffers[sAnimBufferIdx] = bitmap;
            }
            Canvas canvas = new Canvas(bitmap);
            drawWidget(context, canvas, width, height, density, data, pct);

            RemoteViews views = new RemoteViews(context.getPackageName(), layoutRes());
            views.setImageViewBitmap(R.id.widget_canvas_image, bitmap);
            views.setContentDescription(R.id.widget_canvas_image, describe(data));
            configureButtons(views, data);
            attachActions(context, views);
            /* 0.9.37: у «плиток» тап по показателю ведёт в его раздел.
               Базовая реализация пустая — остальным оформлениям это не
               нужно, и лишних PendingIntent они не создают. */
            configureSlotActions(context, views, data);
            manager.updateAppWidget(id, views);
        } catch (Throwable t) {
            // Нехватка памяти под bitmap: оставляем предыдущую картинку.
        }
    }

    private static int clampPx(int px) {
        if (px < 1) return 1;
        return Math.min(MAX_BITMAP_PX, px);
    }

    private static String describe(FitFlowWidgetData d) {
        return "FitFlow сегодня. Вода " + d.waterPct() + " процентов, " + d.waterValue()
            + ". Питание " + d.foodPct() + " процентов, " + d.foodValue()
            + ". Шаги " + d.stepsPct() + " процентов, " + d.steps
            + ". Активность " + d.activityPct() + " процентов, " + d.activity + " минут.";
    }

    static void hideAllButtons(RemoteViews views) {
        views.setViewVisibility(R.id.widget_canvas_water_btn, View.GONE);
        views.setViewVisibility(R.id.widget_canvas_record_btn, View.GONE);
        views.setViewVisibility(R.id.widget_canvas_dose_btn, View.GONE);
    }

    static void showWaterOnly(RemoteViews views) {
        views.setViewVisibility(R.id.widget_canvas_water_btn, View.VISIBLE);
        views.setViewVisibility(R.id.widget_canvas_record_btn, View.GONE);
        views.setViewVisibility(R.id.widget_canvas_dose_btn, View.GONE);
    }

    static void showThreeActions(RemoteViews views) {
        views.setViewVisibility(R.id.widget_canvas_water_btn, View.VISIBLE);
        views.setViewVisibility(R.id.widget_canvas_record_btn, View.VISIBLE);
        views.setViewVisibility(R.id.widget_canvas_dose_btn, View.VISIBLE);
    }

    /* 0.9.33 (пункт 6 владельца): кнопка живёт ровно тогда, когда её
       показатель выбран. Выключили «Питание» — с графика пропала дуга,
       и кнопка «Еда» пропадает вместе с ней. Порядок и признак видимости
       обязаны совпадать с тем, что рисует FitFlowWidgetPaint.drawNeon(),
       иначе прозрачная ловушка встанет мимо нарисованной пилюли. */
    static void showActionsFor(RemoteViews views, FitFlowWidgetData d) {
        views.setViewVisibility(R.id.widget_canvas_water_btn,
            d.shows("water") ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_canvas_record_btn,
            d.shows("food") ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_canvas_dose_btn,
            d.shows("courses") ? View.VISIBLE : View.GONE);
    }

    private void attachActions(Context context, RemoteViews views) {
        int base = requestCodeBase();

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_canvas_root, PendingIntent.getActivity(
            context, base, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent waterBtn = new Intent(context, FitFlowWidgetProvider.class);
        waterBtn.setAction("com.fitflow.app.ADD_WATER_250");
        views.setOnClickPendingIntent(R.id.widget_canvas_water_btn, PendingIntent.getBroadcast(
            context, base + 1, waterBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent recordBtn = new Intent(context, MainActivity.class);
        recordBtn.putExtra("widget_action", "smart_entry");
        recordBtn.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_canvas_record_btn, PendingIntent.getActivity(
            context, base + 2, recordBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent doseBtn = new Intent(context, FitFlowWidgetProvider.class);
        doseBtn.setAction("com.fitflow.app.WIDGET_COURSE_DOSE");
        views.setOnClickPendingIntent(R.id.widget_canvas_dose_btn, PendingIntent.getBroadcast(
            context, base + 3, doseBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        /* 0.9.33 (пункт 4): шестерёнка ведёт сразу в диалог состава виджета.
           Ловушки нет в разметке «капли» — setOnClickPendingIntent по
           отсутствующему id молча игнорируется, поэтому проверка не нужна. */
        Intent gear = new Intent(context, MainActivity.class);
        gear.putExtra("widget_action", "widget_settings");
        gear.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_canvas_gear_btn, PendingIntent.getActivity(
            context, base + 4, gear, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
}
