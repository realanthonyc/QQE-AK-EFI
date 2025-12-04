// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © Anthony C. https://x.com/anthonycxc

//@version=6
// -------------------------------------------------------------------------
//  QQE + AK Trend + EFI
//  - QQE histogram with Wilder's smoothing (ta.rma) for ATR-of-RSI
//  - AK Scale Factor based on timeframe
//  - Elder Force Index (EFI) with dynamic scaling to match QQE trend range
//  - Dynamic scaling adjusts EFI height based on QQE range over the specified number of bars
//  v1.4.8
// -------------------------------------------------------------------------
indicator("QQE + AK Trend + EFI", shorttitle="QQE + AK + EFI", overlay=false, max_lines_count=1, max_bars_back=800)

// === QQE Settings ===
rsiLengthPrimary     = input.int(6, "RSI Length", minval=1, group="QQE Settings")
rsiSmoothingPrimary  = input.int(5, "RSI Smoothing", minval=1, group="QQE Settings")
qqeFactorPrimary     = input.float(2.0, "QQE Factor", minval=0.1, step=0.1, tooltip="Lower = smoother QQE band.", group="QQE Settings")
thresholdPrimary     = input.float(10.0, "Threshold", minval=0.1, step=0.1, tooltip="RSI distance from 50 to color histogram.", group="QQE Settings")
sourcePrimary        = input.source(close, "RSI Source", group="QQE Settings")
atrLen               = input.int(14, "ATR Length for QQE (Wilder)", minval=1, group="QQE Settings")

// === AK Trend Settings ===
showAkTrend          = input.bool(true, "Compute and show the AK Trend line", group="AK Trend Settings")
input1               = input.int(3, "Fast EMA 1", minval=1, group="AK Trend Settings")
input2               = input.int(8, "Fast EMA 2", minval=1, group="AK Trend Settings")
ak_scale_less_15m    = input.float(32.0, "AK Scale Factor (<15m)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes less than 15 minutes", group="AK Trend Settings")
ak_scale_15m_1h      = input.float(16.0, "AK Scale Factor (15m-1h)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes between 15 minutes and 1 hour", group="AK Trend Settings")
ak_scale_1h_1d       = input.float(8.0,  "AK Scale Factor (>1h-1d)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes between 1 hour and 1 day", group="AK Trend Settings")
ak_scale_above_1d    = input.float(3.0,  "AK Scale Factor (>1d)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes above 1 day", group="AK Trend Settings")

// === EFI Settings ===
efiLength            = input.int(13, "EFI Length", minval=1, group="EFI Settings")
efiMultiplier        = input.float(2.25, "EFI Multiplier", minval=0.1, step=0.05, tooltip="Multiplier to adjust EFI height relative to QQE range (higher value makes EFI taller).", group="EFI Settings")
dynamicScalingBars   = input.int(300, "Dynamic Scaling Bars", minval=1, tooltip="Number of bars to look back for dynamic scaling of EFI (larger value considers more historical data for range calculation).", group="EFI Settings")

// === AK Scale Factor based on timeframe ===
getAkScaleFactor(_less_15m, _15m_1h, _1h_1d, _above_1d) =>
    timeframeInSeconds = timeframe.in_seconds()
    akScale = timeframeInSeconds < 900 ? _less_15m :  // 15m (900 seconds)
              timeframeInSeconds <= 3600 ? _15m_1h :  // 1h (3600 seconds)
              timeframeInSeconds <= 86400 ? _1h_1d : _above_1d  // 1d (86400 seconds)
    akScale
ak_scale = getAkScaleFactor(ak_scale_less_15m, ak_scale_15m_1h, ak_scale_1h_1d, ak_scale_above_1d)

