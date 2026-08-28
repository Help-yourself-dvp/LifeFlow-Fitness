package com.fitflow.app;

/* 0.9.35: «плитки» в тёмной палитре — дополнительный вариант к светлому.
   Отличается ТОЛЬКО темой: вся геометрия и анимация живут в
   FitFlowWidgetTilesProvider/FitFlowWidgetPaint.drawTiles(), поэтому
   правки макета попадают в оба виджета автоматически. */
public class FitFlowWidgetTilesDarkProvider extends FitFlowWidgetTilesProvider {

    @Override
    int requestCodeBase() { return 880; }

    @Override
    FitFlowWidgetPaint.TilesTheme theme() {
        return FitFlowWidgetPaint.TILES_DARK;
    }
}
