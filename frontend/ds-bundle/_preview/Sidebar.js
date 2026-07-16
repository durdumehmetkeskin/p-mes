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

  // .design-sync/previews/Sidebar.tsx
  var Sidebar_exports = {};
  __export(Sidebar_exports, {
    WarehouseNav: () => WarehouseNav
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

  // node_modules/lucide-react/dist/esm/icons/clipboard-list.js
  init_define_import_meta_env();
  var __iconNode2 = [
    ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
    [
      "path",
      {
        d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
        key: "116196"
      }
    ],
    ["path", { d: "M12 11h4", key: "1jrz19" }],
    ["path", { d: "M12 16h4", key: "n85exb" }],
    ["path", { d: "M8 11h.01", key: "1dfujw" }],
    ["path", { d: "M8 16h.01", key: "18s6g9" }]
  ];
  var ClipboardList = createLucideIcon("clipboard-list", __iconNode2);

  // node_modules/lucide-react/dist/esm/icons/file-chart-column-increasing.js
  init_define_import_meta_env();
  var __iconNode3 = [
    ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
    ["path", { d: "M8 18v-2", key: "qcmpov" }],
    ["path", { d: "M12 18v-4", key: "q1q25u" }],
    ["path", { d: "M16 18v-6", key: "15y0np" }]
  ];
  var FileChartColumnIncreasing = createLucideIcon("file-chart-column-increasing", __iconNode3);

  // node_modules/lucide-react/dist/esm/icons/layout-dashboard.js
  init_define_import_meta_env();
  var __iconNode4 = [
    ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
    ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
    ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
    ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
  ];
  var LayoutDashboard = createLucideIcon("layout-dashboard", __iconNode4);

  // node_modules/lucide-react/dist/esm/icons/package.js
  init_define_import_meta_env();
  var __iconNode5 = [
    [
      "path",
      {
        d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
        key: "1a0edw"
      }
    ],
    ["path", { d: "M12 22V12", key: "d0xqtd" }],
    ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }],
    ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }]
  ];
  var Package = createLucideIcon("package", __iconNode5);

  // node_modules/lucide-react/dist/esm/icons/warehouse.js
  init_define_import_meta_env();
  var __iconNode6 = [
    [
      "path",
      {
        d: "M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z",
        key: "gksnxg"
      }
    ],
    ["path", { d: "M6 18h12", key: "9pbo8z" }],
    ["path", { d: "M6 14h12", key: "4cwo0f" }],
    ["rect", { width: "12", height: "12", x: "6", y: "10", key: "apd30q" }]
  ];
  var Warehouse = createLucideIcon("warehouse", __iconNode6);

  // .design-sync/previews/Sidebar.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  function WarehouseNav() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarProvider, { className: "min-h-0 h-[460px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Sidebar, { collapsible: "none", className: "border-r", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2 px-2 py-1.5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boxes, { className: "size-4" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col leading-tight", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm font-semibold", children: "p-MES" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-muted-foreground text-xs", children: "Warehouse" })
        ] })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarGroup, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarGroupLabel, { children: "Warehouse" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarGroupContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenu, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuButton, { isActive: true, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Dashboard" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuItem, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuButton, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Materials" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarMenuBadge, { children: "128" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuButton, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Warehouse, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Warehouses" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuItem, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuButton, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Work orders" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarMenuBadge, { children: "28" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.SidebarMenuButton, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileChartColumnIncreasing, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reports" })
          ] }) })
        ] }) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SidebarFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-muted-foreground px-2 py-1 text-xs", children: "Signed in as N. Keskin" }) })
    ] }) });
  }
  return __toCommonJS(Sidebar_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/boxes.js:
lucide-react/dist/esm/icons/clipboard-list.js:
lucide-react/dist/esm/icons/file-chart-column-increasing.js:
lucide-react/dist/esm/icons/layout-dashboard.js:
lucide-react/dist/esm/icons/package.js:
lucide-react/dist/esm/icons/warehouse.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.487.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
