(() => {
  function c(s) {
    let [e, n] = [s.columns, s.values],
      t = "<thead>" + o(e, "th") + "</thead>",
      i = n.map(function (a) {
        return o(a.map(m), "td");
      });
    return (t += "<tbody>" + o(i, "tr") + "</tbody>"), `<table>${t}</table>`;
  }
  function u(s) {
    let e = "<thead><tr><th>table</th></tr></thead>",
      n = s.map(function (t) {
        return `<tr>
            <td>
                <button class="sqlime-link" data-action="showTable" data-arg="${t}">
                    ${t}
                </button>
            </td>
        </tr>`;
      });
    return (
      (e +=
        "<tbody>" +
        n.join(`
`) +
        "</tbody>"),
      `<table>${e}</table>`
    );
  }
  function o(s, e) {
    if (s.length === 0) return "";
    let n = "<" + e + ">",
      t = "</" + e + ">";
    return n + s.join(t + n) + t;
  }
  function m(s) {
    let e = document.createElement("div");
    return (e.innerText = s), e.innerHTML;
  }
  var h = { printResult: c, printTables: u },
    l = h;
  var r = class extends HTMLElement {
    constructor() {
      super(), (this.database = null), (this.examples = []);
    }
    connectedCallback() {
      this.rendered || (this.render(), (this.rendered = !0));
    }
    render() {
      let e = this.getAttribute("selector") || "pre",
        n = this.hasAttribute("editable");
      document.querySelectorAll(e).forEach((t) => {
        let i = this.init(t);
        n && this.makeEditable(t, i);
      });
    }
    init(e) {
      let n = document.createElement("div");
      n.style.display = "none";
      let t = document.createElement("button");
      t.classList.add("sqlime-run-button");
      (t.innerHTML = "Run"),
        t.addEventListener("click", (b) => {
          this.execute(e.innerText, n);
        });
      let i = document.createElement("div");
      i.appendChild(t);
      let a = document.createElement("div");
      (a.className = "sqlime-example"),
        a.appendChild(i),
        a.appendChild(n),
        e.insertAdjacentElement("afterend", a);
      let d = { commandsEl: i, resultsEl: n };
      return this.examples.push(d), d;
    }
    makeEditable(e, n) {
      (e.contentEditable = "true"),
        e.addEventListener("keydown", (i) =>
          !i.ctrlKey && !i.metaKey
            ? !0
            : i.keyCode == 10 || i.keyCode == 13
            ? (this.execute(e.innerText, n.resultsEl), !1)
            : !0
        );
      let t = document.createElement("a");
      t.classList.add("sqlime-edit-link");
      (t.innerHTML = "Edit"),
        (t.style.cursor = "pointer"),
        (t.style.display = "inline-block"),
        (t.style.marginLeft = "1em"),
        n.commandsEl.appendChild(t),
        t.addEventListener("click", (i) => (e.focus(), !1));
    }
    execute(e, n) {
      if (((e = e.trim()), !e)) {
        this.showMessage(n, "");
        return;
      }
      try {
        let i = this.getDatabase().execute(e);
        this.showResult(n, i, "sqlime-results");
      } catch (t) {
        this.showMessage(n, t, "alert alert-warning");
      }
    }
    getDatabase() {
      return (
        (this.database == null || !this.database.db) &&
          (this.database = this.loadDatabase()),
        this.database
      );
    }
    loadDatabase() {
      if (!("Sqlime" in window) || !("db" in window.Sqlime))
        throw new Error(
          "Sqlime is not initialized. Use the 'sqlime-db' component to initialize it."
        );
      let e = this.getAttribute("db");
      if (!e) throw new Error("Missing the 'db' attribute.");
      if (!(e in window.Sqlime.db))
        throw new Error(
          `Database '${e}' is not loaded. Use the 'sqlime-db' component to load it.`
        );
      return window.Sqlime.db[e];
    }
    showResult(e, n, className) {
      e.style.display = "";
      e.innerHTML = l.printResult(n);
      e.className = className;
    }
    showMessage(e, n, className) {
      e.style.display = "";
      e.innerHTML = n;
      e.className = className;
    }
  };
  window.customElements.get("sqlime-examples") ||
    ((window.SqlimeExamples = r), customElements.define("sqlime-examples", r));
})();
