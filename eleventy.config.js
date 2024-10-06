const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require("@11ty/eleventy-img");
const dayjs = require('dayjs');
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { DateTime } = require("luxon");

dayjs.extend(customParseFormat);

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addShortcode("image", async function (src, alt, sizes) {
    let metadata = await Image(src, {
      widths: [300, 600, 900],
      formats: ["avif", "jpeg"],
      outputDir: "./output/img/",
    });

    let imageAttributes = {
      alt,
      sizes,
      loading: "lazy",
      decoding: "async",
    };

    // You bet we throw an error on a missing alt (alt="" works okay)
    return Image.generateHTML(metadata, imageAttributes);
  });

  eleventyConfig.addFilter("postTags", function(value) {
    return value.filter(item => item != 'post');
  });

  eleventyConfig.addFilter("postDate", function(value) {
    return dayjs(value).format('YYYY-MM-DD');;
  });

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
