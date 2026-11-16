/* MenuJi site script.
   The chat is a scripted demo: no AI, no network. MENU is the only source of prices on the page. */
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");

  const MENU = [
    { id: "gobi", name: "Gobi Manchurian", price: 120, veg: true, cat: "Starters", tag: "Bestseller" },
    { id: "ptikka", name: "Paneer Tikka", price: 180, veg: true, cat: "Starters" },
    { id: "c65", name: "Chicken 65", price: 160, veg: false, cat: "Starters", tag: "Spicy" },
    { id: "dal", name: "Dal Tadka", price: 130, veg: true, cat: "Mains" },
    { id: "pbm", name: "Paneer Butter Masala", price: 190, veg: true, cat: "Mains" },
    { id: "vbir", name: "Veg Biryani", price: 140, veg: true, cat: "Mains" },
    { id: "cbir", name: "Chicken Biryani", price: 180, veg: false, cat: "Mains", tag: "Bestseller" },
    { id: "bchk", name: "Butter Chicken", price: 220, veg: false, cat: "Mains" },
    { id: "naan", name: "Butter Naan", price: 45, veg: true, cat: "Breads" },
    { id: "roti", name: "Tandoori Roti", price: 35, veg: true, cat: "Breads" },
    { id: "tea", name: "Masala Tea", price: 30, veg: true, cat: "Drinks" },
    { id: "lime", name: "Fresh Lime Soda", price: 60, veg: true, cat: "Drinks" },
    { id: "lassi", name: "Sweet Lassi", price: 70, veg: true, cat: "Drinks" },
    { id: "jamun", name: "Gulab Jamun", price: 60, veg: true, cat: "Desserts" }
  ];
  const byId = Object.fromEntries(MENU.map(d => [d.id, d]));
  const rupee = n => "₹" + n;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- scroll reveal ---------- */
  const rv = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !calm) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    rv.forEach(n => io.observe(n));
  } else {
    rv.forEach(n => n.classList.add("in"));
  }

  /* ---------- kitchen tickets ---------- */
  document.querySelectorAll(".ticket [data-advance]").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.closest(".ticket");
      const status = t.querySelector(".status");
      const meta = t.querySelector(".ticket-meta");
      if (t.dataset.state === "new") {
        t.dataset.state = "preparing";
        status.textContent = "Preparing…";
        meta.textContent = "Confirmed by Meena · just now";
        btn.textContent = "Mark served";
      } else {
        t.dataset.state = "served";
        status.textContent = "Served";
        meta.textContent = "Served by Meena · just now";
        btn.parentElement.remove();
      }
    });
  });

  document.querySelectorAll(".ticket [data-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.closest(".ticket");
      t.dataset.state = "cancelled";
      t.querySelector(".status").textContent = "Cancelled";
      t.querySelector(".ticket-meta").textContent = "Cancelled by Meena · just now";
      btn.parentElement.remove();
    });
  });

  /* ---------- chat demo ---------- */
  const log = document.getElementById("log");
  const form = document.getElementById("ask");
  const dialog = document.getElementById("menu-dialog");
  if (!log || !form) return;
  const input = form.querySelector("input");
  const send = form.querySelector("button");
  const cart = document.getElementById("cart");
  const list = new Map([["naan", 2], ["tea", 1]]);   // matches the exchange written in the HTML
  let live = null;      // the newest list card, the only one that can be edited
  let busy = false;
  let givenCount = 0, givenTotal = 0;   // what this phone has already handed to the waiter

  const count = () => [...list.values()].reduce((a, b) => a + b, 0);
  const total = () => [...list].reduce((sum, [id, q]) => sum + byId[id].price * q, 0);
  const itemsText = n => n + (n === 1 ? " item" : " items");

  function scrollDown() {
    log.scrollTo({ top: log.scrollHeight, behavior: calm ? "auto" : "smooth" });
  }
  function put(node) {
    node.classList.add("fresh");
    log.append(node);
    scrollDown();
    return node;
  }
  function bot(...parts) {
    const p = el("div", "msg bot");
    p.append(...parts);
    return put(p);
  }

  function syncCart() {
    const n = count();
    cart.hidden = n === 0;
    cart.textContent = n + " · " + rupee(total()) + " · Review";
    cart.setAttribute("aria-label", "Review my dishes: " + itemsText(n) + ", " + rupee(total()));
    document.querySelectorAll("[data-count]").forEach(b => showAdded(b, b.dataset.count));
  }
  function showAdded(btn, id) {
    const q = list.get(id) || 0;
    btn.textContent = q ? String(q) : "+";
    btn.classList.toggle("on", q > 0);
    btn.setAttribute("aria-label", "Add " + byId[id].name + (q ? ", " + q + " in your list" : ""));
  }

  function setQty(id, qty) {
    if (qty <= 0) list.delete(id); else list.set(id, Math.min(20, qty));
    syncCart();
    if (live) fill(live);
  }

  function lockCards() {
    log.querySelectorAll(".card:not(.locked)").forEach(c => {
      c.classList.add("locked");
      c.querySelectorAll("button").forEach(b => { b.disabled = true; });
    });
    live = null;
  }

  function fill(card, focus) {
    card.textContent = "";
    if (!list.size) { card.append(el("p", "card-empty", "Your list is empty.")); return; }
    for (const [id, qty] of list) {
      const d = byId[id];
      const row = el("div", "line");
      const step = el("span", "stepper");
      const minus = el("button", null, qty > 1 ? "−" : "×");
      minus.type = "button";
      minus.dataset.key = id + "-";
      minus.setAttribute("aria-label", (qty > 1 ? "One less " : "Remove ") + d.name);
      minus.addEventListener("click", () => { setQty(id, qty - 1); refocus(id + "-"); });
      const plus = el("button", null, "+");
      plus.type = "button";
      plus.dataset.key = id + "+";
      plus.setAttribute("aria-label", "One more " + d.name);
      plus.addEventListener("click", () => { setQty(id, qty + 1); refocus(id + "+"); });
      step.append(minus, el("span", "qty", String(qty)), plus);
      row.append(step, el("span", "line-name", d.name), el("span", "line-price", rupee(d.price * qty)));
      card.append(row);
    }
    const sum = el("div", "line total");
    sum.append(el("span", "line-name", "Total"), el("span", "line-price", rupee(total())));
    const actions = el("div", "card-actions");
    const more = el("button", "ui-btn ghost", "Add more");
    more.type = "button";
    more.addEventListener("click", openMenu);
    const given = el("button", "ui-btn", "Given to the waiter");
    given.type = "button";
    given.addEventListener("click", () => {
      const line = "Given to the waiter: " + itemsText(count()) + " · " + rupee(total()) + ".";
      givenCount += count();
      givenTotal += total();
      lockCards();
      list.clear();
      syncCart();
      bot(line);
    });
    actions.append(more, given);
    card.append(sum, actions, el("p", "card-note", "Please confirm the order with the waiter."));
  }
  function refocus(key) {
    if (!live) return;
    const again = live.querySelector('[data-key="' + key + '"]') || live.querySelector("button");
    if (again) again.focus();
  }

  function newCard(intro) {
    lockCards();
    if (intro) bot(intro);
    const card = el("div", "card");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "Your list");
    live = card;
    fill(card);
    return put(card);
  }

  /* a dish named in a reply: bold name, price, and a + that adds it */
  function addButton(d) {
    const add = el("button", "plus");
    add.type = "button";
    add.dataset.count = d.id;
    showAdded(add, d.id);
    add.addEventListener("click", () => setQty(d.id, (list.get(d.id) || 0) + 1));
    return add;
  }
  function dishLine(d) {
    const li = el("li");
    li.append(el("b", null, d.name), el("span", "price", rupee(d.price)), addButton(d));
    return li;
  }
  function dishList(dishes) {
    const ul = el("ul");
    dishes.forEach(d => ul.append(dishLine(d)));
    return ul;
  }

  const WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  function namedDishes(q) {
    let s = " " + q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ") + " ";
    const hits = [];
    [...MENU].sort((a, b) => b.name.length - a.name.length).forEach(d => {
      const name = d.name.toLowerCase().replace(/ /g, "\\s");
      const re = new RegExp("\\s(?:(\\d{1,2}|a|an|one|two|three|four|five|six)\\s(?:x\\s|plates?\\sof\\s|cups?\\sof\\s)?)?" + name + "s?(?=\\s)");
      const m = re.exec(s);
      if (!m) return;
      const n = m[1] ? (WORDS[m[1]] || parseInt(m[1], 10)) : 1;
      hits.push({ d, qty: Math.min(20, Math.max(1, n)), at: m.index });
      s = s.slice(0, m.index) + " ".repeat(m[0].length) + s.slice(m.index + m[0].length);
    });
    return hits.sort((a, b) => a.at - b.at);
  }

  const SKIP = new Set(["the", "and", "for", "with", "add", "get", "can", "you", "have", "has", "what", "whats", "any", "anything", "something", "some", "are", "there", "want", "like", "please", "show", "give", "one", "two", "item", "items", "dish", "dishes", "food", "menu"]);
  function looseDishes(q) {
    const words = q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(w => w.length > 2 && !SKIP.has(w)).map(w => w.replace(/s$/, ""));
    if (!words.length) return [];
    return MENU.filter(d => {
      const hay = (d.name + " " + d.cat).toLowerCase().split(/\s+/).map(w => w.replace(/s$/, ""));
      return words.some(w => hay.includes(w));
    });
  }

  function answer(q) {
    const text = q.toLowerCase();

    if (/\b(cheap|cheapest|lowest|least)\b/.test(text)) {
      const d = MENU.reduce((a, b) => (b.price < a.price ? b : a));
      const p = el("p");
      p.append(el("b", null, d.name), " is the cheapest item on the menu, at " + rupee(d.price) + ". ", addButton(d));
      return bot(p);
    }

    if (/\b(bill|total|my list|my order)\b/.test(text)) {
      const given = givenCount ? "Given to the waiter so far: " + itemsText(givenCount) + " · " + rupee(givenTotal) + "." : "";
      if (!list.size) return bot(given || "Your list is empty.");
      return newCard(given ? given + " Still on your list:" : "Your bill so far.");
    }

    const named = namedDishes(q);
    if (named.length) {
      named.forEach(h => list.set(h.d.id, Math.min(20, (list.get(h.d.id) || 0) + h.qty)));
      syncCart();
      return newCard("Added. Here's your list.");
    }

    const nonVeg = /\bnon[\s-]?veg/.test(text);
    if (nonVeg || /\bveg/.test(text)) {
      const asked = /(\d{2,4})/.exec(text);
      const limit = asked ? parseInt(asked[1], 10) : (nonVeg ? Infinity : 150);
      const found = MENU.filter(d => d.veg !== nonVeg && (d.cat === "Starters" || d.cat === "Mains") && d.price < limit);
      const kind = nonVeg ? "Non-veg" : "Vegetarian";
      if (!found.length) return bot("Nothing " + kind.toLowerCase() + " under " + rupee(limit) + " among the starters and mains.");
      return bot(el("p", null, kind + " starters and mains" + (limit === Infinity ? ":" : " under " + rupee(limit) + ":")), dishList(found));
    }

    const loose = looseDishes(q);
    if (loose.length) {
      return bot(el("p", null, loose.length === 1 ? "There's one match on the menu:" : "Here's what's on the menu:"), dishList(loose.slice(0, 5)));
    }

    if (/\b(hi|hello|hey|namaste)\b/.test(text)) return bot("Hello! Ask about the menu or tell me what you'd like.");

    return bot("This is a scripted demo, so it only knows a few questions. Try one of the buttons below, or name a dish from the demo menu.");
  }

  function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    send.disabled = true;
    put(el("p", "msg me", q));
    input.value = "";
    const dots = el("div", "msg bot typing");
    dots.setAttribute("aria-hidden", "true");
    dots.append(el("i"), el("i"), el("i"));
    put(dots);
    setTimeout(() => {
      dots.remove();
      answer(q);
      busy = false;
      send.disabled = false;
    }, calm ? 150 : 650);
  }

  form.addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
  document.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => ask(b.dataset.q)));
  cart.addEventListener("click", () => { newCard("Your list."); });

  /* make the list written in the HTML editable */
  const first = document.getElementById("first-card");
  if (first) { live = first; fill(first); }
  syncCart();
  log.scrollTop = log.scrollHeight;

  /* ---------- demo menu dialog ---------- */
  let changed = false;
  function buildMenu() {
    const body = document.getElementById("sheet-body");
    if (body.childElementCount) return;
    let cat = "";
    MENU.forEach(d => {
      if (d.cat !== cat) { cat = d.cat; body.append(el("p", "menu-cat", cat)); }
      const row = el("div", "dish");
      const mark = el("i", "veg" + (d.veg ? "" : " non"));
      mark.setAttribute("aria-hidden", "true");
      const name = el("span", "dish-name", d.name);
      name.append(el("span", "sr", d.veg ? " (veg)" : " (non-veg)"));
      if (d.tag) name.append(el("em", null, d.tag));
      const add = el("button", "add");
      add.type = "button";
      add.dataset.count = d.id;
      showAdded(add, d.id);
      add.addEventListener("click", () => { changed = true; setQty(d.id, (list.get(d.id) || 0) + 1); });
      row.append(mark, name, el("span", "dish-price", rupee(d.price)), add);
      body.append(row);
    });
  }
  function openMenu() {
    if (!dialog || typeof dialog.showModal !== "function") return;
    buildMenu();
    changed = false;
    dialog.showModal();
  }
  if (dialog) {
    document.querySelectorAll("[data-open-menu]").forEach(b => b.addEventListener("click", openMenu));
    dialog.querySelector("[data-close-menu]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { if (changed && !live) newCard("Your list."); });
  }

  /* copy the mail address, for visitors whose device has no mail app set up */
  document.querySelectorAll("[data-copy]").forEach(b => {
    const label = b.textContent;
    let timer;
    function done(ok) {
      b.textContent = ok ? "Address copied" : b.dataset.copy;
      clearTimeout(timer);
      timer = setTimeout(() => { b.textContent = label; }, 2400);
    }
    function oldCopy(text) {
      const t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.append(t);
      t.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      t.remove();
      b.focus();
      return ok;
    }
    b.addEventListener("click", () => {
      const text = b.dataset.copy;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => done(true), () => done(oldCopy(text)));
      } else {
        done(oldCopy(text));
      }
    });
  });
})();
