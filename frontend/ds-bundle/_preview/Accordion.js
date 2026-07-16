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

  // .design-sync/previews/Accordion.tsx
  var Accordion_exports = {};
  __export(Accordion_exports, {
    MaterialSpec: () => MaterialSpec,
    ProcessNotes: () => ProcessNotes
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

  // .design-sync/previews/Accordion.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  function MaterialSpec() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-96 rounded-md border px-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Accordion, { type: "single", collapsible: true, defaultValue: "general", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.AccordionItem, { value: "general", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionTrigger, { children: "General" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionContent, { className: "text-muted-foreground", children: "Steel Bracket M-204 · Raw material · Unit: pcs. Lot tracking enabled, managed in Warehouse A." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.AccordionItem, { value: "stock", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionTrigger, { children: "Stock levels" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionContent, { className: "text-muted-foreground", children: "On-hand 1,240 pcs across 3 bin locations. Reorder point 500 pcs, safety stock 200 pcs." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.AccordionItem, { value: "suppliers", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionTrigger, { children: "Suppliers" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionContent, { className: "text-muted-foreground", children: "Primary: Nord Metal GmbH — lead time 14 days. Secondary: Baltic Forge Ltd." })
      ] })
    ] }) });
  }
  function ProcessNotes() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-96 rounded-md border px-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Accordion, { type: "multiple", defaultValue: ["receipt", "issue"], children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.AccordionItem, { value: "receipt", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionTrigger, { children: "Goods receipt" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionContent, { className: "text-muted-foreground", children: "Scan the inbound pallet, confirm quantity against the purchase order, then post to the receiving bin." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.AccordionItem, { value: "issue", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionTrigger, { children: "Goods issue" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionContent, { className: "text-muted-foreground", children: "Pick against the work order, verify the lot, and post the issue to reduce on-hand stock." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.AccordionItem, { value: "transfer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionTrigger, { children: "Stock transfer" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AccordionContent, { className: "text-muted-foreground", children: "Move stock between bins or warehouses; both source and destination balances update on post." })
      ] })
    ] }) });
  }
  return __toCommonJS(Accordion_exports);
})();
