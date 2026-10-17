"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Content } from "@/lib/content";
import { saveContent } from "@/app/admin/actions";
import { browserClient } from "@/lib/supabase/browser";
import { Upload, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
type Value = string | number | boolean | Value[] | { [key: string]: Value };
const label = (s: string) =>
  s
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
const samples: Record<string, Value> = {
  services: {
    id: "",
    icon: "social",
    title: "New service",
    description: "",
    image: "",
    alt: "",
    published: false,
  },
  packages: {
    id: "",
    name: "New package",
    subtitle: "",
    price: 0,
    category: "social",
    popular: false,
    features: [""],
    published: false,
  },
  portfolio: {
    id: "",
    title: "New project",
    description: "",
    image: "",
    alt: "",
    published: false,
    category: "Local businesses",
    metric: "",
    video: "",
  },
  testimonials: {
    id: "",
    name: "Client name",
    role: "Business",
    quote: "",
    image: "",
    alt: "",
    published: false,
  },
  process: { title: "New step", description: "" },
  features: "",
};
function MediaField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "video/mp4",
      ];
      if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024)
        throw new Error("Use JPG, PNG, WebP, AVIF or MP4 up to 10 MB.");
      const db = browserClient();
      const ext = (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/avif": "avif",
          "video/mp4": "mp4",
        } as Record<string, string>
      )[file.type];
      const path = `uploads/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("site-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });
      if (error) throw error;
      onChange(db.storage.from("site-media").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="field wide">
      <span>{label(name)}</span>
      {value && name !== "video" && (
        <img
          className="cms-thumbnail"
          src={value}
          alt="Current media preview"
        />
      )}
      <input
        aria-label={`${label(name)} URL`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… or upload a file"
      />
      <label className="upload-control">
        <Upload size={15} />
        {busy ? "Uploading…" : "Upload media"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.[0]) void upload(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
function EditorField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Value;
  onChange: (v: Value) => void;
}) {
  if (Array.isArray(value))
    return (
      <div className="cms-array">
        <div className="cms-array-head">
          <h3>{label(name)}</h3>
          <button
            type="button"
            className="button secondary small"
            onClick={() => {
              const template = structuredClone(samples[name] ?? value[0] ?? "");
              if (
                template &&
                typeof template === "object" &&
                !Array.isArray(template) &&
                "id" in template
              )
                template.id = crypto.randomUUID();
              onChange([...value, template]);
            }}
          >
            <Plus size={14} /> Add {name === "features" ? "feature" : "item"}
          </button>
        </div>
        {value.map((v, i) => (
          <div
            className="cms-item"
            key={
              typeof v === "object" && v && !Array.isArray(v) && v.id
                ? String(v.id)
                : i
            }
          >
            <div className="cms-item-actions">
              <span>
                {i + 1}.{" "}
                {typeof v === "object" && v && !Array.isArray(v)
                  ? String(v.title || v.name || "Item")
                  : "Feature"}
              </span>
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => {
                  const a = [...value];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  onChange(a);
                }}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === value.length - 1}
                onClick={() => {
                  const a = [...value];
                  [a[i + 1], a[i]] = [a[i], a[i + 1]];
                  onChange(a);
                }}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => {
                  if (
                    confirm(
                      "Remove this item from the draft? Publish to apply the change.",
                    )
                  )
                    onChange(value.filter((_, j) => i !== j));
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <EditorField
              name={name === "features" ? "Feature" : `item ${i + 1}`}
              value={v}
              onChange={(next) =>
                onChange(value.map((x, j) => (i === j ? next : x)))
              }
            />
          </div>
        ))}
      </div>
    );
  if (typeof value === "object" && value !== null)
    return (
      <div className="fields cms-fields">
        {Object.entries(value)
          .filter(([k]) => k !== "id")
          .map(([k, v]) => (
            <EditorField
              key={k}
              name={k}
              value={v}
              onChange={(next) => onChange({ ...value, [k]: next })}
            />
          ))}
      </div>
    );
  if (typeof value === "boolean")
    return (
      <label className="cms-checkbox">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label(name)}
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="field">
        {label(name)}
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  if (["image", "logo", "video"].includes(name))
    return (
      <MediaField name={name} value={value as string} onChange={onChange} />
    );
  if (
    name === "icon" ||
    (name === "category" && ["social", "ads"].includes(String(value)))
  )
    return (
      <label className="field">
        {label(name)}
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {(name === "icon"
            ? [
                "social",
                "ads",
                "video",
                "leads",
                "brand",
                "web",
                "person",
                "consult",
              ]
            : ["social", "ads"]
          ).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    );
  return (
    <label
      className={`field ${["description", "quote", "mission", "address", "features", "body"].includes(name) ? "wide" : ""}`}
    >
      {label(name)}
      {["description", "quote", "mission", "address", "body"].includes(name) ? (
        <textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function ContentEditor({
  initial,
  initialVersion,
  onDirtyChange,
}: {
  initial: Content;
  initialVersion: number;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [content, setContent] = useState(initial);
  const [version, setVersion] = useState(initialVersion);
  const [tab, setTab] = useState<keyof Content>("hero");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function publish() {
    setBusy(true);
    setMessage("");
    try {
      const result = await saveContent(content, version);
      if (result.error) setMessage(result.error);
      else {
        setVersion(result.version!);
        setDirty(false);
        setMessage("Published. Your website now uses this content.");
        router.refresh();
      }
    } catch {
      setMessage(
        "Unable to publish. Your draft remains on this screen; please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cms">
      <div className="cms-toolbar">
        <div>
          <h2>Make it yours.</h2>
          <p>
            All public images and business content. Upload, edit, reorder and
            publish.
          </p>
        </div>
        <button
          className="button"
          disabled={busy || (!dirty && version > 0)}
          onClick={publish}
        >
          {busy
            ? "Publishing…"
            : dirty
              ? "Publish changes"
              : "Publish initial content"}
        </button>
      </div>
      <div className="cms-tabs">
        {Object.keys(content).map((k) => (
          <button
            key={k}
            aria-pressed={tab === k}
            onClick={() => setTab(k as keyof Content)}
          >
            {label(k)}
          </button>
        ))}
      </div>
      {message && (
        <pre className="form-status" role="status">
          {message}
        </pre>
      )}
      <div className="cms-section">
        <div className="section-top">
          <div>
            <span className="eyebrow">WEBSITE CONTENT</span>
            <h2>{label(tab)}</h2>
          </div>
          <span className="status-badge">
            {dirty ? "Unpublished changes" : `Version ${version}`}
          </span>
        </div>
        {tab === "tracking" && (
          <p className="form-status">
            GA4: G-… · Meta Pixel: numeric ID · Clarity: project ID. Scripts
            load only after consent. Leave an ID empty to disable it. Enter
            public tracking IDs only, never API secrets, access tokens or
            passwords.
          </p>
        )}
        {tab === "legal" && (
          <p className="form-status">
            Edit Privacy and Terms sections and update the date when policies
            change. Confirm cancellation, payment and ownership terms against
            your actual service agreement before publishing.
          </p>
        )}
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <EditorField
            name={tab}
            value={content[tab] as Value}
            onChange={(v) => {
              setContent({ ...content, [tab]: v });
              setDirty(true);
              setMessage("");
            }}
          />
        </fieldset>
      </div>
    </div>
  );
}
