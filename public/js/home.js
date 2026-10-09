// home.js — Homepage Dynamic Content

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('drivesGrid')) renderDrives();
  if (document.getElementById('eventsGrid')) renderEvents();
  if (document.getElementById('testimonialGrid')) initTestimonials();
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
  const grid = document.getElementById('drivesGrid');
  if (!grid) return;
  grid.innerHTML = `
    <article class="drive-card reveal">
      <div class="drive-card__header">
        <div class="drive-card__icon">${Icons.render('graduation-cap', 'icon')}</div>
        <span class="badge badge-red">Upcoming</span>
      </div>
      <h3 class="drive-card__title">Upcoming Year-End Stationery Drive</h3>
      <p style="font-size:0.875rem;color:var(--gray-700);line-height:1.6">Help us prepare learners for the academic year ahead by contributing essential stationery and school supplies. Your support will help equip young people with the resources they need to learn, grow and succeed.</p>
      <div class="drive-card__details"><strong>Status:</strong> Upcoming<br><strong>Dates:</strong> To be announced</div>
    </article>`;
}

function renderEvents() {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;
  const events = [
    { title: '2027 Easter Drive', description: 'Join us as we prepare for our Easter outreach initiative, bringing care and support to communities in need.', status: 'Planned for 2027' },
    { title: '2027 Spring Drive', description: 'Be part of our planned spring initiative as we continue working towards positive change through community support and collective action.', status: 'Planned for 2027' }
  ];
  grid.innerHTML = events.map((event, index) => `
    <article class="event-card reveal" style="animation-delay:${index * 0.12}s">
      <div class="event-card__date"><div class="event-card__day">2027</div><div class="event-card__month">PLANNED</div></div>
      <div class="event-card__body">
        <h3 class="event-card__title">${event.title}</h3>
        <p class="event-card__desc">${event.description}</p>
        <div class="event-card__slots"><strong>Date:</strong> To be confirmed<br><strong>Status:</strong> ${event.status}</div>
      </div>
    </article>`).join('');
}

const testimonials = [
  { quote: 'Volunteering with the children was such a heartwarming and rewarding experience. Seeing their smiles, energy, and excitement made every moment special. I loved interacting with them, learning from them, and creating happy memories together. It reminded me how meaningful it is to make a difference in a child’s life, even through the smallest acts of kindness.', name: 'Larissa', drive: 'Spring Drive 2026' },
  { quote: 'The Spring Drive 2026 reminded me that making a difference is about more than what we give; it is also about the time, care and presence we offer. Spending time with the children, playing games and sharing laughter made the experience especially meaningful to me.', name: 'Lerato Letsoalo', drive: 'Spring Drive 2026' },
  { quote: 'What stood out to me most was the joy of connecting with the children. Playing games, laughing together and seeing their excitement made the day memorable. It reminded me that even a few hours spent with someone can create moments that truly matter.', name: 'Unathi Masemola', drive: 'Spring Drive 2026' },
  { quote: 'Being part of the Spring Drive 2026 was a valuable reminder of what can be achieved when people come together with a shared purpose. It was rewarding to contribute to an initiative centred on community, compassion and making a positive difference.', name: 'Tebogo Mosoma', drive: 'Spring Drive 2026' },
  { quote: 'The experience showed me that meaningful change starts with a willingness to show up and be part of something bigger than yourself. I appreciated being part of a team committed to creating positive experiences and bringing people together through the work of the foundation.', name: 'Benjamin Mulamba', drive: 'Spring Drive 2026' },
  { quote: 'Volunteering with the Big Little Things Foundation during my year abroad in Cape Town was an incredibly wholesome and rewarding experience. From donating clothes and food to spending a fun-filled day playing games and connecting with the children, every moment was special. It was a beautiful reminder of how much joy and connection can come from simply showing up and spending time together.', name: 'Liza', drive: 'Easter and Spring Drive 2025' }
];

function renderTestimonials(startIndex = 0) {
  const grid = document.getElementById('testimonialGrid');
  if (!grid) return;
  const visible = Array.from({ length: 3 }, (_, index) => testimonials[(startIndex + index) % testimonials.length]);
  grid.innerHTML = visible.map(item => `
    <article class="testimonial-card">
      <p class="testimonial-quote">“${item.quote}”</p>
      <div class="testimonial-author">${item.name}</div>
      <div class="testimonial-drive">${item.drive}</div>
    </article>`).join('');
  document.getElementById('testimonialPage').textContent = `${Math.floor(startIndex / 3) + 1} / 2`;
}

function initTestimonials() {
  let startIndex = 0;
  const showPage = direction => {
    startIndex = (startIndex + direction * 3 + testimonials.length) % testimonials.length;
    renderTestimonials(startIndex);
  };
  document.getElementById('testimonialPrevious')?.addEventListener('click', () => showPage(-1));
  document.getElementById('testimonialNext')?.addEventListener('click', () => showPage(1));
  renderTestimonials(startIndex);
  window.setInterval(() => {
    if (!document.hidden) showPage(1);
  }, 8000);
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
