// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © Anthony C. https://x.com/anthonycxc

//@version=6
// -------------------------------------------------------------------------
//  QQE + AK Trend Combined
//  - Single QQE instance
//  - Wilder's smoothing (ta.rma) for ATR-of-RSI
//  - Optional Bollinger (gated) to avoid unused stdev cost
//  v1.2.0
// -------------------------------------------------------------------------
indicator("QQE + AK Trend Combined", shorttitle="QQE + AK Trend", overlay=false, max_lines_count=1, max_bars_back=800)

// === Primary QQE Settings ===
rsiLengthPrimary     = input.int(6,   "RSI Length",     minval=1)
rsiSmoothingPrimary  = input.int(5,   "RSI Smoothing",  minval=1)
qqeFactorPrimary     = input.float(2.0, "QQE Factor",   minval=0.1, step=0.1, tooltip="Lower = smoother QQE band.")
thresholdPrimary     = input.float(10.0, "Threshold",   minval=0.1, step=0.1, tooltip="RSI distance from 50 to color histogram and fire signals.")
sourcePrimary        = input.source(close, "RSI Source")

// === QQE ATR length (Wilder) ===
atrLen               = input.int(14, "ATR Length for QQE (Wilder)", minval=1)

// === Optional: Bollinger on QQE (shifted to 0) ===
showBollinger        = input.bool(false, "Compute & Show Bollinger on QQE?", tooltip="If off, Bollinger series are not computed.")
bollingerLength      = input.int(50,  "BB Length",     minval=1, inline="bb", tooltip="Only used when Bollinger is enabled.")
bollingerMultiplier  = input.float(0.35, "BB Mult",    minval=0.001, maxval=5, step=0.1, inline="bb")

// === AK Trend Settings (optional) ===
computeAk            = input.bool(true, "Compute AK Trend?")
showAkTrend          = input.bool(true, "Show AK Trend Line")
input1               = input.int(3,  "Fast EMA 1", minval=1)
input2               = input.int(8,  "Fast EMA 2", minval=1)
ak_scale             = input.float(8.0, "AK Scale Factor", minval=0.1, step=0.1)

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

// === Main ===
[qqeTrend, rsi0] = calculateQQE(sourcePrimary, rsiLengthPrimary, rsiSmoothingPrimary, qqeFactorPrimary, atrLen)

// Optional Bollinger on the QQE trend (centered to 0 by subtracting 50 before)
qqe0 = qqeTrend - 50
bbBasis     = showBollinger ? ta.sma(qqe0, bollingerLength) : na
bbDev       = showBollinger ? bollingerMultiplier * ta.stdev(qqe0, bollingerLength) : na
bbUpper     = showBollinger ? bbBasis + bbDev : na
bbLower     = showBollinger ? bbBasis - bbDev : na

// AK Trend (compute gated)
fastmaa = computeAk ? ta.ema(close, input1) : na
fastmab = computeAk ? ta.ema(close, input2) : na
bspread = computeAk ? (fastmaa - fastmab) * 1.001 : na
akTrendColor = bspread > 0 ? color.rgb(5, 152, 5) : color.rgb(180, 0, 0)

// === Plotting ===
// RSI histogram (shifted RSI around 0)
rsiColor = rsi0 >  thresholdPrimary ? color.rgb(144, 238, 144, 50) :
           rsi0 < -thresholdPrimary ? color.rgb(255, 99, 71,   50) :
                                      color.rgb(112, 112, 112, 50)
plot(rsi0, color=rsiColor, title="RSI Histogram (Primary)", style=plot.style_columns)

// Optional: plot Bollinger bands on QQE (0-centered)
plot(showBollinger ? bbBasis : na, title="QQE BB Basis", color=color.new(color.white, 40))
plot(showBollinger ? bbUpper : na, title="QQE BB Upper", color=color.new(color.aqua,  0))
plot(showBollinger ? bbLower : na, title="QQE BB Lower", color=color.new(color.fuchsia,0))

// Signals (same semantics: histogram over threshold)
sigVal   = rsi0 >  thresholdPrimary ? rsi0 :
           rsi0 < -thresholdPrimary ? rsi0 : na
sigColor = rsi0 >  thresholdPrimary ? color.rgb(144, 238, 144) : color.rgb(255, 99, 71)
plot(sigVal, title="QQE Signals", style=plot.style_columns, color=sigColor)

// AK Trend line (draw only when both computed and requested)
plot(showAkTrend and computeAk ? bspread * ak_scale : na, title="AK Trend Line", color=akTrendColor, linewidth=2)