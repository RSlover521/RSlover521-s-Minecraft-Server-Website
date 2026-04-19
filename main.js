(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var carousels = document.querySelectorAll("[data-carousel]");
  if (carousels.length) {
    var reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    carousels.forEach(function (root) {
      var track = root.querySelector("[data-carousel-track]");
      var slides = root.querySelectorAll(".carousel-slide");
      var btnPrev = root.querySelector("[data-carousel-prev]");
      var btnNext = root.querySelector("[data-carousel-next]");
      var dots = root.querySelectorAll("[data-carousel-dot]");
      var total = slides.length;
      if (!track || total === 0) return;

      var i = 0;
      var autoplayMs = 6500;
      var timer = null;

      track.style.width = total * 100 + "%";
      slides.forEach(function (slide) {
        slide.style.flex = "0 0 " + 100 / total + "%";
      });

      function setAria() {
        slides.forEach(function (slide, idx) {
          slide.setAttribute("aria-hidden", idx === i ? "false" : "true");
        });
        dots.forEach(function (dot, idx) {
          if (idx === i) {
            dot.setAttribute("aria-current", "true");
          } else {
            dot.removeAttribute("aria-current");
          }
        });
      }

      function apply() {
        track.style.transform = "translateX(-" + (100 * i) / total + "%)";
        setAria();
      }

      function go(delta) {
        i = (i + delta + total) % total;
        apply();
      }

      function goTo(index) {
        i = ((index % total) + total) % total;
        apply();
      }

      function stopAutoplay() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      function startAutoplay() {
        stopAutoplay();
        if (reduceMotion || total < 2) return;
        timer = window.setInterval(function () {
          go(1);
        }, autoplayMs);
      }

      if (btnPrev) btnPrev.addEventListener("click", function () {
        go(-1);
        stopAutoplay();
        startAutoplay();
      });
      if (btnNext) btnNext.addEventListener("click", function () {
        go(1);
        stopAutoplay();
        startAutoplay();
      });

      dots.forEach(function (dot, idx) {
        dot.addEventListener("click", function () {
          goTo(idx);
          stopAutoplay();
          startAutoplay();
        });
      });

      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
          stopAutoplay();
          startAutoplay();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
          stopAutoplay();
          startAutoplay();
        }
      });

      root.setAttribute("tabindex", "0");
      root.addEventListener("focusin", stopAutoplay);
      root.addEventListener("focusout", function () {
        window.setTimeout(startAutoplay, 0);
      });
      root.addEventListener("mouseenter", stopAutoplay);
      root.addEventListener("mouseleave", startAutoplay);

      apply();
      startAutoplay();
    });
  }

  var copyBtn = document.getElementById("copy-ip");
  var ipEl = document.getElementById("server-ip");
  if (copyBtn && ipEl) {
    copyBtn.addEventListener("click", function () {
      var text = ipEl.textContent.trim();
      function done() {
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          window.prompt("Copy this address:", text);
        });
      } else {
        window.prompt("Copy this address:", text);
      }
    });
  }
})();
