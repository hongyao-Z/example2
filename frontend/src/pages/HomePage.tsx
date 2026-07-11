import type { CSSProperties } from "react";
import {
  ArrowRight,
  CirclePlay,
  Clock3,
  Layers3,
  MapPin,
  RadioTower,
  Share2,
  ShieldCheck,
  Sparkles,
  Waypoints,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./HomePage.css";

const APP_PATH = "/app";

type RouteKey = "abc" | "acb";

const routePlans: Record<
  RouteKey,
  {
    label: string;
    minutes: number;
    distance: string;
    reason: string;
    tag: string;
  }
> = {
  abc: {
    label: "A → B → C",
    minutes: 46,
    distance: "20.1 km",
    reason: "预计用时更短",
    tag: "推荐顺序",
  },
  acb: {
    label: "A → C → B",
    minutes: 58,
    distance: "24.3 km",
    reason: "备选路线",
    tag: "对比方案",
  },
};

const capabilityCards = [
  {
    icon: Waypoints,
    title: "自动生成访问顺序",
    body: "固定出发点后，系统自动生成多种访问顺序，适合多点办事、接送和团队活动。",
  },
  {
    icon: RadioTower,
    title: "真实路线指标",
    body: "距离、预计时间和路线轨迹来自地图路线规划，不用直线距离替代真实道路。",
  },
  {
    icon: Clock3,
    title: "时间优先推荐",
    body: "优先参考地图返回的预计用时，距离只作为时间接近时的辅助判断。",
  },
  {
    icon: Share2,
    title: "分享决策报告",
    body: "生成后可分享只读报告，让同行者看到推荐顺序、候选方案和依据。",
  },
];

const steps = [
  { icon: MapPin, title: "添加地点", body: "选择固定出发点，再添加多个待访问地点。" },
  { icon: Sparkles, title: "生成路线", body: "系统生成不同访问顺序，并规划真实道路路线。" },
  { icon: Layers3, title: "比较方案", body: "比较预计时间、路线距离和推荐理由。" },
  { icon: Share2, title: "分享报告", body: "把最终路线决策以只读链接发给同伴。" },
];

const scenarios = ["多点办事", "城市探店", "接送安排", "团队活动", "短途调研", "路线复盘"];

export default function HomePage() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>("abc");
  const [replayKey, setReplayKey] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveRoute((route) => (route === "abc" ? "acb" : "abc"));
    }, 4200);

    return () => window.clearInterval(timer);
  }, [replayKey]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".home-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.18 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const replayDemo = () => {
    setReplayKey((key) => key + 1);
    setActiveRoute("abc");
    window.setTimeout(() => setActiveRoute("acb"), 650);
    window.setTimeout(() => setActiveRoute("abc"), 1700);
  };

  return (
    <main className="home-page">
      <header className={`home-navbar ${navScrolled ? "is-scrolled" : ""}`}>
        <a className="home-brand" href="#top" aria-label="返回首页顶部">
          <span>
            <Waypoints size={25} />
          </span>
          <strong>多地点出行顺序决策工具</strong>
        </a>
        <nav aria-label="首页导航">
          <a href="#capabilities">产品能力</a>
          <a href="#workflow">使用流程</a>
          <a href="#scenarios">适用场景</a>
        </nav>
        <a className="nav-start" href={APP_PATH}>
          开始规划
          <ArrowRight size={18} />
        </a>
      </header>

      <section id="top" className="home-hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <RadioTower size={18} />
            基于真实地图路线的顺序决策工具
          </div>
          <h1>
            多地点出行，
            <br />
            <span>先去哪里更合理？</span>
          </h1>
          <p>
            输入起点和多个目的地，系统自动比较不同访问顺序的预计时间、路线距离和道路因素，
            帮你选择更省时间的出行顺序。
          </p>
          <div className="hero-actions">
            <a className="home-primary" href={APP_PATH}>
              开始规划路线
              <ArrowRight size={20} />
            </a>
            <button className="home-secondary" type="button" onClick={replayDemo}>
              <CirclePlay size={20} />
              重新演示
            </button>
          </div>
          <div className="hero-proof" aria-label="产品能力摘要">
            <ProofItem icon={ShieldCheck} title="真实地图路线" body="高德路线规划支持" />
            <ProofItem icon={Layers3} title="多方案智能比较" body="用时 / 距离 / 道路" />
            <ProofItem icon={Zap} title="决策更快更省" body="少绕路，少等待" />
          </div>
        </div>

        <DynamicRouteShowcase
          key={replayKey}
          activeRoute={activeRoute}
          setActiveRoute={setActiveRoute}
        />
      </section>

      <section id="capabilities" className="home-section">
        <SectionTitle
          eyebrow="核心能力"
          title="从“凭感觉排顺序”变成“按真实路线决策”"
          subtitle="页面只做路线顺序和成本分析，不自动获取打车平台报价。"
        />
        <div className="capability-grid">
          {capabilityCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                className="capability-card home-reveal"
                key={item.title}
                style={{ "--delay": `${index * 90}ms` } as CSSProperties}
              >
                <span>
                  <Icon size={30} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="home-section">
        <SectionTitle eyebrow="使用流程" title="四步完成一次路线决策" />
        <div className="workflow-track">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                className="workflow-step home-reveal"
                key={step.title}
                style={{ "--delay": `${index * 110}ms` } as CSSProperties}
              >
                <b>{index + 1}</b>
                <span>
                  <Icon size={28} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="scenarios" className="home-section">
        <SectionTitle
          eyebrow="适用场景"
          title="一次要去多个地方时，都可以先算顺序"
          subtitle="尤其适合时间敏感、地点分散、需要和别人同步路线的出行。"
        />
        <div className="scenario-cloud home-reveal">
          {scenarios.map((scenario) => (
            <span key={scenario}>{scenario}</span>
          ))}
        </div>
      </section>

      <section className="home-cta home-reveal">
        <div>
          <span>现在就比较你的下一次多地点出行</span>
          <h2>输入几个地点，看哪种访问顺序更省时间。</h2>
        </div>
        <a className="home-primary" href={APP_PATH}>
          进入工具
          <ArrowRight size={20} />
        </a>
      </section>
    </main>
  );
}

