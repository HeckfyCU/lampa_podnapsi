(function () {
    const PODNAPISI_URL = "https://www.podnapisi.net/subtitles/search/";

    function log(...args) {
        console.log("[Podnapisi Plugin]", ...args);
    }

    function searchSubtitles(query, language = "en") {
        log("Поиск субтитров для:", query, "язык:", language);
        const searchParams = new URLSearchParams({
            keywords: query,
            language: language,
        });

        return fetch(`${PODNAPISI_URL}?${searchParams.toString()}`, {
            method: "GET",
        })
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
                return response.text();
            })
            .then(html => parseSearchResults(html))
            .catch(error => log("Ошибка поиска субтитров:", error));
    }

    function parseSearchResults(html) {
        log("Парсинг HTML...");
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const results = [];
        doc.querySelectorAll(".subtitle-entry").forEach(entry => {
            const title = entry.querySelector(".title")?.textContent?.trim();
            const downloadUrl = entry.querySelector("a[href*='/en/download/subtitle/']")?.href;
            if (title && downloadUrl) {
                results.push({ title, downloadUrl });
                log("Субтитры найдены:", title, downloadUrl);
            }
        });
        log("Парсинг завершён. Найдено результатов:", results.length);
        return results;
    }

    function downloadSubtitle(downloadUrl) {
        log("Загрузка субтитров с URL:", downloadUrl);
        return fetch(downloadUrl, { method: "GET" })
            .then(response => response.blob())
            .then(blob => blob.text())
            .catch(error => log("Ошибка загрузки субтитров:", error));
    }

    function attachSubtitles(subtitleContent) {
        log("Добавление субтитров в видео...");
        const subtitleBlob = new Blob([subtitleContent], { type: "text/srt" });
        const subtitleUrl = URL.createObjectURL(subtitleBlob);
        const video = document.querySelector("video");
        if (video) {
            const track = document.createElement("track");
            track.kind = "subtitles";
            track.label = "Russian";
            track.src = subtitleUrl;
            track.default = true;
            video.appendChild(track);
            log("Субтитры успешно добавлены.");
        } else {
            log("Видео элемент не найден. Субтитры не добавлены.");
        }
    }

    function initializePlugin() {
        log("Инициализация плагина Podnapisi...");
        Lampa.Listener.follow("video_start", (e) => {
            const movieTitle = e.data.title;
            log("Воспроизведение началось. Название:", movieTitle);
            searchSubtitles(movieTitle)
                .then(results => {
                    if (results && results.length > 0) {
                        const bestMatch = results[0];
                        log("Лучший результат:", bestMatch);
                        return downloadSubtitle(bestMatch.downloadUrl);
                    }
                    throw new Error("Субтитры не найдены.");
                })
                .then(attachSubtitles)
                .catch(error => log("Ошибка обработки субтитров:", error));
        });
    }

    Lampa.Plugins.add({
        name: "Podnapisi",
        description: "Плагин для автоматической загрузки субтитров через Podnapisi.net",
        author: "@HeckfyCU",
        version: "1.0.0",
        start: initializePlugin
    });

    log("Плагин Podnapisi загружен.");
})();
