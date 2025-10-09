// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © Anthony C. https://x.com/anthonycxc

//@version=6
// -------------------------------------------------------------------------
//  QQE + AK Trend Combined
//  - Optimized for Performance
//  - Removed redundant calculations
//  - Ensured consistent use of primary and secondary QQE settings
//  v1.1.0
// -------------------------------------------------------------------------
indicator("QQE + AK Trend Combined", shorttitle="QQE + AK Trend", overlay=false, max_lines_count=1)

// === Primary QQE Settings ===
group_primary = "Primary QQE Settings"
rsiLengthPrimary = input.int(6, title="RSI Length", group=group_primary)
rsiSmoothingPrimary = input.int(5, title="RSI Smoothing", group=group_primary)
qqeFactorPrimary = input.float(3.0, title="QQE Factor", group=group_primary)
thresholdPrimary = input.float(3.0, title="Threshold", group=group_primary)
sourcePrimary = input.source(close, title="RSI Source", group=group_primary)

// === Secondary QQE Settings ===
group_secondary = "Secondary QQE Settings"
rsiLengthSecondary = input.int(6, title="RSI Length", group=group_secondary)
rsiSmoothingSecondary = input.int(5, title="RSI Smoothing", group=group_secondary)
qqeFactorSecondary = input.float(1.61, title="QQE Factor", group=group_secondary)
thresholdSecondary = input.float(3.0, title="Threshold", group=group_secondary)
sourceSecondary = input.source(close, title="RSI Source", group=group_secondary)

// === Bollinger Bands Settings ===
group_bollinger = "Bollinger Bands Settings"
bollingerLength = input.int(50, minval=1, title="Length", group=group_bollinger, tooltip="The length of the Bollinger Bands calculation.")
bollingerMultiplier = input.float(0.35, step=0.1, minval=0.001, maxval=5, title="Multiplier", group=group_bollinger, tooltip="The multiplier used to calculate Bollinger Band width.")

// === AK Trend Settings ===
group_aktrend = "AK Trend Settings"
input1 = input.int(3, title="Fast EMA 1", group=group_aktrend)
input2 = input.int(8, title="Fast EMA 2", group=group_aktrend)
ak_scale = input.float(8.0, title="AK Scale Factor", group=group_aktrend)
showAkTrend = input.bool(true, title="Show AK Trend Line", group=group_aktrend)

// === Functions ===
// Calculate Shared RSI and Initial EMA
calculateBaseRSI(rsiLength, smoothingFactor, source) =>
    rsi = ta.rsi(source, rsiLength)
    smoothedRsi = ta.ema(rsi, smoothingFactor)
    [rsi, smoothedRsi]

// Calculate QQE Bands
calculateQQE(rsi, smoothedRsi, qqeFactor, wildersLength) =>
    atrRsi = math.abs(smoothedRsi - smoothedRsi[1])
    smoothedAtrRsi = ta.ema(atrRsi, wildersLength)
    dynamicAtrRsi = smoothedAtrRsi * qqeFactor

    // Initialize variables
    var float longBand = 0.0
    var float shortBand = 0.0
    var int trendDirection = 0

    // Calculate longBand, shortBand, and trendDirection
    atrDelta = dynamicAtrRsi
    newShortBand = smoothedRsi + atrDelta
    newLongBand = smoothedRsi - atrDelta
    longBand := smoothedRsi > longBand[1] ? math.max(longBand[1], newLongBand) : newLongBand
    shortBand := smoothedRsi < shortBand[1] ? math.min(shortBand[1], newShortBand) : newShortBand
    longBandCross = ta.cross(longBand[1], smoothedRsi)
    
    if ta.cross(smoothedRsi, shortBand[1])
        trendDirection := 1
    else if longBandCross
        trendDirection := -1
    else
        trendDirection := trendDirection[1]

    // Determine the trend line
    qqeTrendLine = trendDirection == 1 ? longBand : shortBand
    [qqeTrendLine, smoothedRsi]  // Return smoothedRsi as is, avoiding reassignment conflict

// === Main Calculations ===
// Calculate Primary QQE Base
[primaryBaseRSI, primarySmoothedRSI] = calculateBaseRSI(rsiLengthPrimary, rsiSmoothingPrimary, sourcePrimary)
wildersLengthPrimary = rsiLengthPrimary * 2 - 1
[primaryQQETrendLine, _] = calculateQQE(primaryBaseRSI, primarySmoothedRSI, qqeFactorPrimary, wildersLengthPrimary)  // Ignore second return value

// Calculate Secondary QQE Base
[secondaryBaseRSI, secondarySmoothedRSI] = calculateBaseRSI(rsiLengthSecondary, rsiSmoothingSecondary, sourceSecondary)
wildersLengthSecondary = rsiLengthSecondary * 2 - 1
[secondaryQQETrendLine, _] = calculateQQE(secondaryBaseRSI, secondarySmoothedRSI, qqeFactorSecondary, wildersLengthSecondary)  // Ignore second return value

// Calculate Bollinger Bands for the Primary QQE Trend Line
bollingerBasis = ta.sma(primaryQQETrendLine - 50, bollingerLength)
bollingerDeviation = bollingerMultiplier * ta.stdev(primaryQQETrendLine - 50, bollingerLength)
bollingerUpper = bollingerBasis + bollingerDeviation
bollingerLower = bollingerBasis - bollingerDeviation

// Calculate AK Trend
fastmaa = ta.ema(close, input1)
fastmab = ta.ema(close, input2)
bspread = (fastmaa - fastmab) * 1.001

// Color Conditions for Secondary RSI
// Use primaryBaseRSI and secondaryBaseRSI for consistency, adjusting for -50 offset
rsiColorSecondary = secondaryBaseRSI - 50 > thresholdSecondary ? color.rgb(112, 112, 112, 50) : secondaryBaseRSI - 50 < -thresholdSecondary ? color.rgb(112, 112, 112, 50) : na

// Color Conditions for AK Trend
akTrendColor = bspread > 0 ? color.rgb(5, 152, 5) : color.rgb(180, 0, 0)

// === PLOTTING ===
// Plot Secondary QQE Trend Line (hidden by default)
plot(secondaryQQETrendLine - 50, title="Secondary QQE Trend Line", color=color.rgb(255, 255, 255), linewidth=2, display=display.none)

// Plot Secondary RSI Histogram
plot(secondaryBaseRSI - 50, color=rsiColorSecondary, title="Secondary RSI Histogram", style=plot.style_columns)

// Plot Signal Highlights
plot(secondaryBaseRSI - 50 > thresholdSecondary and primaryBaseRSI - 50 > bollingerUpper ? secondaryBaseRSI - 50 : secondaryBaseRSI - 50 < -thresholdSecondary and primaryBaseRSI - 50 < bollingerLower ? secondaryBaseRSI - 50 : na, title="QQE Signals", style=plot.style_columns, color=secondaryBaseRSI - 50 > thresholdSecondary and primaryBaseRSI - 50 > bollingerUpper ? color.rgb(144, 238, 144) : color.rgb(255, 99, 71))

// Plot AK Trend Line
plot(showAkTrend ? bspread * ak_scale : na, title="AK Trend Line", color=akTrendColor, linewidth=2)