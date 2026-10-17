"use client";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { SiteEffects, ThemeToggle } from "./site-effects";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  MessageCircle,
  Check,
  Users,
  Infinity as InfinityIcon,
  Video,
  ChartNoAxesCombined,
  Target,
  Globe,
  UserRound,
  Lightbulb,
  ShieldCheck,
  CalendarDays,
  Play,
  Plus,
  Minus,
} from "lucide-react";
import type { Content } from "@/lib/content";
import { track, Analytics } from "./tracking";
const icons = {
  social: Users,
  ads: InfinityIcon,
  video: Video,
  leads: ChartNoAxesCombined,
  brand: Target,
  web: Globe,
  person: UserRound,
  consult: Lightbulb,
};
export function SiteFrame({
  content: c,
  children,
}: {
  content: Content;
  children: React.ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [chat, setChat] = useState(false);
  const [answer, setAnswer] = useState("");
  const wa = `https://wa.me/${c.brand.whatsapp}?text=${encodeURIComponent(answer || "Hi ADS Solutions! I would like to discuss growing my business.")}`;
  return (
    <div className="public-site">
      <SiteEffects />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="header">
        <Link href="/" className="brand">
          {c.brand.logo && (
            <img src={c.brand.logo} alt={`${c.brand.name} logo`} />
          )}
          <span>
            <strong>{c.brand.name}</strong>
            <small>{c.brand.tagline}</small>
          </span>
        </Link>
        <nav aria-label="Main navigation" className={menu ? "nav open" : "nav"}>
          {[
            ["Home", "/"],
            ["About", "/about"],
            ["Services", "/services"],
            ["Work", "/portfolio"],
            ["Packages", "/packages"],
            ["Contact", "/contact"],
          ].map(([n, h]) => (
            <Link key={h} href={h} onClick={() => setMenu(false)}>
              {n}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="button small" href="/contact?type=booking">
            Let’s talk <ArrowUpRight size={17} />
          </Link>
          <button
            className="icon-button mobile-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {children}
      <footer>
        <div className="container footer-main">
          <div>
            <Link className="brand" href="/">
              <BrandMark className="footer-mark" />
              <span>
                <strong>{c.brand.name}</strong>
                <small>{c.brand.tagline}</small>
              </span>
            </Link>
            <p>
              Good strategy. Great creative.
              <br />
              Meaningful growth.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <Link href="/about">About us</Link>
            <Link href="/services">Our services</Link>
            <Link href="/portfolio">Our work</Link>
            <Link href="/testimonials">Testimonials</Link>
          </div>
          <div>
            <h3>Let’s connect</h3>
            <a href={`tel:${c.brand.phone.replaceAll(" ", "")}`}>
              {c.brand.phone}
            </a>
            {c.brand.secondaryPhone && (
              <a href={`tel:${c.brand.secondaryPhone.replaceAll(" ", "")}`}>
                {c.brand.secondaryPhone}
              </a>
            )}
            <a href={`mailto:${c.brand.email}`}>{c.brand.email}</a>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("whatsapp_click", { placement: "footer" })}
            >
              Chat on WhatsApp ↗
            </a>
            {c.brand.instagram && <a href={c.brand.instagram}>Instagram ↗</a>}
            {c.brand.facebook && <a href={c.brand.facebook}>Facebook ↗</a>}
          </div>
          <div>
            <h3>Based in India. Growing together.</h3>
            <small>
              {c.brand.proprietor && (
                <>
                  Proprietor: {c.brand.proprietor}
                  <br />
                </>
              )}
              GSTIN: {c.brand.gstin}
              <br />
              MSME: {c.brand.udyam}
            </small>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {c.brand.name}. All rights reserved.
          </span>
          <div>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
            <button
              onClick={() => window.dispatchEvent(new Event("open-consent"))}
            >
              Cookie preferences
            </button>
          </div>
        </div>
      </footer>
      <button
        className="floating-chat"
        aria-label="Open WhatsApp enquiry assistant"
        aria-expanded={chat}
        onClick={() => {
          setChat(!chat);
          track("chat_open");
        }}
      >
        {chat ? <X size={22} /> : <MessageCircle size={23} />}
        <span>Let’s grow your brand</span>
      </button>
      {chat && (
        <aside className="chat-panel" aria-label="Enquiry assistant">
          <div className="chat-heading">
            <span className="online-dot" /> ADS growth assistant
          </div>
          <p>Hi there! What can we help you with?</p>
          <small>
            A guided enquiry assistant. Choose a topic and continue with our
            team on WhatsApp.
          </small>
          <div className="chat-options">
            {[
              "Social media packages",
              "Meta ad campaigns",
              "A new website",
              "Book a strategy call",
            ].map((t) => (
              <button
                key={t}
                onClick={() =>
                  setAnswer(
                    `Hi ADS Solutions! I am interested in ${t.toLowerCase()}. Please share the next steps.`,
                  )
                }
              >
                {t}
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
          {answer && <p className="chat-answer">{answer}</p>}
          <a
            className="button whatsapp"
            href={wa}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("whatsapp_click", { placement: "assistant" })}
          >
            Continue on WhatsApp <ArrowUpRight size={17} />
          </a>
        </aside>
      )}
      <Analytics config={c.tracking} />
    </div>
  );
}
export function SectionTitle({
  tag,
  title,
  description,
}: {
  tag: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-title">
      <span className="eyebrow">{tag}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
export function Services({
  content: c,
  full = false,
}: {
  content: Content;
  full?: boolean;
}) {
  return (
    <section className="section container" id="services">
      <div className="section-top">
        <SectionTitle
          tag="WHAT WE DO"
          title={c.sections.servicesTitle}
          description={c.sections.servicesIntro}
        />
        {!full && (
          <Link href="/services" className="text-link">
            Explore all services <ArrowUpRight size={18} />
          </Link>
        )}
      </div>
      <div className="service-grid">
        {c.services
          .filter((s) => s.published)
          .map((s, i) => {
            const Icon = icons[s.icon];
            return (
              <Link
                href={`/contact?service=${encodeURIComponent(s.title)}`}
                className="service-card"
                key={s.id}
              >
                <div className="service-card-top">
                  <span className={`service-icon tone-${i % 4}`}>
                    <Icon size={23} />
                  </span>
                  <ArrowUpRight size={20} />
                </div>
                {s.image && (
                  <img
                    loading="lazy"
                    decoding="async"
                    className="service-image"
                    src={s.image}
                    alt={s.alt}
                  />
                )}
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </Link>
            );
          })}
      </div>
    </section>
  );
}
export function Packages({ content: c }: { content: Content }) {
  const [tab, setTab] = useState<"social" | "ads">("social");
  return (
    <section className="section package-section">
      <div className="container">
        <div className="center">
          <SectionTitle
            tag="INVEST IN YOUR NEXT CHAPTER"
            title={c.sections.packagesTitle}
            description="Choose your starting point. We’ll take it from there."
          />
          <div className="segmented" aria-label="Package category">
            <button
              aria-pressed={tab === "social"}
              onClick={() => setTab("social")}
            >
              Social media + ads
            </button>
            <button aria-pressed={tab === "ads"} onClick={() => setTab("ads")}>
              Meta ads only
            </button>
          </div>
        </div>
        <div className="package-grid">
          {c.packages
            .filter((p) => p.category === tab && p.published)
            .map((p) => (
              <article
                className={`package-card ${p.popular ? "featured" : ""}`}
                key={p.id}
              >
                {p.popular && (
                  <span className="popular">THE GROWTH FAVOURITE</span>
                )}
                <span className="package-symbol">
                  {p.popular ? "↗" : p.name === "Enterprise" ? "✧" : "◇"}
                </span>
                <h3>{p.name}</h3>
                <p>{p.subtitle}</p>
                <div className="price">
                  ₹{p.price.toLocaleString("en-IN")}
                  <span>/ month</span>
                </div>
                <Link
                  className={`button ${p.popular ? "" : "secondary"}`}
                  href={`/contact?service=${encodeURIComponent(p.name + " package")}`}
                  onClick={() => track("package_select", { package: p.id })}
                >
                  Let’s get started <ArrowUpRight size={17} />
                </Link>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={16} />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </div>
        <p className="pricing-note">
          <ShieldCheck size={17} /> Transparent pricing, always. Meta ad spend
          is paid separately, directly to Meta. Raw footage is provided by the
          client.
        </p>
      </div>
    </section>
  );
}
export function Portfolio({ content: c }: { content: Content }) {
  const [filter, setFilter] = useState("All");
  const items = c.portfolio.filter((p) => p.published);
  const categories = ["All", ...new Set(items.map((p) => p.category))];
  return (
    <section className="section container" id="work">
      <div className="section-top">
        <SectionTitle
          tag="SELECTED WORK"
          title={c.sections.portfolioTitle}
          description={c.sections.portfolioIntro}
        />
        <Link className="text-link" href="/contact">
          Build something with us <ArrowUpRight size={18} />
        </Link>
      </div>
      {items.length > 0 ? (
        <>
          <div className="filter-row">
            {categories.map((x) => (
              <button
                key={x}
                aria-pressed={x === filter}
                onClick={() => setFilter(x)}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="work-grid">
            {items
              .filter((p) => filter === "All" || p.category === filter)
              .map((p) => (
                <article className="work-card" key={p.id}>
                  {p.image && (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={p.image}
                      alt={p.alt}
                    />
                  )}
                  <div>
                    <span className="eyebrow">{p.category}</span>
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                    {p.metric && <strong className="metric">{p.metric}</strong>}
                    {p.video && (
                      <a
                        className="text-link"
                        href={p.video}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Play size={15} /> Watch project
                      </a>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </>
      ) : (
        <div className="creative-showcase">
          <div className="showcase-art">
            <span className="mini-eyebrow">THE ADS APPROACH</span>
            <strong>
              Stand out.
              <br />
              Show up.
              <br />
              <em>Grow.</em>
            </strong>
            <span className="orbit one" />
            <span className="orbit two" />
            <ArrowUpRight className="art-arrow" />
          </div>
          <div className="showcase-copy">
            <span className="eyebrow">YOUR BRAND COULD BE NEXT</span>
            <h3>
              Work that starts
              <br />
              with your goals.
            </h3>
            <p>
              From a creator’s first campaign to a local business’s next
              chapter, every partnership starts with a conversation.
            </p>
            <p className="muted">
              Published client work will be featured here.
            </p>
            <Link className="button secondary" href="/contact">
              Tell us about your brand <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
export function Testimonials({ content: c }: { content: Content }) {
  const items = c.testimonials.filter((t) => t.published);
  return (
    <section className="section container">
      <SectionTitle tag="CLIENT VOICES" title={c.sections.testimonialsTitle} />
      {items.length ? (
        <div className="testimonial-grid">
          {items.map((t) => (
            <figure key={t.id}>
              <span className="quote-mark">“</span>
              <blockquote>{t.quote}</blockquote>
              <figcaption>
                {t.image && (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={t.image}
                    alt={t.alt}
                  />
                )}
                <div>
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="trust-grid">
          {[
            [
              "Clear from day one",
              "Your ad spend goes directly to Meta. Our service fees are separate and transparent.",
            ],
            [
              "Consistency you can count on",
              "Content schedules, campaign deadlines and ongoing performance monitoring.",
            ],
            [
              "A partner in your corner",
              "Practical advice, clear communication and a focus on your business goals.",
            ],
          ].map(([t, d]) => (
            <article key={t}>
              <ShieldCheck />
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
export function CTA({ content: c }: { content: Content }) {
  return (
    <section className="container cta-wrap">
      <div className="cta">
        <div>
          <span className="eyebrow">LET’S MAKE IT HAPPEN</span>
          <h2>{c.sections.ctaTitle}</h2>
          <p>{c.sections.ctaDescription}</p>
          <div className="button-row">
            <Link className="button" href="/contact?type=booking">
              Book a free strategy call <ArrowUpRight size={18} />
            </Link>
            <a
              className="button dark-outline"
              href={`https://wa.me/${c.brand.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("whatsapp_click", { placement: "cta" })}
            >
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
          </div>
        </div>
        <span className="cta-arrow" aria-hidden="true">
          <BrandMark />
        </span>
      </div>
    </section>
  );
}
export function Home({ content: c }: { content: Content }) {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{c.hero.eyebrow}</span>
            <h1>
              {c.hero.title}
              <br />
              <em>{c.hero.highlight}</em>
              <span className="headline-arrow">↗</span>
            </h1>
            <p>{c.hero.description}</p>
            <div className="button-row">
              <Link href="/contact?type=booking" className="button">
                {c.hero.cta}
                <ArrowUpRight size={19} />
              </Link>
              <Link href="/portfolio" className="button secondary">
                <span className="play-circle">
                  <Play size={11} fill="currentColor" />
                </span>{" "}
                Explore our work
              </Link>
            </div>
            <div className="hero-proof">
              <span className="proof-icon">
                <ShieldCheck size={21} />
              </span>
              <span>
                Built on transparency.
                <br />
                <strong>Focused on your growth.</strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            {c.hero.image ? (
              <img
                className="hero-upload"
                src={c.hero.image}
                alt={c.hero.alt}
              />
            ) : (
              <div className="growth-art">
                <div className="art-grid" />
                <span className="art-kicker">
                  A LITTLE STRATEGY. A LOT OF POSSIBILITY.
                </span>
                <BrandMark className="big-infinity" />
                <div className="growth-word">
                  GROW<span>TH</span>
                  <ArrowUpRight />
                </div>
                <div className="art-baseline">
                  <span>IDEAS → CONTENT → CONNECTIONS</span>
                  <span>ADS®</span>
                </div>
              </div>
            )}
            <div className="floating-note note-top">
              <span className="note-icon">
                <Target size={22} />
              </span>
              <div>
                <strong>The right audience.</strong>
                <small>The right message.</small>
              </div>
              <span className="note-status" />
            </div>
            <div className="floating-note note-bottom">
              <span className="note-icon mint">
                <ChartNoAxesCombined size={24} />
              </span>
              <div>
                <small>YOUR NEXT CHAPTER</small>
                <strong>
                  Made for growth <ArrowUpRight size={17} />
                </strong>
              </div>
              <div className="mini-bars">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
        <div className="container audience-strip">
          <span>
            BIG IDEAS FOR
            <br />
            <strong>EVERY KIND OF BUSINESS</strong>
          </span>
          <span>
            <UserRound />
            Creators & influencers
          </span>
          <span>
            <Globe />
            Hotels & hospitality
          </span>
          <span>
            <Target />
            Gyms & fitness
          </span>
          <span>
            <Users />
            Local businesses
          </span>
        </div>
      </section>
      <Services content={c} />
      <Portfolio content={c} />
      <Packages content={c} />
      <section className="section container">
        <SectionTitle
          tag="A SIMPLE PROCESS. A SHARED AMBITION."
          title="From ‘what if’ to what’s next."
        />
        <div className="process-grid">
          {c.process.map((p, i) => (
            <article key={i}>
              <span className="step">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </article>
          ))}
        </div>
      </section>
      <Testimonials content={c} />
      <CTA content={c} />
    </>
  );
}
export function FAQ() {
  const [open, setOpen] = useState(-1);
  return (
    <section className="section container faq">
      <SectionTitle
        tag="A LITTLE MORE CLARITY"
        title="Good questions. Clear answers."
      />
      {[
        [
          "Is the advertising budget included?",
          "No. Package prices are our service fees. You pay your advertising budget directly to Meta.",
        ],
        [
          "Do I need to provide video footage?",
          "Yes. You provide raw footage; we help with ideas and scripts, then edit and optimise the reels according to your package.",
        ],
        [
          "Is my strategy call confirmed immediately?",
          "You submit a preferred date and time. Our team will contact you to confirm availability.",
        ],
        [
          "Can I track my enquiry?",
          "Yes. Sign in before submitting a request to see its progress in your client portal.",
        ],
      ].map(([q, a], i) => (
        <div key={q}>
          <button
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            {q}
            {open === i ? <Minus size={18} /> : <Plus size={18} />}
          </button>
          {open === i && <p>{a}</p>}
        </div>
      ))}
    </section>
  );
}
