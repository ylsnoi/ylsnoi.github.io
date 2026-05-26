(function () {
  "use strict";

  var ready = function (callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }
    callback();
  };

  var getMain = function () {
    return document.querySelector("main");
  };

  var closeMobileMenu = function () {
    var menu = document.getElementById("mobile-menu");
    var button = document.getElementById("mobile-menu-button");
    var icon = document.getElementById("mobile-menu-icon") || (button && button.querySelector("i"));

    if (!menu || !button) {
      return;
    }

    menu.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");

    if (icon) {
      icon.classList.remove("fa-times");
      icon.classList.add("fa-bars");
    }
  };

  var initLandmarks = function () {
    if (!document.body.id) {
      document.body.id = "top";
    }

    var main = getMain();
    if (main) {
      if (!main.id) {
        main.id = "main-content";
      }
      if (!main.hasAttribute("tabindex")) {
        main.setAttribute("tabindex", "-1");
      }
    }

    if (main && !document.querySelector(".skip-link")) {
      var skipLink = document.createElement("a");
      skipLink.className = "skip-link";
      skipLink.href = "#" + main.id;
      skipLink.textContent = "跳到主要内容";
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
  };

  var initMobileMenu = function () {
    var header = document.querySelector("header");
    if (!header) {
      return;
    }

    var button = document.getElementById("mobile-menu-button");
    if (!button) {
      var menuIcon = header.querySelector("button .fa-bars");
      button = menuIcon ? menuIcon.closest("button") : null;
    }
    if (!button) {
      button = header.querySelector(".md\\:hidden button") || header.querySelector("button");
    }
    var menu = document.getElementById("mobile-menu");
    var desktopNav = header.querySelector(".hidden.md\\:flex");

    if (!menu && desktopNav) {
      menu = document.createElement("nav");
      menu.id = "mobile-menu";
      menu.className = "hidden md:hidden border-t border-gray-100 px-4 py-3 bg-white";
      menu.setAttribute("aria-label", "移动端导航");

      desktopNav.querySelectorAll("a").forEach(function (link) {
        var item = link.cloneNode(true);
        item.className = "mobile-menu-link";
        menu.appendChild(item);
      });

      header.appendChild(menu);
    }

    if (!button || !menu) {
      return;
    }

    button.id = "mobile-menu-button";
    button.setAttribute("type", "button");
    button.setAttribute("aria-label", button.getAttribute("aria-label") || "打开导航菜单");
    button.setAttribute("aria-controls", "mobile-menu");
    button.setAttribute("aria-expanded", "false");

    var icon = document.getElementById("mobile-menu-icon") || button.querySelector("i");
    if (icon) {
      icon.id = "mobile-menu-icon";
    }

    var setOpen = function (isOpen) {
      menu.classList.toggle("hidden", !isOpen);
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");

      if (icon) {
        icon.classList.toggle("fa-bars", !isOpen);
        icon.classList.toggle("fa-times", isOpen);
      }
    };

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(menu.classList.contains("hidden"));
    }, true);

    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  };

  var initReadingProgress = function () {
    if (document.getElementById("site-progress")) {
      return;
    }

    var progress = document.createElement("div");
    progress.id = "site-progress";
    progress.className = "site-progress";
    progress.setAttribute("aria-hidden", "true");

    var bar = document.createElement("div");
    bar.className = "site-progress__bar";
    progress.appendChild(bar);
    document.body.appendChild(progress);

    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = "scaleX(" + ratio + ")";
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  };

  var initBackToTop = function () {
    if (document.getElementById("back-to-top")) {
      return;
    }

    var button = document.createElement("button");
    button.id = "back-to-top";
    button.className = "site-back-to-top";
    button.type = "button";
    button.setAttribute("aria-label", "返回顶部");
    button.innerHTML = '<i class="fa fa-arrow-up" aria-hidden="true"></i>';
    document.body.appendChild(button);

    var update = function () {
      button.classList.toggle("is-visible", window.scrollY > 480);
    };

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    update();
    window.addEventListener("scroll", update, { passive: true });
  };

  var initAnchorBehavior = function () {
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      var rel = link.getAttribute("rel") || "";
      var tokens = rel.split(/\s+/).filter(Boolean);

      ["noopener", "noreferrer"].forEach(function (token) {
        if (tokens.indexOf(token) === -1) {
          tokens.push(token);
        }
      });

      link.setAttribute("rel", tokens.join(" "));
    });

    document.addEventListener("click", function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }

      var href = link.getAttribute("href");
      if (!href || href === "#") {
        return;
      }

      var target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      closeMobileMenu();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus({ preventScroll: true });
      history.pushState(null, "", href);
    }, true);
  };

  var fallbackCopy = function (text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  var initCodeTools = function () {
    document.querySelectorAll("pre").forEach(function (block) {
      if (block.querySelector(".code-copy-button")) {
        return;
      }

      var button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-button";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");

      button.addEventListener("click", function () {
        var text = block.innerText.replace(button.innerText, "").trim();
        var copied = function () {
          button.textContent = "已复制";
          setTimeout(function () {
            button.textContent = "复制";
          }, 1400);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(copied).catch(function () {
            fallbackCopy(text);
            copied();
          });
          return;
        }

        fallbackCopy(text);
        copied();
      });

      block.appendChild(button);
    });
  };

  var initTableWrap = function () {
    document.querySelectorAll("table").forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains("site-table-scroll")) {
        return;
      }

      var wrapper = document.createElement("div");
      wrapper.className = "site-table-scroll";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  };

  var initHeaderState = function () {
    var header = document.querySelector("header");
    if (!header) {
      return;
    }

    var update = function () {
      header.classList.toggle("site-scrolled", window.scrollY > 8);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  };

  ready(function () {
    document.body.classList.add("site-enhanced");
    initLandmarks();
    initMobileMenu();
    initReadingProgress();
    initBackToTop();
    initAnchorBehavior();
    initCodeTools();
    initTableWrap();
    initHeaderState();
  });
}());
