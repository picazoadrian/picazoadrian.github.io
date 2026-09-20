/* Portfolio de Adrián Picazo — comportamiento del grid, el hover, el lightbox y el vídeo. */
(function () {
  'use strict';

  var grid = document.getElementById('work');
  var lightbox = document.getElementById('lightbox');
  var stage = lightbox.querySelector('.lightbox__stage');
  var closeBtn = lightbox.querySelector('.lightbox__close');

  /* El hover real y el lightbox van juntos: donde no hay puntero fino, mandan los toques.
     Se mira el puntero, no la anchura, para que un portátil táctil no se quede sin ninguno. */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var lastFocused = null;

  /* ---------- Scroll con inercia ----------
     La rueda no mueve la página directamente: alimenta un objetivo al que la
     posición real se acerca poco a poco en cada frame. De ahí la sensación de
     peso. `SCROLL_EASE` es la lentitud (cuanto más bajo, más lento) y
     `SCROLL_STEP` cuánto avanza cada golpe de rueda.

     Solo en escritorio: el scroll táctil ya tiene su propia inercia, mucho
     mejor que cualquier imitación, y pisarla se nota enseguida. */

  var SCROLL_EASE = 0.06;
  var SCROLL_STEP = 0.9;

  var scrollTarget = 0;
  var scrollCurrent = 0;
  var scrollRunning = false;
  var smoothScroll = false;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function scrollFrame() {
    scrollCurrent += (scrollTarget - scrollCurrent) * SCROLL_EASE;

    if (Math.abs(scrollTarget - scrollCurrent) < 0.4) {
      scrollCurrent = scrollTarget;
      scrollRunning = false;
    }

    window.scrollTo(0, scrollCurrent);
    if (scrollRunning) requestAnimationFrame(scrollFrame);
  }

  function pushScroll(to) {
    scrollTarget = Math.max(0, Math.min(to, maxScroll()));
    if (!scrollRunning) {
      scrollRunning = true;
      requestAnimationFrame(scrollFrame);
    }
  }

  function runSmoothScroll() {
    if (!finePointer.matches || reduceMotion.matches) return;

    smoothScroll = true;
    scrollTarget = scrollCurrent = window.scrollY;

    window.addEventListener('wheel', function (event) {
      /* Con el lightbox abierto la página no se mueve. */
      if (document.body.classList.contains('is-locked')) return;

      event.preventDefault();

      /* Algunas ruedas informan en líneas o en páginas, no en píxeles. */
      var delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= window.innerHeight;

      pushScroll(scrollTarget + delta * SCROLL_STEP);
    }, { passive: false });

    /* Si la página se mueve por otra vía (teclado, barra de scroll, un ancla),
       el objetivo se resincroniza para no dar un tirón en el siguiente golpe. */
    window.addEventListener('scroll', function () {
      if (!scrollRunning) scrollTarget = scrollCurrent = window.scrollY;
    }, { passive: true });

    window.addEventListener('resize', function () {
      pushScroll(scrollTarget);
    });
  }

  /* ---------- Cursor a medida ---------- */

  function runCursor() {
    /* Solo donde hay un puntero de verdad: en táctil no hay nada que sustituir. */
    if (!finePointer.matches) return;

    var dot = document.getElementById('cursor');
    if (!dot) return;

    document.documentElement.classList.add('has-custom-cursor');

    var x = -100;
    var y = -100;
    var pending = false;

    /* El pintado se agrupa en el frame: mousemove dispara mucho más a menudo. */
    var paint = function () {
      pending = false;
      dot.style.transform = 'translate3d(' + (x - 5) + 'px,' + (y - 5) + 'px,0)';
    };

    document.addEventListener('mousemove', function (event) {
      x = event.clientX;
      y = event.clientY;
      dot.classList.remove('is-outside');
      dot.classList.toggle(
        'is-interactive',
        /* El velo del lightbox cuenta: pulsarlo cierra. Además, sobre su fondo
           negro un punto negro sería invisible. */
        !!(event.target.closest && event.target.closest('a, button, .card, .lightbox'))
      );
      if (!pending) { pending = true; requestAnimationFrame(paint); }
    });

    document.addEventListener('mouseleave', function () { dot.classList.add('is-outside'); });
    document.addEventListener('mouseenter', function () { dot.classList.remove('is-outside'); });
  }

  /* ---------- Pantalla de carga ---------- */

  function runLoader() {
    var loader = document.getElementById('loader');
    if (!loader) return;

    /* Con movimiento reducido el velo está oculto por CSS: se retira sin más. */
    if (reduceMotion.matches) {
      loader.remove();
      return;
    }

    document.body.classList.add('is-loading');

    var square = loader.querySelector('.loader__square');
    var done = false;

    var finish = function () {
      if (done) return;
      done = true;
      /* Sin desvanecido: en cuanto el cuadrado para, el velo desaparece. */
      loader.remove();
      document.body.classList.remove('is-loading');
    };

    square.addEventListener('animationend', finish, { once: true });

    /* Red de seguridad: si la animación no llega a disparar su evento (pestaña
       en segundo plano, por ejemplo), el velo se va igual y no bloquea la web. */
    setTimeout(finish, 3000);
  }

  /* ---------- Pintado del grid ---------- */

  function buildMedia(project, index) {
    if (project.type === 'video' && project.src) {
      var video = document.createElement('video');
      video.className = 'card__media';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.poster = project.src + '.webp';
      /* Las <source> se inyectan al acercarse al viewport, no ahora: si se ponen
         de entrada, el navegador empieza a descargar las piezas de toda la página. */
      video.dataset.webm = project.src + '.webm';
      video.dataset.mp4 = project.src + '.mp4';
      return video;
    }

    if (project.type === 'image' && project.src) {
      var img = document.createElement('img');
      img.className = 'card__media';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = project.src + '.webp';
      img.alt = project.title;
      return img;
    }

    var placeholder = document.createElement('div');
    placeholder.className = 'card__media card__media--placeholder';
    placeholder.textContent = String(index + 1).padStart(2, '0');
    /* Figma alterna dos grises entre cards; se respeta para que el diff visual cuadre. */
    placeholder.style.background = index % 2 ? '#ededed' : '#f4f4f4';
    return placeholder;
  }

  function buildCard(project, index) {
    var item = document.createElement('li');
    item.className = 'card';
    item.dataset.index = String(index);

    var frame = document.createElement('div');
    frame.className = 'card__frame';
    frame.appendChild(buildMedia(project, index));

    var bar = document.createElement('div');
    bar.className = 'card__bar';

    var title = document.createElement('span');
    title.className = 'card__title';
    title.textContent = project.title || '';

    var subtitle = document.createElement('span');
    subtitle.className = 'card__subtitle';
    subtitle.textContent = project.subtitle || '';

    bar.appendChild(title);
    bar.appendChild(subtitle);

    frame.appendChild(bar);
    item.appendChild(frame);
    return item;
  }

  function render() {
    var projects = window.PROJECTS || [];
    var fragment = document.createDocumentFragment();
    projects.forEach(function (project, index) {
      fragment.appendChild(buildCard(project, index));
    });
    grid.appendChild(fragment);
  }

  /* ---------- Vídeo: loop permanente, pero cargado cuando toca ---------- */

  function startVideo(video) {
    if (video.dataset.loaded === '1') return;
    video.dataset.loaded = '1';

    var webm = document.createElement('source');
    webm.src = video.dataset.webm;
    webm.type = 'video/webm';
    var mp4 = document.createElement('source');
    mp4.src = video.dataset.mp4;
    mp4.type = 'video/mp4';

    video.appendChild(webm);
    video.appendChild(mp4);
    video.load();

    var attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      /* Safari en modo ahorro de batería puede rechazar el autoplay: se queda el poster. */
      attempt.catch(function () {});
    }
  }

  function observeVideos() {
    var videos = grid.querySelectorAll('video.card__media');
    if (!videos.length) return;

    if (!('IntersectionObserver' in window)) {
      videos.forEach(startVideo);
      return;
    }

    /* Arranca 200px antes de entrar en pantalla y NO se pausa al salir:
       una vez en marcha, se queda en loop como pidió el diseño. */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        startVideo(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '200px 0px' });

    videos.forEach(function (video) { observer.observe(video); });
  }

  /* ---------- Toque: toggle de la barra (solo sin puntero fino) ---------- */

  function closeAllCards(except) {
    grid.querySelectorAll('.card.is-open').forEach(function (card) {
      if (card !== except) card.classList.remove('is-open');
    });
  }

  function onGridClick(event) {
    var card = event.target.closest('.card');
    if (!card) return;

    if (finePointer.matches) {
      openLightbox(card);
      return;
    }

    var willOpen = !card.classList.contains('is-open');
    closeAllCards(card);
    card.classList.toggle('is-open', willOpen);
  }

  /* ---------- Lightbox (solo con puntero fino) ---------- */

  function openLightbox(card) {
    var index = Number(card.dataset.index);
    var project = (window.PROJECTS || [])[index];
    if (!project) return;

    lastFocused = document.activeElement;
    stage.innerHTML = '';

    var source = card.querySelector('.card__media');
    var clone;

    if (source && source.tagName === 'VIDEO') {
      clone = source.cloneNode(true);
      clone.controls = false;
      clone.muted = true;
      clone.loop = true;
      clone.playsInline = true;
      clone.dataset.loaded = '';
      startVideo(clone);
    } else {
      clone = source ? source.cloneNode(true) : document.createElement('div');
    }

    clone.className = 'lightbox__media';
    stage.appendChild(clone);

    lightbox.hidden = false;
    document.body.classList.add('is-locked');
    /* Se enfoca el diálogo, no el aspa: el foco queda dentro igual, pero no se
       dibuja un anillo sobre el botón nada más abrir con el ratón. Al tabular,
       el foco pasa al aspa y ahí sí se ve, que es cuando sirve. */
    lightbox.focus();
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    stage.innerHTML = '';
    document.body.classList.remove('is-locked');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function onKeydown(event) {
    if (lightbox.hidden) return;

    if (event.key === 'Escape') {
      closeLightbox();
      return;
    }

    /* Mientras el lightbox está abierto, el foco no se escapa de él. */
    if (event.key === 'Tab') {
      event.preventDefault();
      closeBtn.focus();
    }
  }

  /* ---------- Footer ---------- */

  function onTopClick(event) {
    event.preventDefault();

    if (smoothScroll) {
      pushScroll(0);
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
  }

  /* ---------- Arranque ---------- */

  runLoader();
  runSmoothScroll();
  runCursor();
  render();
  observeVideos();

  grid.addEventListener('click', onGridClick);
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (event) {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', onKeydown);

  var topLink = document.querySelector('[data-scroll-top]');
  if (topLink) topLink.addEventListener('click', onTopClick);

  /* Si el puntero cambia (tablet con teclado que se acopla o desacopla),
     se cierra lo que hubiera abierto del modo anterior. */
  var onPointerChange = function () {
    closeAllCards(null);
    closeLightbox();
  };
  if (finePointer.addEventListener) finePointer.addEventListener('change', onPointerChange);
})();
