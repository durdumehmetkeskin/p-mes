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

  // .design-sync/previews/Combobox.tsx
  var Combobox_exports = {};
  __export(Combobox_exports, {
    EmptyPicker: () => EmptyPicker,
    MaterialPicker: () => MaterialPicker,
    SearchableMaterialList: () => SearchableMaterialList
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

  // node_modules/lucide-react/dist/esm/icons/check.js
  init_define_import_meta_env();
  var __iconNode = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]];
  var Check = createLucideIcon("check", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/chevrons-up-down.js
  init_define_import_meta_env();
  var __iconNode2 = [
    ["path", { d: "m7 15 5 5 5-5", key: "1hf1tw" }],
    ["path", { d: "m7 9 5-5 5 5", key: "sgt6xg" }]
  ];
  var ChevronsUpDown = createLucideIcon("chevrons-up-down", __iconNode2);

  // .design-sync/previews/Combobox.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var MATERIALS = [
    { value: "mat-1042", label: "Steel Bracket M-204" },
    { value: "mat-2210", label: "Hex Bolt M8×40 (A2)" },
    { value: "mat-3087", label: "Aluminium Sheet 2mm" },
    { value: "mat-4419", label: "Nylon Bushing 12mm" },
    { value: "mat-5560", label: "Copper Wire 1.5mm²" }
  ];
  function MaterialPicker() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-72 p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.Combobox,
      {
        options: MATERIALS,
        value: "mat-1042",
        onChange: () => {
        },
        placeholder: "Select material…",
        searchPlaceholder: "Search materials…"
      }
    ) });
  }
  function EmptyPicker() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-72 p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.Combobox,
      {
        options: MATERIALS,
        value: "",
        onChange: () => {
        },
        placeholder: "Select material…",
        searchPlaceholder: "Search materials…"
      }
    ) });
  }
  function SearchableMaterialList() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Popover, { open: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.PopoverTrigger, { asChild: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        ds_exports.Button,
        {
          variant: "outline",
          role: "combobox",
          "aria-expanded": true,
          className: "w-64 justify-between font-normal",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "truncate", children: "Steel Bracket M-204" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })
          ]
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.PopoverContent, { align: "start", className: "w-64 p-0", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Command, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CommandInput, { placeholder: "Search materials…" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CommandList, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CommandEmpty, { children: "No material found." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.CommandGroup, { children: MATERIALS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.CommandItem, { value: m.value, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Check,
              {
                className: m.value === "mat-1042" ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "truncate", children: m.label })
          ] }, m.value)) })
        ] })
      ] }) })
    ] }) });
  }
  return __toCommonJS(Combobox_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/check.js:
lucide-react/dist/esm/icons/chevrons-up-down.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.487.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
