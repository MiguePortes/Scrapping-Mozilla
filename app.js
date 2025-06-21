const puppeteer = require("puppeteer");
const fs = require("fs");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 80,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  const allArticles = [];
  const lastPage = 3;

  try {
    for (let pageNum = 1; pageNum <= lastPage; pageNum++) {
      const url = `https://hacks.mozilla.org/articles/page/${pageNum}/`;
      console.log(`🔎 Página ${pageNum} de ${lastPage}`);

      await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
      await page.waitForSelector("ul.article-list li", { timeout: 30000 });

      const previews = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("ul.article-list li")).map(
          (article) => {
            const titleElement = article.querySelector("h3.post__title a");
            const summaryElement = article.querySelector("p.post__tease");
            return {
              title: titleElement?.innerText || "Título no encontrado",
              summary: summaryElement?.innerText || "Resumen no encontrado",
              url: titleElement?.href || "",
            };
          }
        );
      });

      for (const preview of previews) {
        try {
          await page.goto(preview.url, {
            waitUntil: "networkidle2",
            timeout: 0,
          });
          await page.waitForSelector("h1", { timeout: 30000 });

          const details = await page.evaluate(() => {
            const authorElement = document.querySelector(
              "div.outer-wrapper>div#content-head>div.byline>h3.post__author a"
            );
            const author = authorElement
              ? authorElement.innerText
              : "Autor no encontrado";
            const date =
              document.querySelector("abbr.published")?.getAttribute("title") ||
              "Fecha no encontrada";
            const firstParagraph =
              Array.from(document.querySelectorAll(".post-content p"))
                .find(
                  (p) =>
                    p.offsetParent !== null && p.innerText.trim().length > 30
                )
                ?.innerText.trim() || "Párrafo no encontrado";
            const avatar =
              document.querySelector("img.avatar")?.getAttribute("src") ||
              "Imagen no encontrada";

            return { author, date, avatar, firstParagraph };
          });

          allArticles.push({
            autor: details.author,
            title: preview.title,
            resumen: preview.summary,
            parrafo: details.firstParagraph,
            date: details.date,
            url: preview.url,
            image: details.avatar,
          });

          console.log(`✅ ${preview.title}`);
        } catch (err) {
          console.warn(`⚠️ Error en artículo ${preview.url}: ${err.message}`);
        }
      }
    }

    // JSON
    fs.writeFileSync(
      "articulos-mozilla.json",
      JSON.stringify(allArticles, null, 2),
      "utf-8"
    );
    console.log(`\n✅ Archivo JSON guardado`);

    // CSV
    const parser = new Parser();
    const csv = parser.parse(allArticles);
    fs.writeFileSync("articulos-mozilla.csv", csv, "utf-8");
    console.log(`✅ Archivo CSV guardado`);

    // XLSX
    const worksheet = XLSX.utils.json_to_sheet(allArticles);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Artículos");
    XLSX.writeFile(workbook, "articulos-mozilla.xlsx");
    console.log(`✅ Archivo XLSX guardado`);

    console.log(
      `\n📁 ¡Guardado exitoso! ${allArticles.length} artículos extraídos`
    );
  } catch (error) {
    console.error("❌ Error general:", error);
  } finally {
    await browser.close();
  }
})();
