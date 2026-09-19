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
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      loader.addEventListener('transitionend', function () { loader.remove(); }, { once: true });
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
    closeBtn.focus();
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
    window.scrollTo({
      top: 0,
      behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
  }

  /* ---------- Arranque ---------- */

  runLoader();
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
