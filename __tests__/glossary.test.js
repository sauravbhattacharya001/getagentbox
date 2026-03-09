/**
 * AIGlossary — Tests
 * @jest-environment jsdom
 */

"use strict";

// Polyfill scrollIntoView for jsdom
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};

// Load the module once
require("../app.js");
var AIGlossary = window.AIGlossary;

beforeEach(function () {
  document.body.innerHTML =
    '<div id="glossaryCategories"></div>' +
    '<input id="glossarySearch" />' +
    '<div id="glossaryCount"></div>' +
    '<div id="glossaryList"></div>';
  AIGlossary.init();
});

/* ================================================================
 * Init & Data
 * ================================================================ */
describe("init and data", function () {
  test("AIGlossary is defined", function () {
    expect(AIGlossary).toBeDefined();
  });

  test("getTerms returns non-empty array", function () {
    var terms = AIGlossary.getTerms();
    expect(Array.isArray(terms)).toBe(true);
    expect(terms.length).toBeGreaterThan(20);
  });

  test("each term has required fields", function () {
    var terms = AIGlossary.getTerms();
    for (var i = 0; i < terms.length; i++) {
      expect(terms[i].term).toBeTruthy();
      expect(terms[i].category).toBeTruthy();
      expect(terms[i].definition).toBeTruthy();
    }
  });

  test("init renders categories", function () {
    var cats = document.getElementById("glossaryCategories");
    expect(cats.innerHTML).toContain("glossary-cat-btn");
    expect(cats.innerHTML).toContain("All");
  });

  test("init renders glossary list", function () {
    var list = document.getElementById("glossaryList");
    expect(list.innerHTML).toContain("glossary-card");
  });

  test("init shows term count", function () {
    var count = document.getElementById("glossaryCount");
    expect(count.textContent).toMatch(/\d+ terms?/);
  });

  test("terms are sorted alphabetically", function () {
    var cards = document.querySelectorAll(".glossary-term");
    var names = [];
    for (var i = 0; i < cards.length; i++) names.push(cards[i].textContent);
    var sorted = names.slice().sort(function (a, b) { return a.localeCompare(b); });
    expect(names).toEqual(sorted);
  });
});

/* ================================================================
 * Categories
 * ================================================================ */
describe("categories", function () {
  test("All button is active by default", function () {
    var allBtn = document.querySelector('[data-cat="all"]');
    expect(allBtn.classList.contains("active")).toBe(true);
  });

  test("clicking category filters terms", function () {
    var terms = AIGlossary.getTerms();
    var categories = {};
    for (var i = 0; i < terms.length; i++) {
      categories[terms[i].category] = true;
    }
    var firstCat = Object.keys(categories).sort()[0];
    var catBtn = document.querySelector('[data-cat="' + firstCat + '"]');
    catBtn.click();
    var count = document.getElementById("glossaryCount");
    expect(count.textContent).toContain(firstCat);
    expect(AIGlossary.getCategory()).toBe(firstCat);
  });

  test("filtered list only shows matching category", function () {
    var catBtn = document.querySelector('[data-cat="Safety"]');
    if (catBtn) {
      catBtn.click();
      var badges = document.querySelectorAll(".glossary-badge");
      for (var i = 0; i < badges.length; i++) {
        expect(badges[i].textContent).toBe("Safety");
      }
    }
  });

  test("clicking All shows all terms", function () {
    var catBtns = document.querySelectorAll(".glossary-cat-btn");
    if (catBtns.length > 1) catBtns[1].click();
    document.querySelector('[data-cat="all"]').click();
    expect(AIGlossary.getCategory()).toBe("all");
    var cards = document.querySelectorAll(".glossary-card");
    expect(cards.length).toBe(AIGlossary.getTerms().length);
  });

  test("category buttons have aria-selected", function () {
    var btns = document.querySelectorAll(".glossary-cat-btn");
    var activeCount = 0;
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("aria-selected") === "true") activeCount++;
    }
    expect(activeCount).toBe(1);
  });
});

/* ================================================================
 * Search
 * ================================================================ */
describe("search", function () {
  test("typing in search filters results", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "hallucination";
    input.dispatchEvent(new Event("input"));
    var list = document.getElementById("glossaryList");
    expect(list.innerHTML).toContain("Hallucination");
    expect(AIGlossary.getQuery()).toBe("hallucination");
  });

  test("search is case-insensitive", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "TOKEN";
    input.dispatchEvent(new Event("input"));
    var list = document.getElementById("glossaryList");
    expect(list.innerHTML).toContain("Token");
  });

  test("empty search shows all terms", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "hallucination";
    input.dispatchEvent(new Event("input"));
    input.value = "";
    input.dispatchEvent(new Event("input"));
    var allCount = AIGlossary.getTerms().length;
    var count = document.getElementById("glossaryCount");
    expect(count.textContent).toContain(allCount + " terms");
  });

  test("no results shows empty message", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "xyznonexistentterm123";
    input.dispatchEvent(new Event("input"));
    var list = document.getElementById("glossaryList");
    expect(list.innerHTML).toContain("No terms found");
  });

  test("search matches definition text", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "autonomous software";
    input.dispatchEvent(new Event("input"));
    var cards = document.querySelectorAll(".glossary-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  test("search matches related terms", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "guardrails";
    input.dispatchEvent(new Event("input"));
    var list = document.getElementById("glossaryList");
    expect(list.querySelectorAll(".glossary-card").length).toBeGreaterThan(0);
  });
});

