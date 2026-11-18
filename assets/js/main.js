/* ============================================================
   ЖК «Шагал» — лендинг
   Навигация, модальное окно заявки, формы, калькулятор, анимации
   ============================================================ */

(function () {
  'use strict';

  /* Куда уходят заявки.
     Пустая строка = демо-режим (проверка формы без отправки).
     После подключения бота: '/api/lead' (Vercel) или полный URL функции. */
  var LEAD_ENDPOINT = 'https://shagal-kvartiry.netlify.app/api/lead';

  var CONFIG = {
    consentVersion: '2026-11-06'
  };

  /* Цели Яндекс Метрики: цель 'lead' — успешная отправка формы.
     window.ymId выставляется сниппетом счётчика в index.html. */
  function trackGoal(name) {
    if (typeof window.ym === 'function' && window.ymId) {
      try { window.ym(window.ymId, 'reachGoal', name); } catch (e) {}
    }
  }
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- шапка ---------- */
  var header = $('#header');
  var mobileCta = $('#mobileCta');
  var hero = $('.hero');

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-solid', y > 40);
    if (mobileCta && hero) {
      var trigger = hero.offsetTop + hero.offsetHeight * 0.7;
      mobileCta.classList.toggle('is-visible', y > trigger);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  var burger = $('#burger');
  var mobileNav = $('#mobileNav');

  function closeNav() {
    if (!burger || !mobileNav) return;
    burger.setAttribute('aria-expanded', 'false');
    mobileNav.hidden = true;
  }

  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
    });
    $$('a', mobileNav).forEach(function (a) { a.addEventListener('click', closeNav); });
  }

  /* ---------- маска телефона ---------- */
  function digitsOnly(value) { return (value || '').replace(/\D/g, ''); }

  function formatPhone(raw) {
    var d = digitsOnly(raw);
    if (!d) return '';
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    return out;
  }

  function attachMask(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      input.value = formatPhone(input.value);
      input.classList.remove('is-invalid');
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 (';
    });
    input.addEventListener('blur', function () {
      if (digitsOnly(input.value).length <= 1) input.value = '';
    });
  }

  function getUtm() {
    var params = new URLSearchParams(window.location.search);
    var out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'].forEach(function (k) {
      var v = params.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  /* ---------- форма заявки (одна логика на обе формы) ---------- */
  function initLeadForm(cfg) {
    var form = cfg.form;
    if (!form) return null;

    var nameEl = cfg.name;
    var phoneEl = cfg.phone;
    var consentEl = cfg.consent;
    var companyEl = cfg.company;
    var contextEl = cfg.context;
    var submitEl = cfg.submit;
    var statusEl = cfg.status;
    var tagEl = cfg.tag;
    var tagTextEl = cfg.tagText;

    attachMask(phoneEl);

    function setStatus(text, kind) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.className = 'form__status' + (kind ? ' is-' + kind : '');
    }

    function setContext(value) {
      var text = (value || '').trim();
      if (contextEl) contextEl.value = text;
      if (!tagEl || !tagTextEl) return;
      if (text) {
        tagTextEl.textContent = text;
        tagEl.hidden = false;
      } else {
        tagEl.hidden = true;
      }
    }

    function validate() {
      var ok = true;
      var name = nameEl ? nameEl.value.trim() : '';
      if (name.length < 2) {
        if (nameEl) nameEl.classList.add('is-invalid');
        ok = false;
      } else if (nameEl) {
        nameEl.classList.remove('is-invalid');
      }

      if (phoneEl && digitsOnly(phoneEl.value).length !== 11) {
        phoneEl.classList.add('is-invalid');
        ok = false;
      } else if (phoneEl) {
        phoneEl.classList.remove('is-invalid');
      }

      if (consentEl) {
        var label = consentEl.closest('.consent');
        if (!consentEl.checked) {
          if (label) label.classList.add('is-invalid');
          ok = false;
        } else if (label) {
          label.classList.remove('is-invalid');
        }
      }
      return ok;
    }

    function setBusy(busy) {
      if (!submitEl) return;
      submitEl.disabled = busy;
      submitEl.textContent = busy ? 'Отправляем…' : (cfg.submitText || 'Получить предложение');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('', '');

      if (!validate()) {
        setStatus('Проверьте имя, телефон и согласие на обработку данных.', 'error');
        return;
      }

      if (companyEl && companyEl.value) {
        setStatus('Заявка отправлена. Свяжемся с вами в течение рабочего дня.', 'ok');
        return;
      }

      var payload = {
        name: nameEl ? nameEl.value.trim() : '',
        phone: phoneEl ? phoneEl.value : '',
        context: contextEl ? contextEl.value : '',
        consentVersion: CONFIG.consentVersion,
        page: window.location.href,
        referrer: document.referrer || '',
        utm: getUtm(),
        ts: new Date().toISOString()
      };

      setBusy(true);

      function done(ok, message) {
        setBusy(false);
        setStatus(message, ok ? 'ok' : 'error');
        if (ok) {
          form.reset();
          setContext('');
          trackGoal('lead');
          if (typeof cfg.onSuccess === 'function') cfg.onSuccess();
        }
      }

      if (!LEAD_ENDPOINT) {
        window.setTimeout(function () {
          console.info('[демо] заявка сформирована:', payload);
          done(true, 'Демо-режим: форма заполнена верно. Заявка уйдёт в Telegram после подключения бота.');
        }, 400);
        return;
      }

      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json().catch(function () { return {}; });
        })
        .then(function () {
          done(true, 'Заявка отправлена. Свяжемся с вами в течение рабочего дня.');
        })
        .catch(function (err) {
          console.error('[lead]', err);
          done(false, 'Не удалось отправить заявку. Попробуйте ещё раз.');
        });
    });

    if (consentEl) {
      consentEl.addEventListener('change', function () {
        var label = consentEl.closest('.consent');
        if (label && consentEl.checked) label.classList.remove('is-invalid');
      });
    }
    if (nameEl) {
      nameEl.addEventListener('input', function () { nameEl.classList.remove('is-invalid'); });
    }
    if (cfg.tagClear) {
      cfg.tagClear.addEventListener('click', function () { setContext(''); });
    }

    return { setContext: setContext };
  }

  /* ---------- модальное окно ---------- */
  var modal = $('#leadModal');
  var modalDialog = modal ? $('.modal__dialog', modal) : null;
  var modalName = $('#modalName');
  var lastFocus = null;

  var modalFormApi = initLeadForm({
    form: $('#modalForm'),
    name: modalName,
    phone: $('#modalPhone'),
    consent: $('#modalConsent'),
    company: $('#modalCompany'),
    context: $('#modalContext'),
    submit: $('#modalSubmit'),
    status: $('#modalStatus'),
    tag: $('#modalTag'),
    tagText: $('#modalTagText'),
    tagClear: $('#modalTagClear'),
    submitText: 'Получить предложение',
    onSuccess: function () {
      window.setTimeout(closeModal, 2600);
    }
  });

  function openModal(context) {
    if (!modal) return;
    lastFocus = document.activeElement;
    if (modalFormApi) modalFormApi.setContext(context || '');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    window.setTimeout(function () {
      if (modalName) modalName.focus({ preventScroll: true });
    }, 80);
  }

  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-modal-close]')) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;

      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      if (e.key === 'Tab' && modalDialog) {
        var focusable = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalDialog)
          .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- клики: всё ведёт в окно ---------- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-lead]');
    if (trigger) {
      e.preventDefault();
      openModal(trigger.getAttribute('data-context') || '');
      closeNav();
      return;
    }
    var closer = e.target.closest('[data-modal-close]');
    if (closer) closeModal();
  });

  /* ---------- нижняя форма на странице ---------- */
  initLeadForm({
    form: $('#leadForm'),
    name: $('#leadName'),
    phone: $('#leadPhone'),
    consent: $('#leadConsent'),
    company: $('#leadCompany'),
    context: $('#leadContext'),
    submit: $('#leadSubmit'),
    status: $('#leadStatus'),
    tag: $('#leadTag'),
    tagText: $('#leadTagText'),
    tagClear: $('#leadTagClear'),
    submitText: 'Получить предложение'
  });

  /* ---------- фильтр и лимит планировок ---------- */
  var planTabs = $$('.plans-tab');
  var planCards = $$('.plan-card[data-rooms]');
  var plansWrap = $('#plansMoreWrap');
  var plansMoreBtn = $('#plansMore');
  var plansGrid = $('#plansGrid');
  var planLimit = 6;
  var activeFilter = 'all';
  var plansExpanded = false;

  function applyPlanState() {
    var shown = 0;

    planCards.forEach(function (card) {
      var matches = activeFilter === 'all' || card.getAttribute('data-rooms') === activeFilter;
      var show = false;

      if (matches) {
        if (activeFilter !== 'all' || plansExpanded) {
          show = true;
        } else {
          show = shown < planLimit;
        }
        if (show) shown++;
      }

      card.classList.toggle('is-hidden', !show);
      if (show) card.classList.add('is-in');
    });

    var canExpand = activeFilter === 'all' && !plansExpanded && planCards.length > planLimit;
    if (plansWrap) plansWrap.hidden = !canExpand;
    if (plansMoreBtn) plansMoreBtn.setAttribute('aria-expanded', String(plansExpanded));
  }

  planTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activeFilter = tab.getAttribute('data-plan-filter') || 'all';
      plansExpanded = false;
      planTabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-pressed', String(active));
      });
      applyPlanState();
    });
  });

  if (plansMoreBtn) {
    plansMoreBtn.addEventListener('click', function () {
      plansExpanded = true;
      applyPlanState();

      var firstHidden = planCards.filter(function (c) { return !c.classList.contains('is-hidden'); })[planLimit];
      if (firstHidden && typeof firstHidden.focus === 'function') {
        firstHidden.focus({ preventScroll: true });
      }
    });
  }

  applyPlanState();

  /* ---------- калькулятор ипотеки ---------- */
  var calcPrice = $('#calcPrice');
  var calcDown = $('#calcDown');
  var calcTerm = $('#calcTerm');
  var calcRate = $('#calcRate');
  var calcPayment = $('#calcPayment');
  var calcLoan = $('#calcLoan');
  var calcRateOut = $('#calcRateOut');
  var calcTermDetail = $('#calcTermDetail');
  var calcPriceOut = $('#calcPriceOut');
  var calcDownOut = $('#calcDownOut');
  var calcTermOut = $('#calcTermOut');

  function money(n) {
    return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';
  }

  function million(n) {
    var m = n / 1000000;
    var s = (Math.round(m * 10) / 10).toLocaleString('ru-RU');
    return s + ' млн ₽';
  }

  function yearsWord(n) {
    var last = n % 10;
    var lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return n + ' лет';
    if (last === 1) return n + ' год';
    if (last >= 2 && last <= 4) return n + ' года';
    return n + ' лет';
  }

  function calcUpdate() {
    if (!calcPrice || !calcDown || !calcTerm || !calcRate) return;
    var price = Number(calcPrice.value);
    var down = Number(calcDown.value);
    var term = Number(calcTerm.value);
    var rate = Number(calcRate.value);
    var loan = price * (1 - down / 100);
    var months = term * 12;
    var monthly = rate / 100 / 12;
    var payment = monthly === 0 ? loan / months : loan * monthly / (1 - Math.pow(1 + monthly, -months));

    if (calcPayment) calcPayment.textContent = money(payment);
    if (calcLoan) calcLoan.textContent = money(loan);
    if (calcRateOut) calcRateOut.textContent = rate.toFixed(2).replace('.', ',') + '%';
    if (calcTermDetail) calcTermDetail.textContent = yearsWord(term);
    if (calcPriceOut) calcPriceOut.textContent = million(price);
    if (calcDownOut) calcDownOut.textContent = down + '%';
    if (calcTermOut) calcTermOut.textContent = yearsWord(term);
  }

  [calcPrice, calcDown, calcTerm, calcRate].forEach(function (el) {
    if (el) el.addEventListener('input', calcUpdate);
  });
  calcUpdate();

  /* ---------- появление блоков ---------- */
  if ('IntersectionObserver' in window) {
    var revealTargets = $$('.section__head, .plan-card, .feature-card, .media-card, .arch__item, .stat, .calc, .installment, .lead__form, .loc-card, .infra__card, .duo__item, .format, .split__copy, .split__art');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      io.observe(el);
    });
  }

  /* ---------- якоря с учётом шапки ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeNav();
    });
  });
})();
