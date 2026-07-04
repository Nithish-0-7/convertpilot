import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Analysis } from "../lib/gemini";

/**
 * components/PremiumReportPdf.tsx
 *
 * Renders the SAME data shown in PremiumReport.tsx (plus the top-level
 * score / estimatedMonthlyLeak / leaks that live alongside `premium` on the
 * analysis response) as a downloadable, multi-page branded PDF.
 *
 * Built with @react-pdf/renderer primitives only — no HTML-to-PDF
 * conversion. Field names and ordering mirror PremiumReport.tsx exactly;
 * this file only concerns itself with print layout, not new data.
 */

export interface PremiumReportPdfProps {
  analysis: Analysis;
}

const COLORS = {
  ink: "#0B0F18",
  panel: "#12172A",
  body: "#374151",
  muted: "#6B7280",
  faint: "#9CA3AF",
  accent: "#4F7DF5",
  accentSoft: "#EEF2FF",
  border: "#E5E7EB",
  success: "#1FA97A",
  successSoft: "#EAFBF3",
  danger: "#E24C68",
};

const styles = StyleSheet.create({
  // ---- shared page chrome ----
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.body,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.ink,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 8,
    color: COLORS.faint,
    marginTop: 1,
  },
  headerRight: {
    fontSize: 8,
    color: COLORS.faint,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.faint,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },

  // ---- section chrome ----
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: COLORS.ink,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.faint,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.ink,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLORS.body,
  },
  mutedText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.muted,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 4,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLORS.body,
    flex: 1,
  },

  // ---- cover page ----
  coverPage: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    backgroundColor: COLORS.ink,
    color: "#FFFFFF",
  },
  coverInner: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 56,
    paddingTop: 64,
    paddingBottom: 56,
  },
  coverBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coverBrandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginRight: 8,
  },
  coverBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 1.2,
    marginBottom: 14,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#B7C2D9",
    lineHeight: 1.6,
    maxWidth: 360,
  },
  coverMetaRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 40,
  },
  coverMetaLabel: {
    fontSize: 8,
    color: "#8993AC",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  coverMetaValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  coverFootnote: {
    fontSize: 8,
    color: "#6B7690",
  },

  // ---- overview / score row ----
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
  },
  metricLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.faint,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  metricValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: COLORS.ink,
  },
  metricCaption: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 4,
  },

  severityPill: {
    alignSelf: "flex-start",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: COLORS.danger,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  leakHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  leakImpact: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.ink,
  },

  // ---- CTA variation cards ----
  ctaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ctaCard: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
  },
  ctaPill: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },

  // ---- priority plan ----
  stepRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    color: COLORS.accent,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 1.55,
    marginRight: 10,
  },

  // ---- revenue opportunity ----
  revenueCard: {
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
    borderRadius: 10,
    padding: 18,
  },
  revenueValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: COLORS.success,
    marginBottom: 6,
  },
});

function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header} fixed>
        <View>
          <Text style={styles.brand}>ConvertPilot</Text>
          <Text style={styles.brandSub}>Premium Revenue Audit</Text>
        </View>
        <Text style={styles.headerRight}>Confidential — prepared for you</Text>
      </View>

      {children}

      <View style={styles.footer} fixed>
        <Text>ConvertPilot · convertpilot.ai</Text>
        <Text
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </Page>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const color =
    severity === "High" ? COLORS.danger : severity === "Medium" ? "#B4780D" : COLORS.muted;
  return (
    <Text style={[styles.severityPill, { color, borderColor: color }]}>{severity}</Text>
  );
}

function BulletedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function PremiumReportPdfDocument({ analysis }: PremiumReportPdfProps) {
  const { premium, score, estimatedMonthlyLeak, leaks } = analysis;
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title="ConvertPilot Premium Revenue Audit">
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverInner}>
          <View style={styles.coverBrandRow}>
            <View style={styles.coverBrandDot} />
            <Text style={styles.coverBrand}>ConvertPilot</Text>
          </View>

          <View>
            <Text style={styles.coverTitle}>Premium Revenue{"\n"}Audit Report</Text>
            <Text style={styles.coverSubtitle}>
              A deeper, page-specific breakdown of where this site is leaking revenue — and
              exactly what to fix first.
            </Text>

            <View style={styles.coverMetaRow}>
              <View>
                <Text style={styles.coverMetaLabel}>Revenue Score</Text>
                <Text style={styles.coverMetaValue}>{score} / 100</Text>
              </View>
              <View>
                <Text style={styles.coverMetaLabel}>Est. Monthly Leak</Text>
                <Text style={styles.coverMetaValue}>{estimatedMonthlyLeak}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.coverFootnote}>Generated {generatedOn} · Confidential</Text>
        </View>
      </Page>

      {/* Overview: score, estimated monthly leak, top revenue leaks */}
      <PageChrome>
        <Text style={styles.sectionTitle}>Audit Overview</Text>
        <Text style={styles.sectionSubtitle}>
          The headline numbers from your audit, and the top 3 revenue leaks identified.
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Revenue Score</Text>
            <Text style={styles.metricValue}>{score} / 100</Text>
            <Text style={styles.metricCaption}>Higher is better — 100 is a fully optimized page.</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Estimated Monthly Leak</Text>
            <Text style={styles.metricValue}>{estimatedMonthlyLeak}</Text>
            <Text style={styles.metricCaption}>Combined opportunity across all identified leaks.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { fontSize: 12, marginTop: 4 }]}>Top Revenue Leaks</Text>
        {leaks.map((leak, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.leakHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <SeverityPill severity={leak.severity} />
                <Text style={styles.cardHeading}>{leak.title}</Text>
              </View>
              <Text style={styles.leakImpact}>{leak.impact}</Text>
            </View>
            <Text style={styles.bodyText}>{leak.teaser}</Text>
            <Text style={[styles.mutedText, { marginTop: 6 }]}>{leak.reason}</Text>
          </View>
        ))}
      </PageChrome>

      {/* Hero Rewrite */}
      <PageChrome>
        <Text style={styles.sectionTitle}>Hero Rewrite</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current Headline</Text>
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>
            {premium.heroRewrite.currentHeadline}
          </Text>

          <Text style={styles.cardLabel}>Suggested Headline</Text>
          <Text style={[styles.cardHeading, { marginBottom: 10 }]}>
            {premium.heroRewrite.rewrittenHeadline}
          </Text>

          <Text style={styles.cardLabel}>Suggested Subheadline</Text>
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>
            {premium.heroRewrite.rewrittenSubheadline}
          </Text>

          <Text style={styles.cardLabel}>Explanation</Text>
          <Text style={styles.mutedText}>{premium.heroRewrite.rationale}</Text>
        </View>

        {/* Trust Improvements */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Trust Improvements</Text>
        <View style={styles.card}>
          <BulletedList items={premium.trustImprovements} />
        </View>

        {/* Conversion Improvements */}
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Conversion Improvements</Text>
        <View style={styles.card}>
          <BulletedList items={premium.conversionImprovements} />
        </View>
      </PageChrome>

      {/* Mobile UX Review, Accessibility Issues, SEO Basics */}
      <PageChrome>
        <Text style={styles.sectionTitle}>Mobile UX Review</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{premium.mobileUXReview}</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Accessibility Issues</Text>
        <View style={styles.card}>
          <BulletedList items={premium.accessibilityIssues} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>SEO Basics</Text>
        {premium.seoBasics.map((item, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardHeading}>{item.issue}</Text>
            <Text style={styles.mutedText}>{item.fix}</Text>
          </View>
        ))}
      </PageChrome>

      {/* CTA Variations */}
      <PageChrome>
        <Text style={styles.sectionTitle}>CTA Variations</Text>
        <View style={styles.ctaGrid}>
          {premium.ctaVariations.map((cta, i) => (
            <View key={i} style={styles.ctaCard}>
              <Text style={styles.ctaPill}>{cta.text}</Text>
              <Text style={styles.mutedText}>{cta.rationale}</Text>
            </View>
          ))}
        </View>

        {/* Priority Action Plan */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Priority Action Plan</Text>
        {premium.priorityActionPlan
          .slice()
          .sort((a, b) => a.step - b.step)
          .map((item) => (
            <View key={item.step} style={styles.stepRow}>
              <Text style={styles.stepBadge}>{item.step}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeading}>{item.action}</Text>
                <Text style={styles.mutedText}>{item.expectedImpact}</Text>
              </View>
            </View>
          ))}
      </PageChrome>

      {/* Revenue Opportunity */}
      <PageChrome>
        <Text style={styles.sectionTitle}>Revenue Opportunity</Text>
        <View style={styles.revenueCard}>
          <Text style={styles.revenueValue}>{premium.revenueOpportunity.estimateRange}</Text>
          <Text style={styles.bodyText}>{premium.revenueOpportunity.rationale}</Text>
        </View>
      </PageChrome>
    </Document>
  );
}

export default PremiumReportPdfDocument;
