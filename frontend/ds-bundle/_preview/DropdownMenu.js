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

  // .design-sync/previews/DropdownMenu.tsx
  var DropdownMenu_exports = {};
  __export(DropdownMenu_exports, {
    ColumnVisibility: () => ColumnVisibility,
    RowActions: () => RowActions
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

  // node_modules/lucide-react/dist/esm/lucide-react.js
  init_define_import_meta_env();

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/shared/src/utils.js
  init_define_import_meta_env();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var toCamelCase = (string) => string.replace(
    /^([A-Z])|[\s-_]+(\w)/g,
    (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
  );
  var toPascalCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();

  // node_modules/lucide-react/dist/esm/Icon.js
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/defaultAttributes.js
  init_define_import_meta_env();
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  var Icon = (0, import_react.forwardRef)(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => {
      return (0, import_react.createElement)(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
          className: mergeClasses("lucide", className),
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react2.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(
          `lucide-${toKebabCase(toPascalCase(iconName))}`,
          `lucide-${iconName}`,
          className
        ),
        ...props
      })
    );
    Component.displayName = toPascalCase(iconName);
    return Component;
  };

  // node_modules/lucide-react/dist/esm/icons/copy.js
  init_define_import_meta_env();
  var __iconNode = [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
  ];
  var Copy = createLucideIcon("copy", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/ellipsis.js
  init_define_import_meta_env();
  var __iconNode2 = [
    ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
    ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
    ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
  ];
  var Ellipsis = createLucideIcon("ellipsis", __iconNode2);

  // node_modules/lucide-react/dist/esm/icons/history.js
  init_define_import_meta_env();
  var __iconNode3 = [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
    ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
    ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
  ];
  var History = createLucideIcon("history", __iconNode3);

  // node_modules/lucide-react/dist/esm/icons/pencil.js
  init_define_import_meta_env();
  var __iconNode4 = [
    [
      "path",
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
        key: "1a8usu"
      }
    ],
    ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
  ];
  var Pencil = createLucideIcon("pencil", __iconNode4);

  // node_modules/lucide-react/dist/esm/icons/sliders-horizontal.js
  init_define_import_meta_env();
  var __iconNode5 = [
    ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
    ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
    ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
    ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
    ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
    ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
    ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
    ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
    ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
  ];
  var SlidersHorizontal = createLucideIcon("sliders-horizontal", __iconNode5);

  // node_modules/lucide-react/dist/esm/icons/trash-2.js
  init_define_import_meta_env();
  var __iconNode6 = [
    ["path", { d: "M3 6h18", key: "d0wm0j" }],
    ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
    ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
    ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
    ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
  ];
  var Trash2 = createLucideIcon("trash-2", __iconNode6);

  // .design-sync/previews/DropdownMenu.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  function RowActions() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenu, { open: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "outline", size: "icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {}) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuContent, { align: "start", className: "w-56", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuLabel, { children: "Steel Bracket M-204" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuSeparator, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuItem, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, {}),
          "Edit material",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuShortcut, { children: "⌘E" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuItem, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {}),
          "Duplicate"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuItem, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {}),
          "View stock history"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuSeparator, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuCheckboxItem, { checked: true, children: "Show archived lots" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuSeparator, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuItem, { variant: "destructive", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {}),
          "Delete"
        ] })
      ] })
    ] }) });
  }
  function ColumnVisibility() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenu, { open: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Button, { variant: "outline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, {}),
        "Columns"
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuContent, { align: "start", className: "w-56", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuLabel, { children: "Toggle columns" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuSeparator, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuCheckboxItem, { checked: true, children: "SKU" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuCheckboxItem, { checked: true, children: "On-hand qty" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuCheckboxItem, { checked: true, children: "Reserved" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuCheckboxItem, { children: "Bin location" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuSeparator, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuLabel, { children: "Sort by" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.DropdownMenuRadioGroup, { value: "sku", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuRadioItem, { value: "sku", children: "SKU" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuRadioItem, { value: "qty", children: "On-hand quantity" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DropdownMenuRadioItem, { value: "updated", children: "Last updated" })
        ] })
      ] })
    ] }) });
  }
  return __toCommonJS(DropdownMenu_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/copy.js:
lucide-react/dist/esm/icons/ellipsis.js:
lucide-react/dist/esm/icons/history.js:
lucide-react/dist/esm/icons/pencil.js:
lucide-react/dist/esm/icons/sliders-horizontal.js:
lucide-react/dist/esm/icons/trash-2.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.487.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
