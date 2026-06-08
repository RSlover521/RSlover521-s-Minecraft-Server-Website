(function () {
  var pages = Array.isArray(window.WIKI_PAGES) ? window.WIKI_PAGES : [];
  var pageList = document.getElementById("wiki-page-list");
  var searchInput = document.getElementById("wiki-search");
  var documentRoot = document.getElementById("wiki-document");
  var pageMap = new Map();
  var homeTitle = "RSlover521 Minecraft Server Wiki";

  function titleFromFile(file) {
    return file.replace(/\.md$/i, "");
  }

  function slugify(title) {
    return String(title)
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function encodePathPart(value) {
    return String(value).split("/").map(encodeURIComponent).join("/");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pageHref(title) {
    return "/wiki/?page=" + encodeURIComponent(slugify(title));
  }

  function pageFromTitle(title) {
    var clean = String(title || "").split("#")[0].trim();
    var direct = pageMap.get(clean.toLowerCase());
    if (direct) return direct;
    return pageMap.get(slugify(clean));
  }

  pages.forEach(function (file) {
    var title = titleFromFile(file);
    var page = { file: file, title: title, slug: slugify(title) };
    pageMap.set(title.toLowerCase(), page);
    pageMap.set(page.slug, page);
  });

  function normalizeObsidian(markdown) {
    return markdown
      .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, function (_, rawName, rawSize) {
        var name = rawName.trim();
        var size = rawSize ? rawSize.trim() : "";
        var src = "/wiki/Assets/" + encodePathPart(name);
        var width = /^\d+$/.test(size) ? ' width="' + escapeHtml(size) + '"' : "";
        return '<figure class="wiki-embed"><img src="' + src + '" alt="' + escapeHtml(name.replace(/\.[^.]+$/, "")) + '"' + width + ' loading="lazy" /></figure>';
      })
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, function (_, rawTarget, rawLabel) {
        var target = rawTarget.trim();
        var label = (rawLabel || target).trim();
        var page = pageFromTitle(target);
        if (!page) {
          return '<span class="wiki-missing-link" title="Missing page">' + escapeHtml(label) + "</span>";
        }
        return "[" + label + "](" + pageHref(page.title) + ")";
      });
  }

  function renderInline(text) {
    var placeholders = [];
    var html = escapeHtml(text).replace(/`([^`]+)`/g, function (match) {
      placeholders.push("<code>" + match.slice(1, -1) + "</code>");
      return "\u0000" + (placeholders.length - 1) + "\u0000";
    });

    html = html
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
        var external = /^https?:\/\//i.test(href);
        return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + label + "</a>";
      });

    return html.replace(/\u0000(\d+)\u0000/g, function (_, index) {
      return placeholders[Number(index)] || "";
    });
  }

  function flushParagraph(paragraph, html) {
    if (!paragraph.length) return;
    html.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
    paragraph.length = 0;
  }

  function renderMarkdown(markdown, title) {
    var normalized = normalizeObsidian(markdown).replace(/\r\n/g, "\n");
    var lines = normalized.split("\n");
    var html = [];
    var paragraph = [];
    var inList = false;
    var listTag = "ul";
    var inQuote = false;
    var inCode = false;
    var codeLines = [];
    var skipTableRows = 0;
    var hasH1 = lines.some(function (line) {
      return /^#\s+/.test(line);
    });

    if (!hasH1) {
      html.push("<h1>" + escapeHtml(title) + "</h1>");
    }

    function closeList() {
      if (inList) {
        html.push("</" + listTag + ">");
        inList = false;
      }
    }

    function closeQuote() {
      if (inQuote) {
        html.push("</blockquote>");
        inQuote = false;
      }
    }

    function tableCells(line) {
      return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map(function (cell) {
          return cell.trim();
        });
    }

    function isTableLine(line) {
      return /^\|.+\|$/.test(line.trim());
    }

    function isTableSeparator(line) {
      return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
    }

    lines.forEach(function (line, index) {
      if (skipTableRows > 0) {
        skipTableRows -= 1;
        return;
      }

      var trimmed = line.trim();

      if (/^```/.test(trimmed)) {
        flushParagraph(paragraph, html);
        closeList();
        closeQuote();
        if (inCode) {
          html.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
          codeLines = [];
          inCode = false;
        } else {
          inCode = true;
        }
        return;
      }

      if (inCode) {
        codeLines.push(line);
        return;
      }

      if (!trimmed) {
        flushParagraph(paragraph, html);
        closeList();
        closeQuote();
        return;
      }

      if (/^---+$/.test(trimmed)) {
        flushParagraph(paragraph, html);
        closeList();
        closeQuote();
        html.push("<hr />");
        return;
      }

      var heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
      if (heading) {
        flushParagraph(paragraph, html);
        closeList();
        closeQuote();
        var level = heading[1].length;
        var text = heading[2].replace(/\s+#+$/, "");
        var id = slugify(text);
        html.push("<h" + level + ' id="' + id + '">' + renderInline(text) + "</h" + level + ">");
        return;
      }

      if (isTableLine(line) && isTableSeparator(lines[index + 1] || "")) {
        flushParagraph(paragraph, html);
        closeList();
        closeQuote();
        var headers = tableCells(line);
        var rows = [];
        var cursor = index + 2;
        while (cursor < lines.length && isTableLine(lines[cursor])) {
          rows.push(tableCells(lines[cursor]));
          cursor += 1;
        }
        skipTableRows = rows.length + 1;
        html.push('<div class="wiki-table-wrap"><table>');
        html.push("<thead><tr>" + headers.map(function (cell) {
          return "<th>" + renderInline(cell) + "</th>";
        }).join("") + "</tr></thead>");
        html.push("<tbody>");
        rows.forEach(function (row) {
          html.push("<tr>" + row.map(function (cell) {
            return "<td>" + renderInline(cell) + "</td>";
          }).join("") + "</tr>");
        });
        html.push("</tbody></table></div>");
        return;
      }

      var quote = /^>\s?(.*)$/.exec(line);
      if (quote) {
        flushParagraph(paragraph, html);
        closeList();
        if (!inQuote) {
          html.push("<blockquote>");
          inQuote = true;
        }
        html.push("<p>" + renderInline(quote[1]) + "</p>");
        return;
      }

      var listItem = /^([-*]|\d+\.)\s+(.+)$/.exec(trimmed);
      if (listItem) {
        flushParagraph(paragraph, html);
        closeQuote();
        var nextListTag = /\d+\./.test(listItem[1]) ? "ol" : "ul";
        if (!inList || listTag !== nextListTag) {
          closeList();
          listTag = nextListTag;
          html.push("<" + listTag + ">");
          inList = true;
        }
        html.push("<li>" + renderInline(listItem[2]) + "</li>");
        return;
      }

      if (/^<figure class="wiki-embed">/.test(trimmed)) {
        flushParagraph(paragraph, html);
        closeList();
        closeQuote();
        html.push(trimmed);
        return;
      }

      paragraph.push(trimmed);
    });

    flushParagraph(paragraph, html);
    closeList();
    closeQuote();
    if (inCode) {
      html.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    }

    return html.join("\n");
  }

  function renderPageList(filter) {
    if (!pageList) return;
    var needle = String(filter || "").trim().toLowerCase();
    pageList.innerHTML = "";
    pages
      .map(function (file) {
        return pageFromTitle(titleFromFile(file));
      })
      .filter(Boolean)
      .filter(function (page) {
        return !needle || page.title.toLowerCase().indexOf(needle) >= 0;
      })
      .forEach(function (page) {
        var link = document.createElement("a");
        link.href = pageHref(page.title);
        link.textContent = page.title;
        link.dataset.slug = page.slug;
        pageList.appendChild(link);
      });
  }

  function setActive(page) {
    if (!pageList) return;
    pageList.querySelectorAll("a").forEach(function (link) {
      link.toggleAttribute("aria-current", link.dataset.slug === page.slug);
    });
  }

  function currentPage() {
    var param = new URLSearchParams(window.location.search).get("page");
    return pageMap.get(param || "") || pageFromTitle(homeTitle) || pageFromTitle("Getting Started") || pageFromTitle(titleFromFile(pages[0] || ""));
  }

  function loadPage(page, options) {
    if (!page || !documentRoot) return;
    options = options || {};
    documentRoot.innerHTML = '<p class="wiki-loading">Loading ' + escapeHtml(page.title) + "...</p>";
    setActive(page);

    fetch("/wiki/" + encodePathPart(page.file), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load page");
        return response.text();
      })
      .then(function (markdown) {
        var trimmed = markdown.trim();
        documentRoot.innerHTML = trimmed
          ? renderMarkdown(trimmed, page.title)
          : '<h1>' + escapeHtml(page.title) + '</h1><p class="wiki-empty">This page exists, but it does not have content yet.</p>';
        document.title = page.title + " | RSlover521 Minecraft Server";
        if (!options.keepScroll) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      })
      .catch(function () {
        documentRoot.innerHTML =
          '<h1>Page unavailable</h1><p class="wiki-empty">The Markdown file for this page could not be loaded.</p>';
      });
  }

  function navigateTo(page, keepScroll) {
    if (!page) return;
    var url = pageHref(page.title);
    if (window.location.pathname !== "/wiki/" || window.location.search !== "?page=" + encodeURIComponent(page.slug)) {
      window.history.pushState({ page: page.slug }, "", url);
    }
    loadPage(page, { keepScroll: keepScroll });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('.wiki-document a[href^="/wiki/?page="], .wiki-page-list a[href^="/wiki/?page="]');
    if (!link) return;
    var page = pageMap.get(new URL(link.href).searchParams.get("page") || "");
    if (!page) return;
    event.preventDefault();
    navigateTo(page, false);
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderPageList(searchInput.value);
      setActive(currentPage());
    });
  }

  window.addEventListener("popstate", function () {
    loadPage(currentPage(), { keepScroll: false });
  });

  renderPageList("");
  loadPage(currentPage(), { keepScroll: true });
})();
