const htmlmin = require("html-minifier");
const path = require("path");

module.exports = function (eleventyConfig) {
  /**
   * Upgrade helper
   * Uncomment if you need help upgrading to new major version.
   */
  //eleventyConfig.addPlugin(UpgradeHelper);

  /**
   * Files to copy
   * https://www.11ty.dev/docs/copy/
   */
  eleventyConfig.addPassthroughCopy("src/static");

  /**
   * HTML Minifier for production builds
   */
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (
      process.env.ELEVENTY_ENV == "production" &&
      outputPath &&
      outputPath.endsWith(".html")
    ) {
      let minified = htmlmin.minify(content, {
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });

  eleventyConfig.setDataDeepMerge(true);

  const markdownIt = new require("markdown-it")({
    typographer: true,
    linkify: true,
    html: true,
  });

  markdownIt.use(require("markdown-it-anchor"));
  markdownIt.use(require("markdown-it-eleventy-img"), {
    imgOptions: {
      widths: [800, 500, 300],
      urlPath: "/images/",
      outputDir: path.join("public", "images"),
      formats: ["avif", "webp", "jpeg"],
    },
    globalAttributes: {
      class: "markdown-image",
      decoding: "async",
      // If you use multiple widths,
      // don't forget to add a `sizes` attribute.
      sizes: "100vw",
    },
  });

  eleventyConfig.setLibrary("md", markdownIt);

  eleventyConfig.addPlugin(require("eleventy-plugin-nesting-toc"), {
    tags: ["h2", "h3", "h4"],
  });

  eleventyConfig.addPlugin(
    require("@aloskutov/eleventy-plugin-external-links"),
    {
      url: "https://fallscreekranch.org",
      target: "_self",
      overwrite: false,
    }
  );

  return {
    markdownTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "public",
      data: "src/_data",
    },
  };
};
