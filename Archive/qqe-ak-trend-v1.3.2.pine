// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © Anthony C. https://x.com/anthonycxc

//@version=6
// -------------------------------------------------------------------------
//  QQE + AK Trend + EFI Combined
//  - QQE instance
//  - Wilder's smoothing (ta.rma) for ATR-of-RSI
//  - AK Scale Factor based on timeframe
//  - Elder Force Index (EFI) with normalization to match scales
//  v1.3.2
// -------------------------------------------------------------------------
indicator("QQE + AK Trend + EFI Combined", shorttitle="QQE + AK + EFI", overlay=false, max_lines_count=1, max_bars_back=800)

// === QQE Settings ===
rsiLengthPrimary     = input.int(6,   "RSI Length",     minval=1, group="QQE Settings")
rsiSmoothingPrimary  = input.int(5,   "RSI Smoothing",  minval=1, group="QQE Settings")
qqeFactorPrimary     = input.float(2.0, "QQE Factor",   minval=0.1, step=0.1, tooltip="Lower = smoother QQE band.", group="QQE Settings")
thresholdPrimary     = input.float(10.0, "Threshold",   minval=0.1, step=0.1, tooltip="RSI distance from 50 to color histogram.", group="QQE Settings")
sourcePrimary        = input.source(close, "RSI Source", group="QQE Settings")
atrLen               = input.int(14, "ATR Length for QQE (Wilder)", minval=1, group="QQE Settings")

// === AK Trend Settings ===
showAkTrend          = input.bool(true, "Compute and Show AK Trend Line", group="AK Trend Settings")
input1               = input.int(3,  "Fast EMA 1", minval=1, group="AK Trend Settings")
input2               = input.int(8,  "Fast EMA 2", minval=1, group="AK Trend Settings")
ak_scale_less_15m    = input.float(28.0, "AK Scale Factor (<15m)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes less than 15 minutes", group="AK Trend Settings")
ak_scale_15m_1h      = input.float(16.0, "AK Scale Factor (15m-1h)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes between 15 minutes and 1 hour", group="AK Trend Settings")
ak_scale_1h_1d       = input.float(8.0,  "AK Scale Factor (>1h-1d)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes between 1 hour and 1 day", group="AK Trend Settings")
ak_scale_above_1d    = input.float(3.0,  "AK Scale Factor (>1d)", minval=0.1, step=0.1, tooltip="Scale factor for timeframes above 1 day", group="AK Trend Settings")

// === EFI Settings ===
efiLength            = input.int(13, "EFI Length", minval=1, group="EFI Settings")
normalizeEfi         = input.bool(true, "Normalize EFI", tooltip="Normalize EFI to prevent scale mismatch with QQE/AK.", group="EFI Settings")
normalizeLength      = input.int(200, "EFI Normalize Length", minval=1, tooltip="Smoothing length for EFI normalization.", group="EFI Settings")
targetAmplitude      = input.float(10.0, "EFI Target Amplitude", minval=0.1, step=0.1, tooltip="Target range for normalized EFI (e.g., +/-10).", group="EFI Settings")

// === AK Scale Factor based on timeframe ===
getAkScaleFactor(_less_15m, _15m_1h, _1h_1d, _above_1d) =>
    timeframeInMinutes = timeframe.period == "1" ? 1 :
                         timeframe.period == "5" ? 5 :
                         timeframe.period == "15" ? 15 :
                         timeframe.period == "30" ? 30 :
                         timeframe.period == "60" ? 60 :
                         timeframe.period == "240" ? 240 :
                         timeframe.period == "D" ? 1440 : 1440
    akScale = timeframeInMinutes < 15 ? _less_15m :
              timeframeInMinutes <= 60 ? _15m_1h :
              timeframeInMinutes <= 1440 ? _1h_1d : _above_1d
    akScale

ak_scale = getAkScaleFactor(ak_scale_less_15m, ak_scale_15m_1h, ak_scale_1h_1d, ak_scale_above_1d)

// === Calculate QQE (Single) ===
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

// Normalize EFI if enabled
smoothAbsEfi = ta.rma(math.abs(efi), normalizeLength)
normalizedEfi = normalizeEfi and smoothAbsEfi != 0 ? (efi / smoothAbsEfi) * targetAmplitude : efi

// === Plotting ===

// RSI histogram (shifted RSI around 0, middle layer, using QQE Signals' opaque colors)
rsiColor = rsi0 >  thresholdPrimary ? color.rgb(144, 238, 144) :
           rsi0 < -thresholdPrimary ? color.rgb(255, 99, 71) :
                                      color.rgb(112, 112, 112, 50)
plot(rsi0, color=rsiColor, title="RSI Histogram (Primary)", style=plot.style_columns)

// EFI line (bottom layer)
plot(normalizedEfi, color=#F44336, title="Elder Force Index")

// AK Trend line (top layer, draw only when requested)
plot(showAkTrend ? bspread * ak_scale : na, title="AK Trend Line", color=akTrendColor, linewidth=2)