function DynamicRouteShowcase({
  activeRoute,
  setActiveRoute,
}: {
  activeRoute: RouteKey;
  setActiveRoute: (route: RouteKey) => void;
}) {
  const plan = routePlans[activeRoute];
  const savedMinutes = useMemo(() => Math.max(routePlans.acb.minutes - plan.minutes, 0), [plan.minutes]);

  return (
    <div className="dynamic-showcase" data-active-route={activeRoute}>
      <div className="route-engine-top">
        <div>
          <span>路线决策引擎</span>
          <strong>实时比较访问顺序</strong>
        </div>
        <div className="engine-pulse">
          <i />
          规划中
        </div>
      </div>

      <div className="route-tabs">
        {(Object.keys(routePlans) as RouteKey[]).map((key) => (
          <button
            type="button"
            key={key}
            className={activeRoute === key ? "is-active" : ""}
            onClick={() => setActiveRoute(key)}
          >
            <strong>{routePlans[key].label}</strong>
            <span>
              {routePlans[key].minutes} 分钟 · {routePlans[key].distance}
            </span>
          </button>
        ))}
      </div>

      <div className="route-stage">
        <div className="map-grid" />
        <svg viewBox="0 0 760 460" aria-label="动态路线演示">
          <path className="city-road city-road--one" d="M56 112 C180 72 266 134 356 198 C470 278 586 220 724 256" />
          <path className="city-road city-road--two" d="M40 352 C145 254 245 340 352 282 C450 226 570 322 728 318" />
          <path className="city-road city-road--three" d="M242 34 C278 150 244 224 196 318 C160 386 218 430 336 444" />
          <path
            id="home-route-abc"
            className={`route-path route-path--abc ${activeRoute === "abc" ? "is-active" : ""}`}
            d="M104 284 C210 282 284 246 352 170 C442 72 546 90 646 250"
          />
          <path
            id="home-route-acb"
            className={`route-path route-path--acb ${activeRoute === "acb" ? "is-active" : ""}`}
            d="M104 284 C220 336 362 354 646 250 C610 164 520 124 398 116"
          />
          <RouteRunnerSvg routeId="home-route-abc" className="svg-route-runner svg-route-runner--abc" />
          <RouteRunnerSvg routeId="home-route-acb" className="svg-route-runner svg-route-runner--acb" />
        </svg>

        <RouteNode className="node-a" label="A" caption="中国传媒大学" />
        <RouteNode className="node-b" label="B" caption="双惠苑" />
        <RouteNode className="node-c" label="C" caption="乐乎公寓" />
        <div className="scan-beam" />
        <div className="decision-chip decision-chip--one">
          <Zap size={16} />
          路线流动
        </div>
      </div>

      <div className="metric-console" key={activeRoute}>
        <div className="metric-card metric-card--winner">
          <span>{plan.tag}</span>
          <strong>{plan.label}</strong>
          <small>{plan.reason}</small>
        </div>
        <div className="metric-card">
          <span>预计用时</span>
          <strong>
            {plan.minutes}
            <small> 分钟</small>
          </strong>
        </div>
        <div className="metric-card">
          <span>路线距离</span>
          <strong>{plan.distance}</strong>
        </div>
        <div className="metric-card">
          <span>节省时间</span>
          <strong>
            {savedMinutes}
            <small> 分钟</small>
          </strong>
        </div>
      </div>
    </div>
  );
}

function RouteRunnerSvg({ routeId, className }: { routeId: string; className: string }) {
  return (
    <g className={className} aria-hidden="true">
      <g className="svg-runner-car" transform="translate(-18 -18)">
        <circle className="svg-runner-halo" cx="18" cy="18" r="17" />
        <rect className="svg-runner-body" x="6" y="9" width="24" height="17" rx="6" />
        <path className="svg-runner-window" d="M10 17h16l-4-5h-8z" />
        <circle className="svg-runner-wheel" cx="12" cy="27" r="2.4" />
        <circle className="svg-runner-wheel" cx="24" cy="27" r="2.4" />
      </g>
      <animateMotion dur="4.2s" repeatCount="indefinite" rotate="auto">
        <mpath href={`#${routeId}`} />
      </animateMotion>
    </g>
  );
}

function RouteNode({ className, label, caption }: { className: string; label: string; caption: string }) {
  return (
    <div className={`route-node ${className}`}>
      <b>{label}</b>
      <span>{caption}</span>
    </div>
  );
}

function ProofItem({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof RadioTower;
  title: string;
  body: string;
}) {
  return (
    <div className="proof-item">
      <Icon size={20} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="section-title home-reveal">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
