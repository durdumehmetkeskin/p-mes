"use strict";
var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.PmesUI;
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx2(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs2(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsxs2;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs2 : jsx2)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/Tabs.tsx
  var Tabs_exports = {};
  __export(Tabs_exports, {
    MaterialTabs: () => MaterialTabs,
    SensorTabs: () => SensorTabs
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.PmesUI;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/Tabs.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  function MaterialTabs() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-[420px] rounded-md border p-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Tabs, { defaultValue: "overview", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TabsList, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsTrigger, { value: "overview", children: "Overview" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsTrigger, { value: "stock", children: "Stock" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsTrigger, { value: "history", children: "History" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TabsContent, { value: "overview", className: "pt-3 text-sm", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-medium", children: "Steel Bracket M-204" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: "secondary", children: "Raw material" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground mt-2", children: "Unit pcs · Warehouse A · Reorder point 500 pcs · Lot tracking on." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsContent, { value: "stock", className: "pt-3 text-sm", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground", children: "On-hand 1,240 pcs across 3 bins. 180 pcs reserved for WO-3187." }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsContent, { value: "history", className: "pt-3 text-sm", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground", children: "Last movement: goods issue 60 pcs on 12.06.2026 against WO-3187." }) })
    ] }) });
  }
  function SensorTabs() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-[420px] rounded-md border p-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Tabs, { defaultValue: "chart", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.TabsList, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsTrigger, { value: "chart", children: "Chart" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsTrigger, { value: "table", children: "Table" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsContent, { value: "chart", className: "pt-3 text-sm", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground", children: "Temperature 18–24°C (avg 21.3), humidity 40–55% RH over the selected range." }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.TabsContent, { value: "table", className: "pt-3 text-sm", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground", children: "Raw readings for Warehouse A — 4,820 rows, 1 sn resolution." }) })
    ] }) });
  }
  return __toCommonJS(Tabs_exports);
})();
