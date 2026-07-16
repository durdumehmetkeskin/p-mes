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

  // .design-sync/previews/Carousel.tsx
  var Carousel_exports = {};
  __export(Carousel_exports, {
    MaterialSlides: () => MaterialSlides,
    WarehouseSlides: () => WarehouseSlides
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

  // .design-sync/previews/Carousel.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var materials = [
    { sku: "STEEL-001", name: "Steel Bracket M-204", qty: "1,240 pcs" },
    { sku: "ALU-118", name: "Aluminium Profile 40x40", qty: "860 m" },
    { sku: "PACK-052", name: "Carton Box 600x400", qty: "3,500 pcs" }
  ];
  function MaterialSlides() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex justify-center px-12 py-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Carousel, { className: "w-full max-w-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselContent, { children: materials.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardContent, { className: "flex h-40 flex-col items-center justify-center gap-2 p-6 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: "secondary", children: m.sku }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-lg font-semibold", children: m.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-muted-foreground text-sm", children: [
          "On-hand ",
          m.qty
        ] })
      ] }) }) }, m.sku)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselPrevious, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselNext, {})
    ] }) });
  }
  function WarehouseSlides() {
    const warehouses = [
      { code: "WH-01", name: "Main distribution center", bins: 128 },
      { code: "WH-02", name: "Cold storage annex", bins: 42 },
      { code: "WH-03", name: "Returns & quarantine", bins: 24 }
    ];
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex justify-center px-12 py-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Carousel, { className: "w-full max-w-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselContent, { children: warehouses.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CardContent, { className: "flex h-40 flex-col items-center justify-center gap-2 p-6 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-3xl font-bold tabular-nums", children: w.bins }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-muted-foreground text-sm", children: "bin locations" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-sm font-medium", children: [
          w.code,
          " · ",
          w.name
        ] })
      ] }) }) }, w.code)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselPrevious, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CarouselNext, {})
    ] }) });
  }
  return __toCommonJS(Carousel_exports);
})();
