import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { NoteExport } from "./note-format";
import { metaLine, fmtClock, speakerRoster } from "./note-format";

// Aurora Glass, translated to print.
const C = {
  ink: "#14161c",
  inkSoft: "#3b4150",
  muted: "#565d6e",
  faint: "#8b93a5",
  hairline: "#e6e8ef",
  wash: "#e8f4fb",
  accent: "#0ea5e9",
  accentDeep: "#0369a1",
  accentLight: "#7dd3fc",
  onInk: "#eef2f8",
  onInkSoft: "#aab2c2",
  paper: "#ffffff",
  teal: "#12a594",
  violet: "#8b5cf6",
  rose: "#e0518a",
  amber: "#d98324",
};

// Spectral speaker palette, print-legible on white.
const SPEAKERS = [C.accentDeep, C.violet, C.teal, C.rose, C.amber];
function speakerColor(name: string, roster: string[]) {
  const i = roster.indexOf(name);
  return SPEAKERS[(i < 0 ? 0 : i) % SPEAKERS.length];
}

const s = StyleSheet.create({
  // Uniform page margins on every page (incl. continuation pages), so content
  // never touches the top/edges.
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.inkSoft,
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },

  // Header letterhead card (contained within the page margins, not full-bleed)
  header: {
    backgroundColor: C.ink,
    borderRadius: 10,
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 22,
    marginBottom: 24,
  },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  brandDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent, marginRight: 7 },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 8.5, letterSpacing: 2.4, color: C.accentLight },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, color: "#ffffff", lineHeight: 1.15 },
  meta: { fontFamily: "Helvetica", fontSize: 9, color: C.onInkSoft, marginTop: 9 },
  accentBar: { height: 3, width: 46, borderRadius: 2, backgroundColor: C.accent, marginTop: 15 },

  body: {},

  // Section label
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: C.accentDeep,
    marginBottom: 9,
  },
  section: { marginBottom: 22 },

  // Summary
  summaryWrap: { borderLeftWidth: 3, borderLeftColor: C.accent, paddingLeft: 14 },
  summaryText: { fontSize: 11, lineHeight: 1.55, color: C.ink },

  // Action items table
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  checkbox: {
    width: 11,
    height: 11,
    borderRadius: 3,
    borderWidth: 1.4,
    borderColor: C.accent,
    marginRight: 10,
    marginTop: 1.5,
  },
  taskText: { fontSize: 10.5, lineHeight: 1.45, color: C.ink },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  chip: {
    fontSize: 8,
    color: C.accentDeep,
    backgroundColor: C.wash,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 5,
  },
  chipMuted: {
    fontSize: 8,
    color: C.muted,
    backgroundColor: "#eef0f5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 5,
  },

  // Bulleted lists
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, marginRight: 9, marginTop: 5 },
  bulletText: { flex: 1, fontSize: 10.5, lineHeight: 1.45, color: C.inkSoft },

  // Two-column band (decisions / follow-ups)
  cols: { flexDirection: "row", gap: 24 },
  col: { flex: 1 },

  // Topics
  topicRow: { flexDirection: "row", flexWrap: "wrap" },
  topic: {
    fontSize: 9,
    color: C.accentDeep,
    backgroundColor: C.wash,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginRight: 6,
    marginBottom: 6,
  },

  // Speaker legend
  legend: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 14, marginBottom: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  legendName: { fontSize: 9, color: C.inkSoft, fontFamily: "Helvetica-Bold" },

  // Transcript
  turn: { flexDirection: "row", marginBottom: 11 },
  turnMeta: { width: 96, paddingRight: 12 },
  turnSpeaker: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  turnTime: { fontFamily: "Courier", fontSize: 8, color: C.faint, marginTop: 2 },
  turnText: { flex: 1, fontSize: 10, lineHeight: 1.5, color: C.inkSoft },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: C.faint },
});

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function NotePdf({ note }: { note: NoteExport }) {
  const roster = speakerRoster(note);
  const genDate = note.createdAt.toLocaleDateString("en-US", { dateStyle: "long" });

  return (
    <Document
      title={note.title}
      author="GlaciaNav Notes"
      creator="GlaciaNav Notes"
      producer="GlaciaNav Notes"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brandRow}>
            <View style={s.brandDot} />
            <Text style={s.brand}>GLACIANAV NOTES</Text>
          </View>
          <Text style={s.title}>{note.title}</Text>
          <Text style={s.meta}>{metaLine(note)}</Text>
          <View style={s.accentBar} />
        </View>

        <View style={s.body}>
          {note.summary ? (
            <Section label="SUMMARY">
              <View style={s.summaryWrap}>
                <Text style={s.summaryText}>{note.summary}</Text>
              </View>
            </Section>
          ) : null}

          {note.actionItems.length ? (
            <Section label="ACTION ITEMS">
              {note.actionItems.map((a, i) => (
                <View style={s.taskRow} key={i}>
                  <View style={s.checkbox} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.taskText}>{a.task}</Text>
                    {a.owner || a.due ? (
                      <View style={s.chipRow}>
                        {a.owner ? <Text style={s.chip}>{a.owner}</Text> : null}
                        {a.due ? <Text style={s.chipMuted}>{a.due}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </Section>
          ) : null}

          {note.decisions.length || note.followUps.length ? (
            <View style={[s.section, s.cols]} wrap={false}>
              {note.decisions.length ? (
                <View style={s.col}>
                  <Text style={s.sectionLabel}>DECISIONS</Text>
                  {note.decisions.map((d, i) => (
                    <View style={s.bulletRow} key={i}>
                      <View style={[s.bulletDot, { backgroundColor: C.accent }]} />
                      <Text style={s.bulletText}>{d}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {note.followUps.length ? (
                <View style={s.col}>
                  <Text style={s.sectionLabel}>FOLLOW-UPS</Text>
                  {note.followUps.map((f, i) => (
                    <View style={s.bulletRow} key={i}>
                      <View style={[s.bulletDot, { backgroundColor: C.violet }]} />
                      <Text style={s.bulletText}>{f}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {note.topics.length ? (
            <Section label="TOPICS">
              <View style={s.topicRow}>
                {note.topics.map((t, i) => (
                  <Text style={s.topic} key={i}>
                    {t}
                  </Text>
                ))}
              </View>
            </Section>
          ) : null}

          <View style={s.section}>
            <Text style={s.sectionLabel}>TRANSCRIPT</Text>
            {roster.length > 1 ? (
              <View style={s.legend}>
                {roster.map((name) => (
                  <View style={s.legendItem} key={name}>
                    <View style={[s.legendDot, { backgroundColor: speakerColor(name, roster) }]} />
                    <Text style={s.legendName}>{name}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {note.utterances.length ? (
              note.utterances.map((u, i) => (
                <View style={s.turn} key={i} wrap={false}>
                  <View style={s.turnMeta}>
                    <Text style={[s.turnSpeaker, { color: speakerColor(u.speaker, roster) }]}>
                      {u.speaker}
                    </Text>
                    <Text style={s.turnTime}>{fmtClock(u.start)}</Text>
                  </View>
                  <Text style={s.turnText}>{u.text}</Text>
                </View>
              ))
            ) : (
              <Text style={s.turnText}>{note.transcriptText}</Text>
            )}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>GlaciaNav Notes / {genDate}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
