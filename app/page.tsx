const stories = [
  { rank: '01', movement: '↑ 8', title: '长江存储 IPO 审核状态变更为“已受理”', meta: '科技 · 12 分钟前', sources: ['知乎', '微博', '财经'], heat: 96 },
  { rank: '02', movement: '↑ 3', title: '新一轮强降雨来临，多地升级防汛应急响应', meta: '社会 · 18 分钟前', sources: ['百度', '头条', '澎湃'], heat: 88 },
  { rank: '03', movement: 'NEW', title: 'GitHub 本周最受关注的开源项目集中在本地 AI', meta: '开发者 · 26 分钟前', sources: ['GitHub', 'Hacker News'], heat: 77 },
  { rank: '04', movement: '↓ 1', title: '国产内存颗粒持续涨价，消费级市场受到关注', meta: '数码 · 31 分钟前', sources: ['B站', 'IT之家'], heat: 69 },
  { rank: '05', movement: '↑ 6', title: '多所高校新校区落地县城，讨论热度快速上升', meta: '教育 · 37 分钟前', sources: ['知乎', '微博'], heat: 61 },
];

const ripples = [
  { name: 'AI 与开源', count: '9 个来源', delta: '+42%' },
  { name: '极端天气', count: '7 个来源', delta: '+31%' },
  { name: '半导体', count: '6 个来源', delta: '+24%' },
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="热榜汇首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>热榜汇</span>
        </a>
        <nav className="topnav" aria-label="主要导航">
          <a className="active" href="#now">此刻</a><a href="#technology">科技</a><a href="#society">社会</a><a href="#culture">文化</a><a href="#global">全球</a>
        </nav>
        <div className="header-tools">
          <span className="live"><b /> LIVE</span>
          <button className="round-button" aria-label="搜索">⌕</button>
          <button className="round-button" aria-label="打开设置">···</button>
        </div>
      </header>

      <section className="masthead" id="top">
        <div className="edition"><span>2026.08.22</span><span>星期六</span><span>第 235 日</span></div>
        <div className="mast-copy">
          <p className="eyebrow">THE SIGNAL, NOT THE NOISE</p>
          <h1>此刻，<br />人们在关心什么</h1>
          <p className="intro">聚合正在上升的公共话题。相同事件自动合并，热度变化一眼可见。</p>
        </div>
        <div className="clock-block"><span className="clock">12:42</span><span>刚刚刷新</span><span>覆盖 32 个来源</span></div>
      </section>

      <section className="content-grid" id="now">
        <aside className="rail" aria-label="内容筛选">
          <p>FILTER</p>
          <a className="selected" href="#now"><span>01</span>综合</a><a href="#technology"><span>02</span>科技</a><a href="#society"><span>03</span>社会</a><a href="#culture"><span>04</span>文化</a><a href="#global"><span>05</span>全球</a>
        </aside>

        <div className="stream">
          <div className="section-heading">
            <div><p className="eyebrow">UNIFIED TREND</p><h2>综合热度</h2></div>
            <div className="view-switch" aria-label="排序方式"><button className="on">热度</button><button>最新</button></div>
          </div>

          <article className="lead-story">
            <div className="lead-rank">01</div>
            <div className="lead-body">
              <div className="story-kicker"><span>正在加速</span> 8 个平台持续上升</div>
              <h3>多项前沿技术进展集中发布，<br />AI 与半导体成为今日最强信号</h3>
              <p>来自开发者社区、科技媒体与公众讨论的多个话题正在汇聚。过去一小时内，相关内容出现频率增长 42%。</p>
              <div className="lead-footer">
                <div className="source-stack" aria-label="相关来源"><span>知</span><span>微</span><span>GH</span><span>HN</span></div>
                <a href="#stories">查看话题脉络 <b>↗</b></a>
              </div>
            </div>
            <div className="signal-orbit" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit-core">42<small>%</small></span></div>
          </article>

          <div className="story-list" id="stories">
            {stories.map((story) => (
              <article className="story-row" key={story.rank}>
                <div className="story-rank">{story.rank}</div>
                <div className={`movement ${story.movement === 'NEW' ? 'new' : ''}`}>{story.movement}</div>
                <div className="story-copy">
                  <h3>{story.title}</h3>
                  <div className="story-meta"><span>{story.meta}</span><span className="source-line">{story.sources.map(source => <i key={source}>{source}</i>)}</span></div>
                </div>
                <div className="heat" aria-label={`热度 ${story.heat}%`}><span>{story.heat}</span><i><b style={{ width: `${story.heat}%` }} /></i></div>
              </article>
            ))}
          </div>
        </div>

        <aside className="signals">
          <div className="signal-head">
            <p className="eyebrow">CROSS-PLATFORM</p><h2>共振信号</h2>
            <p>同时出现在多个平台的话题，比单一榜单排名更值得关注。</p>
          </div>
          <div className="ripple-list">
            {ripples.map((ripple, index) => (
              <div className="ripple" key={ripple.name}><span className="ripple-index">0{index + 1}</span><div><strong>{ripple.name}</strong><small>{ripple.count}</small></div><em>{ripple.delta}</em></div>
            ))}
          </div>
          <div className="source-pulse"><div className="pulse-ring"><span>32</span></div><div><strong>来源在线</strong><span>29 正常 · 3 延迟</span></div></div>
          <footer><span>数据仅供趋势参考</span><button>来源状态 ↗</button></footer>
        </aside>
      </section>
    </main>
  );
}
