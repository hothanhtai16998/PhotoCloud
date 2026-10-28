/* ============================================================
   PhotoCloud — Demo chuyển động khi cuộn
   GSAP 3.13 + ScrollTrigger + SplitText, tải từ ./vendor
   Bản mẫu độc lập: không import và không sửa mã nguồn sản phẩm.
   ============================================================ */

(() => {
  'use strict';

  const API_BASE = 'http://localhost:3000/api/images?limit=12';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;

  if (!gsap || !ScrollTrigger) {
    console.warn('[demo] GSAP không tải được — trang sẽ hiện nội dung tĩnh.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  const byId = (id) => document.querySelector(`[${id}]`);

  /* ---------------------------------------------------------
   * 1. Dải ảnh cuộn ngang — khoảnh khắc được biên đạo
   * ------------------------------------------------------- */
  function buildHorizontalTrack(photos) {
    const track = byId('horizontal-track');
    if (!track) return;

    const spacer = track.querySelector('[data-horizontal-spacer]');
    const items = [];
    const patterns = [
      { wide: false },
      { wide: true },
      { wide: false },
      { wide: false },
      { wide: true },
      { wide: false },
      { wide: false },
    ];

    patterns.forEach((pattern, index) => {
      const photo = photos[index % photos.length];
      const item = document.createElement('figure');
      item.className = `horizontal__item${pattern.wide ? ' horizontal__item--wide' : ''}`;
      item.innerHTML =
        `<img src="${photo.regularUrl}" alt="${escapeAttr(photo.title || 'Anh studio')}" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async" />` +
        `<figcaption class="horizontal__caption"><strong>${escapeText(photo.title || `Khung hinh ${index + 1}`)}</strong>${escapeText(photo.category || 'PhotoCloud Studio')}</figcaption>`;
      items.push(item);
      track.insertBefore(item, spacer);
    });

    const total = byId('horizontal-total');
    if (total) total.textContent = String(items.length).padStart(2, '0');

    if (!prefersReduced.matches) {
      setupHorizontalScroll(track, spacer, items.length);
    }
  }

  function setupHorizontalScroll(track, spacer, itemCount) {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: track.closest('.horizontal'),
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const current = byId('horizontal-current');
          if (!current) return;
          const index = Math.min(itemCount, Math.max(1, Math.round(self.progress * itemCount)));
          current.textContent = String(index).padStart(2, '0');
        },
      },
    });

    const setSpacer = () => {
      spacer.style.width = `${distance()}px`;
    };
    setSpacer();
    ScrollTrigger.addEventListener('refreshInit', setSpacer);
  }

  /* ---------------------------------------------------------
   * 2. Chữ hiện dần theo dòng (SplitText + mask)
   * ------------------------------------------------------- */
  function setupSplitReveal() {
    const targets = document.querySelectorAll('[data-split]');
    if (!targets.length) return;

    if (prefersReduced.matches) {
      targets.forEach((el) => {
        el.style.visibility = 'visible';
      });
      return;
    }

    const prepare = () => {
      targets.forEach((el) => {
        el.style.visibility = 'visible';
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(prepare).catch(prepare);
    } else {
      prepare();
    }

    targets.forEach((el) => {
      const split = SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 108,
            duration: 1,
            stagger: 0.075,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          }),
      });

      if (!split.lines.length) split.revert();
    });
  }

  /* ---------------------------------------------------------
   * 3. Parallax nhiều lớp
   * ------------------------------------------------------- */
  function setupParallax() {
    const frames = document.querySelectorAll('[data-parallax]');
    if (!frames.length || prefersReduced.matches) return;

    frames.forEach((frame) => {
      const depth = Number(frame.dataset.parallax) || 0.1;
      gsap.fromTo(
        frame,
        { yPercent: -depth * 100 },
        {
          yPercent: depth * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: frame.closest('section') || frame,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        }
      );
    });
  }

  /* ---------------------------------------------------------
   * 4. Clip-path wipe cho ảnh editorial
   * ------------------------------------------------------- */
  function setupClipReveal() {
    const media = byId('clip-reveal');
    if (!media || prefersReduced.matches) return;

    gsap.fromTo(
      media,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.3,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: media,
          start: 'top 78%',
          once: true,
        },
      }
    );
  }

  /* ---------------------------------------------------------
   * 5. Xếp chồng thẻ
   * ------------------------------------------------------- */
  function setupStacks() {
    const cards = document.querySelectorAll('[data-stack-card]');
    if (!cards.length || prefersReduced.matches) return;

    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        { y: index * 40, scale: 1 - index * 0.035 },
        {
          y: 0,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top top',
            end: `+=${index * 90}`,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        }
      );
    });
  }

  /* ---------------------------------------------------------
   * 6. Thanh tiến trình cuộn
   * ------------------------------------------------------- */
  function setupScrollProgress() {
    const bar = document.querySelector('.scroll-progress__bar');
    if (!bar) return;

    if (prefersReduced.matches) {
      bar.style.transform = 'scaleX(1)';
      return;
    }

    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.25,
      },
    });
  }

  /* ---------------------------------------------------------
   * 7. Nút hero và nội dung vào khung nhìn
   * ------------------------------------------------------- */
  function setupFadeIns() {
    if (prefersReduced.matches) return;

    document.querySelectorAll('[data-hero-actions]').forEach((el) => {
      gsap.from(el, {
        y: 22,
        opacity: 0,
        duration: 0.9,
        delay: 0.55,
        ease: 'power3.out',
      });
    });
  }

  /* ---------------------------------------------------------
   * 8. Bảng danh mục hiệu ứng
   * ------------------------------------------------------- */
  const MANIFEST = [
    {
      name: 'Scroll Progress Bar',
      tech: 'GSAP ScrollTrigger · scrub 0.25',
      ref: 'Kỹ thuật nền của GSAP ScrollTrigger',
      href: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/',
    },
    {
      name: 'Pinned Horizontal Scroll Gallery',
      tech: 'ScrollTrigger pin + scrub 1',
      ref: 'Horizontal Scroll from Poster Generator (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/horizontal-scroll-poster-generator',
    },
    {
      name: 'Scrolltrigger Gallery — pin + scrub',
      tech: 'ScrollTrigger pin + tween',
      ref: 'Scrolltrigger gallery from Know Your Beetle (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/scrolltrigger-gallery-know-your-beetle',
    },
    {
      name: 'Scrollposition Animated Gallery (parallax)',
      tech: 'ScrollTrigger scrub + parallax',
      ref: 'Scrollposition animated Gallery from mfrports (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/scrollposition-animated-gallery-mfrports',
    },
    {
      name: 'Home Page Horizontal Scroll',
      tech: 'ScrollTrigger pin + scrub',
      ref: 'Home Page Horizontal Scroll from Burgundy Wine Collection (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/home-page-horizontal-scroll-burgundy-wine-collection',
    },
    {
      name: 'Masked Typographic Reveal',
      tech: 'SplitText type lines + mask lines',
      ref: 'Text Highlight – Masked Typographic Reveal from EFOOD (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/text-highlight-masked-typographic-reveal-efood',
    },
    {
      name: 'Text Reveal (masked lines)',
      tech: 'SplitText mask + yPercent 108',
      ref: 'Text Reveal from Truth Generation (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/text-reveal-truth-generation',
    },
    {
      name: 'Sticky Stacked Cards',
      tech: 'CSS position sticky + ScrollTrigger scrub',
      ref: 'Biến thể xếp chồng của Scrollposition animated Gallery (Awwwards)',
      href: 'https://www.awwwards.com/inspiration/scrollposition-animated-gallery-mfrports',
    },
    {
      name: 'Clip-path Wipe (ảnh editorial)',
      tech: 'GSAP tween clipPath inset()',
      ref: 'Web:D — GSAP × SplitText × ScrollTrigger',
      href: 'https://webs.tistory.com/181',
    },
  ];

  function renderManifest() {
    const body = byId('manifest-body');
    if (!body) return;

    body.innerHTML = MANIFEST.map(
      (row) =>
        `<tr><td>${escapeText(row.name)}</td>` +
        `<td class="tech">${escapeText(row.tech)}</td>` +
        `<td><a href="${row.href}" target="_blank" rel="noopener noreferrer">${escapeText(row.ref)}</a></td></tr>`
    ).join('');
  }

  /* ---------------------------------------------------------
   * 9. Tiện ích
   * ------------------------------------------------------- */
  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[ch]);
  }

  function escapeAttr(value) {
    return escapeText(value).replace(/`/g, '&#96;');
  }

  /* ---------------------------------------------------------
   * 10. Nạp ảnh thật từ API PhotoCloud
   * ------------------------------------------------------- */
  function fillImages(photos) {
    const hero = byId('hero-image');
    if (hero && photos[0]) {
      hero.src = photos[0].regularUrl;
      hero.alt = photos[0].title || 'Ảnh từ thư viện PhotoCloud';
    }

    document.querySelectorAll('[data-parallax-image]').forEach((img, i) => {
      const photo = photos[(i + 1) % photos.length];
      if (!photo) return;
      img.src = photo.regularUrl;
      img.alt = photo.title || 'Ảnh minh hoạ';
    });

    const editorial = byId('editorial-image');
    if (editorial && photos[3 % photos.length]) {
      editorial.src = photos[3 % photos.length].regularUrl;
    }

    document.querySelectorAll('[data-stack-image]').forEach((img, i) => {
      const photo = photos[(i + 5) % photos.length];
      if (!photo) return;
      img.src = photo.regularUrl;
      img.alt = photo.title || 'Ảnh album';
    });

    buildHorizontalTrack(photos);
  }

  /* ---------------------------------------------------------
   * 11. Khởi động
   * ------------------------------------------------------- */
  function init() {
    renderManifest();
    setupScrollProgress();
    setupSplitReveal();
    setupParallax();
    setupClipReveal();
    setupStacks();
    setupFadeIns();
    ScrollTrigger.refresh();
  }

  async function loadPhotos() {
    try {
      const response = await fetch(API_BASE, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const photos = (payload.images || [])
        .map((item) => ({
          title: item.imageTitle || '',
          category: item.imageCategory?.name || '',
          regularUrl: item.regularUrl || item.imageUrl,
        }))
        .filter((photo) => Boolean(photo.regularUrl));

      fillImages(photos);
      ScrollTrigger.refresh();
    } catch (error) {
      console.warn('[demo] Không tải được ảnh từ API:', error.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  loadPhotos();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  });
})();
