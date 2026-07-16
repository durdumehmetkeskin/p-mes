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

  // .design-sync/previews/HoverCard.tsx
  var HoverCard_exports = {};
  __export(HoverCard_exports, {
    MaterialSummary: () => MaterialSummary,
    UserSummary: () => UserSummary
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

  // node_modules/lucide-react/dist/esm/icons/boxes.js
  init_define_import_meta_env();
  var __iconNode = [
    [
      "path",
      {
        d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
        key: "lc1i9w"
      }
    ],
    ["path", { d: "m7 16.5-4.74-2.85", key: "1o9zyk" }],
    ["path", { d: "m7 16.5 5-3", key: "va8pkn" }],
    ["path", { d: "M7 16.5v5.17", key: "jnp8gn" }],
    [
      "path",
      {
        d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
        key: "8zsnat"
      }
    ],
    ["path", { d: "m17 16.5-5-3", key: "8arw3v" }],
    ["path", { d: "m17 16.5 4.74-2.85", key: "8rfmw" }],
    ["path", { d: "M17 16.5v5.17", key: "k6z78m" }],
    [
      "path",
      {
        d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
        key: "1xygjf"
      }
    ],
    ["path", { d: "M12 8 7.26 5.15", key: "1vbdud" }],
    ["path", { d: "m12 8 4.74-2.85", key: "3rx089" }],
    ["path", { d: "M12 13.5V8", key: "1io7kd" }]
  ];
  var Boxes = createLucideIcon("boxes", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/calendar-days.js
  init_define_import_meta_env();
  var __iconNode2 = [
    ["path", { d: "M8 2v4", key: "1cmpym" }],
    ["path", { d: "M16 2v4", key: "4m81vk" }],
    ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
    ["path", { d: "M3 10h18", key: "8toen8" }],
    ["path", { d: "M8 14h.01", key: "6423bh" }],
    ["path", { d: "M12 14h.01", key: "1etili" }],
    ["path", { d: "M16 14h.01", key: "1gbofw" }],
    ["path", { d: "M8 18h.01", key: "lrp35t" }],
    ["path", { d: "M12 18h.01", key: "mhygvu" }],
    ["path", { d: "M16 18h.01", key: "kzsmim" }]
  ];
  var CalendarDays = createLucideIcon("calendar-days", __iconNode2);

  // .design-sync/previews/HoverCard.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  function MaterialSummary() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.HoverCard, { open: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.HoverCardTrigger, { asChild: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "link", className: "px-0", children: "Steel Bracket M-204" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.HoverCardContent, { align: "start", className: "w-72", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-muted flex size-10 items-center justify-center rounded-md", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boxes, { className: "size-5" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm font-semibold", children: "Steel Bracket M-204" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground text-xs", children: "Raw material · SKU MAT-1042" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap gap-1 pt-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: "secondary", children: "On hand 1,240 pcs" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: "outline", children: "Reorder 500" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground pt-1 text-xs", children: "Supplier: Nordwerk GmbH · Warehouse A / Bin B-14" })
        ] })
      ] }) })
    ] }) });
  }
  function UserSummary() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.HoverCard, { open: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.HoverCardTrigger, { asChild: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "link", className: "px-0", children: "@n.keskin" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.HoverCardContent, { align: "start", className: "w-72", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Avatar, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.AvatarFallback, { children: "NK" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm font-semibold", children: "Necdet Keskin" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-muted-foreground text-xs", children: "Warehouse Manager · Plant 1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap gap-1 pt-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: "secondary", children: "Admin" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Badge, { variant: "outline", children: "6 projects" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-muted-foreground flex items-center gap-1 pt-1 text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "size-3" }),
            "Member since March 2023"
          ] })
        ] })
      ] }) })
    ] }) });
  }
  return __toCommonJS(HoverCard_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/boxes.js:
lucide-react/dist/esm/icons/calendar-days.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.487.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
