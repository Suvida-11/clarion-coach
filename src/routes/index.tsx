import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Brain,
  MessageSquare,
  BookOpen,
  Shield,
  BarChart3,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clario AI — Real-time Coaching for Customer Support Teams" },
      {
        name: "description",
        content:
          "Coach your customer support agents live. Intent, sentiment, escalation risk, RAG knowledge and post-call reports powered by multi-agent AI.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: MessageSquare,
    title: "Live Coaching Console",
    body: "Three-panel workspace: conversation, AI coaching, and RAG knowledge — all updated turn by turn.",
  },
  {
    icon: Brain,
    title: "Six specialized AI agents",
    body: "Customer simulator, intent, knowledge, coaching, escalation risk, and post-interaction summary — orchestrated in parallel.",
  },
  {
    icon: BookOpen,
    title: "RAG knowledge retrieval",
    body: "Upload PDFs, DOCX, and TXT. Chunked, embedded, and searched with similarity scores and source citations.",
  },
  {
    icon: Shield,
    title: "Escalation risk monitor",
    body: "Continuous risk scoring with reasoning and recommended interventions. Alert banners for high-risk turns.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    body: "Sentiment trends, resolution scores, top intents, and knowledge usage — all in one dashboard.",
  },
  {
    icon: Zap,
    title: "Simulator, Manual, Replay",
    body: "Train with generated personas, paste live messages, or replay real transcripts turn by turn.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Logo />
          <nav className="ml-10 hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#architecture" className="hover:text-foreground">Architecture</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-brand text-primary-foreground hover:opacity-90">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 text-center md:pt-32">
          <Badge variant="outline" className="mb-6 border-border bg-background/60">
            <Sparkles className="mr-1.5 h-3 w-3 text-primary" />
            Multi-agent AI · Live coaching · RAG
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Coach every support agent
            <br />
            <span className="text-gradient">in real time.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Clario AI listens to every conversation, retrieves the right knowledge, spots
            escalation risk before it happens, and coaches your team turn by turn — like a
            senior CX manager sitting next to them.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-brand text-primary-foreground hover:opacity-90">
                Start free trial <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app">
              <Button size="lg" variant="outline" className="border-border">
                Explore the product
              </Button>
            </Link>
          </div>

          {/* Product mock */}
          <div className="glass mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border-border p-3 shadow-2xl">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.1fr_1fr]">
              {[
                { label: "Conversation", body: "Customer: This is unacceptable — I want a refund now.", tag: "Turn 4" },
                { label: "AI Coaching", body: "Lead with empathy: 'I completely understand how frustrating this is'.", tag: "Suggested" },
                { label: "Knowledge", body: "Refund Policy v3 · 91% match · Damaged item eligibility.", tag: "RAG" },
              ].map((c) => (
                <div key={c.label} className="surface rounded-xl p-4 text-left text-sm">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">{c.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{c.tag}</Badge>
                  </div>
                  <p className="text-foreground/90">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Everything your CX team needs.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A complete AI coaching workspace with the analytics and knowledge tools to
            back it up.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="surface hover-lift rounded-2xl p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-brand ring-glow">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">Six agents. One conversation.</h2>
            <p className="mt-4 text-muted-foreground">
              Every incoming message triggers a coordinated pass through six specialized
              agents. The result reaches your rep in under a second.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Customer Simulator — realistic personas, evolving pressure",
                "Intent & Sentiment — emotion, urgency, satisfaction trend",
                "Knowledge Retrieval — RAG with pgvector-grade recall",
                "Coaching & Response — tone, empathy, grammar",
                "Escalation Risk — probability, reasoning, next action",
                "Post-Interaction Summary — score, timeline, recommendations",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-2xl p-6 font-mono text-xs">
            <div className="mb-3 text-muted-foreground">// clario.pipeline.ts</div>
            <pre className="whitespace-pre-wrap leading-relaxed text-foreground/85">{`onCustomerTurn(async (msg) => {
  const [intent, kb, risk] = await Promise.all([
    intentAgent.analyze(msg),
    ragAgent.retrieve(msg, k = 4),
    riskAgent.score(session),
  ]);
  const coach = await coachAgent.suggest({
    msg, intent, kb, style: session.brand
  });
  ui.render({ intent, kb, risk, coach });
});`}</pre>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-2xl font-medium leading-relaxed md:text-3xl">
          “Our new hires ramp to senior-level CSAT scores in three weeks instead of three
          months. Clario is the coach we never had budget for.”
        </p>
        <p className="mt-5 text-sm text-muted-foreground">
          Rin Ochoa · Head of CX at Northlane Robotics
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight">Simple pricing.</h2>
          <p className="mt-3 text-muted-foreground">Start free. Scale when you need to.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { name: "Starter", price: "$0", perks: ["3 agents", "100 sessions/mo", "1 GB knowledge"], cta: "Start free" },
            { name: "Team", price: "$49", perks: ["25 agents", "Unlimited sessions", "50 GB knowledge", "Analytics"], cta: "Start trial", highlight: true },
            { name: "Enterprise", price: "Custom", perks: ["Unlimited agents", "SSO / SAML", "Dedicated support", "Custom RAG"], cta: "Contact sales" },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`surface rounded-2xl p-6 ${tier.highlight ? "ring-glow border-primary/40" : ""}`}
            >
              <div className="text-sm font-semibold text-muted-foreground">{tier.name}</div>
              <div className="mt-2 text-4xl font-black">
                {tier.price}
                {tier.price !== "Custom" && <span className="text-base font-normal text-muted-foreground">/mo</span>}
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {tier.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <Button
                  className={`mt-6 w-full ${tier.highlight ? "bg-brand text-primary-foreground hover:opacity-90" : ""}`}
                  variant={tier.highlight ? "default" : "outline"}
                >
                  {tier.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="glass ring-glow rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to coach every conversation?</h2>
          <p className="mt-3 text-muted-foreground">Free during beta. No credit card required.</p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button size="lg" className="bg-brand text-primary-foreground hover:opacity-90">
              Get started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <div>© 2026 Clario AI. Coaching every conversation.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