// === Calculate QQE ===
calculateQQE(_src, _rsiLen, _sLen, _qqeFactor, _atrLen) =>
    // RSI and smoothing
    _rsi         = ta.rsi(_src, _rsiLen)
    _smoothedRsi = ta.ema(_rsi, _sLen)

    // ATR of RSI via Wilder's smoothing (classic QQE style)
    _atrRsi = math.abs(_smoothedRsi - _smoothedRsi[1])
    _atrW   = ta.rma(_atrRsi, _atrLen)
    _delta  = _atrW * _qqeFactor

    // Bands with proper initialization using nz()
    var float _longBand = na
    var float _shortBand = na
    var int   _trendDir  = 0
    _newShort = _smoothedRsi + _delta
    _newLong  = _smoothedRsi - _delta
    _longPrev  = nz(_longBand[1],  _newLong)
    _shortPrev = nz(_shortBand[1], _newShort)
    _longBand  := _smoothedRsi > _longPrev  ? math.max(_longPrev,  _newLong)  : _newLong
    _shortBand := _smoothedRsi < _shortPrev ? math.min(_shortPrev, _newShort) : _newShort

    // Trend direction with explicit edge checks; seed with nz()
    _crossUp = _smoothedRsi > _shortPrev and _smoothedRsi[1] <= _shortPrev
    _crossDn = _smoothedRsi < _longPrev  and _smoothedRsi[1] >= _longPrev
    _trendDir := _crossUp ? 1 : _crossDn ? -1 : nz(_trendDir[1], 0)
    _qqeTrendLine = _trendDir == 1 ? _longBand : _shortBand
    [_qqeTrendLine, _smoothedRsi - 50]  // return QQE trend (unshifted) and RSI shifted to 0

// === Main Calculations ===
[qqeTrend, rsi0] = calculateQQE(sourcePrimary, rsiLengthPrimary, rsiSmoothingPrimary, qqeFactorPrimary, atrLen)

// AK Trend (compute only when shown)
fastmaa = showAkTrend ? ta.ema(close, input1) : na
fastmab = showAkTrend ? ta.ema(close, input2) : na
bspread = showAkTrend ? (fastmaa - fastmab) * 1.001 : na
akTrendColor = bspread > 0 ? color.rgb(5, 152, 5) : color.rgb(180, 0, 0)

// EFI Calculation
efi = ta.ema(ta.change(close) * volume, efiLength)

// Dynamic scaling to match QQE trend range
qqeShifted = qqeTrend - 50
qqeHighest = ta.highest(qqeShifted, dynamicScalingBars)
qqeLowest = ta.lowest(qqeShifted, dynamicScalingBars)
efiHighest = ta.highest(efi, dynamicScalingBars)
efiLowest = ta.lowest(efi, dynamicScalingBars)
scaleFactor = efiMultiplier * (math.max(math.abs(qqeHighest), math.abs(qqeLowest)) / math.max(math.max(math.abs(efiHighest), math.abs(efiLowest)), 0.0001))
scaledEfi = efi * scaleFactor

// === Plotting ===
// QQE histogram (shifted RSI around 0)
rsiColor = rsi0 >  thresholdPrimary ? color.rgb(144, 238, 144) :
           rsi0 < -thresholdPrimary ? color.rgb(255, 99, 71) :
                                      color.rgb(112, 112, 112, 50)
plot(rsi0, color=rsiColor, title="QQE Histogram", style=plot.style_columns)

// EFI area
efiAreaColor = scaledEfi >= 0 ? color.rgb(144, 238, 144, 60) : color.rgb(255, 99, 71, 60)
plot(scaledEfi, color=efiAreaColor, title="EFI Area", style=plot.style_area, display=display.none)

// EFI line (overlay to preserve original shape)
plot(scaledEfi, color=color.rgb(254,185,55), title="EFI Line", linewidth=1)

// AK Trend line (draw only when requested)
akTrendValue = showAkTrend ? bspread * ak_scale : na
plot(akTrendValue, title="AK Trend Line", color=akTrendColor, linewidth=2)