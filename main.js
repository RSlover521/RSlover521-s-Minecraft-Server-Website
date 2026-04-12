(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
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
