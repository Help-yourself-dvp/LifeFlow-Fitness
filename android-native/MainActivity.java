package com.fitflow.app;

import android.app.AlarmManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.speech.RecognizerIntent;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

// 0.9.2: сканер штрих-кода (zxing-android-embedded, Apache-2.0)
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;

import org.json.JSONObject;

// Health Connect API — чтение шагов и сна из Zepp/Garmin/Samsung
                                                                                                    import java.util.List;
import java.util.Set;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.records.StepsRecord;
import androidx.health.connect.client.records.SleepSessionRecord;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;

import java.io.OutputStream;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity implements SensorEventListener {

    private static final int REQ_SAVE_BACKUP = 7301;
    private static final int REQ_VOICE_INPUT = 7302;
    /* 0.9.2: сканер штрих-кода (ZXing). Свой код запроса не нужен —
       IntentIntegrator использует собственный (49374) и сам его разбирает. */
    private String pendingBackupJson = null;
    private String pendingWidgetAction = null;
    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
      // IME «прогрев» (0.3.17): у части WebView первая сессия клавиатуры
      // после холодного старта теряется, если у корневого WebView ещё
      // не запрашивали фокус. requestFocus() после загрузки страницы
      // лечит «клавиатуру со второго тапа» и молчащий набор GBoard.
      try {
          final WebView wv = getBridge() != null ? getBridge().getWebView() : null;
          if (wv != null) {
              wv.postDelayed(new Runnable() {
                  @Override public void run() { wv.requestFocus(); }
              }, 500);
          }
      } catch (Exception e) { }
        requestExactAlarmPermission();
        requestIgnoreBatteryOptimizations();
        installBackupBridge();
        initStepSensors();
        try { HealthSyncReceiver.schedulePeriodicSync(this); } catch (Exception e) { }
        checkPendingWidgetWaterAdd();
        checkPendingCourseDoses();
        Intent startIntent = getIntent();
        if (startIntent != null && startIntent.hasExtra("widget_action")) {
            pendingWidgetAction = startIntent.getStringExtra("widget_action");
        }
    }
    // Кнопка/жест «назад»: пока есть история в WebView — шаг назад
    // внутри приложения, из корня истории — обычный выход.
    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        checkPendingWidgetWaterAdd();
        checkPendingCourseDoses();
        if (intent != null && intent.hasExtra("widget_action")) {
            pendingWidgetAction = intent.getStringExtra("widget_action");
            processWidgetAction();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            if (sensorManager != null) {
                if (stepCounterSensor != null) sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
                if (stepDetectorSensor != null) sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL);
            }
        } catch (Exception e) { }
        checkPendingWidgetWaterAdd();
        checkPendingCourseDoses();
        if (pendingWidgetAction != null) processWidgetAction();
    }

    /* 0.9.13: отметки приёмов курса, сделанные без открытия приложения
       (кнопка «✓ Принял» в шторке или строка витаминов на виджете), лежат
       в очереди FitFlowCourses. Забираем её и отдаём в app.js одним вызовом —
       он сам сведёт отметки со своим состоянием и перерисует экран. Очередь
       очищается только после успешной доставки: если WebView ещё не готов,
       повтор произойдёт на следующем onResume. */
    private boolean isDeliveringDoses = false;

    private synchronized void checkPendingCourseDoses() {
        if (isDeliveringDoses) return;
        try {
            if (!FitFlowCourses.hasPending(this)) return;
        } catch (Exception e) { return; }
        isDeliveringDoses = true;
        tryDeliverCourseDoses(0);
    }

    /* На холодном старте WebView ещё не готов, а onResume приходит сразу за
       onCreate — без повторов очередь пролежала бы до следующего сворачивания
       приложения (нажал «Принял» в шторке, открыл приложение, а отметки нет).
       Ждём window.__fitflowReady теми же ~12 секундами, что и действия виджета. */
    private void tryDeliverCourseDoses(final int attempt) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                WebView wv = null;
                try { wv = getBridge() != null ? getBridge().getWebView() : null; } catch (Exception e) { }
                if (wv == null) { retryCourseDoses(attempt); return; }
                final WebView webView = wv;
                try {
                    webView.evaluateJavascript("(window.__fitflowReady === true)", new android.webkit.ValueCallback<String>() {
                        @Override public void onReceiveValue(String value) {
                            if (!"true".equals(value)) { retryCourseDoses(attempt); return; }
                            try {
                                String payload = FitFlowCourses.takePending(MainActivity.this).toString();
                                // Строку кладём в JSON.parse: имена курсов и даты приходят
                                // из нашей же очереди, но экранирование кавычек обязательно.
                                String js = "window.onCourseDosesFromNative && window.onCourseDosesFromNative("
                                    + org.json.JSONObject.quote(payload) + ");";
                                webView.evaluateJavascript(js, null);
                            } catch (Exception e) { }
                            isDeliveringDoses = false;
                        }
                    });
                } catch (Exception e) { retryCourseDoses(attempt); }
            }
        });
    }

    private void retryCourseDoses(final int attempt) {
        if (attempt >= 40) { isDeliveringDoses = false; return; }
        new android.os.Handler().postDelayed(new Runnable() {
            @Override
            public void run() { tryDeliverCourseDoses(attempt + 1); }
        }, 300);
    }

    private boolean isDeliveringWater = false;

    private synchronized void checkPendingWidgetWaterAdd() {
        try {
            if (isDeliveringWater) return;
            SharedPreferences prefs = getSharedPreferences("fitflow_widget", MODE_PRIVATE);
            final int pending = prefs.getInt("pendingWaterAdd", 0);
            if (pending > 0) {
                isDeliveringWater = true;
                prefs.edit().putInt("pendingWaterAdd", 0).apply();
                tryProcessWidgetAction("add_water_" + pending, 0);
            }
        } catch (Exception e) { }
    }

    private void processWidgetAction() {
        final String action = pendingWidgetAction;
        pendingWidgetAction = null;
        if (action == null) return;
        tryProcessWidgetAction(action, 0);
    }

    private void tryProcessWidgetAction(final String action, final int attempt) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView wv = getBridge().getWebView();
                    if (wv != null) {
                        // 0.5.5: ждём реальную готовность app.js. Раньше evaluateJavascript
                        // на холодном старте тихо «съедал» действие (window.onWidgetAction
                        // ещё не существовала), а pendingAdd уже был обнулён.
                        wv.evaluateJavascript("(window.__fitflowReady === true)", new android.webkit.ValueCallback<String>() {
                            @Override public void onReceiveValue(String value) {
                                if ("true".equals(value)) deliverWidgetAction(action);
                                else retryWidgetAction(action, attempt);
                            }
                        });
                        return;
                    }
                } catch (Exception e) { }
                retryWidgetAction(action, attempt);
            }
        });
    }

    private void deliverWidgetAction(String action) {
        try {
            isDeliveringWater = false;
            WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.evaluateJavascript("window.onWidgetAction && window.onWidgetAction('" + action + "');", null);
                return;
            }
        } catch (Exception e) { }
        isDeliveringWater = false;
        retryWidgetAction(action, 0);
    }

    private void retryWidgetAction(final String action, final int attempt) {
        if (action == null) { isDeliveringWater = false; return; }
        if (attempt < 40) {
            new android.os.Handler().postDelayed(new Runnable() {
                @Override
                public void run() { tryProcessWidgetAction(action, attempt + 1); }
            }, 300);
        } else {
            isDeliveringWater = false;
        }
        // Если и за ~12 секунд не дождались — действие остаётся в prefs
        // (add_water) или теряется безвредно (smart_entry/notif_settings_*).
    }

    /* ===== Сохранение резервной копии через системное окно Android ===== */

    private void initStepSensors() {
        try {
            sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
            if (sensorManager != null) {
                stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
                if (stepCounterSensor != null) {
                    sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
                }
                stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
                if (stepDetectorSensor != null) {
                    sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL);
                }
            }
        } catch (Exception e) { }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        try {
            if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
                int totalSteps = (int) event.values[0];
                updatePhoneSteps(totalSteps);
            } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
                incrementStepDetector();
            }
        } catch (Exception e) { }
    }

    private void updatePhoneSteps(int rawSteps) {
        try {
            SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
            String baseDate = prefs.getString("steps_base_date", "");
            int baseSteps = prefs.getInt("steps_base", -1);
            // Перебазирование: новый день, нет базы или счётчик сброшен (перезагрузка).
            // Отдельный ключ steps_base_date хранит ДЕНЬ установки базы: ночной сброс
            // HealthSyncReceiver меняет steps_date, но не базу — раньше утром счётчик
            // продолжал считать от вчерашней базы и прибавлял вчерашние шаги к сегодняшним.
            if (!today.equals(baseDate) || baseSteps == -1 || rawSteps < baseSteps) {
                baseSteps = rawSteps;
                prefs.edit()
                    .putString("steps_date", today)
                    .putString("steps_base_date", today)
                    .putInt("steps_base", baseSteps)
                    .putInt("steps_today", 0)
                    .apply();
            } else {
                int stepsToday = rawSteps - baseSteps;
                prefs.edit().putInt("steps_today", Math.max(0, stepsToday)).apply();
            }
        } catch (Exception e) { }
    }

    private void incrementStepDetector() {
        try {
            SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
            String savedDate = prefs.getString("steps_date", "");
            if (!today.equals(savedDate)) {
                prefs.edit().putString("steps_date", today).putInt("steps_today", 1).putInt("steps_base", 0).apply();
            } else {
                int current = prefs.getInt("steps_today", 0);
                prefs.edit().putInt("steps_today", current + 1).apply();
            }
        } catch (Exception e) { }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    private void installBackupBridge() {
        try {
            WebView wv = getBridge().getWebView();
            if (wv != null) {
                BackupBridge bridge = new BackupBridge();
                wv.addJavascriptInterface(bridge, "FitFlowExport");
                wv.addJavascriptInterface(bridge, "AquaExport");
            }
        } catch (Exception e) {
        }
    }

    public class BackupBridge {
        /* Производитель устройства — для подсказки по автозапуску */
        @JavascriptInterface
        public String getManufacturer() {
            try {
                return Build.MANUFACTURER == null ? "" : Build.MANUFACTURER;
            } catch (Exception e) {
                return "";
            }
        }

        /* Разрешены ли уведомления */
        @JavascriptInterface
        public boolean areNotificationsEnabled() {
            try {
                return NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled();
            } catch (Exception e) {
                return true;
            }
        }

        /* Выключены ли оптимизации батареи для приложения */
        @JavascriptInterface
        public boolean isBatteryOptimizationIgnored() {
            try {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
            } catch (Exception e) {
                return true;
            }
        }

        /* Снимок фоновой синхронизации: шаги и калории из Health Connect и телефона */
        @JavascriptInterface
        public String getHealthSyncSnapshot() {
            try {
                SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
                String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
                String savedDate = prefs.getString("steps_date", "");
                if (today.equals(savedDate)) {
                    int hcSteps = prefs.getInt("hc_steps_today", 0);   // шаги с часов
                    int hcTotalSteps = prefs.getInt("hc_total_steps_today", hcSteps); // всего в HC
                    float hcKcal = prefs.getFloat("hc_kcal_today", 0.0f);
                    int phoneSteps = prefs.getInt("steps_today", 0);
                    long lastSync = prefs.getLong("hc_last_sync_ts", 0);
                    long watchLastTs = prefs.getLong("hc_watch_last_ts", 0);
                    return String.format(java.util.Locale.US,
                        "{\"date\":\"%s\",\"hcSteps\":%d,\"watchSteps\":%d,\"hcTotalSteps\":%d,\"hcKcal\":%.1f,\"phoneSteps\":%d,\"watchLastTs\":%d,\"lastSync\":%d}",
                        today, hcSteps, hcSteps, hcTotalSteps, hcKcal, phoneSteps, watchLastTs, lastSync
                    );
                }
            } catch (Exception e) { }
            return "{}";
        }

        /* Полная диагностика шагомера, датчиков и Health Connect */
        @JavascriptInterface
        public String getHealthDiagnosticsJson() {
            try {
                JSONObject diag = new JSONObject();
                diag.put("androidApi", Build.VERSION.SDK_INT);
                diag.put("manufacturer", Build.MANUFACTURER != null ? Build.MANUFACTURER : "");
                diag.put("model", Build.MODEL != null ? Build.MODEL : "");

                boolean actPerm = true;
                if (Build.VERSION.SDK_INT >= 29) {
                    actPerm = checkSelfPermission(android.Manifest.permission.ACTIVITY_RECOGNITION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                }
                diag.put("activityRecognitionGranted", actPerm);

                diag.put("hasStepCounterSensor", stepCounterSensor != null);
                diag.put("hasStepDetectorSensor", stepDetectorSensor != null);

                SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
                String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
                String savedDate = prefs.getString("steps_date", "");
                int stepsToday = today.equals(savedDate) ? prefs.getInt("steps_today", 0) : 0;
                int baseSteps = prefs.getInt("steps_base", -1);
                int hcSteps = today.equals(savedDate) ? prefs.getInt("hc_steps_today", 0) : 0;
                int hcTotalSteps = today.equals(savedDate) ? prefs.getInt("hc_total_steps_today", hcSteps) : 0;
                float hcKcal = today.equals(savedDate) ? prefs.getFloat("hc_kcal_today", 0.0f) : 0.0f;
                long lastSync = prefs.getLong("hc_last_sync_ts", 0);

                diag.put("todayDate", today);
                diag.put("savedDate", savedDate);
                diag.put("phoneStepsToday", stepsToday);
                diag.put("phoneBaseSteps", baseSteps);
                diag.put("hcStepsToday", hcSteps);
                diag.put("hcWatchStepsToday", hcSteps);
                diag.put("hcTotalStepsToday", hcTotalSteps);
                diag.put("hcKcalToday", (double) hcKcal);
                diag.put("hcSleepMin", prefs.getInt("hc_sleep_min", 0));
                diag.put("hcSleepBedTime", prefs.getString("hc_sleep_bed", ""));
                diag.put("hcSleepWakeTime", prefs.getString("hc_sleep_wake", ""));
                diag.put("hcWatchLastTs", prefs.getLong("hc_watch_last_ts", 0));
                diag.put("lastSyncTs", lastSync);

                boolean hasHcIntent = false;
                String[] hcIntents = new String[] {
                    "android.health.connect.action.HEALTH_HOME_SETTINGS",
                    "androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"
                };
                for (String act : hcIntents) {
                    try {
                        Intent testIntent = new Intent(act);
                        if (getPackageManager().resolveActivity(testIntent, 0) != null) {
                            hasHcIntent = true;
                            break;
                        }
                    } catch (Exception e) { }
                }
                if (Build.VERSION.SDK_INT >= 34) {
                    hasHcIntent = true;
                }
                diag.put("hasHealthConnectApp", hasHcIntent);
                String currErr = HealthConnectHelper.getLastError();
                if (currErr.isEmpty()) {
                    currErr = prefs.getString("hc_last_error", "");
                }
                diag.put("hcLastError", currErr);
                boolean hcPerm = true;
                try {
                    if (Build.VERSION.SDK_INT >= 34) {
                        hcPerm = checkSelfPermission("android.permission.health.READ_STEPS") == android.content.pm.PackageManager.PERMISSION_GRANTED;
                    }
                } catch (Exception e) { }
                diag.put("healthConnectPermissionGranted", hcPerm);

                return diag.toString();
            } catch (Exception e) {
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        /* Шагомер: получить количество шагов телефона за сегодня */
        @JavascriptInterface
        public int getPhoneStepsToday() {
            try {
                SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
                String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
                String savedDate = prefs.getString("steps_date", "");
                if (today.equals(savedDate)) {
                    return prefs.getInt("steps_today", 0);
                }
                return 0;
            } catch (Exception e) {
                return 0;
            }
        }

        /* Принудительный запрос к Health Connect через Kotlin-хелпер */
        @JavascriptInterface
        public void syncHealthConnectNow() {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
                        final int[] result = HealthConnectHelper.syncNow(getApplicationContext());
                        // result = [шаги с часов, всего в HC, сон мин]
                        final int watchSteps = result[0];
                        final int totalSteps = result[1];
                        final int sleepMin = result[2];
                        final double kcal = watchSteps * 0.04;
                        final long watchLastTs = HealthConnectHelper.getLastWatchEndMs();
                        prefs.edit()
                            .putInt("hc_steps_today", watchSteps)
                            .putInt("hc_total_steps_today", totalSteps)
                            .putFloat("hc_kcal_today", (float) kcal)
                            .putInt("hc_sleep_min", sleepMin)
                            .putString("hc_sleep_bed", HealthConnectHelper.getLastBedTime())
                            .putString("hc_sleep_wake", HealthConnectHelper.getLastWakeTime())
                            .putLong("hc_watch_last_ts", watchLastTs)
                            .putLong("hc_last_sync_ts", System.currentTimeMillis())
                            .putString("hc_last_error", HealthConnectHelper.getLastError())
                            .apply();
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        String js = String.format(java.util.Locale.US,
                                            "window.onHealthConnectDataReceived && window.onHealthConnectDataReceived(%d, %.1f, %d, '%s', '%s', %d);",
                                            watchSteps, (float) kcal, sleepMin,
                                            HealthConnectHelper.getLastBedTime(), HealthConnectHelper.getLastWakeTime(), watchLastTs);
                                        wv.evaluateJavascript(js, null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {}
                }
            }).start();
        }

        @JavascriptInterface
        public String getHealthConnectLastError() {
            String curr = HealthConnectHelper.getLastError();
            if (!curr.isEmpty()) return curr;
            SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
            return prefs.getString("hc_last_error", "");
        }

        /* 0.8.0: сессии тренировок с часов из Health Connect → JS-подсказка */
        @JavascriptInterface
        public void syncHealthWorkoutsNow() {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        final String json = HealthConnectHelper.readTodayWorkouts(getApplicationContext());
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        wv.evaluateJavascript(
                                            "window.onHealthWorkoutsReceived && window.onHealthWorkoutsReceived(" + JSONObject.quote(json) + ");", null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {}
                }
            }).start();
        }

        /* 0.9.14: обратная заливка истории ТРЕНИРОВОК → JS.
           Раньше моста не было вовсе: сессии приходили только за 3 последних дня
           (syncHealthWorkoutsNow), и всё, что старше, терялось безвозвратно.
           Симметрично истории шагов и сна: за 30 дней, JS сам разберётся с дублями. */
        @JavascriptInterface
        public void syncHealthWorkoutsHistory() {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        final String json = HealthConnectHelper.readWorkoutsHistory(getApplicationContext(), 30);
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        wv.evaluateJavascript(
                                            "window.onHealthWorkoutsHistoryReceived && window.onHealthWorkoutsHistoryReceived(" + JSONObject.quote(json) + ");", null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {}
                }
            }).start();
        }

        /* 0.8.11: обратная заливка истории шагов (P28) → JS */
        @JavascriptInterface
        public void syncHealthStepsHistory() {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        final String json = HealthConnectHelper.readStepsHistory(getApplicationContext(), 30);
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        wv.evaluateJavascript(
                                            "window.onHealthStepsHistoryReceived && window.onHealthStepsHistoryReceived(" + JSONObject.quote(json) + ");", null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {}
                }
            }).start();
        }

        /* 0.9.11: обратная заливка истории сна → JS.
           Симметрично истории шагов: пропущенные ночи восстанавливаются задним числом. */
        @JavascriptInterface
        public void syncHealthSleepHistory() {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        final String json = HealthConnectHelper.readSleepHistory(getApplicationContext(), 30);
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        wv.evaluateJavascript(
                                            "window.onHealthSleepHistoryReceived && window.onHealthSleepHistoryReceived(" + JSONObject.quote(json) + ");", null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {}
                }
            }).start();
        }

        /* 0.8.23: показатели тела (вес/рост с умных весов) → JS */
        @JavascriptInterface
        public void syncHealthBodyMetrics() {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        final String json = HealthConnectHelper.readBodyMetrics(getApplicationContext(), 30);
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        wv.evaluateJavascript(
                                            "window.onHealthBodyMetricsReceived && window.onHealthBodyMetricsReceived(" + JSONObject.quote(json) + ");", null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {}
                }
            }).start();
        }

        /* 0.8.11: записать тренировку в Health Connect → JS-колбэк */
        @JavascriptInterface
        public void exportWorkoutToHealthConnect(final String json) {
            new Thread(new Runnable() {
                @Override public void run() {
                    try {
                        JSONObject data = new JSONObject(json == null ? "{}" : json);
                        final String title = data.optString("title", "Тренировка");
                        final String type = data.optString("type", "other");
                        final long start = data.optLong("start", System.currentTimeMillis() - 3600000L);
                        final long end = data.optLong("end", System.currentTimeMillis());
                        final String result = HealthConnectHelper.insertWorkoutSession(getApplicationContext(), title, type, start, end);
                        final boolean ok = "OK".equals(result);
                        SharedPreferences prefs = getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE);
                        prefs.edit().putString("hc_export_last", ok ? "OK" : result).apply();
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) {
                                        wv.evaluateJavascript(
                                            "window.onWorkoutExported && window.onWorkoutExported(" + ok + ", " + JSONObject.quote(ok ? "OK" : result) + ");", null);
                                    }
                                } catch (Exception e) {}
                            }
                        });
                    } catch (Exception e) {
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                try {
                                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                                    if (wv != null) wv.evaluateJavascript("window.onWorkoutExported && window.onWorkoutExported(false, \"JSON error\");", null);
                                } catch (Exception e2) {}
                            }
                        });
                    }
                }
            }).start();
        }

        /* Запросить рантайм-разрешения Health Connect на Android 14+ */
        @JavascriptInterface
        public void requestHealthConnectPermissions() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent("android.health.connect.action.MANAGE_HEALTH_PERMISSIONS");
                        intent.putExtra(Intent.EXTRA_PACKAGE_NAME, getPackageName());
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return;
                    } catch (Exception e) { }
                    try {
                        Intent intent = new Intent("android.health.connect.action.HEALTH_HOME_SETTINGS");
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return;
                    } catch (Exception e2) { }
                    openHealthConnectSettings();
                }
            });
        }

        /* Открыть системные настройки разрешений Health Connect */
        @JavascriptInterface
        public void openHealthConnectSettings() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String[] actions = new String[] {
                        "android.health.connect.action.HEALTH_HOME_SETTINGS",
                        "androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"
                    };
                    for (String act : actions) {
                        try {
                            Intent intent = new Intent(act);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return;
                        } catch (Exception e) { }
                    }
                    try {
                        Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.fromParts("package", getPackageName(), null));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e2) { }
                }
            });
        }

        /* Запросить разрешение на физическую активность (шагомер) */
        @JavascriptInterface
        public void requestActivityRecognition() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (Build.VERSION.SDK_INT >= 29) {
                            if (checkSelfPermission(android.Manifest.permission.ACTIVITY_RECOGNITION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                requestPermissions(new String[]{android.Manifest.permission.ACTIVITY_RECOGNITION}, 1002);
                            }
                        }
                    } catch (Exception e) { }
                }
            });
        }

        /* Открыть нужный экран системных настроек */
        @JavascriptInterface
        public void openSettingsScreen(final String which) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    openSettings(which);
                }
            });
        }

        /* Офлайн-предпочтительный системный голосовой ввод Android */
        @JavascriptInterface
        public void startVoiceInput() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU");
                        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
                        // VOICE_PAUSE_PATCH (0.3.39): «6 с» — НИЖНЯЯ граница сессии, не лимит!
                        // Короткая фраза просто дождётся 6-й секунды (это floor). «Отключается
                        // посреди ввода» — срабатывание по паузе на обдумывание: тишину подняли
                        // 2.5 → 4.0/4.5 с — списки можно диктовать не торопясь.
                        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 6000L);
                        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 4500L);
                        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 4000L);
                        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Расскажите о воде, еде и активности");
                        startActivityForResult(intent, REQ_VOICE_INPUT);
                    } catch (Exception e) {
                        notifyVoiceResult("");
                    }
                }
            });
        }

        /* 0.9.2: сканер штрих-кода камерой (ZXing, Apache-2.0).
           Выбран вместо ML Kit / BarcodeDetector сознательно: работает на ЛЮБОМ
           телефоне, включая устройства без сервисов Google (Huawei и часть
           китайских брендов) — там оба решения от Google просто не запускаются.
           Цена вопроса — около 1 МБ в APK, что владелец согласовал.
           Всё распознавание идёт локально, ни одно изображение никуда не уходит. */
        @JavascriptInterface
        public void scanBarcode() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        IntentIntegrator integrator = new IntentIntegrator(MainActivity.this);
                        // Только товарные форматы: QR-коды и прочее для продуктов бесполезны
                        // и лишь провоцируют ложные срабатывания на случайных наклейках.
                        integrator.setDesiredBarcodeFormats(
                            "EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "ITF");
                        integrator.setPrompt("Наведите камеру на штрих-код упаковки");
                        integrator.setBeepEnabled(true);
                        integrator.setOrientationLocked(false);
                        integrator.setBarcodeImageEnabled(false);
                        integrator.initiateScan();
                    } catch (Exception e) {
                        // Библиотека недоступна или камеру занял другой процесс —
                        // сообщаем в JS, там откроется обычная ручная карточка.
                        notifyBarcodeResult("", "unavailable");
                    }
                }
            });
        }

        /* Открыть внешнюю ссылку в браузере телефона (0.9.3).
           Нужно для страницы ИИ-модели на Hugging Face: там требуется вход в
           аккаунт и принятие лицензии Gemma, а внутри WebView приложения это
           неудобно и небезопасно (чужая форма логина в нашем окне). Поэтому
           отдаём ссылку системе — пользователь работает в своём браузере,
           где у него уже может быть сессия HF.
           Открываем только http/https: никаких intent://, file:// и прочих
           схем, которыми можно было бы дотянуться до внутренностей телефона.
           Возвращаем boolean, чтобы JS знал, открылось ли, и при неудаче
           показал ссылку текстом для ручного копирования. */
        @JavascriptInterface
        public boolean openExternalUrl(final String url) {
            try {
                if (url == null) return false;
                String trimmed = url.trim();
                if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
                final Uri uri = Uri.parse(trimmed);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception e) {
                        }
                    }
                });
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /* Есть ли на устройстве работающая камера — JS прячет кнопку сканера,
           если сканировать физически нечем (планшеты без камеры, эмуляторы). */
        @JavascriptInterface
        public boolean hasCamera() {
            try {
                return getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY);
            } catch (Exception e) {
                return false;
            }
        }

        /* Закрыть приложение, если пользователь не принял условия */
        @JavascriptInterface
        public void closeApp() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { finishAndRemoveTask(); } catch (Exception e) { finish(); }
                }
            });
        }

        /* Обновить компактный Android-виджет из WebView */
        @JavascriptInterface
        public void updateWidget(final String json) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        JSONObject data = new JSONObject(json == null ? "{}" : json);
                        SharedPreferences prefs = getSharedPreferences("fitflow_widget", MODE_PRIVATE);
                        prefs.edit()
                            .putInt("waterTotal", data.optInt("waterTotal", 0))
                            .putInt("waterGoal", data.optInt("waterGoal", 2500))
                            .putInt("foodTotal", data.optInt("foodTotal", 0))
                            .putInt("foodGoal", data.optInt("foodGoal", 2000))
                            .putInt("activityMinutes", data.optInt("activityMinutes", 0))
                            .putInt("stepsToday", data.optInt("stepsToday", 0))
                            // 0.9.6: цели для «рисованных» виджетов (кольца, дуги, плитки)
                            .putInt("stepsGoal", data.optInt("stepsGoal", 8000))
                            .putInt("activityGoal", data.optInt("activityGoal", 21))
                            .putString("profileName", data.optString("profileName", "Мой профиль"))
                            .putString("date", data.optString("date", ""))
                            // 0.9.4: раскладка виджета из настроек приложения — список
                            // выбранных строк и готовые тексты для тех показателей,
                            // которые считаются в JS (вес, план дня, самочувствие, тренировка).
                            .putString("widgetItems", data.optString("widgetItems", "water,food,steps"))
                            .putString("widgetSize", data.optString("widgetSize", "medium"))
                            .putString("weightLine", data.optString("weightLine", ""))
                            .putString("dayPlanLine", data.optString("dayPlanLine", ""))
                            .putString("moodLine", data.optString("moodLine", ""))
                            .putString("workoutLine", data.optString("workoutLine", ""))
                            .putString("activityLine", data.optString("activityLine", ""))
                            // 0.5.5/0.5.6: момент последней записи воды — ресивер сам
                            // пропускает ближайшее напоминание (настройки «пауза» больше нет)
                            .putLong("lastWaterAt", data.optLong("lastWaterAt", prefs.getLong("lastWaterAt", 0)))
                            .apply();
                        // 0.7.13: приоритет источников шагов — в сенсорные prefs,
                        // чтобы фоновый HealthSyncReceiver мог разрешать шаги без WebView.
                        getSharedPreferences("fitflow_sensor_prefs", MODE_PRIVATE).edit()
                            .putString("health_priority", data.optString("priority", "auto"))
                            .apply();
                        FitFlowWidgetProvider.updateAll(MainActivity.this);
                    } catch (Exception e) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveBackup(final String json, final String fileName) {
            pendingBackupJson = json;
            final String name = (fileName == null || fileName.length() == 0)
                    ? "fitflow-backup.json"
                    : fileName;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("application/json");
                        intent.putExtra(Intent.EXTRA_TITLE, name);
                        startActivityForResult(intent, REQ_SAVE_BACKUP);
                    } catch (Exception e) {
                        pendingBackupJson = null;
                        notifyBackupResult(false, "Системное окно сохранения недоступно");
                    }
                }
            });
        }

        /* Нативные напоминания о воде: кнопка «+250 мл» прямо в шторке,
           без открытия приложения; виджет обновляется автоматически */
        @JavascriptInterface
        public void scheduleWaterRemindersNative(final String timesCsv) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { WaterReminderReceiver.setSchedule(MainActivity.this, timesCsv); } catch (Exception e) { }
                }
            });
        }

        @JavascriptInterface
        public void cancelWaterRemindersNative() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { WaterReminderReceiver.clearSchedule(MainActivity.this); } catch (Exception e) { }
                }
            });
        }

        /* 0.9.13: план курсов уезжает в натив целиком (JSON-массив курсов и
           отметки за сегодня). Дальше уведомление с кнопкой «✓ Принял» и
           строка витаминов на виджете живут без WebView — как у воды. */
        @JavascriptInterface
        public void scheduleCourseRemindersNative(final String planJson, final String dateKey, final String doneJson) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        FitFlowCourses.setPlan(MainActivity.this, planJson);
                        FitFlowCourses.setDoneForDate(MainActivity.this, dateKey, doneJson);
                        CourseReminderReceiver.reschedule(MainActivity.this);
                        FitFlowWidgetProvider.updateAll(MainActivity.this);
                    } catch (Exception e) { }
                }
            });
        }

        @JavascriptInterface
        public void cancelCourseRemindersNative() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        FitFlowCourses.clearPlan(MainActivity.this);
                        CourseReminderReceiver.clearAll(MainActivity.this);
                        FitFlowWidgetProvider.updateAll(MainActivity.this);
                    } catch (Exception e) { }
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_VOICE_INPUT) {
            String text = "";
            try {
                if (resultCode == RESULT_OK && data != null) {
                    ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                    if (results != null && !results.isEmpty()) text = results.get(0);
                }
            } catch (Exception e) {
            }
            notifyVoiceResult(text);
            return;
        }
        /* 0.9.2: результат сканера штрих-кода. IntentIntegrator сам распознаёт
           свой requestCode; если это не его результат — parseActivityResult
           вернёт null и мы пропускаем обработку дальше по цепочке. */
        IntentResult scan = null;
        try {
            scan = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        } catch (Exception e) {
        }
        if (scan != null) {
            String code = scan.getContents();
            if (code == null || code.isEmpty()) {
                notifyBarcodeResult("", "cancelled");   // пользователь нажал «назад»
            } else {
                notifyBarcodeResult(code, "");
            }
            return;
        }
        if (requestCode == REQ_SAVE_BACKUP) {
            String json = pendingBackupJson;
            pendingBackupJson = null;
            Uri uri = (data == null) ? null : data.getData();
            if (resultCode == RESULT_OK && uri != null && json != null) {
                OutputStream os = null;
                try {
                    os = getContentResolver().openOutputStream(uri, "w");
                    os.write(json.getBytes("UTF-8"));
                    os.flush();
                    notifyBackupResult(true, "Резервная копия сохранена");
                } catch (Exception e) {
                    notifyBackupResult(false, "Не удалось записать файл");
                } finally {
                    try { if (os != null) os.close(); } catch (Exception e2) { }
                }
            } else {
                notifyBackupResult(false, "Сохранение отменено");
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void notifyVoiceResult(final String text) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView wv = getBridge().getWebView();
                    if (wv == null) return;
                    String js = "window.onVoiceInputResult && window.onVoiceInputResult(" + JSONObject.quote(text) + ");";
                    wv.evaluateJavascript(js, null);
                } catch (Exception e) {
                }
            }
        });
    }

    /* 0.9.2: код из сканера → JS. Пустой code + причина в error означают,
       что сканирование не состоялось (отмена или сканер недоступен). */
    private void notifyBarcodeResult(final String code, final String error) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                    if (wv == null) return;
                    String js = "window.onBarcodeScanned && window.onBarcodeScanned("
                        + JSONObject.quote(code) + "," + JSONObject.quote(error) + ");";
                    wv.evaluateJavascript(js, null);
                } catch (Exception e) {
                }
            }
        });
    }

    private void notifyBackupResult(final boolean ok, final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView wv = getBridge().getWebView();
                    if (wv == null) return;
                    String js = "window.onBackupSaveResult && window.onBackupSaveResult("
                            + ok + "," + JSONObject.quote(message) + ");";
                    wv.evaluateJavascript(js, null);
                } catch (Exception e) {
                }
            }
        });
    }

    /* ===== Экраны системных настроек ===== */

    private void openSettings(String which) {
        if ("battery".equals(which)) {
            boolean granted = false;
            try {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                granted = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
            } catch (Exception e) {
            }

            if (!granted) {
                if (tryStart(new Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + getPackageName())))) return;
            }

            if (tryStart(new Intent(
                    Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))) return;
            openAppDetails();
            return;
        }

        if ("notifications".equals(which)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                i.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                if (tryStart(i)) return;
            }
            openAppDetails();
            return;
        }

        if ("autostart".equals(which)) {
            if (tryAutostart()) return;
            openAppDetails();
            return;
        }
        openAppDetails();
    }

    private boolean tryAutostart() {
        String[][] targets = new String[][] {
            { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
            { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
            { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
            { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" },
            { "com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity" },
            { "com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity" },
            { "com.asus.mobilemanager", "com.asus.mobilemanager.entry.FunctionActivity" }
        };
        for (String[] t : targets) {
            Intent i = new Intent();
            i.setClassName(t[0], t[1]);
            if (tryStart(i)) return true;
        }
        return false;
    }

    private void openAppDetails() {
        tryStart(new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getPackageName())));
    }

    private boolean tryStart(Intent intent) {
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /* ===== Разрешения ===== */

    private void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
                if (am != null && !am.canScheduleExactAlarms()) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            } catch (Exception e) {
            }
        }
    }

    private void requestIgnoreBatteryOptimizations() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            }
        } catch (Exception e) {
        }
    }
}
