package com.fitflow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;

/* 0.9.28: подложка PNG + overlay. Заголовки «Шаги» / «Вода» / «Калории» —
   живые TextView в layout (единый стиль, цифры не наезжают). Кроссовок —
   отдельный слой по центру кольца. У калорий круглая кнопка-карандаш:
   открывает умный ввод еды (widget_action=smart_entry, как «Записать»
   классического виджета).

   Питание = съедено / цель, не remaining. */
public class FitFlowWidgetBentoProvider extends AppWidgetProvider {

    private static final int REQ = 600;

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, FitFlowWidgetBentoProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids == null || ids.length == 0) return;
        FitFlowWidgetBentoProvider provider = new FitFlowWidgetBentoProvider();
        for (int id : ids) provider.render(context, manager, id);
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
            FitFlowWidgetData d = FitFlowWidgetData.load(context);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.fitflow_widget_bento);

            views.setTextViewText(R.id.widget_bento_steps_value, FitFlowWidgetPaint.spaced(d.steps));
            views.setTextViewText(R.id.widget_bento_steps_goal, "из " + FitFlowWidgetPaint.spaced(d.stepsGoal));
            views.setProgressBar(R.id.widget_bento_steps_ring, 100, d.stepsPct(), false);

            views.setTextViewText(R.id.widget_bento_water_value, FitFlowWidgetPaint.spaced(d.water));
            views.setTextViewText(R.id.widget_bento_water_goal,
                "из " + FitFlowWidgetPaint.spaced(d.waterGoal) + " мл");
            views.setProgressBar(R.id.widget_bento_water_bar, 100, d.waterPct(), false);

            views.setTextViewText(R.id.widget_bento_food_value, FitFlowWidgetPaint.spaced(d.food));
            views.setTextViewText(R.id.widget_bento_food_goal,
                "из " + FitFlowWidgetPaint.spaced(d.foodGoal) + " ккал");
            views.setProgressBar(R.id.widget_bento_food_bar, 100, d.foodPct(), false);

            views.setContentDescription(R.id.widget_bento_root,
                "FitFlow. Шаги " + d.steps + " из " + d.stepsGoal
                    + ". Вода " + d.water + " из " + d.waterGoal + " миллилитров"
                    + ". Питание " + d.food + " из " + d.foodGoal + " килокалорий, съедено.");

            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch == null) launch = new Intent(context, MainActivity.class);
            launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setOnClickPendingIntent(R.id.widget_bento_root, PendingIntent.getActivity(
                context, REQ, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

            Intent waterBtn = new Intent(context, FitFlowWidgetProvider.class);
            waterBtn.setAction("com.fitflow.app.ADD_WATER_250");
            views.setOnClickPendingIntent(R.id.widget_bento_water_btn, PendingIntent.getBroadcast(
                context, REQ + 1, waterBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

            /* Карандаш у калорий: тот же smart_entry, что у кнопки «Записать»
               классического виджета — приложение открывает умный ввод еды. */
            Intent foodBtn = new Intent(context, MainActivity.class);
            foodBtn.putExtra("widget_action", "smart_entry");
            foodBtn.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            views.setOnClickPendingIntent(R.id.widget_bento_food_btn, PendingIntent.getActivity(
                context, REQ + 2, foodBtn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

            manager.updateAppWidget(id, views);
        } catch (Throwable t) {
            // не роняем лаунчер
        }
    }
}
