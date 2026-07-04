"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  ArrowRight,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  DotsThreeVertical,
  FileAudio,
  FolderSimple,
  Globe,
  ListChecks,
  MagnifyingGlass,
  Microphone,
  PencilSimple,
  Plus,
  Pulse,
  Trash,
  UploadSimple,
  WaveSawtooth,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ProjectPicker } from "@/components/projects/project-picker";
import { PROJECT_COLORS, projectColor, type ProjectColor } from "@/lib/projects";

export type WorkbenchAction = {
  task: string;
  owner?: string | null;
  due?: string | null;
};

export type WorkbenchRecording = {
  id: string;
  title: string;
  status: string;
  source: "record" | "upload";
  dateLabel: string;
  createdAtLabel: string;
  durationLabel: string;
  sizeLabel: string;
  isPublic: boolean;
  language: string | null;
  summary: string | null;
  topics: string[];
  actionItems: WorkbenchAction[];
  decisions: string[];
  followUps: string[];
  error: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
};

export type WorkbenchProject = {
  id: string;
  name: string;
  color: string;
  count: number;
  readyCount: number;
  activeCount: number;
  actionCount: number;
  lastActivityLabel: string;
};

export type WorkbenchStats = {
  total: number;
  ready: number;
  active: number;
  failed: number;
  publicCount: number;
  unfiled: number;
  actionCount: number;
  totalDurationLabel: string;
};

type ViewKey = "all" | "review" | "queue" | "shared" | "unfiled" | "actions";

const STATUS: Record<string, { label: string; tone: string; rail: string; help: string }> = {
  uploaded: {
    label: "Queued",
    tone: "text-faint",
    rail: "bg-faint",
    help: "Waiting for the worker",
  },
  transcribing: {
    label: "Transcribing",
    tone: "text-accent-deep",
    rail: "bg-accent",
    help: "Audio is being transcribed",
  },
  processing: {
    label: "Writing notes",
    tone: "text-accent-deep",
    rail: "bg-accent",
    help: "Summary and Q&A are being prepared",
  },
  done: {
    label: "Ready",
    tone: "text-ok",
    rail: "bg-ok",
    help: "Open for review",
  },
  failed: {
    label: "Failed",
    tone: "text-err",
    rail: "bg-err",
    help: "Retry from the row menu",
  },
};

function isActive(status: string) {
  return status === "uploaded" || status === "transcribing" || status === "processing";
}

function statusMeta(status: string) {
  return STATUS[status] ?? STATUS.uploaded;
}

function cleanText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

