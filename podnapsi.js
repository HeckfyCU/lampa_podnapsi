(function () {
    const PODNAPISI_URL = "https://www.podnapisi.net/subtitles/search/";

    console.log("Подключение плагина Podnapisi началось");
    console.log("PODNAPISI_URL:", PODNAPISI_URL);

    function searchSubtitles(query, language = "en") {
        console.log("Поиск субтитров начат для запроса:", query, "и языка:", language);
        const searchParams = new URLSearchParams({
            keywords: query,
            language: language,
        });

        return fetch(`${PODNAPISI_URL}?${searchParams.toString()}`, {
            method: "GET",
        })
            .then(response => {
                console.log("Ответ от Podnapisi.net получен:", response.status);
                return response.text();
            })
            .then(html => {
                console.log("Ответ преобразован в текст, начало парсинга");
                return parseSearchResults(html);
            })
            .catch(error => console.error("Ошибка поиска субтитров:", error));
    }

    function parseSearchResults(html) {
        console.log("Парсинг HTML начат");
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const results = [];
        doc.querySelectorAll(".subtitle-entry").forEach(entry => {
            const title = entry.querySelector(".title")?.textContent?.trim();
            const downloadUrl = entry.querySelector("a[href*='/en/download/subtitle/']")?.href;
            if (title && downloadUrl) {
                results.push({ title, downloadUrl });
                console.log("Субтитры найдены:", title, downloadUrl);
            }
        });
        console.log("Парсинг завершён, найдено результатов:", results.length);
        return results;
    }

    function downloadSubtitle(downloadUrl) {
        console.log("Начало загрузки субтитров с URL:", downloadUrl);
        return fetch(downloadUrl, { method: "GET" })
            .then(response => {
                console.log("Ответ на запрос субтитров получен:", response.status);
                return response.blob();
            })
            .then(blob => blob.text())
            .catch(error => console.error("Ошибка загрузки субтитров:", error));
    }

    function attachSubtitles(subtitleContent) {
        console.log("Присоединение субтитров к видео");
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
            console.log("Субтитры успешно добавлены к видео");
        } else {
            console.error("Видео элемент не найден, субтитры не добавлены");
        }
    }

    Lampa.Plugins.add({
        name: "Podnapisi",
        description: "Плагин для автоматической загрузки субтитров через Podnapisi.net",
        start() {
            console.log("Плагин Podnapisi запущен");
            Lampa.Listener.follow("video_start", (e) => {
                const movieTitle = e.data.title;
                console.log("Воспроизведение видео началось, название:", movieTitle);
                searchSubtitles(movieTitle)
                    .then(results => {
                        if (results.length > 0) {
                            const bestMatch = results[0]; // Берем первый результат
                            console.log("Лучший результат для загрузки:", bestMatch);
                            return downloadSubtitle(bestMatch.downloadUrl);
                        }
                        throw new Error("Субтитры не найдены");
                    })
                    .then(attachSubtitles)
                    .catch(error => console.error("Ошибка обработки субтитров:", error));
            });
        }
    });
})();
