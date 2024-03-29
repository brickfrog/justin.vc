(() => {
  var y = `
select "name", "type", "sql"
from "sqlite_schema"
where "sql" not null
  and "type" == 'table'
order by "name"
`,
    q = "CREATE TABLE ";
  function S(n) {
    let e = v(n);
    if (!e.length) return "";
    let t = _(n),
      s = [];
    return (
      s.push("BEGIN TRANSACTION;"),
      s.push("PRAGMA writable_schema=ON;"),
      s.push(...e),
      s.push(...t),
      s.push("PRAGMA writable_schema=OFF;"),
      s.push("COMMIT;"),
      s.join(`
`)
    );
  }
  function v(n) {
    let e = [];
    return (
      n.each(y, (t) => {
        let s = L(t);
        s && e.push(s);
      }),
      e
    );
  }
  function L(n) {
    if (n.name == "sqlite_sequence") return 'DELETE FROM "sqlite_sequence";';
    if (n.name == "sqlite_stat1") return 'ANALYZE "sqlite_schema";';
    if (n.name.startsWith("sqlite_")) return "";
    if (n.sql.startsWith("CREATE VIRTUAL TABLE")) {
      let e = n.name.replace("'", "''");
      return `INSERT INTO sqlite_schema(type,name,tbl_name,rootpage,sql)
            VALUES('table','${e}','${e}',0,'${n.sql}');`;
    } else
      return n.sql.toUpperCase().startsWith(q)
        ? `CREATE TABLE IF NOT EXISTS ${n.sql.substr(q.length)};`
        : `${n.sql};`;
  }
  function _(n) {
    let e = [];
    return (
      n.each(y, (t) => {
        let s = I(n, t);
        s && e.push(s);
      }),
      e
    );
  }
  function I(n, e) {
    if (
      e.name.startsWith("sqlite_") ||
      e.sql.startsWith("CREATE VIRTUAL TABLE")
    )
      return "";
    e.nameIdent = e.name.replace('"', '""');
    let o = n
        .execute(`PRAGMA table_info("${e.nameIdent}")`)
        .values.map((u) => u[1])
        .map((u) => `'||quote("${u.replace('"', '""')}")||'`)
        .join(","),
      l = `SELECT 'INSERT INTO "${e.nameIdent}" VALUES(${o})' as stmt FROM "${e.nameIdent}";`,
      b = [];
    return (
      n.each(l, (u) => {
        b.push(`${u.stmt};`);
      }),
      b.join(`
`)
    );
  }
  var N = { toSql: S },
    w = N;
  function x(n) {
    let e = 0;
    for (let t = 0; t < n.length; t++) {
      let s = n.charCodeAt(t);
      (e = (e << 5) - e + s), (e = e & e);
    }
    return e;
  }
  function R(n) {
    let e = 0;
    for (let t = 0; t < n.length; t++) (e = (e << 5) - e + n[t]), (e = e & e);
    return e;
  }
  var $ = { string: x, uint8Array: R },
    f = $;
  var g = "new.db",
    E = {
      version: "select sqlite_version() as version",
      tables: `select name as "table" from sqlite_schema
      where type = 'table' and name not like 'sqlite_%'`,
      tableContent: "select * from {} limit 10",
      tableInfo: `select
      iif(pk=1, '\u2713', '') as pk, name, type, iif("notnull"=0, '\u2713', '') as "null?"
      from pragma_table_info('{}')`,
    };
  var a = class {
    constructor(e, t, s, r, o = "") {
      (this.id = null),
        (this.owner = null),
        (this.name = e || g),
        (this.path = t),
        (this.capi = s),
        (this.db = r),
        (this.query = o),
        (this.hashcode = 0),
        (this.tables = []);
    }
    execute(e) {
      if (!e) return null;
      this.query = e;
      let t = [];
      if (
        (this.db.exec({ sql: e, rowMode: "object", resultRows: t }), !t.length)
      )
        return null;
      let s = { columns: Object.getOwnPropertyNames(t[0]), values: [] };
      for (let r of t) s.values.push(Object.values(r));
      return s;
    }
    each(e, t) {
      this.db.exec({ sql: e, rowMode: "object", callback: t });
    }
    gatherTables() {
      let e = [];
      return (
        this.db.exec({ sql: E.tables, rowMode: "array", resultRows: e }),
        e.length
          ? ((this.tables = e.map((t) => t[0])), this.tables)
          : ((this.tables = []), this.tables)
      );
    }
    getTableInfo(e) {
      let t = E.tableInfo.replace("{}", e);
      return this.execute(t);
    }
    calcHashcode() {
      if (!this.tables.length) return (this.hashcode = 0), 0;
      let e = this.capi.sqlite3_js_db_export(this.db.pointer),
        t = f.uint8Array(e),
        s = f.string(this.query),
        r = t & s || t || s;
      return (this.hashcode = r), r;
    }
    get meaningfulName() {
      return this.name == g ? "" : this.name;
    }
    ensureName() {
      return this.meaningfulName
        ? this.meaningfulName
        : this.tables.length
        ? ((this.name = this.tables[0] + ".db"), this.name)
        : this.id
        ? ((this.name = this.id.substr(0, 6) + ".db"), this.name)
        : this.name;
    }
  };
  var i,
    C = { print: console.log, printErr: console.error };
  async function M(n, e, t) {
    if (i === void 0) {
      i = await sqlite3InitModule(C);
      let s = i.capi.sqlite3_libversion();
      console.log(`Loaded SQLite ${s}`);
    }
    return t.type == "local" || t.type == "remote"
      ? t.value.endsWith(".sql")
        ? await j(e, t)
        : await F(e, t)
      : t.type == "binary"
      ? await B(e, t)
      : t.type == "id"
      ? await H(n, t)
      : await O(e, t);
  }
  async function O(n, e) {
    console.debug("Creating new database...");
    let t = new i.oo1.DB();
    return new a(n, e, i.capi, t);
  }
  async function B(n, e) {
    console.debug("Loading database from array buffer...");
    let t = A(e.value);
    e.value = null;
    let s = new a(n, e, i.capi, t);
    return s.gatherTables(), s;
  }
  async function F(n, e) {
    console.debug(`Loading database from url ${e.value}...`);
    let s = await fetch(e.value)
      .then((l) => (l.ok ? l.arrayBuffer() : null))
      .catch((l) => null);
    if (!s) return null;
    let r = A(s),
      o = new a(n, e, i.capi, r);
    return o.gatherTables(), o;
  }
  async function j(n, e) {
    console.debug(`Loading SQL from url ${e.value}...`);
    let s = await fetch(e.value)
      .then((l) => (l.ok ? l.text() : null))
      .catch((l) => null);
    if (!s) return null;
    let r = new i.oo1.DB(),
      o = new a(n, e, i.capi, r);
    return o.execute(s), (o.query = ""), o;
  }
  async function H(n, e) {
    if (!n) return Promise.reject("Saving to the cloud is not supported");
    console.debug(`Loading database from gist ${e.value}...`);
    let t = await n.get(e.value);
    if (!t) return null;
    let s = new i.oo1.DB(),
      r = new a(t.name, e, i.capi, s);
    return (
      (r.id = t.id),
      (r.owner = t.owner),
      r.execute(t.schema),
      (r.query = t.query),
      r.calcHashcode(),
      r.ensureName(),
      r
    );
  }
  async function P(n, e, t) {
    if (!n) return Promise.reject("Saving to the cloud is not supported");
    console.debug("Saving database to gist...");
    let s = w.toSql(e, t);
    if (((e.query = t), !s && !t)) return Promise.resolve(null);
    let r = e.hashcode;
    e.gatherTables(), e.calcHashcode(), e.ensureName();
    let o;
    if (!e.id || e.owner != n.username) o = n.create(e.name, s, e.query);
    else {
      if (e.hashcode == r) return Promise.resolve(e);
      o = n.update(e.id, e.name, s, e.query);
    }
    return o.then((l) => U(e, l));
  }
  function U(n, e) {
    return e.id
      ? ((n.id = e.id),
        (n.owner = e.owner),
        (n.path.type = "id"),
        (n.path.value = `${e.prefix}:${n.id}`),
        n.ensureName(),
        n)
      : null;
  }
  function A(n) {
    let e = new Uint8Array(n),
      t = i.wasm.allocFromTypedArray(e),
      s = new i.oo1.DB();
    return (
      i.capi.sqlite3_deserialize(
        s.pointer,
        "main",
        t,
        e.length,
        e.length,
        i.capi.SQLITE_DESERIALIZE_FREEONCLOSE
      ),
      s
    );
  }
  var T = { init: M, save: P };
  var c = class {
    constructor(e, t = null) {
      (this.value = e), (this.type = t || this.inferType(e));
    }
    inferType(e) {
      return e
        ? e instanceof ArrayBuffer
          ? "binary"
          : e.startsWith("http://") || e.startsWith("https://")
          ? "remote"
          : e.includes(":")
          ? "id"
          : "local"
        : "empty";
    }
    extractName() {
      if (["binary", "id", "empty"].includes(this.type)) return "";
      let e = this.value.split("/");
      return e[e.length - 1];
    }
    toHash() {
      return this.type == "local" || this.type == "remote" || this.type == "id"
        ? `#${this.value}`
        : "";
    }
    toString() {
      return this.type == "local" || this.type == "remote"
        ? `URL ${this.value}`
        : this.type == "binary"
        ? "binary value"
        : this.type == "id"
        ? `ID ${this.value}`
        : "empty value";
    }
  };
  var W = null,
    h = class extends HTMLElement {
      constructor() {
        super(), (this.database = null);
      }
      connectedCallback() {
        this.loaded || (this.load(), (this.loaded = !0));
      }
      async load() {
        let e = new c(this.getAttribute("path")),
          t = this.getAttribute("name") || e.extractName();
        this.loading(t);
        try {
          let s = await T.init(W, t, e);
          if (!s) {
            let r = `Failed to load database from ${e}`;
            this.error(t, r), console.error(r);
            return;
          }
          this.success(s);
        } catch (s) {
          throw (this.error(t, s), s);
        }
      }
      loading(e) {
        (this.database = new m(e)), d(this.database);
      }
      success(e) {
        (this.database = e), d(this.database);
      }
      error(e, t) {
        (this.database = new p(e, t)), d(this.database);
      }
    },
    m = class {
      constructor(e) {
        this.name = e;
      }
      execute(e) {
        throw new Error("SQLite is still loading, try again in a second");
      }
    },
    p = class {
      constructor(e, t) {
        (this.name = e), (this.message = t);
      }
      execute(e) {
        throw new Error(this.message);
      }
    };
  function d(n) {
    (window.Sqlime = window.Sqlime || {}),
      (window.Sqlime.db = window.Sqlime.db || {}),
      (window.Sqlime.db[n.name] = n);
  }
  window.customElements.get("sqlime-db") ||
    ((window.SqlimeDb = h), customElements.define("sqlime-db", h));
})();
