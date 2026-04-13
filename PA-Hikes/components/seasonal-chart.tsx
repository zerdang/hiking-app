/**
 * SeasonalChart
 *
 * Renders a 12-bar presence chart for a species' seasonal activity.
 * Each bar's height is proportional to the monthly score (0.0–1.0).
 *
 * Props:
 *   months  - array of 12 floats [0.0–1.0] (Jan–Dec)
 *   color   - bar fill color (default: tint blue)
 *   height  - max bar height in px (default: 40)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

type Props = {
  months: number[];
  color?: string;
  maxBarHeight?: number;
};

export function SeasonalChart({ months, color = '#0a7ea4', maxBarHeight = 40 }: Props) {
  if (!months || months.length !== 12) return null;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.chartRow, { height: maxBarHeight }]}>
        {months.map((value, i) => {
          const clampedValue = Math.max(0, Math.min(1, value));
          const barHeight = Math.max(2, Math.round(clampedValue * maxBarHeight));
          return (
            <View key={i} style={styles.barCol}>
              <View style={[styles.barTrack, { height: maxBarHeight }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: clampedValue > 0.05 ? color : '#e0e0e0',
                      opacity: 0.3 + clampedValue * 0.7,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {MONTH_LABELS.map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
  },
});
