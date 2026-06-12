import { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { Stack } from "expo-router";
import { useTheme, type ThemeColors } from "@/lib/theme";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function calcMonthly(principal: number, annualRate: number, years: number) {
  if (!principal || !annualRate || !years) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function ResultCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, damping: 12, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.resultCard, { transform: [{ scale }] }]}>
      <Text style={[styles.resultValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
      {sub && <Text style={styles.resultSub}>{sub}</Text>}
    </Animated.View>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{display}</Text>
      </View>
      {/* Simple tick buttons since RN doesn't have a native slider that works cleanly cross-platform without extra deps */}
      <View style={styles.sliderTrackRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(min, value - step))}
          activeOpacity={0.7}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
          <View style={[styles.thumb, { left: `${pct}%` as any }]} />
        </View>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.min(max, value + step))}
          activeOpacity={0.7}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MortgageCalculatorScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [price, setPrice] = useState(500000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState(30);
  const [tax, setTax] = useState(300); // monthly property tax
  const [insurance, setInsurance] = useState(150); // monthly insurance

  const down = (price * downPct) / 100;
  const principal = price - down;

  const { monthly, totalInterest, totalCost, breakdown } = useMemo(() => {
    const m = calcMonthly(principal, rate, term);
    const total = m * term * 12;
    const interest = total - principal;
    const full = m + tax + insurance;
    return {
      monthly: m,
      totalInterest: interest,
      totalCost: total,
      breakdown: { principal: m, tax, insurance, full },
    };
  }, [principal, rate, term, tax, insurance]);

  const affordabilityColor =
    monthly < 2000
      ? colors.like
      : monthly < 4000
      ? colors.warning
      : colors.pass;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Mortgage Calculator",
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.foreground, fontWeight: "700" },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Results strip */}
        <View style={styles.resultsRow}>
          <ResultCard
            label="Monthly Payment"
            value={fmt(monthly)}
            sub="principal + interest"
            color={affordabilityColor}
          />
          <ResultCard
            label="Full Monthly"
            value={fmt(breakdown.full)}
            sub="with tax & insurance"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total Cost Breakdown</Text>
          {[
            { label: "Loan Amount", val: fmt(principal), pct: null },
            { label: "Down Payment", val: fmt(down), pct: `${downPct}%` },
            { label: "Total Interest", val: fmt(totalInterest), pct: null },
            { label: "Total Cost", val: fmt(totalCost), pct: null },
          ].map((row) => (
            <View key={row.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{row.label}</Text>
              <View style={styles.breakdownRight}>
                {row.pct && (
                  <Text style={styles.breakdownPct}>{row.pct}</Text>
                )}
                <Text style={styles.breakdownVal}>{row.val}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Monthly breakdown pill */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {[
            { label: "Principal & Interest", val: fmt(breakdown.principal), color: colors.primary },
            { label: "Property Tax", val: fmt(tax), color: colors.warning },
            { label: "Insurance", val: fmt(insurance), color: "#8b5cf6" },
          ].map((row) => (
            <View key={row.label} style={styles.breakdownRow}>
              <View style={styles.breakdownDot}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text style={styles.breakdownLabel}>{row.label}</Text>
              </View>
              <Text style={[styles.breakdownVal, { color: row.color }]}>{row.val}</Text>
            </View>
          ))}
        </View>

        {/* Sliders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Adjust Parameters</Text>

          <SliderRow
            label="Home Price"
            value={price}
            onChange={setPrice}
            min={100000}
            max={2000000}
            step={25000}
            display={fmt(price)}
          />
          <SliderRow
            label="Down Payment"
            value={downPct}
            onChange={setDownPct}
            min={3}
            max={50}
            step={1}
            display={`${downPct}% (${fmt(down)})`}
          />
          <SliderRow
            label="Interest Rate"
            value={rate}
            onChange={setRate}
            min={2}
            max={15}
            step={0.25}
            display={`${rate.toFixed(2)}%`}
          />
          <SliderRow
            label="Loan Term"
            value={term}
            onChange={setTerm}
            min={5}
            max={30}
            step={5}
            display={`${term} years`}
          />

          {/* Tax & Insurance manual inputs */}
          <View style={styles.manualRow}>
            <View style={styles.manualField}>
              <Text style={styles.sliderLabel}>Property Tax/mo</Text>
              <TextInput
                style={styles.manualInput}
                keyboardType="numeric"
                value={String(tax)}
                onChangeText={(t) => setTax(Number(t.replace(/\D/g, "")) || 0)}
                placeholderTextColor={colors.muted}
                placeholder="300"
              />
            </View>
            <View style={styles.manualField}>
              <Text style={styles.sliderLabel}>Insurance/mo</Text>
              <TextInput
                style={styles.manualInput}
                keyboardType="numeric"
                value={String(insurance)}
                onChangeText={(t) => setInsurance(Number(t.replace(/\D/g, "")) || 0)}
                placeholderTextColor={colors.muted}
                placeholder="150"
              />
            </View>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          * Estimates only. Actual payments vary based on credit score, lender, taxes, and other factors. Consult a licensed mortgage professional.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.surface },
  scroll: { padding: 16, paddingBottom: 48, gap: 12 },

  resultsRow: { flexDirection: "row", gap: 10 },
  resultCard: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: c.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  resultValue: { fontSize: 22, fontWeight: "800", color: c.foreground, marginBottom: 4 },
  resultLabel: { fontSize: 11, color: c.muted, fontWeight: "600", textAlign: "center" },
  resultSub: { fontSize: 10, color: c.muted, marginTop: 2, textAlign: "center" },

  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: c.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: c.foreground, marginBottom: 4 },

  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: c.foregroundSecondary },
  breakdownRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  breakdownPct: { fontSize: 11, color: c.muted, backgroundColor: c.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  breakdownVal: { fontSize: 13, fontWeight: "700", color: c.foreground },
  breakdownDot: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  sliderRow: { gap: 8, marginBottom: 4 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabel: { fontSize: 12, color: c.foregroundSecondary, fontWeight: "500" },
  sliderValue: { fontSize: 12, color: c.primary, fontWeight: "700" },
  sliderTrackRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 4, backgroundColor: c.cardBorder, borderRadius: 2, position: "relative", overflow: "visible" },
  fill: { height: 4, backgroundColor: c.primary, borderRadius: 2 },
  thumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.primary,
    marginLeft: -8,
    ...Platform.select({
      ios: { shadowColor: c.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: c.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 18, color: c.primary, fontWeight: "700", lineHeight: 20 },

  manualRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  manualField: { flex: 1, gap: 6 },
  manualInput: {
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: c.foreground,
    backgroundColor: c.surface,
  },

  disclaimer: {
    fontSize: 11,
    color: c.muted,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
