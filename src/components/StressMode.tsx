import { useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { clearLiveIncidentState, readLiveIncidentState, writeLiveIncidentState } from "@/lib/liveIncident";

type TimelineEvent = {
  time: string;
  text: string;
};

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const getElapsedLabel = (startedAt: Date) => {
  const minutes = Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / 60000));
  return `Session started ${minutes} min ago`;
};

export default function StressMode() {
  const [sessionStartedAt] = useState(() => new Date());
  const [recording, setRecording] = useState(() => readLiveIncidentState()?.active ?? false);
  const [activeSheet, setActiveSheet] = useState<"witness" | "note" | null>(null);
  const [witnessInput, setWitnessInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([
    { time: formatTime(), text: "Stress mode activated" },
  ]);

  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const addEvent = (text: string) => {
    setEvents((prev) => [{ time: formatTime(), text }, ...prev].slice(0, 20));
  };

  const onToggleRecording = () => {
    setRecording((prev) => {
      const next = !prev;
      addEvent(next ? "Voice recording started" : "Voice recording stopped");
      toast.success(next ? "Voice capture started" : "Voice capture stopped");
      if (next) {
        writeLiveIncidentState({ active: true, startedAt: sessionStartedAt.toISOString() });
      } else {
        clearLiveIncidentState();
      }
      return next;
    });
  };

  const onScreenshotSelected = (incoming: FileList | null) => {
    const count = incoming?.length ?? 0;
    if (!count) return;
    addEvent(count === 1 ? "Screenshot uploaded" : `${count} screenshots uploaded`);
    toast.success(count === 1 ? "Screenshot added" : `${count} screenshots added`);
  };

  const onPhotoSelected = (incoming: FileList | null) => {
    const count = incoming?.length ?? 0;
    if (!count) return;
    addEvent(count === 1 ? "Photo captured" : `${count} photos captured`);
    toast.success(count === 1 ? "Photo added" : `${count} photos added`);
  };

  const onAddWitness = () => setActiveSheet("witness");

  const onQuickNote = () => setActiveSheet("note");

  const closeSheet = () => {
    setActiveSheet(null);
    setWitnessInput("");
    setNoteInput("");
  };

  const submitWitness = () => {
    const value = witnessInput.trim();
    if (!value) {
      toast.error("Please enter witness details");
      return;
    }
    addEvent(`Witness added: ${value}`);
    toast.success("Witness added to timeline");
    closeSheet();
  };

  const submitNote = () => {
    const value = noteInput.trim();
    if (!value) {
      toast.error("Please enter a quick note");
      return;
    }
    addEvent(`Quick note: ${value}`);
    toast.success("Quick note saved");
    closeSheet();
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.liveRow}>
          <div style={styles.redDot} />
          <span style={styles.liveText}>STRESS MODE ACTIVE</span>
        </div>

        <div style={styles.topBarActions}>
          <p style={styles.elapsed}>{getElapsedLabel(sessionStartedAt)}</p>
          <Link to="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={styles.center}>
        <h1 style={styles.title}>Capture what is happening right now.</h1>

        <p style={styles.subtitle}>
          Proof will timestamp and organize everything automatically.
        </p>

        <button
          style={{
            ...styles.recordButton,
            ...(recording ? styles.recording : {}),
          }}
          onClick={onToggleRecording}
          aria-pressed={recording}
        >
          {recording ? "STOP RECORDING" : "START VOICE CAPTURE"}
        </button>

        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*"
          multiple
          style={styles.hiddenInput}
          onChange={(e) => {
            onScreenshotSelected(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={styles.hiddenInput}
          onChange={(e) => {
            onPhotoSelected(e.target.files);
            e.currentTarget.value = "";
          }}
        />

        <div style={styles.quickActions}>
          <button style={styles.actionButton} onClick={() => screenshotInputRef.current?.click()}>
            Upload Screenshot
          </button>

          <button style={styles.actionButton} onClick={() => photoInputRef.current?.click()}>
            Take Photo
          </button>

          <button style={styles.actionButton} onClick={onAddWitness}>Add Witness</button>

          <button style={styles.actionButton} onClick={onQuickNote}>Quick Note</button>
        </div>
      </div>

      <div style={styles.timelineCard}>
        <h2 style={styles.timelineTitle}>Live Timeline</h2>

        {events.map((event, idx) => (
          <div
            key={`${event.time}-${event.text}-${idx}`}
            style={idx === events.length - 1 ? { ...styles.timelineEvent, borderBottom: "none" } : styles.timelineEvent}
          >
            <span style={styles.time}>{event.time}</span>
            <span>{event.text}</span>
          </div>
        ))}
      </div>

      <Drawer
        open={activeSheet !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <DrawerContent className="bg-card border-border text-foreground">
          <DrawerHeader>
            <DrawerTitle>{activeSheet === "witness" ? "Add Witness" : "Quick Note"}</DrawerTitle>
            <DrawerDescription>
              {activeSheet === "witness"
                ? "Add witness details now and keep your timeline complete."
                : "Capture a short note while details are fresh."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            {activeSheet === "witness" ? (
              <Input
                autoFocus
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                placeholder="Witness name and details"
                className="bg-background border-border"
              />
            ) : (
              <Textarea
                autoFocus
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="What happened?"
                rows={4}
                className="bg-background border-border"
              />
            )}
          </div>

          <DrawerFooter className="sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeSheet} className="border-border">
              Cancel
            </Button>
            <Button onClick={activeSheet === "witness" ? submitWitness : submitNote}>
              Save
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#050B16",
    color: "white",
    fontFamily: "Inter, sans-serif",
    padding: "24px",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
    gap: "12px",
    flexWrap: "wrap",
  },

  liveRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  redDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#E74C3C",
    boxShadow: "0 0 10px #E74C3C",
  },

  liveText: {
    fontWeight: "700",
    letterSpacing: "0.08em",
    color: "#E74C3C",
  },

  elapsed: {
    color: "#8B96A8",
    margin: 0,
  },

  topBarActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  backButton: {
    color: "white",
    textDecoration: "none",
    background: "#131C2E",
    border: "1px solid #243045",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: 1,
  },

  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginTop: "60px",
  },

  title: {
    fontSize: "clamp(2rem, 6vw, 42px)",
    maxWidth: "700px",
    lineHeight: "1.2",
    marginBottom: "16px",
  },

  subtitle: {
    color: "#AAB4C8",
    maxWidth: "550px",
    lineHeight: "1.6",
    marginBottom: "40px",
    fontSize: "18px",
  },

  recordButton: {
    background: "#4F8CFF",
    border: "none",
    color: "white",
    padding: "24px 42px",
    borderRadius: "18px",
    fontSize: "20px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "0.3s",
    marginBottom: "40px",
  },

  recording: {
    background: "#E74C3C",
    transform: "scale(1.03)",
  },

  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    width: "100%",
    maxWidth: "600px",
  },

  actionButton: {
    background: "#131C2E",
    border: "1px solid #243045",
    color: "white",
    padding: "20px",
    borderRadius: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "16px",
  },

  hiddenInput: {
    display: "none",
  },

  timelineCard: {
    marginTop: "60px",
    background: "#101826",
    border: "1px solid #243045",
    borderRadius: "18px",
    padding: "24px",
    maxWidth: "900px",
    marginLeft: "auto",
    marginRight: "auto",
  },

  timelineTitle: {
    marginBottom: "24px",
    fontSize: "22px",
  },

  timelineEvent: {
    display: "flex",
    gap: "24px",
    padding: "14px 0",
    borderBottom: "1px solid #1C2637",
    flexWrap: "wrap",
  },

  time: {
    color: "#4F8CFF",
    minWidth: "80px",
    fontWeight: "700",
  },
};
