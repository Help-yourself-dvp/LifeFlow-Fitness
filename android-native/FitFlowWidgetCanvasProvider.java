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
import android.widget.RemoteViews;

/* 0.9.6 (пункт 5 владельца — «поставить виджеты рядом и сравнить на одних
   и тех же показателях»). Классический строчный виджет остаётся без единого
   изменения; рядом появляются варианты с другой визуализацией.

   Почему рисуем картинкой, а не вьюхами: на minSdk 26 из RemoteViews нельзя
   менять цвет ProgressBar (setProgressTintList не входит в белый список
   RemoteViews), поэтому кольца/дуги разных цветов вьюхами не собрать — их
   пришлось бы заранее выкладывать десятками готовых drawable. Canvas рисует
   любой цвет и любой процент, а результат отдаётся одним
   setImageViewBitmap — без reflection и без риска падения на старых версиях.

   Общий каркас здесь; каждый вариант оформления переопределяет только
   drawWidget() и свои надписи. Разметка у всех одна (fitflow_widget_canvas). */
abstract class FitFlowWidgetCanvasProvider extends AppWidgetProvider {

    /* Палитра общая для всех вариантов: сравнивать оформления имеет смысл
       только когда «вода» везде одного цвета. */
    static final int COLOR_WATER = 0xFF00A0A6;
    static final int COLOR_FOOD = 0xFFFF9E3D;
    static final int COLOR_STEPS = 0xFF5B8DEF;
    static final int COLOR_ACTIVITY = 0xFF63C387;
    static final int COLOR_TRACK = 0xFFD7E7E6;
    static final int COLOR_TEXT = 0xFF002021;
    static final int COLOR_MUTED = 0xFF4A6363;

    /* Ограничитель размера картинки: RemoteViews передаются через Binder,
       и слишком большой bitmap уронил бы транзакцию. 1200 px с запасом
       хватает на планшетный виджет во весь экран. */
    private static final int MAX_BITMAP_PX = 1200;

    /* Высота нижнего ряда кнопок (кнопка 30dp + нижний отступ 8dp) — ровно
       как в fitflow_widget_canvas.xml. Картинка рисуется на высоту БЕЗ этого
       ряда: ImageView получает оставшееся место (layout_weight=1), и если
       рисовать на полную высоту, содержимое либо уезжало бы под кнопки,
       либо сплющивалось при fitXY. Меняется разметка — менять и здесь. */
    private static final int BUTTON_ROW_DP = 38;

    /* Каждый вариант должен слать свои PendingIntent'ы: одинаковые
       requestCode у разных провайдеров безопасны (интенты отличаются
       компонентом), но собственный сдвиг делает отладку однозначной. */
    abstract int requestCodeBase();

    /* Собственно рисование варианта. */
    abstract void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData data);

    /* Список всех «рисованных» вариантов — чтобы одно обновление данных
       перерисовывало каждый поставленный виджет. */
    static final Class<?>[] CANVAS_PROVIDERS = {
        FitFlowWidgetRingProvider.class,
        FitFlowWidgetRingsProvider.class,
        FitFlowWidgetDialProvider.class,
        FitFlowWidgetTilesProvider.class
    };

    /* Вызывается из FitFlowWidgetProvider.updateAll — единственной точки
       обновления, которую уже дёргают MainActivity, HealthSyncReceiver,
       кнопка воды и полуночный будильник. Новые варианты подхватывают
       обновления автоматически, без правок в этих местах. */
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
        // Полуночный будильник живёт в классическом провайдере; трогаем его,
        // чтобы «рисованный» виджет обнулялся в новый день даже в одиночку.
        try { FitFlowWidgetProvider.updateAll(context); } catch (Exception e) { }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context, manager, id);
    }

    void render(Context context, AppWidgetManager manager, int id) {
        try {
            FitFlowWidgetData data = FitFlowWidgetData.load(context);
            float density = context.getResources().getDisplayMetrics().density;
            if (density <= 0) density = 2f;

            Bundle options = manager.getAppWidgetOptions(id);
            int maxWidthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 180);
            int maxHeightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 150);
            if (maxWidthDp <= 0) maxWidthDp = 180;
            if (maxHeightDp <= 0) maxHeightDp = 150;

            int contentHeightDp = maxHeightDp - BUTTON_ROW_DP;
            // Совсем низкий виджет: не уходим в ноль и не переворачиваем высоту.
            if (contentHeightDp < 48) contentHeightDp = 48;
            int width = clampPx(Math.round(maxWidthDp * density));
            int height = clampPx(Math.round(contentHeightDp * density));

            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawWidget(canvas, width, height, density, data);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.fitflow_widget_canvas);
            views.setImageViewBitmap(R.id.widget_canvas_image, bitmap);
            views.setContentDescription(R.id.widget_canvas_image, describe(data));
            attachActions(context, views);
            manager.updateAppWidget(id, views);
        } catch (Throwable t) {
            // Нехватка памяти под bitmap или что угодно ещё: оставляем
            // предыдущую картинку, но не роняем процесс лаунчера.
        }
    }

    private static int clampPx(int px) {
        if (px < 1) return 1;
        return Math.min(MAX_BITMAP_PX, px);
    }

    /* TalkBack: картинка озвучивается одной осмысленной фразой —
       иначе «рисованный» виджет для незрячего был бы пустым местом. */
    private static String describe(FitFlowWidgetData d) {
        return "FitFlow сегодня. Вода " + d.waterPct() + " процентов, " + d.waterValue()
            + ". Питание " + d.foodPct() + " процентов, " + d.foodValue()
            + ". Шаги " + d.stepsPct() + " процентов, " + d.steps
            + ". Активность " + d.activityPct() + " процентов, " + d.activity + " минут.";
    }

    private void attachActions(Context context, RemoteViews views) {
        int base = requestCodeBase();

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_canvas_root, PendingIntent.getActivity(
            context, base, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        /* Кнопки шлют те же действия, что и классический виджет: логика
           добавления воды и обновления живёт в одном месте (FitFlowWidgetProvider),
           а его updateAll перерисует и этот виджет тоже. */
        Intent waterBtn = new Intent(context, FitFlowWidgetProvider.class);
        waterBtn.setAction("com.fitflow.app.ADD_WATER_250");
        views.setOnClickPendingIntent(R.id.widget_canvas_water_btn, PendingIntent.getBroadcast(
            context, base + 1, waterBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent recordBtn = new Intent(context, MainActivity.class);
        recordBtn.putExtra("widget_action", "smart_entry");
        recordBtn.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_canvas_record_btn, PendingIntent.getActivity(
            context, base + 2, recordBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent refreshBtn = new Intent(context, FitFlowWidgetProvider.class);
        refreshBtn.setAction("com.fitflow.app.WIDGET_REFRESH");
        views.setOnClickPendingIntent(R.id.widget_canvas_refresh_btn, PendingIntent.getBroadcast(
            context, base + 3, refreshBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
}
