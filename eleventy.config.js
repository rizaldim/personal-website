const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  return {
    dir: {
      input: "input",
      includes: "../_includes", // relative to input
      layouts: "../_layouts", // relative to input
      data: "../_data", // relative to input
      output: "output"
    },
    markdownTemplateEngine: "njk"
  }
};
