// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © Anthony C. https://x.com/anthonycxc

//@version=6
// -------------------------------------------------------------------------
//  QQE + AK Trend Combined
//  - Optimized for Performance
//  - Removed redundant calculations
//  - Removed Secondary QQE Trend Line
//  - Adjusted default threshold and QQE factor
//  v1.1.6
// -------------------------------------------------------------------------
indicator("QQE + AK Trend Combined", shorttitle="QQE + AK Trend", overlay=false, max_lines_count=1)

// === Primary QQE Settings ===
rsiLengthPrimary = input.int(6, "RSI Length", minval=1)
rsiSmoothingPrimary = input.int(5, "RSI Smoothing", minval=1)
qqeFactorPrimary = input.float(2.0, "QQE Factor", minval=0.1, step=0.1, tooltip="Reduced to smooth QQE trend")
thresholdPrimary = input.float(10.0, "Threshold", minval=0.1, step=0.1, tooltip="Increased to reduce noise signals")
sourcePrimary = input.source(close, "RSI Source")

// === Bollinger Bands Settings ===
bollingerLength = input.int(50, "Length", minval=1, tooltip="Length for Bollinger calculations on primary QQE trend line (shifted to 0).")
bollingerMultiplier = input.float(0.35, "Multiplier", minval=0.001, maxval=5, step=0.1, tooltip="Multiplier for standard deviation.")

// === AK Trend Settings ===
input1 = input.int(3, "Fast EMA 1", minval=1)
input2 = input.int(8, "Fast EMA 2", minval=1)
ak_scale = input.float(8.0, "AK Scale Factor", minval=0.1, step=0.1)
showAkTrend = input.bool(true, "Show AK Trend Line")

// === QQE ATR length ===
atrLen = input.int(14, "ATR Length for QQE (Wilder)", minval=1)

// === Calculate RSI and QQE ===
calculateQQE(_src, _rsiLen, _sLen, _qqeFactor, _atrLen) =>
    rsi = ta.rsi(_src, _rsiLen)
    smoothedRsi = ta.ema(rsi, _sLen)
    atrRsi = math.abs(smoothedRsi - smoothedRsi[1])
    atrW = ta.ema(atrRsi, _atrLen)
    delta = atrW * _qqeFactor
    
    var float longBand = 0.0
    var float shortBand = 0.0
    var int trendDirection = 0
    
    newShortBand = smoothedRsi + delta
    newLongBand = smoothedRsi - delta
    longBand := smoothedRsi > longBand[1] ? math.max(longBand[1], newLongBand) : newLongBand
    shortBand := smoothedRsi < shortBand[1] ? math.min(shortBand[1], newShortBand) : newShortBand
    
    crossUp = smoothedRsi > shortBand[1] and smoothedRsi[1] <= shortBand[1]
    crossDn = smoothedRsi < longBand[1] and smoothedRsi[1] >= longBand[1]
    
    trendDirection := crossUp ? 1 : crossDn ? -1 : trendDirection[1]
    qqeTrendLine = trendDirection == 1 ? longBand : shortBand
    [qqeTrendLine, smoothedRsi - 50]

// === Main Calculations ===
[primaryQQETrendLine, priBase] = calculateQQE(sourcePrimary, rsiLengthPrimary, rsiSmoothingPrimary, qqeFactorPrimary, atrLen)

// Calculate Bollinger Bands for the Primary QQE Trend Line
bollingerBasis = ta.sma(primaryQQETrendLine, bollingerLength)
bollingerDeviation = bollingerMultiplier * ta.stdev(primaryQQETrendLine, bollingerLength)
bollingerUpper = bollingerBasis + bollingerDeviation
bollingerLower = bollingerBasis - bollingerDeviation

// Calculate AK Trend
fastmaa = ta.ema(close, input1)
fastmab = ta.ema(close, input2)
bspread = (fastmaa - fastmab) * 1.001

// Color Conditions for RSI Histogram
var color rsiColor = na
if priBase > thresholdPrimary
    rsiColor := color.rgb(144, 238, 144, 50)  // Green
else if priBase < -thresholdPrimary
    rsiColor := color.rgb(255, 99, 71, 50)    // Red
else
    rsiColor := color.rgb(112, 112, 112, 50)  // Gray

// Color Conditions for AK Trend
akTrendColor = bspread > 0 ? color.rgb(5, 152, 5) : color.rgb(180, 0, 0)

// === PLOTTING ===
// Plot RSI Histogram
plot(priBase, color=rsiColor, title="RSI Histogram", style=plot.style_columns)

// Plot Signal Highlights
plot(priBase > thresholdPrimary ? priBase : priBase < -thresholdPrimary ? priBase : na, title="QQE Signals", style=plot.style_columns, color=priBase > thresholdPrimary ? color.rgb(144, 238, 144) : color.rgb(255, 99, 71))

// Plot AK Trend Line
plot(showAkTrend ? bspread * ak_scale : na, title="AK Trend Line", color=akTrendColor, linewidth=2)