/* ================================================================
 * Card expand/collapse
 * ================================================================ */
describe("card interaction", function () {
  test("clicking header toggles card open", function () {
    var header = document.querySelector(".glossary-card-header");
    header.click();
    var card = header.parentElement;
    expect(card.classList.contains("open")).toBe(true);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  test("clicking header again closes card", function () {
    var header = document.querySelector(".glossary-card-header");
    header.click();
    header.click();
    var card = header.parentElement;
    expect(card.classList.contains("open")).toBe(false);
  });

  test("Enter key toggles card", function () {
    var header = document.querySelector(".glossary-card-header");
    var event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    header.dispatchEvent(event);
    expect(header.parentElement.classList.contains("open")).toBe(true);
  });

  test("Space key toggles card", function () {
    var header = document.querySelector(".glossary-card-header");
    var event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
    header.dispatchEvent(event);
    expect(header.parentElement.classList.contains("open")).toBe(true);
  });

  test("cards start collapsed", function () {
    var cards = document.querySelectorAll(".glossary-card");
    for (var i = 0; i < cards.length; i++) {
      expect(cards[i].classList.contains("open")).toBe(false);
    }
  });

  test("header has role=button and tabindex", function () {
    var header = document.querySelector(".glossary-card-header");
    expect(header.getAttribute("role")).toBe("button");
    expect(header.getAttribute("tabindex")).toBe("0");
  });
});

/* ================================================================
 * Related term links
 * ================================================================ */
describe("related terms", function () {
  test("cards render related term links", function () {
    var header = document.querySelector(".glossary-card-header");
    header.click();
    var links = header.parentElement.querySelectorAll(".glossary-related-link");
    expect(links.length).toBeGreaterThan(0);
  });

  test("clicking related link opens target term", function () {
    var header = document.querySelector(".glossary-card-header");
    header.click();
    var link = header.parentElement.querySelector(".glossary-related-link");
    if (link) {
      var jumpTarget = link.getAttribute("data-jump");
      link.click();
      var cards = document.querySelectorAll(".glossary-card");
      var found = false;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute("data-term") === jumpTarget && cards[i].classList.contains("open")) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }
  });
});

/* ================================================================
 * jumpToTerm
 * ================================================================ */
describe("jumpToTerm", function () {
  test("opens specified term", function () {
    AIGlossary.jumpToTerm("LLM");
    var cards = document.querySelectorAll(".glossary-card");
    var found = false;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-term") === "LLM") {
        expect(cards[i].classList.contains("open")).toBe(true);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  test("clears search and category before jumping", function () {
    var input = document.getElementById("glossarySearch");
    input.value = "xyz";
    input.dispatchEvent(new Event("input"));
    AIGlossary.jumpToTerm("Token");
    expect(AIGlossary.getQuery()).toBe("");
    expect(AIGlossary.getCategory()).toBe("all");
  });

  test("jump to nonexistent term does not throw", function () {
    expect(function () {
      AIGlossary.jumpToTerm("NonexistentTerm12345");
    }).not.toThrow();
  });
});

/* ================================================================
 * Data integrity
 * ================================================================ */
describe("data integrity", function () {
  test("all related terms reference existing terms", function () {
    var terms = AIGlossary.getTerms();
    var termNames = {};
    for (var i = 0; i < terms.length; i++) {
      termNames[terms[i].term] = true;
    }
    var broken = [];
    for (var i = 0; i < terms.length; i++) {
      if (terms[i].related) {
        for (var j = 0; j < terms[i].related.length; j++) {
          if (!termNames[terms[i].related[j]]) {
            broken.push(terms[i].term + " -> " + terms[i].related[j]);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });

  test("no duplicate terms", function () {
    var terms = AIGlossary.getTerms();
    var seen = {};
    var dupes = [];
    for (var i = 0; i < terms.length; i++) {
      if (seen[terms[i].term]) dupes.push(terms[i].term);
      seen[terms[i].term] = true;
    }
    expect(dupes).toEqual([]);
  });

  test("all terms have examples", function () {
    var terms = AIGlossary.getTerms();
    for (var i = 0; i < terms.length; i++) {
      expect(terms[i].example).toBeTruthy();
    }
  });

  test("terms span multiple categories", function () {
    var terms = AIGlossary.getTerms();
    var cats = {};
    for (var i = 0; i < terms.length; i++) {
      cats[terms[i].category] = true;
    }
    expect(Object.keys(cats).length).toBeGreaterThanOrEqual(4);
  });

  test("getTerms returns a copy", function () {
    var t1 = AIGlossary.getTerms();
    var t2 = AIGlossary.getTerms();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBe(t2.length);
  });
});
