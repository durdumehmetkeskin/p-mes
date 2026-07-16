module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // NOTE: babel-preset-expo (SDK 57) automatically adds the
    // react-native-worklets/reanimated babel plugin when reanimated is
    // installed, so it must NOT be listed here again.
  };
};
