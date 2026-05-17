(function () {
  var cfg =
    typeof window.SITE_CONFIG === "object" && window.SITE_CONFIG !== null
      ? window.SITE_CONFIG
      : {
          serverIp: "mc.rslover521minecraftserver.pro",
          liveMapUrl: "http://createtrackmap.rslover521minecraftserver.pro:12010/",
          blueMapUrl: "http://bluemap.rslover521minecraftserver.pro:12009/",
          blueMapFallbackImageSrc: "images/bluemap-fallback.png",
          discordUrl: "https://discord.gg/zJguWKyjDt",
          modpackUrl:
            "https://drive.google.com/file/d/1epZm2OUujBxiAsuTPkKZ0kMfh7dPz29B/view?usp=drive_link",
          minecraftVersion: "1.20.1",
          forgeVersion: "47.4.0",
          liveMapImageSrc: "images/live-map.png",
          serverStatusRefreshMs: 120000,
          serverStatusQueryTarget: "",
        };

  function normalizeEmbedUrl(url) {
    if (!url) return "";
    var cleaned = String(url).trim();
    if (!cleaned) return "";

    // Avoid mixed-content blocking (https page embedding http iframe).
    if (window.location && window.location.protocol === "https:" && cleaned.indexOf("http://") === 0) {
      return "https://" + cleaned.slice("http://".length);
    }
    return cleaned;
  }

  function applySiteConfig() {
    var ip = cfg.serverIp || "";
    document.querySelectorAll(".js-server-ip").forEach(function (el) {
      el.textContent = ip;
    });

    var verLabel = document.querySelector(".js-version-label");
    if (verLabel && cfg.minecraftVersion && cfg.forgeVersion) {
      verLabel.textContent = "Minecraft " + cfg.minecraftVersion + ", Forge " + cfg.forgeVersion;
    }

    var mcBadge = document.querySelector(".js-mc-badge");
    if (mcBadge && cfg.minecraftVersion) {
      mcBadge.textContent = cfg.minecraftVersion;
    }
    var forgeBadge = document.querySelector(".js-forge-badge");
    if (forgeBadge && cfg.forgeVersion) {
      forgeBadge.textContent = cfg.forgeVersion;
    }

    var linkMap = {
      "live-map": cfg.liveMapUrl,
      "blue-map": cfg.blueMapUrl,
      discord: cfg.discordUrl,
      modpack: cfg.modpackUrl,
    };
    document.querySelectorAll("[data-link]").forEach(function (el) {
      var key = el.getAttribute("data-link");
      if (key && linkMap[key]) {
        el.setAttribute("href", linkMap[key]);
      }
    });

    var mapImg = document.querySelector("[data-live-map-img]");
    if (mapImg && cfg.liveMapImageSrc) {
      mapImg.src = cfg.liveMapImageSrc;
    }

    var blueMapEmbed = document.querySelector("[data-blue-map-embed]");
    var blueMapFallback = document.querySelector("[data-blue-map-fallback]");
    var blueMapFallbackImg = document.querySelector("[data-blue-map-fallback-img]");
    if (blueMapEmbed) {
      var url = normalizeEmbedUrl(cfg.blueMapUrl);
      if (url) {
        if (blueMapFallback) blueMapFallback.hidden = false;
        if (blueMapFallbackImg && cfg.blueMapFallbackImageSrc) {
          blueMapFallbackImg.setAttribute("src", cfg.blueMapFallbackImageSrc);
        }

        blueMapEmbed.addEventListener(
          "load",
          function () {
            if (blueMapFallback) blueMapFallback.hidden = true;
          },
          { once: true }
        );

        blueMapEmbed.setAttribute("src", url);
      }
    }
  }

  function initServerStatus() {
    var root = document.querySelector(".js-server-status");
    var textEl = document.querySelector(".js-server-status-text");
    if (!root || !textEl) return;

    var host = (cfg.serverIp || "").trim();
    if (!host) {
      root.classList.remove("server-status--loading");
      root.classList.add("server-status--offline");
      textEl.textContent = "Server Currently Offline";
      root.setAttribute("aria-label", "Minecraft server status: no address configured");
      root.removeAttribute("title");
      return;
    }

    var apiBase = "https://api.mcstatus.io/v2/status/java/";
    var mcsrvBase = "https://api.mcsrvstat.us/2/";
    var onlineLabel = "Server Currently Online";
    var offlineLabel = "Server Currently Offline";
    var manualTarget = (cfg.serverStatusQueryTarget || "").trim();

    function applyClasses(state) {
      root.classList.remove("server-status--loading", "server-status--online", "server-status--offline");
      root.classList.add("server-status--" + state);
    }

    function isOnline(data) {
      return data && data.online === true;
    }

    function mcstatusFetch(target) {
      var url = apiBase + encodeURIComponent(target);
      return fetch(url, { cache: "no-store" }).then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      });
    }

    /** SRV / non‑25565 ports (e.g. UltraServers): resolve IP:port, then status APIs can succeed. */
    function resolveGameEndpoint(hostname) {
      var url = mcsrvBase + encodeURIComponent(hostname);
      return fetch(url, { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("mcsrvstat http");
          return res.json();
        })
        .then(function (j) {
          if (!j || !j.ip || typeof j.port !== "number") return null;
          var ip = String(j.ip).trim();
          if (!ip) return null;
          if (ip.indexOf(":") >= 0 && ip.indexOf(".") < 0) {
            return "[" + ip + "]:" + j.port;
          }
          return ip + ":" + j.port;
        })
        .catch(function () {
          return null;
        });
    }

    function fetchOnce() {
      applyClasses("loading");
      textEl.textContent = "Checking…";
      root.setAttribute("aria-label", "Minecraft server " + host + ": checking");
      root.removeAttribute("title");

      var chain;
      if (manualTarget) {
        chain = mcstatusFetch(manualTarget).then(function (d0) {
          if (isOnline(d0)) return d0;
          return mcstatusFetch(host).then(function (d1) {
            if (isOnline(d1)) return d1;
            return resolveGameEndpoint(host).then(function (endpoint) {
              if (!endpoint) return d1;
              return mcstatusFetch(endpoint).then(function (d2) {
                return isOnline(d2) ? d2 : d1;
              });
            });
          });
        });
      } else {
        chain = mcstatusFetch(host).then(function (byHost) {
          if (isOnline(byHost)) return byHost;
          return resolveGameEndpoint(host).then(function (endpoint) {
            if (!endpoint) return byHost;
            return mcstatusFetch(endpoint).then(function (byEndpoint) {
              return isOnline(byEndpoint) ? byEndpoint : byHost;
            });
          });
        });
      }

      chain
        .then(function (data) {
          if (isOnline(data)) {
            applyClasses("online");
            textEl.textContent = onlineLabel;
            root.setAttribute("aria-label", "Minecraft server " + host + ": online");
          } else {
            applyClasses("offline");
            textEl.textContent = offlineLabel;
            root.setAttribute("aria-label", "Minecraft server " + host + ": offline");
          }
        })
        .catch(function () {
          applyClasses("offline");
          textEl.textContent = offlineLabel;
          root.setAttribute("aria-label", "Minecraft server " + host + ": offline or status unavailable");
        });
    }

    fetchOnce();
    var refresh = typeof cfg.serverStatusRefreshMs === "number" ? cfg.serverStatusRefreshMs : 120000;
    if (refresh > 0) {
      window.setInterval(fetchOnce, refresh);
    }
  }

  function initLiveMapFallback() {
    var img = document.querySelector("[data-live-map-img]");
    var fallback = document.querySelector("[data-live-map-fallback]");
    var frame = document.querySelector("[data-live-map-frame]");
    if (!img || !fallback || !frame) return;

    function showFallback() {
      img.style.display = "none";
      fallback.hidden = false;
      frame.classList.add("live-map-frame--fallback");
    }

    img.addEventListener("error", showFallback);
    if (img.complete && img.naturalWidth === 0) {
      showFallback();
    }
  }

  function copyServerIp(triggerBtn) {
    var ip = (cfg.serverIp || "").trim();
    if (!ip) return;

    function feedback() {
      if (!triggerBtn) return;
      var prev = triggerBtn.getAttribute("data-prev-label") || triggerBtn.textContent;
      if (!triggerBtn.hasAttribute("data-prev-label")) {
        triggerBtn.setAttribute("data-prev-label", prev);
      }
      triggerBtn.textContent = "Copied!";
      triggerBtn.classList.add("copied");
      window.setTimeout(function () {
        triggerBtn.textContent = triggerBtn.getAttribute("data-prev-label") || "Copy IP";
        triggerBtn.classList.remove("copied");
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ip).then(feedback).catch(function () {
        window.prompt("Copy this address:", ip);
      });
    } else {
      window.prompt("Copy this address:", ip);
    }
  }

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function initImageFullscreenGallery() {
    var overlay = document.getElementById("fullscreen-overlay");
    if (!overlay) return;

    var fullscreenImg = document.getElementById("fullscreen-image");
    var fullscreenTitle = document.getElementById("fullscreen-title");
    var fullscreenDescription = document.getElementById("fullscreen-description");
    var closeButton = overlay.querySelector(".image-overlay-close");
    var cards = document.querySelectorAll(".section-grid-rail .screenshot-card");

    function openImage(card) {
      var img = card.querySelector("img");
      if (!img || !fullscreenImg || !fullscreenTitle || !fullscreenDescription) return;
      var title = card.dataset.title || img.alt || "Rail image";
      var description = card.dataset.description || card.querySelector(".screenshot-card-caption")?.textContent || img.alt;

      fullscreenImg.src = img.src;
      fullscreenImg.alt = img.alt || title;
      fullscreenTitle.textContent = title;
      fullscreenDescription.textContent = description;
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      if (overlay.requestFullscreen) {
        overlay.requestFullscreen().catch(function () {});
      } else if (overlay.webkitRequestFullscreen) {
        overlay.webkitRequestFullscreen();
      }
    }

    function closeOverlay() {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        openImage(card);
      });
    });

    closeButton && closeButton.addEventListener("click", closeOverlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.classList.contains("image-overlay-backdrop")) {
        closeOverlay();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) {
        closeOverlay();
      }
    });
  }

  applySiteConfig();
  initServerStatus();
  initLiveMapFallback();
  initImageFullscreenGallery();

  document.querySelectorAll(".js-copy-ip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copyServerIp(btn);
    });
  });

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
      var counterCurrent = root.querySelector(".carousel-counter-current");
      var counterTotal = root.querySelector(".carousel-counter-total");
      var total = slides.length;
      if (!track || total === 0) return;

      var i = 0;
      var autoplayMs = 6500;
      var timer = null;

      if (counterTotal) {
        counterTotal.textContent = String(total);
      }

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
        if (counterCurrent) {
          counterCurrent.textContent = String(i + 1);
        }
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

      if (btnPrev)
        btnPrev.addEventListener("click", function () {
          go(-1);
          stopAutoplay();
          startAutoplay();
        });
      if (btnNext)
        btnNext.addEventListener("click", function () {
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
})();
