"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { BrandMark } from "./brand-mark";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let preference: string | null = null;
      try {
        preference = localStorage.getItem("ads-theme");
      } catch {}
      const value = preference ? preference === "dark" : media.matches;
      document.documentElement.dataset.theme = value ? "dark" : "light";
      setDark(value);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return (
    <button
      className="theme-toggle"
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      aria-pressed={dark}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        try {
          localStorage.setItem("ads-theme", next ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function SiteEffects() {
  const path = usePathname();
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".public-site");
    if (!root) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    root
      .querySelectorAll(
        ".section-title,.service-card,.work-card,.package-card,.process-grid > div,.cta",
      )
      .forEach((el) => observer.observe(el));
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (motion.matches || !fine.matches || event.pointerType === "touch")
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty(
          "--orb-x",
          `${(event.clientX / window.innerWidth - 0.5) * 64}px`,
        );
        root.style.setProperty(
          "--orb-y",
          `${(event.clientY / window.innerHeight - 0.5) * 48}px`,
        );
        const target = event.target as HTMLElement;
        if (cursor.current) {
          const visible = !target.closest(
            "input,textarea,select,[contenteditable=true]",
          );
          cursor.current.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
          cursor.current.dataset.visible = String(visible);
          root.classList.toggle("custom-cursor-active", visible);
          cursor.current.dataset.active = String(!!target.closest("a,button"));
        }
        const visual = root.querySelector<HTMLElement>(".hero-visual");
        if (visual) {
          const bounds = visual.getBoundingClientRect();
          const x = Math.max(
            -1,
            Math.min(
              1,
              (event.clientX - bounds.left - bounds.width / 2) / bounds.width,
            ),
          );
          const y = Math.max(
            -1,
            Math.min(
              1,
              (event.clientY - bounds.top - bounds.height / 2) / bounds.height,
            ),
          );
          visual.style.setProperty("--px", `${x * 14}px`);
          visual.style.setProperty("--py", `${y * 12}px`);
        }
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      if (cursor.current) cursor.current.dataset.visible = "false";
      root.classList.remove("custom-cursor-active");
      root.style.setProperty("--orb-x", "0px");
      root.style.setProperty("--orb-y", "0px");
      const visual = root.querySelector<HTMLElement>(".hero-visual");
      visual?.style.setProperty("--px", "0px");
      visual?.style.setProperty("--py", "0px");
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    motion.addEventListener("change", reset);
    fine.addEventListener("change", reset);
    return () => {
      observer.disconnect();
      reset();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      motion.removeEventListener("change", reset);
      fine.removeEventListener("change", reset);
    };
  }, [path]);
  return (
    <>
      <div className="ambient-orbs" aria-hidden="true">
        <span className="ambient-orb orb-one" />
        <span className="ambient-orb orb-two" />
        <span className="ambient-orb orb-three" />
      </div>
      <div className="custom-cursor" ref={cursor} aria-hidden="true">
        <span>
          <BrandMark />
        </span>
      </div>
    </>
  );
}
