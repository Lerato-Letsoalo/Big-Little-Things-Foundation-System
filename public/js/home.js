// home.js — Homepage Dynamic Content

document.addEventListener('DOMContentLoaded', () => {
  renderDrives();
  renderEvents();
  initHamburger();
});

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const overlay   = document.getElementById('mobileOverlay');
  if (!hamburger) return;
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    overlay.classList.remove('open');
  });
}

function renderDrives() {
  const projects = DB.get('projects');
  const grid = document.getElementById('drivesGrid');
  if (!grid) return;

  const icons = { items: 'package', blankets: 'scarf', ZAR: 'banknote', default: 'target' };
  const fmt_progress = (collected, goal, unit) => {
    if (unit === 'ZAR') return { current: `R${Number(collected).toLocaleString()}`, goal: `R${Number(goal).toLocaleString()}` };
    return { current: `${collected} ${unit}`, goal: `${goal} ${unit}` };
  };

  grid.innerHTML = projects.filter(p => p.status === 'active').map((p, i) => {
    const pct = Math.min(Math.round((p.collected / p.goal) * 100), 100);
    const { current, goal } = fmt_progress(p.collected, p.goal, p.unit);
    const iconName = icons[p.unit] || icons.default;
    return `
    <div class="drive-card reveal" style="animation-delay:${i * 0.1}s">
      <div class="drive-card__header">
        <div class="drive-card__icon">${Icons.render(iconName, 'icon')}</div>
        <span class="badge badge-red">${pct}% Complete</span>
      </div>
      <h3 class="drive-card__title">${p.name}</h3>
      <p class="drive-card__location icon-text">${Icons.render('map-pin', 'icon icon--inline')}${p.location}</p>
      <p style="font-size:0.875rem;color:var(--gray-700);margin-bottom:16px;line-height:1.6">${p.description}</p>
      <div class="progress-wrap">
        <div class="progress-info">
          <span>${current} collected</span>
          <span>Goal: ${goal}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" data-width="${pct}" style="width:0"></div>
        </div>
      </div>
      <a href="donate.html" class="btn btn-primary btn-sm" style="margin-top:20px;width:100%;justify-content:center">Donate to This Drive</a>
    </div>`;
  }).join('');

  setTimeout(() => {
    grid.querySelectorAll('.progress-fill[data-width]').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, 300);
    });
  }, 100);
}

function renderEvents() {
  const events = DB.get('events');
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  grid.innerHTML = events.slice(0,3).map((ev, i) => {
    const d = new Date(ev.date);
    const day = d.getDate();
    const month = d.toLocaleString('en-ZA', { month: 'short' }).toUpperCase();
    const spotsLeft = ev.slots - ev.filled;
    return `
    <div class="event-card reveal" style="animation-delay:${i * 0.12}s">
      <div class="event-card__date">
        <div class="event-card__day">${day}</div>
        <div class="event-card__month">${month}</div>
      </div>
      <div class="event-card__body">
        <h3 class="event-card__title">${ev.title}</h3>
        <div class="event-card__meta">
          <span class="icon-text">${Icons.render('map-pin', 'icon icon--inline')}${ev.location}</span>
          <span class="icon-text">${Icons.render('clock', 'icon icon--inline')}Registration open</span>
        </div>
        <p class="event-card__desc">${ev.description}</p>
        <div class="event-card__slots">${spotsLeft} spots remaining of ${ev.slots}</div>
        <a href="volunteer.html#events" class="btn btn-primary btn-sm" style="width:100%;justify-content:center">Sign Up</a>
      </div>
    </div>`;
  }).join('');
}

function subscribeNewsletter() {
  const input = document.getElementById('footerEmail');
  if (!input.value || !input.value.includes('@')) {
    Toast.error('Please enter a valid email address.');
    return;
  }
  Toast.success('Thanks for subscribing! We\'ll keep you updated.');
  input.value = '';
}
