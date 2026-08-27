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

    abstract void drawWidget(Canvas canvas, int width, int height, float density, FitFlowWidgetData data);

    /* Какие overlay-кнопки видны у этого оформления. */
    abstract void configureButtons(RemoteViews views);

    static final Class<?>[] CANVAS_PROVIDERS = {
        FitFlowWidgetDropProvider.class,
        FitFlowWidgetNeonProvider.class
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

    void render(Context context, AppWidgetManager manager, int id) {
        try {
            FitFlowWidgetPaint.ensureFont(context);
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

            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawWidget(canvas, width, height, density, data);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.fitflow_widget_p5);
            views.setImageViewBitmap(R.id.widget_canvas_image, bitmap);
            views.setContentDescription(R.id.widget_canvas_image, describe(data));
            configureButtons(views);
            attachActions(context, views);
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
    }
}
