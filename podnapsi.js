(function () {
    const PODNAPISI_URL = "https://www.podnapisi.net/subtitles/search/";

    function searchSubtitles(query, language = "en") {
        const searchParams = new URLSearchParams({
            keywords: query,
            language: language,
        });

        return fetch(`${PODNAPISI_URL}?${searchParams.toString()}`, {
            method: "GET",
        })
            .then(response => response.text())
            .then(html => parseSearchResults(html))
            .catch(error => console.error("Ошибка поиска субтитров:", error));
    }

    function parseSearchResults(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const results = [];
        doc.querySelectorAll(".subtitle-entry").forEach(entry => {
            const title = entry.querySelector(".title")?.textContent?.trim();
            const downloadUrl = entry.querySelector("a[href*='/en/download/subtitle/']")?.href;
            if (title && downloadUrl) {
                results.push({ title, downloadUrl });
            }
        });
        return results;
    }

    function downloadSubtitle(downloadUrl) {
        return fetch(downloadUrl, { method: "GET" })
            .then(response => response.blob())
            .then(blob => blob.text())
            .catch(error => console.error("Ошибка загрузки субтитров:", error));
    }

    function attachSubtitles(subtitleContent) {
        const subtitleBlob = new Blob([subtitleContent], { type: "text/srt" });
        const subtitleUrl = URL.createObjectURL(subtitleBlob);
        const video = document.querySelector("video");
        if (video) {
            const track = document.createElement("track");
            track.kind = "subtitles";
            track.label = "English";
            track.src = subtitleUrl;
            track.default = true;
            video.appendChild(track);
        }
    }

    Lampa.Plugins.add({
        name: "Podnapisi",
        description: "Плагин для автоматической загрузки субтитров через Podnapisi.net",
        start() {
            Lampa.Listener.follow("video_start", (e) => {
                const movieTitle = e.data.title;
                searchSubtitles(movieTitle)
                    .then(results => {
                        if (results.length > 0) {
                            const bestMatch = results[0]; // Берем первый результат
                            return downloadSubtitle(bestMatch.downloadUrl);
                        }
                        throw new Error("Субтитры не найдены");
                    })
                    .then(attachSubtitles)
                    .catch(error => console.error("Ошибка загрузки субтитров:", error));
            });
        }
    });
})();
