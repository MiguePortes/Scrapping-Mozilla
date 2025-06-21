const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({ slowMo: 200, headless: false });
  const page = await browser.newPage();

  try {
    await page.goto("https://hacks.mozilla.org/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("outer-wrapper", { timeout: 6000 });

    const articles = await page.evaluate(() => {
      const wrapper = document.querySelector("outer-wrapper");
      const articleNodes = wrapper.querySelectorAll("article");

      return Array.from(articleNodes).map((article) => {
        const title =
          article
            .querySelector(
              "block block--3>article-list>block block--1>post__title"
            )
            ?.innerText.trim() || "Sin título";
        const url = article.querySelector("h2 a")?.href || "Sin URL";
        const image =
          article.querySelector("img")?.src || "Sin imagen destacada";
        const summary =
          article.querySelector("p")?.innerText.trim() || "Sin resumen";
        const author =
          article.querySelector("a[rel='author']")?.innerText.trim() ||
          "Autor no disponible";
        const date =
          article.querySelector("time")?.getAttribute("datetime") ||
          "Fecha no disponible";

        return { title, summary, author, date, url, image };
      });
    });

    console.log(articles);
    fs.writeFileSync("articulos.json", JSON.stringify(articles, null, 2));
    console.log("Artículos guardados en 'articulos.json'");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