export function WorkbenchV2({
  userName,
  recordings: initialRecordings,
  projects,
  stats,
  initialHasMore,
}: {
  userName: string;
  recordings: WorkbenchRecording[];
  projects: WorkbenchProject[];
  stats: WorkbenchStats;
  initialHasMore: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewKey>("all");
  const [commandOpen, setCommandOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectColorKey, setProjectColorKey] = useState<ProjectColor>("sky");
  const [projectBusy, setProjectBusy] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Pagination: the server sends the first page; "Load more" appends the rest.
  const [extra, setExtra] = useState<WorkbenchRecording[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const recordings = useMemo(() => {
    const seen = new Set<string>();
    return [...initialRecordings, ...extra].filter((r) =>
      seen.has(r.id) ? false : (seen.add(r.id), true)
    );
  }, [initialRecordings, extra]);

  useEffect(() => {
    setExtra([]);
    setHasMore(initialHasMore);
  }, [initialRecordings, initialHasMore]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/recordings?offset=${recordings.length}&limit=50`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setExtra((prev) => [...prev, ...(data.items ?? [])]);
        setHasMore(!!data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const actionItems = useMemo(
    () =>
      recordings.flatMap((rec) =>
        rec.actionItems.map((item, index) => ({
          ...item,
          key: `${rec.id}-${index}`,
          recordingId: rec.id,
          recordingTitle: rec.title,
          projectName: rec.projectName,
          dateLabel: rec.dateLabel,
        }))
      ),
    [recordings]
  );

  const views = useMemo(
    () => [
      { key: "all" as const, label: "Library", count: recordings.length },
      {
        key: "review" as const,
        label: "Review",
        count: recordings.filter((r) => r.status === "done").length,
      },
      {
        key: "queue" as const,
        label: "Queue",
        count: recordings.filter((r) => isActive(r.status) || r.status === "failed").length,
      },
      {
        key: "shared" as const,
        label: "Shared",
        count: recordings.filter((r) => r.isPublic).length,
      },
      {
        key: "unfiled" as const,
        label: "Unfiled",
        count: recordings.filter((r) => !r.projectId).length,
      },
      { key: "actions" as const, label: "Actions", count: actionItems.length },
    ],
    [actionItems.length, recordings]
  );

  const filteredRecordings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recordings.filter((rec) => {
      const viewMatch =
        view === "all" ||
        (view === "review" && rec.status === "done") ||
        (view === "queue" && (isActive(rec.status) || rec.status === "failed")) ||
        (view === "shared" && rec.isPublic) ||
        (view === "unfiled" && !rec.projectId) ||
        view === "actions";

      if (!viewMatch) return false;
      if (!needle) return true;
      return (
        cleanText(rec.title).includes(needle) ||
        cleanText(rec.summary).includes(needle) ||
        cleanText(rec.projectName).includes(needle) ||
        rec.topics.some((topic) => topic.toLowerCase().includes(needle)) ||
        rec.actionItems.some((item) => cleanText(item.task).includes(needle))
      );
    });
  }, [query, recordings, view]);

  const filteredActions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return actionItems.filter((item) => {
      if (!needle) return true;
      return (
        cleanText(item.task).includes(needle) ||
        cleanText(item.owner).includes(needle) ||
        cleanText(item.due).includes(needle) ||
        cleanText(item.recordingTitle).includes(needle) ||
        cleanText(item.projectName).includes(needle)
      );
    });
  }, [actionItems, query]);

  const triage = useMemo(() => {
    const failed = recordings.filter((r) => r.status === "failed");
    const active = recordings.filter((r) => isActive(r.status));
    const unfiled = recordings.filter((r) => !r.projectId);
    return { failed, active, unfiled };
  }, [recordings]);

  const commandResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matchesRecording = recordings
      .filter((rec) => {
        if (!needle) return rec.status === "done" || rec.status === "failed";
        return (
          cleanText(rec.title).includes(needle) ||
          cleanText(rec.summary).includes(needle) ||
          rec.topics.some((topic) => topic.toLowerCase().includes(needle))
        );
      })
      .slice(0, 6);
    const matchesProjects = projects
      .filter((project) => !needle || project.name.toLowerCase().includes(needle))
      .slice(0, 5);
    const matchesActions = filteredActions.slice(0, 5);
    return { matchesRecording, matchesProjects, matchesActions };
  }, [filteredActions, projects, query, recordings]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (commandOpen) commandInputRef.current?.focus();
  }, [commandOpen]);

  async function createProject() {
    const name = projectName.trim();
    if (!name) return;
    setProjectBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: projectColorKey }),
      });
      if (res.ok) {
        setProjectName("");
        setProjectColorKey("sky");
        setCreatingProject(false);
        router.refresh();
      }
    } finally {
      setProjectBusy(false);
    }
  }

  return (
    <>
      <main className="mx-auto flex max-w-[1540px] flex-col gap-5 px-3 pb-28 pt-3 sm:px-5 md:px-7 md:pb-12 md:pt-5">
        <section className="workbench-hero overflow-hidden rounded-[18px] border border-hairline">
          <div className="grid gap-px bg-hairline lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
            <div className="bg-panel-solid p-5 sm:p-6 lg:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Workbench</p>
                  <h1 className="mt-2.5 max-w-3xl font-display text-[33px] font-normal leading-[1.0] tracking-[-0.01em] text-ink sm:text-[46px] lg:text-[56px]">
                    Review the room, route the work.
                  </h1>
                  <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted">
                    Welcome back, {userName}. Your captures now open into action, review, and project lanes.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/record?mode=upload"
                    className="glass inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-btn px-4 text-[13px] font-medium text-ink transition-[transform,background-color,box-shadow,color,opacity] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
                  >
                    <UploadSimple size={15} weight="bold" />
                    Upload
                  </Link>
                  <Link
                    href="/record?mode=record"
                    className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-btn bg-accent px-4 text-[13px] font-medium text-accent-ink shadow-[0_10px_24px_-14px_rgba(214,70,31,0.7)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:shadow-[0_14px_30px_-14px_rgba(214,70,31,0.85)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
                  >
                    <Microphone size={15} weight="fill" />
                    Record
                  </Link>
                </div>
              </div>

              <div className="mt-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <WorkbenchMetric label="Ready notes" value={String(stats.ready)} detail={`${stats.total} total`} />
                <WorkbenchMetric label="Open actions" value={String(stats.actionCount)} detail="From processed notes" />
                <WorkbenchMetric label="Queue health" value={`${stats.active}/${stats.failed}`} detail="Active / failed" tone={stats.failed > 0 ? "warn" : "ok"} />
                <WorkbenchMetric label="Recorded time" value={stats.totalDurationLabel} detail={`${stats.publicCount} shared`} />
              </div>
            </div>

            <aside className="bg-bg p-5 sm:p-6 lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">Command search</p>
                  <p className="mt-1 text-[12.5px] text-muted">Find notes, projects, and action items.</p>
                </div>
                <button
                  onClick={() => setCommandOpen(true)}
                  className="rounded-btn border border-hairline bg-panel px-2.5 py-1.5 font-mono text-[11px] text-faint transition-[border-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:text-ink active:scale-[0.98] cursor-pointer"
                >
                  Ctrl K
                </button>
              </div>
              <button
                onClick={() => setCommandOpen(true)}
                className="mt-4 flex h-12 w-full items-center gap-3 rounded-[12px] border border-hairline bg-panel-solid px-4 text-left text-[14px] text-muted transition-[border-color,background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:bg-panel-lift active:scale-[0.99] cursor-pointer"
              >
                <MagnifyingGlass size={17} className="text-faint" />
                Jump to anything...
              </button>

              <div className="mt-5 grid gap-2">
                <TriageLink
                  label="Needs attention"
                  value={String(triage.failed.length)}
                  href="#queue"
                  active={triage.failed.length > 0}
                />
                <TriageLink
                  label="Currently processing"
                  value={String(triage.active.length)}
                  href="#queue"
                  active={triage.active.length > 0}
                />
                <TriageLink
                  label="Unfiled captures"
                  value={String(triage.unfiled.length)}
                  onClick={() => setView("unfiled")}
                  active={triage.unfiled.length > 0}
                />
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 rounded-[18px] border border-hairline bg-panel-solid">
            <div className="border-b border-hairline p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[15rem] flex-1">
                  <MagnifyingGlass
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search library, topics, action items"
                    className="h-10 w-full rounded-[12px] border border-hairline bg-bg pl-9 pr-3 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
                  />
                </div>
                <div className="flex max-w-full gap-1 overflow-x-auto rounded-[12px] border border-hairline bg-bg p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {views.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setView(item.key)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-medium transition-[background-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] cursor-pointer ${
                        view === item.key ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                      }`}
                    >
                      {item.label}
                      <span className="tabular font-mono text-[10.5px] text-faint">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {view === "actions" ? (
              <ActionDesk items={filteredActions} />
            ) : (
              <RecordingLibrary items={filteredRecordings} query={query} />
            )}
            {hasMore && (
              <div className="border-t border-hairline p-3 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex h-9 items-center gap-2 rounded-btn border border-hairline bg-bg px-4 text-[13px] font-medium text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:text-ink disabled:opacity-60 cursor-pointer"
                >
                  {loadingMore ? "Loading…" : "Load more captures"}
                </button>
              </div>
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-5">
            <section id="queue" className="rounded-[18px] border border-hairline bg-panel-solid p-4">
              <PanelTitle icon={<Pulse size={17} weight="duotone" />} title="Processing queue" />
              <div className="mt-4 flex flex-col gap-2">
                {[...triage.failed, ...triage.active].slice(0, 5).map((rec) => (
                  <QueueItem key={rec.id} rec={rec} />
                ))}
                {triage.failed.length + triage.active.length === 0 && (
                  <EmptyInline title="Queue is clear" body="New recordings will appear here while they transcribe and summarize." />
                )}
              </div>
            </section>

            <section className="rounded-[18px] border border-hairline bg-panel-solid p-4">
              <div className="flex items-center justify-between gap-3">
                <PanelTitle icon={<FolderSimple size={17} weight="duotone" />} title="Project lanes" />
                {!creatingProject && (
                  <button
                    onClick={() => setCreatingProject(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-btn px-2.5 text-[12px] font-medium text-muted transition-[background-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift hover:text-ink active:scale-[0.98] cursor-pointer"
                  >
                    <Plus size={13} weight="bold" />
                    New
                  </button>
                )}
              </div>

              {creatingProject && (
                <div className="mt-4 rounded-[14px] border border-hairline bg-bg p-3">
                  <input
                    autoFocus
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") createProject();
                      if (event.key === "Escape") setCreatingProject(false);
                    }}
                    placeholder="Project name"
                    className="h-10 w-full rounded-input border border-hairline bg-panel px-3 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(Object.keys(PROJECT_COLORS) as ProjectColor[]).map((color) => (
                      <button
                        key={color}
                        onClick={() => setProjectColorKey(color)}
                        aria-label={color}
                        className={`grid h-6 w-6 place-items-center rounded-full transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer ${
                          projectColorKey === color
                            ? "ring-2 ring-accent ring-offset-2 ring-offset-bg"
                            : ""
                        }`}
                        style={{ background: PROJECT_COLORS[color] }}
                      >
                        {projectColorKey === color && <Check size={12} weight="bold" className="text-bg" />}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" onClick={createProject} disabled={projectBusy || !projectName.trim()}>
                      {projectBusy ? "Creating..." : "Create"}
                    </Button>
                    <button
                      onClick={() => setCreatingProject(false)}
                      className="grid h-9 w-9 place-items-center rounded-btn text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink cursor-pointer"
                      aria-label="Cancel project"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {projects.slice(0, 7).map((project) => (
                  <Link
                    key={project.id}
                    href={`/project/${project.id}`}
                    className="group rounded-[14px] border border-hairline bg-bg p-3 transition-[border-color,background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:bg-panel active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-bg"
                        style={{ background: projectColor(project.color) }}
                      >
                        <FolderSimple size={17} weight="fill" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{project.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-faint">
                          {project.count} captures, {project.actionCount} actions, {project.lastActivityLabel}
                        </p>
                      </div>
                      <ArrowRight
                        size={15}
                        className="text-faint transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-ink"
                      />
                    </div>
                  </Link>
                ))}
                {projects.length === 0 && !creatingProject && (
                  <EmptyInline title="No project lanes yet" body="Create a lane, then route related captures into it from the library." />
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {commandOpen && (
        <div className="fixed inset-0 z-50 grid place-items-start bg-bg/72 px-3 py-16 backdrop-blur-md sm:px-6">
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[18px] border border-hairline-strong bg-panel-solid shadow-[0_30px_90px_-28px_rgba(0,0,0,0.85)]">
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <MagnifyingGlass size={18} className="text-faint" />
              <input
                ref={commandInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search everything"
                className="h-10 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
              />
              <button
                onClick={() => setCommandOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-input text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink cursor-pointer"
                aria-label="Close command search"
              >
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[64vh] overflow-y-auto p-2">
              <CommandGroup title="Create">
                <CommandLink href="/record?mode=record" onChoose={() => setCommandOpen(false)} icon={<Microphone size={16} weight="fill" />} label="Record a new capture" />
                <CommandLink href="/record?mode=upload" onChoose={() => setCommandOpen(false)} icon={<UploadSimple size={16} weight="bold" />} label="Upload audio" />
              </CommandGroup>
              <CommandGroup title="Recordings">
                {commandResults.matchesRecording.map((rec) => (
                  <CommandLink
                    key={rec.id}
                    href={`/note/${rec.id}`}
                    onChoose={() => setCommandOpen(false)}
                    icon={<FileAudio size={16} weight="duotone" />}
                    label={rec.title}
                    detail={`${statusMeta(rec.status).label} - ${rec.dateLabel}`}
                  />
                ))}
              </CommandGroup>
              <CommandGroup title="Projects">
                {commandResults.matchesProjects.map((project) => (
                  <CommandLink
                    key={project.id}
                    href={`/project/${project.id}`}
                    onChoose={() => setCommandOpen(false)}
                    icon={<FolderSimple size={16} weight="fill" />}
                    label={project.name}
                    detail={`${project.count} captures`}
                  />
                ))}
              </CommandGroup>
              <CommandGroup title="Action items">
                {commandResults.matchesActions.map((item) => (
                  <CommandLink
                    key={item.key}
                    href={`/note/${item.recordingId}`}
                    onChoose={() => setCommandOpen(false)}
                    icon={<ListChecks size={16} weight="duotone" />}
                    label={item.task}
                    detail={item.recordingTitle}
                  />
                ))}
              </CommandGroup>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WorkbenchMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-hairline bg-bg px-4 py-3">
      <p className="font-mono text-[10.5px] text-faint">{label}</p>
      <p
        className={`tabular mt-1 text-[24px] font-semibold tracking-[-0.02em] ${
          tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-muted">{detail}</p>
    </div>
  );
}

function TriageLink({
  label,
  value,
  href,
  onClick,
  active,
}: {
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const className =
    "flex items-center justify-between rounded-[12px] border border-hairline bg-panel-solid px-3 py-2.5 text-[13px] transition-[border-color,background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:bg-panel-lift active:scale-[0.99] cursor-pointer";
  const body = (
    <>
      <span className={active ? "text-ink" : "text-muted"}>{label}</span>
      <span className={`tabular font-mono text-[12px] ${active ? "text-accent-deep" : "text-faint"}`}>{value}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function RecordingLibrary({ items, query }: { items: WorkbenchRecording[]; query: string }) {
  if (items.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center px-6 py-14 text-center">
        <div className="max-w-sm">
          <WaveSawtooth size={28} className="mx-auto text-faint" />
          <p className="mt-4 text-[14px] font-semibold text-ink">
            {query.trim() ? "No matching captures" : "No captures in this view"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {query.trim()
              ? "Try a project name, topic, speaker, or action item."
              : "Record or upload audio, then this desk becomes your review queue."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline">
      {items.map((rec) => (
        <WorkbenchRow key={rec.id} rec={rec} />
      ))}
    </div>
  );
}

function WorkbenchRow({ rec }: { rec: WorkbenchRecording }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rec.title);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = statusMeta(rec.status);

  async function mutate(fn: () => Promise<Response>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function saveRename() {
    const next = title.trim();
    setEditing(false);
    if (next && next !== rec.title) {
      void mutate(() =>
        fetch(`/api/recordings/${rec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: next }),
        })
      );
    } else {
      setTitle(rec.title);
    }
  }

  return (
    <article className="group relative grid gap-3 px-3 py-3 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel sm:grid-cols-[8px_minmax(0,1fr)_auto] sm:px-4">
      <span className={`hidden rounded-full sm:block ${meta.rail}`} aria-hidden />
      {!editing && <Link href={`/note/${rec.id}`} className="absolute inset-0 z-0" aria-label={`Open ${rec.title}`} />}

      <div className="relative z-10 min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {editing ? (
            <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-1.5">
              <input
                ref={inputRef}
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveRename();
                  if (event.key === "Escape") {
                    setTitle(rec.title);
                    setEditing(false);
                  }
                }}
                className="h-9 min-w-0 flex-1 rounded-input border border-accent bg-bg px-3 text-[14px] text-ink focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
              />
              <button onClick={saveRename} className="grid h-9 w-9 place-items-center rounded-input text-ok hover:bg-panel-lift cursor-pointer" aria-label="Save name">
                <Check size={15} weight="bold" />
              </button>
              <button
                onClick={() => {
                  setTitle(rec.title);
                  setEditing(false);
                }}
                className="grid h-9 w-9 place-items-center rounded-input text-muted hover:bg-panel-lift cursor-pointer"
                aria-label="Cancel rename"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <>
              <h2 className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{rec.title}</h2>
              <span className={`inline-flex items-center rounded-[7px] bg-bg px-2 py-0.5 font-mono text-[10.5px] ${meta.tone}`}>
                {meta.label}
              </span>
              {rec.isPublic && (
                <span className="inline-flex items-center gap-1 rounded-[7px] bg-accent-wash px-2 py-0.5 text-[11px] font-medium text-accent-deep">
                  <Globe size={10} weight="bold" />
                  Shared
                </span>
              )}
            </>
          )}
        </div>
        {!editing && (
          <>
            <p className="mt-1 line-clamp-2 max-w-4xl text-[13px] leading-relaxed text-muted">
              {rec.summary || rec.error || meta.help}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
              <span title={rec.createdAtLabel}>{rec.dateLabel}</span>
              <span>{rec.durationLabel}</span>
              <span>{rec.source === "record" ? "recorded" : "uploaded"}</span>
              {rec.language && <span>{rec.language}</span>}
              {rec.sizeLabel !== "0 MB" && <span>{rec.sizeLabel}</span>}
              {rec.projectId && rec.projectName ? (
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: projectColor(rec.projectColor) }} />
                  {rec.projectName}
                </span>
              ) : (
                <span className="text-warn">unfiled</span>
              )}
            </div>
            {(rec.actionItems.length > 0 || rec.decisions.length > 0 || rec.followUps.length > 0 || rec.topics.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rec.actionItems.length > 0 && <MiniChip icon={<ListChecks size={11} />} label={`${rec.actionItems.length} actions`} />}
                {rec.decisions.length > 0 && <MiniChip icon={<CheckCircle size={11} />} label={`${rec.decisions.length} decisions`} />}
                {rec.followUps.length > 0 && <MiniChip icon={<ClockCounterClockwise size={11} />} label={`${rec.followUps.length} follow-ups`} />}
                {rec.topics.slice(0, 3).map((topic) => (
                  <MiniChip key={topic} label={topic} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="pointer-events-auto relative z-10 flex items-center gap-1 sm:self-center">
          <ProjectPicker recordingId={rec.id} currentProjectId={rec.projectId} variant="icon" />
          <div className="relative">
            <button
              onClick={() => setMenu((open) => !open)}
              disabled={busy}
              className="grid h-9 w-9 place-items-center rounded-input text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink disabled:opacity-50 cursor-pointer"
              aria-label="Recording actions"
            >
              <DotsThreeVertical size={18} weight="bold" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-card p-1">
                  <RowMenuItem icon={<PencilSimple size={15} />} label="Rename" onClick={() => { setMenu(false); setEditing(true); }} />
                  {rec.status === "failed" && (
                    <RowMenuItem
                      icon={<ArrowClockwise size={15} />}
                      label="Retry"
                      onClick={() => {
                        setMenu(false);
                        void mutate(() => fetch(`/api/recordings/${rec.id}/retry`, { method: "POST" }));
                      }}
                    />
                  )}
                  <RowMenuItem
                    icon={<Trash size={15} />}
                    label="Delete"
                    danger
                    onClick={() => {
                      setMenu(false);
                      if (confirm(`Delete "${rec.title}"? This can't be undone.`)) {
                        void mutate(() => fetch(`/api/recordings/${rec.id}`, { method: "DELETE" }));
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function MiniChip({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[7px] border border-hairline bg-bg px-2 py-0.5 text-[11.5px] text-ink-soft">
      {icon}
      {label}
    </span>
  );
}

function RowMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer ${
        danger ? "text-err" : "text-ink-soft"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionDesk({
  items,
}: {
  items: Array<WorkbenchAction & { key: string; recordingId: string; recordingTitle: string; projectName: string | null; dateLabel: string }>;
}) {
  if (items.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center px-6 py-14 text-center">
        <div className="max-w-sm">
          <ListChecks size={28} className="mx-auto text-faint" />
          <p className="mt-4 text-[14px] font-semibold text-ink">No action items found</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Processed recordings with extracted tasks will appear here as a cross-meeting worklist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-hairline">
      {items.map((item) => (
        <Link
          key={item.key}
          href={`/note/${item.recordingId}`}
          className="group grid gap-2 px-4 py-3 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel cursor-pointer sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <p className="text-[14px] font-medium leading-relaxed text-ink">{item.task}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
              <span>{item.recordingTitle}</span>
              {item.projectName && <span>{item.projectName}</span>}
              <span>{item.dateLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {item.owner && <MiniChip label={item.owner} />}
            {item.due && <MiniChip label={item.due} />}
            <ArrowRight size={15} className="text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function QueueItem({ rec }: { rec: WorkbenchRecording }) {
  const meta = statusMeta(rec.status);
  return (
    <Link
      href={`/note/${rec.id}`}
      className="group rounded-[14px] border border-hairline bg-bg p-3 transition-[border-color,background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:bg-panel active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${meta.rail} ${isActive(rec.status) ? "animate-pulse" : ""}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-ink">{rec.title}</p>
          <p className={`mt-0.5 font-mono text-[11px] ${meta.tone}`}>{meta.label}</p>
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{rec.error || meta.help}</p>
        </div>
        <ArrowRight size={15} className="mt-1 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
    </Link>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-accent-deep">
      {icon}
      <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
    </div>
  );
}

function EmptyInline({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-hairline bg-bg px-4 py-5 text-center">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[20rem] text-[12.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function CommandGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-1">
      <p className="px-2 py-1 font-mono text-[10.5px] text-faint">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function CommandLink({
  href,
  onChoose,
  icon,
  label,
  detail,
}: {
  href: string;
  onChoose: () => void;
  icon: React.ReactNode;
  label: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onChoose}
      className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-hairline bg-bg text-accent-deep">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-ink">{label}</span>
        {detail && <span className="mt-0.5 block truncate text-[12px] text-muted">{detail}</span>}
      </span>
      <ArrowRight size={14} className="text-faint" />
    </Link>
  );
}
